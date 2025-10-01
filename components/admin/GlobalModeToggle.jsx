import { useState } from 'react';
import { 
  ToggleLeft, 
  ToggleRight, 
  Bot, 
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function GlobalModeToggle({ agents, onBulkUpdate, isUpdating = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate statistics
  const activeCount = agents.filter(agent => agent.is_active).length;
  const inactiveCount = agents.filter(agent => !agent.is_active).length;
  const totalAgents = agents.length;

  const handleBulkActivation = async (activate) => {
    const updates = agents
      .filter(agent => agent.is_active !== activate)
      .map(agent => ({
        agentId: agent.id,
        is_active: activate
      }));

    if (updates.length === 0) {
      return; // No changes needed
    }

    await onBulkUpdate(updates);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Bulk Agent Management</h3>
            <p className="text-sm text-gray-600">Manage all agents using Responses API</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isExpanded ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{totalAgents}</div>
          <div className="text-sm text-gray-600">Total Agents</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-800">{activeCount}</div>
          <div className="text-sm text-green-600">Active</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-800">{inactiveCount}</div>
          <div className="text-sm text-red-600">Inactive</div>
        </div>
      </div>

      {/* Backend Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              All agents now use OpenAI Responses API exclusively
            </p>
            <p className="text-xs text-blue-700">
              Unified backend provides better performance and consistency
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Bulk Actions</h4>
          
          <div className="space-y-3">
            {/* Activate All */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Activate All Agents</p>
                  <p className="text-xs text-gray-600">Enable all agents for users</p>
                </div>
              </div>
              <button
                onClick={() => handleBulkActivation(true)}
                disabled={isUpdating || activeCount === totalAgents}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : `Activate ${totalAgents - activeCount}`}
              </button>
            </div>

            {/* Deactivate All */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Deactivate All Agents</p>
                  <p className="text-xs text-gray-600">Disable all agents for users</p>
                </div>
              </div>
              <button
                onClick={() => handleBulkActivation(false)}
                disabled={isUpdating || inactiveCount === totalAgents}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : `Deactivate ${activeCount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
