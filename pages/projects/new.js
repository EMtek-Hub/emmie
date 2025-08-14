import { useState } from 'react';
import { useRouter } from 'next/router';
import { requireHubAuth } from '../../lib/authz';
import { ArrowLeft, Plus, FileText, MessageSquare, Brain, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/Layout';

export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context, process.env.TOOL_SLUG);
  if (authResult.redirect) return authResult;
  return { props: { session: authResult.props.session } };
}

export default function NewProject({ session }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const { project } = await response.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emtek.au'}/api/auth/signout`;
  };

  return (
    <DashboardLayout 
      title="Create New Project - Emmie" 
      user={session.user} 
      onSignOut={handleSignOut}
    >
      {/* Header */}
      <div className="app-header animate-slide-up">
        <div className="container-app py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/projects" 
              className="btn-ghost gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Projects</span>
            </Link>
            <div className="text-gray-300">|</div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <h1 className="text-headline">Create New Project</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="container-app py-8 max-w-4xl animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-title">Project Details</h2>
                <p className="text-body mt-1">
                  Set up your AI-powered workspace for intelligent collaboration
                </p>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="card-body space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter a descriptive project name..."
                      disabled={loading}
                    />
                    <p className="mt-2 text-caption">
                      Choose a clear, descriptive name that represents your project's purpose
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      className="textarea"
                      placeholder="Describe your project goals, scope, and objectives..."
                      disabled={loading}
                    />
                    <p className="mt-2 text-caption">
                      Optional: Provide context to help AI understand your project better
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="card-footer">
                  <div className="flex gap-3">
                    <Link 
                      href="/projects"
                      className="btn-secondary"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                      className="btn-primary gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner w-4 h-4"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Create Project</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Features Card */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-emtek-navy" />
                  <h3 className="text-title">AI-Powered Features</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-emtek-blue mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">Smart Conversations</p>
                      <p className="text-caption">AI-powered chat for project discussions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Brain className="w-4 h-4 text-emtek-navy mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">Knowledge Extraction</p>
                      <p className="text-caption">Automatic capture of decisions, risks, and deadlines</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">Smart Documentation</p>
                      <p className="text-caption">Organized knowledge base that grows over time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started Card */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-title mb-4">Getting Started</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-emtek-navy text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Start a conversation</p>
                      <p className="text-caption">Begin discussing your project goals and requirements</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-emtek-blue text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Let AI work</p>
                      <p className="text-caption">AI automatically extracts and organizes key information</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Ask questions</p>
                      <p className="text-caption">Get AI-powered answers based on project knowledge</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="card bg-gradient-to-br from-emtek-navy/5 to-emtek-blue/5 border-emtek-navy/10">
              <div className="card-body">
                <h3 className="font-semibold text-emtek-navy mb-3">💡 Pro Tips</h3>
                <ul className="space-y-2 text-caption">
                  <li>• Be descriptive in your project name and description</li>
                  <li>• Start with your main objectives and challenges</li>
                  <li>• The more context you provide, the smarter AI becomes</li>
                  <li>• Use natural language - no need for formal documentation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
