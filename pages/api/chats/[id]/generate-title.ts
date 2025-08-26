import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../../lib/db';
import { openai, GPT5_MODELS } from '../../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;
  const { id: chatId } = req.query;

  if (!chatId || typeof chatId !== 'string') {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  if (req.method === 'POST') {
    try {
      // First verify user has access to this chat
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .select('id, created_by, title')
        .eq('id', chatId)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (chatError || !chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.created_by !== userId) {
        return res.status(403).json({ error: 'Access denied to this chat' });
      }

      // Skip if chat already has a meaningful title (not null/empty)
      if (chat.title && chat.title.trim() !== '') {
        return res.json({ title: chat.title });
      }

      // Get the first few messages to generate title from
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('role, content_md')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(6); // Get up to 6 messages (3 user, 3 assistant)

      if (messagesError || !messages || messages.length < 2) {
        return res.status(400).json({ error: 'Not enough messages to generate title' });
      }

      // Create a conversation summary for title generation
      const conversationSummary = messages
        .map(msg => `${msg.role}: ${msg.content_md}`)
        .join('\n');

      // Generate title using GPT-5 Nano for fast, cost-efficient summary titles
      const titleResponse = await openai.responses.create({
        model: GPT5_MODELS.NANO, // Use most efficient GPT-5 model for simple title generation
        instructions: 'Generate a short, descriptive title (2-6 words) summarizing this conversation. Focus on the main topic or key question. Return only the title, no quotes or formatting.',
        input: `Create a brief title for this conversation:\n\n${conversationSummary}`,
        reasoning: { effort: 'minimal' as any } // Minimal reasoning for simple title generation
      });

      const generatedTitle = titleResponse.output_text?.trim() || 'New Chat';

      // Update the chat with the generated title
      const { data: updatedChat, error: updateError } = await supabaseAdmin
        .from('chats')
        .update({ title: generatedTitle })
        .eq('id', chatId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating chat title:', updateError);
        return res.status(500).json({ error: 'Failed to update chat title' });
      }

      return res.json({ title: generatedTitle });
    } catch (error) {
      console.error('Title generation error:', error);
      return res.status(500).json({ error: 'Failed to generate title' });
    }
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).json({ error: 'Method not allowed' });
}
