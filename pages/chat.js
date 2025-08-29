import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { requireHubAuth } from '../lib/authz';
import { renderMarkdown } from '../lib/markdown';
import { GPT5_MODELS } from '../lib/ai';
import { 
  Message, 
  ChatState, 
  RegenerationState,
  StreamStopReason,
  FileDescriptor,
  ChatFileType
} from '../lib/chat/interfaces';
import {
  buildLatestMessageChain,
  processRawChatHistory,
  updateParentChildren,
  removeMessage,
  getLastSuccessfulMessageId,
  createChatSession,
  nameChatSession,
  handleChatFeedback
} from '../lib/chat/messageUtils';
import { EnhancedMessage } from '../components/chat/EnhancedMessage';
import { DocumentSidebar } from '../components/chat/DocumentSidebar';
import { DragDropWrapper, FilePreview } from '../components/chat/DragDropWrapper';
import { DocumentsProvider } from '../components/chat/DocumentsContext-simple';
import { EnhancedChatInputBar } from '../components/chat/EnhancedChatInputBar';
import EnhancedSidebar from '../components/chat/EnhancedSidebar';
import { StopGeneratingButton } from '../components/chat/MessageActions';
import DocumentSelectionModal from '../components/chat/DocumentSelectionModal';
import { 
  ThinkingAnimation, 
  TypingIndicator, 
  SmartThinkingIndicator,
  ToolThinkingIndicator 
} from '../components/chat/ThinkingAnimation';
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
  ArrowLeft,
  Settings,
  Trash2,
  Paperclip,
  Image,
  Search,
  BookOpen,
  MoreHorizontal,
  Upload,
  X,
  FileText
} from 'lucide-react';
import Link from 'next/link';

// Constants
const TEMP_USER_MESSAGE_ID = -1;
const TEMP_ASSISTANT_MESSAGE_ID = -2;
const SYSTEM_MESSAGE_ID = -3;

export default function ChatPage({ session }) {
  // State Management
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [chatState, setChatState] = useState('input');
  const [regenerationState, setRegenerationState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [documentSidebarOpen, setDocumentSidebarOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [abortController, setAbortController] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState([]);
  const [selectedModel, setSelectedModel] = useState(GPT5_MODELS.MINI); // Default to GPT-5 Mini
  const [isCreatingChat, setIsCreatingChat] = useState(false); // Prevent duplicate chat creation
  
  // Refs
  const messagesEndRef = useRef(null);
  const chatSessionIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Build complete message history including streaming
  const messageHistory = useMemo(() => {
    const allMessages = [...messages];
    
    // Add streaming message if active
    if (isStreaming && streamingMessage) {
      allMessages.push({
        id: 'streaming',
        messageId: 'streaming',
        role: 'assistant',
        content: streamingMessage,
        timestamp: new Date(),
        isStreaming: true
      });
    }
    
    return allMessages;
  }, [messages, isStreaming, streamingMessage]);

  // Simple message update function
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((updates) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          ...updates
        };
      }
      return newMessages;
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageHistory]);

  useEffect(() => {
    fetchProjects();
    fetchChatHistory();
    fetchAgents();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('Fetching projects...');
      const response = await fetch('/api/projects');
      
      console.log('Projects API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Projects data received:', data);
        setProjects(data.projects || []);
      } else {
        // Handle non-200 responses
        const errorText = await response.text();
        console.error('Projects API error:', response.status, errorText);
        
        // Set empty projects array as fallback
        setProjects([]);
        
        // Show user-friendly message for specific errors
        if (response.status === 401) {
          console.warn('Authentication required for projects');
        } else if (response.status === 403) {
          console.warn('Not authorized to view projects');
        } else if (response.status === 500) {
          console.warn('Server error loading projects');
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // Set empty projects array as fallback to prevent UI crashes
      setProjects([]);
      
      // Additional error context
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('Network error - check if development server is running');
      }
    }
  };

  const fetchChatHistory = async () => {
    try {
      console.log('Fetching chat history...');
      const response = await fetch('/api/chats');
      
      console.log('Chat history API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history data received:', data);
        setChatHistory(data.chats || []);
      } else {
        const errorText = await response.text();
        console.error('Chat history API error:', response.status, errorText);
        setChatHistory([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      setChatHistory([]); // Fallback to empty array
    }
  };

  const fetchAgents = async () => {
    try {
      console.log('Fetching agents...');
      const response = await fetch('/api/agents');
      
      console.log('Agents API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Agents data received:', data);
        setAgents(data.agents || []);
        const defaultAgent = data.agents?.find(agent => agent.department === 'General');
        if (defaultAgent) {
          setSelectedAgent(defaultAgent);
        }
      } else {
        const errorText = await response.text();
        console.error('Agents API error:', response.status, errorText);
        setAgents([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setAgents([]); // Fallback to empty array
    }
  };

  // Handle file upload
  const handleFileUpload = async (files) => {
    const filesWithPreviews = await Promise.all(files.map(async (file, index) => {
      let previewUrl = null;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }
      return { 
        id: `${Date.now()}-${index}`,
        file, 
        previewUrl, 
        uploaded: false, 
        uploading: true,
        url: null,
        error: null,
        type: file.type.startsWith('image/') ? ChatFileType.IMAGE : ChatFileType.PLAIN_TEXT,
        name: file.name
      };
    }));

    setUploadedFiles(prev => [...prev, ...filesWithPreviews]);

    // Upload files
    for (const fileObj of filesWithPreviews) {
      try {
        const formData = new FormData();
        formData.append('file', fileObj.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, uploaded: true, uploading: false, url: data.url }
              : f
          ));
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, uploaded: false, uploading: false, error: 'Upload failed' }
            : f
        ));
      }
    }
  };

  // Stop message generation
  const stopGenerating = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setChatState('input');
    setIsLoading(false);
  };

  // Handle message submission
  const handleSubmit = async (e, messageOverride = null, regenerateMessageId = null) => {
    e?.preventDefault();
    
    const messageToSend = messageOverride || message.trim();
    if (!messageToSend || isLoading || isCreatingChat) return;

    // Create abort controller
    const controller = new AbortController();
    setAbortController(controller);
    
    // Create user message
    const userMessageId = regenerateMessageId || Date.now();
    const userMessage = {
      id: userMessageId,
      messageId: userMessageId,
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
      files: uploadedFiles.filter(f => f.uploaded)
    };

    // Add user message to messages array
    addMessage(userMessage);
    
    // Clear input and set loading states
    setMessage('');
    setUploadedFiles([]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');
    setChatState('streaming');

    // Create or continue chat session with proper race condition prevention
    let chatId = currentChatId;
    if (!chatId && !isCreatingChat) {
      setIsCreatingChat(true);
      try {
        chatId = await createChatSession(selectedAgent?.id || 0);
        setCurrentChatId(chatId);
        chatSessionIdRef.current = chatId;
      } catch (error) {
        console.error('Failed to create chat session:', error);
        // Use a temporary ID to allow the chat to continue
        chatId = `temp-${Date.now()}`;
        setCurrentChatId(chatId);
        chatSessionIdRef.current = chatId;
      } finally {
        setIsCreatingChat(false);
      }
    } else if (!chatId) {
      // Another chat creation is in progress, use a temporary ID
      chatId = `temp-${Date.now()}`;
      setCurrentChatId(chatId);
      chatSessionIdRef.current = chatId;
    }

    try {
      // Build messages for API
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Choose API endpoint based on agent type and selected model
      let apiEndpoint;
      if (selectedAgent?.openai_assistant_id) {
        // OpenAI Assistant - use dedicated OpenAI Assistants API
        apiEndpoint = '/api/chat';
      } else if (Object.values(GPT5_MODELS).includes(selectedModel)) {
        // GPT-5 model - use GPT-5 Responses API
        apiEndpoint = '/api/chat-gpt5';
      } else {
        // Legacy model - use simple chat API
        apiEndpoint = '/api/chat-simple';
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          messages: apiMessages,
          agentId: selectedAgent?.id,
          selectedContext: Object.values(GPT5_MODELS).includes(selectedModel) ? selectedContext : undefined
        }),
        signal: controller.signal
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
      let assistantContent = '';
      let toolCall = null;
      let documents = [];
      
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
                assistantContent += data.delta;
                setStreamingMessage(assistantContent);
              }
              
              if (data.tool_name) {
                toolCall = {
                  tool_name: data.tool_name,
                  tool_args: data.tool_args,
                  tool_result: data.tool_result
                };
              }
              
              if (data.documents) {
                documents = data.documents;
                setAvailableDocuments(data.documents);
              }
              
              if (data.tool_call) {
                // Show tool usage indicator
                console.log('Tool call:', data.tool_call);
              }
              
              if (data.tool_result) {
                // Show tool result
                console.log('Tool result:', data.tool_result);
              }
              
              if (data.done) {
                // Update chat ID if we got a real one from the API
                if (data.chatId && data.chatId !== chatId && !data.chatId.startsWith('temp-')) {
                  chatId = data.chatId;
                  setCurrentChatId(data.chatId);
                  chatSessionIdRef.current = data.chatId;
                }
              }
              
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

      // Add final assistant message
      const assistantMessage = {
        id: Date.now() + 1,
        messageId: Date.now() + 1,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        toolCall,
        documents
      };
      
      addMessage(assistantMessage);

      // Generate title for chats that need one (new chats or chats with default title)
      // Check if we have enough messages and the chat needs a title
      const totalMessages = [...messages, userMessage, assistantMessage];
      const hasEnoughMessages = totalMessages.filter(m => m.role === 'user' || m.role === 'assistant').length >= 2;
      
      if (hasEnoughMessages && !chatId.startsWith('temp-')) {
        // Only attempt title generation if we have a real chat ID (not temporary)
        // Generate title and refresh chat history when complete
        setTimeout(async () => {
          try {
            await nameChatSession(chatId);
            // Wait a moment then refresh the chat history to show the new title
            setTimeout(fetchChatHistory, 500);
          } catch (error) {
            console.error('Title generation failed:', error);
            // Still refresh chat history even if title generation fails
            setTimeout(fetchChatHistory, 500);
          }
        }, 500);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        messageId: Date.now() + 1,
        role: 'error',
        content: error.name === 'AbortError' 
          ? 'Message generation stopped.' 
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
      setChatState('input');
      setAbortController(null);
    }
  };

  // Handle message editing
  const handleEditMessage = (messageId, newContent) => {
    const message = messageHistory.find(m => m.messageId === messageId);
    if (message) {
      handleSubmit(null, newContent, messageId);
    }
  };

  // Handle message regeneration
  const handleRegenerateMessage = async (messageId, model) => {
    const message = messageHistory.find(m => m.messageId === messageId);
    if (message && message.parentMessageId) {
      const parentMessage = messageHistory.find(m => m.messageId === message.parentMessageId);
      if (parentMessage) {
        handleSubmit(null, parentMessage.content, parentMessage.messageId);
      }
    }
  };

  // Handle message switching
  const handleMessageSwitch = (messageId, targetIndex) => {
    // This would implement message branching logic
    console.log('Switch message:', messageId, 'to index:', targetIndex);
  };

  // Handle feedback
  const handleFeedback = async (messageId, feedbackType) => {
    await handleChatFeedback(messageId, feedbackType, '', '');
  };

  // Handle continue generating
  const handleContinueGenerating = () => {
    handleSubmit(null, 'Continue generating from where you left off');
  };

  // Toggle document selection
  const toggleDocumentSelection = (doc) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(d => d.document_id === doc.document_id);
      if (isSelected) {
        return prev.filter(d => d.document_id !== doc.document_id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const handleSignOut = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emtek.au'}/api/auth/signout`;
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setSidebarOpen(false);
    setUploadedFiles([]);
    setSelectedDocuments([]);
    setStreamingMessage('');
    setIsStreaming(false);
  };

  const loadChat = async (chatId) => {
    if (currentChatId === chatId) return;
    
    setIsLoading(true);
    setCurrentChatId(chatId);
    chatSessionIdRef.current = chatId;
    
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        
        // Convert raw messages to our message format
        const loadedMessages = (data.messages || []).map(msg => ({
          id: msg.id,
          messageId: msg.id,
          role: msg.role,
          content: msg.content_md || msg.content || '',
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(loadedMessages);
        
        if (data.chat.agentId) {
          const chatAgent = agents.find(agent => agent.id === data.chat.agentId);
          if (chatAgent) {
            setSelectedAgent(chatAgent);
          }
        }
        
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
      
      if (response.ok) {
        if (currentChatId === chatId) {
          startNewChat();
        }
        fetchChatHistory();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Handle setting context from document modal
  const handleSetContext = useCallback((contextItems) => {
    setSelectedContext(contextItems);
    console.log('Context set:', contextItems);
  }, []);

  const quickPrompts = [
    "What projects do I have?",
    "Help me plan a new feature",
    "Analyze my project data",
    "Create a project timeline"
  ];

  return (
    <DocumentsProvider>
      <DragDropWrapper onDrop={handleFileUpload} className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-sm">
            <EnhancedSidebar
              user={session?.user}
              assistants={agents}
              selectedAssistant={selectedAgent}
              onAssistantChange={setSelectedAgent}
              onNewAssistant={() => console.log('New assistant')}
              onSignOut={handleSignOut}
              onClose={() => setSidebarOpen(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <EnhancedSidebar
          user={session?.user}
          assistants={agents}
          selectedAssistant={selectedAgent}
          onAssistantChange={setSelectedAgent}
          onNewAssistant={() => console.log('New assistant')}
          onSignOut={handleSignOut}
          chatHistory={chatHistory}
          onNewChat={startNewChat}
          onLoadChat={loadChat}
          onDeleteChat={deleteChat}
          currentChatId={currentChatId}
        />
      </div>

      {/* Document Sidebar */}
      <DocumentSidebar
        isOpen={documentSidebarOpen}
        onClose={() => setDocumentSidebarOpen(false)}
        documents={availableDocuments}
        selectedDocuments={selectedDocuments}
        onToggleDocument={toggleDocumentSelection}
        onClearSelection={() => setSelectedDocuments([])}
        onViewDocument={(doc) => console.log('View document:', doc)}
      />

      {/* Document Selection Modal */}
      <DocumentSelectionModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        onSetContext={handleSetContext}
      />

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
            <div className="flex-1 max-w-[200px]">
              <img 
                src="/emmie-logo.svg" 
                alt="Emmie" 
                className="w-full h-auto" 
                style={{ maxHeight: '40px' }}
              />
            </div>
            <button
              onClick={() => setDocumentSidebarOpen(!documentSidebarOpen)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors duration-200"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area with Floating Input */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {messageHistory.length === 0 ? (
            <WelcomeScreen quickPrompts={quickPrompts} onPromptClick={setMessage} />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-8 pb-40">
              <div className="space-y-6">
                {messageHistory.map((msg, index) => (
                  <MessageBubble
                    key={msg.messageId}
                    message={msg}
                    isStreaming={isLoading && index === messageHistory.length - 1}
                    onEdit={handleEditMessage}
                    onRegenerate={handleRegenerateMessage}
                    onFeedback={handleFeedback}
                    onContinue={msg.stopReason === StreamStopReason.CONTEXT_LENGTH ? handleContinueGenerating : undefined}
                    onStop={isLoading && index === messageHistory.length - 1 ? stopGenerating : undefined}
                  />
                ))}
                
                {/* Show thinking animation when loading and not streaming */}
                {isLoading && !isStreaming && (
                  <LoadingMessage 
                    state="thinking"
                    userMessage={message}
                    chatState={chatState}
                  />
                )}
                
                {/* Show smart thinking animation when processing but not yet streaming */}
                {isLoading && chatState === 'streaming' && !streamingMessage && (
                  <SmartThinkingIndicator 
                    isStreaming={false}
                    userMessage={messages[messages.length - 1]?.content || ''}
                    className="animate-fade-in-up"
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
          
          {/* Floating Input */}
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                message={message}
                setMessage={setMessage}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                onFileUpload={handleFileUpload}
                uploadedFiles={uploadedFiles}
                selectedAgent={selectedAgent}
                onAgentChange={setSelectedAgent}
                agents={agents}
                onOpenDocumentModal={() => setDocumentModalOpen(true)}
                selectedContext={selectedContext}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </div>
        </div>
      </div>
      </DragDropWrapper>
    </DocumentsProvider>
  );
}

// Chat Sidebar Component (simplified version)
function ChatSidebar({ session, projects, chatHistory, onSignOut, onNewChat, onLoadChat, onDeleteChat, currentChatId, onClose, isMobile = false }) {
  return (
    <div className="bg-white h-full shadow-strong border-r border-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <img src="/emmie-logo.svg" alt="Emmie" className="w-full h-auto" style={{ maxHeight: '40px' }} />
          {isMobile && onClose && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors duration-200">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <button
          onClick={onNewChat}
          className="w-full gap-2 px-4 py-3 bg-gradient-to-br from-[#aedfe4] to-[#1275bc] text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-caption font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Recent Chats
        </h3>
        <div className="space-y-1">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all duration-200 relative ${
                currentChatId === chat.id ? 'bg-emtek-navy/5 border border-emtek-navy/20' : ''
              }`}
              onClick={() => onLoadChat(chat.id)}
            >
              <div className="flex items-start gap-3">
                <MessageSquare className={`w-4 h-4 mt-0.5 group-hover:text-emtek-navy transition-colors duration-200 ${
                  currentChatId === chat.id ? 'text-emtek-navy' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-body font-medium line-clamp-2 group-hover:text-emtek-navy transition-colors duration-200 ${
                    currentChatId === chat.id ? 'text-emtek-navy' : ''
                  }`}>
                    {chat.title}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this chat?')) {
                      onDeleteChat(chat.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emtek-navy rounded-xl flex items-center justify-center text-white font-semibold">
              {(session.user?.name || session.user?.email || 'G')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-body font-medium">{session.user?.name || session.user?.email}</p>
              <p className="text-caption">Signed in</p>
            </div>
          </div>
          <button onClick={onSignOut} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all duration-200">
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
        <h1 className="text-display mb-6">Welcome to</h1>
        <div className="flex justify-center mb-6">
          <img 
            src="/emmie-logo.svg" 
            alt="Emmie" 
            style={{ width: '250px', height: 'auto' }}
            className="max-w-full"
          />
        </div>
        <p className="text-body mb-8 max-w-lg mx-auto">
          Your AI assistant for project management and development. 
          Ask me anything about your projects, code, or how I can help you work more efficiently.
        </p>
        
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
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img src="/emmie-icon-d.svg" alt="Emmie" className="w-8 h-8" />
                  </div>
                  <span className="text-body font-medium group-hover:text-emtek-navy transition-colors duration-200">
                    {prompt}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

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

// Flat Canvas Message Component with React.memo
const MessageBubble = React.memo(function MessageBubble({ message, isStreaming, onEdit, onRegenerate, onFeedback, onContinue, onStop }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'error';

  // User messages in chat bubble style
  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-3xl w-full pl-16">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="rounded-xl px-4 py-3 bg-orange-50 text-gray-900 ml-auto border border-orange-100">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            </div>
            <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center text-orange-800 text-xs font-medium flex-shrink-0 mt-1">
              U
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant messages flat on canvas
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        {/* Model indicator */}
        {isAssistant && message.metadata?.tool_calls && (
          <div className="flex items-center gap-2 ml-9 mb-2">
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs">
              <Search className="w-3 h-3 text-blue-600" />
              <span className="text-blue-800">Used document search</span>
              <span className="text-blue-600">({message.metadata.tool_calls[0]?.results_count || 0} results)</span>
            </div>
          </div>
        )}

        {/* Emmie icon and response */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1">
            <img src="/emmie-icon-d.svg" alt="Emmie" className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div 
              className="text-gray-900 text-sm leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: renderMarkdown(message.content) + (isStreaming ? '<span class="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse">|</span>' : '')
              }}
            />
          </div>
        </div>

        {/* Tool usage details (expandable) */}
        {isAssistant && message.metadata?.tool_calls && !isStreaming && (
          <div className="ml-9 mb-4">
            <details className="group">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <span>View search details</span>
                <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Search Query:</span>
                  <span className="ml-2 text-gray-600">"{message.metadata.tool_calls[0]?.arguments?.query}"</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Results Found:</span>
                  <span className="ml-2 text-gray-600">{message.metadata.tool_calls[0]?.results_count || 0} document chunks</span>
                </div>
              </div>
            </details>
          </div>
        )}
        
        {/* Action buttons */}
        {(isAssistant && !isStreaming) && (
          <div className="flex items-center gap-3 ml-9 mb-4">
            <button 
              onClick={() => onFeedback && onFeedback(message.messageId, 'like')}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Like"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v13m-3-7h-.5A1.5 1.5 0 004 14.5v-3A1.5 1.5 0 015.5 10H7" />
              </svg>
            </button>
            <button 
              onClick={() => onFeedback && onFeedback(message.messageId, 'dislike')}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Dislike"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17V4m-3 7h.5a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5H11" />
              </svg>
            </button>
            <button 
              onClick={() => onRegenerate && onRegenerate(message.messageId)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Regenerate"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {onContinue && (
              <button 
                onClick={onContinue}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        )}
        
        {/* Stop button for streaming */}
        {isStreaming && onStop && (
          <div className="flex items-center gap-2 ml-9 mb-4">
            <button 
              onClick={onStop}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Stop generating
            </button>
          </div>
        )}
        
        {/* Error messages */}
        {isError && (
          <div className="flex items-start gap-3 mb-4">
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1">
              <img src="/emmie-icon-d.svg" alt="Emmie" className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-red-800 text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Clean Chat Input Component
function ChatInput({ 
  message, 
  setMessage, 
  onSubmit, 
  isLoading, 
  onFileUpload, 
  uploadedFiles, 
  selectedAgent, 
  onAgentChange,
  agents,
  onOpenDocumentModal, 
  selectedContext,
  selectedModel,
  onModelChange 
}) {
  const textareaRef = useRef(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSubmit(e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Main input area */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to Emmie"
            className="w-full resize-none bg-transparent border-0 outline-none placeholder-gray-400 text-gray-900 text-sm leading-6"
            style={{ minHeight: '60px', maxHeight: '200px' }}
            disabled={isLoading}
          />
          
          {/* Selected context display */}
          {selectedContext.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2 w-full">
                <BookOpen className="w-3 h-3" />
                <span className="font-medium">Selected Context ({selectedContext.length} items)</span>
              </div>
              {selectedContext.map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-xs">
                  <FileText className="w-3 h-3 text-blue-600" />
                  <span className="truncate max-w-32 text-blue-800">{item.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* File previews */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 bg-gray-50 rounded-md px-2 py-1 text-xs">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-32">{file.name}</span>
                  {file.uploading && <span className="text-gray-500">...</span>}
                  {file.error && <span className="text-red-500">✕</span>}
                  {file.uploaded && <span className="text-green-500">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <div className="flex items-center gap-3">
            {/* File/Document button */}
            <button
              type="button"
              onClick={onOpenDocumentModal}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              <span>File</span>
            </button>
            
            {/* Agent selector (first) */}
            <AgentSelector 
              agents={agents}
              selectedAgent={selectedAgent}
              onAgentChange={onAgentChange}
            />
            
            {/* Model selector (hidden for OpenAI assistants) */}
            {!(selectedAgent?.openai_assistant_id || selectedAgent?.agent_mode === 'openai_assistant') && (
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="flex items-center gap-2 px-3 py-1.5 pr-8 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors border-0 bg-transparent cursor-pointer appearance-none"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Legacy)</option>
                  <option value={GPT5_MODELS.NANO}>GPT-5 Nano (Fast)</option>
                  <option value={GPT5_MODELS.MINI}>GPT-5 Mini (Balanced)</option>
                  <option value={GPT5_MODELS.FULL}>GPT-5 Full (Advanced)</option>
                </select>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none">
                  <svg viewBox="0 0 12 12" fill="currentColor">
                    <path d="M3 4.5L6 7.5L9 4.5"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {/* Send button with thinking status */}
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={`p-2 rounded-full transition-all duration-200 ${
              isLoading 
                ? 'bg-blue-500 animate-thinking-pulse cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
            } text-white`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// Enhanced Loading Message Component with Smart Thinking
function LoadingMessage({ 
  state = 'thinking', 
  toolCall = null, 
  userMessage = '',
  chatState = 'input'
}) {
  // Determine the best animation based on context
  if (toolCall) {
    return (
      <ToolThinkingIndicator 
        toolName={toolCall.tool_name || toolCall.name}
        toolType={toolCall.type || 'function'}
        phase="running"
        className="animate-fade-in-up"
      />
    );
  }

  // Show different states based on chat state
  if (chatState === 'streaming') {
    return (
      <SmartThinkingIndicator 
        isStreaming={true}
        userMessage={userMessage}
        className="animate-fade-in-up"
      />
    );
  }

  return (
    <SmartThinkingIndicator 
      isStreaming={false}
      userMessage={userMessage}
      className="animate-fade-in-up"
    />
  );
}

// Agent Selector Component
function AgentSelector({ agents, selectedAgent, onAgentChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAgentSelect = (agent) => {
    onAgentChange(agent);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
      >
        <Bot className="w-4 h-4" />
        <span>{selectedAgent?.name || 'General'}</span>
        <div className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5"/>
          </svg>
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            <div className="p-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                    selectedAgent?.id === agent.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900 text-sm truncate">
                    {agent.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
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
