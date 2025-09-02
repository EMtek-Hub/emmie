import { getToolConfig, getSession } from '../lib/authz';
import { ExternalLink, MessageCircle, Brain, Zap, Shield, Heart, Lightbulb } from 'lucide-react';

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
              <div className="mx-auto mb-6 animate-scale-in">
                <img 
                  src="/emmie-logo.svg" 
                  alt="Emmie - Your AI Assistant" 
                  className="h-20 w-auto mx-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    console.log('Emmie logo failed to load');
                  }}
                />
              </div>
              <h1 className="text-headline text-emtek-navy mb-2">
                Meet Emmie
              </h1>
              <p className="text-body font-medium text-emtek-blue">Your Intelligent AI Companion</p>
              <img 
                src="/emtek-hub-logo.svg" 
                alt="Powered by EMtek Hub" 
                className="h-8 w-auto mx-auto mt-4 opacity-40"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-body leading-relaxed text-gray-700">
                {toolConfig.description || 'Hello! I\'m Emmie, your friendly AI assistant designed to help you with projects, creative tasks, problem-solving, and meaningful conversations. Let\'s work together to bring your ideas to life.'}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-emtek-navy/10 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-emtek-navy" />
                </div>
                <p className="text-caption font-medium">Conversational</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-emtek-blue/10 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-emtek-blue" />
                </div>
                <p className="text-caption font-medium">Creative</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-emtek-aqua/30 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-emtek-navy" />
                </div>
                <p className="text-caption font-medium">Helpful</p>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              className="btn-primary btn-lg w-full group animate-slide-up"
            >
              <span>Start Chatting with Emmie</span>
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
              <MessageCircle className="w-8 h-8 text-emtek-navy mx-auto mb-3" />
              <h3 className="font-semibold text-emtek-navy mb-2">Natural Conversations</h3>
              <p className="text-caption">Chat naturally with Emmie about anything - from work to creative ideas</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <Brain className="w-8 h-8 text-emtek-blue mx-auto mb-3" />
              <h3 className="font-semibold text-emtek-navy mb-2">Intelligent Support</h3>
              <p className="text-caption">Get help with projects, problem-solving, and creative collaboration</p>
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
