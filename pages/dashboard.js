import { getToolConfig, requireHubAuth } from '../lib/authz';
import { BarChart3, FileText, MessageSquare, Sparkles, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { DashboardLayout } from '../components/Layout';
import Link from 'next/link';

export default function Dashboard({ toolConfig, session }) {
  // Redirect to chat interface for now (can be removed if dashboard becomes main landing)
  if (typeof window !== 'undefined') {
    // Optional: Remove this redirect if you want dashboard as main page
    // window.location.href = '/chat';
    // return null;
  }

  const handleSignOut = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emtek.au'}/api/auth/signout`;
  };

  return (
    <DashboardLayout 
      title={`Dashboard - ${toolConfig.name || 'Emmie'}`}
      user={session.user} 
      onSignOut={handleSignOut}
    >
      <div className="container-app py-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emtek-navy/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-emtek-navy" />
            </div>
            <h1 className="text-display">
              Welcome{session.user?.name ? `, ${session.user.name.split(' ')[0]}` : ""}
            </h1>
          </div>
          <p className="text-body max-w-2xl mb-6">
            {toolConfig.description || 'Your AI assistant is ready to help with project management, development workflows, and intelligent collaboration.'}
          </p>
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl animate-scale-in">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Connected to EMtek Hub
            </span>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/chat" className="card-interactive group">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emtek-navy/10 rounded-xl group-hover:bg-emtek-navy/20 transition-colors duration-200">
                  <MessageSquare className="w-6 h-6 text-emtek-navy" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emtek-navy group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-title mb-2 group-hover:text-emtek-navy transition-colors duration-200">
                Start AI Chat
              </h3>
              <p className="text-body">
                Begin a conversation with your AI assistant for instant help and intelligent responses.
              </p>
            </div>
          </Link>

          <Link href="/projects" className="card-interactive group">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emtek-blue/10 rounded-xl group-hover:bg-emtek-blue/20 transition-colors duration-200">
                  <BarChart3 className="w-6 h-6 text-emtek-blue" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emtek-blue group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-title mb-2 group-hover:text-emtek-blue transition-colors duration-200">
                View Projects
              </h3>
              <p className="text-body">
                Manage your AI-powered project workspaces with automated knowledge extraction.
              </p>
            </div>
          </Link>

          <Link href="/projects/new" className="card-interactive group">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors duration-200">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-title mb-2 group-hover:text-green-600 transition-colors duration-200">
                New Project
              </h3>
              <p className="text-body">
                Create a new project workspace to start collaborating with AI assistance.
              </p>
            </div>
          </Link>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-emtek-navy" />
                <h3 className="text-title">AI-Powered Features</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emtek-navy rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Intelligent Chat</p>
                    <p className="text-body">Context-aware conversations with advanced AI capabilities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emtek-blue rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Knowledge Extraction</p>
                    <p className="text-body">Automatic capture of decisions, risks, and project insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Smart Projects</p>
                    <p className="text-body">AI-enhanced project management and collaboration tools</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-title mb-4">Session Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-caption font-medium text-gray-500">User ID</span>
                  <span className="text-body font-mono text-xs">{session.user?.id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-caption font-medium text-gray-500">Email</span>
                  <span className="text-body">{session.user?.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-caption font-medium text-gray-500">Name</span>
                  <span className="text-body">{session.user?.name}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-caption font-medium text-gray-500">Tool Version</span>
                  <span className="text-body">{toolConfig.slug} v{toolConfig.version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-title">Getting Started Guide</h3>
          </div>
          <div className="card-body">
            <div className="prose max-w-none">
              <p className="text-body mb-6">
                Your AI assistant is now connected to EMtek Hub with enterprise-grade security and intelligent features:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Security Features</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span className="text-body">Centralized OAuth2/OIDC authentication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span className="text-body">Secure HttpOnly cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span className="text-body">Azure AD group-based access control</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">AI Capabilities</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emtek-navy mt-0.5" />
                      <span className="text-body">Advanced language understanding</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emtek-navy mt-0.5" />
                      <span className="text-body">Context-aware responses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emtek-navy mt-0.5" />
                      <span className="text-body">Project knowledge management</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-emtek-navy/5 border border-emtek-navy/10 rounded-xl p-4">
                <h4 className="font-semibold text-emtek-navy mb-2">Next Steps</h4>
                <ol className="list-decimal list-inside space-y-1 text-body">
                  <li>Start a conversation in the AI Chat to explore capabilities</li>
                  <li>Create your first project workspace for organized collaboration</li>
                  <li>Explore knowledge extraction features through project discussions</li>
                  <li>Set up team access through EMtek Hub admin panel</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export async function getServerSideProps(context) {
  const toolConfig = getToolConfig();
  
  // Require authentication and per-tool permission for this page
  const authResult = await requireHubAuth(context, process.env.TOOL_SLUG);
  
  // If redirect is returned, user will be redirected to Hub auth or unauthorised
  if (authResult.redirect) {
    return authResult;
  }
  
  return {
    props: {
      toolConfig,
      session: authResult.props.session,
    },
  };
}
