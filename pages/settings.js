import { useState, useEffect } from 'react';
import { requireHubAuth } from '../lib/authz';
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
  Bot
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage({ session }) {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
    fetchDocuments();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents?includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
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
        // Show success message
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
        // Show error message
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

  const tabs = [
    { id: 'agents', label: 'Chat Agents', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emtek-navy border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container-app py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/chat" 
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emtek-navy/10 rounded-xl">
                  <SettingsIcon className="w-6 h-6 text-emtek-navy" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-emtek-navy">Chat Settings</h1>
                  <p className="text-gray-600">Manage chat agents and documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-app">
          <div className="flex gap-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-emtek-navy text-emtek-navy font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-8">
        {activeTab === 'agents' && (
          <AgentsTab 
            agents={agents}
            editingAgent={editingAgent}
            setEditingAgent={setEditingAgent}
            showNewAgentForm={showNewAgentForm}
            setShowNewAgentForm={setShowNewAgentForm}
            onSaveAgent={saveAgent}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab 
            documents={documents}
            agents={agents}
            onFileUpload={handleFileUpload}
            onDeleteDocument={deleteDocument}
            uploadingFile={uploadingFile}
          />
        )}
      </div>
    </div>
  );
}

// Agents Tab Component
function AgentsTab({ agents, editingAgent, setEditingAgent, showNewAgentForm, setShowNewAgentForm, onSaveAgent }) {
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
        <h2 className="text-xl font-semibold text-gray-900">Chat Agents</h2>
        <button
          onClick={handleNewAgent}
          className="btn-primary gap-2"
          disabled={editingAgent || showNewAgentForm}
        >
          <Plus className="w-4 h-4" />
          <span>New Agent</span>
        </button>
      </div>

      {(editingAgent || showNewAgentForm) && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingAgent ? 'Edit Agent' : 'New Agent'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="btn-primary gap-2"
                  disabled={!formData.name || !formData.department}
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary gap-2"
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
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
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
                    className="input"
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
                    className="input"
                    placeholder="Brief description of the agent's role"
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
                    className="input"
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
                    className="w-4 h-4 text-emtek-navy bg-gray-100 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
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
                    className="input resize-none"
                    placeholder="Define the agent's role and behavior..."
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
                    className="input resize-none"
                    placeholder="Additional context or instructions..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{agent.name}</h3>
                    <span className="text-sm text-gray-500">{agent.department}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {agent.is_active ? (
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  ) : (
                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  )}
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
                <button
                  onClick={() => handleEdit(agent)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  disabled={editingAgent || showNewAgentForm}
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Documents Tab Component
function DocumentsTab({ documents, agents, onFileUpload, onDeleteDocument, uploadingFile }) {
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
        <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="input min-w-48"
          >
            <option value="">Select agent...</option>
            {agents.filter(a => a.is_active).map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <label className="btn-primary gap-2 cursor-pointer">
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
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ${
            dragOver ? 'border-emtek-navy bg-emtek-navy/5' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
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
                  <div key={doc.id} className="card hover:shadow-md transition-shadow duration-200">
                    <div className="card-body">
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
