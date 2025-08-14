import Link from 'next/link';
import { useState, useEffect } from 'react';
import { requireHubAuth } from '../../lib/authz';
import { Plus, Calendar, Users, MessageSquare, BarChart3, ArrowLeft, Sparkles } from 'lucide-react';
import { DashboardLayout } from '../../components/Layout';

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
      <DashboardLayout 
        title="Projects - Emmie" 
        user={session.user} 
        onSignOut={handleSignOut}
      >
        {/* Header */}
        <div className="app-header">
          <div className="container-app py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href="/chat"
                  className="btn-ghost gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Chat</span>
                </Link>
                <div className="text-gray-300">|</div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emtek-navy/10 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-emtek-navy" />
                  </div>
                  <h1 className="text-headline">Projects</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="container-app py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card">
                <div className="card-body">
                  <div className="skeleton h-6 w-3/4 mb-4"></div>
                  <div className="skeleton h-4 w-full mb-2"></div>
                  <div className="skeleton h-4 w-2/3 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="skeleton h-8 flex-1"></div>
                    <div className="skeleton h-8 flex-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Projects - Emmie" 
      user={session.user} 
      onSignOut={handleSignOut}
    >
      {/* Header */}
      <div className="app-header animate-slide-up">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/chat"
                className="btn-ghost gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Chat</span>
              </Link>
              <div className="text-gray-300">|</div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emtek-navy/10 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-emtek-navy" />
                </div>
                <h1 className="text-headline">Projects</h1>
              </div>
            </div>
            <Link 
              href="/projects/new" 
              className="btn-primary gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="container-app py-8 animate-fade-in">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16 animate-scale-in">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-title mb-3">
                No projects yet
              </h3>
              <p className="text-body mb-8">
                Get started by creating your first project. Use AI-powered chat to collaborate and automatically extract project knowledge.
              </p>
              <Link href="/projects/new" className="btn-primary btn-lg">
                Create Your First Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <div 
                key={project.id} 
                className="card-interactive group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="card-body">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-title group-hover:text-emtek-navy transition-colors duration-200 line-clamp-2">
                      <Link href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                    </h3>
                    <span className={`badge ml-2 flex-shrink-0 ${
                      project.status === 'active' 
                        ? 'badge-success' 
                        : 'badge-secondary'
                    }`}>
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-body mb-4 line-clamp-3">
                      {project.description}
                    </p>
                  )}

                  {/* Project Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-caption">
                      <BarChart3 className="w-3 h-3 text-emtek-navy" />
                      <span>{project._count_facts?.[0]?.count || 0} facts</span>
                    </div>
                    <div className="flex items-center gap-1 text-caption">
                      <MessageSquare className="w-3 h-3 text-emtek-blue" />
                      <span>{project._count_chats?.[0]?.count || 0} chats</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-4">
                    <Link 
                      href={`/projects/${project.id}`}
                      className="btn-secondary btn-sm flex-1 justify-center"
                    >
                      View Project
                    </Link>
                    <Link 
                      href={`/projects/${project.id}?tab=chat`}
                      className="btn-primary btn-sm flex-1 justify-center"
                    >
                      Start Chat
                    </Link>
                  </div>

                  {/* Project Meta */}
                  <div className="pt-4 border-t border-gray-100 space-y-1">
                    <div className="flex items-center gap-2 text-caption">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    {project.created_by_user && (
                      <div className="flex items-center gap-2 text-caption">
                        <Users className="w-3 h-3" />
                        <span>by {project.created_by_user.display_name || project.created_by_user.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
