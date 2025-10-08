import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  try {
    switch (req.method) {
      case 'GET':
        return handleGetAgentTools(req, res);
      case 'POST':
        return handleAssignTool(req, res);
      case 'PUT':
        return handleUpdateAgentTool(req, res);
      case 'DELETE':
        return handleUnassignTool(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Agent tools API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get tools for a specific agent
async function handleGetAgentTools(req: NextApiRequest, res: NextApiResponse) {
  const { agentId, agent_id } = req.query;
  const targetAgentId = agentId || agent_id;

  if (!targetAgentId) {
    return res.status(400).json({ error: 'agentId is required' });
  }

  try {
    // Verify agent exists and belongs to the organization
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('chat_agents')
      .select('id, name')
      .eq('id', targetAgentId)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get agent tools directly from agent_tools table
    const { data: agentTools, error } = await supabaseAdmin
      .from('agent_tools')
      .select(`
        id,
        tool_id,
        is_enabled,
        config,
        created_at,
        tool_definitions(
          id,
          name,
          tool_type,
          description,
          function_schema,
          is_system
        )
      `)
      .eq('agent_id', targetAgentId)
      .eq('is_enabled', true);

    if (error) {
      console.error('Error fetching agent tools:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(agentTools || []);

  } catch (error) {
    console.error('Error in handleGetAgentTools:', error);
    return res.status(500).json({ error: 'Failed to fetch agent tools' });
  }
}

// Assign a tool to an agent
async function handleAssignTool(req: NextApiRequest, res: NextApiResponse) {
  const { agentId, toolId, agent_id, tool_id, is_enabled = true, config = {} } = req.body;
  
  const targetAgentId = agentId || agent_id;
  const targetToolId = toolId || tool_id;

  if (!targetAgentId || !targetToolId) {
    return res.status(400).json({ 
      error: 'agentId and toolId are required' 
    });
  }

  try {
    // Verify agent exists and belongs to the organization
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('chat_agents')
      .select('id, name')
      .eq('id', targetAgentId)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify tool exists and belongs to the organization
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tool_definitions')
      .select('id, name')
      .eq('id', targetToolId)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (toolError || !tool) {
      return res.status(404).json({ error: 'Tool not found or inactive' });
    }

    // Insert or update the agent-tool assignment
    const { data: assignment, error } = await supabaseAdmin
      .from('agent_tools')
      .upsert([{
        agent_id: targetAgentId,
        tool_id: targetToolId,
        is_enabled,
        config
      }], {
        onConflict: 'agent_id,tool_id'
      })
      .select(`
        *,
        tool_definitions(name, description, tool_type, function_schema)
      `)
      .single();

    if (error) {
      console.error('Error assigning tool:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ 
      assignment,
      message: `Tool '${tool.name}' assigned to agent '${agent.name}'`
    });

  } catch (error) {
    console.error('Error in handleAssignTool:', error);
    return res.status(500).json({ error: 'Failed to assign tool' });
  }
}

// Update an agent-tool assignment
async function handleUpdateAgentTool(req: NextApiRequest, res: NextApiResponse) {
  const { assignment_id } = req.query;
  const { is_enabled, config } = req.body;

  if (!assignment_id) {
    return res.status(400).json({ error: 'assignment_id is required' });
  }

  try {
    // Verify assignment exists and belongs to the organization
    const { data: existingAssignment, error: fetchError } = await supabaseAdmin
      .from('agent_tools')
      .select(`
        *,
        chat_agents!inner(org_id)
      `)
      .eq('id', assignment_id)
      .single();

    if (fetchError || !existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (existingAssignment.chat_agents.org_id !== EMTEK_ORG_ID) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = {};
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
    if (config !== undefined) updateData.config = config;

    const { data: assignment, error } = await supabaseAdmin
      .from('agent_tools')
      .update(updateData)
      .eq('id', assignment_id)
      .select(`
        *,
        tool_definitions(display_name, description, category, tool_type),
        chat_agents(name)
      `)
      .single();

    if (error) {
      console.error('Error updating agent tool:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ assignment });

  } catch (error) {
    console.error('Error in handleUpdateAgentTool:', error);
    return res.status(500).json({ error: 'Failed to update agent tool' });
  }
}

// Unassign a tool from an agent
async function handleUnassignTool(req: NextApiRequest, res: NextApiResponse) {
  const { assignment_id, agent_id, tool_id } = req.query;

  // Allow deletion by assignment_id OR by agent_id + tool_id
  if (!assignment_id && (!agent_id || !tool_id)) {
    return res.status(400).json({ 
      error: 'Either assignment_id or both agent_id and tool_id are required' 
    });
  }

  try {
    let deleteQuery;
    let selectQuery;

    if (assignment_id) {
      // First get the assignment details before deleting
      selectQuery = supabaseAdmin
        .from('agent_tools')
        .select(`
          *,
          chat_agents!inner(org_id, name),
          tool_definitions(display_name)
        `)
        .eq('id', assignment_id)
        .single();
    } else {
      // Get assignment details by agent_id + tool_id before deleting
      selectQuery = supabaseAdmin
        .from('agent_tools')
        .select(`
          *,
          chat_agents!inner(org_id, name),
          tool_definitions(display_name)
        `)
        .eq('agent_id', agent_id)
        .eq('tool_id', tool_id)
        .single();
    }

    const { data: assignmentToDelete, error: selectError } = await selectQuery;

    if (selectError) {
      if (selectError.code === 'PGRST116') { // No rows found
        return res.status(404).json({ error: 'Assignment not found' });
      }
      console.error('Error finding assignment:', selectError);
      return res.status(500).json({ error: selectError.message });
    }

    // Verify organization
    if (assignmentToDelete.chat_agents.org_id !== EMTEK_ORG_ID) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Now delete the assignment
    if (assignment_id) {
      deleteQuery = supabaseAdmin
        .from('agent_tools')
        .delete()
        .eq('id', assignment_id);
    } else {
      deleteQuery = supabaseAdmin
        .from('agent_tools')
        .delete()
        .eq('agent_id', agent_id)
        .eq('tool_id', tool_id);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('Error unassigning tool:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      message: `Tool '${assignmentToDelete.tool_definitions.display_name}' unassigned from agent '${assignmentToDelete.chat_agents.name}'`
    });

  } catch (error) {
    console.error('Error in handleUnassignTool:', error);
    return res.status(500).json({ error: 'Failed to unassign tool' });
  }
}

// Bulk assign/unassign tools for an agent
export async function handleBulkToolAssignment(req: NextApiRequest, res: NextApiResponse) {
  const { agent_id, tool_assignments } = req.body;

  if (!agent_id || !Array.isArray(tool_assignments)) {
    return res.status(400).json({ 
      error: 'agent_id and tool_assignments array are required' 
    });
  }

  try {
    // Verify agent exists and belongs to the organization
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('chat_agents')
      .select('id, name')
      .eq('id', agent_id)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // First, remove all existing assignments for this agent
    await supabaseAdmin
      .from('agent_tools')
      .delete()
      .eq('agent_id', agent_id);

    // Then, insert new assignments
    if (tool_assignments.length > 0) {
      const assignments = tool_assignments.map((assignment: any) => ({
        agent_id,
        tool_id: assignment.tool_id,
        is_enabled: assignment.is_enabled ?? true,
        config: assignment.config ?? {}
      }));

      const { data: newAssignments, error } = await supabaseAdmin
        .from('agent_tools')
        .insert(assignments)
        .select(`
          *,
          tool_definitions(display_name, description, category, tool_type)
        `);

      if (error) {
        console.error('Error bulk assigning tools:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ 
        assignments: newAssignments,
        message: `${newAssignments.length} tools assigned to agent '${agent.name}'`
      });
    }

    return res.status(200).json({ 
      assignments: [],
      message: `All tools removed from agent '${agent.name}'`
    });

  } catch (error) {
    console.error('Error in handleBulkToolAssignment:', error);
    return res.status(500).json({ error: 'Failed to update tool assignments' });
  }
}
