// lib/ai.ts
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

// GPT-5 Model Selection
export const GPT5_MODELS = {
  NANO: 'gpt-5-nano',
  MINI: 'gpt-5-mini', 
  FULL: 'gpt-5'
} as const;

// Legacy model constants (for backward compatibility)
export const DEFAULT_CHAT_MODEL = GPT5_MODELS.MINI;
export const DEFAULT_VISION_MODEL = GPT5_MODELS.MINI;
export const DEFAULT_IMAGE_MODEL = 'gpt-image-1';
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

// Custom Tools for GPT-5 Responses API
export const CUSTOM_TOOLS = [
  {
    type: "custom" as const,
    name: "document_search",
    description: "Search EMtek knowledge base for company IT procedures, policies, troubleshooting guides, and documentation. Pass your search query as plain text.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant EMtek knowledge base content"
        }
      },
      required: ["query"]
    }
  },
  {
    type: "custom" as const, 
    name: "vision_analysis",
    description: "Analyze uploaded images for IT troubleshooting including screenshots, error messages, hardware photos, network diagrams, and system displays. Pass your analysis request as plain text.",
    parameters: {
      type: "object",
      properties: {
        analysisRequest: {
          type: "string",
          description: "Description of what should be analyzed in the uploaded images"
        }
      },
      required: ["analysisRequest"]
    }
  },
  {
    type: "custom" as const,
    name: "project_knowledge",
    description: "Search project-specific documentation, chat history, and related technical information. Pass your search query with project context as plain text.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant project-specific information"
        }
      },
      required: ["query"]
    }
  }
];

// Built-in tools available in GPT-5
export const BUILTIN_TOOLS = [
  { type: "image_generation" as const },
  { type: "web_search" as const },
  { type: "code_interpreter" as const }
];

// Model selection based on task complexity
export function selectGPT5Model(context: {
  hasImages?: boolean;
  isComplexTask?: boolean;
  isCodeTask?: boolean;
  messageLength?: number;
}): string {
  const { hasImages, isComplexTask, isCodeTask, messageLength = 0 } = context;
  
  // Use full GPT-5 for complex tasks
  if (isComplexTask || isCodeTask || messageLength > 1000) {
    return GPT5_MODELS.FULL;
  }
  
  // Use mini for most interactions
  if (hasImages || messageLength > 200) {
    return GPT5_MODELS.MINI;
  }
  
  // Use nano for simple responses
  return GPT5_MODELS.NANO;
}

// Determine reasoning effort based on task
export function selectReasoningEffort(context: {
  isComplexTask?: boolean;
  isCodeTask?: boolean;
  messageLength?: number;
}): 'minimal' | 'low' | 'medium' | 'high' {
  const { isComplexTask, isCodeTask, messageLength = 0 } = context;
  
  if (isComplexTask || isCodeTask) {
    return 'high';
  }
  
  if (messageLength > 500) {
    return 'medium';
  }
  
  return 'minimal'; // Fast responses for most interactions
}

// Determine allowed tools based on context
export function determineAllowedTools(context: {
  hasUploadedImages?: boolean;
  agentId?: string;
  projectId?: string;
  mode?: string;
}): any[] {
  const { hasUploadedImages, agentId, projectId, mode } = context;
  
  const allowedTools: any[] = [
    { type: "image_generation" } // Always available
  ];
  
  if (hasUploadedImages) {
    allowedTools.push(CUSTOM_TOOLS.find(tool => tool.name === "vision_analysis"));
  }
  
  if (agentId) {
    allowedTools.push(CUSTOM_TOOLS.find(tool => tool.name === "document_search"));
  }
  
  if (projectId) {
    allowedTools.push(CUSTOM_TOOLS.find(tool => tool.name === "project_knowledge"));
    allowedTools.push({ type: "code_interpreter" });
  }
  
  // Add web search for general assistance
  if (mode !== 'restricted') {
    allowedTools.push({ type: "web_search" });
  }
  
  return allowedTools.filter(Boolean); // Remove any undefined tools
}

// Get all available tools (custom + builtin)
export function getAllAvailableTools(): any[] {
  return [...CUSTOM_TOOLS, ...BUILTIN_TOOLS];
}

// Image model fallback order
export const IMAGE_MODEL_FALLBACKS = [
  'gpt-image-1',
  'dall-e-3', 
  'dall-e-2'
] as const;

// Enhanced Image generation configurations for GPT Image 1
export const IMAGE_GENERATION_CONFIG = {
  // Available sizes for GPT Image 1
  sizes: {
    auto: 'auto',
    square: '1024x1024',
    landscape: '1792x1024', 
    portrait: '1024x1792'
  },
  // Quality settings
  qualities: ['auto', 'low', 'medium', 'high'] as const,
  // Output formats
  formats: ['png', 'jpeg', 'webp'] as const,
  // Background options
  backgrounds: ['auto', 'transparent', 'opaque'] as const,
  // Default settings
  defaults: {
    size: 'auto' as const,
    quality: 'auto' as const,
    format: 'png' as const,
    background: 'auto' as const,
    compression: undefined // Only used for jpeg/webp
  }
};

// Type definitions for enhanced image generation
export type ImageSize = keyof typeof IMAGE_GENERATION_CONFIG.sizes | 'auto' | '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'auto' | 'low' | 'medium' | 'high';
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ImageBackground = 'auto' | 'transparent' | 'opaque';

export interface EnhancedImageGenerationOptions {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  format?: ImageFormat;
  background?: ImageBackground;
  compression?: number; // 0-100, only for jpeg/webp
  chatId?: string;
}

// Helper function to detect image generation requests with context awareness
export function detectImageGenerationRequest(
  message: string, 
  recentMessages: Array<{role: string, content: string, messageType?: string}> = []
): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check if there was a recent image generation in the conversation
  const hasRecentImageGeneration = recentMessages.some((msg, index) => {
    // Look at the last 5 messages for context
    if (index >= recentMessages.length - 5) {
      return msg.role === 'assistant' && 
             (msg.messageType === 'image' || 
              msg.content.includes('![') || 
              msg.content.includes('I\'ve generated an image') ||
              msg.content.includes('generated an image'));
    }
    return false;
  });

  // Primary image generation triggers
  const primaryTriggers = [
    'generate an image',
    'create an image',
    'make an image',
    'make a image',
    'make image',
    'draw',
    'illustrate',
    'create a diagram',
    'show me a picture',
    'generate a graphic',
    'create a visual',
    'make a picture',
    'create a picture',
    'generate a picture',
    'make a photo',
    'create a photo',
    'generate a photo',
    'make me an image',
    'make me a picture',
    'can you generate',
    'can you create an image',
    'can you make an image',
    'please generate',
    'please create an image',
    'please make an image',
    'design an image',
    'design a graphic',
    'produce an image',
    'render an image',
    'make a png',
    'create a png',
    'generate a png',
    'make a jpg',
    'create a jpg',
    'generate a jpg',
    'make a jpeg',
    'create a jpeg',
    'generate a jpeg',
    'image of',
    'picture of',
    'photo of',
    'graphic of',
    'visualization of',
    'depict',
    'show an image',
    'display an image'
  ];
  
  // Image modification triggers (require recent image context)
  const modificationTriggers = [
    'make the',
    'change the',
    'turn the',
    'make it',
    'change it',
    'turn it',
    'make them',
    'change them',
    'turn them',
    'add',
    'remove',
    'delete',
    'replace',
    'modify',
    'alter',
    'adjust',
    'edit',
    'update',
    'improve',
    'enhance',
    'fix',
    'correct'
  ];

  // Color-related modification patterns
  const colorModifications = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
    'black', 'white', 'gray', 'grey', 'silver', 'gold', 'cyan', 'magenta',
    'darker', 'lighter', 'brighter', 'dimmer', 'colorful', 'vibrant',
    'pastel', 'neon', 'bright', 'dark', 'light'
  ];

  // Size and style modifications
  const styleModifications = [
    'bigger', 'smaller', 'larger', 'wider', 'narrower', 'taller', 'shorter',
    'thicker', 'thinner', 'bolder', 'softer', 'smoother', 'rougher',
    'more detailed', 'less detailed', 'simpler', 'more complex',
    'realistic', 'abstract', 'cartoon', 'sketch'
  ];

  // Check for primary triggers first
  const hasPrimaryTrigger = primaryTriggers.some(trigger => lowerMessage.includes(trigger));
  
  // Check for format-specific requests that imply image generation
  const formatRequests = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'image file'];
  const hasFormatRequest = formatRequests.some(format => 
    lowerMessage.includes(`make ${format}`) || 
    lowerMessage.includes(`create ${format}`) ||
    lowerMessage.includes(`generate ${format}`) ||
    lowerMessage.includes(`make a ${format}`) ||
    lowerMessage.includes(`create a ${format}`) ||
    lowerMessage.includes(`generate a ${format}`)
  );

  // Check for modification triggers (only if there was a recent image)
  let hasModificationTrigger = false;
  if (hasRecentImageGeneration) {
    const hasModTrigger = modificationTriggers.some(trigger => lowerMessage.includes(trigger));
    const hasColorMod = colorModifications.some(color => lowerMessage.includes(color));
    const hasStyleMod = styleModifications.some(style => lowerMessage.includes(style));
    
    // Additional contextual patterns for image modification
    const contextualPatterns = [
      /make (it|them|the \w+) (more|less|\w+er|\w+)/,
      /change (it|them|the \w+) to/,
      /turn (it|them|the \w+) (into|\w+)/,
      /(add|remove|delete) (a|an|the|\w+)/,
      /make (a|an|the|\w+) (red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|silver|gold|cyan|magenta|darker|lighter|brighter|dimmer|bigger|smaller|larger)/,
      /can you (make|change|turn|add|remove|edit|modify|alter|adjust|update|fix)/
    ];
    
    const hasContextualPattern = contextualPatterns.some(pattern => pattern.test(lowerMessage));
    
    hasModificationTrigger = (hasModTrigger && (hasColorMod || hasStyleMod)) || hasContextualPattern;
  }

  // Additional checks for implicit image requests
  const implicitImageRequests = [
    /show (me )?a (picture|image|photo|graphic) of/,
    /what (would|does) (a|an|\w+) look like/,
    /how (would|does) (it|this|that) look/,
    /visualize/,
    /visual representation/
  ];
  
  const hasImplicitRequest = implicitImageRequests.some(pattern => pattern.test(lowerMessage));

  return hasPrimaryTrigger || hasFormatRequest || hasModificationTrigger || hasImplicitRequest;
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
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(text: string, maxTokens: number = 500): string[] {
  // Simple chunking by paragraphs and sentences
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxTokens * 4) { // Rough token estimation
      chunks.push(paragraph.trim());
    } else {
      // Split long paragraphs by sentences
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
 * Progressive image streaming event types
 */
export interface ProgressiveImageEvent {
  type: 'partial_image' | 'completed' | 'error';
  b64_json?: string;
  partial_image_index?: number;
  size?: string;
  quality?: string;
  background?: string;
  output_format?: string;
  usage?: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: {
      text_tokens: number;
      image_tokens: number;
    };
  };
  error?: string;
  created_at?: number;
}

/**
 * Generate image with progressive streaming using Responses API
 */
export async function generateImageWithProgressiveStreaming(
  prompt: string,
  options: Partial<EnhancedImageGenerationOptions> = {}
): Promise<AsyncIterable<ProgressiveImageEvent>> {
  const {
    size = IMAGE_GENERATION_CONFIG.defaults.size,
    quality = IMAGE_GENERATION_CONFIG.defaults.quality,
    format = IMAGE_GENERATION_CONFIG.defaults.format,
    background = IMAGE_GENERATION_CONFIG.defaults.background,
    compression
  } = options;

  try {
    console.log(`🎨 Starting progressive image generation: "${prompt}"`);
    console.log(`📐 Parameters: size=${size}, quality=${quality}, format=${format}, background=${background}`);

    // Convert size parameter for GPT Image
    let gptImageSize: string;
    if (size === 'auto') {
      gptImageSize = 'auto';
    } else if (size === 'square') {
      gptImageSize = '1024x1024';
    } else if (size === 'landscape') {
      gptImageSize = '1792x1024';
    } else if (size === 'portrait') {
      gptImageSize = '1024x1792';
    } else {
      gptImageSize = size as string;
    }

    // Build streaming request with image generation tool
    const streamRequest: any = {
      model: 'gpt-image-1', // Use GPT Image 1 for streaming
      input: prompt,
      tools: [{
        type: "image_generation",
        size: gptImageSize,
        quality: quality !== 'auto' ? quality : undefined,
        output_format: format !== 'png' ? format : undefined,
        background: background !== 'auto' ? background : undefined,
        output_compression: compression !== undefined && (format === 'jpeg' || format === 'webp') ? compression : undefined
      }],
      stream: true
    };

    console.log(`🌊 Creating streaming request...`);
    
    return (async function* () {
      try {
        // Note: OpenAI responses.create streaming may not be available in current version
        // Fall back to standard image generation for now
        console.log(`⚠️ Progressive streaming not available, using standard generation`);
        
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: prompt,
          size: gptImageSize as any,
          n: 1,
          response_format: "b64_json"
        });

        if (response.data && response.data[0]) {
          const imageData = response.data[0];
          
          // Yield completed event
          yield {
            type: 'completed',
            b64_json: imageData.b64_json,
            size: gptImageSize,
            quality: quality,
            background: background,
            output_format: format,
            created_at: Date.now()
          } as ProgressiveImageEvent;
        } else {
          throw new Error('No image data received from API');
        }
      } catch (error: any) {
        console.error('❌ Image generation error:', error);
        yield {
          type: 'error',
          error: error.message || 'Image generation failed'
        } as ProgressiveImageEvent;
      }
    })();

  } catch (error: any) {
    console.error('❌ Failed to start progressive streaming:', error);
    
    // Return an async generator that yields a single error
    return (async function* () {
      yield {
        type: 'error',
        error: error.message || 'Failed to initialize streaming'
      } as ProgressiveImageEvent;
    })();
  }
}

/**
 * Generate image with fallback models (legacy support)
 */
export async function generateImageWithFallback(
  prompt: string,
  options: Partial<EnhancedImageGenerationOptions> = {}
): Promise<{
  data: any;
  modelUsed: string;
  errors: Array<{model: string, error: any}>;
}> {
  const errors: Array<{model: string, error: any}> = [];
  
  // Prepare OpenAI parameters
  const {
    size = IMAGE_GENERATION_CONFIG.defaults.size,
    quality = IMAGE_GENERATION_CONFIG.defaults.quality,
    format = IMAGE_GENERATION_CONFIG.defaults.format,
    background = IMAGE_GENERATION_CONFIG.defaults.background,
    compression
  } = options;

  for (const model of IMAGE_MODEL_FALLBACKS) {
    try {
      console.log(`🎨 Attempting image generation with ${model}...`);
      
      // Convert size parameter
      let openaiSize: "auto" | "1024x1024" | "1792x1024" | "1024x1792" | "1536x1024" | "1024x1536" | "256x256" | "512x512";
      if (size === 'auto') {
        openaiSize = 'auto';
      } else if (size === 'square') {
        openaiSize = '1024x1024';
      } else if (size === 'landscape') {
        openaiSize = '1792x1024';
      } else if (size === 'portrait') {
        openaiSize = '1024x1792';
      } else {
        openaiSize = size as any;
      }

      // Build request parameters
      const generateParams: any = {
        model: model,
        prompt: prompt,
        size: openaiSize,
        n: 1
      };

      // Add response_format only for models that support it
      if (model === 'dall-e-3' || model === 'dall-e-2') {
        generateParams.response_format = "b64_json";
      }

      // Add model-specific parameters
      if (model === 'gpt-image-1') {
        // GPT Image 1 specific parameters
        if (quality !== 'auto') {
          generateParams.quality = quality;
        }
        if (format !== 'png') {
          generateParams.output_format = format;
        }
        if (compression !== undefined && (format === 'jpeg' || format === 'webp')) {
          generateParams.output_compression = compression;
        }
        if (background === 'transparent') {
          generateParams.background = 'transparent';
        } else if (background === 'opaque') {
          generateParams.background = 'opaque';
        }
      } else if (model === 'dall-e-3') {
        // DALL-E 3 specific parameters
        if (quality !== 'auto' && quality !== 'low' && quality !== 'medium') {
          generateParams.quality = quality === 'high' ? 'hd' : 'standard';
        }
        // DALL-E 3 doesn't support output_format, background, etc.
      }
      // DALL-E 2 uses minimal parameters

      const response = await openai.images.generate(generateParams);
      
      // Handle different response formats for different models
      if (response.data && response.data[0]) {
        const imageData = response.data[0];
        
        // For models that return b64_json
        if (imageData.b64_json) {
          console.log(`✅ Image generation successful with ${model} (base64)`);
          return {
            data: imageData,
            modelUsed: model,
            errors: errors
          };
        }
        // For models that return URL (like gpt-image-1)
        else if (imageData.url) {
          console.log(`✅ Image generation successful with ${model} (URL)`);
          
          // For gpt-image-1, we need to fetch the image and convert to base64
          if (model === 'gpt-image-1') {
            try {
              const imageResponse = await fetch(imageData.url);
              const arrayBuffer = await imageResponse.arrayBuffer();
              const base64Data = Buffer.from(arrayBuffer).toString('base64');
              
              console.log(`✅ Converted ${model} URL to base64`);
              return {
                data: {
                  ...imageData,
                  b64_json: base64Data
                },
                modelUsed: model,
                errors: errors
              };
            } catch (fetchError) {
              console.log(`❌ Failed to fetch and convert ${model} image:`, fetchError);
              throw new Error(`Failed to fetch image from ${model}: ${fetchError.message}`);
            }
          } else {
            // For other models that return URL, return as-is
            return {
              data: imageData,
              modelUsed: model,
              errors: errors
            };
          }
        } else {
          throw new Error('No image data (b64_json or url) received from API');
        }
      } else {
        throw new Error('No image data received from API');
      }
      
    } catch (error: any) {
      console.log(`❌ ${model} failed: ${error.message}`);
      errors.push({ model, error });
      
      // Log specific error details
      if (error.status === 403) {
        console.log(`   💡 ${model} requires organization verification`);
      } else if (error.status === 401) {
        console.log(`   💡 Authentication failed for ${model}`);
      } else if (error.status === 429) {
        console.log(`   💡 Rate limit exceeded for ${model}`);
      }
      
      // Continue to next model
      continue;
    }
  }
  
  // If we get here, all models failed
  throw new Error(`All image generation models failed. Errors: ${JSON.stringify(errors.map(e => ({model: e.model, message: e.error.message})))}`);
}
