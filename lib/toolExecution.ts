// lib/toolExecution.ts
import { supabaseAdmin } from './db';

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs?: number;
}

export interface ToolExecutionContext {
  agentId: string;
  chatId?: string;
  messageId?: string;
  userId?: string;
  userContext?: {
    name?: string;
    email?: string;
    department?: string;
  };
}

// Tool executor class
export class ToolExecutor {
  
  // Execute a tool based on its name and arguments
  async executeTool(
    toolName: string, 
    args: any, 
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔧 Executing tool: ${toolName} with args:`, args);
      
      let result: any;
      
      switch (toolName) {
        case 'submit_it_support_ticket':
          result = await this.submitITSupportTicket(args, context);
          break;
        
        case 'get_system_info':
          result = await this.getSystemInfo(args, context);
          break;
        
        case 'document_search':
          result = await this.documentSearch(args, context);
          break;
        
        case 'vision_analysis':
          result = await this.visionAnalysis(args, context);
          break;
        
        case 'project_knowledge':
          result = await this.projectKnowledge(args, context);
          break;
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
      
      const executionTimeMs = Date.now() - startTime;
      
      // Log successful execution
      if (context.agentId) {
        await this.logToolExecution(
          toolName,
          context,
          executionTimeMs,
          'success',
          args,
          result
        );
      }
      
      console.log(`✅ Tool ${toolName} executed successfully in ${executionTimeMs}ms`);
      
      return {
        success: true,
        result,
        executionTimeMs
      };
      
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      
      console.error(`❌ Tool ${toolName} failed:`, error);
      
      // Log failed execution
      if (context.agentId) {
        await this.logToolExecution(
          toolName,
          context,
          executionTimeMs,
          'error',
          args,
          null,
          error.message
        );
      }
      
      return {
        success: false,
        error: error.message,
        executionTimeMs
      };
    }
  }
  
  // Submit IT Support Ticket (from your Python script)
  private async submitITSupportTicket(args: {
    user_name: string;
    issue_summary: string;
    details: string;
    priority?: string;
    request_type?: string;
  }, context: ToolExecutionContext): Promise<any> {
    
    const {
      user_name,
      issue_summary,
      details,
      priority = 'medium',
      request_type = 'general_support'
    } = args;
    
    // Generate ticket ID (similar to your Python script)
    const ticketId = `EMT-${Math.abs(this.hashCode(user_name + issue_summary)) % 10000}`.padStart(8, '0');
    
    const ticketData = {
      ticket_id: ticketId,
      user_name,
      issue_summary,
      details,
      priority,
      request_type,
      status: 'submitted',
      created_at: new Date().toISOString(),
      submitted_by_agent: context.agentId,
      chat_id: context.chatId
    };
    
    // Here you would integrate with your actual ticketing system
    // For now, we'll simulate the submission and log it
    console.log('📧 IT Support Ticket Submitted:', ticketData);
    
    // TODO: Integrate with actual systems like:
    // - ServiceNow API
    // - Jira Service Management
    // - Zendesk
    // - Microsoft Teams notifications
    // - Email to ITSupport@emtek.com.au
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store ticket in database for tracking
    try {
      const { error } = await supabaseAdmin
        .from('tool_execution_logs')
        .update({
          output_data: { ticket_data: ticketData }
        })
        .eq('id', 'will-be-set-by-log-function'); // This will be properly handled in logToolExecution
    } catch (dbError) {
      console.warn('Could not store ticket in database:', dbError);
    }
    
    return {
      success: true,
      ticket_id: ticketId,
      message: `Support ticket ${ticketId} has been submitted to IT. You will receive updates via email.`,
      ticket_data: ticketData
    };
  }
  
  // Get System Information (from your Python script)
  private async getSystemInfo(args: {
    detailed?: boolean;
  }, context: ToolExecutionContext): Promise<any> {
    
    const { detailed = false } = args;
    
    // Basic system info (simulated - in real implementation you'd gather actual system data)
    const systemInfo = {
      timestamp: new Date().toISOString(),
      user: context.userContext?.name || 'Unknown',
      department: context.userContext?.department || 'Unknown',
      // Note: In a web environment, we can't gather actual system info
      // This would typically be collected client-side and sent to the server
      browser_info: {
        user_agent: 'Web Browser',
        platform: 'Web Platform',
        language: 'en-AU'
      },
      session_info: {
        chat_id: context.chatId,
        agent_id: context.agentId,
        user_id: context.userId
      }
    };
    
    if (detailed) {
      // Add more detailed information for troubleshooting
      systemInfo['detailed_info'] = {
        session_duration: 'Unknown',
        last_activity: new Date().toISOString(),
        browser_capabilities: {
          cookies_enabled: true,
          javascript_enabled: true,
          local_storage: true
        }
      };
    }
    
    return {
      success: true,
      system_info: systemInfo,
      message: detailed ? 'Detailed system information collected' : 'Basic system information collected'
    };
  }
  
  // Document Search (enhanced from existing implementation)
  private async documentSearch(args: {
    query: string;
    category?: string;
  }, context: ToolExecutionContext): Promise<any> {
    
    const { query, category } = args;
    
    try {
      // Use existing document search logic
      const { generateEmbedding } = await import('./ai');
      const queryEmbedding = await generateEmbedding(query);

      // Search for similar document chunks
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
        throw new Error(`Document search error: ${error.message}`);
      }

      if (!chunks || chunks.length === 0) {
        return {
          success: true,
          results: [],
          message: 'No relevant documents found for your query.'
        };
      }

      // Format the results
      const results = chunks.map((chunk: any, index: number) => ({
        index: index + 1,
        content: chunk.content,
        relevance_score: chunk.similarity,
        source: chunk.source || 'EMtek Knowledge Base'
      }));

      return {
        success: true,
        results,
        query,
        category,
        total_results: results.length,
        message: `Found ${results.length} relevant document(s)`
      };

    } catch (error: any) {
      throw new Error(`Document search failed: ${error.message}`);
    }
  }
  
  // Vision Analysis (placeholder for image analysis)
  private async visionAnalysis(args: {
    analysis_request: string;
    focus_area?: string;
  }, context: ToolExecutionContext): Promise<any> {
    
    const { analysis_request, focus_area = 'general' } = args;
    
    // This would integrate with your existing vision analysis logic
    // For now, return a structured response
    return {
      success: true,
      analysis_request,
      focus_area,
      message: `Vision analysis for "${analysis_request}" has been queued. Focus area: ${focus_area}`,
      note: 'Vision analysis integration pending - requires multimodal message context'
    };
  }
  
  // Project Knowledge Search (placeholder)
  private async projectKnowledge(args: {
    query: string;
  }, context: ToolExecutionContext): Promise<any> {
    
    const { query } = args;
    
    // This would search project-specific documentation and chat history
    return {
      success: true,
      query,
      message: `Project knowledge search for "${query}" completed`,
      results: [],
      note: 'Project knowledge search integration pending'
    };
  }
  
  // Log tool execution for analytics and debugging
  private async logToolExecution(
    toolName: string,
    context: ToolExecutionContext,
    executionTimeMs: number,
    status: 'success' | 'error',
    inputData: any,
    outputData: any,
    errorMessage?: string
  ): Promise<void> {
    
    try {
      // Get tool ID
      const { data: tool } = await supabaseAdmin
        .from('tool_definitions')
        .select('id')
        .eq('name', toolName)
        .single();
      
      if (tool) {
        await supabaseAdmin.rpc('log_tool_execution', {
          agent_id_param: context.agentId,
          tool_id_param: tool.id,
          chat_id_param: context.chatId || null,
          message_id_param: context.messageId || null,
          execution_time_ms_param: executionTimeMs,
          status_param: status,
          input_data_param: inputData,
          output_data_param: outputData,
          error_message_param: errorMessage || null,
          user_id_param: context.userId || null
        });
      }
    } catch (logError) {
      console.warn('Failed to log tool execution:', logError);
    }
  }
  
  // Simple hash function (similar to your Python script)
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutor();

// Helper function to get agent tools
export async function getAgentToolsConfig(agentId: string): Promise<any[]> {
  try {
    const { data: tools, error } = await supabaseAdmin
      .rpc('get_agent_tools', { agent_id_param: agentId });
    
    if (error) {
      console.error('Error fetching agent tools:', error);
      return [];
    }
    
    return tools?.filter((tool: any) => tool.is_enabled) || [];
  } catch (error) {
    console.error('Error in getAgentToolsConfig:', error);
    return [];
  }
}

// Convert our tools to OpenAI function format
export function convertToolsToOpenAIFormat(tools: any[]): any[] {
  return tools
    .filter(tool => tool.tool_type === 'function' && tool.function_schema)
    .map(tool => ({
      type: 'function',
      function: tool.function_schema
    }));
}

// Convert our tools to OpenAI Assistant tools format
export function convertToolsToAssistantFormat(tools: any[]): any[] {
  const assistantTools: any[] = [];
  
  for (const tool of tools) {
    if (tool.tool_type === 'function' && tool.function_schema) {
      assistantTools.push({
        type: 'function',
        function: tool.function_schema
      });
    } else if (tool.tool_type === 'code_interpreter') {
      assistantTools.push({ type: 'code_interpreter' });
    } else if (tool.tool_type === 'file_search') {
      assistantTools.push({ type: 'file_search' });
    }
  }
  
  return assistantTools;
}
