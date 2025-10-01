import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Bot, 
  Wrench, 
  Globe, 
  Save,
  AlertCircle,
  CheckCircle,
  Loader,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, agents, onAgentsUpdate }) {
  const [activeTab, setActiveTab] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentSettings, setAgentSettings] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    mode: true,
    tools: false,
    prompts: false,
    integrations: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
      if (agents && agents.length > 0 && !selectedAgent) {
        setSelectedAgent(agents[0]);
        loadAgentSettings(agents[0].id);
      }
    }
  }, [isOpen, agents]);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/admin/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const loadAgentSettings = async (agentId) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setAgentSettings(data.agent);
      }
    } catch (error) {
      console.error('Failed to load agent settings:', error);
    }
  };

  const handleAgentChange = (agent) => {
    setSelectedAgent(agent);
    loadAgentSettings(agent.id);
  };

  const handleSaveAgent = async () => {
    if (!agentSettings) return;
    
    // Validate required fields
    if (!agentSettings.name?.trim()) {
      setSaveStatus({ type: 'error', message: 'Agent name is required' });
      return;
    }
    if (!agentSettings.department?.trim()) {
      setSaveStatus({ type: 'error', message: 'Department is required' });
      return;
    }
    if (!agentSettings.system_prompt?.trim()) {
      setSaveStatus({ type: 'error', message: 'System prompt is required' });
      return;
    }
    
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      const payload = {
        name: agentSettings.name.trim(),
        department: agentSettings.department.trim(),
        description: agentSettings.description?.trim() || '',
        system_prompt: agentSettings.system_prompt.trim(),
        background_instructions: agentSettings.background_instructions?.trim() || '',
        mode: agentSettings.mode || 'hybrid',
        allowed_tools: agentSettings.allowed_tools || [],
        color: agentSettings.color || '#3b82f6',
        is_active: agentSettings.is_active !== false
      };

      console.log('Saving agent with payload:', payload);

      const response = await fetch(`/api/agents/${agentSettings.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSaveStatus({ type: 'success', message: 'Agent settings saved successfully!' });
        if (onAgentsUpdate) {
          onAgentsUpdate();
        }
      } else {
        throw new Error(data.error || 'Failed to save agent settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save agent settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleToolToggle = (toolName) => {
    if (!agentSettings) return;
    
    const currentTools = agentSettings.allowed_tools || [];
    const newTools = currentTools.includes(toolName)
      ? currentTools.filter(t => t !== toolName)
      : [...currentTools, toolName];
    
    setAgentSettings({
      ...agentSettings,
      allowed_tools: newTools
    });
  };

  const availableTools = [
    { name: 'document_search', label: 'Document Search', description: 'Search knowledge base' },
    { name: 'vision_analysis', label: 'Vision Analysis', description: 'Analyze images' },
    { name: 'web_search_preview', label: 'Web Search', description: 'Search the web' },
    { name: 'code_interpreter', label: 'Code Interpreter', description: 'Execute code' },
    { name: 'image_generation', label: 'Image Generation', description: 'Generate images' },
    { name: 'raise_ticket', label: 'Raise Ticket', description: 'Create support tickets' },
    { name: 'log_leave_request', label: 'Leave Request', description: 'Submit leave requests' },
    { name: 'search_hr_policies', label: 'HR Policies', description: 'Search HR policies' },
    { name: 'search_technical_docs', label: 'Technical Docs', description: 'Search technical documentation' },
    { name: 'search_tickets', label: 'Search Tickets', description: 'Find support tickets' },
    { name: 'project_knowledge', label: 'Project Knowledge', description: 'Search project docs' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-500">Manage system and assistant configurations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'agents'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span>Assistants</span>
            </div>
            {activeTab === 'agents' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'integrations'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Integrations</span>
            </div>
            {activeTab === 'integrations' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'system'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>System</span>
            </div>
            {activeTab === 'system' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'agents' && (
            <div className="flex h-full">
              {/* Agent List */}
              <div className="w-64 border-r border-gray-200 p-4">
                <div className="space-y-1">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAgentChange(agent)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedAgent?.id === agent.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: agent.color || '#3b82f6' }}
                        />
                        <span className="text-sm truncate">{agent.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Settings */}
              <div className="flex-1 p-6 space-y-6">
                {agentSettings ? (
                  <>
                    {/* Basic Info Section */}
                    <Section
                      title="Basic Information"
                      isExpanded={expandedSections.basic}
                      onToggle={() => toggleSection('basic')}
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={agentSettings.name || ''}
                            onChange={(e) => setAgentSettings({ ...agentSettings, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={agentSettings.description || ''}
                            onChange={(e) => setAgentSettings({ ...agentSettings, description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={agentSettings.color || '#3b82f6'}
                            onChange={(e) => setAgentSettings({ ...agentSettings, color: e.target.value })}
                            className="w-20 h-10 rounded-lg border border-gray-300"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={agentSettings.is_active !== false}
                            onChange={(e) => setAgentSettings({ ...agentSettings, is_active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                            Active
                          </label>
                        </div>
                      </div>
                    </Section>

                    {/* Mode Section */}
                    <Section
                      title="Execution Mode"
                      isExpanded={expandedSections.mode}
                      onToggle={() => toggleSection('mode')}
                    >
                      <div className="space-y-3">
                        <ModeOption
                          mode="prompt"
                          label="Prompt Only"
                          description="No tools - pure knowledge-based responses"
                          selected={agentSettings.mode === 'prompt'}
                          onSelect={() => setAgentSettings({ ...agentSettings, mode: 'prompt' })}
                        />
                        <ModeOption
                          mode="tools"
                          label="Tools Mode"
                          description="Prefers calling tools for actions and data"
                          selected={agentSettings.mode === 'tools'}
                          onSelect={() => setAgentSettings({ ...agentSettings, mode: 'tools' })}
                        />
                        <ModeOption
                          mode="hybrid"
                          label="Hybrid Mode"
                          description="Balances knowledge and tool usage (recommended)"
                          selected={agentSettings.mode === 'hybrid'}
                          onSelect={() => setAgentSettings({ ...agentSettings, mode: 'hybrid' })}
                        />
                      </div>
                    </Section>

                    {/* Tools Section */}
                    <Section
                      title="Allowed Tools"
                      isExpanded={expandedSections.tools}
                      onToggle={() => toggleSection('tools')}
                    >
                      <div className="space-y-2">
                        {availableTools.map((tool) => (
                          <div key={tool.name} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`tool-${tool.name}`}
                              checked={(agentSettings.allowed_tools || []).includes(tool.name)}
                              onChange={() => handleToolToggle(tool.name)}
                              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`tool-${tool.name}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-sm text-gray-900">{tool.label}</div>
                              <div className="text-xs text-gray-500">{tool.description}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* Prompts Section */}
                    <Section
                      title="System Prompts"
                      isExpanded={expandedSections.prompts}
                      onToggle={() => toggleSection('prompts')}
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            System Prompt
                          </label>
                          <textarea
                            value={agentSettings.system_prompt || ''}
                            onChange={(e) => setAgentSettings({ ...agentSettings, system_prompt: e.target.value })}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="The main instructions for this assistant..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Background Instructions (Optional)
                          </label>
                          <textarea
                            value={agentSettings.background_instructions || ''}
                            onChange={(e) => setAgentSettings({ ...agentSettings, background_instructions: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="Additional context or specialized knowledge..."
                          />
                        </div>
                      </div>
                    </Section>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="p-6">
              <div className="max-w-2xl space-y-4">
                <IntegrationCard
                  title="Ticketing System"
                  description="Configure external ticketing system for raise_ticket tool"
                  integration={integrations.find(i => i.integration_type === 'ticketing')}
                />
                <IntegrationCard
                  title="Email Notifications"
                  description="Configure email settings for leave requests and notifications"
                  integration={integrations.find(i => i.integration_type === 'email')}
                />
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="p-6">
              <div className="max-w-2xl">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">System Settings</h3>
                    <p className="text-sm text-blue-700">
                      System-wide settings will be available in a future update. For now, use environment variables to configure system settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'agents' && agentSettings && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {saveStatus && (
                  <div className={`flex items-center gap-2 text-sm ${
                    saveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {saveStatus.type === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{saveStatus.message}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAgent}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, isExpanded, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function ModeOption({ mode, label, description, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
          selected ? 'border-blue-500' : 'border-gray-300'
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  );
}

function IntegrationCard({ title, description, integration }) {
  const isConfigured = integration && integration.is_active;
  
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          isConfigured
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isConfigured ? 'Active' : 'Not Configured'}
        </div>
      </div>
      {integration && (
        <div className="space-y-2 text-sm">
          {integration.endpoint_url && (
            <div>
              <span className="text-gray-500">Endpoint:</span>
              <span className="ml-2 text-gray-900 font-mono text-xs">{integration.endpoint_url}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
