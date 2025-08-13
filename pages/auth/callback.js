import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToolConfig } from '../../lib/hubAuth';

export default function AuthCallback({ toolConfig }) {
  const router = useRouter();

  useEffect(() => {
    const { user, name, id, timestamp } = router.query;
    
    if (user && name && id) {
      // Store session data in sessionStorage for the tool
      const sessionData = {
        user: {
          id,
          email: user,
          name,
        },
        timestamp: parseInt(timestamp) || Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
      
      try {
        sessionStorage.setItem('hub-session', JSON.stringify(sessionData));
        // Redirect to dashboard without URL parameters
        router.replace('/dashboard');
      } catch (error) {
        console.error('Error storing session:', error);
        router.replace('/?error=session_storage_failed');
      }
    } else {
      // No valid session data, redirect to home
      router.replace('/?error=invalid_callback');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p className="text-[#444444]">Processing authentication...</p>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const toolConfig = getToolConfig();
  
  return {
    props: {
      toolConfig,
    },
  };
}
