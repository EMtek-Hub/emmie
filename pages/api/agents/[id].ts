import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid agent ID is required' });
  }

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  if (req.method === 'PUT') {
    try {
      const { 
        name, 
        department, 
        description, 
        system_prompt,
        background_instructions,
        color,
        icon,
        is_active 
      } = req.body;

      if (!name || !department || !system_prompt) {
        return res.status(400).json({ error: 'Name, department, and system prompt are required' });
      }

      // Check if agent exists and belongs to the organization
      const { data: existingAgent, error: fetchError } = await supabaseAdmin
        .from('chat_agents')
        .select('id')
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (fetchError || !existingAgent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const { data: agent, error } = await supabaseAdmin
        .from('chat_agents')
        .update({
          name,
          department,
          description,
          system_prompt,
          background_instructions,
          color,
          icon,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ agent });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if agent exists and belongs to the organization
      const { data: existingAgent, error: fetchError } = await supabaseAdmin
        .from('chat_agents')
        .select('id, name')
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (fetchError || !existingAgent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Don't allow deletion of default agents (those with hardcoded IDs)
      const defaultAgentIds = [
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000005'
      ];

      if (defaultAgentIds.includes(id)) {
        return res.status(400).json({ error: 'Cannot delete default system agents' });
      }

      // Instead of hard delete, soft delete by setting is_active to false
      const { error } = await supabaseAdmin
        .from('chat_agents')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID);

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ message: 'Agent deactivated successfully' });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}
