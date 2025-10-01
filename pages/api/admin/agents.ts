import { NextApiRequest, NextApiResponse } from 'next';
import { requireSession } from '../../../lib/authServer';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await requireSession(req);
  if (!session) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  // Check if user has admin permissions
  const userGroups = session.user.groups || [];
  if (!userGroups.includes('EMtek-Hub-Admins')) {
    return res.status(403).json({ 
      error: 'Administrator access required. You must be a member of EMtek-Hub-Admins group.' 
    });
  }

  try {
    if (req.method === 'GET') {
      // Fetch all agents with their current configuration
      const { data: agents, error } = await supabaseAdmin
        .from('chat_agents')
        .select(`
          id,
          name,
          department,
          description,
          color,
          icon,
          is_active,
          created_at,
          updated_at
        `)
        .eq('org_id', EMTEK_ORG_ID)
        .order('department', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching agents:', error);
        return res.status(500).json({ error: 'Failed to fetch agents' });
      }

      return res.status(200).json({
        agents: agents || [],
        total: agents?.length || 0
      });

    } else if (req.method === 'PUT') {
      // Update agent configuration (simplified - no agent mode switching)
      const { agentId, is_active } = req.body;

      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (is_active !== undefined) {
        updateData.is_active = Boolean(is_active);
      }

      // Update the agent
      const { data: updatedAgent, error } = await supabaseAdmin
        .from('chat_agents')
        .update(updateData)
        .eq('id', agentId)
        .eq('org_id', EMTEK_ORG_ID)
        .select(`
          id,
          name,
          department,
          description,
          color,
          icon,
          is_active,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Error updating agent:', error);
        return res.status(500).json({ error: 'Failed to update agent' });
      }

      if (!updatedAgent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      return res.status(200).json({
        message: 'Agent updated successfully',
        agent: updatedAgent
      });

    } else if (req.method === 'PATCH') {
      // Bulk update multiple agents (simplified)
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Updates array is required' });
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        const { agentId, is_active } = update;

        if (!agentId) {
          errors.push({ agentId, error: 'Agent ID is required' });
          continue;
        }

        try {
          // Prepare update data
          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (is_active !== undefined) {
            updateData.is_active = Boolean(is_active);
          }

          const { data: updatedAgent, error } = await supabaseAdmin
            .from('chat_agents')
            .update(updateData)
            .eq('id', agentId)
            .eq('org_id', EMTEK_ORG_ID)
            .select('id, name, is_active')
            .single();

          if (error) {
            errors.push({ agentId, error: error.message });
          } else {
            results.push(updatedAgent);
          }
        } catch (err) {
          errors.push({ agentId, error: (err as Error).message });
        }
      }

      return res.status(200).json({
        message: `Updated ${results.length} agents successfully`,
        updated: results,
        errors: errors,
        success: results.length,
        failed: errors.length
      });

    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
