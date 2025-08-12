import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Home } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Get user data from query parameters
    const { user, email } = router.query;

    if (user && email) {
      // Set session in localStorage
      const sessionData = {
        user: user,
        email: email,
        authenticated: true,
        timestamp: Date.now()
      };
      
      localStorage.setItem('hubSession', JSON.stringify(sessionData));
      
      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      // No valid auth data, redirect to home
      router.push('/');
    }
  }, [router.query, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#005b99] to-[#003087] flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Home className="w-16 h-16 text-white animate-pulse" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">
          Completing Sign In...
        </h1>
        <p className="text-blue-100">
          Please wait while we authenticate your session
        </p>
      </div>
    </div>
  );
}
