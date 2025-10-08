// pages/api/chat.ts - Thin API adapter for chat endpoint
import { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../lib/apiAuth';
import { ChatController } from '../../lib/chat/controller';
import { parseChatRequest, validateMessageContent } from '../../lib/chat/request-schema';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Chat API endpoint - minimal HTTP adapter
 * All business logic delegated to ChatController
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  try {
    // Parse and validate request
    const body = await parseChatRequest(req);
    validateMessageContent(body.messages);

    // Delegate to controller
    const controller = new ChatController({ session, res, req });
    await controller.handle(body);
  } catch (error: any) {
    // Handle validation and other errors
    const statusCode = error.message?.includes('Validation error') ? 400 : 500;
    return res.status(statusCode).json({
      error: error.message || 'Internal server error',
    });
  }
}
