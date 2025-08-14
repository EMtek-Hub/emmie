import { useState, useEffect, useRef } from 'react';
import { requireHubAuth } from '../lib/authz';
import { renderMarkdown } from '../lib/markdown';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Folder, 
  LogOut,
  User,
  Bot,
  Sparkles,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function ChatPage({ session }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchProjects();
    fetchChatHistory();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchChatHistory = async () => {
    setChatHistory([
      { id: 1, title: 'Website redesign discussion', updatedAt: '2 hours ago' },
      { id: 2, title: 'Database optimization', updatedAt: 'Yesterday' },
      { id: 3, title: 'API documentation review', updatedAt: '3 days ago' },
    ]);
  };

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
      const response = await fetch('/api/chat', {
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

  const handleSignOut = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emtek.au'}/api/auth/signout`;
  };

  const startNewChat = () => {
    setMessages([]);
    setSidebarOpen(false);
  };

  const quickPrompts = [
    "What projects do I have?",
    "Help me plan a new feature",
    "Analyze my project data",
    "Create a project timeline"
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-sm">
            <ChatSidebar 
              session={session}
              projects={projects}
              chatHistory={chatHistory}
              onSignOut={handleSignOut}
              onNewChat={startNewChat}
              onClose={() => setSidebarOpen(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <ChatSidebar 
          session={session}
          projects={projects}
          chatHistory={chatHistory}
          onSignOut={handleSignOut}
          onNewChat={startNewChat}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden app-header">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-emtek-navy transition-colors duration-200"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emtek-navy" />
              <span className="font-semibold text-emtek-navy">Emmie</span>
            </div>
            <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors duration-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen quickPrompts={quickPrompts} onPromptClick={setMessage} />
          ) : (
            <div className="container-app py-6 space-y-6 animate-fade-in">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              
              {isLoading && <LoadingMessage />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="container-app">
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
                  placeholder="Message Emmie..."
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
              <p className="text-caption mt-2 text-center">
                Emmie can make mistakes. Consider checking important information.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat Sidebar Component
function ChatSidebar({ session, projects, chatHistory, onSignOut, onNewChat, onClose, isMobile = false }) {
  return (
    <div className="bg-white h-full shadow-strong border-r border-gray-100 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emtek-navy/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-emtek-navy" />
            </div>
            <div>
              <h1 className="font-bold text-emtek-navy">Emmie</h1>
              <p className="text-caption">AI Assistant</p>
            </div>
          </div>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <button
          onClick={onNewChat}
          className="btn-primary w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Chat History */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-caption font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Chats
          </h3>
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="p-3 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 group-hover:text-emtek-navy transition-colors duration-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium line-clamp-2 group-hover:text-emtek-navy transition-colors duration-200">
                      {chat.title}
                    </p>
                    <p className="text-caption mt-1">{chat.updatedAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-caption font-semibold text-gray-500 uppercase tracking-wider">
              Projects
            </h3>
            <Link href="/projects" className="text-caption text-emtek-navy hover:text-emtek-blue transition-colors duration-200">
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {projects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="p-3 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <Folder className="w-4 h-4 text-gray-400 mt-0.5 group-hover:text-emtek-blue transition-colors duration-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium line-clamp-1 group-hover:text-emtek-navy transition-colors duration-200">
                      {project.name}
                    </p>
                    <span className={`badge badge-sm mt-1 ${
                      project.status === 'active' ? 'badge-success' : 'badge-secondary'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <Link href="/projects/new" className="block p-3 text-center border-2 border-dashed border-gray-200 rounded-xl hover:border-emtek-navy/30 hover:bg-emtek-navy/5 transition-all duration-200 group">
                <Plus className="w-5 h-5 mx-auto mb-2 text-gray-400 group-hover:text-emtek-navy transition-colors duration-200" />
                <p className="text-caption text-gray-500 group-hover:text-emtek-navy transition-colors duration-200">
                  Create your first project
                </p>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-6 border-t border-gray-100 bg-gradient-to-t from-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-emtek-navy rounded-xl flex items-center justify-center text-white font-semibold">
              {(session.user?.name || session.user?.email || 'G')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium truncate">
                {session.user?.name || session.user?.email}
              </p>
              <p className="text-caption">Signed in</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all duration-200"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Welcome Screen Component
function WelcomeScreen({ quickPrompts, onPromptClick }) {
  return (
    <div className="h-full flex items-center justify-center p-6 animate-fade-in">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 bg-gradient-to-br from-emtek-navy to-emtek-blue rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-scale-in">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-display mb-4">
          Welcome to Emmie
        </h1>
        <p className="text-body mb-8 max-w-lg mx-auto">
          Your AI assistant for project management and development. 
          Ask me anything about your projects, code, or how I can help you work more efficiently.
        </p>
        
        {/* Quick Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {quickPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onPromptClick(prompt)}
              className="card-interactive text-left group animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="card-body py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emtek-navy/10 rounded-lg flex items-center justify-center group-hover:bg-emtek-navy/20 transition-colors duration-200">
                    <Sparkles className="w-4 h-4 text-emtek-navy" />
                  </div>
                  <span className="text-body font-medium group-hover:text-emtek-navy transition-colors duration-200">
                    {prompt}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-caption">
          <div className="flex items-center gap-2 justify-center">
            <BarChart3 className="w-4 h-4 text-emtek-navy" />
            <span>Project insights</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <MessageSquare className="w-4 h-4 text-emtek-blue" />
            <span>Smart conversations</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span>AI-powered help</span>
          </div>
        </div>
      </div>
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

// Chat Message Component
function ChatMessage({ message }) {
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
              <div 
                className="prose prose-sm max-w-none dark:prose-invert
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
                  prose-td:px-4 prose-td:py-2"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
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

// Loading Message Component
function LoadingMessage() {
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
