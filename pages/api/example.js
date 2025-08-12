import { withHubAuth } from '../../lib/hubAuth';

/**
 * Example protected API route
 * This endpoint can only be accessed by authenticated users with tool access
 */
async function handler(req, res) {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      // Example: Get user-specific data
      return res.status(200).json({
        message: 'Hello from protected API!',
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
        },
        toolAccess: {
          slug: req.toolAccess.tool?.slug,
          permissions: req.toolAccess.permissions,
        },
        timestamp: new Date().toISOString(),
      });
      
    case 'POST':
      // Example: Handle user data submission
      const { data } = req.body;
      
      // Your business logic here
      // This code only runs for verified users
      
      return res.status(201).json({
        success: true,
        message: 'Data processed successfully',
        userId: req.user.id,
        data: data,
      });
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

// Export the handler wrapped with Hub authentication
export default withHubAuth(handler);
