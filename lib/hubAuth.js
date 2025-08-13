/**
 * EMtek Hub Authentication Integration
 * Utilities for working with centralized Hub OAuth2/OIDC authentication
 */

/**
 * Fetch user session from local storage (client-side) or URL params (server-side callback)
 * @param {Object} req - Next.js request object (server-side only)
 * @returns {Promise<Object|null>} Session object or null if not authenticated
 */
export async function getHubSession(req) {
  // On server-side, check if this is a callback with session data in URL
  if (req && req.url) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const user = url.searchParams.get('user');
    const name = url.searchParams.get('name');
    const id = url.searchParams.get('id');
    const timestamp = url.searchParams.get('timestamp');
    
    if (user && name && id) {
      return {
        user: {
          id,
          email: user,
          name: decodeURIComponent(name),
        },
        timestamp: parseInt(timestamp) || Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
    }
  }
  
  // Server-side cannot access sessionStorage, so return null
  // Client-side authentication will be handled in components
  return null;
}

/**
 * Client-side session check using sessionStorage
 * @returns {Object|null} Session object or null if not authenticated
 */
export function getClientSession() {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionData = sessionStorage.getItem('hub-session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check if session has expired
    if (session.expires && Date.now() > session.expires) {
      sessionStorage.removeItem('hub-session');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error parsing session data:', error);
    sessionStorage.removeItem('hub-session');
    return null;
  }
}

/**
 * Get user permissions from EMtek Hub
 * @param {Object} req - Next.js request object (server-side only)
 * @returns {Promise<Array>} Array of tool slugs user has access to
 */
export async function getUserPermissions(req) {
  try {
    const hubUrl = process.env.HUB_URL || 'https://emtekhub.netlify.app';
    const response = await fetch(`${hubUrl}/api/permissions/for-user`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
        'User-Agent': 'EMtek-Tool-Template/2.0.0',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return Array.isArray(result.tools) ? result.tools : [];
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Check if user has access to this specific tool
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object>} Access check result
 */
export async function checkToolAccess(req) {
  const session = await getHubSession(req);
  
  if (!session) {
    return {
      hasAccess: false,
      session: null,
      redirectUrl: getHubSignInUrl(req),
    };
  }

  // For cross-domain setup, if we have session data from URL params,
  // assume access is granted (permissions were already checked by Hub)
  if (session.user && session.user.id && session.user.email) {
    return {
      hasAccess: true,
      session,
      redirectUrl: null,
    };
  }

  return {
    hasAccess: false,
    session: null,
    redirectUrl: getHubSignInUrl(req),
  };
}

/**
 * Generate Hub sign-in URL with callback
 * @param {Object} req - Next.js request object
 * @returns {string} Hub sign-in URL
 */
export function getHubSignInUrl(req) {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://emtekhub.netlify.app';
  const toolUrl = process.env.NEXT_PUBLIC_TOOL_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const callbackUrl = `${toolUrl}${req.url}`;
  
  return `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/**
 * Client-side redirect to Hub authentication
 * @param {string} callbackUrl - URL to redirect back to after auth
 */
export function redirectToHubAuth(callbackUrl) {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://emtekhub.netlify.app';
  const encodedCallback = encodeURIComponent(callbackUrl || window.location.href);
  window.location.href = `${hubUrl}/api/auth/signin?callbackUrl=${encodedCallback}`;
}

/**
 * Get tool configuration from environment variables
 * @returns {Object} Tool configuration
 */
export function getToolConfig() {
  return {
    slug: process.env.TOOL_SLUG || 'tool-template',
    name: process.env.NEXT_PUBLIC_TOOL_NAME || 'EMtek Tool Template',
    description: process.env.NEXT_PUBLIC_TOOL_DESCRIPTION || 'A template for EMtek Hub-integrated tools',
    version: '2.0.0',
  };
}

/**
 * Middleware to protect API routes
 * @param {Function} handler - The API route handler
 * @returns {Function} Protected API route handler
 */
export function withHubAuth(handler) {
  return async function protectedHandler(req, res) {
    try {
      const accessCheck = await checkToolAccess(req);
      
      if (!accessCheck.hasAccess) {
        return res.status(401).json({ 
          error: 'Authentication required',
          redirectUrl: accessCheck.redirectUrl
        });
      }

      // Add session to request object
      req.session = accessCheck.session;
      req.user = accessCheck.session.user;
      
      return handler(req, res);
    } catch (error) {
      console.error('Hub auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication verification failed' 
      });
    }
  };
}

/**
 * Server-side props helper for protected pages
 * @param {Object} context - Next.js getServerSideProps context
 * @returns {Promise<Object>} Props or redirect object
 */
export async function requireHubAuth(context) {
  const accessCheck = await checkToolAccess(context.req);
  
  if (!accessCheck.hasAccess) {
    return {
      redirect: {
        destination: accessCheck.redirectUrl,
        permanent: false,
      },
    };
  }

  return {
    props: {
      session: accessCheck.session,
    },
  };
}

/**
 * Server-side sign out helper
 * @returns {string} Hub sign out URL
 */
export function getHubSignOutUrl() {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://emtekhub.netlify.app';
  return `${hubUrl}/api/auth/signout`;
}

/**
 * Client-side sign out
 */
export function signOut() {
  window.location.href = getHubSignOutUrl();
}
