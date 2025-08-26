import { useState } from 'react';
import { LogOut, X, Home, Folder, MessageSquare } from 'lucide-react';
import Link from 'next/link';

/**
 * Basic Sidebar Component for Layout (minimal replacement)
 * This is a simplified version for non-chat pages
 */
export default function Sidebar({ user, links = [], onSignOut, onClose, isMobile = false }) {
  const defaultLinks = [
    { href: '/', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { href: '/projects', label: 'Projects', icon: <Folder className="w-4 h-4" /> },
    { href: '/chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const sidebarLinks = links.length > 0 ? links : defaultLinks;

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      localStorage.removeItem('hubSession');
      window.location.href = '/';
    }
  };

  const containerClasses = isMobile 
    ? "bg-white h-full shadow-strong overflow-y-auto animate-slide-up w-80"
    : "bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col w-64";

  return (
    <aside className={containerClasses}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img 
              src="/emmie-logo.svg" 
              alt="Emmie" 
              className="h-6 w-auto" 
            />
            {isMobile && onClose && (
              <button 
                onClick={onClose} 
                className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => isMobile && onClose && onClose()}
              >
                {link.icon}
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                {(user.name || user.email || 'G')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.name || user.email || "Guest"}
                </div>
                <div className="text-xs text-gray-500">Signed in</div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
