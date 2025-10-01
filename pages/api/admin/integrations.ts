import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      // Fetch all integrations for the organization
      const { data: integrations, error } = await supabaseAdmin
        .from('agent_integrations')
        .select('*')
        .eq('org_id', EMTEK_ORG_ID)
        .order('integration_type', { ascending: true });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ integrations: integrations || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        integration_type,
        endpoint_url,
        auth_header_key,
        auth_token,
        config,
        is_active
      } = req.body;

      if (!integration_type || !endpoint_url) {
        return res.status(400).json({ error: 'Integration type and endpoint URL are required' });
      }

      const { data: integration, error } = await supabaseAdmin
        .from('agent_integrations')
        .insert([{
          org_id: EMTEK_ORG_ID,
          integration_type,
          endpoint_url,
          auth_header_key: auth_header_key || 'Authorization',
          auth_token,
          config,
          is_active: is_active !== false
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ integration });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const {
        id,
        endpoint_url,
        auth_header_key,
        auth_token,
        config,
        is_active
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Integration ID is required' });
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (endpoint_url !== undefined) updateData.endpoint_url = endpoint_url;
      if (auth_header_key !== undefined) updateData.auth_header_key = auth_header_key;
      if (auth_token !== undefined) updateData.auth_token = auth_token;
      if (config !== undefined) updateData.config = config;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: integration, error } = await supabaseAdmin
        .from('agent_integrations')
        .update(updateData)
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ integration });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH']);
  res.status(405).json({ error: 'Method not allowed' });
}
