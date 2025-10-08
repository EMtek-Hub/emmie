import { useState, useEffect } from 'react';
import { requireHubAuth } from '../lib/authz';
import GlobalModeToggle from '../components/admin/GlobalModeToggle';
import { AgentConfigurationCard } from '../components/admin/AgentConfigurationCard';
import ToolManagementPanel from '../components/admin/ToolManagementPanel';
import AgentToolsPanel from '../components/admin/AgentToolsPanel';
import { 
  Settings as SettingsIcon,
  Users,
  FileText,
  Upload,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowLeft,
  AlertTriangle,
  Check,
  Bot,
  Wrench,
  Cog
} from 'lucide-react';
import Link from 'next/link';

export default function UnifiedSettingsPage({ session }) {
  const [activeSection, setActiveSection] = useState('assistants');
  const [agents, setAgents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tools, setTools] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is admin
  const isAdmin = session?.user?.groups?.includes('EMtek-Hub-Admins') || false;

  useEffect(() => {
    fetchAgents();
    fetchDocuments();
    if (isAdmin) {
      fetchTools();
    }
  }, [isAdmin]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use admin endpoint if admin, otherwise regular endpoint
      const endpoint = isAdmin ? '/api/admin/agents' : '/api/agents?includeInactive=true';
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch agents');
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/admin/tools');
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools || []);
      }
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    }
  };

  const handleFileUpload = async (file, agentId) => {
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(prev => [...prev, data.document]);
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  const saveAgent = async (agent) => {
    try {
      const method = agent.id ? 'PUT' : 'POST';
      const url = agent.id ? `/api/agents/${agent.id}` : '/api/agents';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent)
      });

      if (response.ok) {
        const data = await response.json();
        if (agent.id) {
          setAgents(prev => prev.map(a => a.id === agent.id ? data.agent : a));
        } else {
          setAgents(prev => [...prev, data.agent]);
        }
        setEditingAgent(null);
        setShowNewAgentForm(false);
      }
    } catch (error) {
      console.error('Save agent error:', error);
    }
  };

  const handleAgentUpdate = async (agentId, updateData) => {
    if (!isAdmin) return;
    
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agentId,
          ...updateData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent');
      }

      const data = await response.json();
      
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === agentId ? data.agent : agent
        )
      );

      return data.agent;
    } catch (err) {
      console.error('Error updating agent:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkUpdate = async (updates) => {
    if (!isAdmin) return;
    
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agents');
      }

      const data = await response.json();
      await fetchAgents();
      
      return data;
    } catch (err) {
      console.error('Error bulk updating agents:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      }
    } catch (error) {
      console.error('Delete document error:', error);
    }
  };

  const sidebarItems = [
    { id: 'assistants', label: 'Assistants', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  // Add tool management sections for admins
  if (isAdmin) {
    sidebarItems.push(
      { id: 'tools', label: 'Tools', icon: Wrench },
      { id: 'agent-tools', label: 'Agent Tools', icon: Cog },
      { id: 'system', label: 'System', icon: SettingsIcon }
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emtek-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Settings</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchAgents}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(agent => agent.is_active);
  const inactiveAgents = agents.filter(agent => !agent.is_active);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/chat" 
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to Chat"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emtek-navy/10 rounded-xl">
                  <SettingsIcon className="w-6 h-6 text-emtek-navy" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-emtek-navy">Settings</h1>
                  <p className="text-sm text-gray-600">Manage your assistants, documents, and system configuration</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Logged in as <strong>{session.user.name}</strong>
              </div>
              <div className="text-xs text-gray-500">
                {isAdmin ? 'Administrator Access' : 'User Access'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors duration-200 ${
                    activeSection === item.id
                      ? 'border-emtek-navy text-emtek-navy font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'assistants' && (
          <AssistantsSection 
            agents={agents}
            editingAgent={editingAgent}
            setEditingAgent={setEditingAgent}
            showNewAgentForm={showNewAgentForm}
            setShowNewAgentForm={setShowNewAgentForm}
            onSaveAgent={saveAgent}
            onAgentUpdate={handleAgentUpdate}
            isUpdating={updating}
            isAdmin={isAdmin}
            activeAgents={activeAgents}
            inactiveAgents={inactiveAgents}
          />
        )}

        {activeSection === 'documents' && (
          <DocumentsSection 
            documents={documents}
            agents={agents}
            onFileUpload={handleFileUpload}
            onDeleteDocument={deleteDocument}
            uploadingFile={uploadingFile}
          />
        )}

        {activeSection === 'tools' && isAdmin && (
          <ToolManagementPanel 
            tools={tools}
            onToolsUpdated={fetchTools}
          />
        )}

        {activeSection === 'agent-tools' && isAdmin && (
          <AgentToolsPanel 
            agents={activeAgents}
            tools={tools}
            onUpdate={fetchTools}
          />
        )}

        {activeSection === 'system' && isAdmin && (
          <SystemSection 
            agents={activeAgents}
            onBulkUpdate={handleBulkUpdate}
            isUpdating={updating}
          />
        )}
      </div>
    </div>
  );
}

// Assistants Section Component
function AssistantsSection({ 
  agents, 
  editingAgent, 
  setEditingAgent, 
  showNewAgentForm, 
  setShowNewAgentForm, 
  onSaveAgent,
  onAgentUpdate,
  isUpdating,
  isAdmin,
  activeAgents,
  inactiveAgents
}) {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    system_prompt: '',
    background_instructions: '',
    color: '#6366f1',
    icon: 'bot',
    is_active: true
  });

  const handleEdit = (agent) => {
    setFormData(agent);
    setEditingAgent(agent.id);
    setShowNewAgentForm(false);
  };

  const handleNewAgent = () => {
    setFormData({
      name: '',
      department: '',
      description: '',
      system_prompt: 'You are Emmie, a helpful AI assistant specializing in ',
      background_instructions: '',
      color: '#6366f1',
      icon: 'bot',
      is_active: true
    });
    setShowNewAgentForm(true);
    setEditingAgent(null);
  };

  const handleSave = () => {
    onSaveAgent(editingAgent ? { ...formData, id: editingAgent } : formData);
  };

  const handleCancel = () => {
    setEditingAgent(null);
    setShowNewAgentForm(false);
    setFormData({
      name: '',
      department: '',
      description: '',
      system_prompt: '',
      background_instructions: '',
      color: '#6366f1',
      icon: 'bot',
      is_active: true
    });
  };

  const iconOptions = [
    'bot', 'users', 'laptop', 'wrench', 'ruler', 'sparkles', 'briefcase', 'shield', 'heart'
  ];

  const colorOptions = [
    '#6366f1', '#059669', '#dc2626', '#ea580c', '#7c3aed', '#0891b2', '#be185d', '#65a30d'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat Assistants</h2>
          <p className="text-gray-600 mt-1">Manage your AI assistants and their configurations</p>
        </div>
        <button
          onClick={handleNewAgent}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 gap-2"
          disabled={editingAgent || showNewAgentForm}
        >
          <Plus className="w-4 h-4" />
          <span>New Assistant</span>
        </button>
      </div>

      {/* Assistant Creation/Edit Form */}
      {(editingAgent || showNewAgentForm) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {editingAgent ? 'Edit Assistant' : 'New Assistant'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 gap-2"
                disabled={!formData.name || !formData.department}
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assistant Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., IT Support"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., IT"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Brief description of the assistant's role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {iconOptions.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt *
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={6}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                  placeholder="Define the assistant's role and behavior..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Instructions
                </label>
                <textarea
                  value={formData.background_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, background_instructions: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                  placeholder="Additional context or instructions..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Assistants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Active Assistants ({activeAgents.length})
        </h3>
        <div className="space-y-4">
          {activeAgents.map(agent => (
            isAdmin ? (
              <AgentConfigurationCard
                key={agent.id}
                agent={agent}
                onUpdate={onAgentUpdate}
                isUpdating={isUpdating}
              />
            ) : (
              <div key={agent.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                    >
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{agent.name}</h4>
                      <span className="text-sm text-gray-500">{agent.department}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <button
                      onClick={() => handleEdit(agent)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      disabled={editingAgent || showNewAgentForm}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {agent.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {agent.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {agent.documents?.length || 0} documents
                  </span>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Inactive Assistants */}
      {inactiveAgents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Inactive Assistants ({inactiveAgents.length})
          </h3>
          <div className="space-y-4">
            {inactiveAgents.map(agent => (
              isAdmin ? (
                <AgentConfigurationCard
                  key={agent.id}
                  agent={agent}
                  onUpdate={onAgentUpdate}
                  isUpdating={isUpdating}
                />
              ) : (
                <div key={agent.id} className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-6 opacity-75">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                      >
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        <span className="text-sm text-gray-500">{agent.department}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                      <button
                        onClick={() => handleEdit(agent)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        disabled={editingAgent || showNewAgentForm}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {agent.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {agent.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {agent.documents?.length || 0} documents
                    </span>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Documents Section Component
function DocumentsSection({ documents, agents, onFileUpload, onDeleteDocument, uploadingFile }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && selectedAgent) {
      onFileUpload(files[0], selectedAgent);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && selectedAgent) {
      onFileUpload(file, selectedAgent);
    }
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    const agentName = agents.find(a => a.id === doc.agent_id)?.name || 'Unassigned';
    if (!acc[agentName]) acc[agentName] = [];
    acc[agentName].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600 mt-1">Upload and manage documents for your assistants</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="mt-1 block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select assistant...</option>
            {agents.filter(a => a.is_active).map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={handleFileSelect}
              disabled={!selectedAgent || uploadingFile}
            />
          </label>
        </div>
      </div>

      {/* Upload Area */}
      {selectedAgent && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to upload
          </h3>
          <p className="text-gray-600 mb-4">
            Upload documents for <strong>{agents.find(a => a.id === selectedAgent)?.name}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, DOC, TXT, MD (Max 10MB)
          </p>
        </div>
      )}

      {/* Documents List */}
      {Object.keys(groupedDocuments).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([agentName, docs]) => (
            <div key={agentName} className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <span>{agentName}</span>
                <span className="text-sm text-gray-500">({docs.length} documents)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div key={doc.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                        <p className="text-sm text-gray-500">{doc.original_filename}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          doc.status === 'ready' ? 'bg-green-400' :
                          doc.status === 'processing' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`}></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{Math.round(doc.file_size / 1024)}KB</span>
                      <span>{doc.chunk_count} chunks</span>
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// System Section Component (Admin only)
function SystemSection({ agents, onBulkUpdate, isUpdating }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
        <p className="text-gray-600 mt-1">Configure global system settings and AI model preferences</p>
      </div>

      {/* Global Configuration */}
      <GlobalModeToggle 
        agents={agents}
        onBulkUpdate={onBulkUpdate}
        isUpdating={isUpdating}
      />

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          OpenAI Assistants Integration
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Emmie Multi-Agent System:</strong> Uses the existing departmental assistants with GPT-5 and custom system prompts.
          </p>
          <p>
            <strong>OpenAI Assistants:</strong> Routes chat requests to custom OpenAI Assistants you've created in your OpenAI account.
          </p>
          <p>
            <strong>Setup:</strong> Create Assistants in your OpenAI account, then paste their IDs (starting with "asst_") into the assistant configuration above.
          </p>
          <p className="mt-4 text-xs">
            <strong>Note:</strong> Assistants without configured Assistant IDs will automatically fall back to the Emmie system.
          </p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context, process.env.TOOL_SLUG);
  
  if (authResult.redirect) {
    return authResult;
  }
  
  return {
    props: {
      session: authResult.props.session,
    },
  };
}
