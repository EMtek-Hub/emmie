import type { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../../../../lib/apiAuth';
import { supabaseAdmin } from '../../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) {
    return;
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  try {
    const { data: latestMessages, error: latestError } = await supabaseAdmin
      .from('messages')
      .select('id, created_at')
      .eq('chat_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestError) {
      throw latestError;
    }

    const latestMessage = latestMessages?.[0];

    if (!latestMessage) {
      // No messages remaining, remove the empty chat
      await supabaseAdmin.from('chats').delete().eq('id', id);
      return res.status(200).json({ removedMessageId: null, chatDeleted: true });
    }

    const { error: deleteMessageError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', latestMessage.id);

    if (deleteMessageError) {
      throw deleteMessageError;
    }

    const { count, error: remainingError } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('chat_id', id);

    if (remainingError) {
      throw remainingError;
    }

    let chatDeleted = false;

    if (!count || count === 0) {
      const { error: deleteChatError } = await supabaseAdmin.from('chats').delete().eq('id', id);
      if (deleteChatError) {
        throw deleteChatError;
      }
      chatDeleted = true;
    }

    return res.status(200).json({
      removedMessageId: latestMessage.id,
      chatDeleted,
    });
  } catch (error: any) {
    console.error('Failed to delete latest message:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
}
