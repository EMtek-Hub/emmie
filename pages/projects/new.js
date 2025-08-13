import { useState } from 'react';
import { useRouter } from 'next/router';
import { requireHubAuth } from '../../lib/authz';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';

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
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="app-layout">
        <Sidebar user={session.user} onSignOut={handleSignOut} />
        <main className="max-w-3xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link 
                href="/projects" 
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--emtek-navy)' }}>
                Create New Project
              </h1>
            </div>
            <p className="text-[#444444]">
              Set up a new project workspace for AI-powered collaboration and knowledge management.
            </p>
          </div>

          {/* Form */}
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name..."
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-600">
                  Choose a clear, descriptive name for your project
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  placeholder="Describe your project goals, scope, and objectives..."
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-600">
                  Optional: Provide context that will help the AI understand your project better
                </p>
              </div>

              {/* Features Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  What you get with your project:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI-powered chat for project discussions</li>
                  <li>• Automatic extraction of decisions, risks, and deadlines</li>
                  <li>• "Ask the Project" feature for instant knowledge retrieval</li>
                  <li>• Structured knowledge base that grows over time</li>
                  <li>• File uploads and project documentation</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <Link 
                  href="/projects"
                  className="btn-secondary px-6 py-2"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="btn px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Getting Started Tips
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">1. Start with a chat:</span> Once your project is created, begin a conversation about your project goals, challenges, or requirements.
              </p>
              <p>
                <span className="font-medium">2. Let AI extract knowledge:</span> As you discuss decisions, deadlines, and risks, the AI will automatically capture and organize this information.
              </p>
              <p>
                <span className="font-medium">3. Use "Ask the Project":</span> At any time, ask questions about your project and get AI-powered answers based on all your discussions.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
