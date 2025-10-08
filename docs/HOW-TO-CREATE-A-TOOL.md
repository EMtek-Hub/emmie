# How to Create a Custom Tool - Step-by-Step Guide

This guide walks you through creating a new custom tool for your AI assistants.

## Overview

Tools in Emmie allow AI assistants to perform actions beyond just text generation, such as:
- Searching databases
- Making API calls
- Processing data
- Interacting with external systems
- Performing calculations

## Step-by-Step Process

### Step 1: Define Your Tool in the Registry

Open `lib/tools.ts` and add your tool definition to the `TOOL_REGISTRY` array:

```typescript
{
  type: "function" as const,
  function: {
    name: "your_tool_name",  // Use snake_case
    description: "Clear description of what this tool does. The AI uses this to decide when to call it.",
    parameters: {
      type: "object",
      properties: {
        // Define your parameters here
        parameter1: {
          type: "string",
          description: "Description of parameter1"
        },
        parameter2: {
          type: "number",
          description: "Description of parameter2"
        }
      },
      required: ["parameter1"]  // List required parameters
    }
  }
}
```

#### Example: Creating a "Send Email" Tool

```typescript
{
  type: "function" as const,
  function: {
    name: "send_email",
    description: "Send an email to a specified recipient. Use this when the user asks to send an email or notify someone.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Email address of the recipient"
        },
        subject: {
          type: "string",
          description: "Email subject line"
        },
        body: {
          type: "string",
          description: "Email message body"
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high"],
          description: "Email priority level",
          default: "normal"
        }
      },
      required: ["to", "subject", "body"]
    }
  }
}
```

### Step 2: Implement the Tool Logic

In the same `lib/tools.ts` file, add a handler function and update the `toolRouter`:

```typescript
/**
 * Your Tool Implementation
 */
async function executeYourTool(
  args: { /* your parameters here */ },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { parameter1, parameter2 } = args;
    
    // Your tool logic here
    // Make API calls, query databases, process data, etc.
    
    // Example: Call external API
    const response = await fetch('https://api.example.com/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameter1, parameter2 })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      result: `Operation completed successfully. Result: ${JSON.stringify(data)}`
    };
    
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return {
      success: false,
      error: error.message || 'Tool execution failed'
    };
  }
}
```

#### Example: Send Email Implementation

```typescript
async function executeSendEmail(
  args: { to: string; subject: string; body: string; priority?: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { to, subject, body, priority = 'normal' } = args;
    
    // Validate email
    if (!to.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Get email integration config from database
    const { data: integration } = await supabaseAdmin
      .from('agent_integrations')
      .select('*')
      .eq('integration_type', 'email')
      .eq('is_active', true)
      .single();
    
    if (!integration) {
      return {
        success: false,
        error: 'Email integration not configured'
      };
    }
    
    // Send email via your email service
    const emailPayload = {
      to,
      subject,
      body,
      priority,
      from: integration.config.from || 'noreply@emtek.au',
      timestamp: new Date().toISOString()
    };
    
    const response = await fetch(integration.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [integration.auth_header_key]: integration.auth_token
      },
      body: JSON.stringify(emailPayload)
    });
    
    if (!response.ok) {
      throw new Error(`Email service error: ${response.status}`);
    }
    
    return {
      success: true,
      result: `✅ Email sent successfully to ${to}\nSubject: ${subject}`
    };
    
  } catch (error: any) {
    console.error('Send email error:', error);
    return {
      success: false,
      error: `Failed to send email: ${error.message}`
    };
  }
}
```

### Step 3: Add Your Tool to the Router

In `lib/tools.ts`, find the `toolRouter` function and add a case for your tool:

```typescript
export async function toolRouter(
  name: string, 
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    console.log(`🔧 Executing tool: ${name} with args:`, args);

    switch (name) {
      // ... existing cases ...
      
      case "your_tool_name":
        return await executeYourTool(
          args as { /* your parameter types */ },
          context
        );
      
      // ... rest of cases ...
      
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
```

#### Example: Adding Send Email to Router

```typescript
case "send_email":
  return await executeSendEmail(
    args as { to: string; subject: string; body: string; priority?: string },
    context
  );
```

### Step 4: Enable Tool for Agents

Your tool is now available! To enable it for specific agents:

#### Option A: Via Database (Recommended)

```sql
-- Update agent's allowed_tools array
UPDATE chat_agents 
SET allowed_tools = array_append(allowed_tools, 'your_tool_name')
WHERE id = 'your-agent-id';

-- Or set all allowed tools at once
UPDATE chat_agents 
SET allowed_tools = ARRAY[
  'document_search',
  'vision_analysis',
  'your_tool_name',  -- Your new tool
  'web_search_preview'
]
WHERE id = 'your-agent-id';
```

#### Option B: Via Admin UI

1. Go to Settings in the chat interface
2. Select the agent you want to configure
3. Add your tool name to the "Allowed Tools" list
4. Save changes

### Step 5: Test Your Tool

#### Test Message Examples

For our send_email tool:
```
"Send an email to john@example.com with subject 'Meeting Tomorrow' and body 'Don't forget our 10am meeting'"
```

#### Check Logs

**Backend (Terminal):**
```
🔧 Executing tool: send_email with args: { to: 'john@example.com', ... }
✅ Tool executed successfully: { resultLength: 85 }
```

**Frontend (Browser Console):**
```
🔧 Function result received: { name: 'send_email', status: 'completed' }
```

## Tool Best Practices

### 1. Clear Descriptions
Make your tool description clear so the AI knows when to use it:
```typescript
// ❌ Bad
description: "Sends stuff"

// ✅ Good
description: "Send an email to a specified recipient. Use this when the user asks to send an email, notify someone, or share information via email."
```

### 2. Validate Inputs
Always validate parameters before processing:
```typescript
if (!args.email || !args.email.includes('@')) {
  return {
    success: false,
    error: 'Invalid email address format'
  };
}
```

### 3. Handle Errors Gracefully
Provide helpful error messages:
```typescript
catch (error: any) {
  return {
    success: false,
    error: `Failed to send email: ${error.message}. Please check the recipient address and try again.`
  };
}
```

### 4. Use Context
The `context` parameter provides useful information:
```typescript
async function executeYourTool(args: any, context: ToolContext) {
  // Access user info
  const userId = context.userId;
  
  // Access agent info
  const agentId = context.agentId;
  
  // Access project info
  const projectId = context.projectId;
  
  // Access conversation info
  const conversationId = context.conversationId;
}
```

### 5. Return Formatted Results
Format results as markdown for better display:
```typescript
return {
  success: true,
  result: `## Email Sent Successfully\n\n**To:** ${to}\n**Subject:** ${subject}\n\n✅ Your email has been delivered.`
};
```

## Advanced Features

### Making External API Calls

```typescript
async function executeWeatherLookup(
  args: { city: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const response = await fetch(
      `https://api.weather.com/v1/weather?city=${encodeURIComponent(args.city)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WEATHER_API_KEY}`
        }
      }
    );
    
    const weather = await response.json();
    
    return {
      success: true,
      result: `Current weather in ${args.city}: ${weather.temperature}°C, ${weather.conditions}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Weather lookup failed: ${error.message}`
    };
  }
}
```

### Querying Databases

```typescript
async function executeCustomerLookup(
  args: { customerId: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', args.customerId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }
    
    return {
      success: true,
      result: `## Customer Information\n\n**Name:** ${data.name}\n**Email:** ${data.email}\n**Status:** ${data.status}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Database error: ${error.message}`
    };
  }
}
```

### Processing Files

```typescript
async function executeFileAnalysis(
  args: { fileUrl: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    // Download file
    const response = await fetch(args.fileUrl);
    const buffer = await response.arrayBuffer();
    
    // Process file
    const analysis = await analyzeFile(buffer);
    
    return {
      success: true,
      result: `## File Analysis\n\n${analysis.summary}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: `File analysis failed: ${error.message}`
    };
  }
}
```

## Troubleshooting

### Tool Not Showing Up
1. Check tool is in `TOOL_REGISTRY` in `lib/tools.ts`
2. Verify tool name matches in registry and router
3. Check agent has tool in `allowed_tools`
4. Restart development server

### Tool Not Executing
1. Check browser console for errors
2. Check backend terminal for errors
3. Verify tool name is correct (case-sensitive)
4. Check function signature matches expected types

### Tool Executes But No Result
1. Check `toolRouter` has case for your tool
2. Verify implementation returns `ToolResult` format
3. Check for errors in implementation
4. Look for SSE event in browser console

## Complete Example: Calculator Tool

Here's a complete example from start to finish:

### 1. Add to Registry (lib/tools.ts)

```typescript
{
  type: "function" as const,
  function: {
    name: "calculate",
    description: "Perform mathematical calculations. Use this when the user asks for math operations, calculations, or numerical analysis.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5 + 3')"
        }
      },
      required: ["expression"]
    }
  }
}
```

### 2. Implement Function

```typescript
async function executeCalculate(
  args: { expression: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    // Sanitize input (important for security!)
    const sanitized = args.expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    if (!sanitized) {
      throw new Error('Invalid mathematical expression');
    }
    
    // Evaluate expression safely
    const result = Function('"use strict"; return (' + sanitized + ')')();
    
    return {
      success: true,
      result: `## Calculation Result\n\n**Expression:** ${args.expression}\n**Result:** ${result}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Calculation error: ${error.message}`
    };
  }
}
```

### 3. Add to Router

```typescript
case "calculate":
  return await executeCalculate(
    args as { expression: string },
    context
  );
```

### 4. Enable for Agent

```sql
UPDATE chat_agents 
SET allowed_tools = array_append(allowed_tools, 'calculate')
WHERE name = 'Emmie Chat';
```

### 5. Test

User: "What's 25 * 4 + 10?"

Expected Response:
```
## Calculation Result

**Expression:** 25 * 4 + 10
**Result:** 110
```

## Next Steps

1. Plan your tool's functionality
2. Define parameters and validation rules
3. Implement the tool logic
4. Add to registry and router
5. Test with different inputs
6. Handle edge cases
7. Document for your team

---

**Need Help?** Check the existing tools in `lib/tools.ts` for more examples!
