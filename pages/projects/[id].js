import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { requireHubAuth } from '../../lib/authz';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
  ArrowLeft,
  MessageSquare,
  FolderOpen,
  Users,
  Brain,
  Send,
  Bot,
  User,
  FileText,
  Folder,
  Settings,
  Plus,
  Search,
  Calendar,
  Activity,
  Sparkles,
  Download,
  GitBranch,
  Copy,
  Check
} from 'lucide-react';

export default function ProjectPage({ session }) {
  const router = useRouter();
  const { id, tab } = router.query;
  
  // Project data
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chat state
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // UI state
  const [activeTab, setActiveTab] = useState(tab || 'overview');
  const [selectedFile, setSelectedFile] = useState(null);

  // Mock data for now
  const [files] = useState([
    {
      id: 1,
      name: 'src',
      type: 'folder',
      children: [
        { id: 2, name: 'components', type: 'folder', children: [
          { id: 3, name: 'Header.jsx', type: 'file', size: '2.1 KB', modified: '2 hours ago' },
          { id: 4, name: 'Sidebar.jsx', type: 'file', size: '3.4 KB', modified: '1 day ago' }
        ]},
        { id: 5, name: 'pages', type: 'folder', children: [
          { id: 6, name: 'index.js', type: 'file', size: '1.8 KB', modified: '3 hours ago' }
        ]}
      ]
    },
    { id: 7, name: 'package.json', type: 'file', size: '1.2 KB', modified: '1 week ago' },
    { id: 8, name: 'README.md', type: 'file', size: '895 B', modified: '2 days ago' }
  ]);

  const [teamMembers] = useState([
    { id: 1, name: 'John Smith', email: 'john@emtek.au', role: 'Lead Developer', avatar: 'JS', lastActive: '2 hours ago', contributions: 23 },
    { id: 2, name: 'Sarah Wilson', email: 'sarah@emtek.au', role: 'Designer', avatar: 'SW', lastActive: '1 day ago', contributions: 15 },
    { id: 3, name: 'Mike Johnson', email: 'mike@emtek.au', role: 'Developer', avatar: 'MJ', lastActive: '3 hours ago', contributions: 18 }
  ]);

  const [projectFacts] = useState([
    { id: 1, title: 'Uses React 18 with Next.js framework', type: 'technology', addedBy: 'John Smith', addedAt: '2 days ago' },
    { id: 2, title: 'Authentication handled via Azure AD integration', type: 'architecture', addedBy: 'Sarah Wilson', addedAt: '1 day ago' },
    { id: 3, title: 'Database schema includes users, projects, and chat_sessions tables', type: 'database', addedBy: 'Mike Johnson', addedAt: '3 hours ago' },
    { id: 4, title: 'AI chat functionality powered by OpenAI GPT-4', type: 'feature', addedBy: 'John Smith', addedAt: '1 hour ago' }
  ]);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchProjectChat();
    }
  }, [id]);

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectChat = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/chats`);
      if (response.ok) {
        const data = await response.json();
        const chats = data.chats || [];
        
        if (chats.length > 0) {
          // Load messages from the most recent chat session
          const latestChat = chats[0];
          const messagesResponse = await fetch(`/api/projects/${id}/chats/${latestChat.id}/messages`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            const formattedMessages = messagesData.messages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content_md,
              timestamp: new Date(msg.created_at)
            }));
            setMessages(formattedMessages);
          }
        } else {
          // No previous chats, show welcome message
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: "Hello! I'm here to help with your project. I have access to all project files and can answer questions about the codebase, architecture, or help with development tasks.",
              timestamp: new Date()
            }
          ]);
        }
      } else {
        // Fallback to welcome message on error
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm here to help with your project. I have access to all project files and can answer questions about the codebase, architecture, or help with development tasks.",
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      // Fallback to welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm here to help with your project. I have access to all project files and can answer questions about the codebase, architecture, or help with development tasks.",
          timestamp: new Date()
        }
      ]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = { 
      id: Date.now(), 
      role: 'user', 
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1;
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch(`/api/projects/${id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: currentMessage }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.delta) {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: msg.content + data.delta }
                    : msg
                ));
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const renderFileTree = (items, level = 0) => {
    return items.map(item => (
      <div key={item.id} className={`ml-${level * 4}`}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
            selectedFile?.id === item.id ? 'bg-emtek-navy/10 text-emtek-navy' : ''
          }`}
          onClick={() => setSelectedFile(item)}
        >
          {item.type === 'folder' ? (
            <Folder className="w-4 h-4 text-emtek-blue" />
          ) : (
            <FileText className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium">{item.name}</span>
          {item.type === 'file' && (
            <span className="text-xs text-gray-500 ml-auto">{item.size}</span>
          )}
        </div>
        {item.children && renderFileTree(item.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="app-header">
          <div className="container-app py-4">
            <div className="skeleton h-8 w-64"></div>
          </div>
        </div>
        <div className="container-app py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-body">
                  <div className="skeleton h-6 w-48 mb-4"></div>
                  <div className="skeleton h-4 w-full mb-2"></div>
                  <div className="skeleton h-4 w-3/4"></div>
                </div>
              </div>
            </div>
            <div className="skeleton h-64 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md w-full">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-title mb-2">Error Loading Project</h3>
            <p className="text-body mb-4">{error}</p>
            <Link href="/projects" className="btn-primary">
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="app-header animate-slide-up">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/projects"
                className="btn-ghost gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Projects</span>
              </Link>
              <div className="text-gray-300">|</div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emtek-navy/10 rounded-xl">
                  <FolderOpen className="w-5 h-5 text-emtek-navy" />
                </div>
                <div>
                  <h1 className="text-title font-bold">{project?.name || 'Project'}</h1>
                  <p className="text-caption">
                    {project?.status && (
                      <span className={`badge badge-sm ${
                        project.status === 'active' ? 'badge-success' : 'badge-secondary'
                      }`}>
                        {project.status}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2">
                <Settings className="w-4 h-4" />
              </button>
              <button className="btn-secondary gap-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container-app">
          <div className="flex gap-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'files', label: 'Files', icon: FolderOpen },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'team', label: 'Team', icon: Users },
              { id: 'knowledge', label: 'Knowledge', icon: Brain }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-emtek-navy text-emtek-navy'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="container-app py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="text-title mb-4">Project Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-caption font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                      <p className="text-body mt-1">
                        {project?.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-caption font-semibold text-gray-500 uppercase tracking-wider">Created</label>
                        <p className="text-body mt-1">
                          {project?.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <label className="text-caption font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                        <p className="text-body mt-1">
                          <span className={`badge ${
                            project?.status === 'active' ? 'badge-success' : 'badge-secondary'
                          }`}>
                            {project?.status || 'Unknown'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 className="text-title mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <GitBranch className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-body">New knowledge extracted from chat session</p>
                        <p className="text-caption">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-body">Documentation updated in README.md</p>
                        <p className="text-caption">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-body">Mike Johnson joined the project</p>
                        <p className="text-caption">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card">
                <div className="card-body">
                  <h3 className="text-title mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setActiveTab('chat')}
                      className="btn-primary w-full gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Start Chat</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('files')}
                      className="btn-secondary w-full gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Browse Files</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('knowledge')}
                      className="btn-ghost w-full gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      <span>View Knowledge</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 className="text-title mb-4">Project Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emtek-navy">{projectFacts.length}</div>
                      <div className="text-caption">Knowledge Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emtek-blue">{messages.length}</div>
                      <div className="text-caption">Chat Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{teamMembers.length}</div>
                      <div className="text-caption">Team Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">8</div>
                      <div className="text-caption">Files</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-1">
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-title">Project Files</h3>
                    <button className="btn-ghost p-2">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="space-y-1">
                    {renderFileTree(files)}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-title">
                    {selectedFile ? selectedFile.name : 'Select a file'}
                  </h3>
                </div>
                <div className="card-body">
                  {selectedFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-caption">
                        <span>Size: {selectedFile.size}</span>
                        <span>Modified: {selectedFile.modified}</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <p className="text-body text-gray-600">
                          File content preview would appear here. This could show syntax-highlighted code, 
                          markdown rendered content, or other file-specific viewers.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-body text-gray-600">
                        Select a file from the tree to view its contents
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="card h-[600px] flex flex-col">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emtek-navy/10 rounded-xl">
                    <Sparkles className="w-5 h-5 text-emtek-navy" />
                  </div>
                  <div>
                    <h3 className="text-title">Project Chat</h3>
                    <p className="text-caption">AI assistant with project context</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                  <ProjectChatMessage key={msg.id} message={msg} />
                ))}
                
                {isLoading && <ProjectLoadingMessage />}
                <div ref={messagesEndRef} />
              </div>

              <div className="card-footer">
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Ask about this project..."
                      className="input pr-12 resize-none"
                      rows="1"
                      style={{ minHeight: '52px', maxHeight: '120px' }}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || isLoading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-emtek-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-title">Team Members</h3>
                  <button className="btn-primary gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-emtek-navy/20 transition-colors duration-200">
                      <div className="w-12 h-12 bg-emtek-navy rounded-xl flex items-center justify-center text-white font-semibold">
                        {member.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{member.name}</h4>
                          <span className="badge badge-secondary">{member.role}</span>
                        </div>
                        <p className="text-caption text-gray-600">{member.email}</p>
                        <p className="text-caption">Last active: {member.lastActive}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-emtek-navy">{member.contributions}</div>
                        <div className="text-caption">contributions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Tab */}
        {activeTab === 'knowledge' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-title">Project Knowledge</h3>
                    <p className="text-caption">Automatically extracted facts and insights</p>
                  </div>
                  <button className="btn-primary gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Fact</span>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {projectFacts.map(fact => (
                    <div key={fact.id} className="border border-gray-100 rounded-xl p-4 hover:border-emtek-navy/20 transition-colors duration-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          fact.type === 'technology' ? 'bg-blue-100 text-blue-600' :
                          fact.type === 'architecture' ? 'bg-purple-100 text-purple-600' :
                          fact.type === 'database' ? 'bg-green-100 text-green-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          <Brain className="w-3 h-3" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{fact.title}</h4>
                        </div>
                        <span className={`badge ${
                          fact.type === 'technology' ? 'bg-blue-100 text-blue-800' :
                          fact.type === 'architecture' ? 'bg-purple-100 text-purple-800' :
                          fact.type === 'database' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {fact.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-caption">
                        <span>Added by {fact.addedBy}</span>
                        <span>•</span>
                        <span>{fact.addedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Presentation Components
function UserBubble({ children }) {
  return (
    <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white shadow-sm dark:bg-blue-500">
      {children}
    </div>
  );
}

function AssistantBlock({ children }) {
  // Flat on background: no border, no bubble
  return <div className="w-full">{children}</div>;
}

// Code Block Component with Copy Button
function CodeBlock({ children, className, node, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle mermaid specially
  if (language === 'mermaid') {
    return (
      <div className="mermaid bg-white p-4 rounded-lg border border-gray-200 my-4 dark:bg-gray-800 dark:border-gray-600">
        {codeContent}
      </div>
    );
  }

  // Handle inline code
  if (!match) {
    return (
      <code className="text-emtek-navy dark:text-blue-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
        {children}
      </code>
    );
  }

  // Handle code blocks
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-2 rounded-t-lg">
        <span className="text-xs text-gray-300 font-medium">{language || 'code'}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 dark:bg-gray-950 text-white p-4 rounded-b-lg overflow-x-auto text-base font-mono leading-relaxed">
        <code className="text-white">
          {codeContent}
        </code>
      </pre>
    </div>
  );
}

// Project Chat Message Component
function ProjectChatMessage({ message }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'user' ? (
        <div className="flex items-end gap-3">
          <div className="flex flex-col items-end">
            <UserBubble>
              <div>{message.content}</div>
            </UserBubble>
            <p className="text-caption mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 w-full">
          <div className="w-10 h-10 bg-emtek-navy rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <AssistantBlock>
              <div className="prose prose-sm max-w-none dark:prose-invert
                prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                prose-p:text-gray-700 dark:prose-p:text-gray-300
                prose-strong:text-gray-900 dark:prose-strong:text-gray-100
                prose-code:text-emtek-navy dark:prose-code:text-blue-400
                prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-blockquote:border-l-emtek-navy dark:prose-blockquote:border-l-blue-400
                prose-a:text-emtek-blue dark:prose-a:text-blue-400
                prose-li:text-gray-700 dark:prose-li:text-gray-300
                prose-table:table-auto prose-table:border-collapse
                prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600
                prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-2
                prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600
                prose-td:px-4 prose-td:py-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    code: CodeBlock,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          {children}
                        </table>
                      </div>
                    )
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </AssistantBlock>
            <p className="text-caption mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Project Loading Message Component
function ProjectLoadingMessage() {
  return (
    <div className="flex items-start gap-3 w-full">
      <div className="w-10 h-10 bg-emtek-navy rounded-xl flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-emtek-navy rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-emtek-navy rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-emtek-navy rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-caption text-gray-500">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context, process.env.TOOL_SLUG);
  
  if (authResult.redirect) {
    return authResult;
  }
  
  return {
    props: {
      session: authResult.props.session,
    },
  };
}
