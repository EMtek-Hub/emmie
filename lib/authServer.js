/**
 * Server-side authentication helpers for EMtek Hub SSO
 * Uses "Fetch the Hub session" approach (Option A)
 */

/**
 * Fetch session from Hub and return it if valid
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object|null>} Session object or null
 */
export async function requireSession(req) {
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
 * Generate Hub sign-in URL with callback
 * @param {string} resolvedUrl - The current page URL to return to after auth
 * @returns {string} Hub sign-in URL
 */
export function getHubSignInUrl(resolvedUrl) {
  const hubUrl = process.env.HUB_URL || 'https://auth.emtek.com.au';
  const toolOrigin = process.env.TOOL_ORIGIN || 'https://tool-a.emtek.com.au';
  const callbackUrl = `${toolOrigin}${resolvedUrl}`;
  
  return `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/**
 * Helper for getServerSideProps to require authentication
 * @param {Object} context - Next.js getServerSideProps context
 * @returns {Promise<Object>} Props or redirect object
 */
export async function requireHubAuth(context) {
  const session = await requireSession(context.req);
  
  if (!session || !session.user) {
    const signInUrl = getHubSignInUrl(context.resolvedUrl);
    return {
      redirect: {
        destination: signInUrl,
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
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

/**
 * Hub sign-out URL
 * @returns {string} Hub sign-out URL
 */
export function getHubSignOutUrl() {
  const hubUrl = process.env.HUB_URL || 'https://auth.emtek.com.au';
  return `${hubUrl}/api/auth/signout`;
}
