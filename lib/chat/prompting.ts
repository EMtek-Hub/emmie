// lib/chat/prompting.ts - System message composition & model selection
import { selectModel, selectReasoningEffort, detectImageGenerationRequest } from '../ai';
import type { ResponseModel, ReasoningEffort } from '../ai';
import { composeSystemMessageFromProfile, getDefaultSystemMessage } from '../profiles';
import type { AgentProfile } from '../profiles';

export interface ModelSelectionContext {
  userContent: string;
  hasImages: boolean;
  messageLength: number;
  tools: any[];
}

export interface PromptingResult {
  model: ResponseModel;
  reasoning: ReasoningEffort;
  systemPrompt: string;
}

/**
 * Build system prompt based on agent or default
 */
export function buildSystemPrompt(params: {
  agent?: AgentProfile | null;
  user: {
    id: string;
    email?: string;
    name?: string;
  };
}): string {
  const { agent, user } = params;

  if (agent) {
    return composeSystemMessageFromProfile(agent, {
      userContext: {
        name: user.name,
        email: user.email,
        department: undefined,
      },
    });
  }

  return getDefaultSystemMessage('hybrid');
}

/**
 * Select appropriate model and reasoning based on context
 */
export function selectModelAndReasoning(context: ModelSelectionContext): {
  model: ResponseModel;
  reasoning: ReasoningEffort;
} {
  const { userContent, hasImages, messageLength, tools } = context;

  // Determine task complexity
  const isComplexTask = /\b(code|debug|analy[sz]e|architecture|integration)\b/i.test(
    userContent
  );
  const isCodeTask = /\b(function|bug|script|stack trace|error)\b/i.test(userContent);

  // Select model
  const model = selectModel({
    hasImages,
    isComplexTask,
    isCodeTask,
    messageLength,
  });

  // Select reasoning effort
  let reasoning = selectReasoningEffort({
    isComplexTask,
    isCodeTask,
    messageLength,
  });

  // Adjust reasoning based on tools
  if (tools.some((tool) => tool.type === 'web_search_preview') && reasoning === 'minimal') {
    reasoning = 'low';
  }
  if (tools.some((tool) => tool.type === 'code_interpreter') && reasoning === 'low') {
    reasoning = 'medium';
  }
  // Image generation cannot use minimal reasoning
  if (tools.some((tool) => tool.type === 'image_generation') && reasoning === 'minimal') {
    reasoning = 'low';
  }

  return { model, reasoning };
}

/**
 * Check if request qualifies for fast-path image generation
 */
export function checkFastPathImageGeneration(params: {
  userContent: string;
  hasImages: boolean;
  messages: any[];
  agentMode?: string;
  allowedTools: string[];
}): boolean {
  const { userContent, hasImages, messages, agentMode, allowedTools } = params;

  const isImageRequest = detectImageGenerationRequest(userContent, messages.slice(-5));

  // Fast path conditions:
  // 1. Is an image generation request
  // 2. No user images attached
  // 3. Not a research/analysis question
  // 4. Not in tools-only mode
  // 5. Image generation is allowed
  const pureImageFastPath =
    isImageRequest &&
    !hasImages &&
    !/\b(search|explain|sources?|reference|why|how|analy[sz]e|compare|research|document|docs?)\b/i.test(
      userContent
    ) &&
    agentMode !== 'tools' &&
    allowedTools.includes('image_generation');

  return pureImageFastPath;
}
