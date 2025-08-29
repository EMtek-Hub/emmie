// scripts/diagnose-agent-endpoints.js
// Diagnostic script to verify agent endpoint usage (OpenAI Assistant vs Emmie)

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Emoji helpers
const icons = {
  success: '✅',
  warning: '⚠️ ',
  error: '❌',
  info: 'ℹ️ ',
  search: '🔍',
  chart: '📊',
  trends: '📈',
  light: '💡',
  robot: '🤖',
  gear: '⚙️ '
};

class AgentEndpointDiagnostic {
  constructor() {
    this.supabase = null;
    this.openai = null;
    this.issues = [];
    this.recommendations = [];
    this.stats = {
      totalAgents: 0,
      openaiAgents: 0,
      emmieAgents: 0,
      invalidConfigs: 0,
      recentMessages: {
        openai: 0,
        emmie: 0,
        total: 0
      }
    };
  }

  // Initialize connections
  async initialize() {
    try {
      console.log(`${icons.info}${colors.cyan}Checking environment configuration...${colors.reset}`);
      
      // Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;

      console.log(`  Supabase URL: ${supabaseUrl ? (supabaseUrl.includes('your-project-url') ? '❌ Placeholder value' : '✅ Set') : '❌ Missing'}`);
      console.log(`  Supabase Key: ${supabaseKey ? (supabaseKey.includes('your-service-role-key') ? '❌ Placeholder value' : '✅ Set') : '❌ Missing'}`);
      console.log(`  OpenAI Key: ${openaiKey ? (openaiKey.includes('your-openai-api-key') ? '❌ Placeholder value' : '✅ Set') : '❌ Missing'}`);

      // Initialize Supabase
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
      }

      if (supabaseUrl.includes('your-project-url') || supabaseKey.includes('your-service-role-key')) {
        throw new Error('Supabase environment variables contain placeholder values. Please update your .env file with actual values.');
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);

      // Test Supabase connection
      const { error: testError } = await this.supabase.from('chat_agents').select('count').limit(1);
      if (testError) {
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }

      // Initialize OpenAI (optional for assistant validation)
      if (openaiKey && !openaiKey.includes('your-openai-api-key')) {
        this.openai = new OpenAI({ apiKey: openaiKey });
        console.log(`${icons.success}${colors.green}OpenAI client initialized for assistant validation${colors.reset}`);
      } else {
        console.log(`${icons.warning}${colors.yellow}OpenAI API key not configured - skipping assistant validation${colors.reset}`);
      }

      console.log(`${icons.success}${colors.green}Connections initialized successfully${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${icons.error}${colors.red}Failed to initialize: ${error.message}${colors.reset}`);
      
      if (error.message.includes('placeholder')) {
        console.log(`\n${icons.info}${colors.cyan}To fix this:${colors.reset}`);
        console.log(`  1. Update your .env file with actual Supabase credentials`);
        console.log(`  2. Get your Supabase URL and service role key from: https://app.supabase.com/project/YOUR_PROJECT/settings/api`);
        console.log(`  3. Update NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY`);
      }
      
      return false;
    }
  }

  // Validate assistant ID format
  isValidAssistantId(id) {
    return id && typeof id === 'string' && id.trim().startsWith('asst_') && id.trim().length > 10;
  }

  // Check if assistant exists in OpenAI (requires API key)
  async validateAssistantExists(assistantId) {
    if (!this.openai) return { exists: null, error: 'No OpenAI client' };

    try {
      await this.openai.beta.assistants.retrieve(assistantId);
      return { exists: true, error: null };
    } catch (error) {
      if (error.status === 404) {
        return { exists: false, error: 'Assistant not found' };
      }
      return { exists: null, error: error.message };
    }
  }

  // Audit all agent configurations
  async auditAgentConfigurations() {
    console.log(`\n${icons.gear}${colors.cyan}Auditing agent configurations...${colors.reset}`);

    try {
      const { data: agents, error } = await this.supabase
        .from('chat_agents')
        .select('*')
        .order('name');

      if (error) throw error;

      this.stats.totalAgents = agents.length;
      const results = [];

      for (const agent of agents) {
        const result = {
          id: agent.id,
          name: agent.name,
          department: agent.department,
          mode: agent.agent_mode || 'emmie',
          assistantId: agent.openai_assistant_id,
          isActive: agent.is_active,
          updatedAt: agent.updated_at,
          issues: [],
          status: 'unknown'
        };

        // Count by mode
        if (result.mode === 'openai_assistant') {
          this.stats.openaiAgents++;
        } else {
          this.stats.emmieAgents++;
        }

        // Validate configuration
        if (result.mode === 'openai_assistant') {
          if (!result.assistantId) {
            result.issues.push('Missing OpenAI Assistant ID');
            result.status = 'error';
            this.stats.invalidConfigs++;
          } else if (!this.isValidAssistantId(result.assistantId)) {
            result.issues.push('Invalid Assistant ID format (must start with "asst_")');
            result.status = 'error';
            this.stats.invalidConfigs++;
          } else {
            // Validate with OpenAI API if available
            if (this.openai) {
              const validation = await this.validateAssistantExists(result.assistantId);
              if (validation.exists === false) {
                result.issues.push('Assistant ID not found in OpenAI');
                result.status = 'error';
                this.stats.invalidConfigs++;
              } else if (validation.exists === true) {
                result.status = 'success';
              } else {
                result.issues.push(`Could not validate: ${validation.error}`);
                result.status = 'warning';
              }
            } else {
              result.status = 'success';
            }
          }
        } else {
          // Emmie mode
          if (result.assistantId) {
            result.issues.push('Unnecessary Assistant ID for Emmie mode');
            result.status = 'warning';
          } else {
            result.status = 'success';
          }
        }

        if (!result.isActive) {
          result.issues.push('Agent is inactive');
          if (result.status === 'success') result.status = 'warning';
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(`${icons.error}${colors.red}Failed to audit agents: ${error.message}${colors.reset}`);
      return [];
    }
  }

  // Analyze recent message usage
  async analyzeRecentUsage() {
    console.log(`${icons.search}${colors.cyan}Analyzing recent message usage...${colors.reset}`);

    try {
      // Get recent messages (last 500)
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('model, created_at, chat_id')
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      this.stats.recentMessages.total = messages.length;

      const usageByModel = {};
      const usageByDate = {};

      for (const message of messages) {
        const model = message.model || 'unknown';
        const date = new Date(message.created_at).toISOString().split('T')[0];

        // Count by model
        usageByModel[model] = (usageByModel[model] || 0) + 1;

        // Count by date
        usageByDate[date] = (usageByDate[date] || 0) + 1;

        // Categorize as OpenAI Assistant or Emmie
        if (model.startsWith('openai-assistant:')) {
          this.stats.recentMessages.openai++;
        } else if (model.startsWith('gpt-') || model === 'unknown') {
          this.stats.recentMessages.emmie++;
        }
      }

      return {
        byModel: usageByModel,
        byDate: usageByDate,
        timeline: Object.entries(usageByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-7) // Last 7 days
      };
    } catch (error) {
      console.error(`${icons.error}${colors.red}Failed to analyze usage: ${error.message}${colors.reset}`);
      return { byModel: {}, byDate: {}, timeline: [] };
    }
  }

  // Generate recommendations
  generateRecommendations(agents, usage) {
    this.recommendations = [];

    // Check for configuration issues
    const brokenAgents = agents.filter(a => a.status === 'error');
    if (brokenAgents.length > 0) {
      this.recommendations.push({
        type: 'error',
        title: 'Fix agent configurations',
        description: `${brokenAgents.length} agent(s) have configuration issues that prevent proper operation`,
        action: 'Update agent configurations in admin panel'
      });
    }

    // Check for inactive assistants with IDs
    const inactiveWithIds = agents.filter(a => !a.isActive && a.assistantId);
    if (inactiveWithIds.length > 0) {
      this.recommendations.push({
        type: 'warning',
        title: 'Clean up inactive agents',
        description: `${inactiveWithIds.length} inactive agent(s) still have OpenAI Assistant IDs`,
        action: 'Consider removing assistant IDs from inactive agents'
      });
    }

    // Check usage patterns
    if (this.stats.recentMessages.total > 0) {
      const openaiPercentage = (this.stats.recentMessages.openai / this.stats.recentMessages.total) * 100;
      if (openaiPercentage < 10 && this.stats.openaiAgents > 0) {
        this.recommendations.push({
          type: 'info',
          title: 'Low OpenAI Assistant usage',
          description: `Only ${openaiPercentage.toFixed(1)}% of recent messages used OpenAI Assistants`,
          action: 'Verify agents are properly configured and being used'
        });
      }
    }

    // Check for orphaned configurations
    const emmieWithIds = agents.filter(a => a.mode === 'emmie' && a.assistantId);
    if (emmieWithIds.length > 0) {
      this.recommendations.push({
        type: 'warning',
        title: 'Clean up configuration',
        description: `${emmieWithIds.length} Emmie agent(s) have unnecessary Assistant IDs`,
        action: 'Remove assistant IDs from Emmie mode agents'
      });
    }
  }

  // Print detailed report
  printReport(agents, usage) {
    console.log(`\n${icons.search}${colors.bright}${colors.cyan} AGENT ENDPOINT DIAGNOSTIC REPORT ${colors.reset}`);
    console.log(`${'='.repeat(50)}\n`);

    // Summary statistics
    console.log(`${icons.chart}${colors.bright} SUMMARY STATISTICS:${colors.reset}`);
    console.log(`  Total Agents: ${this.stats.totalAgents}`);
    console.log(`  OpenAI Assistant Mode: ${this.stats.openaiAgents}`);
    console.log(`  Emmie Mode: ${this.stats.emmieAgents}`);
    console.log(`  Configuration Issues: ${this.stats.invalidConfigs}`);
    console.log();

    // Agent configurations
    console.log(`${icons.robot}${colors.bright} AGENT CONFIGURATIONS:${colors.reset}`);
    for (const agent of agents) {
      const statusIcon = agent.status === 'success' ? icons.success : 
                        agent.status === 'warning' ? icons.warning : icons.error;
      const statusColor = agent.status === 'success' ? colors.green : 
                         agent.status === 'warning' ? colors.yellow : colors.red;

      console.log(`  ${statusIcon}${statusColor}${agent.name}${colors.reset} (${agent.department})`);
      console.log(`    Mode: ${agent.mode === 'openai_assistant' ? 'OpenAI Assistant' : 'Emmie'}`);
      
      if (agent.assistantId) {
        console.log(`    Assistant ID: ${agent.assistantId}`);
      }
      
      console.log(`    Active: ${agent.isActive ? 'Yes' : 'No'}`);
      
      if (agent.issues.length > 0) {
        for (const issue of agent.issues) {
          console.log(`    ${colors.red}Issue: ${issue}${colors.reset}`);
        }
      }
      console.log();
    }

    // Recent usage
    if (this.stats.recentMessages.total > 0) {
      console.log(`${icons.trends}${colors.bright} RECENT USAGE (Last ${this.stats.recentMessages.total} messages):${colors.reset}`);
      console.log(`  OpenAI Assistant endpoints: ${this.stats.recentMessages.openai} messages`);
      console.log(`  Emmie endpoints: ${this.stats.recentMessages.emmie} messages`);
      
      if (Object.keys(usage.byModel).length > 0) {
        console.log(`\n  ${colors.bright}By Model:${colors.reset}`);
        const sortedModels = Object.entries(usage.byModel)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10);
        
        for (const [model, count] of sortedModels) {
          const percentage = ((count / this.stats.recentMessages.total) * 100).toFixed(1);
          const isOpenAI = model.startsWith('openai-assistant:');
          const color = isOpenAI ? colors.blue : colors.green;
          console.log(`    ${color}${model}${colors.reset}: ${count} (${percentage}%)`);
        }
      }

      if (usage.timeline.length > 0) {
        console.log(`\n  ${colors.bright}Last 7 Days:${colors.reset}`);
        for (const [date, count] of usage.timeline) {
          console.log(`    ${date}: ${count} messages`);
        }
      }
      console.log();
    }

    // Issues and recommendations
    if (this.recommendations.length > 0) {
      console.log(`${icons.light}${colors.bright} RECOMMENDATIONS:${colors.reset}`);
      for (const [index, rec] of this.recommendations.entries()) {
        const typeIcon = rec.type === 'error' ? icons.error : 
                        rec.type === 'warning' ? icons.warning : icons.info;
        const typeColor = rec.type === 'error' ? colors.red : 
                         rec.type === 'warning' ? colors.yellow : colors.blue;

        console.log(`  ${index + 1}. ${typeIcon}${typeColor}${rec.title}${colors.reset}`);
        console.log(`     ${rec.description}`);
        console.log(`     ${colors.bright}Action:${colors.reset} ${rec.action}\n`);
      }
    } else {
      console.log(`${icons.success}${colors.green} All configurations look good!${colors.reset}\n`);
    }
  }

  // Export results to JSON
  exportResults(agents, usage) {
    const results = {
      timestamp: new Date().toISOString(),
      statistics: this.stats,
      agents: agents,
      usage: usage,
      recommendations: this.recommendations
    };

    const filename = `agent-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
    const fs = require('fs');
    
    try {
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      console.log(`${icons.success}${colors.green}Results exported to ${filename}${colors.reset}`);
    } catch (error) {
      console.error(`${icons.error}${colors.red}Failed to export results: ${error.message}${colors.reset}`);
    }
  }

  // Main diagnostic run
  async run(options = {}) {
    const { export: shouldExport = false, validate = true } = options;

    console.log(`${icons.search}${colors.bright}${colors.magenta}Starting Agent Endpoint Diagnostic...${colors.reset}\n`);

    if (!(await this.initialize())) {
      process.exit(1);
    }

    const agents = await this.auditAgentConfigurations();
    const usage = await this.analyzeRecentUsage();

    this.generateRecommendations(agents, usage);
    this.printReport(agents, usage);

    if (shouldExport) {
      this.exportResults(agents, usage);
    }

    // Exit with error code if issues found
    const hasErrors = agents.some(a => a.status === 'error');
    if (hasErrors) {
      console.log(`${icons.error}${colors.red}Diagnostic completed with errors. Please review the recommendations above.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${icons.success}${colors.green}Diagnostic completed successfully!${colors.reset}`);
      process.exit(0);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    export: args.includes('--export'),
    validate: !args.includes('--no-validate')
  };

  if (args.includes('--help')) {
    console.log(`
${colors.bright}Agent Endpoint Diagnostic Tool${colors.reset}

Usage: node scripts/diagnose-agent-endpoints.js [options]

Options:
  --export      Export results to JSON file
  --no-validate Skip OpenAI Assistant validation
  --help        Show this help message

This tool checks:
  ${icons.gear} Agent configurations (mode, assistant IDs)
  ${icons.search} Recent message usage patterns
  ${icons.warning} Configuration issues and validation errors
  ${icons.light} Recommendations for improvements
`);
    process.exit(0);
  }

  const diagnostic = new AgentEndpointDiagnostic();
  diagnostic.run(options).catch(error => {
    console.error(`${icons.error}${colors.red}Diagnostic failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = AgentEndpointDiagnostic;
