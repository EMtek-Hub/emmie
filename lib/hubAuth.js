/**
 * EMtek Hub Authentication Integration
 * Utilities for verifying user access through the EMtek Hub SSO system
 */

/**
 * Check if user has access to this tool via EMtek Hub
 * @param {string} toolSlug - The slug of the tool to check access for
 * @param {Object} session - NextAuth session object
 * @returns {Promise<Object>} Access verification result
 */
export async function verifyHubAccess(toolSlug, session) {
  if (!session) {
    return { 
      hasAccess: false, 
      error: 'No session provided' 
    };
  }

  if (!toolSlug) {
    return { 
      hasAccess: false, 
      error: 'Tool slug is required' 
    };
  }

  try {
    const hubUrl = process.env.EMTEK_HUB_URL || 'https://emtekhub.netlify.app';
    const response = await fetch(
      `${hubUrl}/api/auth/user-permissions/${toolSlug}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `next-auth.session-token=${session.sessionToken || ''}`,
          'User-Agent': 'EMtek-Tool-Template/1.0.0',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hub access verification failed:', response.status, errorText);
      return { 
        hasAccess: false, 
        error: `Hub verification failed: ${response.status}` 
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying hub access:', error);
    return { 
      hasAccess: false, 
      error: 'Failed to connect to EMtek Hub' 
    };
  }
}

/**
 * Redirect user to EMtek Hub for authentication
 * @param {string} callbackUrl - URL to redirect back to after authentication
 * @returns {string} Hub authentication URL
 */
export function getHubAuthUrl(callbackUrl) {
  const hubUrl = process.env.EMTEK_HUB_URL || 'https://emtekhub.netlify.app';
  const encodedCallback = encodeURIComponent(callbackUrl);
  return `${hubUrl}/auth/signin?callbackUrl=${encodedCallback}`;
}

/**
 * Get tool information from environment variables
 * @returns {Object} Tool configuration
 */
export function getToolConfig() {
  return {
    slug: process.env.TOOL_SLUG || 'tool-template',
    name: process.env.NEXT_PUBLIC_TOOL_NAME || 'EMtek Tool Template',
    description: process.env.NEXT_PUBLIC_TOOL_DESCRIPTION || 'A template for EMtek Hub-integrated tools',
    hubUrl: process.env.EMTEK_HUB_URL || 'https://emtekhub.netlify.app',
  };
}

/**
 * Middleware helper to protect API routes
 * @param {Function} handler - The API route handler
 * @returns {Function} Protected API route handler
 */
export function withHubAuth(handler) {
  return async function protectedHandler(req, res) {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('./authConfig');
    
    try {
      const session = await getServerSession(req, res, authOptions);
      
      if (!session) {
        return res.status(401).json({ 
          error: 'Authentication required',
          redirectUrl: getHubAuthUrl(`${req.headers.host}${req.url}`)
        });
      }

      const toolConfig = getToolConfig();
      const accessResult = await verifyHubAccess(toolConfig.slug, session);
      
      if (!accessResult.hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          details: accessResult.error
        });
      }

      // Add user info to request
      req.user = accessResult.user;
      req.toolAccess = accessResult;
      
      return handler(req, res);
    } catch (error) {
      console.error('Hub auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication verification failed' 
      });
    }
  };
}
