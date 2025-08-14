import { useState } from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

export default function Layout({ 
  children, 
  title = 'Emmie - AI Assistant', 
  description = 'Your AI assistant for project management and development',
  user = null,
  showSidebar = true,
  sidebarLinks = [],
  onSignOut = null,
  className = ''
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {showSidebar ? (
          <div className="app-layout">
            {/* Mobile menu button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-white shadow-soft border border-gray-100 text-emtek-navy hover:bg-gray-50 transition-all duration-200"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                <div 
                  className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="absolute left-0 top-0 bottom-0 w-80 max-w-sm">
                  <Sidebar 
                    user={user}
                    links={sidebarLinks}
                    onSignOut={onSignOut}
                    onClose={() => setSidebarOpen(false)}
                    isMobile={true}
                  />
                </div>
              </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden md:block">
              <Sidebar 
                user={user}
                links={sidebarLinks}
                onSignOut={onSignOut}
              />
            </div>

            {/* Main content */}
            <main className={`min-h-screen ${className}`}>
              {children}
            </main>
          </div>
        ) : (
          <main className={`min-h-screen ${className}`}>
            {children}
          </main>
        )}
      </div>
    </>
  );
}

// Predefined layout variants
export function DashboardLayout({ children, user, onSignOut, ...props }) {
  const dashboardLinks = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      href: '/dashboard', 
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    { 
      id: 'projects', 
      label: 'Projects', 
      href: '/projects', 
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      id: 'chat', 
      label: 'AI Chat', 
      href: '/chat', 
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ];

  return (
    <Layout 
      sidebarLinks={dashboardLinks}
      user={user}
      onSignOut={onSignOut}
      {...props}
    >
      {children}
    </Layout>
  );
}

export function ChatLayout({ children, user, onSignOut, ...props }) {
  return (
    <Layout 
      showSidebar={false}
      user={user}
      onSignOut={onSignOut}
      className="p-0"
      {...props}
    >
      {children}
    </Layout>
  );
}
