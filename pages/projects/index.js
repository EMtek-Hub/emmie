import Link from 'next/link';
import { useState, useEffect } from 'react';
import { requireHubAuth } from '../../lib/authz';
import { Plus, Calendar, Users, MessageSquare, BarChart3 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context, process.env.TOOL_SLUG);
  if (authResult.redirect) return authResult;
  return { props: { session: authResult.props.session } };
}

export default function Projects({ session }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emtek.au'}/api/auth/signout`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="app-layout">
          <Sidebar user={session.user} onSignOut={handleSignOut} />
          <main className="max-w-6xl mx-auto p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card h-48">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="app-layout">
        <Sidebar user={session.user} onSignOut={handleSignOut} />
        <main className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--emtek-navy)' }}>
                Projects
              </h1>
              <p className="text-[#444444] mt-2">
                Manage your project workspace with AI-powered collaboration
              </p>
            </div>
            <Link 
              href="/projects/new" 
              className="btn flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No projects yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first project. Use AI-powered chat to collaborate and automatically extract project knowledge.
                </p>
                <Link href="/projects/new" className="btn">
                  Create Your First Project
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="card group hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                      <Link href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-[#444444] text-sm mb-4 line-clamp-3">
                      {project.description}
                    </p>
                  )}

                  {/* Project Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      <span>{project._count_facts?.[0]?.count || 0} facts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{project._count_chats?.[0]?.count || 0} chats</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Link 
                      href={`/projects/${project.id}`}
                      className="btn-secondary text-sm flex-1 text-center"
                    >
                      View Project
                    </Link>
                    <Link 
                      href={`/projects/${project.id}/chat/new`}
                      className="btn text-sm flex-1 text-center"
                    >
                      Start Chat
                    </Link>
                  </div>

                  {/* Project Meta */}
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    {project.created_by_user && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" />
                        <span>by {project.created_by_user.display_name || project.created_by_user.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
