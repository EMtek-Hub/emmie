import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  const userId = session.user.id;

  try {
    switch (req.method) {
      case 'GET':
        return handleGetTools(req, res);
      case 'POST':
        return handleCreateTool(req, res, userId);
      case 'PUT':
        return handleUpdateTool(req, res);
      case 'DELETE':
        return handleDeleteTool(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Tools API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all tools with optional filtering
async function handleGetTools(req: NextApiRequest, res: NextApiResponse) {
  const { category, agent_id, include_disabled } = req.query;

  try {
    let query = supabaseAdmin
      .from('tool_definitions')
      .select(`
        *,
        agent_tools!left(
          id,
          agent_id,
          is_enabled,
          config
        )
      `)
      .eq('org_id', EMTEK_ORG_ID);

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Only include active tools unless specified
    if (include_disabled !== 'true') {
      query = query.eq('is_active', true);
    }

    const { data: tools, error } = await query.order('category').order('display_name');

    if (error) {
      console.error('Error fetching tools:', error);
      return res.status(500).json({ error: error.message });
    }

    // If agent_id is provided, filter to show only that agent's configuration
    let processedTools = tools;
    if (agent_id) {
      processedTools = tools.map(tool => ({
        ...tool,
        agent_tools: tool.agent_tools.filter((at: any) => at.agent_id === agent_id)
      }));
    }

    return res.status(200).json({ tools: processedTools });

  } catch (error) {
    console.error('Error in handleGetTools:', error);
    return res.status(500).json({ error: 'Failed to fetch tools' });
  }
}

// Create a new tool
async function handleCreateTool(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const {
    name,
    display_name,
    description,
    category,
    tool_type,
    function_schema,
    default_config
  } = req.body;

  // Validate required fields
  if (!name || !display_name || !category || !tool_type) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, display_name, category, tool_type' 
    });
  }

  // Validate tool_type
  const validToolTypes = ['function', 'code_interpreter', 'file_search'];
  if (!validToolTypes.includes(tool_type)) {
    return res.status(400).json({ 
      error: `Invalid tool_type. Must be one of: ${validToolTypes.join(', ')}` 
    });
  }

  // Validate function_schema for function tools
  if (tool_type === 'function' && !function_schema) {
    return res.status(400).json({ 
      error: 'function_schema is required for function tools' 
    });
  }

  try {
    const { data: tool, error } = await supabaseAdmin
      .from('tool_definitions')
      .insert([{
        name: name.toLowerCase().replace(/\s+/g, '_'),
        display_name,
        description,
        category,
        tool_type,
        function_schema: tool_type === 'function' ? function_schema : null,
        default_config: default_config || {},
        is_system: false,
        org_id: EMTEK_ORG_ID,
        created_by: userId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating tool:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Tool with this name already exists' });
      }
      
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ tool });

  } catch (error) {
    console.error('Error in handleCreateTool:', error);
    return res.status(500).json({ error: 'Failed to create tool' });
  }
}

// Update an existing tool
async function handleUpdateTool(req: NextApiRequest, res: NextApiResponse) {
  const { tool_id } = req.query;
  const {
    display_name,
    description,
    category,
    function_schema,
    default_config,
    is_active
  } = req.body;

  if (!tool_id) {
    return res.status(400).json({ error: 'tool_id is required' });
  }

  try {
    // Check if tool exists and is not system tool
    const { data: existingTool, error: fetchError } = await supabaseAdmin
      .from('tool_definitions')
      .select('is_system')
      .eq('id', tool_id)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (fetchError || !existingTool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    if (existingTool.is_system) {
      return res.status(403).json({ error: 'Cannot modify system tools' });
    }

    const updateData: any = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (function_schema !== undefined) updateData.function_schema = function_schema;
    if (default_config !== undefined) updateData.default_config = default_config;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: tool, error } = await supabaseAdmin
      .from('tool_definitions')
      .update(updateData)
      .eq('id', tool_id)
      .eq('org_id', EMTEK_ORG_ID)
      .select()
      .single();

    if (error) {
      console.error('Error updating tool:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ tool });

  } catch (error) {
    console.error('Error in handleUpdateTool:', error);
    return res.status(500).json({ error: 'Failed to update tool' });
  }
}

// Delete a tool
async function handleDeleteTool(req: NextApiRequest, res: NextApiResponse) {
  const { tool_id } = req.query;

  if (!tool_id) {
    return res.status(400).json({ error: 'tool_id is required' });
  }

  try {
    // Check if tool exists and is not system tool
    const { data: existingTool, error: fetchError } = await supabaseAdmin
      .from('tool_definitions')
      .select('is_system, name')
      .eq('id', tool_id)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (fetchError || !existingTool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    if (existingTool.is_system) {
      return res.status(403).json({ error: 'Cannot delete system tools' });
    }

    const { error } = await supabaseAdmin
      .from('tool_definitions')
      .delete()
      .eq('id', tool_id)
      .eq('org_id', EMTEK_ORG_ID);

    if (error) {
      console.error('Error deleting tool:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      message: `Tool '${existingTool.name}' deleted successfully` 
    });

  } catch (error) {
    console.error('Error in handleDeleteTool:', error);
    return res.status(500).json({ error: 'Failed to delete tool' });
  }
}
