import Link from "next/link";
import { Home, Grid, Settings, Menu, X, LogOut, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";
import { getToolConfig } from "../lib/hubAuth";

/**
 * Tool Sidebar Component matching Hub layout
 * - Desktop: fixed left column with hover animations
 * - Mobile: slide-over panel with smooth transitions
 *
 * Props:
 * - user: { name, email }
 * - links: array of { id, label, href, icon }
 */
export default function Sidebar({ user, links = [] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toolConfig = getToolConfig();

  const defaultLinks = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: <Grid className="w-4 h-4" /> },
    { id: "settings", label: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" /> }
  ];

  const navLinks = links.length ? links : defaultLinks;

  const handleBackToHub = () => {
    window.location.href = toolConfig.hubUrl;
  };

  const handleSignOut = () => {
    // Clear localStorage session
    localStorage.removeItem('hubSession');
    // Redirect to homepage
    router.push('/');
  };

  return (
    <>
      {/* Mobile top bar button */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg text-[#005b99] hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Home className="w-6 h-6 text-[#005b99]" />
            <span className="text-sm font-semibold text-[#005b99]">{toolConfig.name}</span>
          </div>
        </div>
      </div>

      {/* Slide-over for mobile */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setOpen(false)} />
        <aside className={`fixed left-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Home className="w-8 h-8 text-[#005b99]" />
                <span className="font-semibold text-[#005b99]">{toolConfig.name}</span>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="p-2 rounded-lg text-[#005b99] hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Back to Hub link */}
            <div className="mb-6">
              <button
                onClick={handleBackToHub}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#005b99] hover:bg-gray-100 font-medium transition-all duration-200 transform hover:translate-x-1 group w-full text-left"
              >
                <ArrowLeft className="w-4 h-4 transition-colors duration-200 group-hover:text-[#003087]" />
                <span className="transition-colors duration-200 group-hover:text-[#003087]">Back to Hub</span>
              </button>
            </div>

            <nav className="space-y-2 mb-8">
              {navLinks.map((l) => (
                <Link 
                  key={l.id} 
                  href={l.href} 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-[#005b99] font-medium transition-all duration-200 transform hover:translate-x-1 group"
                  onClick={() => setOpen(false)}
                >
                  <span className="transition-colors duration-200 group-hover:text-[#003087]">{l.icon}</span>
                  <span className="transition-colors duration-200 group-hover:text-[#003087]">{l.label}</span>
                </Link>
              ))}
            </nav>

            {/* User section with sign out */}
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-600 mb-1">Signed in as</div>
                <div className="text-sm font-semibold text-[#005b99] truncate">
                  {user?.name || user?.email || "Guest"}
                </div>
                {user?.email && user?.name && (
                  <div className="text-xs text-gray-600 truncate">{user.email}</div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#005b99] text-[#005b99] hover:bg-[#005b99] hover:text-white transition-all duration-200 transform hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 w-72 shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center gap-3 group">
            <Home className="w-8 h-8 text-[#005b99] transition-transform duration-200 group-hover:scale-105" />
            <span className="font-semibold text-[#005b99] transition-transform duration-200 group-hover:scale-105">
              {toolConfig.name}
            </span>
          </div>
        </div>

        {/* Back to Hub link */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={handleBackToHub}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#005b99] hover:bg-gray-100 font-medium transition-all duration-200 transform hover:translate-x-1 group w-full text-left"
          >
            <ArrowLeft className="w-4 h-4 transition-colors duration-200 group-hover:text-[#003087]" />
            <span className="transition-colors duration-200 group-hover:text-[#003087]">Back to Hub</span>
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navLinks.map((l) => (
            <Link 
              key={l.id} 
              href={l.href} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-[#005b99] font-medium transition-all duration-200 transform hover:translate-x-1 group"
            >
              <span className="transition-colors duration-200 group-hover:text-[#003087]">{l.icon}</span>
              <span className="transition-colors duration-200 group-hover:text-[#003087]">{l.label}</span>
            </Link>
          ))}
        </nav>

        {/* User section with sign out */}
        <div className="p-6 border-t border-gray-200">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="text-xs text-gray-600 mb-1">Signed in as</div>
            <div className="text-sm font-semibold text-[#005b99] truncate">
              {user?.name || user?.email || "Guest"}
            </div>
            {user?.email && user?.name && (
              <div className="text-xs text-gray-600 truncate">{user.email}</div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#005b99] text-[#005b99] hover:bg-[#005b99] hover:text-white transition-all duration-200 transform hover:scale-105"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
