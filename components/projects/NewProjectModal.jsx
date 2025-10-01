import { useState, useEffect } from 'react';
import { X, Search, Folder, Building2, Calendar, Loader2 } from 'lucide-react';

/**
 * New Project Modal
 * Allows users to create projects by linking to NetSuite or creating custom projects
 */
export default function NewProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [activeTab, setActiveTab] = useState('netsuite'); // 'netsuite' or 'custom'
  const [loading, setLoading] = useState(false);
  const [netsuiteProjects, setNetsuiteProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetsuiteProject, setSelectedNetsuiteProject] = useState(null);
  const [error, setError] = useState(null);
  
  // Custom project form
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Fetch NetSuite projects when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'netsuite') {
      fetchNetsuiteProjects();
    }
  }, [isOpen, activeTab]);

  const fetchNetsuiteProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/netsuite/projects');
      if (response.ok) {
        const data = await response.json();
        setNetsuiteProjects(data.projects || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load NetSuite projects');
      }
    } catch (error) {
      console.error('Error fetching NetSuite projects:', error);
      setError('Failed to connect to NetSuite database');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromNetsuite = async () => {
    if (!selectedNetsuiteProject) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedNetsuiteProject.displayName || selectedNetsuiteProject.name,
          description: `NetSuite Project: ${selectedNetsuiteProject.projectNumber || selectedNetsuiteProject.entityId}\nCompany: ${selectedNetsuiteProject.companyName || 'N/A'}`,
          netsuite_project_id: selectedNetsuiteProject.netsuiteId,
          status: 'active'
        })
      });

      if (response.ok) {
        const data = await response.json();
        onProjectCreated && onProjectCreated(data.project);
        handleClose();
      } else {
        setError('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) {
      setError('Project name is required');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          description: customDescription,
          status: 'active'
        })
      });

      if (response.ok) {
        const data = await response.json();
        onProjectCreated && onProjectCreated(data.project);
        handleClose();
      } else {
        setError('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab('netsuite');
    setSearchQuery('');
    setSelectedNetsuiteProject(null);
    setCustomName('');
    setCustomDescription('');
    setError(null);
    onClose();
  };

  const filteredProjects = netsuiteProjects.filter(project => {
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.companyName?.toLowerCase().includes(query) ||
      project.projectNumber?.toLowerCase().includes(query) ||
      project.entityId?.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('netsuite')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'netsuite'
                ? 'border-emtek-navy text-emtek-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Link to NetSuite Project
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-emtek-navy text-emtek-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Custom Project
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'netsuite' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects by name, company, or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emtek-navy focus:border-transparent"
                />
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-emtek-navy animate-spin" />
                  <span className="ml-3 text-gray-600">Loading NetSuite projects...</span>
                </div>
              )}

              {/* Projects List */}
              {!loading && filteredProjects.length === 0 && (
                <div className="text-center py-12">
                  <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">
                    {searchQuery ? 'No projects found matching your search' : 'No NetSuite projects found'}
                  </p>
                </div>
              )}

              {!loading && filteredProjects.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedNetsuiteProject(project)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedNetsuiteProject?.id === project.id
                          ? 'border-emtek-navy bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {project.displayName || project.name}
                          </h3>
                          {project.companyName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <Building2 className="w-4 h-4" />
                              <span>{project.companyName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {project.projectNumber && (
                              <span className="font-mono">#{project.projectNumber}</span>
                            )}
                            {project.startDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(project.startDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedNetsuiteProject?.id === project.id && (
                          <div className="w-6 h-6 bg-emtek-navy rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emtek-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emtek-navy focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'netsuite' ? handleCreateFromNetsuite : handleCreateCustom}
            disabled={loading || (activeTab === 'netsuite' ? !selectedNetsuiteProject : !customName.trim())}
            className="px-6 py-2 bg-emtek-navy text-white rounded-lg hover:bg-emtek-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Create Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}
