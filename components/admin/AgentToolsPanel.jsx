import { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon, SettingsIcon, CheckIcon } from 'lucide-react';

export default function AgentToolsPanel({ agents, tools, onUpdate }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentTools, setAgentTools] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentTools(selectedAgent.id);
    }
  }, [selectedAgent]);

  useEffect(() => {
    // Update available tools when tools prop changes
    setAvailableTools(tools);
  }, [tools]);

  const loadAgentTools = async (agentId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/agent-tools?agentId=${agentId}`);
      if (!response.ok) {
        throw new Error('Failed to load agent tools');
      }

      const data = await response.json();
      setAgentTools(data);
    } catch (error) {
      console.error('Error loading agent tools:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTool = async (toolId, config = {}) => {
    if (!selectedAgent) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/agent-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          toolId,
          config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign tool');
      }

      await loadAgentTools(selectedAgent.id);
      await onUpdate();
    } catch (error) {
      console.error('Error assigning tool:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignTool = async (toolId) => {
    if (!selectedAgent) return;

    if (!confirm('Are you sure you want to remove this tool from the agent?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/agent-tools', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          toolId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign tool');
      }

      await loadAgentTools(selectedAgent.id);
      await onUpdate();
    } catch (error) {
      console.error('Error unassigning tool:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async (toolIds) => {
    if (!selectedAgent) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/agent-tools/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          toolIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk assign tools');
      }

      await loadAgentTools(selectedAgent.id);
      await onUpdate();
      setShowBulkAssign(false);
    } catch (error) {
      console.error('Error bulk assigning tools:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAssignedToolIds = () => {
    return agentTools.map(at => at.tool_id);
  };

  const getUnassignedTools = () => {
    const assignedIds = getAssignedToolIds();
    return availableTools.filter(tool => !assignedIds.includes(tool.id));
  };

  const getToolTypeColor = (type) => {
    switch (type) {
      case 'function':
        return 'bg-blue-100 text-blue-800';
      case 'code_interpreter':
        return 'bg-green-100 text-green-800';
      case 'file_search':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Agent</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`p-3 border rounded-lg text-left transition-colors ${
                selectedAgent?.id === agent.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-500">{agent.department}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Tools Management */}
      {selectedAgent && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Tools for {selectedAgent.name}
              </h3>
              <p className="text-sm text-gray-600">
                Manage which tools are available to this agent
              </p>
            </div>
            <button
              onClick={() => setShowBulkAssign(true)}
              disabled={loading || getUnassignedTools().length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Bulk Assign
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assigned Tools */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Assigned Tools ({agentTools.length})
                </h4>
                {agentTools.length > 0 ? (
                  <div className="space-y-3">
                    {agentTools.map((agentTool) => {
                      const tool = availableTools.find(t => t.id === agentTool.tool_id);
                      if (!tool) return null;

                      return (
                        <div
                          key={agentTool.id}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h5 className="font-medium text-gray-900">{tool.name}</h5>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getToolTypeColor(tool.type)}`}>
                                  {tool.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {tool.description || 'No description provided'}
                              </p>
                              <div className="mt-2 text-xs text-gray-500">
                                Assigned: {new Date(agentTool.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-4">
                              {agentTool.config && Object.keys(agentTool.config).length > 0 && (
                                <button
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Has custom configuration"
                                >
                                  <SettingsIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleUnassignTool(tool.id)}
                                disabled={loading}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Remove tool"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No tools assigned to this agent</p>
                  </div>
                )}
              </div>

              {/* Available Tools */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Available Tools ({getUnassignedTools().length})
                </h4>
                {getUnassignedTools().length > 0 ? (
                  <div className="space-y-3">
                    {getUnassignedTools().map((tool) => (
                      <div
                        key={tool.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="font-medium text-gray-900">{tool.name}</h5>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getToolTypeColor(tool.type)}`}>
                                {tool.type}
                              </span>
                              {tool.is_system && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  System
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {tool.description || 'No description provided'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAssignTool(tool.id)}
                            disabled={loading}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                            title="Assign tool"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">All available tools are assigned</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Agent Selected */}
      {!selectedAgent && (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select an Agent</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose an agent above to manage their tool assignments.
          </p>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <BulkAssignModal
          isOpen={showBulkAssign}
          onClose={() => setShowBulkAssign(false)}
          onAssign={handleBulkAssign}
          availableTools={getUnassignedTools()}
          loading={loading}
        />
      )}
    </div>
  );
}

// Bulk Assign Modal Component
function BulkAssignModal({ isOpen, onClose, onAssign, availableTools, loading }) {
  const [selectedTools, setSelectedTools] = useState([]);

  const handleToolToggle = (toolId) => {
    setSelectedTools(prev => 
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTools(availableTools.map(tool => tool.id));
  };

  const handleSelectNone = () => {
    setSelectedTools([]);
  };

  const handleAssign = () => {
    onAssign(selectedTools);
    setSelectedTools([]);
  };

  const getToolTypeColor = (type) => {
    switch (type) {
      case 'function':
        return 'bg-blue-100 text-blue-800';
      case 'code_interpreter':
        return 'bg-green-100 text-green-800';
      case 'file_search':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-2xl">
        <div className="mt-3">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bulk Assign Tools</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {availableTools.length > 0 ? (
            <>
              {/* Selection Controls */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <div className="text-sm text-gray-600">
                  {selectedTools.length} of {availableTools.length} selected
                </div>
                <div className="space-x-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Select None
                  </button>
                </div>
              </div>

              {/* Tools List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableTools.map((tool) => (
                  <label
                    key={tool.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTools.includes(tool.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => handleToolToggle(tool.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{tool.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getToolTypeColor(tool.type)}`}>
                          {tool.type}
                        </span>
                        {tool.is_system && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            System
                          </span>
                        )}
                      </div>
                      {tool.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={loading || selectedTools.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : `Assign ${selectedTools.length} Tools`}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No tools available for bulk assignment</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
