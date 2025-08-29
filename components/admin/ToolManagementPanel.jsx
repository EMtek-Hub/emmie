import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from 'lucide-react';

export default function ToolManagementPanel({ tools, onUpdate }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateTool = () => {
    setSelectedTool(null);
    setShowCreateModal(true);
  };

  const handleEditTool = (tool) => {
    setSelectedTool(tool);
    setShowEditModal(true);
  };

  const handleViewTool = (tool) => {
    setSelectedTool(tool);
    setShowViewModal(true);
  };

  const handleDeleteTool = async (toolId) => {
    if (!confirm('Are you sure you want to delete this tool?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tools`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: toolId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tool');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting tool:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedTool(null);
    setError(null);
  };

  const handleSave = async () => {
    await onUpdate();
    handleModalClose();
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
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Available Tools</h3>
          <p className="text-sm text-gray-600">
            Manage the tools available for agent assignment
          </p>
        </div>
        <button
          onClick={handleCreateTool}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Tool
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-800 underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Tool Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 truncate">{tool.name}</h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getToolTypeColor(tool.type)}`}>
                  {tool.type}
                </span>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={() => handleViewTool(tool)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View details"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                {!tool.is_system && (
                  <>
                    <button
                      onClick={() => handleEditTool(tool)}
                      className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Edit tool"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id)}
                      disabled={loading}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete tool"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tool Description */}
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {tool.description || 'No description provided'}
            </p>

            {/* Tool Details */}
            <div className="space-y-2 text-xs text-gray-500">
              {tool.is_system && (
                <div className="flex items-center">
                  <span className="w-16 font-medium">System:</span>
                  <span className="text-blue-600">Built-in tool</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="w-16 font-medium">Created:</span>
                <span>{new Date(tool.created_at).toLocaleDateString()}</span>
              </div>
              {tool.function_schema && (
                <div className="flex items-center">
                  <span className="w-16 font-medium">Params:</span>
                  <span>{Object.keys(tool.function_schema.parameters?.properties || {}).length} parameters</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tools.length === 0 && (
        <div className="text-center py-12">
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
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tools available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first tool.
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreateTool}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Tool
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <ToolModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          onSave={handleSave}
          mode="create"
        />
      )}

      {showEditModal && selectedTool && (
        <ToolModal
          isOpen={showEditModal}
          onClose={handleModalClose}
          onSave={handleSave}
          mode="edit"
          tool={selectedTool}
        />
      )}

      {showViewModal && selectedTool && (
        <ToolViewModal
          isOpen={showViewModal}
          onClose={handleModalClose}
          tool={selectedTool}
        />
      )}
    </div>
  );
}

// Tool Creation/Edit Modal Component
function ToolModal({ isOpen, onClose, onSave, mode, tool = null }) {
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    type: tool?.type || 'function',
    description: tool?.description || '',
    function_schema: tool?.function_schema || {
      name: '',
      description: '',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const endpoint = '/api/admin/tools';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' 
        ? { id: tool.id, ...formData }
        : formData;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tool');
      }

      await onSave();
    } catch (error) {
      console.error('Error saving tool:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      function_schema: {
        ...prev.function_schema,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-2xl">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {mode === 'create' ? 'Create New Tool' : 'Edit Tool'}
          </h3>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tool Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tool Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              >
                <option value="function">Function</option>
                <option value="code_interpreter">Code Interpreter</option>
                <option value="file_search">File Search</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Function Schema (only for function type) */}
            {formData.type === 'function' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Function Schema</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Function Name
                  </label>
                  <input
                    type="text"
                    value={formData.function_schema.name}
                    onChange={(e) => handleSchemaChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Function Description
                  </label>
                  <textarea
                    value={formData.function_schema.description}
                    onChange={(e) => handleSchemaChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parameters (JSON)
                  </label>
                  <textarea
                    value={JSON.stringify(formData.function_schema.parameters, null, 2)}
                    onChange={(e) => {
                      try {
                        const params = JSON.parse(e.target.value);
                        handleSchemaChange('parameters', params);
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    JSON schema defining the function parameters
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (mode === 'create' ? 'Create Tool' : 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Tool View Modal Component
function ToolViewModal({ isOpen, onClose, tool }) {
  if (!isOpen || !tool) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-3xl">
        <div className="mt-3">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900">Tool Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{tool.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Type</label>
                <p className="mt-1 text-sm text-gray-900">{tool.type}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-sm text-gray-900">{tool.description || 'No description provided'}</p>
            </div>

            {/* Function Schema */}
            {tool.function_schema && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Function Schema</label>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(tool.function_schema, null, 2)}
                </pre>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(tool.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">System Tool</label>
                <p className="mt-1 text-sm text-gray-900">
                  {tool.is_system ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
