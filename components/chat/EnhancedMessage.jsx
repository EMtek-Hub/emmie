import { useState, useRef, useEffect } from 'react';
import { renderMarkdown } from '../../lib/markdown';
import { MessageActions, ContinueGeneratingButton, StopGeneratingButton } from './MessageActions';
import { 
  User, 
  Bot, 
  AlertCircle, 
  Paperclip, 
  Image as ImageIcon,
  Search,
  Globe,
  Tool,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Tool visualization component
export function ToolVisualization({ toolCall, isRunning }) {
  const toolIcons = {
    search: <Search className="w-4 h-4" />,
    internet_search: <Globe className="w-4 h-4" />,
    image_generation: <ImageIcon className="w-4 h-4" />,
    default: <Tool className="w-4 h-4" />
  };

  const icon = toolIcons[toolCall?.tool_name] || toolIcons.default;
  const displayName = toolCall?.tool_name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <div className={`${isRunning ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
      <span>
        {isRunning ? `Using ${displayName}...` : `Used ${displayName}`}
      </span>
      {isRunning && (
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}

// Thinking box component for showing AI reasoning
export function ThinkingBox({ content, isComplete, isStreaming }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between text-sm"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-700">
            {isStreaming ? 'Thinking...' : 'Thought process'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-gray-50/50 text-sm text-gray-600 font-mono whitespace-pre-wrap">
          {content}
          {isStreaming && !isComplete && (
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          )}
        </div>
      )}
    </div>
  );
}

// Document/Source display card
export function SourceCard({ document, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-left"
    >
      <Search className="w-4 h-4 text-gray-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {document.title || document.semantic_identifier}
        </p>
        {document.source_type && (
          <p className="text-xs text-gray-500">{document.source_type}</p>
        )}
      </div>
    </button>
  );
}

// File attachment display
export function FileAttachment({ file, onRemove, alignRight = false }) {
  const isImage = file.type?.startsWith('image/');

  return (
    <div className={`relative group ${alignRight ? 'ml-auto' : ''}`}>
      {isImage && file.url ? (
        <div className="relative">
          <img
            src={file.url}
            alt={file.name || 'Uploaded image'}
            className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
          />
          {file.isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
          <Paperclip className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 truncate max-w-[150px]">
            {file.name || file.id}
          </span>
        </div>
      )}
      
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Enhanced message component with all features
export function EnhancedMessage({
  message,
  isStreaming = false,
  onEdit,
  onRegenerate,
  onFeedback,
  onMessageSwitch,
  onContinue,
  onStop,
  otherMessagesCount = 0,
  currentMessageIndex = 0,
  models = [],
  showThinking = false,
  thinkingContent = '',
  className = ''
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const textareaRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    if (onEdit) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <div
      className={`py-5 px-5 relative flex ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {isUser ? (
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            ) : isError ? (
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/emmie-icon-d.svg" alt="Emmie" className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Tool visualization */}
            {message.toolCall && !isUser && (
              <ToolVisualization 
                toolCall={message.toolCall} 
                isRunning={!message.toolCall.tool_result}
              />
            )}

            {/* Document sources */}
            {message.documents && message.documents.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {message.documents.slice(0, 3).map((doc, idx) => (
                  <SourceCard 
                    key={idx} 
                    document={doc}
                    onClick={() => console.log('Open document:', doc)}
                  />
                ))}
                {message.documents.length > 3 && (
                  <button className="text-sm text-gray-500 hover:text-gray-700">
                    +{message.documents.length - 3} more
                  </button>
                )}
              </div>
            )}

            {/* Thinking box */}
            {showThinking && thinkingContent && (
              <ThinkingBox 
                content={thinkingContent}
                isComplete={!isStreaming}
                isStreaming={isStreaming}
              />
            )}

            {/* File attachments */}
            {message.files && message.files.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {message.files.map((file, idx) => (
                  <FileAttachment 
                    key={idx} 
                    file={file}
                    alignRight={isUser}
                  />
                ))}
              </div>
            )}

            {/* Main content */}
            {isUser ? (
              isEditing ? (
                <div className="w-full">
                  <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => {
                      setEditedContent(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleEditSubmit();
                      } else if (e.key === 'Escape') {
                        handleEditCancel();
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emtek-navy"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleEditSubmit}
                      className="px-3 py-1.5 bg-gradient-to-br from-[#aedfe4] to-[#1275bc] text-white text-sm font-medium rounded-lg hover:shadow-md transition-all duration-200"
                    >
                      Submit
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="ml-auto max-w-[70%] rounded-3xl bg-gradient-to-br from-[#aedfe4] to-[#1275bc] text-white px-5 py-2.5">
                    {message.content}
                  </div>
                </div>
              )
            ) : isError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{message.content}</p>
                {message.stackTrace && (
                  <details className="mt-2">
                    <summary className="text-red-600 text-xs cursor-pointer">
                      Show stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                      {message.stackTrace}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(message.content || '') 
                }} />
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                )}
              </div>
            )}

            {/* Continue/Stop buttons */}
            {!isUser && !isError && (
              <>
                {isStreaming && onStop && (
                  <StopGeneratingButton onClick={onStop} />
                )}
                {!isStreaming && message.stopReason === 'context_length' && onContinue && (
                  <ContinueGeneratingButton onClick={onContinue} />
                )}
              </>
            )}

            {/* Message actions */}
            {!isStreaming && (isHovered || models.length > 0) && (
              <MessageActions
                isUserMessage={isUser}
                content={message.content}
                messageId={message.messageId}
                onFeedback={onFeedback}
                onRegenerate={onRegenerate}
                onEdit={isUser ? () => setIsEditing(true) : undefined}
                showSwitcher={otherMessagesCount > 0}
                switcherProps={{
                  currentPage: currentMessageIndex + 1,
                  totalPages: otherMessagesCount + 1,
                  handlePrevious: () => onMessageSwitch?.(currentMessageIndex - 1),
                  handleNext: () => onMessageSwitch?.(currentMessageIndex + 1)
                }}
                models={models}
                className="mt-2"
              />
            )}

            {/* Timestamp */}
            <p className="text-caption mt-2 text-gray-500">
              {message.timestamp?.toLocaleTimeString() || 'Unknown time'}
              {message.overriddenModel && (
                <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {message.overriddenModel}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
