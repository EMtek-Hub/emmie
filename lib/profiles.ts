// lib/profiles.ts - Assistant Profile Management for System Messages
import { supabaseAdmin } from './db';

/**
 * Agent execution modes
 */
export type AgentMode = 'prompt' | 'tools' | 'hybrid';

/**
 * Agent profile interface
 */
export interface AgentProfile {
  id: string;
  name: string;
  department: string;
  description?: string;
  system_prompt: string;
  background_instructions?: string;
  mode: AgentMode; // Execution mode
  allowed_tools: string[]; // Array of tool names this agent can use
  is_active: boolean;
  color?: string;
  icon?: string;
}

/**
 * Get agent profile by ID
 */
export async function getAgentProfile(
  agentId: string,
  orgId: string
): Promise<AgentProfile | null> {
  try {
    const { data: agent, error } = await supabaseAdmin
      .from('chat_agents')
      .select('*')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single();

    if (error || !agent) {
      console.error('Agent profile fetch error:', error);
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      department: agent.department,
      description: agent.description,
      system_prompt: agent.system_prompt,
      background_instructions: agent.background_instructions,
      mode: (agent.mode || 'hybrid') as AgentMode,
      allowed_tools: agent.allowed_tools || [],
      is_active: agent.is_active,
      color: agent.color,
      icon: agent.icon
    };
  } catch (error) {
    console.error('Error fetching agent profile:', error);
    return null;
  }
}

/**
 * Get mode-specific instructions
 */
export function getModeInstructions(mode: AgentMode): string {
  switch (mode) {
    case 'prompt':
      return `\n\n# MODE: PROMPT-ONLY
You are running in prompt-only mode. Do NOT call tools. Answer from your background knowledge and provided context only. Provide comprehensive, knowledgeable responses based on your training.`;
    
    case 'tools':
      return `\n\n# MODE: TOOLS
You are running in tools mode. Prefer calling tools for actions and data lookup. Use tools to:
- Access up-to-date information
- Perform actions (raise tickets, submit requests)
- Search knowledge bases and documentation
After calling tools, interpret and explain the results in a helpful way.`;
    
    case 'hybrid':
    default:
      return `\n\n# MODE: HYBRID
You are running in hybrid mode. Balance your background knowledge with tool usage:
- Use your knowledge for general questions and explanations
- Call tools when you need current data, to perform actions, or to search specific documentation
- Combine both approaches for comprehensive, helpful responses`;
  }
}

/**
 * Compose system message from agent profile
 */
export function composeSystemMessageFromProfile(
  profile: AgentProfile,
  additionalContext?: {
    userContext?: {
      name?: string;
      email?: string;
      department?: string;
    };
    projectContext?: string;
    conversationContext?: string;
  }
): string {
  let systemMessage = profile.system_prompt;

  // Add agent identity
  if (profile.name) {
    systemMessage = `You are ${profile.name}, an AI assistant specializing in ${profile.department}. ${systemMessage}`;
  }

  // Add mode-specific instructions
  systemMessage += getModeInstructions(profile.mode);

  // Add background instructions if available
  if (profile.background_instructions) {
    systemMessage += `\n\nBackground Context: ${profile.background_instructions}`;
  }

  // Add user context if available
  if (additionalContext?.userContext) {
    const { name, email, department } = additionalContext.userContext;
    let userInfo = [];
    if (name) userInfo.push(`Name: ${name}`);
    if (email) userInfo.push(`Email: ${email}`);
    if (department) userInfo.push(`Department: ${department}`);
    
    if (userInfo.length > 0) {
      systemMessage += `\n\nUser Information:\n${userInfo.join('\n')}`;
    }
  }

  // Add project context if available
  if (additionalContext?.projectContext) {
    systemMessage += `\n\nProject Context: ${additionalContext.projectContext}`;
  }

  // Add conversation context if available
  if (additionalContext?.conversationContext) {
    systemMessage += `\n\nConversation Context: ${additionalContext.conversationContext}`;
  }

  // Add standard EMtek guidelines
  systemMessage += `

# Core Guidelines
- Provide clear, step-by-step guidance for technical issues
- Use Australian English terminology and spelling
- Format responses with headings, bullet points, and code blocks for clarity
- Reference uploaded images and previous conversation context when relevant
- Prioritize safety and warn about risky operations
- Suggest alternatives for potentially harmful actions

# Available Tools
You have access to specialized tools for:
- **document_search**: Search EMtek's knowledge base for procedures and policies
- **vision_analysis**: Analyze uploaded screenshots and images for troubleshooting
- **project_knowledge**: Search project-specific documentation and chat history
- **search_tickets**: Find and track IT support tickets
- **image_generation**: Create diagrams, illustrations, and visual aids

Always briefly explain why you're using a tool before calling it, and integrate the results naturally into your response.`;

  return systemMessage;
}

/**
 * Get default system message when no agent is specified
 */
export function getDefaultSystemMessage(mode: AgentMode = 'hybrid'): string {
  const baseMessage = `You are Emmie, EMtek's intelligent AI assistant. You help EMtek staff with IT support, technical guidance, and general assistance.

You have access to EMtek's knowledge base and can help with company procedures, IT troubleshooting, and technical questions. Always provide clear, helpful guidance while prioritizing safety and security.`;

  const modeInstructions = getModeInstructions(mode);

  const guidelines = `

# Core Guidelines
- Provide clear, step-by-step guidance for technical issues
- Use Australian English terminology and spelling
- Format responses with headings, bullet points, and code blocks for clarity
- Reference uploaded images and previous conversation context when relevant
- Prioritize safety and warn about risky operations
- Suggest alternatives for potentially harmful actions

# Available Tools
You have access to specialized tools for:
- **document_search**: Search EMtek's knowledge base for procedures and policies
- **vision_analysis**: Analyze uploaded screenshots and images for troubleshooting
- **project_knowledge**: Search project-specific documentation and chat history
- **image_generation**: Create diagrams, illustrations, and visual aids
- **web_search**: Find up-to-date information from the web
- **code_interpreter**: Execute Python code for debugging and analysis
- **raise_ticket**: Create IT/HR support tickets
- **log_leave_request**: Submit leave requests (HR)
- **search_hr_policies**: Search HR policies and procedures

Always briefly explain why you're using a tool before calling it, and integrate the results naturally into your response.`;

  return baseMessage + modeInstructions + guidelines;
}

/**
 * Validate agent profile for Responses API compatibility
 */
export function validateProfileForResponses(profile: AgentProfile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!profile.system_prompt?.trim()) {
    errors.push('System prompt is required');
  }

  if (!profile.name?.trim()) {
    errors.push('Agent name is required');
  }

  // Check system prompt length (avoid token limits)
  if (profile.system_prompt && profile.system_prompt.length > 8000) {
    errors.push('System prompt is too long (max 8000 characters)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Determine if agent should use Responses API (always true now)
 */
export function shouldUseResponsesAPI(profile: AgentProfile): boolean {
  // All agents now use Responses API exclusively
  return true;
}

/**
 * Get conversation title from agent and user message
 */
export function generateConversationTitle(
  profile: AgentProfile,
  userMessage: string,
  maxLength: number = 50
): string {
  // Extract key terms from user message
  const userWords = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3);

  let title = '';
  
  if (userWords.length > 0) {
    title = `${profile.department}: ${userWords.join(' ')}`;
  } else {
    title = `${profile.department} Chat`;
  }

  // Truncate if too long
  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 3) + '...';
  }

  return title;
}
