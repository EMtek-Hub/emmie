/**
 * API route authentication helpers for EMtek Hub SSO with per-tool permissions
 */

import { requirePermission } from './authz.js';

/**
 * Require API permission and return session or send error response
 * @param {Object} req - Next.js API request object
 * @param {Object} res - Next.js API response object
 * @param {string} toolSlug - Tool slug to check permission for
 * @returns {Promise<Object|null>} Session object or null (response already sent)
 */
export async function requireApiPermission(req, res, toolSlug) {
  try {
    const perm = await requirePermission(req, toolSlug);
    
    if (!perm.allowed) {
      const status = perm.reason === 'no-session' ? 401 : 403;
      const error = status === 401 ? 'Unauthorized' : 'Forbidden';
      
      res.status(status).json({ 
        error,
        reason: perm.reason 
      });
      return null;
    }
    
    return perm.session;
  } catch (error) {
    console.error('API auth error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
    return null;
  }
}
