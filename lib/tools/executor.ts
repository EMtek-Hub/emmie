// lib/tools/executor.ts - Type-safe tool execution with DI
import { TOOL_REGISTRY, toolRouter, type ToolContext } from '../tools';
import type { AgentProfile } from '../profiles';
import { logger } from '../telemetry/logger';

type SSEStream = {
  write: (data: any) => void;
  end: () => void;
};

export interface StreamedToolCall {
  id: string;
  call_id: string;
  name: string;
  arguments: string;
}

export interface ExecutedToolCall extends StreamedToolCall {
  status: 'completed' | 'failed';
  result: string;
}

/**
 * Tool executor handles tool selection, tracking, and execution
 */
export class ToolExecutor {
  private pending = new Map<string, StreamedToolCall>();

  constructor(private deps: { sse: SSEStream; toolContext: ToolContext }) {}

  /**
   * Build tool list based on agent configuration and context
   */
  static buildToolList(params: {
    agent?: AgentProfile | null;
    userContent: string;
    imageUrls: string[];
  }): any[] {
    const { agent, userContent, imageUrls } = params;
    
    // Get allowed tools from agent or use defaults
    const allowed = new Set(
      agent?.allowed_tools ?? [
        'document_search',
        'vision_analysis',
        'web_search_preview',
        'code_interpreter',
        'image_generation',
      ]
    );

    const tools: any[] = [];
    const lowerContent = userContent.toLowerCase();

    // Built-in native tools (OpenAI Responses API format)
    const isImageRequest = /\b(generate|create|make|draw|illustrate|image|picture|photo|diagram)\b/i.test(userContent);
    
    if (isImageRequest && allowed.has('image_generation')) {
      tools.push({ type: 'image_generation' });
    }

    // Web search - only if not an image request
    if (!isImageRequest && allowed.has('web_search_preview')) {
      tools.push({ type: 'web_search_preview' });
    }

    // Code interpreter for code/debugging tasks
    if (
      /\b(code|debug|script|error|function|bug)\b/i.test(userContent) &&
      allowed.has('code_interpreter')
    ) {
      tools.push({ type: 'code_interpreter' });
    }

    // Custom function tools from TOOL_REGISTRY
    TOOL_REGISTRY.forEach((tool) => {
      if (allowed.has(tool.function.name)) {
        tools.push(tool);
      }
    });

    logger.debug('Tools built', {
      count: tools.length,
      tools: tools.map((t) => (t.type === 'function' ? `function:${t.function.name}` : t.type)),
    });

    return tools;
  }

  /**
   * Start tracking a new tool call
   */
  start(item: any): void {
    this.pending.set(item.id, {
      id: item.id,
      call_id: item.call_id,
      name: item.name,
      arguments: '',
    });
  }

  /**
   * Accumulate tool call arguments as they stream
   */
  delta(event: any): void {
    const pending = this.pending.get(event.id);
    if (pending) {
      if (typeof event.delta === 'string') {
        pending.arguments += event.delta;
      } else if (event.delta) {
        pending.arguments += JSON.stringify(event.delta);
      }
    }
  }

  /**
   * Finish tracking a tool call and return final data
   */
  finish(item: any): StreamedToolCall {
    const pending = this.pending.get(item.id);
    if (!pending) {
      throw new Error(`Tool call ${item.id} not tracked`);
    }
    this.pending.delete(item.id);

    // Use final arguments from item if available, otherwise use accumulated
    const finalArgs =
      typeof item.arguments === 'string'
        ? item.arguments
        : item.arguments
        ? JSON.stringify(item.arguments)
        : pending.arguments;

    return {
      ...pending,
      arguments: finalArgs,
    };
  }

  /**
   * Execute a tool call and return result
   */
  async execute(call: StreamedToolCall): Promise<ExecutedToolCall> {
    const tool = TOOL_REGISTRY.find((t) => t.function.name === call.name);
    let status: ExecutedToolCall['status'] = 'completed';
    let result = '';

    logger.info('🔧 Executing tool', {
      name: call.name,
      call_id: call.call_id,
      arguments: call.arguments,
    });

    try {
      const parsed = safeParseJSON(call.arguments) ?? {};
      
      if (tool) {
        // Execute via tool router
        logger.debug('Tool found in registry, executing...', { name: call.name });
        const toolResult = await toolRouter(call.name, parsed, this.deps.toolContext);
        
        if (toolResult.success) {
          result = typeof toolResult.result === 'string' 
            ? toolResult.result 
            : JSON.stringify(toolResult.result);
          logger.info('✅ Tool executed successfully', {
            name: call.name,
            resultLength: result.length,
          });
        } else {
          status = 'failed';
          result = toolResult.error || `Tool execution failed`;
          logger.error('❌ Tool execution failed', {
            name: call.name,
            error: toolResult.error,
          });
        }
      } else {
        status = 'failed';
        result = `Function "${call.name}" not implemented.`;
        logger.error('❌ Tool not found in registry', {
          name: call.name,
          availableTools: TOOL_REGISTRY.map(t => t.function.name),
        });
      }
    } catch (error: any) {
      logger.error('❌ Tool execution error', {
        tool: call.name,
        error: error.message,
        stack: error.stack,
      });
      status = 'failed';
      result = `Error executing ${call.name}: ${error.message || 'Unknown error'}`;
    }

    // Send result via SSE
    logger.debug('Sending tool result via SSE', {
      type: 'function_result',
      name: call.name,
      status,
    });
    
    this.deps.sse.write({
      type: 'function_result',
      call_id: call.call_id,
      name: call.name,
      result,
      status,
    });

    return {
      ...call,
      status,
      result,
    };
  }
}

/**
 * Safely parse JSON arguments
 */
function safeParseJSON(args?: string): Record<string, unknown> | undefined {
  if (!args) return undefined;
  try {
    return JSON.parse(args);
  } catch {
    return { raw: args };
  }
}
