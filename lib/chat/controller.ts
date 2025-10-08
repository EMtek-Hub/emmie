// lib/chat/controller.ts - Chat request orchestration
import { NextApiRequest, NextApiResponse } from 'next';
import { initResponseStream, buildResponsesInput } from '../ai';
import { ensureUser, EMTEK_ORG_ID } from '../db';
import { getAgentProfile, type AgentProfile } from '../profiles';
import { buildSystemPrompt, selectModelAndReasoning, checkFastPathImageGeneration } from './prompting';
import { createOrGetChat, saveUserMessage, saveAssistantMessage } from './session';
import type { ChatRequestBody } from './request-schema';
import { StreamRunner } from '../ai/stream-runner';
import { ToolExecutor, type ExecutedToolCall } from '../tools/executor';
import type { ToolContext } from '../tools';
import type { GeneratedImage } from '../media/uploader';
import { logAIOperation, logger } from '../telemetry/logger';

/**
 * ChatController orchestrates a single chat request
 * No business logic - delegates to specialized modules
 */
export class ChatController {
  constructor(
    private deps: {
      session: any;
      res: NextApiResponse;
      req: NextApiRequest;
    }
  ) {}

  /**
   * Handle chat request from end to end
   */
  async handle(body: ChatRequestBody): Promise<void> {
    const { session, res, req } = this.deps;
    const { chatId, projectId, messages, mode, agentId, imageUrls = [], selectedContext = [] } = body;
    const user = session.user;

    const startTime = Date.now();
    const userContent = (messages[messages.length - 1].content_md ?? messages[messages.length - 1].content ?? '').trim();
    const hasImages = imageUrls.length > 0;

    // Fetch document context separately (don't append to userContent for display)
    let documentContext = '';
    if (selectedContext.length > 0) {
      documentContext = await this.fetchDocumentContents(selectedContext);
    }

    logger.info('Chat request started', {
      agentId,
      chatId,
      userContentLength: userContent.length,
      hasImages,
    });

    try {
      // Ensure user exists
      await ensureUser(user.id, user.email, user.name);

      // Load agent profile if specified
      let agent: AgentProfile | null = null;
      if (agentId) {
        agent = await getAgentProfile(agentId, EMTEK_ORG_ID);
        if (!agent) {
          return res.status(404).json({ error: 'Chat agent not found' });
        }
        logger.info('Agent loaded', {
          agentName: agent.name,
          agentMode: agent.mode,
        });
      }

      // Ensure chat session exists
      const chat_id = await createOrGetChat({
        chatId,
        projectId,
        agentId,
        mode,
        userId: user.id,
      });

      // Persist user message
      await saveUserMessage({
        chat_id,
        content_md: userContent,
        hasImages,
        imageUrls,
      });

      // Initialize SSE stream
      const sse = initResponseStream(res);
      req.on('close', () => sse.end());
      req.on('end', () => sse.end());

      // Get agent configuration
      const agentMode = agent?.mode || 'hybrid';
      const allowedTools = agent?.allowed_tools || [
        'document_search',
        'vision_analysis',
        'web_search_preview',
        'code_interpreter',
        'image_generation',
      ];

      // Check for fast-path image generation
      const fastPath = checkFastPathImageGeneration({
        userContent,
        hasImages,
        messages,
        agentMode,
        allowedTools,
      });

      if (fastPath) {
        await this.handleFastPathImage({
          chat_id,
          userContent,
          user,
          agent,
          sse,
          startTime,
        });
        return;
      }

      // Normal path: Build tools based on mode
      let tools: any[] = [];
      if (agentMode !== 'prompt') {
        tools = ToolExecutor.buildToolList({
          agent,
          userContent,
          imageUrls,
        });
      }

      // Select model and reasoning
      const { model, reasoning } = selectModelAndReasoning({
        userContent,
        hasImages,
        messageLength: userContent.length,
        tools,
      });

      // Build system prompt
      const systemPrompt = buildSystemPrompt({
        agent,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });

      logAIOperation('chat_start', {
        model,
        chatId: chat_id,
        userId: user.id,
        messageLength: userContent.length,
        hasImages,
        reasoningEffort: reasoning,
        toolCount: tools.length,
      });

      // Prepare conversation history
      const conversationHistory = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role,
        content: msg.content || msg.content_md || '',
      }));

      // Combine user message with document context for AI (without showing in UI)
      const aiUserMessage = documentContext 
        ? `${userContent}\n\n${documentContext}`
        : userContent;

      const initialInput = buildResponsesInput({
        conversationHistory,
        userMessage: aiUserMessage,
        imageUrls: hasImages ? imageUrls : [],
      });

      // Execute streaming conversation with tool loop
      const result = await this.executeConversation({
        chat_id,
        model,
        systemPrompt,
        initialInput,
        tools,
        reasoning,
        sse,
        agentId,
        projectId,
        userId: user.id,
      });

      sse.write({ type: 'done', done: true, response_id: result.responseId });
      sse.end();

      // Persist assistant message
      await saveAssistantMessage({
        chat_id,
        content: result.text,
        model,
        images: result.images,
        toolCalls: result.executedTools,
      });

      // Trigger async knowledge extraction if in project context
      if (projectId && process.env.APP_BASE_URL) {
        this.triggerKnowledgeExtraction(chat_id, req.headers.cookie);
      }

      logAIOperation('chat_complete', {
        model,
        chatId: chat_id,
        userId: user.id,
        duration: Date.now() - startTime,
        responseId: result.responseId,
        toolCallCount: result.executedTools.length,
        generatedImageCount: result.images.length,
      });
    } catch (error: any) {
      logger.error('Chat error', {
        chatId,
        userId: user.id,
        error: error.message,
        duration: Date.now() - startTime,
      });
      
      const sse = initResponseStream(res);
      sse.write({
        type: 'error',
        error: error.message || 'Failed to generate response',
      });
      sse.end();
    }
  }

  /**
   * Fast-path for pure image generation
   */
  private async handleFastPathImage(params: {
    chat_id: string;
    userContent: string;
    user: any;
    agent: AgentProfile | null;
    sse: any;
    startTime: number;
  }): Promise<void> {
    const { chat_id, userContent, user, agent, sse, startTime } = params;

    logger.info('Fast path: Pure image generation');

    const systemPrompt = buildSystemPrompt({
      agent,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    const runner = new StreamRunner({
      sse,
      model: 'gpt-5-nano',
      system: systemPrompt,
      tools: [{ type: 'image_generation' }],
      // Don't send reasoning with image_generation tool
    });

    const imageOnlyInput = buildResponsesInput({
      conversationHistory: [],
      userMessage: userContent,
      imageUrls: [],
    });

    const result = await runner.run(imageOnlyInput);

    sse.write({ type: 'done', done: true, response_id: result.responseId });
    sse.end();

    await saveAssistantMessage({
      chat_id,
      content: result.text,
      model: 'gpt-5-nano',
      images: result.images,
      toolCalls: [],
    });

    logAIOperation('chat_complete', {
      model: 'gpt-5-nano',
      chatId: chat_id,
      userId: user.id,
      duration: Date.now() - startTime,
      responseId: result.responseId,
      fastPath: true,
      generatedImageCount: result.images.length,
    });
  }

  /**
   * Execute conversation with tool loop
   */
  private async executeConversation(params: {
    chat_id: string;
    model: string;
    systemPrompt: string;
    initialInput: any;
    tools: any[];
    reasoning: any;
    sse: any;
    agentId?: string | null;
    projectId?: string | null;
    userId: string;
  }): Promise<{
    text: string;
    responseId: string;
    images: GeneratedImage[];
    executedTools: ExecutedToolCall[];
  }> {
    const { chat_id, model, systemPrompt, initialInput, tools, reasoning, sse, agentId, projectId, userId } = params;

    const runner = new StreamRunner({
      sse,
      model: model as any,
      system: systemPrompt,
      tools,
      reasoning: { effort: reasoning },
    });

    // Create tool executor for custom function calls
    const toolContext: ToolContext = {
      agentId: agentId ?? undefined,
      projectId: projectId ?? undefined,
      userId,
      conversationId: chat_id,
    };

    const toolExecutor = new ToolExecutor({
      sse,
      toolContext,
    });

    runner.setToolExecutor(toolExecutor);

    let aggregatedText = '';
    const allImages: GeneratedImage[] = [];
    const executedTools: ExecutedToolCall[] = [];

    let currentInput: any = initialInput;
    let previousResponseId: string | undefined;
    let isFirstStep = true;
    let finalResponseId = '';

    // Tool execution loop
    while (true) {
      const stepResult = await runner.run(
        currentInput,
        previousResponseId
      );

      aggregatedText += stepResult.text;
      allImages.push(...stepResult.images);
      finalResponseId = stepResult.responseId || finalResponseId;

      // Break if no custom tool calls (built-in tools are handled internally)
      if (stepResult.toolCalls.length === 0) {
        break;
      }

      // Execute custom function calls
      const toolResponses: any[] = [];
      for (const toolCall of stepResult.toolCalls) {
        const executed = await toolExecutor.execute(toolCall);
        executedTools.push(executed);

        toolResponses.push({
          role: 'tool',
          tool_call_id: toolCall.call_id,
          content: [{ type: 'output_text', text: executed.result }],
        });
      }

      // Continue conversation with tool results
      currentInput = toolResponses;
      previousResponseId = stepResult.responseId;
      isFirstStep = false;
    }

    return {
      text: aggregatedText,
      responseId: finalResponseId,
      images: allImages,
      executedTools,
    };
  }

  /**
   * Fetch and format document contents from selected context
   */
  private async fetchDocumentContents(selectedContext: any[]): Promise<string> {
    const { supabaseAdmin } = await import('../db');
    
    const documentTexts: string[] = [];

    for (const item of selectedContext) {
      try {
        // Skip images - they're handled separately via imageUrls
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(item.name || '');
        if (isImage) continue;

        // Fetch document from database
        const { data: doc, error } = await supabaseAdmin
          .from('user_files')
          .select('*')
          .eq('id', item.id)
          .single();

        if (error || !doc) {
          logger.warn('Failed to fetch document', { id: item.id, error: error?.message });
          continue;
        }

        // Add document content if available
        if (doc.content_text) {
          documentTexts.push(`\n---\n**${doc.name}** (${doc.file_type})\n\n${doc.content_text}\n---\n`);
        } else if (doc.openai_file_id) {
          // Document has OpenAI file ID but no extracted text - note this for the AI
          documentTexts.push(`\n---\n**${doc.name}** (${doc.file_type}) - Available as OpenAI File ID: ${doc.openai_file_id}\n---\n`);
        } else {
          documentTexts.push(`\n---\n**${doc.name}** (${doc.file_type}) - Content not yet extracted\n---\n`);
        }
      } catch (error: any) {
        logger.error('Error fetching document content', { id: item.id, error: error.message });
      }
    }

    if (documentTexts.length === 0) {
      return '';
    }

    return `\n\n## Attached Documents:\n${documentTexts.join('\n')}`;
  }

  /**
   * Trigger async knowledge extraction (fire and forget)
   */
  private triggerKnowledgeExtraction(chatId: string, cookie?: string): void {
    fetch(`${process.env.APP_BASE_URL}/api/project-knowledge/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookie || '',
      },
      body: JSON.stringify({ chatId }),
    }).catch((error) => {
      logger.error('Knowledge extraction failed', { error: error.message });
    });
  }
}
