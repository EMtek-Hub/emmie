import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Plus, 
  X, 
  Filter, 
  Loader, 
  File as FileIcon,
  Folder as FolderIcon,
  Calendar,
  Tag,
  Send,
  StopCircle,
  PlusCircle,
  ChevronDown,
  FileText,
  Link,
  Upload,
  Search
} from 'lucide-react';
import { useDocumentsContext } from './DocumentsContext';
import { ChatFileType } from '../../lib/chat/interfaces';

// Source chip component for showing selected items
const SourceChip = ({ icon, title, onRemove, onClick, truncateTitle = true }) => (
  <div
    onClick={onClick || undefined}
    className={`
      flex-none
      flex
      items-center
      px-2
      py-1
      bg-white
      text-xs
      text-gray-600
      border
      gap-x-1.5
      border-gray-200
      rounded-md
      box-border
      h-6
      ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
      transition-colors duration-200
    `}
  >
    {icon}
    <span className="truncate max-w-[150px]">
      {truncateTitle && title.length > 20 ? `${title.slice(0, 20)}...` : title}
    </span>
    {onRemove && (
      <X
        size={12}
        className="text-gray-500 ml-auto cursor-pointer hover:text-gray-700"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      />
    )}
  </div>
);

// Chat input option button
const ChatInputOption = ({ name, Icon, onClick, tooltipContent, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="p-2 text-gray-500 hover:text-emtek-navy hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    title={tooltipContent}
  >
    <Icon size={18} />
  </button>
);

// File upload modal
const FileUploadModal = ({ isOpen, onClose, onUpload, onLinkUpload }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Documents</h3>
        
        <div className="space-y-4">
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-emtek-navy hover:bg-gray-50 transition-all duration-200"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Click to upload files</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOC, TXT, Images</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.csv,image/*"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onUpload(Array.from(e.target.files));
                  onClose();
                }
              }}
              className="hidden"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
          
          <div>
            <input
              type="url"
              placeholder="Paste a link to a document..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emtek-navy/20 focus:border-emtek-navy"
            />
            <button
              onClick={() => {
                if (linkUrl) {
                  onLinkUpload(linkUrl);
                  setLinkUrl('');
                  onClose();
                }
              }}
              disabled={!linkUrl}
              className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-[#aedfe4] to-[#1275bc] text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add from Link
            </button>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export function ChatInputBar({
  message,
  setMessage,
  onSubmit,
  stopGenerating,
  chatState,
  selectedAgent,
  agents = [],
  onAgentChange,
  selectedDocuments = [],
  toggleDocumentSidebar,
  removeSelectedDocuments,
  textAreaRef,
  uploadedFiles = [],
  handleFileUpload,
  setUploadedFiles
}) {
  const {
    selectedFiles,
    selectedFolders,
    removeSelectedFile,
    removeSelectedFolder,
    currentMessageFiles,
    setCurrentMessageFiles,
    createFileFromLink
  } = useDocumentsContext();

  const [showFileModal, setShowFileModal] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const agentMenuRef = useRef(null);

  // Combine selected files and current message files
  const allFiles = useMemo(() => {
    const combined = [];
    const currentFileIds = new Set(currentMessageFiles.map(f => f.id));

    selectedFiles.forEach(file => {
      if (!currentFileIds.has(file.id)) {
        combined.push({
          ...file,
          source: 'selected'
        });
      }
    });

    currentMessageFiles.forEach(file => {
      combined.push({
        ...file,
        source: 'current'
      });
    });

    return combined;
  }, [selectedFiles, currentMessageFiles]);

  // Close agent menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target)) {
        setShowAgentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message, textAreaRef]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSubmit(e);
      }
    }
  };

  const handleLinkUpload = async (url) => {
    try {
      const files = await createFileFromLink(url, null);
      if (files && files.length > 0) {
        setCurrentMessageFiles(prev => [...prev, ...files]);
      }
    } catch (error) {
      console.error('Failed to create file from link:', error);
    }
  };

  const hasAttachments = allFiles.length > 0 || 
                         selectedFolders.length > 0 || 
                         selectedDocuments.length > 0 ||
                         uploadedFiles.length > 0;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          {/* Attachments Display */}
          {hasAttachments && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-200 bg-white">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Files */}
                {allFiles.map((file, index) => (
                  <SourceChip
                    key={`file-${file.id}-${index}`}
                    icon={
                      file.isUploading ? (
                        <Loader className="animate-spin" size={14} />
                      ) : file.chat_file_type === ChatFileType.IMAGE ? (
                        <img
                          className="w-4 h-4 object-cover rounded"
                          src={file.url || `/api/user/file/${file.id}/preview`}
                          alt={file.name}
                        />
                      ) : (
                        <FileIcon size={14} />
                      )
                    }
                    title={file.name}
                    onRemove={() => {
                      if (file.source === 'selected') {
                        removeSelectedFile(file);
                      } else {
                        setCurrentMessageFiles(prev => prev.filter(f => f.id !== file.id));
                      }
                    }}
                  />
                ))}

                {/* Folders */}
                {selectedFolders.map(folder => (
                  <SourceChip
                    key={`folder-${folder.id}`}
                    icon={<FolderIcon size={14} />}
                    title={folder.name}
                    onRemove={() => removeSelectedFolder(folder)}
                  />
                ))}

                {/* Selected Documents */}
                {selectedDocuments.length > 0 && (
                  <SourceChip
                    icon={<FileText size={14} />}
                    title={`${selectedDocuments.length} documents`}
                    onClick={toggleDocumentSidebar}
                    onRemove={removeSelectedDocuments}
                  />
                )}

                {/* Uploaded Files */}
                {uploadedFiles.map((file, index) => (
                  <SourceChip
                    key={`upload-${index}`}
                    icon={
                      file.uploading ? (
                        <Loader className="animate-spin" size={14} />
                      ) : file.type === ChatFileType.IMAGE ? (
                        <img
                          className="w-4 h-4 object-cover rounded"
                          src={file.previewUrl || file.url}
                          alt={file.name}
                        />
                      ) : (
                        <FileIcon size={14} />
                      )
                    }
                    title={file.name}
                    onRemove={() => {
                      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-end">
            {/* Left Actions */}
            <div className="flex items-center px-2 pb-2">
              <ChatInputOption
                name="Add Files"
                Icon={PlusCircle}
                onClick={() => setShowFileModal(true)}
                tooltipContent="Upload files and documents"
              />
              
              {/* Agent Selector */}
              {agents.length > 0 && (
                <div className="relative" ref={agentMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowAgentMenu(!showAgentMenu)}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-emtek-navy hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedAgent?.color || '#6366f1' }}
                    />
                    <span>{selectedAgent?.name || 'General'}</span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {showAgentMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            onAgentChange(agent);
                            setShowAgentMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: agent.color }}
                          />
                          <span>{agent.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ChatInputOption
                name="Search"
                Icon={Search}
                onClick={toggleDocumentSidebar}
                tooltipContent="Search documents"
              />
            </div>

            {/* Textarea */}
            <textarea
              ref={textAreaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedAgent?.name || 'Emmie'}...`}
              className="flex-1 px-3 py-3 bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '200px' }}
            />

            {/* Send/Stop Button */}
            <div className="px-2 pb-2">
              {chatState === 'streaming' ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={onSubmit}
                  disabled={!message.trim() || chatState === 'loading'}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    message.trim() && chatState !== 'loading'
                      ? 'bg-gradient-to-r from-[#aedfe4] to-[#1275bc] text-white hover:shadow-md'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onUpload={handleFileUpload}
        onLinkUpload={handleLinkUpload}
      />
    </div>
  );
}
