import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToolConfig, requireHubAuth } from '../lib/hubAuth';
import { ArrowRight, Shield, Users, Zap, ExternalLink } from 'lucide-react';

export default function HomePage({ toolConfig, session }) {
  const router = useRouter();

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (session?.user) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleSignIn = () => {
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://auth.emtek.com.au';
    const callbackUrl = `${window.location.origin}/dashboard`;
    window.location.href = `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  // Don't show the page if user is authenticated (will redirect)
  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-[#444444]">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/emtek-hub-logo-light.svg" 
                alt="EMtek Hub" 
                className="h-8 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--emtek-navy)' }}>
                {toolConfig.name}
              </h1>
            </div>
            <button
              onClick={handleSignIn}
              className="btn-primary inline-flex items-center"
            >
              Sign In
              <ExternalLink className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ color: 'var(--emtek-navy)' }}>
              Welcome to {toolConfig.name}
            </h1>
            <p className="text-xl text-[#444444] mb-8 leading-relaxed">
              {toolConfig.description}
            </p>
            <button
              onClick={handleSignIn}
              className="btn-primary text-lg px-8 py-3 inline-flex items-center"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--emtek-navy)' }}>
              Built for Modern Teams
            </h2>
            <p className="text-lg text-[#444444] max-w-2xl mx-auto">
              Seamlessly integrated with EMtek Hub for enterprise-grade security and user management
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(174, 223, 228, 0.18)' }}>
                  <Shield className="w-6 h-6" style={{ color: 'var(--emtek-navy)' }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--emtek-navy)' }}>
                Enterprise Security
              </h3>
              <p className="text-[#444444] leading-relaxed">
                Centralized authentication through EMtek Hub with Azure AD integration and secure session management
              </p>
            </div>
            
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(174, 223, 228, 0.18)' }}>
                  <Users className="w-6 h-6" style={{ color: 'var(--emtek-navy)' }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--emtek-navy)' }}>
                Access Control
              </h3>
              <p className="text-[#444444] leading-relaxed">
                Azure AD group-based permissions managed through EMtek Hub with granular tool access control
              </p>
            </div>
            
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(174, 223, 228, 0.18)' }}>
                  <Zap className="w-6 h-6" style={{ color: 'var(--emtek-navy)' }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--emtek-navy)' }}>
                Production Ready
              </h3>
              <p className="text-[#444444] leading-relaxed">
                Built on modern tech stack with secure cookie-based sessions and server-side rendering
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#f5f5f5]">
        <div className="container mx-auto px-6 text-center">
          <div className="card max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--emtek-navy)' }}>
              Ready to Get Started?
            </h2>
            <p className="text-[#444444] mb-6 leading-relaxed">
              Sign in through EMtek Hub to access this tool and start being productive immediately
            </p>
            <button
              onClick={handleSignIn}
              className="btn-primary text-lg px-8 py-3 inline-flex items-center w-full justify-center"
            >
              Sign In with EMtek Hub
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <p className="text-sm text-gray-500 mt-3">
              Secure authentication powered by Azure AD
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/emtek-hub-logo-light.svg" 
                alt="EMtek Hub" 
                className="h-6 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="text-sm text-[#444444]">Powered by EMtek Hub</span>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} EMtek. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function getServerSideProps(context) {
  const toolConfig = getToolConfig();
  
  // Try to get session - if user is authenticated, they'll be redirected to dashboard on client side
  // This allows the home page to still be shown for unauthenticated users
  try {
    const authResult = await requireHubAuth(context);
    if (authResult.props) {
      // User is authenticated, pass session
      return {
        props: {
          toolConfig,
          session: authResult.props.session,
        },
      };
    }
  } catch (error) {
    // User is not authenticated, show home page
  }
  
  return {
    props: {
      toolConfig,
      session: null,
    },
  };
}
