import Link from "next/link";
import { Home, Grid, Settings, X, LogOut, ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/router";
import { getToolConfig } from "../lib/hubAuth";

/**
 * Modern Sidebar Component
 * - Desktop: fixed left column with smooth animations
 * - Mobile: slide-over panel with backdrop blur
 *
 * Props:
 * - user: { name, email }
 * - links: array of { id, label, href, icon }
 * - onSignOut: function to handle sign out
 * - onClose: function to close mobile sidebar
 * - isMobile: boolean for mobile variant
 */
export default function Sidebar({ user, links = [], onSignOut, onClose, isMobile = false }) {
  const router = useRouter();
  const toolConfig = getToolConfig();

  const defaultLinks = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: <Grid className="w-4 h-4" /> },
    { id: "projects", label: "Projects", href: "/projects", icon: <Home className="w-4 h-4" /> },
    { id: "chat", label: "AI Chat", href: "/chat", icon: <Sparkles className="w-4 h-4" /> },
  ];

  const navLinks = links.length ? links : defaultLinks;

  const handleBackToHub = () => {
    window.location.href = toolConfig.hubUrl || 'https://hub.emtek.au';
  };

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      // Fallback - Clear localStorage session and redirect
      localStorage.removeItem('hubSession');
      router.push('/');
    }
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isActive = (href) => {
    if (href === '/') return router.pathname === href;
    return router.pathname.startsWith(href);
  };

  if (isMobile) {
    return (
      <aside className="bg-white h-full shadow-strong overflow-y-auto animate-slide-up">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="w-full">
              <img 
                src="/emmie-logo.svg" 
                alt="Emmie" 
                className="w-full h-auto max-w-full cursor-pointer" 
                onClick={handleBackToHub}
                style={{ maxHeight: '40px' }}
              />
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Back to Hub */}
          <div className="mb-6">
            <button
              onClick={handleBackToHub}
              className="btn-ghost w-full justify-start gap-3"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Hub</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            {navLinks.map((link) => (
              <Link 
                key={link.id} 
                href={link.href} 
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group ${
                  isActive(link.href) 
                    ? 'bg-emtek-navy/10 text-emtek-navy shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-emtek-navy'
                }`}
              >
                <span className={`transition-all duration-200 ${
                  isActive(link.href) ? 'text-emtek-navy scale-110' : 'group-hover:scale-110'
                }`}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
                {isActive(link.href) && (
                  <div className="ml-auto w-2 h-2 bg-emtek-navy rounded-full animate-scale-in"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-100 pt-6 mt-auto">
            <div className="card-body bg-gradient-to-br from-emtek-navy/5 to-emtek-blue/5 mb-4 rounded-2xl border border-emtek-navy/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emtek-navy rounded-xl flex items-center justify-center text-white font-semibold">
                  {(user?.name || user?.email || 'G')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-emtek-navy truncate">
                    {user?.name || user?.email || "Guest"}
                  </div>
                  {user?.email && user?.name && (
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="btn-secondary w-full justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white border-r border-gray-100 h-screen sticky top-0 flex flex-col shadow-soft animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="w-full cursor-pointer" onClick={handleBackToHub}>
          <img 
            src="/emmie-logo.svg" 
            alt="Emmie" 
            className="w-full h-auto max-w-full hover:opacity-80 transition-opacity duration-300" 
            style={{ maxHeight: '40px' }}
          />
        </div>
      </div>

      {/* Back to Hub */}
      <div className="p-6 border-b border-gray-100">
        <button
          onClick={handleBackToHub}
          className="btn-ghost w-full justify-start gap-3 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span>Back to Hub</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
          Navigation
        </p>
        {navLinks.map((link) => (
          <Link 
            key={link.id} 
            href={link.href} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group ${
              isActive(link.href) 
                ? 'bg-emtek-navy/10 text-emtek-navy shadow-sm border border-emtek-navy/20' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-emtek-navy hover:translate-x-1'
            }`}
          >
            <span className={`transition-all duration-200 ${
              isActive(link.href) ? 'text-emtek-navy scale-110' : 'group-hover:scale-110'
            }`}>
              {link.icon}
            </span>
            <span>{link.label}</span>
            {isActive(link.href) && (
              <div className="ml-auto w-2 h-2 bg-emtek-navy rounded-full animate-scale-in"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-6 border-t border-gray-100 bg-gradient-to-t from-gray-50/50">
        <div className="card-body bg-gradient-to-br from-emtek-navy/5 to-emtek-blue/5 mb-4 rounded-2xl border border-emtek-navy/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emtek-navy rounded-xl flex items-center justify-center text-white font-semibold shadow-sm">
              {(user?.name || user?.email || 'G')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-emtek-navy truncate">
                {user?.name || user?.email || "Guest"}
              </div>
              {user?.email && user?.name && (
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="btn-secondary w-full justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
