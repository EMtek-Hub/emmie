// pages/api/chat.ts - Unified Responses API Chat Endpoint with full tool handling
import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import {
  RESPONSE_MODELS,
  buildResponsesInput,
  detectImageGenerationRequest,
  generateEmbedding,
  initResponseStream,
  logAIOperation,
  selectModel,
  selectReasoningEffort,
  type ReasoningEffort,
  type ResponseModel
} from '../../lib/ai';
import { TOOL_REGISTRY, toolRouter, type ToolContext } from '../../lib/tools';
import { getAgentProfile, composeSystemMessageFromProfile, getModeInstructions } from '../../lib/profiles';

type SSEStream = ReturnType<typeof initResponseStream>;

type StreamedToolCall = {
  id: string;
  call_id: string;
  name: string;
  arguments: string;
};

type ExecutedToolCall = StreamedToolCall & {
  status: 'completed' | 'failed';
  result: string;
};

type GeneratedImage = {
  url: string;
  storagePath: string;
  format: 'png' | 'jpeg' | 'webp';
  markdown: string;
};

type StreamStepResult = {
  text: string;
  responseId: string;
  toolCalls: StreamedToolCall[];
  images: GeneratedImage[];
};

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse raw body (streaming safe)
  let body: any;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const data = Buffer.concat(chunks).toString();
    body = JSON.parse(data);
  } catch (error) {
    console.error('Body parse error:', error);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { chatId, projectId, messages, mode, agentId, imageUrls = [] } = body;
  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  if (!messages?.length) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || lastMessage?.content_md || '';

  if (!userContent.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  const hasImages = imageUrls.length > 0;
  console.log(`🚀 Chat Request - AgentId: ${agentId}, ChatId: ${chatId}, Content: "${userContent}"`);

  try {
    await ensureUser(userId, email, displayName);

    // Load agent profile with mode and tools configuration
    let agent: any = null;
    if (agentId) {
      agent = await getAgentProfile(agentId, EMTEK_ORG_ID);
      if (!agent) {
        console.error('Agent not found:', agentId);
        return res.status(404).json({ error: 'Chat agent not found' });
      }
      console.log(`📋 Agent loaded: ${agent.name} (${agent.department}) - Mode: ${agent.mode}`);
    }

    // Ensure chat session exists
    let chat_id = chatId;
    if (!chat_id) {
      const { data: chat, error } = await supabaseAdmin
        .from('chats')
        .insert([
          {
            org_id: EMTEK_ORG_ID,
            project_id: projectId || null,
            agent_id: agentId || null,
            title: null,
            mode: mode || 'normal',
            created_by: userId
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Chat creation error:', error);
        return res.status(500).json({ error: error.message });
      }
      chat_id = chat.id;
    }

    // Persist user message
    const messageType = hasImages ? 'mixed' : 'text';
    const userAttachments = hasImages
      ? imageUrls.map((url: string) => ({
          type: 'image',
          url,
          alt: 'User uploaded image'
        }))
      : null;

    const { error: userInsertError } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          chat_id,
          role: 'user',
          content_md: userContent,
          model: 'user',
          message_type: messageType,
          attachments: userAttachments
        }
      ]);

    if (userInsertError) {
      console.error('User message insert error:', userInsertError);
      return res.status(500).json({ error: userInsertError.message });
    }

    const sse = initResponseStream(res);
    req.on('close', () => sse.end());
    req.on('end', () => sse.end());

    const startTime = Date.now();

    try {
      const isComplexTask =
        /\b(code|debug|analy[sz]e|architecture|integration)\b/i.test(userContent);
      const isCodeTask =
        /\b(function|bug|script|stack trace|error)\b/i.test(userContent);

      const selectedModel = selectModel({
        hasImages,
        isComplexTask,
        isCodeTask,
        messageLength: userContent.length
      });

      const reasoningEffort = selectReasoningEffort({
        isComplexTask,
        isCodeTask,
        messageLength: userContent.length
      });

      // Get mode and allowed tools from agent or use defaults
      const agentMode = agent?.mode || 'hybrid';
      const allowedTools = agent?.allowed_tools || [
        'document_search',
        'vision_analysis',
        'web_search_preview',
        'code_interpreter',
        'image_generation'
      ];

      console.log(`🔧 Agent Mode: ${agentMode}, Allowed Tools:`, allowedTools);

      // Compose system prompt with mode-specific instructions
      let instructions: string;
      if (agent) {
        instructions = composeSystemMessageFromProfile(agent, {
          userContext: {
            name: displayName,
            email: email,
            department: undefined
          }
        });
      } else {
        const basePrompt = `You are EMtek's intelligent IT Assistant powered by GPT-5. You have access to powerful tools for helping EMtek staff.`;
        const modeInstructions = getModeInstructions(agentMode);
        instructions = basePrompt + modeInstructions + `

# Response Style
- Clear and helpful with step-by-step guidance
- Australian English terminology
- Use markdown formatting (headings, lists, code blocks, tables)
- Reference previous conversation context
- Warn about risky operations

Always prioritize accuracy, safety, and helpful guidance for EMtek staff.`;
      }

      // Build tool list based on agent configuration and mode
      const tools: any[] = [];
      const isImageRequest = detectImageGenerationRequest(userContent, messages.slice(-5));
      
      // FAST PATH: Pure image generation requests
      const pureImageFastPath =
        isImageRequest &&
        !hasImages &&
        !/\b(search|explain|sources?|reference|why|how|analy[sz]e|compare|research|document|docs?)\b/i.test(userContent) &&
        agentMode !== 'tools'; // still allow agents, just not forced tools

      if (pureImageFastPath && allowedTools.includes('image_generation')) {
        console.log('🚀 FAST PATH: Pure image generation via built-in tool');
        
        const imageOnlyInput = buildResponsesInput({
          conversationHistory: [],
          userMessage: userContent,
          imageUrls: []
        });

        // Only advertise the image_generation tool; nothing else.
        const stepResult = await streamModelStep({
          model: 'gpt-5-nano' as ResponseModel,
          instructions,
          input: imageOnlyInput,
          tools: [{ type: 'image_generation' }],
          // IMPORTANT: do not send reasoning with image_generation tool
          // reasoning: { effort: 'low' },
          sse,
          previousResponseId: undefined
        });

        sse.write({ type: 'done', done: true, response_id: stepResult.responseId });
        sse.end();

        await persistAssistantMessage({
          chat_id,
          content: stepResult.text,
          model: 'gpt-5-nano',
          images: stepResult.images,
          toolCalls: [],
          supabaseAdmin
        });

        logAIOperation('chat_complete', {
          model: 'gpt-5-nano',
          chatId: chat_id,
          userId,
          duration: Date.now() - startTime,
          responseId: stepResult.responseId,
          fastPath: true,
          generatedImageCount: stepResult.images.length
        });

        return;
      }

      // Build tools based on mode and agent configuration
      if (agentMode === 'prompt') {
        // In prompt mode, don't provide any tools
        console.log('📝 PROMPT MODE: No tools provided');
      } else {
        // In tools or hybrid mode, filter tools by allowed_tools
        
        // Built-in tools (OpenAI native) - Responses API format
        if (isImageRequest && allowedTools.includes('image_generation')) {
          tools.push({ type: 'image_generation' });
        }
        // Only add web search if we're NOT just making an image
        if (!isImageRequest && allowedTools.includes('web_search_preview')) {
          tools.push({ type: 'web_search_preview' });
        }
        if ((isComplexTask || isCodeTask) && allowedTools.includes('code_interpreter')) {
          tools.push({ type: 'code_interpreter' });
        }

        // Custom function tools from TOOL_REGISTRY
        const customTools = TOOL_REGISTRY.filter(tool =>
          allowedTools.includes(tool.function.name)
        );
        
        // Add custom tools (they're already in the correct format)
        tools.push(...customTools);

        console.log(`🔧 Tools enabled (${tools.length}):`, tools.map(t => {
          if (t.type === 'function') return `function:${t.function.name}`;
          return t.type;
        }));
      }

      let effectiveReasoning: ReasoningEffort = reasoningEffort;
      if (tools.some((tool) => tool.type === 'web_search_preview') && effectiveReasoning === 'minimal') {
        effectiveReasoning = 'low';
      }
      if (tools.some((tool) => tool.type === 'code_interpreter') && effectiveReasoning === 'low') {
        effectiveReasoning = 'medium';
      }
      // NEW: image_generation cannot be used with 'minimal' effort
      if (tools.some((tool) => tool.type === 'image_generation') && effectiveReasoning === 'minimal') {
        effectiveReasoning = 'low';
      }

      logAIOperation('chat_start', {
        model: selectedModel,
        chatId: chat_id,
        userId,
        messageLength: userContent.length,
        hasImages,
        isComplexTask,
        isCodeTask,
        reasoningEffort: effectiveReasoning
      });

      const conversationHistory = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role,
        content: msg.content || msg.content_md || ''
      }));

      const initialInput = buildResponsesInput({
        conversationHistory,
        userMessage: userContent,
        imageUrls: hasImages ? imageUrls : []
      });

      console.log('🚀 Using Responses API:', {
        model: selectedModel,
        reasoning: reasoningEffort,
        tools: tools.map((tool) => tool.type || tool.name),
        hasImages,
        isImageRequest
      });

      let aggregatedAssistantContent = '';
      const executedToolCalls: ExecutedToolCall[] = [];
      const generatedImages: GeneratedImage[] = [];

      let previousResponseId: string | undefined;
      let currentInput: any = initialInput;
      let isFirstStep = true;
      let finalResponseId = '';

      while (true) {
        const stepResult = await streamModelStep({
          model: selectedModel,
          instructions: isFirstStep ? instructions : undefined,
          input: currentInput,
          tools,
          reasoning: isFirstStep ? { effort: effectiveReasoning as ReasoningEffort } : undefined,
          sse,
          previousResponseId
        });

        aggregatedAssistantContent += stepResult.text;
        generatedImages.push(...stepResult.images);
        finalResponseId = stepResult.responseId || finalResponseId;

        // Only continue the loop for custom function calls (not built-in tools)
        if (stepResult.toolCalls.length === 0) {
          break;
        }

        // Execute custom function calls and continue conversation
        const toolResponses: any[] = [];
        for (const toolCall of stepResult.toolCalls) {
          const executed = await resolveFunctionCall(toolCall, { agentId, sse });
          executedToolCalls.push(executed);

          toolResponses.push({
            role: 'tool',
            tool_call_id: toolCall.call_id,
            content: [{ type: 'output_text', text: executed.result }]
          });
        }

        currentInput = toolResponses;
        previousResponseId = stepResult.responseId;
        isFirstStep = false;
      }

      sse.write({ type: 'done', done: true, response_id: finalResponseId });
      sse.end();

      // Persist assistant message
      await persistAssistantMessage({
        chat_id,
        content: aggregatedAssistantContent,
        model: selectedModel,
        images: generatedImages,
        toolCalls: executedToolCalls,
        supabaseAdmin
      });

      // Kick off knowledge extraction asynchronously
      if (projectId && process.env.APP_BASE_URL) {
        fetch(`${process.env.APP_BASE_URL}/api/project-knowledge/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: req.headers.cookie || ''
          },
          body: JSON.stringify({ chatId: chat_id })
        }).catch((error) => {
          console.error('Knowledge extraction failed:', error);
        });
      }

      logAIOperation('chat_complete', {
        model: selectedModel,
        chatId: chat_id,
        userId,
        duration: Date.now() - startTime,
        responseId: finalResponseId,
        toolCallCount: executedToolCalls.length,
        generatedImageCount: generatedImages.length,
        reasoningEffort: effectiveReasoning
      });
    } catch (streamError: any) {
      console.error('Streaming error:', streamError);
      logAIOperation('chat_error', {
        chatId: chat_id,
        userId,
        error: streamError.message,
        duration: Date.now() - startTime
      });
      sse.write({ type: 'error', error: streamError.message || 'Failed to generate response' });
      sse.end();
    }
  } catch (error: any) {
    console.error('Unexpected chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function streamModelStep(options: {
  model: ResponseModel;
  instructions?: string;
  input: string | any[];
  tools?: any[];
  reasoning?: { effort: ReasoningEffort };
  sse: SSEStream;
  previousResponseId?: string;
}): Promise<StreamStepResult> {
  const { model, instructions, input, tools = [], reasoning, sse, previousResponseId } = options;

  // If image_generation tool is present, do NOT attach reasoning to avoid 400
  const includesImageGen = tools.some((t: any) => t.type === 'image_generation');

  const streamOptions: any = {
    model,
    input,
    stream: true,
    store: !previousResponseId
  };

  if (instructions) {
    streamOptions.instructions = instructions;
  }

  if (reasoning && !includesImageGen) {
    streamOptions.reasoning = reasoning;
  }

  if (tools.length > 0) {
    streamOptions.tools = tools;
    // Log the actual tools being sent to debug format issues
    console.log('📤 Tools being sent to OpenAI API:', JSON.stringify(tools, null, 2));
  }

  if (previousResponseId) {
    streamOptions.previous_response_id = previousResponseId;
  }

  const stream = await import('../../lib/ai').then(({ openai }) => openai.responses.create(streamOptions));

  let stepContent = '';
  let responseId = previousResponseId || '';
  const pendingCalls = new Map<string, StreamedToolCall>();
  const completedCalls: StreamedToolCall[] = [];
  const generatedImages: GeneratedImage[] = [];
  const imageChunks = new Map<number, string>(); // index -> base64

  for await (const event of stream as any) {
    switch (event.type) {
      case 'response.created': {
        if (event.response?.id) {
          responseId = event.response.id;
        }
        sse.write({ type: 'response_created', id: event.response?.id });
        break;
      }
      case 'response.output_text.delta': {
        if (event.delta) {
          stepContent += event.delta;
          sse.write({ type: 'delta', delta: event.delta, content: event.delta });
        }
        break;
      }
      case 'response.output_text.done': {
        sse.write({ type: 'text_done', text: event.text });
        break;
      }
      case 'response.image_generation_call.partial_image': {
        const b64Data = event.partial_image_b64 || event.b64_json;
        if (b64Data) {
          sse.write({
            type: 'partial_image',
            b64_json: b64Data,
            partial_image_index: event.partial_image_index ?? 0
          });
        }
        break;
      }
      case 'image_generation.partial_image': {
        if (event.b64_json) {
          sse.write({
            type: 'partial_image',
            b64_json: event.b64_json,
            partial_image_index: event.partial_image_index ?? 0,
            quality: event.quality,
            size: event.size,
            output_format: event.output_format
          });
        }
        break;
      }
      case 'image_generation.completed': {
        if (event.b64_json) {
          try {
            const stored = await uploadGeneratedImage(event.b64_json, `image/${event.output_format || 'png'}`);
            generatedImages.push(stored);
            stepContent += `\n\n${stored.markdown}\n`;
            sse.write({
              type: 'image',
              url: stored.url,
              storagePath: stored.storagePath,
              format: stored.format
            });
          } catch (imageError: any) {
            console.error('Image storage error:', imageError);
            sse.write({
              type: 'error',
              error: imageError?.message || 'Failed to store generated image'
            });
          }
        }
        break;
      }

      case 'response.output_image.delta': {
        const idx = event.index ?? 0;
        const prev = imageChunks.get(idx) ?? '';
        imageChunks.set(idx, prev + (event.delta || ''));
        sse.write({
          type: 'partial_image',
          b64_json: event.delta,
          partial_image_index: idx
        });
        break;
      }

      case 'response.output_image.completed': {
        const idx = event.index ?? 0;
        const b64 = imageChunks.get(idx);
        if (b64) {
          try {
            const mime = event?.media?.mime_type || 'image/png';
            const stored = await uploadGeneratedImage(b64, mime);
            generatedImages.push(stored);
            stepContent += `\n\n${stored.markdown}\n`;
            sse.write({
              type: 'image',
              url: stored.url,
              storagePath: stored.storagePath,
              format: stored.format
            });
          } catch (e: any) {
            console.error('Image storage error:', e);
            sse.write({ type: 'error', error: e?.message || 'Failed to store generated image' });
          } finally {
            imageChunks.delete(idx);
          }
        }
        break;
      }

      case 'response.output_item.added': {
        if (event.item?.type === 'tool_call') {
          pendingCalls.set(event.item.id, {
            id: event.item.id,
            call_id: event.item.call_id,
            name: event.item.name,
            arguments: ''
          });
        }
        break;
      }

      // Accumulate tool-call arguments as they stream
      case 'response.tool_call.delta': {
        const { id, delta } = event;
        const pending = pendingCalls.get(id);
        if (pending) {
          if (typeof delta === 'string') pending.arguments += delta;
          else if (delta) pending.arguments += JSON.stringify(delta);
        }
        break;
      }

      case 'response.output_item.done': {
        if (event.item?.type === 'tool_call') {
          const pending = pendingCalls.get(event.item.id);
          if (pending) {
            const finalArgs =
              typeof event.item.arguments === 'string'
                ? event.item.arguments
                : event.item.arguments
                ? JSON.stringify(event.item.arguments)
                : pending.arguments;
            completedCalls.push({ ...pending, arguments: finalArgs });
            pendingCalls.delete(event.item.id);
          }
        } else if (event.item?.type === 'image_generation_call') {
          // Built-in tool - handle image but don't add to completedCalls
          const resultPayload = extractBase64Image(event.item.result);
          const mimeType = event.item?.media?.[0]?.mime_type;
          if (resultPayload) {
            try {
              const stored = await uploadGeneratedImage(resultPayload, mimeType);
              generatedImages.push(stored);
              stepContent += `\n\n${stored.markdown}\n`;
              sse.write({
                type: 'image',
                url: stored.url,
                storagePath: stored.storagePath,
                format: stored.format
              });
            } catch (imageError: any) {
              console.error('Image storage error:', imageError);
              sse.write({
                type: 'error',
                error: imageError?.message || 'Failed to store generated image'
              });
            }
          }
        }
        break;
      }
      case 'response.completed': {
        if (event.response?.id) {
          responseId = event.response.id;
        }
        break;
      }
      case 'response.failed': {
        throw new Error(event.error?.message || 'Response failed');
      }
      default:
        break;
    }
  }

  return {
    text: stepContent,
    responseId,
    toolCalls: completedCalls,
    images: generatedImages
  };
}

async function resolveFunctionCall(
  functionCall: StreamedToolCall,
  context: { agentId?: string; sse: SSEStream }
): Promise<ExecutedToolCall> {
  const { agentId, sse } = context;

  let resultText = '';
  let status: ExecutedToolCall['status'] = 'completed';

  try {
    const args = parseFunctionArguments(functionCall.arguments);

    switch (functionCall.name) {
      case 'document_search': {
        resultText = await handleDocumentSearch(args as { query?: string }, agentId);
        break;
      }
      default: {
        resultText = `Function "${functionCall.name}" is not implemented.`;
        status = 'failed';
      }
    }
  } catch (error: any) {
    console.error(`Function execution error for ${functionCall.name}:`, error);
    resultText = `Error executing ${functionCall.name}: ${error.message || 'Unknown error'}`;
    status = 'failed';
  }

  sse.write({
    type: 'function_result',
    call_id: functionCall.call_id,
    name: functionCall.name,
    result: resultText,
    status
  });

  return {
    ...functionCall,
    status,
    result: resultText
  };
}

async function uploadGeneratedImage(base64Data: string, mimeType?: string): Promise<GeneratedImage> {
  const format = deriveImageFormat(mimeType);
  const ext = format === 'jpeg' ? 'jpg' : format;
  const buffer = Buffer.from(base64Data, 'base64');
  const storagePath = `generated-images/ai-${crypto.randomUUID()}.${ext}`;
  const contentType =
    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

  const { error: uploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from('media')
    .createSignedUrl(storagePath, 24 * 60 * 60);

  if (signedError || !signed?.signedUrl) {
    throw new Error(`Signed URL creation failed: ${signedError?.message ?? 'Unknown error'}`);
  }

  const markdown = `![Generated image](${signed.signedUrl})`;
  return {
    url: signed.signedUrl,
    storagePath,
    format,
    markdown
  };
}

function deriveImageFormat(mimeType?: string): 'png' | 'jpeg' | 'webp' {
  if (!mimeType) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

function extractBase64Image(resultField: any): string | null {
  if (!resultField) return null;

  if (typeof resultField === 'string') {
    return resultField;
  }

  if (Array.isArray(resultField) && resultField.length > 0) {
    const first = resultField[0];
    if (typeof first === 'string') {
      return first;
    }
    if (first && typeof first.b64_json === 'string') {
      return first.b64_json;
    }
  }

  if (typeof resultField?.b64_json === 'string') {
    return resultField.b64_json;
  }
  if (resultField?.data?.[0]?.b64_json) {
    return resultField.data[0].b64_json;
  }
  return null;
}

function parseFunctionArguments(args: string | object | null | undefined): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === 'object') return args as Record<string, unknown>;

  try {
    return JSON.parse(args);
  } catch {
    return { raw: args };
  }
}

// Handle custom document search function (tool execution)
async function handleDocumentSearch(
  args: { query?: string },
  agentId?: string
): Promise<string> {
  const query = args?.query?.trim();
  if (!query) {
    return 'Document search requires a query string.';
  }

  if (!agentId) {
    return 'Document search requires an agent context.';
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data: chunks, error } = await supabaseAdmin.rpc('match_document_chunks', {
      agent_id_param: agentId,
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5
      }
    );

    if (error) {
      console.error('Document search error:', error);
      return 'Error searching documents.';
    }

    if (!chunks || chunks.length === 0) {
      return 'No relevant documents found for your query.';
    }

    const results = chunks
      .map(
        (chunk: any, index: number) =>
          `### Result ${index + 1}\n${chunk.content?.trim() || '(No preview available)'}`
      )
      .join('\n\n');

    return `## Document Search Results\n\n${results}`;
  } catch (error: any) {
    console.error('Document search error:', error);
    return `Error searching documents: ${error.message || 'Unknown error'}`;
  }
}

// Helper to persist assistant messages (DRY for fast path and normal path)
async function persistAssistantMessage(options: {
  chat_id: string;
  content: string;
  model: string;
  images: GeneratedImage[];
  toolCalls: ExecutedToolCall[];
  supabaseAdmin: any;
}): Promise<void> {
  const { chat_id, content, model, images, toolCalls, supabaseAdmin } = options;

  const hasText = content.trim().length > 0;
  const hasGeneratedImages = images.length > 0;

  const assistantMessageData: any = {
    chat_id,
    role: 'assistant',
    content_md: content,
    model,
    message_type: hasGeneratedImages && hasText ? 'mixed' : hasGeneratedImages ? 'image' : 'text'
  };

  if (toolCalls.length > 0) {
    assistantMessageData.tool_calls = toolCalls;
  }

  if (hasGeneratedImages) {
    assistantMessageData.attachments = images.map((image) => ({
      type: 'image',
      url: image.url,
      storagePath: image.storagePath,
      format: image.format
    }));
  }

  const { error: assistantInsertError } = await supabaseAdmin
    .from('messages')
    .insert([assistantMessageData]);

  if (assistantInsertError) {
    console.error('Assistant message error:', assistantInsertError);
  }
}
