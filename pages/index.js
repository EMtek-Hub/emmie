import { getToolConfig, getSession } from '../lib/authz';
import { ExternalLink } from 'lucide-react';

export default function HomePage({ toolConfig }) {
  const handleSignIn = () => {
    const hubUrl = 'https://auth.emtek.com.au';
    const toolOrigin = window.location.origin;
    const callbackUrl = `${toolOrigin}/dashboard`;
    window.location.href = `${hubUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Main Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Logo and Tool Name */}
          <div className="mb-8">
            <img 
              src="/emtek-hub-logo.svg" 
              alt="EMtek Hub" 
              className="h-16 w-auto mx-auto mb-4"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--emtek-navy)' }}>
              {toolConfig.name}
            </h1>
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-[#444444] leading-relaxed">
              {toolConfig.description}
            </p>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            className="btn-primary w-full text-lg px-6 py-3 inline-flex items-center justify-center"
          >
            Sign In with EMtek Hub
            <ExternalLink className="w-5 h-5 ml-2" />
          </button>

          {/* Powered by text */}
          <p className="text-sm text-gray-500 mt-4">
            Secure authentication powered by Azure AD
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} EMtek. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const toolConfig = getToolConfig();
  
  // Check if user is already authenticated - if so, redirect to dashboard
  const session = await getSession(context.req);
  if (session && session.user) {
    return {
      redirect: {
        destination: '/dashboard',
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
