import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return handleBulkAssign(req, res);
  } catch (error) {
    console.error('Bulk agent tools API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Bulk assign tools to an agent
async function handleBulkAssign(req: NextApiRequest, res: NextApiResponse) {
  const { agentId, toolIds, agent_id, tool_ids } = req.body;
  
  const targetAgentId = agentId || agent_id;
  const targetToolIds = toolIds || tool_ids;

  if (!targetAgentId || !Array.isArray(targetToolIds)) {
    return res.status(400).json({ 
      error: 'agentId and toolIds array are required' 
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

    // Verify all tools exist and belong to the organization
    if (targetToolIds.length > 0) {
      const { data: tools, error: toolsError } = await supabaseAdmin
        .from('tool_definitions')
        .select('id, name')
        .in('id', targetToolIds)
        .eq('org_id', EMTEK_ORG_ID);

      if (toolsError || !tools || tools.length !== targetToolIds.length) {
        return res.status(400).json({ error: 'One or more tools not found or inactive' });
      }
    }

    // Create assignments for the new tools
    if (targetToolIds.length > 0) {
      const assignments = targetToolIds.map((toolId: string) => ({
        agent_id: targetAgentId,
        tool_id: toolId,
        is_enabled: true,
        config: {}
      }));

      const { data: newAssignments, error } = await supabaseAdmin
        .from('agent_tools')
        .upsert(assignments, {
          onConflict: 'agent_id,tool_id'
        })
        .select(`
          *,
          tool_definitions(name, description, type, function_schema)
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
      message: `No tools to assign to agent '${agent.name}'`
    });

  } catch (error) {
    console.error('Error in handleBulkAssign:', error);
    return res.status(500).json({ error: 'Failed to bulk assign tools' });
  }
}
