import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Play, 
  Book,
  AlertCircle,
  CheckCircle,
  Loader,
  ExternalLink
} from 'lucide-react';

export default function EnhancedToolCard({ tool, onTest, onConfigure }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest(tool.name);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  // Get setup status
  const getSetupStatus = () => {
    if (tool.name === 'search_hr_policies' || tool.name === 'search_technical_docs' || tool.name === 'document_search') {
      // These require documents to be uploaded
      return {
        status: 'warning',
        message: 'Requires documents to be uploaded',
        color: 'yellow'
      };
    }
    
    if (tool.name === 'raise_ticket' || tool.name === 'log_leave_request') {
      // These require integration setup
      return {
        status: 'warning',
        message: 'Integration configuration recommended',
        color: 'yellow'
      };
    }
    
    return {
      status: 'ready',
      message: 'Ready to use',
      color: 'green'
    };
  };

  const setupStatus = getSetupStatus();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            setupStatus.color === 'green' ? 'bg-green-100' :
            setupStatus.color === 'yellow' ? 'bg-yellow-100' :
            'bg-gray-100'
          }`}>
            {setupStatus.color === 'green' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : setupStatus.color === 'yellow' ? (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            ) : (
              <X className="w-5 h-5 text-gray-400" />
            )}
          </div>
          
          <div className="flex-1 text-left">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">{tool.label || tool.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                setupStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                setupStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {setupStatus.message}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-6">
            {/* Parameters Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>Parameters</span>
                {tool.parameters?.required?.length > 0 && (
                  <span className="text-xs text-gray-500">
                    ({tool.parameters.required.length} required)
                  </span>
                )}
              </h4>
              <div className="space-y-3">
                {Object.entries(tool.parameters?.properties || {}).map(([paramName, paramInfo]) => (
                  <div key={paramName} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-blue-600">{paramName}</code>
                        {tool.parameters?.required?.includes(paramName) && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            required
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{paramInfo.type}</span>
                    </div>
                    <p className="text-sm text-gray-600">{paramInfo.description}</p>
                    {paramInfo.enum && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {paramInfo.enum.map(value => (
                          <span key={value} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Instructions */}
            {getSetupInstructions(tool.name) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  <span>Setup Instructions</span>
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-900 space-y-2">
                    {getSetupInstructions(tool.name)}
                  </div>
                </div>
              </div>
            )}

            {/* Example Usage */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Example Usage
              </h4>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100">
                {getExampleUsage(tool.name)}
              </div>
            </div>

            {/* Documentation Links */}
            {getDocumentationLink(tool.name) && (
              <div>
                <a
                  href={getDocumentationLink(tool.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Book className="w-4 h-4" />
                  <span>View full documentation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Test Tool</span>
                  </>
                )}
              </button>
              
              {onConfigure && (
                <button
                  onClick={() => onConfigure(tool)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>Configure</span>
                </button>
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h5 className={`text-sm font-semibold mb-1 ${
                      testResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {testResult.success ? 'Test Successful' : 'Test Failed'}
                    </h5>
                    <p className={`text-sm ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.message || testResult.error || 'No details available'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getSetupInstructions(toolName) {
  const instructions = {
    'search_hr_policies': (
      <>
        <p><strong>Step 1:</strong> Upload HR policy documents (PDFs, Word docs, etc.)</p>
        <p><strong>Step 2:</strong> Go to Documents section and upload files for your HR agent</p>
        <p><strong>Step 3:</strong> Enable this tool in your HR agent's configuration</p>
        <p><strong>Step 4:</strong> Test by asking: "What is the leave policy?"</p>
      </>
    ),
    'search_technical_docs': (
      <>
        <p><strong>Step 1:</strong> Upload technical documentation files</p>
        <p><strong>Step 2:</strong> Associate documents with your technical support agent</p>
        <p><strong>Step 3:</strong> Enable tool in agent configuration</p>
        <p><strong>Step 4:</strong> Test with technical queries</p>
      </>
    ),
    'document_search': (
      <>
        <p><strong>Step 1:</strong> Upload knowledge base documents</p>
        <p><strong>Step 2:</strong> Ensure agent has access to documents</p>
        <p><strong>Step 3:</strong> Tool will automatically search relevant content</p>
      </>
    ),
    'raise_ticket': (
      <>
        <p><strong>Step 1:</strong> Configure ticketing system integration</p>
        <p><strong>Step 2:</strong> Go to Integrations tab and set up API endpoint</p>
        <p><strong>Step 3:</strong> Provide authentication credentials</p>
        <p><strong>Note:</strong> Works locally without integration (logs only)</p>
      </>
    ),
    'log_leave_request': (
      <>
        <p><strong>Step 1:</strong> Configure email integration</p>
        <p><strong>Step 2:</strong> Set up SMTP or email API credentials</p>
        <p><strong>Step 3:</strong> Specify HR recipient email address</p>
        <p><strong>Note:</strong> Currently logs to console if not configured</p>
      </>
    ),
  };

  return instructions[toolName] || null;
}

function getExampleUsage(toolName) {
  const examples = {
    'search_hr_policies': 'User: "What is our annual leave policy?"\n\nAI uses tool to search HR documents and returns:\n"According to our policy, employees receive 20 days\nof paid annual leave per year..."',
    'search_technical_docs': 'User: "How do I configure the CAD export settings?"\n\nAI searches technical docs and provides step-by-step\ninstructions from the engineering standards...',
    'document_search': 'User: "Find information about project timelines"\n\nTool searches knowledge base and returns relevant\ndocument excerpts with project scheduling info...',
    'raise_ticket': 'User: "My computer won\'t start. Can you log a ticket?"\n\nTool creates ticket:\n{\n  category: "IT",\n  summary: "Computer startup issue",\n  priority: "high"\n}',
    'log_leave_request': 'User: "I need to take leave from June 1-14"\n\nTool submits leave request:\n{\n  type: "annual",\n  start: "2025-06-01",\n  end: "2025-06-14"\n}',
    'search_tickets': 'User: "Show me open high-priority tickets"\n\nTool queries ticketing system:\n{\n  status: "open",\n  priority: "high"\n}\nReturns list of matching tickets...',
    'project_knowledge': 'User: "What features are planned for Project X?"\n\nTool searches project-specific documentation\nand returns planned features from roadmap...',
    'lookup_project': 'User: "Tell me about Project Alpha"\n\nTool fetches project details:\n{\n  name: "Project Alpha",\n  status: "active",\n  description: "...",\n  team: [...]\n}',
  };

  return examples[toolName] || `User asks a question...\n\nAI decides to use ${toolName} tool\n\nTool executes and returns result\n\nAI incorporates result in response`;
}

function getDocumentationLink(toolName) {
  const links = {
    'search_hr_policies': '/docs/HR-POLICY-TOOL-SETUP.md',
    'search_technical_docs': '/docs/HOW-TO-CREATE-A-TOOL.md',
    'document_search': '/docs/HOW-TO-CREATE-A-TOOL.md',
  };

  return links[toolName] || null;
}
