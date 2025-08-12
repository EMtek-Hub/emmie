import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getToolConfig } from '../lib/hubAuth';
import { BarChart3, FileText, Bell, Settings, CheckCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const router = useRouter();
  const [userSession, setUserSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toolConfig = getToolConfig();

  useEffect(() => {
    // Check for existing session in localStorage
    const existingSession = localStorage.getItem('hubSession');
    
    if (existingSession) {
      try {
        const userData = JSON.parse(existingSession);
        setUserSession(userData);
        setLoading(false);
      } catch (err) {
        console.error('Invalid session data:', err);
        localStorage.removeItem('hubSession');
        router.push('/');
      }
    } else {
      // No session found, redirect to homepage
      router.push('/');
    }
  }, [router]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!userSession) {
    return null; // Will redirect to homepage
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="app-layout">
        <Sidebar 
          user={{
            name: userSession?.name,
            email: userSession?.email
          }}
        />
        <div>
          <main className="max-w-6xl mx-auto p-6">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                Welcome{userSession?.name ? `, ${userSession.name}` : ""}
              </h1>
              <p className="text-gray-700">
                {toolConfig.description}
              </p>
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 text-sm">
                    <span className="font-semibold">Successfully Connected:</span> Your tool is authenticated and ready to use.
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Sample Cards */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Overview</h3>
                  <BarChart3 className="w-6 h-6 text-[#005b99]" />
                </div>
                <p className="text-gray-600 text-sm">
                  This is a sample dashboard card. Replace with your tool's content.
                </p>
                <div className="mt-4">
                  <button className="border border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white rounded-md px-4 py-2 text-sm">
                    View Details
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                  <FileText className="w-6 h-6 text-[#005b99]" />
                </div>
                <p className="text-gray-600 text-sm">
                  Manage your documents and files here.
                </p>
                <div className="mt-4">
                  <button className="border border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white rounded-md px-4 py-2 text-sm">
                    Browse Files
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <Bell className="w-6 h-6 text-[#005b99]" />
                </div>
                <p className="text-gray-600 text-sm">
                  Stay updated with the latest notifications.
                </p>
                <div className="mt-4">
                  <button className="border border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white rounded-md px-4 py-2 text-sm">
                    View All
                  </button>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Getting Started
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-600 mb-4">
                  This is the EMtek Tool Template dashboard. To customize this tool:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Update the tool configuration in your <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env</code> file</li>
                  <li>Customize the dashboard layout and components</li>
                  <li>Add your tool-specific functionality</li>
                  <li>Update the styling to match your brand</li>
                  <li>Test the EMtek Hub integration</li>
                </ol>
                <p className="text-gray-600 mt-4">
                  Check the README.md file for detailed setup instructions.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
