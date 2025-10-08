// lib/chat/session.ts - Chat and message persistence
import { supabaseAdmin, EMTEK_ORG_ID } from '../db';
import type { GeneratedImage } from '../media/uploader';
import type { ExecutedToolCall } from '../tools/executor';

/**
 * Create a new chat or return existing chat ID
 */
export async function createOrGetChat(params: {
  chatId?: string;
  projectId?: string | null;
  agentId?: string | null;
  mode?: string;
  userId: string;
}): Promise<string> {
  const { chatId, projectId, agentId, mode, userId } = params;

  if (chatId) {
    return chatId;
  }

  const { data, error } = await supabaseAdmin
    .from('chats')
    .insert([
      {
        org_id: EMTEK_ORG_ID,
        project_id: projectId ?? null,
        agent_id: agentId ?? null,
        title: null,
        mode: mode ?? 'normal',
        created_by: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Chat creation failed: ${error.message}`);
  }

  return data.id as string;
}

/**
 * Save user message to database
 */
export async function saveUserMessage(params: {
  chat_id: string;
  content_md: string;
  hasImages: boolean;
  imageUrls: string[];
}): Promise<void> {
  const { chat_id, content_md, hasImages, imageUrls } = params;

  const attachments = hasImages
    ? imageUrls.map((url) => ({
        type: 'image',
        url,
        alt: 'User uploaded image',
      }))
    : null;

  const { error } = await supabaseAdmin.from('messages').insert([
    {
      chat_id,
      role: 'user',
      content_md,
      model: 'user',
      message_type: hasImages ? 'mixed' : 'text',
      attachments,
    },
  ]);

  if (error) {
    throw new Error(`User message save failed: ${error.message}`);
  }
}

/**
 * Save assistant message to database
 */
export async function saveAssistantMessage(params: {
  chat_id: string;
  content: string;
  model: string;
  images: GeneratedImage[];
  toolCalls: ExecutedToolCall[];
}): Promise<void> {
  const { chat_id, content, model, images, toolCalls } = params;

  const hasText = content.trim().length > 0;
  const hasGeneratedImages = images.length > 0;

  const assistantMessageData: any = {
    chat_id,
    role: 'assistant',
    content_md: content,
    model,
    message_type:
      hasGeneratedImages && hasText ? 'mixed' : hasGeneratedImages ? 'image' : 'text',
  };

  if (toolCalls.length > 0) {
    assistantMessageData.tool_calls = toolCalls;
  }

  if (hasGeneratedImages) {
    assistantMessageData.attachments = images.map((image) => ({
      type: 'image',
      url: image.url,
      storagePath: image.storagePath,
      format: image.format,
    }));
  }

  const { error } = await supabaseAdmin.from('messages').insert([assistantMessageData]);

  if (error) {
    throw new Error(`Assistant message save failed: ${error.message}`);
  }
}
