import { useState, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  File, 
  Folder,
  Search,
  Upload,
  ChevronRight
} from 'lucide-react';

/**
 * Simplified Chat Input Bar
 * Assistant selection moved to sidebar - this focuses on message input and file selection
 */
export default function SimplifiedChatInputBar({ 
  onSendMessage, 
  selectedAgent,
  placeholder = "Type your message...",
  isLoading = false,
  uploadedFiles = [],
  onFileUpload,
  onFileRemove 
}) {
  const [message, setMessage] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Mock data for files and folders - in production these would come from API
  const [folders] = useState([]);
  const [files] = useState([]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      const messageData = {
        content: message.trim(),
        agentId: selectedAgent?.id || 0,
        files: selectedFiles,
        folders: selectedFolders
      };
      
      onSendMessage(messageData);
      setMessage('');
      setSelectedFiles([]);
      setSelectedFolders([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const toggleFileSelection = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const toggleFolderSelection = (folder) => {
    setSelectedFolders(prev => {
      const isSelected = prev.some(f => f.id === folder.id);
      if (isSelected) {
        return prev.filter(f => f.id !== folder.id);
      }
      return [...prev, folder];
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFileUpload) {
      onFileUpload(files);
    }
    e.target.value = null; // Reset input
  };

  const FileSelectionModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Select Files & Folders</h3>
            <button
              onClick={() => setShowFileModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1275bc]/50"
              />
            </div>
          </div>

          {/* Upload Button */}
          <div className="mb-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#aedfe4] to-[#1275bc] text-white rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* File List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {/* Folders */}
            {folders.filter(f => 
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(folder => (
              <div
                key={folder.id}
                onClick={() => toggleFolderSelection(folder)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  selectedFolders.some(f => f.id === folder.id)
                    ? 'bg-gradient-to-r from-[#aedfe4]/20 to-[#1275bc]/20 border border-[#1275bc]/30'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <Folder className="w-5 h-5 text-[#1275bc]" />
                <span className="flex-1 text-sm">{folder.name}</span>
                {folder.file_count > 0 && (
                  <span className="text-xs text-gray-500">{folder.file_count} files</span>
                )}
              </div>
            ))}

            {/* Files */}
            {files.filter(f => 
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(file => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  selectedFiles.some(f => f.id === file.id)
                    ? 'bg-gradient-to-r from-[#aedfe4]/20 to-[#1275bc]/20 border border-[#1275bc]/30'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <File className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <div className="text-sm">{file.name}</div>
                  {file.size && (
                    <div className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>
                {file.indexing_status === 'indexed' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedFiles.length + selectedFolders.length} items selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFileModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowFileModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-[#aedfe4] to-[#1275bc] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col border-t border-gray-100 bg-white">
        {/* Selected Items Display */}
        {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {selectedFolders.map(folder => (
                <div
                  key={folder.id}
                  className="flex items-center gap-2 px-3 py-1 bg-[#aedfe4]/20 text-[#1275bc] rounded-full text-sm"
                >
                  <Folder className="w-3 h-3" />
                  <span>{folder.name}</span>
                  <button
                    onClick={() => toggleFolderSelection(folder)}
                    className="hover:bg-[#1275bc]/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  <File className="w-3 h-3" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => toggleFileSelection(file)}
                    className="hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Assistant Display */}
        {selectedAgent && (
          <div className="px-6 py-2 bg-gradient-to-r from-[#aedfe4]/10 to-[#1275bc]/10 border-b border-[#1275bc]/20">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Using:</span>
              <span className="font-medium text-[#1275bc]">{selectedAgent.name}</span>
              {selectedAgent.description && (
                <>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500 text-xs">{selectedAgent.description}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4">
          <div className="flex items-end gap-3">
            <button
              onClick={() => setShowFileModal(true)}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors group"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5 text-gray-600 group-hover:text-[#1275bc]" />
            </button>

            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none 
                  focus:outline-none focus:ring-2 focus:ring-[#1275bc]/50 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  placeholder-gray-400 text-gray-900"
                rows="1"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className={`p-3 rounded-xl transition-all ${
                message.trim() && !isLoading
                  ? 'bg-gradient-to-r from-[#aedfe4] to-[#1275bc] text-white hover:opacity-90 shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Character count or loading indicator */}
          <div className="mt-2 px-1 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {isLoading ? 'AI is thinking...' : `${message.length} characters`}
            </div>
            <div className="text-xs text-gray-400">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>

      {/* File Selection Modal */}
      {showFileModal && <FileSelectionModal />}
    </>
  );
}
