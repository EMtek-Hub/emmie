import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { 
  openai, 
  selectGPT5Model, 
  selectReasoningEffort,
  detectImageGenerationRequest,
  generateEmbedding
} from '../../lib/ai';
import { 
  toolExecutor, 
  getAgentToolsConfig, 
  convertToolsToOpenAIFormat,
  convertToolsToAssistantFormat,
  ToolExecutionContext 
} from '../../lib/toolExecution';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId, projectId, messages, mode, agentId, imageUrls = [] } = req.body;
  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  // Extract user content and image info early
  const userContent = messages[messages.length - 1]?.content || '';
  const hasImages = imageUrls.length > 0;

  console.log(`🔍 Chat API Debug - AgentId: ${agentId}, ChatId: ${chatId}`);

  try {
    // Ensure user exists
    await ensureUser(userId, email, displayName);

    // 1) Load agent information if specified
    let agent = null;
    if (agentId) {
      console.log(`🔍 Looking up agent: ${agentId} with org_id: ${EMTEK_ORG_ID}`);
      const { data: agentData, error: agentError } = await supabaseAdmin
        .from('chat_agents')
        .select('*')
        .eq('id', agentId)
        .eq('org_id', EMTEK_ORG_ID)
        .eq('is_active', true)
        .single();

      if (agentError || !agentData) {
        console.error('Agent fetch error:', agentError);
        return res.status(404).json({ error: 'Chat agent not found' });
      }
      agent = agentData;
      
      // Check if agent uses OpenAI Assistant
      if (agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id) {
        console.log(`🤖 Using OpenAI Assistant: ${agent.openai_assistant_id} for agent: ${agent.name}`);
        return handleOpenAIAssistantChat(req, res, {
          agent,
          chatId,
          projectId,
          userContent,
          hasImages,
          imageUrls,
          messages,
          userId,
          session
        });
      }
    }

    // 2) Ensure chat exists
    let chat_id = chatId;
    if (!chat_id) {
      const { data: chat, error } = await supabaseAdmin
        .from('chats')
        .insert([{
          org_id: EMTEK_ORG_ID,
          project_id: projectId || null,
          agent_id: agentId || null,
          title: null,
          mode: mode || 'normal',
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('Chat creation error:', error);
        return res.status(500).json({ error: error.message });
      }
      chat_id = chat.id;
    }

    // 3) Insert user message with attachments if present
    const messageType = hasImages ? 'mixed' : 'text';
    const attachments = hasImages ? imageUrls.map((url: string) => ({
      type: 'image',
      url: url,
      alt: 'User uploaded image'
    })) : null;

    // Build insert object conditionally to handle missing columns
    const userMessageData: any = {
      chat_id,
      role: 'user',
      content_md: userContent,
      model: 'user'
    };

    // Try to add multimodal fields if they exist
    try {
      const { error: columnCheck } = await supabaseAdmin
        .from('messages')
        .select('message_type, attachments')
        .limit(0);
      
      if (!columnCheck) {
        userMessageData.message_type = messageType;
        userMessageData.attachments = attachments;
      }
    } catch (e) {
      console.log('Multimodal columns not found, skipping attachments');
    }

    const { data: userMsg, error: umErr } = await supabaseAdmin
      .from('messages')
      .insert([userMessageData])
      .select()
      .single();

    if (umErr) {
      console.error('User message error:', umErr);
      return res.status(500).json({ error: umErr.message });
    }

    // 4) Prepare SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 5) Determine model and reasoning settings
      const isComplexTask = userContent.includes('code') || userContent.includes('debug') || userContent.includes('analyze');
      const isCodeTask = userContent.includes('function') || userContent.includes('bug') || userContent.includes('script');
      
      const selectedModel = selectGPT5Model({
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

      // 6) Build system prompt for GPT-5
      const systemPrompt = agent?.system_prompt || 
        `You are EMtek's intelligent IT Assistant powered by GPT-5. You have access to powerful tools and can:

1) **Generate and edit images** using the built-in image_generation tool for visualizations, diagrams, and illustrations
2) **Search company knowledge** using document_search for EMtek IT procedures, policies, and guides  
3) **Analyze uploaded images** using vision_analysis for troubleshooting screenshots, error messages, and hardware photos
4) **Search project documentation** using project_knowledge for project-specific technical information
5) **Execute code** using code_interpreter for debugging and analysis
6) **Search the web** for up-to-date information when needed

# Tool Usage Guidelines
- **Before calling any tool, briefly explain why you're using it** (preamble)
- Use image_generation for visual requests: "generate image of...", "make the clouds green", "create a diagram"
- Use document_search when users ask about EMtek procedures, policies, or IT guidance
- Use vision_analysis when users upload images for troubleshooting or analysis
- Use project_knowledge for project-specific questions when projectId is available
- Use code_interpreter for debugging, code analysis, or complex calculations

# Response Style
- **Clear and helpful**: Provide step-by-step guidance for technical issues
- **Australian English**: Use local terminology and spelling
- **Formatted answers**: Use headings, bullet points, code blocks, and tables
- **Contextual**: Reference previous conversation and uploaded images
- **Safe**: Warn about risky operations and suggest alternatives

# Image Generation Capabilities
- Generate diagrams, illustrations, and visual aids
- Edit and modify existing images based on context
- Create technical documentation visuals
- Support transparent backgrounds and various formats

Always prioritize accuracy, safety, and helpful guidance for EMtek staff.`;

      const fullPrompt = agent?.background_instructions 
        ? `${systemPrompt}\n\nBackground Context: ${agent.background_instructions}`
        : systemPrompt;

      // 7) Prepare input for Responses API
      let input: any;
      
      if (hasImages && imageUrls.length > 0) {
        // Multi-modal input with images
        input = [
          {
            role: "user",
            content: [
              { type: "input_text", text: userContent },
              ...imageUrls.map(url => ({
                type: "input_image",
                image_url: url
              }))
            ]
          }
        ];
      } else {
        // Text-only input
        input = userContent;
      }

      // 8) Get agent-specific tools from the new tool management system
      const agentTools = agentId ? await getAgentToolsConfig(agentId) : [];
      console.log(`🔧 Agent tools loaded: ${agentTools.map(t => t.tool_name).join(', ')}`);

      // 9) Detect if this is an image generation request
      const isImageGenerationRequest = detectImageGenerationRequest(userContent, messages.slice(-5));
      
      // 10) Prepare tools for the AI models
      const availableTools: any[] = [];
      
      // Add built-in tools that are always available
      availableTools.push({ type: 'image_generation' });
      availableTools.push({ type: 'web_search' });
      
      // Add agent-specific tools
      agentTools.forEach(tool => {
        if (tool.tool_type === 'code_interpreter') {
          availableTools.push({ type: 'code_interpreter' });
        } else if (tool.tool_type === 'file_search') {
          availableTools.push({ type: 'file_search' });
        } else if (tool.tool_type === 'function' && tool.function_schema) {
          availableTools.push({
            type: 'function',
            function: tool.function_schema
          });
        }
      });

      // 11) Build conversation history for context
      const conversationHistory = messages.slice(-10);
      let fullInput: any[] = [];
      
      // Add system message as instructions
      const instructions = fullPrompt;

      // Add conversation history (exclude current message)
      for (const msg of conversationHistory.slice(0, -1)) {
        if (msg.role === 'user') {
          fullInput.push({
            role: 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          });
        } else if (msg.role === 'assistant') {
          fullInput.push({
            role: 'assistant', 
            content: msg.content
          });
        }
      }

      // Add current user message with images if present
      if (hasImages && imageUrls.length > 0) {
        fullInput.push({
          role: "user",
          content: [
            { type: "input_text", text: userContent },
            ...imageUrls.map(url => ({
              type: "input_image",
              image_url: { url: url }
            }))
          ]
        });
      } else {
        fullInput.push({
          role: "user",
          content: userContent
        });
      }

      // 12) Use native Responses API for proper image generation support
      console.log(`🚀 Using GPT-5 Responses API with model: ${selectedModel}`);
      console.log(`🔧 Available tools: ${availableTools.map(t => t.type || t.function?.name).join(', ')}`);
      console.log(`🎨 Image generation request detected: ${isImageGenerationRequest}`);
      
      // Build tools for Responses API
      const responsesTools: any[] = [];
      
      // Add tools from the available tools list
      availableTools.forEach(tool => {
        if (tool.type === 'image_generation' || tool.type === 'web_search' || tool.type === 'code_interpreter' || tool.type === 'file_search') {
          responsesTools.push(tool);
        } else if (tool.type === 'function') {
          responsesTools.push(tool);
        }
      });

      // Use direct image generation approach since Responses API has SDK limitations
      let assistantContent = '';
      let functionCalls: any[] = [];
      let isGeneratingImage = false;

      // 13) Handle image generation requests directly
      if (isImageGenerationRequest) {
        try {
          console.log('🎨 Generating image using native integration...');
          send('image_generation_start', { id: 'native-gen' });
          
          const { generateImageWithFallback } = await import('../../lib/ai');
          
          const result = await generateImageWithFallback(userContent, {
            chatId: chat_id
          });

          if (result.data && result.data.b64_json) {
            const imageResult = await handleImageGenerationResult(result.data.b64_json, chat_id);
            
            assistantContent += `\n\n![Generated Image](${imageResult})`;
            send('image_generated', { 
              url: imageResult,
              alt: `AI-generated image: ${userContent}`,
              messageId: 'native-gen',
              model: result.modelUsed,
              prompt: userContent
            });
            
            console.log(`✅ Image generated successfully with ${result.modelUsed}`);
            isGeneratingImage = true;
          }
        } catch (imageError) {
          console.error('Image generation error:', imageError);
          send('error', { error: 'Failed to generate image' });
        }
      } else {
        // For non-image requests, use Chat Completions API for text responses
        try {
          // Build tools array for Chat Completions API
          const chatTools: any[] = [];
          
          // Add function tools from available tools
          availableTools.forEach(tool => {
            if (tool.type === 'function') {
              chatTools.push(tool);
            }
          });
          
          // Build chat messages
          const chatMessages: any[] = [
            { role: 'system', content: instructions }
          ];
          
          // Add conversation history
          for (const msg of conversationHistory.slice(0, -1)) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              chatMessages.push({
                role: msg.role,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              });
            }
          }
          
          // Add current message with proper format
          if (hasImages && imageUrls.length > 0) {
            const content: any[] = [
              { type: 'text', text: userContent }
            ];
            
            for (const imageUrl of imageUrls) {
              content.push({
                type: 'image_url',
                image_url: { url: imageUrl }
              });
            }
            
            chatMessages.push({ role: 'user', content });
          } else {
            chatMessages.push({ role: 'user', content: userContent });
          }

          // Convert chat messages to input format for Responses API
          let conversationInput = '';
          
          // Add conversation history  
          for (const msg of chatMessages.slice(1)) { // Skip system message
            if (msg.role === 'user') {
              if (typeof msg.content === 'string') {
                conversationInput += `User: ${msg.content}\n\n`;
              } else {
                // Handle multimodal content
                const textContent = msg.content.find(c => c.type === 'text')?.text || '';
                conversationInput += `User: ${textContent}\n\n`;
              }
            } else if (msg.role === 'assistant') {
              conversationInput += `Assistant: ${msg.content}\n\n`;
            }
          }
          
          conversationInput += `User: ${userContent}\n\nAssistant:`;

          // Prepare tools for Responses API using available tools
          const responsesApiTools: any[] = [...responsesTools];

          // Use Responses API with proper input format
          let responseInput: any;
          
          if (hasImages && imageUrls.length > 0) {
            // Build multimodal input for Responses API
            responseInput = [
              ...chatMessages.slice(1, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: typeof msg.content === 'string' ? msg.content : 
                         msg.content.find?.(c => c.type === 'text')?.text || JSON.stringify(msg.content)
              })),
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: userContent },
                  ...imageUrls.map(url => ({
                    type: 'input_image',
                    image_url: { url: url }
                  }))
                ]
              }
            ];
          } else {
            responseInput = conversationInput;
          }

          const response = await openai.responses.create({
            model: selectedModel,
            instructions: instructions,
            input: responseInput,
            reasoning: { effort: reasoningEffort as any },
            tools: responsesApiTools.length > 0 ? responsesApiTools : undefined
          });

          // Handle the response from Responses API
          if (response.output && Array.isArray(response.output)) {
            // Check for tool calls in the output
            for (const outputItem of response.output) {
              if (outputItem.type === 'function_call') {
                // Handle custom tool call
                try {
                  const args = JSON.parse(outputItem.arguments as string);
                  const toolCall = {
                    name: outputItem.name,
                    parsedArgs: args,
                    id: outputItem.id || 'custom-call'
                  };

                  send('tool_call_start', { 
                    toolName: toolCall.name,
                    toolType: 'function' 
                  });

                  const functionResult = await handleFunctionCall(toolCall, agentId, projectId);
                  if (functionResult) {
                    assistantContent += `\n\n${functionResult}`;
                    send('tool_result', { 
                      toolName: toolCall.name,
                      result: functionResult 
                    });
                  }

                  functionCalls.push(toolCall);
                } catch (error) {
                  console.error('Tool call error:', error);
                  send('error', { error: `Tool call failed: ${error.message}` });
                }
              } else if (outputItem.type === 'message' && outputItem.role === 'assistant') {
                // Handle text content
                const content = outputItem.content?.find?.(c => c.type === 'output_text')?.text || '';
                if (content) {
                  assistantContent += content;
                  send('token', { delta: content });
                }
              }
            }
          } else {
            // Handle simple text output
            const responseText = response.output_text || '';
            assistantContent += responseText;
            send('token', { delta: responseText });
          }
        } catch (chatError) {
          console.error('Chat API error:', chatError);
          assistantContent = "I apologize, but I'm experiencing technical difficulties. Please try again or rephrase your request.";
          send('token', { delta: assistantContent });
        }
      }

      // 11) Save assistant message
      const assistantMessageData: any = {
        chat_id,
        role: 'assistant',
        content_md: assistantContent,
        model: selectedModel
      };

      // Try to add multimodal fields if they exist
      try {
        const { error: columnCheck } = await supabaseAdmin
          .from('messages')
          .select('message_type, attachments')
          .limit(0);
        
        if (!columnCheck) {
          assistantMessageData.message_type = functionCalls.some(tc => tc.type === 'image_generation_call') ? 'image' : 'text';
          if (functionCalls.length > 0) {
            assistantMessageData.tool_calls = functionCalls;
          }
        }
      } catch (e) {
        console.log('Multimodal columns not found for assistant message, skipping');
      }

      const { data: aMsg, error: amErr } = await supabaseAdmin
        .from('messages')
        .insert([assistantMessageData])
        .select()
        .single();

      if (amErr) {
        console.error('Assistant message error:', amErr);
        send('error', { error: amErr.message });
        return res.end();
      }

      // 12) (Non-blocking) extract knowledge if project chat
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

      send('done', { chatId: chat_id, messageId: aMsg.id });
      res.end();

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      send('error', { error: 'Failed to generate response' });
      res.end();
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Convert custom tools to OpenAI function format
function convertToFunctions(tools: any[]): any[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

// Handle custom tool calls
async function handleFunctionCall(functionCall: any, agentId?: string, projectId?: string): Promise<string | null> {
  const { name, parsedArgs } = functionCall;

  try {
    switch (name) {
      case 'document_search':
        if (!agentId) return null;
        return await handleDocumentSearch(parsedArgs, agentId);
        
      case 'vision_analysis':
        return await handleVisionAnalysis(parsedArgs);
        
      case 'project_knowledge':
        if (!projectId) return null;
        return await handleProjectKnowledge(parsedArgs, projectId);
        
      default:
        return null;
    }
  } catch (error) {
    console.error(`Tool call error for ${name}:`, error);
    return `Error executing ${name}: ${error.message}`;
  }
}

// Handle document search tool
async function handleDocumentSearch(args: { query: string }, agentId: string): Promise<string> {
  try {
    const { query } = args;
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar document chunks using vector similarity
    const { data: chunks, error } = await supabaseAdmin.rpc(
      'match_document_chunks', 
      {
        agent_id_param: agentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      }
    );

    if (error) {
      console.error('Document search error:', error);
      return 'Error searching documents';
    }

    if (!chunks || chunks.length === 0) {
      return 'No relevant documents found for your query.';
    }

    // Format the results
    const results = chunks.map((chunk: any, index: number) => 
      `**Result ${index + 1}:**\n${chunk.content}`
    ).join('\n\n');

    return `## Document Search Results\n\n${results}`;

  } catch (error) {
    console.error('Document search error:', error);
    return 'Error searching documents';
  }
}

// Handle vision analysis tool  
async function handleVisionAnalysis(args: { analysisRequest: string }): Promise<string> {
  const { analysisRequest } = args;
  
  // This would integrate with your existing vision analysis logic
  // For now, return a placeholder
  return `## Vision Analysis\n\nAnalyzing images for: ${analysisRequest}\n\n*Vision analysis integration pending...*`;
}

// Handle project knowledge search
async function handleProjectKnowledge(args: { query: string }, projectId: string): Promise<string> {
  const { query } = args;
  
  // This would search project-specific documentation and chat history
  return `## Project Knowledge Search\n\nSearching project ${projectId} for: ${query}\n\n*Project knowledge integration pending...*`;
}

// Handle image generation results
async function handleImageGenerationResult(base64Data: string, chatId: string): Promise<string> {
  try {
    // Convert base64 to buffer and upload to storage
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `generated-image-${chatId}-${timestamp}.png`;
    
    // Upload to Supabase storage (adjust bucket name as needed)
    const { data, error } = await supabaseAdmin.storage
      .from('chat-images')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.error('Image upload error:', error);
      // Fallback to data URL
      return `data:image/png;base64,${base64Data}`;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('chat-images')
      .getPublicUrl(filename);

    return urlData.publicUrl;

  } catch (error) {
    console.error('Image handling error:', error);
    // Fallback to data URL
    return `data:image/png;base64,${base64Data}`;
  }
}

// Handle OpenAI Assistant chat integration
async function handleOpenAIAssistantChat(
  req: NextApiRequest, 
  res: NextApiResponse, 
  params: {
    agent: any;
    chatId: string;
    projectId?: string;
    userContent: string;
    hasImages: boolean;
    imageUrls: string[];
    messages: any[];
    userId: string;
    session: any;
  }
) {
  const { agent, chatId, projectId, userContent, hasImages, imageUrls, messages, userId } = params;

  try {
    // 1) Ensure chat exists
    let chat_id = chatId;
    if (!chat_id) {
      const { data: chat, error } = await supabaseAdmin
        .from('chats')
        .insert([{
          org_id: EMTEK_ORG_ID,
          project_id: projectId || null,
          agent_id: agent.id,
          title: null,
          mode: 'normal',
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('Chat creation error:', error);
        return res.status(500).json({ error: error.message });
      }
      chat_id = chat.id;
    }

    // 2) Insert user message
    const messageType = hasImages ? 'mixed' : 'text';
    const attachments = hasImages ? imageUrls.map((url: string) => ({
      type: 'image',
      url: url,
      alt: 'User uploaded image'
    })) : null;

    const userMessageData: any = {
      chat_id,
      role: 'user',
      content_md: userContent,
      model: 'user'
    };

    // Try to add multimodal fields if they exist
    try {
      const { error: columnCheck } = await supabaseAdmin
        .from('messages')
        .select('message_type, attachments')
        .limit(0);
      
      if (!columnCheck) {
        userMessageData.message_type = messageType;
        userMessageData.attachments = attachments;
      }
    } catch (e) {
      console.log('Multimodal columns not found, skipping attachments');
    }

    const { data: userMsg, error: umErr } = await supabaseAdmin
      .from('messages')
      .insert([userMessageData])
      .select()
      .single();

    if (umErr) {
      console.error('User message error:', umErr);
      return res.status(500).json({ error: umErr.message });
    }

    // 3) Setup SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 4) Create thread for this conversation
      const thread = await openai.beta.threads.create();

      // 5) Add conversation history to thread (last 10 messages)
      const conversationHistory = messages.slice(-10);
      for (const msg of conversationHistory.slice(0, -1)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          await openai.beta.threads.messages.create(thread.id, {
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          });
        }
      }

      // 6) Add current user message with images if present
      let messageContent: any = userContent;
      
      if (hasImages && imageUrls.length > 0) {
        messageContent = [
          { type: 'text', text: userContent },
          ...imageUrls.map(url => ({
            type: 'image_url',
            image_url: { url: url }
          }))
        ];
      }

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: messageContent
      });

      // 7) Run the assistant and stream the response
      let assistantContent = '';
      
      const stream = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: agent.openai_assistant_id,
        stream: true
      });

      for await (const event of stream) {
        if (event.event === 'thread.message.delta') {
          const delta = event.data.delta;
          if (delta.content && delta.content[0]) {
            const contentBlock = delta.content[0];
            if (contentBlock.type === 'text' && contentBlock.text) {
              const textDelta = contentBlock.text.value || '';
              if (textDelta) {
                assistantContent += textDelta;
                send('token', { delta: textDelta });
              }
            }
          }
        } else if (event.event === 'thread.message.completed') {
          // Message completed, continue
        } else if (event.event === 'thread.run.completed') {
          // Run completed successfully
          break;
        } else if (event.event === 'thread.run.failed') {
          console.error('Assistant run failed:', event.data);
          send('error', { error: 'Assistant run failed' });
          break;
        } else if (event.event === 'thread.run.requires_action') {
          // Handle tool calls if the assistant needs them
          const toolCalls = event.data.required_action?.submit_tool_outputs?.tool_calls || [];
          
          for (const toolCall of toolCalls) {
            if (toolCall.function) {
              send('tool_call_start', { 
                toolName: toolCall.function.name,
                toolType: 'function' 
              });

              // Handle function call (you could extend this to support more tools)
              let toolResult = `Function ${toolCall.function.name} called with arguments: ${toolCall.function.arguments}`;
              
              send('tool_result', { 
                toolName: toolCall.function.name,
                result: toolResult 
              });

              // Submit tool output back to the assistant
              await openai.beta.threads.runs.submitToolOutputs(thread.id, event.data.id, {
                tool_outputs: [{
                  tool_call_id: toolCall.id,
                  output: toolResult
                }]
              });
            }
          }
        }
      }

      // 8) Save assistant message
      const assistantMessageData: any = {
        chat_id,
        role: 'assistant',
        content_md: assistantContent,
        model: `openai-assistant:${agent.openai_assistant_id}`
      };

      // Try to add multimodal fields if they exist
      try {
        const { error: columnCheck } = await supabaseAdmin
          .from('messages')
          .select('message_type, attachments')
          .limit(0);
        
        if (!columnCheck) {
          assistantMessageData.message_type = 'text';
        }
      } catch (e) {
        console.log('Multimodal columns not found for assistant message, skipping');
      }

      const { data: aMsg, error: amErr } = await supabaseAdmin
        .from('messages')
        .insert([assistantMessageData])
        .select()
        .single();

      if (amErr) {
        console.error('Assistant message error:', amErr);
        send('error', { error: amErr.message });
        return res.end();
      }

      send('done', { chatId: chat_id, messageId: aMsg.id });
      res.end();

    } catch (assistantError) {
      console.error('OpenAI Assistant error:', assistantError);
      send('error', { error: 'Failed to process with OpenAI Assistant' });
      res.end();
    }

  } catch (error) {
    console.error('OpenAI Assistant handler error:', error);
    return res.status(500).json({ error: 'Internal server error with OpenAI Assistant' });
  }
}
