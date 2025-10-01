// lib/ai.ts - Correct OpenAI Responses API Integration
import OpenAI from 'openai';

// Initialize OpenAI client lazily to avoid startup errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }
  return openaiClient;
}

export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    const client = getOpenAIClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Model Configuration for Responses API
export const RESPONSE_MODELS = {
  GPT_5: 'gpt-5',
  GPT_5_MINI: 'gpt-5-mini',
  GPT_5_NANO: 'gpt-5-nano',
  GPT_4_1: 'gpt-4.1',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  O3: 'o3',
  O3_MINI: 'o3-mini'
} as const;

export type ResponseModel = typeof RESPONSE_MODELS[keyof typeof RESPONSE_MODELS];

// Default models
export const DEFAULT_CHAT_MODEL = RESPONSE_MODELS.GPT_5_NANO;
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

// Reasoning effort levels
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

// Text verbosity levels
export type TextVerbosity = 'low' | 'medium' | 'high';

/**
 * Select appropriate model based on task complexity
 */
export function selectModel(context: {
  hasImages?: boolean;
  isComplexTask?: boolean;
  isCodeTask?: boolean;
  messageLength?: number;
}): ResponseModel {
  const { hasImages, isComplexTask, isCodeTask, messageLength = 0 } = context;

  // GPT-5 for coding and complex agentic tasks
  if (isCodeTask || isComplexTask) {
    return RESPONSE_MODELS.GPT_5;
  }

  // GPT-5 mini for moderate complexity
  if (messageLength > 500) {
    return RESPONSE_MODELS.GPT_5_MINI;
  }

  // GPT-5 nano for fast responses (default)
  return RESPONSE_MODELS.GPT_5_NANO;
}

/**
 * Determine reasoning effort
 */
export function selectReasoningEffort(context: {
  isComplexTask?: boolean;
  isCodeTask?: boolean;
  messageLength?: number;
}): ReasoningEffort {
  const { isComplexTask, isCodeTask, messageLength = 0 } = context;
  
  if (isComplexTask || isCodeTask) {
    return 'high';
  }
  
  if (messageLength > 500) {
    return 'medium';
  }
  
  return 'minimal';
}

/**
 * Build input for Responses API
 * Supports: string, array of messages, or multimodal content
 */
export function buildResponsesInput(options: {
  systemMessage?: string;
  conversationHistory?: Array<{role: string, content: string | any}>;
  userMessage?: string;
  imageUrls?: string[];
  fileUrls?: string[];
}): string | any[] {
  const { systemMessage, conversationHistory = [], userMessage, imageUrls = [], fileUrls = [] } = options;
  
  // If it's just a simple text message with no history or system message, return string
  if (!systemMessage && conversationHistory.length === 0 && imageUrls.length === 0 && fileUrls.length === 0 && userMessage) {
    return userMessage;
  }
  
  const input: any[] = [];
  
  // Add conversation history (keep in original format, don't wrap with input_text)
  conversationHistory.forEach(msg => {
    input.push({
      role: msg.role,
      content: msg.content  // Pass content as-is
    });
  });
  
  // Add current user message with multimodal content if present
  if (userMessage || imageUrls.length > 0 || fileUrls.length > 0) {
    const content: any[] = [];
    
    if (userMessage) {
      content.push({ type: 'input_text', text: userMessage });
    }
    
    // Add images
    imageUrls.forEach(url => {
      content.push({
        type: 'input_image',
        image_url: url
      });
    });
    
    // Add files
    fileUrls.forEach(url => {
      content.push({
        type: 'input_file',
        file_url: url
      });
    });
    
    input.push({
      role: 'user',
      content
    });
  }
  
  return input;
}

/**
 * SSE Helper for streaming responses
 */
export function initResponseStream(res: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write('data: {"type":"connected"}\n\n');

  // Setup heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write('data: {"type":"heartbeat"}\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 30000);

  return {
    write: (data: any) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        console.log('SSE write failed, connection closed');
        clearInterval(heartbeat);
      }
    },
    end: () => {
      try {
        clearInterval(heartbeat);
        res.end();
      } catch (e) {
        console.log('SSE end failed, connection closed');
      }
    }
  };
}

/**
 * Stream a response using Responses API with correct event handling
 */
export async function streamResponse(options: {
  model?: ResponseModel;
  instructions?: string;
  input: string | any[];
  tools?: any[];
  reasoning?: { effort: ReasoningEffort };
  text?: { verbosity?: TextVerbosity };
  sse: any;
  onComplete?: (response: { content: string; responseId: string }) => Promise<void>;
  previousResponseId?: string;
  store?: boolean;
}): Promise<string> {
  const {
    model = DEFAULT_CHAT_MODEL,
    instructions,
    input,
    tools = [],
    reasoning,
    text,
    sse,
    onComplete,
    previousResponseId,
    store = true
  } = options;

  let fullResponse = '';
  let responseId = '';
  
  try {
    const streamOptions: any = {
      model,
      input,
      stream: true,
      store
    };

    if (instructions) {
      streamOptions.instructions = instructions;
    }

    if (reasoning) {
      streamOptions.reasoning = reasoning;
    }

    if (text) {
      streamOptions.text = text;
    }

    if (tools && tools.length > 0) {
      streamOptions.tools = tools;
    }

    if (previousResponseId) {
      streamOptions.previous_response_id = previousResponseId;
    }

    console.log('🚀 Starting Responses API stream with:', {
      model,
      hasInstructions: !!instructions,
      hasTools: tools.length > 0,
      reasoning: reasoning?.effort,
      inputType: typeof input
    });

    const stream = await openai.responses.create(streamOptions);

    for await (const event of stream as any) {
      // Store response ID when available
      if (event.response?.id && !responseId) {
        responseId = event.response.id;
      }

      // Handle different event types from Responses API
      switch (event.type) {
        case 'response.created':
          sse.write({ type: 'response_created', id: event.response?.id });
          break;

        case 'response.output_item.added':
          // New output item added (message, function_call, etc.)
          sse.write({ 
            type: 'output_item_added', 
            item: event.item 
          });
          break;

        case 'response.output_text.delta':
          // Text delta - this is the actual content streaming
          if (event.delta) {
            fullResponse += event.delta;
            sse.write({ 
              type: 'delta', 
              content: event.delta 
            });
          }
          break;

        case 'response.output_text.done':
          // Text output completed
          sse.write({ 
            type: 'text_done', 
            text: event.text 
          });
          break;

        case 'response.content_part.added':
          // New content part added
          break;

        case 'response.content_part.done':
          // Content part completed
          break;

        case 'response.output_item.done':
          // Output item completed
          if (event.item?.type === 'function_call') {
            sse.write({
              type: 'function_call',
              call_id: event.item.call_id,
              name: event.item.name,
              arguments: event.item.arguments
            });
          }
          break;

        case 'response.completed':
          // Entire response completed
          responseId = event.response?.id || responseId;
          sse.write({ type: 'done', response_id: responseId });
          break;

        case 'response.failed':
          // Response failed
          console.error('Response failed:', event.error);
          sse.write({ 
            type: 'error', 
            error: event.error?.message || 'Response failed' 
          });
          break;

        case 'response.cancelled':
          // Response was cancelled
          sse.write({ type: 'cancelled' });
          break;

        default:
          // Log unknown event types for debugging
          console.log('Unknown event type:', event.type);
      }
    }

    if (onComplete && fullResponse) {
      await onComplete({ content: fullResponse, responseId });
    }
    
    return fullResponse;
    
  } catch (error: any) {
    console.error('Responses API streaming error:', error);
    sse.write({
      type: 'error',
      error: error.message || 'Streaming failed'
    });
    throw error;
  }
}

/**
 * Create a non-streaming response
 */
export async function createResponse(options: {
  model?: ResponseModel;
  instructions?: string;
  input: string | any[];
  tools?: any[];
  reasoning?: { effort: ReasoningEffort };
  text?: { 
    verbosity?: TextVerbosity;
    format?: {
      type: 'text' | 'json_schema';
      name?: string;
      schema?: any;
    };
  };
  previousResponseId?: string;
  store?: boolean;
}): Promise<any> {
  const {
    model = DEFAULT_CHAT_MODEL,
    instructions,
    input,
    tools = [],
    reasoning,
    text,
    previousResponseId,
    store = true
  } = options;

  try {
    const responseOptions: any = {
      model,
      input,
      stream: false,
      store
    };

    if (instructions) {
      responseOptions.instructions = instructions;
    }

    if (reasoning) {
      responseOptions.reasoning = reasoning;
    }

    if (text) {
      responseOptions.text = text;
    }

    if (tools && tools.length > 0) {
      responseOptions.tools = tools;
    }

    if (previousResponseId) {
      responseOptions.previous_response_id = previousResponseId;
    }

    console.log('🚀 Creating Responses API response:', {
      model,
      hasInstructions: !!instructions,
      hasTools: tools.length > 0,
      reasoning: reasoning?.effort,
      format: text?.format?.type
    });

    const response = await openai.responses.create(responseOptions);

    // Use SDK convenience property for text output
    if (response.output_text) {
      return response.output_text;
    }

    // Or return full response for tool calls, structured outputs, etc.
    return response;
      
  } catch (error: any) {
    console.error('Responses API error:', error);
    throw error;
  }
}

/**
 * Generate embeddings for text content
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: text,
  });
  
  return response.data[0].embedding;
}

/**
 * Chunk text for embedding
 */
export function chunkText(text: string, maxTokens: number = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxTokens * 4) {
      chunks.push(paragraph.trim());
    } else {
      const sentences = paragraph.split(/[.!?]+/);
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxTokens * 4) {
          currentChunk += sentence + '. ';
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence + '. ';
        }
      }
      
      if (currentChunk) chunks.push(currentChunk.trim());
    }
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Detect image generation requests
 */
export function detectImageGenerationRequest(
  message: string, 
  recentMessages: Array<{role: string, content: string, messageType?: string}> = []
): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for recent image generation context
  const hasRecentImageGeneration = recentMessages.some((msg, index) => {
    if (index >= recentMessages.length - 5) {
      return msg.role === 'assistant' && 
             (msg.messageType === 'image' || 
              msg.content.includes('![') || 
              msg.content.includes('generated an image'));
    }
    return false;
  });

  // Primary triggers
  const imageTriggers = [
    'generate an image', 'create an image', 'make an image', 'draw', 'illustrate',
    'create a diagram', 'show me a picture', 'generate a graphic', 'create a visual',
    'make a picture', 'design an image', 'produce an image', 'render an image',
    'image of', 'picture of', 'photo of', 'visualization of', 'depict'
  ];
  
  // Modification triggers (require recent context)
  const modificationTriggers = [
    'make it', 'change it', 'turn it', 'make the', 'change the', 'turn the',
    'add', 'remove', 'replace', 'modify', 'alter', 'adjust', 'edit', 'update'
  ];

  const colorModifications = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
    'black', 'white', 'gray', 'darker', 'lighter', 'brighter', 'colorful'
  ];

  const hasPrimaryTrigger = imageTriggers.some(trigger => lowerMessage.includes(trigger));
  
  let hasModificationTrigger = false;
  if (hasRecentImageGeneration) {
    const hasModTrigger = modificationTriggers.some(trigger => lowerMessage.includes(trigger));
    const hasColorMod = colorModifications.some(color => lowerMessage.includes(color));
    hasModificationTrigger = hasModTrigger && hasColorMod;
  }

  return hasPrimaryTrigger || hasModificationTrigger;
}

/**
 * Logging utility for AI operations
 */
export function logAIOperation(operation: string, metadata: any) {
  const timestamp = new Date().toISOString();
  console.log('AI_OPERATION:', JSON.stringify({ timestamp, operation, ...metadata }));
}
