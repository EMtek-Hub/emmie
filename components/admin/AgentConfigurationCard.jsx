import { useState } from 'react';
import { 
  Settings, 
  Bot, 
  User, 
  CheckCircle,
  XCircle,
  Save,
  X
} from 'lucide-react';

export function AgentConfigurationCard({ agent, onUpdate, isUpdating = false }) {
  const [isActive, setIsActive] = useState(agent.is_active);
  const [hasChanges, setHasChanges] = useState(false);

  const handleActiveToggle = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    setHasChanges(newActive !== agent.is_active);
  };

  const handleSave = async () => {
    try {
      await onUpdate(agent.id, {
        is_active: isActive
      });
      setHasChanges(false);
    } catch (error) {
      // Reset to original values on error
      setIsActive(agent.is_active);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setIsActive(agent.is_active);
    setHasChanges(false);
  };

  const canSave = () => {
    return hasChanges;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: agent.color || '#1275bc' }}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-600">{agent.department}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive 
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isActive ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </>
            )}
          </span>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-sm text-gray-600 mb-6">{agent.description}</p>
      )}

      {/* Configuration Section */}
      <div className="space-y-4">
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </h4>

          {/* Agent Status Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Agent Status
                </label>
                <p className="text-xs text-gray-500">
                  Enable or disable this agent for users
                </p>
              </div>
              <button
                type="button"
                onClick={handleActiveToggle}
                className={`${
                  isActive ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-1 inline" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave() || isUpdating}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-1 inline" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="border-t border-gray-100 pt-4 mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Agent Information</h4>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Backend</dt>
            <dd className="text-gray-900">Responses API</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Status</dt>
            <dd className="text-gray-900">
              {isActive ? 'Active' : 'Inactive'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Last Updated</dt>
            <dd className="text-gray-900">
              {agent.updated_at ? new Date(agent.updated_at).toLocaleDateString() : 'Never'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
