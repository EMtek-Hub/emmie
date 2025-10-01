import { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Grid, 
  Users, 
  Brain, 
  MessageSquare,
  Calendar,
  Activity,
  Search,
  Settings,
  ArrowLeft
} from 'lucide-react';
import NewProjectModal from './NewProjectModal';

/**
 * Projects Main Content Component
 * Displays projects dashboard or selected project details in the main chat area
 */
export default function ProjectsMainContent({ 
  selectedProject, 
  onProjectSelect,
  onBack 
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'development', 'archived'
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);
  
  const handleProjectCreated = (newProject) => {
    // Refresh projects list
    fetchProjects();
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on selected filter
  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    if (filter === 'active') return project.status === 'active';
    if (filter === 'development') return project.status === 'development' || project.status === 'in_progress';
    if (filter === 'archived') return project.status === 'archived' || project.status === 'completed';
    return true;
  });

  // If a project is selected, show project details
  if (selectedProject) {
    return <ProjectDetailView project={selectedProject} onBack={onBack} />;
  }

  // Otherwise show projects dashboard
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your projects and collaborate with your team</p>
            </div>
            <button 
              onClick={() => setNewProjectModalOpen(true)}
              className="btn-primary gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>

        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-emtek-navy rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'No projects yet' : `No ${filter} projects`}
              </h3>
              <p className="text-gray-600 mb-4">
                {filter === 'all' 
                  ? 'Get started by creating your first project'
                  : `You don't have any ${filter} projects`
                }
              </p>
              {filter === 'all' && (
                <button 
                  onClick={() => setNewProjectModalOpen(true)}
                  className="btn-primary gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onProjectSelect(project)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* New Project Modal */}
      <NewProjectModal
        isOpen={newProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, onClick }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    development: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
    completed: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return (
    <div
      onClick={onClick}
      className="card card-interactive cursor-pointer group hover:shadow-lg transition-all duration-200"
    >
      <div className="card-body">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-emtek-navy/10 rounded-xl flex items-center justify-center group-hover:bg-emtek-navy/20 transition-colors">
            <FolderOpen className="w-5 h-5 text-emtek-navy" />
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
            statusColors[project.status] || statusColors.active
          }`}>
            {project.status || 'active'}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emtek-navy transition-colors">
          {project.name}
        </h3>
        
        {project.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
          {project._count_facts?.[0]?.count > 0 && (
            <div className="flex items-center gap-1">
              <Brain className="w-3 h-3" />
              <span>{project._count_facts[0].count} facts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Project Detail View Component
function ProjectDetailView({ project, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emtek-navy/10 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-emtek-navy" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-4">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'team', label: 'Team', icon: Users },
              { id: 'knowledge', label: 'Knowledge', icon: Brain }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emtek-navy text-emtek-navy'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="card">
                  <div className="card-body">
                    <h3 className="text-lg font-semibold mb-4">Project Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                        <p className="text-sm mt-1">
                          <span className="badge badge-success">{project.status || 'active'}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Created</label>
                        <p className="text-sm mt-1">{new Date(project.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="card">
                  <div className="card-body">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="btn-primary w-full gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Start Chat</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('knowledge')}
                        className="btn-secondary w-full gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        <span>View Knowledge</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <div className="card-body">
                <p className="text-gray-600">Project chat functionality will be integrated here.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold mb-4">Team Members</h3>
                <p className="text-gray-600">Team members will be displayed here.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold mb-4">Project Knowledge</h3>
                <p className="text-gray-600">Extracted knowledge and facts will be displayed here.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
