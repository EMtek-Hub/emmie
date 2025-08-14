import { getToolConfig, getSession } from '../lib/authz';
import { ExternalLink, Sparkles, Brain, Zap, Shield } from 'lucide-react';

export default function HomePage({ toolConfig }) {
  const handleSignIn = () => {
    const hubUrl = 'https://hub.emtek.au';
    const toolOrigin = window.location.origin;
    const callbackUrl = `${toolOrigin}/chat`;
    window.location.href = `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emtek-aqua/10 flex items-center justify-center p-4">
      <div className="max-w-lg w-full animate-fade-in">
        {/* Main Login Card */}
        <div className="card-hover text-center">
          <div className="card-body">
            {/* Logo and Tool Name */}
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emtek-navy to-emtek-blue rounded-3xl flex items-center justify-center shadow-glow animate-scale-in">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <img 
                src="/emtek-hub-logo.svg" 
                alt="EMtek Hub" 
                className="h-12 w-auto mx-auto mb-4 opacity-60"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <h1 className="text-headline text-emtek-navy mb-2">
                {toolConfig.name || 'Emmie'}
              </h1>
              <p className="text-body font-medium">AI-Powered Assistant</p>
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-body leading-relaxed">
                {toolConfig.description || 'Your intelligent AI assistant for project management, development workflows, and team collaboration.'}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-emtek-navy/10 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-emtek-navy" />
                </div>
                <p className="text-caption font-medium">Smart AI</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-emtek-blue/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emtek-blue" />
                </div>
                <p className="text-caption font-medium">Fast Response</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-caption font-medium">Secure</p>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              className="btn-primary btn-lg w-full group animate-slide-up"
            >
              <span>Sign In with EMtek Hub</span>
              <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>

            {/* Security Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
              <Shield className="w-4 h-4 text-green-600" />
              <p className="text-caption text-green-700 font-medium">
                Secured by Azure AD & EMtek Hub
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="card">
            <div className="card-body text-center">
              <Sparkles className="w-8 h-8 text-emtek-navy mx-auto mb-3" />
              <h3 className="font-semibold text-emtek-navy mb-2">AI Chat</h3>
              <p className="text-caption">Intelligent conversations with context-aware responses</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <Brain className="w-8 h-8 text-emtek-blue mx-auto mb-3" />
              <h3 className="font-semibold text-emtek-navy mb-2">Smart Projects</h3>
              <p className="text-caption">AI-enhanced project management and collaboration</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-caption">
            © {new Date().getFullYear()} EMtek. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const toolConfig = getToolConfig();
  
  // Check if user is already authenticated - if so, redirect to chat
  const session = await getSession(context.req);
  if (session && session.user) {
    return {
      redirect: {
        destination: '/chat',
        permanent: false,
      },
    };
  }
  
  // User is not authenticated, show home page
  return {
    props: {
      toolConfig,
    },
  };
}
