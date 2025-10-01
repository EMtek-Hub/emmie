import { NextApiRequest, NextApiResponse } from 'next';
import { requireHubAuth } from '../../../lib/authz';
import { getEmployeeByEmail, getEmployeeProjects, searchProjects } from '../../../lib/netsuiteDb';

/**
 * API endpoint to fetch user's NetSuite projects
 * GET /api/netsuite/projects - Get all projects for logged-in user
 * GET /api/netsuite/projects?search=query - Search projects
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await requireHubAuth({ req, res } as any, process.env.TOOL_SLUG);
  
  if (authResult.redirect) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const session = authResult.props.session;
  
  // In dev mode, use the override email for testing
  const userEmail = process.env.LOCAL_DEV_MODE === 'true' && process.env.DEV_USER_EMAIL
    ? process.env.DEV_USER_EMAIL
    : session?.user?.email;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'No user email found' });
  }
  
  console.log('Fetching NetSuite projects for:', userEmail);
  
  if (req.method === 'GET') {
    try {
      const { search } = req.query;
      
      // Step 1: Get employee by email
      const employee = await getEmployeeByEmail(userEmail);
      
      if (!employee) {
        return res.status(404).json({ 
          error: 'Employee not found in NetSuite',
          message: 'Your email address is not linked to a NetSuite employee record.'
        });
      }
      
      // Step 2: Get projects
      let projects;
      if (search && typeof search === 'string') {
        // Search mode
        projects = await searchProjects(search, employee.id);
      } else {
        // Get all employee projects
        projects = await getEmployeeProjects(employee.id);
      }
      
      // Format projects for frontend
      const formattedProjects = projects.map(project => ({
        id: project.id,
        netsuiteId: project.id,
        name: project.name || project.display_name || 'Unnamed Project',
        displayName: project.display_name,
        companyName: project.company_name,
        projectNumber: project.custentity_emtek_proj_no,
        entityId: project.entityid,
        startDate: project.startdate,
        scheduledEndDate: project.scheduledenddate,
        calculatedEndDate: project.calculatedenddate,
        statusId: project.status_id,
        actualTime: project.actualtime,
        plannedWork: project.plannedwork,
        percentComplete: project.percenttimecomplete || project.custentity_emtek_perc_comp,
      }));
      
      return res.status(200).json({
        employee: {
          id: employee.id,
          name: `${employee.firstname} ${employee.lastname}`,
          email: employee.email
        },
        projects: formattedProjects,
        count: formattedProjects.length
      });
      
    } catch (error) {
      console.error('Error fetching NetSuite projects:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch NetSuite projects',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
