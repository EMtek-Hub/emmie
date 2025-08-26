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
  return (
    <Layout 
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
