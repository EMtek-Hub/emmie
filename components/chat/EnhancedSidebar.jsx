import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Home, 
  Grid, 
  Settings, 
  X, 
  LogOut, 
  ArrowLeft, 
  Sparkles,
  Bot,
  Search,
  Palette,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  User,
  Wrench,
  Users,
  Laptop,
  FileText,
  Code,
  Folder,
  FolderOpen,
  Briefcase
} from "lucide-react";
import { useRouter } from "next/router";
import { getToolConfig } from "../../lib/hubAuth";

/**
 * Enhanced Sidebar Component with Onyx-style layout and Chat/Projects toggle
 * Includes navigation and assistant selection similar to Onyx
 */
export default function EnhancedSidebar({ 
  user, 
  links = [], 
  onSignOut, 
  onClose, 
  isMobile = false,
  assistants = [],
  selectedAssistant,
  onAssistantChange,
  onNewAssistant,
  chatHistory = [],
  onNewChat,
  onLoadChat,
  onDeleteChat,
  currentChatId
}) {
  const router = useRouter();
  const toolConfig = getToolConfig();
  const [currentView, setCurrentView] = useState("chat"); // "chat" or "projects"
  const [isTodayExpanded, setIsTodayExpanded] = useState(true);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [projects, setProjects] = useState([]);

  // Load projects data - TODO: replace with real API calls
  useEffect(() => {
    setProjects([
      { id: 1, name: "EMtek Hub Dashboard", status: "active" },
      { id: 2, name: "Client Portal", status: "active" },
      { id: 3, name: "AI Assistant Platform", status: "development" },
      { id: 4, name: "Documentation System", status: "planning" },
    ]);
  }, []);

  // Default assistants if none provided
  const defaultAssistants = [
    { 
      id: 0, 
      name: "Search", 
      description: "Specialized search and research assistant",
      icon: <Search className="w-4 h-4" />,
      capabilities: ["search"]
    },
    { 
      id: 1, 
      name: "General", 
      description: "General purpose AI assistant",
      icon: <Sparkles className="w-4 h-4" />,
      capabilities: []
    },
    { 
      id: 2, 
      name: "Art", 
      description: "Creative image generation assistant",
      icon: <Palette className="w-4 h-4" />,
      capabilities: ["image"]
    }
  ];

  // Icon registry - maps string names to React components
  const iconRegistry = {
    'bot': <Bot className="w-4 h-4" />,
    'search': <Search className="w-4 h-4" />,
    'palette': <Palette className="w-4 h-4" />,
    'message-square': <MessageSquare className="w-4 h-4" />,
    'sparkles': <Sparkles className="w-4 h-4" />,
    'grid': <Grid className="w-4 h-4" />,
    'settings': <Settings className="w-4 h-4" />,
    'user': <User className="w-4 h-4" />,
    'wrench': <Wrench className="w-4 h-4" />,
    'users': <Users className="w-4 h-4" />,
    'laptop': <Laptop className="w-4 h-4" />,
    'file-text': <FileText className="w-4 h-4" />,
    'code': <Code className="w-4 h-4" />,
    'briefcase': <Briefcase className="w-4 h-4" />,
    'folder': <Folder className="w-4 h-4" />
  };

  // Map department names and icon strings to components
  const getAssistantIcon = (assistant) => {
    // First check if there's a string icon field from the database
    if (assistant.icon && typeof assistant.icon === 'string') {
      const iconComponent = iconRegistry[assistant.icon.toLowerCase()];
      if (iconComponent) {
        return iconComponent;
      }
    }
    
    // If icon is already a React component, return it
    if (assistant.icon && typeof assistant.icon === 'object') {
      return assistant.icon;
    }
    
    // Fallback to department-based mapping
    const deptName = (assistant.department || assistant.name || '').toLowerCase();
    
    if (deptName.includes('drafting') || deptName.includes('design')) {
      return iconRegistry['grid'];
    }
    if (deptName.includes('engineer')) {
      return iconRegistry['wrench'];
    }
    if (deptName.includes('general')) {
      return iconRegistry['sparkles'];
    }
    if (deptName.includes('hr') || deptName.includes('human')) {
      return iconRegistry['users'];
    }
    if (deptName.includes('it') || deptName.includes('support')) {
      return iconRegistry['laptop'];
    }
    if (deptName.includes('search')) {
      return iconRegistry['search'];
    }
    if (deptName.includes('art') || deptName.includes('creative')) {
      return iconRegistry['palette'];
    }
    
    // Final fallback
    return iconRegistry['bot'];
  };

  // Process assistants to add icons
  const processedAssistants = assistants.map(a => ({
    ...a,
    icon: getAssistantIcon(a)
  }));

  const assistantList = processedAssistants.length > 0 ? processedAssistants : defaultAssistants;

  const handleBackToHub = () => {
    window.location.href = toolConfig.hubUrl || 'https://hub.emtek.au';
  };

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      localStorage.removeItem('hubSession');
      router.push('/');
    }
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  const handleChatClick = (chatId) => {
    router.push(`/chat/${chatId}`);
  };

  const handleNewProject = () => {
    router.push('/projects/new');
  };

  const handleProjectClick = (projectId) => {
    router.push(`/projects/${projectId}`);
  };

  const toggleView = (view) => {
    setCurrentView(view);
  };

  // Chat View Content
  const ChatViewContent = () => (
    <>
      {/* New Chat Button */}
      <div className="px-3 py-3">
        <button
          onClick={() => onNewChat ? onNewChat() : handleNewChat()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-left"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
        </button>
      </div>

      {/* My Documents */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <FolderOpen className="w-4 h-4" />
          <span>My Documents</span>
        </button>
      </div>

      {/* Assistants Section */}
      <div className="px-3 py-2">
        <h3 className="text-xs font-medium text-gray-600 mb-2 px-3">
          Assistants
        </h3>
        <div className="space-y-0.5">
          {assistantList.map((assistant) => (
            <button
              key={assistant.id}
              onClick={() => onAssistantChange && onAssistantChange(assistant)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                selectedAssistant?.id === assistant.id
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {assistant.icon}
              <span>{assistant.name}</span>
              {selectedAssistant?.id === assistant.id && (
                <Check className="w-4 h-4 text-gray-600 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Explore Assistants */}
      <div className="px-3 py-2">
        <h3 className="text-xs font-medium text-gray-600 px-3">
          Explore Assistants
        </h3>
      </div>

      {/* Chats Section */}
      <div className="px-3 py-2 flex-1">
        <h3 className="text-xs font-medium text-gray-600 mb-3 px-3">
          Chats
        </h3>
        
        {/* Today Section */}
        <div className="mb-4">
          <button
            onClick={() => setIsTodayExpanded(!isTodayExpanded)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {isTodayExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Today</span>
          </button>
          
          {isTodayExpanded && (
            <div className="mt-1 space-y-0.5">
              {chatHistory.length === 0 ? (
                <div className="px-6 py-2 text-sm text-gray-400">
                  No chats yet
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`w-full px-6 py-2 text-sm rounded-lg transition-colors truncate group cursor-pointer ${
                      currentChatId === chat.id 
                        ? 'bg-gray-200 text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => onLoadChat && onLoadChat(chat.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 text-left">{chat.title || 'New Chat'}</span>
                      {onDeleteChat && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this chat?')) {
                              onDeleteChat(chat.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Projects View Content
  const ProjectsViewContent = () => (
    <>
      {/* New Project Button */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewProject}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-left"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Project</span>
        </button>
      </div>

      {/* My Projects */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <FolderOpen className="w-4 h-4" />
          <span>My Projects</span>
        </button>
      </div>

      {/* Categories Section */}
      <div className="px-3 py-2">
        <h3 className="text-xs font-medium text-gray-600 mb-2 px-3">
          Categories
        </h3>
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Grid className="w-4 h-4" />
            <span>Active</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Code className="w-4 h-4" />
            <span>Development</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Folder className="w-4 h-4" />
            <span>Archived</span>
          </button>
        </div>
      </div>

      {/* Explore Projects */}
      <div className="px-3 py-2">
        <h3 className="text-xs font-medium text-gray-600 px-3">
          Explore Projects
        </h3>
      </div>

      {/* Recent Projects Section */}
      <div className="px-3 py-2 flex-1">
        <h3 className="text-xs font-medium text-gray-600 mb-3 px-3">
          Recent Projects
        </h3>
        
        {/* Active Projects Section */}
        <div className="mb-4">
          <button
            onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {isProjectsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Active Projects</span>
          </button>
          
          {isProjectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="w-full text-left px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors truncate"
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <aside className="bg-white h-full shadow-strong overflow-y-auto animate-slide-up w-80">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/emmie-logo.svg" 
                alt="Emmie" 
                className="h-6 w-auto" 
              />
              <button 
                onClick={onClose} 
                className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => toggleView("chat")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === "chat"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => toggleView("projects")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  currentView === "projects"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Projects
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {currentView === "chat" ? <ChatViewContent /> : <ProjectsViewContent />}
          </div>

          {/* User section */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                {(user?.name || user?.email || 'G')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email || "Guest"}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col w-80">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <img 
            src="/emmie-logo.svg" 
            alt="Emmie" 
            className="h-6 w-auto cursor-pointer" 
            onClick={handleBackToHub}
          />
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => toggleView("chat")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              currentView === "chat"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => toggleView("projects")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              currentView === "projects"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Projects
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView === "chat" ? <ChatViewContent /> : <ProjectsViewContent />}
      </div>

      {/* User section */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
            {(user?.name || user?.email || 'G')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {user?.name || user?.email || "Guest"}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
