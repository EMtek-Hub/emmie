import { requireApiPermission } from '../../../lib/apiAuth';
import { ensureUser } from '../../../lib/db';

export default async function handler(req, res) {
  // Test the user sync functionality
  console.log('🔍 Testing user sync...');
  
  try {
    // Try to get session first
    const session = await requireApiPermission(req, res, process.env.TOOL_SLUG);
    if (!session) {
      console.log('❌ No session found');
      return; // Response already sent by requireApiPermission
    }

    console.log('✅ Session found:', {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name
    });

    // Now try the ensureUser function with real session data
    console.log('🧪 Testing ensureUser function...');
    const result = await ensureUser(
      session.user.id,
      session.user.email,
      session.user.name
    );

    console.log('✅ ensureUser successful:', result);

    res.json({
      success: true,
      message: 'User sync test completed successfully',
      user: result,
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      }
    });

  } catch (error) {
    console.error('❌ ensureUser failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        hint: error.hint,
        details: error.details
      }
    });
  }
}
