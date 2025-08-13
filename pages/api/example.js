import { requireApiPermission } from '../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication and per-tool permission
    const session = await requireApiPermission(req, res, process.env.TOOL_SLUG);
    if (!session) return; // Response already sent by requireApiPermission

    // Example API logic here
    const data = {
      message: 'Hello from EMtek Tool Template API!',
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      timestamp: new Date().toISOString(),
      authenticated: true,
      toolAccess: true,
    };

    res.status(200).json(data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
