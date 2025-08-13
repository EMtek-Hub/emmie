import { getToolConfig, requireHubAuth } from '../lib/authz';
import { BarChart3, FileText, Bell, Settings, CheckCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Dashboard({ toolConfig, session }) {
  const handleSignOut = () => {
    // For client-side, we need to hardcode the Hub URL or pass it as prop
    window.location.href = 'https://auth.emtek.com.au/api/auth/signout';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="app-layout">
        <Sidebar user={session.user} onSignOut={handleSignOut} />
        <div>
          <main className="max-w-6xl mx-auto p-6">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--emtek-navy)' }}>
                Welcome{session.user?.name ? `, ${session.user.name}` : ""}
              </h1>
              <p className="text-[#444444]">
                {toolConfig.description}
              </p>
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 text-sm">
                    <span className="font-semibold">Successfully Connected:</span> Your tool is authenticated through EMtek Hub and ready to use.
                  </p>
                </div>
              </div>
            </div>

            {/* User Info Debug Card (can be removed in production) */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Session Information</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <p><span className="font-medium">User ID:</span> {session.user?.id}</p>
                <p><span className="font-medium">Email:</span> {session.user?.email}</p>
                <p><span className="font-medium">Name:</span> {session.user?.name}</p>
                <p><span className="font-medium">Tool:</span> {toolConfig.slug} v{toolConfig.version}</p>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Sample Cards */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--emtek-navy)' }}>Overview</h3>
                  <BarChart3 className="w-6 h-6" style={{ color: 'var(--emtek-blue)' }} />
                </div>
                <p className="text-[#444444] text-sm">
                  This is a sample dashboard card. Replace with your tool's content.
                </p>
                <div className="mt-4">
                  <button className="btn-secondary text-sm">
                    View Details
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--emtek-navy)' }}>Documents</h3>
                  <FileText className="w-6 h-6" style={{ color: 'var(--emtek-blue)' }} />
                </div>
                <p className="text-[#444444] text-sm">
                  Manage your documents and files here.
                </p>
                <div className="mt-4">
                  <button className="btn-secondary text-sm">
                    Browse Files
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--emtek-navy)' }}>Notifications</h3>
                  <Bell className="w-6 h-6" style={{ color: 'var(--emtek-blue)' }} />
                </div>
                <p className="text-[#444444] text-sm">
                  Stay updated with the latest notifications.
                </p>
                <div className="mt-4">
                  <button className="btn-secondary text-sm">
                    View All
                  </button>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--emtek-navy)' }}>
                Getting Started with EMtek Hub Authentication
              </h3>
              <div className="prose max-w-none">
                <p className="text-[#444444] mb-4">
                  This tool template now uses centralized authentication through EMtek Hub with the following features:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[#444444]">
                  <li><strong>Centralized OAuth2/OIDC:</strong> All authentication handled by EMtek Hub with Azure AD</li>
                  <li><strong>Secure Sessions:</strong> HttpOnly cookies on shared domain (no localStorage auth)</li>
                  <li><strong>Group-based Access:</strong> Azure AD group to tool mapping managed through Hub admin</li>
                  <li><strong>Server-side Security:</strong> All authentication checks happen server-side</li>
                  <li><strong>API Protection:</strong> Use <code className="bg-gray-100 px-2 py-1 rounded text-sm">withHubAuth</code> middleware for API routes</li>
                </ul>
                <p className="text-[#444444] mt-4">
                  To customize this tool for your needs:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-[#444444]">
                  <li>Update environment variables in <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env</code></li>
                  <li>Configure your tool in EMtek Hub admin panel</li>
                  <li>Set up Azure AD group mappings for access control</li>
                  <li>Customize the dashboard layout and add your tool's functionality</li>
                  <li>Use <code className="bg-gray-100 px-2 py-1 rounded text-sm">requireHubAuth</code> for protected pages</li>
                </ol>
                <p className="text-[#444444] mt-4">
                  Check the updated README.md file for detailed setup instructions.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
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
