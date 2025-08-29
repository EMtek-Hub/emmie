import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentConfigurationCard({ 
  agent, 
  onUpdate, 
  isUpdating = false 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localMode, setLocalMode] = useState(agent.agent_mode || 'emmie');
  const [localAssistantId, setLocalAssistantId] = useState(agent.openai_assistant_id || '');
  const [hasChanges, setHasChanges] = useState(false);

  const handleModeChange = (newMode) => {
    setLocalMode(newMode);
    setHasChanges(true);
    
    // Clear assistant ID if switching to Emmie mode
    if (newMode === 'emmie') {
      setLocalAssistantId('');
    }
  };

  const handleAssistantIdChange = (value) => {
    setLocalAssistantId(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      await onUpdate(agent.id, {
        agent_mode: localMode,
        openai_assistant_id: localMode === 'openai_assistant' ? localAssistantId : null
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update agent:', error);
      // Reset to original values on error
      setLocalMode(agent.agent_mode || 'emmie');
      setLocalAssistantId(agent.openai_assistant_id || '');
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setLocalMode(agent.agent_mode || 'emmie');
    setLocalAssistantId(agent.openai_assistant_id || '');
    setHasChanges(false);
  };

  const isValidAssistantId = (id) => {
    return id && id.trim().length > 0 && id.startsWith('asst_');
  };

  const canSave = () => {
    if (!hasChanges) return false;
    if (localMode === 'openai_assistant') {
      return isValidAssistantId(localAssistantId);
    }
    return true;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-500">{agent.department}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Mode indicator */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              localMode === 'openai_assistant' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {localMode === 'openai_assistant' ? 'OpenAI Assistant' : 'Emmie Agent'}
            </span>
            
            {/* Expand/collapse button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded configuration */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-4">
            {/* Agent Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`mode-${agent.id}`}
                    value="emmie"
                    checked={localMode === 'emmie'}
                    onChange={(e) => handleModeChange(e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Emmie Multi-Agent System
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`mode-${agent.id}`}
                    value="openai_assistant"
                    checked={localMode === 'openai_assistant'}
                    onChange={(e) => handleModeChange(e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    OpenAI Assistant
                  </span>
                </label>
              </div>
            </div>

            {/* OpenAI Assistant ID Input */}
            {localMode === 'openai_assistant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI Assistant ID
                </label>
                <input
                  type="text"
                  value={localAssistantId}
                  onChange={(e) => handleAssistantIdChange(e.target.value)}
                  placeholder="asst_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                    localAssistantId && !isValidAssistantId(localAssistantId)
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
                {localAssistantId && !isValidAssistantId(localAssistantId) && (
                  <p className="mt-1 text-sm text-red-600">
                    Assistant ID must start with "asst_"
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter the OpenAI Assistant ID from your OpenAI account (e.g., asst_abc123...)
                </p>
              </div>
            )}

            {/* Current configuration display */}
            <div className="bg-white p-3 rounded border">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500">Mode:</dt>
                  <dd className="text-gray-900">
                    {agent.agent_mode === 'openai_assistant' ? 'OpenAI Assistant' : 'Emmie Agent'}
                  </dd>
                </div>
                {agent.openai_assistant_id && (
                  <div>
                    <dt className="text-gray-500">Assistant ID:</dt>
                    <dd className="text-gray-900 font-mono text-xs break-all">
                      {agent.openai_assistant_id}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Last Updated:</dt>
                  <dd className="text-gray-900">
                    {new Date(agent.updated_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Action buttons */}
            {hasChanges && (
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave() || isUpdating}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
