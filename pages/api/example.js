import { withHubAuth } from '../../lib/hubAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Access user information from the session
    const user = req.user;
    const session = req.session;

    // Example API logic here
    const data = {
      message: 'Hello from EMtek Tool Template API!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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

// Protect this API route with Hub authentication
export default withHubAuth(handler);
