import { useState } from 'react';

export default function GlobalModeToggle({ 
  agents, 
  onBulkUpdate, 
  isUpdating = false 
}) {
  const [selectedMode, setSelectedMode] = useState('emmie');

  // Calculate current state
  const emmieCount = agents.filter(agent => agent.agent_mode === 'emmie').length;
  const openaiCount = agents.filter(agent => agent.agent_mode === 'openai_assistant').length;
  const totalActive = agents.filter(agent => agent.is_active).length;

  const handleGlobalModeChange = async (mode) => {
    if (!confirm(`Switch all ${totalActive} active agents to ${mode === 'emmie' ? 'Emmie Multi-Agent System' : 'OpenAI Assistants'}?`)) {
      return;
    }

    setSelectedMode(mode);

    try {
      // Prepare bulk updates for all active agents
      const updates = agents
        .filter(agent => agent.is_active)
        .map(agent => ({
          agentId: agent.id,
          agent_mode: mode,
          openai_assistant_id: mode === 'emmie' ? null : agent.openai_assistant_id
        }));

      await onBulkUpdate(updates);
    } catch (error) {
      console.error('Failed to update agents:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Global Agent Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure how all Emmie agents should operate
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-500">
            {totalActive} active agents
          </div>
          <div className="text-xs text-gray-400">
            {emmieCount} Emmie • {openaiCount} OpenAI
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Current Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{emmieCount}</div>
            <div className="text-sm text-gray-600">Emmie Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{openaiCount}</div>
            <div className="text-sm text-gray-600">OpenAI Assistants</div>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Switch All Agents To:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emmie Multi-Agent Option */}
          <div className="relative">
            <button
              onClick={() => handleGlobalModeChange('emmie')}
              disabled={isUpdating || emmieCount === totalActive}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                emmieCount === totalActive
                  ? 'border-green-500 bg-green-50 cursor-default'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Emmie Multi-Agent System</h4>
                  <p className="text-sm text-gray-600">Use the existing departmental agent setup with GPT-5</p>
                  {emmieCount === totalActive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-2">
                      Currently Active
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* OpenAI Assistants Option */}
          <div className="relative">
            <button
              onClick={() => handleGlobalModeChange('openai_assistant')}
              disabled={isUpdating}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                openaiCount === totalActive
                  ? 'border-blue-500 bg-blue-50 cursor-default'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">OpenAI Assistants</h4>
                  <p className="text-sm text-gray-600">Use custom OpenAI Assistants for each agent</p>
                  {openaiCount === totalActive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                      Currently Active
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Warning for OpenAI Assistants */}
        {openaiCount < totalActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  OpenAI Assistant Configuration Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Switching to OpenAI Assistants will require you to configure Assistant IDs for each agent. 
                    Agents without configured Assistant IDs will fall back to the Emmie system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isUpdating && (
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Updating agents...</span>
          </div>
        </div>
      )}
    </div>
  );
}
