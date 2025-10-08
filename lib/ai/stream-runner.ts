// lib/ai/stream-runner.ts - Pure event-driven OpenAI streaming
import { openai } from '../ai';
import type { ResponseModel, ReasoningEffort } from '../ai';
import { MediaUploader, extractBase64Image, type GeneratedImage } from '../media/uploader';
import { ToolExecutor, type StreamedToolCall } from '../tools/executor';
import { logger } from '../telemetry/logger';

type SSEStream = {
  write: (data: any) => void;
  end: () => void;
};

export interface StreamStepResult {
  text: string;
  responseId: string;
  toolCalls: StreamedToolCall[];
  images: GeneratedImage[];
}

export interface StreamRunnerConfig {
  sse: SSEStream;
  model: ResponseModel;
  system?: string;
  tools: any[];
  reasoning?: { effort: ReasoningEffort };
}

/**
 * StreamRunner handles OpenAI Responses API streaming
 * Pure event consumer - no DB/storage calls except via injected dependencies
 */
export class StreamRunner {
  private uploader: MediaUploader;
  private toolExecutor?: ToolExecutor;

  constructor(private config: StreamRunnerConfig) {
    this.uploader = new MediaUploader();
  }

  /**
   * Set tool executor for custom function tool handling
   */
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
  }

  /**
   * Run a single streaming step
   */
  async run(
    input: string | any[],
    previousResponseId?: string
  ): Promise<StreamStepResult> {
    const { sse, model, system, tools, reasoning } = this.config;

    // Don't send reasoning with image_generation tool (API limitation)
    const includesImageGen = tools.some((t: any) => t.type === 'image_generation');

    const streamOptions: any = {
      model,
      input,
      stream: true,
      store: !previousResponseId,
    };

    if (system) {
      streamOptions.instructions = system;
    }

    if (reasoning && !includesImageGen) {
      streamOptions.reasoning = reasoning;
    }

    if (tools.length > 0) {
      streamOptions.tools = tools;
      logger.debug('Tools sent to API', {
        tools: tools.map((t: any) =>
          t.type === 'function' ? `function:${t.function.name}` : t.type
        ),
      });
    }

    if (previousResponseId) {
      streamOptions.previous_response_id = previousResponseId;
    }

    const stream = await openai.responses.create(streamOptions);

    let stepContent = '';
    let responseId = previousResponseId || '';
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

        // Image generation events
        case 'response.image_generation_call.partial_image': {
          const b64Data = event.partial_image_b64 || event.b64_json;
          if (b64Data) {
            sse.write({
              type: 'partial_image',
              b64_json: b64Data,
              partial_image_index: event.partial_image_index ?? 0,
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
              output_format: event.output_format,
            });
          }
          break;
        }

        case 'image_generation.completed': {
          if (event.b64_json) {
            try {
              const stored = await this.uploader.save(
                event.b64_json,
                `image/${event.output_format || 'png'}`
              );
              generatedImages.push(stored);
              stepContent += `\n\n${stored.markdown}\n`;
              sse.write({
                type: 'image',
                url: stored.url,
                storagePath: stored.storagePath,
                format: stored.format,
              });
            } catch (error: any) {
              logger.error('Image storage error', { error: error.message });
              sse.write({
                type: 'error',
                error: error?.message || 'Failed to store generated image',
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
            partial_image_index: idx,
          });
          break;
        }

        case 'response.output_image.completed': {
          const idx = event.index ?? 0;
          const b64 = imageChunks.get(idx);
          if (b64) {
            try {
              const mime = event?.media?.mime_type || 'image/png';
              const stored = await this.uploader.save(b64, mime);
              generatedImages.push(stored);
              stepContent += `\n\n${stored.markdown}\n`;
              sse.write({
                type: 'image',
                url: stored.url,
                storagePath: stored.storagePath,
                format: stored.format,
              });
            } catch (error: any) {
              logger.error('Image storage error', { error: error.message });
              sse.write({
                type: 'error',
                error: error?.message || 'Failed to store generated image',
              });
            } finally {
              imageChunks.delete(idx);
            }
          }
          break;
        }

        // Tool call events
        case 'response.output_item.added': {
          if (event.item?.type === 'tool_call' && this.toolExecutor) {
            this.toolExecutor.start(event.item);
          }
          break;
        }

        case 'response.tool_call.delta': {
          if (this.toolExecutor) {
            this.toolExecutor.delta(event);
          }
          break;
        }

        case 'response.output_item.done': {
          if (event.item?.type === 'tool_call' && this.toolExecutor) {
            const done = this.toolExecutor.finish(event.item);
            completedCalls.push(done);
          } else if (event.item?.type === 'image_generation_call') {
            // Built-in tool - handle image but don't add to completedCalls
            const resultPayload = extractBase64Image(event.item.result);
            const mimeType = event.item?.media?.[0]?.mime_type;
            if (resultPayload) {
              try {
                const stored = await this.uploader.save(resultPayload, mimeType);
                generatedImages.push(stored);
                stepContent += `\n\n${stored.markdown}\n`;
                sse.write({
                  type: 'image',
                  url: stored.url,
                  storagePath: stored.storagePath,
                  format: stored.format,
                });
              } catch (error: any) {
                logger.error('Image storage error', { error: error.message });
                sse.write({
                  type: 'error',
                  error: error?.message || 'Failed to store generated image',
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
          // Log unknown events for debugging
          logger.debug('Unknown stream event', { type: event.type });
          break;
      }
    }

    return {
      text: stepContent,
      responseId,
      toolCalls: completedCalls,
      images: generatedImages,
    };
  }
}
