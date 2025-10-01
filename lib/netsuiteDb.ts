import { createClient } from '@supabase/supabase-js';

/**
 * NetSuite Supabase Client
 * Connects to the separate NetSuite sync database
 */
const netsuiteSupabaseUrl = process.env.NETSUITE_SUPABASE_URL!;
const netsuiteSupabaseKey = process.env.NETSUITE_SUPABASE_SERVICE_KEY!;

if (!netsuiteSupabaseUrl || !netsuiteSupabaseKey) {
  throw new Error('NetSuite Supabase credentials not configured');
}

export const netsuiteDb = createClient(netsuiteSupabaseUrl, netsuiteSupabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Get employee by email
 */
export async function getEmployeeByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data, error } = await netsuiteDb
    .from('ns_employees')
    .select('id, firstname, lastname, email')
    .eq('email', normalizedEmail)
    .eq('isinactive', false)
    .single();
  
  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }
  
  return data;
}

/**
 * Get projects for an employee
 */
export async function getEmployeeProjects(employeeId: number) {
  // Step 1: Get project resources (assignments)
  const { data: resources, error: resourcesError } = await netsuiteDb
    .from('ns_project_resources')
    .select('project_id')
    .eq('employee_id', employeeId)
    .eq('active', true);
  
  if (resourcesError) {
    console.error('Error fetching project resources:', resourcesError);
    return [];
  }
  
  if (!resources || resources.length === 0) {
    return [];
  }
  
  const projectIds = resources.map(r => r.project_id);
  
  // Step 2: Get project details
  const { data: projects, error: projectsError } = await netsuiteDb
    .from('ns_projects')
    .select(`
      id,
      name,
      entityid,
      display_name,
      company_name,
      custentity_emtek_proj_no,
      startdate,
      scheduledenddate,
      calculatedenddate,
      status_id,
      isinactive,
      active,
      actualtime,
      plannedwork,
      percenttimecomplete,
      custentity_emtek_perc_comp
    `)
    .in('id', projectIds)
    .eq('active', true)
    .eq('isinactive', false)
    .order('startdate', { ascending: false });
  
  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    return [];
  }
  
  return projects || [];
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: number) {
  const { data, error } = await netsuiteDb
    .from('ns_projects')
    .select(`
      id,
      name,
      entityid,
      display_name,
      company_name,
      custentity_emtek_proj_no,
      startdate,
      scheduledenddate,
      calculatedenddate,
      status_id,
      isinactive,
      active,
      actualtime,
      plannedwork,
      percenttimecomplete,
      custentity_emtek_perc_comp,
      raw
    `)
    .eq('id', projectId)
    .single();
  
  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }
  
  return data;
}

/**
 * Search projects by name or company
 */
export async function searchProjects(query: string, employeeId?: number) {
  let projectQuery = netsuiteDb
    .from('ns_projects')
    .select(`
      id,
      name,
      entityid,
      display_name,
      company_name,
      custentity_emtek_proj_no,
      startdate,
      status_id
    `)
    .eq('active', true)
    .eq('isinactive', false)
    .or(`name.ilike.%${query}%,company_name.ilike.%${query}%,entityid.ilike.%${query}%,custentity_emtek_proj_no.ilike.%${query}%`)
    .order('startdate', { ascending: false })
    .limit(50);
  
  // If employee ID provided, filter by their assignments
  if (employeeId) {
    const { data: resources } = await netsuiteDb
      .from('ns_project_resources')
      .select('project_id')
      .eq('employee_id', employeeId)
      .eq('active', true);
    
    if (resources && resources.length > 0) {
      const projectIds = resources.map(r => r.project_id);
      projectQuery = projectQuery.in('id', projectIds);
    } else {
      return [];
    }
  }
  
  const { data, error } = await projectQuery;
  
  if (error) {
    console.error('Error searching projects:', error);
    return [];
  }
  
  return data || [];
}
