/**
 * Authorization helpers for EMtek Hub SSO with per-tool permissions
 * Uses "Fetch the Hub session" approach with permission validation
 */

/**
 * Fetch user session from EMtek Hub
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSession(req) {
  try {
    const hubUrl = process.env.HUB_URL || 'https://auth.emtek.com.au';
    const response = await fetch(`${hubUrl}/api/auth/session`, {
      headers: { 
        cookie: req.headers.cookie || "" 
      },
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const session = await response.json();
    return session?.user ? session : null;
  } catch (error) {
    console.error('Error fetching Hub session:', error);
    return null;
  }
}

/**
 * Check if user has permission for the specified tool
 * @param {Object} req - Next.js request object
 * @param {string} toolSlug - Tool slug to check permission for
 * @returns {Promise<Object>} Permission result with allowed/reason/session
 */
export async function requirePermission(req, toolSlug) {
  try {
    // First check if user has a valid session
    const session = await getSession(req);
    if (!session) {
      return {
        allowed: false,
        reason: 'no-session',
        session: null
      };
    }

    // Check per-tool permissions with Hub
    const hubUrl = process.env.HUB_URL || 'https://auth.emtek.com.au';
    const response = await fetch(`${hubUrl}/api/auth/user-permissions/${toolSlug}`, {
      headers: { 
        cookie: req.headers.cookie || "" 
      },
      credentials: "include",
    });

    if (!response.ok) {
      return {
        allowed: false,
        reason: 'forbidden',
        session
      };
    }

    const permissionResult = await response.json();
    
    if (permissionResult.allowed === true) {
      return {
        allowed: true,
        reason: null,
        session
      };
    }

    return {
      allowed: false,
      reason: 'forbidden',
      session
    };
  } catch (error) {
    console.error('Error checking tool permissions:', error);
    return {
      allowed: false,
      reason: 'error',
      session: null
    };
  }
}

/**
 * Helper for getServerSideProps to require authentication and permissions
 * @param {Object} context - Next.js getServerSideProps context
 * @param {string} toolSlug - Tool slug to check permission for
 * @returns {Promise<Object>} Props or redirect object
 */
export async function requireHubAuth(context, toolSlug) {
  const perm = await requirePermission(context.req, toolSlug);

  if (!perm.allowed) {
    if (perm.reason === 'no-session') {
      const toolOrigin = process.env.TOOL_ORIGIN || 'https://tool-a.emtek.com.au';
      const callbackUrl = `${toolOrigin}${context.resolvedUrl}`;
      const hubUrl = process.env.HUB_URL || 'https://auth.emtek.com.au';
      
      return {
        redirect: {
          destination: `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          permanent: false,
        },
      };
    }
    
    // User is authenticated but doesn't have permission for this tool
    const hubUrl = process.env.HUB_URL || 'https://auth.emtek.com.au';
    return {
      redirect: {
        destination: `${hubUrl}/unauthorised`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      session: perm.session,
    },
  };
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
