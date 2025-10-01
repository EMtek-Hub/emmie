// lib/ai/policies.ts - Centralized effort ↔ tools compatibility policy
// Handles OpenAI's undocumented constraints on reasoning.effort + built-in tools

export type Effort = 'minimal' | 'low' | 'medium' | 'high';
export type BuiltInTool = 'web_search' | 'image_generation' | 'file_search' | 'code_interpreter';

/**
 * Compatibility matrix based on OpenAI cookbook guidance:
 * - minimal: No hosted tools (for speed/cost optimization)
 * - low+: All built-in tools supported
 */
const COMPATIBILITY: Record<Effort, BuiltInTool[]> = {
  minimal: [], // Safe default: assume no hosted tools when minimal
  low: ['web_search', 'image_generation', 'file_search', 'code_interpreter'],
  medium: ['web_search', 'image_generation', 'file_search', 'code_interpreter'],
  high: ['web_search', 'image_generation', 'file_search', 'code_interpreter'],
};

/**
 * Policy function that validates and coerces effort + tools combinations
 * to ensure compatibility with OpenAI's Responses API constraints
 */
export function coerceEffortAndTools(opts: {
  requestedEffort: Effort | undefined;      // from UI or agent profile
  requestedTools: BuiltInTool[];            // from route/business logic
  model: string;                            // for model-specific guards if needed
  strict?: boolean;                         // if true, throw 400 instead of auto-bump
}) {
  const effort = opts.requestedEffort ?? 'low'; // sensible default
  const allowed = new Set(COMPATIBILITY[effort]);
  const needsTools = opts.requestedTools.length > 0;

  if (!needsTools) {
    return { 
      effort, 
      tools: [] as BuiltInTool[], 
      coerced: false 
    };
  }

  const allAllowed = opts.requestedTools.every(t => allowed.has(t));
  if (allAllowed) {
    return { 
      effort, 
      tools: opts.requestedTools, 
      coerced: false 
    };
  }

  if (opts.strict) {
    const blocked = opts.requestedTools.filter(t => !allowed.has(t));
    const msg = `Requested tools [${blocked.join(', ')}] are not allowed with reasoning.effort='${effort}'.`;
    const hint = `Use 'low' (or higher) effort or remove those tools.`;
    const error = new Error(`${msg} ${hint}`) as any;
    error.status = 400;
    throw error;
  }

  // Auto-bump to lowest effort that supports the requested tools
  const bumpedEffort: Effort = 'low';
  return { 
    effort: bumpedEffort, 
    tools: opts.requestedTools, 
    coerced: true 
  };
}

/**
 * Helper to check if tools are compatible with effort level
 */
export function areToolsCompatible(effort: Effort, tools: BuiltInTool[]): boolean {
  const allowed = new Set(COMPATIBILITY[effort]);
  return tools.every(tool => allowed.has(tool));
}

/**
 * Get minimum effort level required for a set of tools
 */
export function getMinimumEffortForTools(tools: BuiltInTool[]): Effort {
  if (tools.length === 0) return 'minimal';
  
  // Find the lowest effort level that supports all tools
  for (const [effort, supportedTools] of Object.entries(COMPATIBILITY)) {
    const supported = new Set(supportedTools);
    if (tools.every(tool => supported.has(tool))) {
      return effort as Effort;
    }
  }
  
  return 'high'; // fallback
}

/**
 * Convert tool names to built-in tool types for validation
 */
export function normalizeToolName(toolName: string): BuiltInTool | null {
  const mapping: Record<string, BuiltInTool> = {
    'image_generation': 'image_generation',
    'web_search': 'web_search',
    'file_search': 'file_search',
    'code_interpreter': 'code_interpreter',
    // Aliases
    'search': 'web_search',
    'image': 'image_generation',
    'files': 'file_search',
    'code': 'code_interpreter'
  };
  
  return mapping[toolName.toLowerCase()] || null;
}
