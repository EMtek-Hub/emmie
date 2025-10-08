import React, { useState, useRef, useCallback } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  Globe, 
  Upload,
  Link as LinkIcon,
  File as FileIcon,
  Folder,
  ChevronRight
} from 'lucide-react';
import { useDocumentsContext } from './DocumentsContext-simple';

const DocumentSelectionModal = ({ isOpen, onClose, onSetContext }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  
  const { 
    folders, 
    files,
    isLoading,
    refreshFolders,
    handleUpload,
    createFileFromLink
  } = useDocumentsContext();

  // Calculate total token count from database token_count field
  const totalTokens = selectedItems.reduce((total, item) => {
    // Use actual token_count from database if available
    return total + (item.token_count || 0);
  }, 0);

  // Filter documents based on search
  const filteredDocuments = React.useMemo(() => {
    const folderFiles = folders.flatMap(folder => folder.files || []);
    const allFiles = [...folderFiles, ...(files || [])];
    if (!searchQuery) return allFiles;
    
    return allFiles.filter(file => 
      file.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, files, searchQuery]);

  // Handle file selection
  const toggleFileSelection = useCallback((file) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(item => item.id === file.id);
      if (isSelected) {
        return prev.filter(item => item.id !== file.id);
      } else {
        return [...prev, { ...file, type: 'document' }];
      }
    });
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      try {
        await handleUpload(files);
        await refreshFolders();
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [handleUpload, refreshFolders]);

  // Handle file input
  const handleFileInput = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        await handleUpload(files);
        await refreshFolders();
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [handleUpload, refreshFolders]);

  // Handle URL addition
  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;
    
    try {
      const result = await createFileFromLink(urlInput, null);
      if (result) {
        setSelectedItems(prev => [...prev, { 
          ...result, 
          type: 'link',
          name: urlInput,
          url: urlInput 
        }]);
        setUrlInput('');
      }
    } catch (error) {
      console.error('Failed to add URL:', error);
    }
  }, [urlInput, createFileFromLink]);

  // Handle setting context
  const handleSetContext = useCallback(() => {
    onSetContext(selectedItems);
    setSelectedItems([]);
    onClose();
  }, [selectedItems, onSetContext, onClose]);

  // Remove selected item
  const removeSelectedItem = useCallback((itemId) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Documents</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Documents */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Folders */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <span className="text-sm font-medium text-gray-700">Files</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-sm text-gray-700">Recent Documents</span>
                  <span className="text-sm text-gray-500">{filteredDocuments.length} files</span>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading...</div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">No documents found</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => toggleFileSelection(file)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItems.some(item => item.id === file.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        {file.file_size && (
                          <p className="text-xs text-gray-500">
                            {(file.file_size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      {selectedItems.some(item => item.id === file.id) && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Selected Items */}
          <div className="w-1/2 flex flex-col">
            {/* Selected Items Header */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Items</h3>
              
              {/* Selected Items List */}
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeSelectedItem(item.id)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="flex-1 p-4 flex flex-col">
              <div
                className={`border-2 border-dashed rounded-lg flex-1 flex flex-col items-center justify-center transition-colors mb-4 ${
                  isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Drag & drop or click to upload files
                </p>
                
                {/* Upload Input */}
                {uploadMode === 'file' ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Choose Files
                  </button>
                ) : (
                  <div className="w-full max-w-xs">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Enter URL..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                      />
                      <button
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim()}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* File/URL Toggle - Now below the drop area */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setUploadMode('file')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    uploadMode === 'file'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FileIcon className="w-4 h-4" />
                  File
                </button>
                <button
                  onClick={() => setUploadMode('url')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    uploadMode === 'url'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  URL
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Selected context: <span className="font-medium">{totalTokens.toLocaleString()}</span> / 200,000 LLM tokens
          </div>
          <button
            onClick={handleSetContext}
            disabled={selectedItems.length === 0}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Set as Context
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
};

export default DocumentSelectionModal;
