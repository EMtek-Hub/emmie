import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getToolConfig } from '../lib/hubAuth';
import { Home, ArrowRight, Shield, Users, Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const toolConfig = getToolConfig();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userSession, setUserSession] = useState(null);

  useEffect(() => {
    async function handleAuthCallback() {
      // Check if this is a callback from the Hub
      const urlParams = new URLSearchParams(window.location.search);
      
      // Look for session data in URL params (this is how Hub might return data)
      const sessionData = urlParams.get('session');
      const userName = urlParams.get('name');
      const userEmail = urlParams.get('email');
      
      if (sessionData || userName || userEmail) {
        // We have auth data from Hub callback - create local session
        setIsAuthenticating(true);
        
        const userData = {
          name: userName || 'Hub User',
          email: userEmail || 'user@emtek.com.au',
          id: 'hub-user-' + Date.now()
        };
        
        // Store session in localStorage
        localStorage.setItem('hubSession', JSON.stringify(userData));
        setUserSession(userData);
        
        // Clean URL and redirect to dashboard
        window.history.replaceState({}, document.title, window.location.pathname);
        router.push('/dashboard');
      } else {
        // Check for existing session
        const existingSession = localStorage.getItem('hubSession');
        if (existingSession) {
          setUserSession(JSON.parse(existingSession));
          router.push('/dashboard');
        }
      }
    }

    if (router.isReady) {
      handleAuthCallback();
    }
  }, [router]);

  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = () => {
    // Redirect to Hub with callback URL pointing to dashboard for proper flow
    window.location.href = `${toolConfig.hubUrl}/auth/signin?callbackUrl=${encodeURIComponent(window.location.origin + '/dashboard')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emtek-navy to-emtek-blue">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Home className="w-12 h-12 text-white mr-4" />
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {toolConfig.name}
            </h1>
          </div>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            {toolConfig.description}
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <Shield className="w-12 h-12 text-emtek-navy mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure Access
            </h3>
            <p className="text-gray-700">
              Integrated with EMtek Hub SSO for secure, centralized authentication
            </p>
          </div>
          
          <div className="card text-center">
            <Users className="w-12 h-12 text-emtek-navy mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              User Management
            </h3>
            <p className="text-gray-700">
              Granular access control managed through the EMtek Hub admin panel
            </p>
          </div>
          
          <div className="card text-center">
            <Zap className="w-12 h-12 text-emtek-navy mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Use
            </h3>
            <p className="text-gray-700">
              Built on the EMtek tool template with modern React and Tailwind CSS
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="card max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Get Started
            </h2>
            <p className="text-gray-700 mb-6">
              Sign in through EMtek Hub to access this tool
            </p>
            <button
              onClick={handleSignIn}
              className="btn-primary inline-flex items-center text-lg px-8 py-3"
            >
              Sign In with EMtek Hub
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
