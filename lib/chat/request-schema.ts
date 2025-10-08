// lib/chat/request-schema.ts - Request validation with Zod
import { z } from 'zod';
import getRawBody from 'raw-body';
import { NextApiRequest } from 'next';

/**
 * Zod schema for chat request body
 */
export const ChatRequestSchema = z.object({
  chatId: z.string().uuid().optional(),
  projectId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  mode: z.enum(['prompt', 'tools', 'hybrid']).optional(),
  imageUrls: z.array(z.string().url()).default([]),
  selectedContext: z.array(z.object({
    id: z.string(),
    name: z.string(),
    storage_path: z.string().optional(),
    original_filename: z.string().optional(),
    file_type: z.string().optional(),
    mime_type: z.string().optional(),
  })).optional().default([]),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system', 'tool']),
      content: z.string().optional(),
      content_md: z.string().optional(),
    })
  ).min(1, 'At least one message is required'),
});

export type ChatRequestBody = z.infer<typeof ChatRequestSchema>;

/**
 * Parse and validate chat request body from Next.js request
 * Handles raw body parsing for streaming-safe request handling
 */
export async function parseChatRequest(req: NextApiRequest): Promise<ChatRequestBody> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const data = Buffer.concat(chunks).toString('utf8');
    const json = JSON.parse(data);
    
    // Validate with Zod
    return ChatRequestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Validation error: ${firstError.path.join('.')}: ${firstError.message}`);
    }
    throw new Error('Invalid request body');
  }
}

/**
 * Validate that message content is not empty
 */
export function validateMessageContent(messages: ChatRequestBody['messages']): string {
  const lastMessage = messages[messages.length - 1];
  const content = (lastMessage.content_md ?? lastMessage.content ?? '').trim();
  
  if (!content) {
    throw new Error('Message content cannot be empty');
  }
  
  return content;
}
