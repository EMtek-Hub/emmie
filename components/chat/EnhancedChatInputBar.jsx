import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiPlusCircle,
  FiPlus,
  FiX,
  FiFilter,
  FiLoader,
  FiSend,
  FiSquare,
  FiChevronDown,
  FiSettings,
} from 'react-icons/fi';
import {
  CalendarIcon,
  TagIcon,
  XIcon,
  FolderIcon,
  FileIcon,
  AtSignIcon,
  SlashIcon,
} from 'lucide-react';
import { useDocumentsContext } from './DocumentsContext';

const MAX_INPUT_HEIGHT = 200;

// Source chip component with your gradient styling
const SourceChip = ({
  icon,
  title,
  onRemove,
  onClick,
  truncateTitle = true,
}) => {
  const truncate = (str, maxLength) => {
    if (!truncateTitle || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex-none
        flex
        items-center
        px-2
        py-1
        bg-gradient-to-r from-[#aedfe4]/10 to-[#1275bc]/10
        text-xs
        text-gray-700
        border
        border-[#1275bc]/20
        rounded-md
        gap-x-1.5
        h-6
        ${onClick ? 'cursor-pointer hover:from-[#aedfe4]/20 hover:to-[#1275bc]/20' : ''}
      `}
    >
      {icon}
      {truncate(title, 20)}
      {onRemove && (
        <XIcon
          size={12}
          className="text-gray-600 ml-auto cursor-pointer hover:text-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </div>
  );
};

// Assistant suggestion item
const AssistantSuggestionItem = ({ assistant, isSelected, onClick }) => {
  const getAssistantIcon = (assistant) => {
    const deptName = (assistant.department || assistant.name || '').toLowerCase();
    
    if (deptName.includes('drafting')) return <FiSettings className="w-4 h-4" />;
    if (deptName.includes('engineer')) return <FiSettings className="w-4 h-4" />;
    if (deptName.includes('hr')) return <FiSettings className="w-4 h-4" />;
    if (deptName.includes('it')) return <FiSettings className="w-4 h-4" />;
    
    return <FiSettings className="w-4 h-4" />;
  };

  return (
    <button
      className={`
        px-3 py-2 w-full flex items-center gap-2 text-left
        ${isSelected ? 'bg-gradient-to-r from-[#aedfe4]/20 to-[#1275bc]/20' : ''}
        hover:bg-gradient-to-r hover:from-[#aedfe4]/10 hover:to-[#1275bc]/10
        rounded-md transition-colors
      `}
      onClick={onClick}
    >
      {getAssistantIcon(assistant)}
      <div className="flex-1">
        <span className="font-medium text-gray-700">{assistant.name}</span>
        {assistant.description && (
          <span className="text-xs text-gray-500 ml-2">{assistant.description}</span>
        )}
      </div>
    </button>
  );
};

// Input prompt suggestion item
const PromptSuggestionItem = ({ prompt, isSelected, onClick }) => (
  <button
    className={`
      px-3 py-2 w-full flex items-start gap-2 text-left
      ${isSelected ? 'bg-gradient-to-r from-[#aedfe4]/20 to-[#1275bc]/20' : ''}
      hover:bg-gradient-to-r hover:from-[#aedfe4]/10 hover:to-[#1275bc]/10
      rounded-md transition-colors
    `}
    onClick={onClick}
  >
    <SlashIcon className="w-4 h-4 mt-0.5 text-gray-500" />
    <div className="flex-1">
      <span className="font-medium text-gray-700">{prompt.prompt}:</span>
      <span className="text-sm text-gray-600 ml-2 line-clamp-1">{prompt.content}</span>
    </div>
  </button>
);

export function EnhancedChatInputBar({
  message,
  setMessage,
  onSubmit,
  chatState,
  stopGenerating,
  selectedAssistant,
  alternativeAssistant,
  setAlternativeAssistant,
  availableAssistants = [],
  inputPrompts = [],
  onFileUpload,
  onToggleDocSelection,
  onToggleDocumentSidebar,
  selectedDocuments = [],
  onRemoveDocs,
  className = '',
}) {
  const textAreaRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [showAssistantSuggestions, setShowAssistantSuggestions] = useState(false);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  const {
    selectedFiles = [],
    selectedFolders = [],
    removeSelectedFile,
    removeSelectedFolder,
    currentMessageFiles = [],
    setCurrentMessageFiles,
  } = useDocumentsContext() || {};

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT)}px`;
    }
  }, [message]);

  // Handle paste for file upload
  const handlePaste = (event) => {
    const items = event.clipboardData?.items;
    if (items && onFileUpload) {
      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        event.preventDefault();
        onFileUpload(pastedFiles);
      }
    }
  };

  // Handle input change for @ mentions and / commands
  const handleInputChange = (event) => {
    const text = event.target.value;
    setMessage(text);
    
    // Check for @ mentions
    const atMatch = text.match(/(?:^|\s)@(\w*)$/);
    if (atMatch) {
      setShowAssistantSuggestions(true);
      setShowPromptSuggestions(false);
      setSelectedSuggestionIndex(0);
    } else if (text.endsWith('@')) {
      setShowAssistantSuggestions(true);
      setShowPromptSuggestions(false);
      setSelectedSuggestionIndex(0);
    } else {
      // Check for / commands
      const slashMatch = text.match(/(?:^|\s)\/(\w*)$/);
      if (slashMatch) {
        setShowPromptSuggestions(true);
        setShowAssistantSuggestions(false);
        setSelectedSuggestionIndex(0);
      } else if (text.endsWith('/')) {
        setShowPromptSuggestions(true);
        setShowAssistantSuggestions(false);
        setSelectedSuggestionIndex(0);
      } else {
        setShowAssistantSuggestions(false);
        setShowPromptSuggestions(false);
      }
    }
  };

  // Filter suggestions based on input
  const getFilterText = () => {
    if (showAssistantSuggestions) {
      const match = message.match(/(?:^|\s)@(\w*)$/);
      return match ? match[1].toLowerCase() : '';
    }
    if (showPromptSuggestions) {
      const match = message.match(/(?:^|\s)\/(\w*)$/);
      return match ? match[1].toLowerCase() : '';
    }
    return '';
  };

  const filterText = getFilterText();
  
  const filteredAssistants = availableAssistants.filter(assistant =>
    assistant.name.toLowerCase().includes(filterText)
  );
  
  const filteredPrompts = inputPrompts.filter(prompt =>
    prompt.prompt.toLowerCase().includes(filterText) && prompt.active
  );

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (showAssistantSuggestions || showPromptSuggestions) {
      const suggestions = showAssistantSuggestions ? filteredAssistants : filteredPrompts;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          Math.min(prev + 1, suggestions.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions.length > 0) {
          e.preventDefault();
          const selected = suggestions[selectedSuggestionIndex];
          
          if (showAssistantSuggestions) {
            // Replace @mention with selected assistant
            const newMessage = message.replace(/(?:^|\s)@\w*$/, '');
            setMessage(newMessage);
            setAlternativeAssistant(selected);
            setShowAssistantSuggestions(false);
          } else if (showPromptSuggestions) {
            // Replace /command with prompt content
            const newMessage = message.replace(/(?:^|\s)\/\w*$/, ' ' + selected.content);
            setMessage(newMessage);
            setShowPromptSuggestions(false);
          }
        }
      } else if (e.key === 'Escape') {
        setShowAssistantSuggestions(false);
        setShowPromptSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && chatState === 'input') {
        onSubmit();
      }
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowAssistantSuggestions(false);
        setShowPromptSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allFiles = useMemo(() => {
    const combined = [];
    
    // Add selected files
    if (selectedFiles) {
      selectedFiles.forEach(file => {
        combined.push({
          id: file.file_id || file.id,
          name: file.name,
          type: 'selected',
          original: file,
        });
      });
    }
    
    // Add current message files
    if (currentMessageFiles) {
      currentMessageFiles.forEach(file => {
        combined.push({
          id: file.id,
          name: file.name || `File ${file.id}`,
          type: 'current',
          isUploading: file.isUploading,
          original: file,
        });
      });
    }
    
    return combined;
  }, [selectedFiles, currentMessageFiles]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Suggestions dropdown */}
      {(showAssistantSuggestions || showPromptSuggestions) && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full mb-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50"
        >
          {showAssistantSuggestions && filteredAssistants.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 px-3 py-1 flex items-center gap-1">
                <AtSignIcon className="w-3 h-3" />
                Select an assistant
              </div>
              {filteredAssistants.map((assistant, index) => (
                <AssistantSuggestionItem
                  key={assistant.id}
                  assistant={assistant}
                  isSelected={index === selectedSuggestionIndex}
                  onClick={() => {
                    setAlternativeAssistant(assistant);
                    const newMessage = message.replace(/(?:^|\s)@\w*$/, '');
                    setMessage(newMessage);
                    setShowAssistantSuggestions(false);
                  }}
                />
              ))}
            </div>
          )}
          
          {showPromptSuggestions && filteredPrompts.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 px-3 py-1 flex items-center gap-1">
                <SlashIcon className="w-3 h-3" />
                Select a prompt
              </div>
              {filteredPrompts.map((prompt, index) => (
                <PromptSuggestionItem
                  key={index}
                  prompt={prompt}
                  isSelected={index === selectedSuggestionIndex}
                  onClick={() => {
                    const newMessage = message.replace(/(?:^|\s)\/\w*$/, ' ' + prompt.content);
                    setMessage(newMessage);
                    setShowPromptSuggestions(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main input container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Alternative assistant banner */}
        {alternativeAssistant && (
          <div className="px-4 py-2 bg-gradient-to-r from-[#aedfe4]/10 to-[#1275bc]/10 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AtSignIcon className="w-4 h-4 text-[#1275bc]" />
              <span className="text-sm font-medium text-gray-700">
                {alternativeAssistant.name}
              </span>
            </div>
            <button
              onClick={() => setAlternativeAssistant(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Files and filters chips */}
        {(allFiles.length > 0 || selectedFolders?.length > 0 || selectedDocuments.length > 0) && (
          <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-2">
            {allFiles.map((file, index) => (
              <SourceChip
                key={`${file.type}-${file.id}-${index}`}
                icon={
                  file.isUploading ? (
                    <FiLoader className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileIcon className="w-3 h-3" />
                  )
                }
                title={file.name}
                onRemove={() => {
                  if (file.type === 'selected' && removeSelectedFile) {
                    removeSelectedFile(file.original);
                  } else if (setCurrentMessageFiles) {
                    setCurrentMessageFiles(prev => 
                      prev.filter(f => f.id !== file.id)
                    );
                  }
                }}
              />
            ))}
            
            {selectedFolders?.map(folder => (
              <SourceChip
                key={folder.id}
                icon={<FolderIcon className="w-3 h-3" />}
                title={folder.name}
                onRemove={() => removeSelectedFolder && removeSelectedFolder(folder)}
              />
            ))}
            
            {selectedDocuments.length > 0 && (
              <SourceChip
                key="selected-docs"
                icon={<FileIcon className="w-3 h-3" />}
                title={`${selectedDocuments.length} documents`}
                onClick={onToggleDocumentSidebar}
                onRemove={onRemoveDocs}
              />
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textAreaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={`Message ${selectedAssistant?.name || 'assistant'}... (@ for assistants, / for prompts)`}
          className={`
            w-full px-4 py-3 resize-none outline-none text-gray-700
            placeholder-gray-400 bg-transparent
            ${textAreaRef.current && textAreaRef.current.scrollHeight > MAX_INPUT_HEIGHT ? 'overflow-y-auto' : ''}
          `}
          style={{ scrollbarWidth: 'thin' }}
          autoFocus
        />

        {/* Bottom toolbar */}
        <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDocSelection}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Attach files"
            >
              <FiPlusCircle className="w-5 h-5" />
            </button>
            
            <button
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Filters"
            >
              <FiFilter className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => {
              if (chatState === 'streaming') {
                stopGenerating();
              } else if (message.trim()) {
                onSubmit();
              }
            }}
            disabled={chatState === 'loading' || (!message.trim() && chatState === 'input')}
            className={`
              p-2 rounded-full transition-all
              ${chatState === 'streaming' 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : message.trim() && chatState === 'input'
                  ? 'bg-gradient-to-r from-[#aedfe4] to-[#1275bc] hover:from-[#9dd0d5] hover:to-[#0f64a1] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {chatState === 'streaming' ? (
              <FiSquare className="w-4 h-4" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
