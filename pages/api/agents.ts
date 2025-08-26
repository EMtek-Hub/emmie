import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  if (req.method === 'GET') {
    try {
      const { includeInactive } = req.query;
      
      let query = supabaseAdmin
        .from('chat_agents')
        .select(`
          id,
          name,
          department,
          description,
          system_prompt,
          background_instructions,
          color,
          icon,
          is_active,
          created_at,
          documents!agent_id(count)
        `)
        .eq('org_id', EMTEK_ORG_ID);

      // Only filter by is_active if we don't want inactive agents
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      query = query.order('department', { ascending: true });

      const { data: agents, error } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ agents: agents || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        name, 
        department, 
        description, 
        system_prompt,
        background_instructions,
        color = '#6366f1',
        icon = 'bot',
        is_active = true 
      } = req.body;

      if (!name || !department || !system_prompt) {
        return res.status(400).json({ error: 'Name, department, and system prompt are required' });
      }

      const { data: agent, error } = await supabaseAdmin
        .from('chat_agents')
        .insert([{
          org_id: EMTEK_ORG_ID,
          name,
          department,
          description,
          system_prompt,
          background_instructions,
          color,
          icon,
          is_active,
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ agent });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}
