import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  Edit2,
  Check,
  X
} from 'lucide-react';

// Message switcher for navigating between message variations
export function MessageSwitcher({
  currentPage,
  totalPages,
  handlePrevious,
  handleNext,
  disabled = false
}) {
  return (
    <div className="flex items-center text-sm space-x-1 text-gray-500">
      <button
        onClick={handlePrevious}
        disabled={disabled || currentPage === 1}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        title="Previous message"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      
      <span className="select-none text-caption">
        {currentPage} / {totalPages}
      </span>
      
      <button
        onClick={handleNext}
        disabled={disabled || currentPage === totalPages}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        title="Next message"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Feedback buttons for message rating
export function MessageFeedback({ onFeedback, messageId }) {
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const handleFeedback = (type) => {
    setFeedbackGiven(type);
    onFeedback(messageId, type);
  };

  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={() => handleFeedback('like')}
        className={`p-1.5 rounded transition-all duration-200 ${
          feedbackGiven === 'like' 
            ? 'bg-green-100 text-green-600' 
            : 'hover:bg-gray-100 text-gray-500'
        }`}
        title="Good response"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => handleFeedback('dislike')}
        className={`p-1.5 rounded transition-all duration-200 ${
          feedbackGiven === 'dislike' 
            ? 'bg-red-100 text-red-600' 
            : 'hover:bg-gray-100 text-gray-500'
        }`}
        title="Bad response"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}

// Copy button for message content
export function CopyButton({ content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-all duration-200"
      title="Copy message"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

// Regenerate button with model selection dropdown
export function RegenerateButton({ onRegenerate, models = [] }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleRegenerate = (model) => {
    onRegenerate(model);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-all duration-200"
        title="Regenerate response"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
      
      {showDropdown && (
        <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] z-20">
          <div className="px-3 py-1 text-caption text-gray-500 border-b border-gray-100">
            Regenerate with:
          </div>
          {models.length > 0 ? (
            models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleRegenerate(model)}
                className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
              >
                {model.name}
              </button>
            ))
          ) : (
            <button
              onClick={() => handleRegenerate(null)}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
            >
              Default Model
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Edit button for user messages
export function EditButton({ onEdit }) {
  return (
    <button
      onClick={onEdit}
      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-all duration-200"
      title="Edit message"
    >
      <Edit2 className="w-4 h-4" />
    </button>
  );
}

// Combined message actions toolbar
export function MessageActions({
  isUserMessage = false,
  content,
  messageId,
  onFeedback,
  onRegenerate,
  onEdit,
  showSwitcher = false,
  switcherProps = {},
  models = [],
  className = ""
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center gap-1 transition-opacity duration-200 ${className} ${
        isHovered ? 'opacity-100' : 'opacity-0 hover:opacity-100'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showSwitcher && <MessageSwitcher {...switcherProps} />}
      
      <CopyButton content={content} />
      
      {isUserMessage ? (
        onEdit && <EditButton onEdit={onEdit} />
      ) : (
        <>
          {onFeedback && (
            <MessageFeedback onFeedback={onFeedback} messageId={messageId} />
          )}
          {onRegenerate && (
            <RegenerateButton onRegenerate={onRegenerate} models={models} />
          )}
        </>
      )}
    </div>
  );
}

// Continue generating button for incomplete responses
export function ContinueGeneratingButton({ onClick, loading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-2 px-4 py-2 bg-gradient-to-br from-[#aedfe4] to-[#1275bc] text-white text-sm font-medium rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Continuing...</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4" />
          <span>Continue Generating</span>
        </>
      )}
    </button>
  );
}

// Stop generating button
export function StopGeneratingButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center gap-2"
    >
      <X className="w-4 h-4" />
      <span>Stop Generating</span>
    </button>
  );
}
