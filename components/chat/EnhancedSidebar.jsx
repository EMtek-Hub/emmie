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
  currentChatId,
  onProjectSelect,
  onViewModeChange
}) {
  const router = useRouter();
  const toolConfig = getToolConfig();
  const [currentView, setCurrentView] = useState("chat"); // "chat" or "projects"
  const [expandedSections, setExpandedSections] = useState({
    today: true,
    yesterday: true,
    thisWeek: true,
    lastWeek: true,
    thisMonth: true,
    lastMonth: true,
    older: true
  });
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [projects, setProjects] = useState([]);
  const [deleteConfirmingChatId, setDeleteConfirmingChatId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load real projects data from API
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        } else {
          console.error('Failed to fetch projects:', response.status);
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    // Only fetch projects when switching to projects view
    if (currentView === 'projects') {
      fetchProjects();
    }
  }, [currentView]);

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
    'folder': <Folder className="w-4 h-4" />,
    'emmie-icon': <img src="/emmie-icon-d.svg" alt="Emmie" className="w-4 h-4" />
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

  const assistantList = processedAssistants;

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
    // TODO: Open new project modal
    console.log('New project - TODO: implement modal');
  };

  const handleProjectClick = (project) => {
    // Don't navigate - use callback to show project in main area
    if (onProjectSelect) {
      onProjectSelect(project);
    }
    if (onViewModeChange) {
      onViewModeChange('projects');
    }
  };

  const toggleView = (view) => {
    setCurrentView(view);
    if (onViewModeChange) {
      onViewModeChange(view);
    }
  };

  // Time categorization function
  const categorizeChats = (chats) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const categories = {
      today: [],
      yesterday: [],
      thisWeek: [],
      lastWeek: [],
      thisMonth: [],
      lastMonth: [],
      older: []
    };

    chats.forEach(chat => {
      // Use updatedAt for recency, fallback to createdAt
      const chatDate = new Date(chat.updatedAt || chat.createdAt);
      const chatDateOnly = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

      if (chatDateOnly.getTime() === today.getTime()) {
        categories.today.push(chat);
      } else if (chatDateOnly.getTime() === yesterday.getTime()) {
        categories.yesterday.push(chat);
      } else if (chatDate >= thisWeekStart && chatDate < yesterday) {
        categories.thisWeek.push(chat);
      } else if (chatDate >= lastWeekStart && chatDate < thisWeekStart) {
        categories.lastWeek.push(chat);
      } else if (chatDate >= thisMonthStart && chatDate < lastWeekStart) {
        categories.thisMonth.push(chat);
      } else if (chatDate >= lastMonthStart && chatDate <= lastMonthEnd) {
        categories.lastMonth.push(chat);
      } else {
        categories.older.push(chat);
      }
    });

    return categories;
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Handle delete confirmation flow
  const handleDeleteClick = (chatId, event) => {
    event.stopPropagation();
    setDeleteConfirmingChatId(chatId);
  };

  const handleConfirmDelete = (chatId, event) => {
    event.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(chatId);
    }
    setDeleteConfirmingChatId(null);
  };

  const handleCancelDelete = (event) => {
    event.stopPropagation();
    setDeleteConfirmingChatId(null);
  };

  // Reset confirmation state when clicking outside or changing views
  useEffect(() => {
    const handleClickOutside = () => {
      setDeleteConfirmingChatId(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderChatSection = (title, chats, sectionKey) => {
    if (chats.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="mb-4" key={sectionKey}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>{title}</span>
          <span className="text-xs text-gray-400 ml-auto">{chats.length}</span>
        </button>
        
        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {chats.map((chat) => {
              const isDeleting = deleteConfirmingChatId === chat.id;
              
              return (
                <div
                  key={chat.id}
                  className={`w-full px-6 py-2 text-sm rounded-lg transition-all duration-200 truncate group ${
                    isDeleting 
                      ? 'bg-red-50 border border-red-200 text-red-900 cursor-default' 
                      : currentChatId === chat.id 
                        ? 'bg-gray-200 text-gray-900 cursor-pointer' 
                        : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                  }`}
                  onClick={() => !isDeleting && onLoadChat && onLoadChat(chat.id)}
                >
                  {isDeleting ? (
                    // Confirmation state
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-800">Delete this chat?</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleConfirmDelete(chat.id, e)}
                          className="p-1 rounded text-white bg-red-600 hover:bg-red-700 transition-colors"
                          title="Delete"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal state
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 text-left">{chat.title || 'New Chat'}</span>
                      {onDeleteChat && (
                        <button
                          onClick={(e) => handleDeleteClick(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 transition-all"
                          title="Delete chat"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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

      {/* Chats Section */}
      <div className="px-3 py-2 flex-1">
        <h3 className="text-xs font-medium text-gray-600 mb-3 px-3">
          Chats
        </h3>
        
        {chatHistory.length === 0 ? (
          <div className="px-6 py-2 text-sm text-gray-400">
            No chats yet
          </div>
        ) : (
          (() => {
            const categorizedChats = categorizeChats(chatHistory);
            return (
              <div>
                {renderChatSection("Today", categorizedChats.today, "today")}
                {renderChatSection("Yesterday", categorizedChats.yesterday, "yesterday")}
                {renderChatSection("This Week", categorizedChats.thisWeek, "thisWeek")}
                {renderChatSection("Last Week", categorizedChats.lastWeek, "lastWeek")}
                {renderChatSection("This Month", categorizedChats.thisMonth, "thisMonth")}
                {renderChatSection("Last Month", categorizedChats.lastMonth, "lastMonth")}
                {renderChatSection("Older", categorizedChats.older, "older")}
              </div>
            );
          })()
        )}
      </div>
    </>
  );

  // Projects View Content
  const ProjectsViewContent = () => {
    // Categorize projects by status
    const activeProjects = projects.filter(p => p.status === 'active');
    const developmentProjects = projects.filter(p => p.status === 'development' || p.status === 'in_progress');
    const archivedProjects = projects.filter(p => p.status === 'archived' || p.status === 'completed');
    
    return (
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
          <div className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm text-gray-700 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-4 h-4" />
              <span>My Projects</span>
            </div>
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
              {projects.length}
            </span>
          </div>
        </div>


        {/* Recent Projects Section */}
        <div className="px-3 py-2 flex-1">
          <h3 className="text-xs font-medium text-gray-600 mb-3 px-3">
            Recent Projects
          </h3>
          
          {loadingProjects ? (
            <div className="px-6 py-4 text-sm text-gray-400 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span>Loading projects...</span>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-400 text-center">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No projects yet</p>
              <button
                onClick={handleNewProject}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <>
              {/* Active Projects Section */}
              {activeProjects.length > 0 && (
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
                    <span className="text-xs text-gray-400 ml-auto">{activeProjects.length}</span>
                  </button>
                  
                  {isProjectsExpanded && (
                    <div className="mt-1 space-y-0.5">
                      {activeProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectClick(project.id)}
                          className="w-full text-left px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors truncate group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{project.name}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-2">
                              Active
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  if (isMobile) {
    return (
      <aside className="bg-white h-full shadow-strong overflow-y-auto animate-slide-up w-80">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-center relative mb-4">
              <img 
                src="/emmie-logo.svg" 
                alt="Emmie" 
                className="h-10 w-auto max-w-[200px]" 
              />
              <button 
                onClick={onClose} 
                className="absolute right-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
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
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/emmie-logo.svg" 
            alt="Emmie" 
            className="h-10 w-auto max-w-[200px] cursor-pointer" 
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
