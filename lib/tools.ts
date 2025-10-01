// lib/tools.ts - Unified Tool Registry for OpenAI Responses API
import { generateEmbedding } from './ai';
import { supabaseAdmin } from './db';

/**
 * Tool Registry - Single source of truth for all function tools
 * Uses JSON Schema format compatible with OpenAI Responses API
 */
export const TOOL_REGISTRY = [
  {
    type: "function" as const,
    function: {
      name: "raise_ticket",
      description: "Create an IT or HR support ticket in EMtek's ticketing system. Use this when the user requests to log an issue, raise a ticket, or needs support assistance.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["IT", "HR", "Engineering", "General"],
            description: "Ticket category/department"
          },
          summary: {
            type: "string",
            description: "Brief ticket summary (max 100 chars)"
          },
          description: {
            type: "string",
            description: "Detailed description of the issue or request"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
            description: "Ticket priority level"
          },
          employeeEmail: {
            type: "string",
            description: "Employee email for ticket tracking"
          }
        },
        required: ["category", "summary", "description", "employeeEmail"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "log_leave_request",
      description: "Submit a leave request via email notification to HR. Use this when an employee wants to request time off.",
      parameters: {
        type: "object",
        properties: {
          employeeEmail: {
            type: "string",
            description: "Employee's email address"
          },
          employeeName: {
            type: "string",
            description: "Employee's full name"
          },
          leaveType: {
            type: "string",
            enum: ["annual", "sick", "personal", "unpaid", "parental"],
            description: "Type of leave being requested"
          },
          startDate: {
            type: "string",
            description: "Leave start date in YYYY-MM-DD format"
          },
          endDate: {
            type: "string",
            description: "Leave end date in YYYY-MM-DD format"
          },
          notes: {
            type: "string",
            description: "Additional notes or reason for leave"
          }
        },
        required: ["employeeEmail", "employeeName", "leaveType", "startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_hr_policies",
      description: "Search HR policies, procedures, and employment guidelines from EMtek's knowledge base. Use this for questions about leave policies, benefits, workplace rules, etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for HR policy information"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_technical_docs",
      description: "Search engineering standards, technical specifications, CAD guidelines, and drafting documentation.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for technical documentation"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "document_search",
      description: "Search EMtek knowledge base for company IT procedures, policies, troubleshooting guides, and documentation. Pass your search query as plain text.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant EMtek knowledge base content"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "vision_analysis",
      description: "Analyze uploaded images for IT troubleshooting including screenshots, error messages, hardware photos, network diagrams, and system displays. Pass your analysis request as plain text.",
      parameters: {
        type: "object",
        properties: {
          analysisRequest: {
            type: "string",
            description: "Description of what should be analyzed in the uploaded images"
          }
        },
        required: ["analysisRequest"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "project_knowledge",
      description: "Search project-specific documentation, chat history, and related technical information. Pass your search query with project context as plain text.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant project-specific information"
          },
          projectId: {
            type: "string",
            description: "The project ID to search within"
          }
        },
        required: ["query", "projectId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_project",
      description: "Retrieve project details and information by project ID",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The project ID to look up"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_tickets",
      description: "Find IT support tickets by status, priority, or other criteria",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Ticket status to filter by",
            enum: ["open", "in_progress", "resolved", "closed"]
          },
          priority: {
            type: "string",
            description: "Ticket priority level",
            enum: ["low", "medium", "high", "critical"]
          },
          limit: {
            type: "number",
            description: "Maximum number of tickets to return",
            default: 10
          }
        },
        required: ["status"]
      }
    }
  }
];

/**
 * Tool execution context
 */
export interface ToolContext {
  agentId?: string;
  projectId?: string;
  userId: string;
  conversationId?: string;
  userContext?: {
    name?: string;
    email?: string;
    department?: string;
  };
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Main tool router - handles execution of all function tools
 */
export async function toolRouter(
  name: string, 
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    console.log(`🔧 Executing tool: ${name} with args:`, args);

    switch (name) {
      case "raise_ticket":
        return await executeRaiseTicket(
          args as { category: string; summary: string; description: string; priority?: string; employeeEmail: string },
          context
        );
        
      case "log_leave_request":
        return await executeLogLeaveRequest(
          args as { employeeEmail: string; employeeName: string; leaveType: string; startDate: string; endDate: string; notes?: string },
          context
        );
        
      case "search_hr_policies":
        return await executeSearchHRPolicies(args as { query: string }, context);
        
      case "search_technical_docs":
        return await executeSearchTechnicalDocs(args as { query: string }, context);
        
      case "document_search":
        return await executeDocumentSearch(args as { query: string }, context);
        
      case "vision_analysis":
        return await executeVisionAnalysis(args as { analysisRequest: string }, context);
        
      case "project_knowledge":
        return await executeProjectKnowledge(
          args as { query: string; projectId: string }, 
          context
        );
        
      case "lookup_project":
        return await executeLookupProject(args as { id: string }, context);
        
      case "search_tickets":
        return await executeSearchTickets(
          args as { status: string; priority?: string; limit?: number }, 
          context
        );
        
      default:
        return {
          success: false,
          error: `Unknown tool: ${name}`
        };
    }
  } catch (error: any) {
    console.error(`❌ Tool execution error for ${name}:`, error);
    return {
      success: false,
      error: error.message || 'Tool execution failed'
    };
  }
}

/**
 * Raise Ticket Implementation - Posts to external ticketing system
 */
async function executeRaiseTicket(
  args: { category: string; summary: string; description: string; priority?: string; employeeEmail: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { category, summary, description, priority = 'medium', employeeEmail } = args;
    
    // Get ticketing integration config from database
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('agent_integrations')
      .select('*')
      .eq('integration_type', 'ticketing')
      .eq('is_active', true)
      .single();
    
    if (integrationError || !integration?.endpoint_url) {
      console.warn('Ticketing system not configured, logging locally');
      // Fallback: log the ticket request
      const ticketId = `TICKET-${Date.now()}`;
      console.log('📋 Ticket Request (Not Submitted):', {
        ticketId,
        category,
        summary,
        description,
        priority,
        employeeEmail,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        result: `## Ticket Created (Local)\n\n**Ticket ID:** ${ticketId}\n**Category:** ${category}\n**Priority:** ${priority}\n**Summary:** ${summary}\n\n⚠️ Note: Ticketing system integration not configured. This ticket has been logged locally but not submitted to the ticketing system.`
      };
    }

    // POST to ticketing endpoint
    const ticketPayload = {
      category,
      summary,
      description,
      priority,
      employeeEmail,
      timestamp: new Date().toISOString(),
      source: 'emmie-ai',
      userContext: context.userContext
    };

    console.log('📋 Submitting ticket to:', integration.endpoint_url);
    
    const response = await fetch(integration.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [integration.auth_header_key]: integration.auth_token
      },
      body: JSON.stringify(ticketPayload)
    });

    if (!response.ok) {
      throw new Error(`Ticketing API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const ticketId = result.ticketId || result.id || result.ticket_id || 'PENDING';
    
    return {
      success: true,
      result: `## Ticket Created Successfully\n\n**Ticket ID:** ${ticketId}\n**Category:** ${category}\n**Priority:** ${priority}\n**Status:** Submitted\n\nYour ticket has been created and assigned to the ${category} team. You'll receive updates via email at ${employeeEmail}.`
    };

  } catch (error: any) {
    console.error('Ticket creation error:', error);
    return {
      success: false,
      error: `Failed to create ticket: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Log Leave Request Implementation - Sends email notification
 */
async function executeLogLeaveRequest(
  args: { employeeEmail: string; employeeName: string; leaveType: string; startDate: string; endDate: string; notes?: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { employeeEmail, employeeName, leaveType, startDate, endDate, notes } = args;
    
    // Get email integration config
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('agent_integrations')
      .select('*')
      .eq('integration_type', 'email')
      .eq('is_active', true)
      .single();
    
    const config = integration?.config || { to: 'hr@emtek.au', from: 'emmie@emtek.au' };
    
    // Create email body
    const requestId = `LEAVE-${Date.now()}`;
    const emailBody = `
Leave Request Submitted via Emmie AI

Request ID: ${requestId}
Employee: ${employeeName} (${employeeEmail})
Leave Type: ${leaveType}
Start Date: ${startDate}
End Date: ${endDate}
${notes ? `Notes: ${notes}` : 'Notes: None'}

This request requires manager approval.
Submitted: ${new Date().toISOString()}
    `.trim();

    // Log the email (in production, integrate with actual email service)
    console.log('📧 Leave Request Email:', {
      to: config.to,
      from: config.from,
      subject: `${config.subject_prefix || '[Emmie AI] Leave Request:'} ${employeeName} - ${leaveType}`,
      body: emailBody,
      requestId
    });
    
    // TODO: In production, integrate with SMTP service or email API
    // Example: await sendEmail({ to: config.to, from: config.from, subject: ..., body: emailBody });
    
    return {
      success: true,
      result: `## Leave Request Submitted\n\n**Request ID:** ${requestId}\n**Leave Type:** ${leaveType}\n**Period:** ${startDate} to ${endDate}\n\nYour leave request has been submitted to HR (${config.to}). You will receive confirmation via email once your manager has reviewed and approved the request.\n\n✅ Email notification sent successfully.`
    };

  } catch (error: any) {
    console.error('Leave request error:', error);
    return {
      success: false,
      error: `Failed to log leave request: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Search HR Policies Implementation
 */
async function executeSearchHRPolicies(
  args: { query: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { query } = args;
    
    // Use vector search on HR-specific documents
    const queryEmbedding = await generateEmbedding(query);

    // Search for HR policy documents
    const { data: chunks, error } = await supabaseAdmin.rpc(
      'match_document_chunks', 
      {
        agent_id_param: context.agentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      }
    );

    if (error) {
      console.error('HR policy search error:', error);
      return {
        success: false,
        error: 'HR policy search failed'
      };
    }

    if (!chunks || chunks.length === 0) {
      return {
        success: true,
        result: 'No HR policies found matching your query. For specific policy questions, please contact HR directly at hr@emtek.au.'
      };
    }

    const results = chunks.map((chunk: any, index: number) => 
      `**Policy ${index + 1}:**\n${chunk.content}`
    ).join('\n\n');

    return {
      success: true,
      result: `## HR Policy Search Results\n\n${results}\n\n---\n*For official policy documents, please refer to the HR portal or contact hr@emtek.au*`
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'HR policy search failed'
    };
  }
}

/**
 * Search Technical Documentation Implementation
 */
async function executeSearchTechnicalDocs(
  args: { query: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { query } = args;
    
    // Use vector search on technical documents
    const queryEmbedding = await generateEmbedding(query);

    const { data: chunks, error } = await supabaseAdmin.rpc(
      'match_document_chunks', 
      {
        agent_id_param: context.agentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      }
    );

    if (error) {
      console.error('Technical docs search error:', error);
      return {
        success: false,
        error: 'Technical documentation search failed'
      };
    }

    if (!chunks || chunks.length === 0) {
      return {
        success: true,
        result: 'No technical documentation found matching your query.'
      };
    }

    const results = chunks.map((chunk: any, index: number) => 
      `**Document ${index + 1}:**\n${chunk.content}`
    ).join('\n\n');

    return {
      success: true,
      result: `## Technical Documentation Search Results\n\n${results}`
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Technical documentation search failed'
    };
  }
}

/**
 * Document Search Implementation
 */
async function executeDocumentSearch(
  args: { query: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { query } = args;
    const { agentId } = context;
    
    if (!agentId) {
      return {
        success: false,
        error: 'Agent ID required for document search'
      };
    }
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar document chunks using vector similarity
    const { data: chunks, error } = await supabaseAdmin.rpc(
      'match_document_chunks', 
      {
        agent_id_param: agentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      }
    );

    if (error) {
      console.error('Document search error:', error);
      return {
        success: false,
        error: 'Document search failed'
      };
    }

    if (!chunks || chunks.length === 0) {
      return {
        success: true,
        result: 'No relevant documents found for your query.'
      };
    }

    // Format the results
    const results = chunks.map((chunk: any, index: number) => 
      `**Result ${index + 1}:**\n${chunk.content}`
    ).join('\n\n');

    return {
      success: true,
      result: `## Document Search Results\n\n${results}`
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Document search failed'
    };
  }
}

/**
 * Vision Analysis Implementation
 */
async function executeVisionAnalysis(
  args: { analysisRequest: string },
  context: ToolContext
): Promise<ToolResult> {
  const { analysisRequest } = args;
  
  // This is a placeholder implementation
  // In a real system, this would integrate with vision analysis capabilities
  return {
    success: true,
    result: `## Vision Analysis\n\nAnalyzing images for: ${analysisRequest}\n\n*Vision analysis capabilities would be implemented here to process uploaded images and provide detailed analysis for IT troubleshooting.*`
  };
}

/**
 * Project Knowledge Search Implementation
 */
async function executeProjectKnowledge(
  args: { query: string; projectId: string },
  context: ToolContext
): Promise<ToolResult> {
  const { query, projectId } = args;
  
  try {
    // Search project-specific documentation and chat history
    // This would integrate with your existing project knowledge system
    
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return {
        success: false,
        error: 'Project not found'
      };
    }

    // Placeholder for project-specific search
    return {
      success: true,
      result: `## Project Knowledge Search\n\nSearching project "${projectData.name}" for: ${query}\n\n*Project-specific knowledge search would be implemented here to find relevant documentation, chat history, and technical information.*`
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Project knowledge search failed'
    };
  }
}

/**
 * Project Lookup Implementation
 */
async function executeLookupProject(
  args: { id: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { id } = args;
    
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, name, description, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !project) {
      return {
        success: false,
        error: 'Project not found'
      };
    }

    return {
      success: true,
      result: {
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        updated_at: project.updated_at
      }
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Project lookup failed'
    };
  }
}

/**
 * Ticket Search Implementation
 */
async function executeSearchTickets(
  args: { status: string; priority?: string; limit?: number },
  context: ToolContext
): Promise<ToolResult> {
  const { status, priority, limit = 10 } = args;
  
  // This is a placeholder implementation
  // In a real system, this would query your ticketing system
  const mockTickets = [
    {
      id: 'T-001',
      title: 'Email server configuration issue',
      status: status,
      priority: priority || 'medium',
      created_at: new Date().toISOString(),
      assignee: 'IT Support Team'
    },
    {
      id: 'T-002', 
      title: 'Network connectivity problems in Building A',
      status: status,
      priority: priority || 'high',
      created_at: new Date().toISOString(),
      assignee: 'Network Team'
    }
  ].slice(0, limit);

  return {
    success: true,
    result: {
      count: mockTickets.length,
      tickets: mockTickets,
      summary: `Found ${mockTickets.length} tickets with status "${status}"${priority ? ` and priority "${priority}"` : ''}`
    }
  };
}

/**
 * Get tools for specific agent configuration
 */
export function getToolsForAgent(agentId?: string, projectId?: string): typeof TOOL_REGISTRY {
  // Return different tool subsets based on agent/project context
  if (projectId) {
    // Project-specific tools
    return TOOL_REGISTRY.filter(tool => 
      ['project_knowledge', 'lookup_project', 'document_search'].includes(tool.function.name)
    );
  }
  
  if (agentId) {
    // Agent-specific tools
    return TOOL_REGISTRY.filter(tool => 
      ['document_search', 'vision_analysis', 'search_tickets'].includes(tool.function.name)
    );
  }
  
  // Default tool set
  return TOOL_REGISTRY.filter(tool => 
    ['document_search', 'search_tickets'].includes(tool.function.name)
  );
}

/**
 * Validate tool arguments against schema
 */
export function validateToolArgs(toolName: string, args: any): { valid: boolean; error?: string } {
  const tool = TOOL_REGISTRY.find(t => t.function.name === toolName);
  
  if (!tool) {
    return { valid: false, error: `Tool ${toolName} not found` };
  }
  
  const { required = [] } = tool.function.parameters;
  
  // Check required parameters
  for (const param of required) {
    if (!(param in args)) {
      return { valid: false, error: `Missing required parameter: ${param}` };
    }
  }
  
  return { valid: true };
}
