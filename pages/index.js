import { getToolConfig, getSession } from '../lib/authz';
import { ExternalLink } from 'lucide-react';

export default function HomePage({ toolConfig }) {
  const handleSignIn = () => {
    const hubUrl = 'https://hub.emtek.au';
    const toolOrigin = window.location.origin;
    const callbackUrl = `${toolOrigin}/chat`;
    window.location.href = `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Emmie Logo */}
        <div className="mb-12 animate-scale-in">
          <img 
            src="/emmie-logo.svg" 
            alt="Emmie - Your AI Assistant" 
            className="h-32 w-auto mx-auto"
            onError={(e) => {
              e.target.style.display = 'none';
              console.log('Emmie logo failed to load');
            }}
          />
        </div>

        {/* Simple Welcome Message */}
        <div className="mb-12">
          <h1 className="text-3xl font-light text-gray-800 mb-4">
            Welcome to Emmie
          </h1>
          <p className="text-lg text-gray-600 font-light">
            Your AI Assistant
          </p>
        </div>

        {/* Clean Sign In Button */}
        <button
          onClick={handleSignIn}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 group"
        >
          <span>Get Started</span>
          <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
        </button>
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
