import { useState, useCallback } from 'react';
import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react';

export function DragDropWrapper({ 
  children, 
  onDrop, 
  accept = 'image/*,.pdf,.doc,.docx,.txt,.md,.csv',
  disabled = false,
  className = '' 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (disabled) return;

    const files = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i]);
      }
      if (onDrop) {
        onDrop(files);
      }
    }
  }, [onDrop, disabled]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      {children}
      
      {/* Drag overlay */}
      {isDragging && !disabled && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="absolute inset-4 border-2 border-dashed border-emtek-navy rounded-xl bg-white/95 flex items-center justify-center animate-pulse">
            <div className="text-center">
              <Upload className="w-12 h-12 text-emtek-navy mx-auto mb-3" />
              <p className="text-lg font-semibold text-emtek-navy mb-1">
                Drop files here
              </p>
              <p className="text-sm text-gray-600">
                Images, PDFs, documents and more
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// File preview component for uploaded files
export function FilePreview({ file, onRemove, isUploading = false, error = null }) {
  const isImage = file.type?.startsWith('image/');
  const [imageUrl, setImageUrl] = useState(null);

  // Create preview URL for images
  useState(() => {
    if (isImage && file instanceof File) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div className="relative group">
      {isImage ? (
        <div className="relative">
          <img
            src={imageUrl || file.url}
            alt={file.name}
            className={`w-20 h-20 object-cover rounded-lg border shadow-sm transition-all ${
              error 
                ? 'border-red-300 opacity-75' 
                : isUploading
                  ? 'border-gray-200 opacity-75'
                  : 'border-green-300'
            }`}
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 bg-red-500/50 rounded-lg flex items-center justify-center">
              <div className="bg-white/90 rounded px-2 py-1">
                <span className="text-xs text-red-600 font-medium">Error</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 min-w-[150px] transition-all ${
          error 
            ? 'bg-red-50 border border-red-200' 
            : isUploading
              ? 'bg-gray-100'
              : 'bg-green-50 border border-green-200'
        }`}>
          <FileText className={`w-4 h-4 ${
            error ? 'text-red-500' : isUploading ? 'text-gray-500' : 'text-green-500'
          }`} />
          <span className={`text-sm truncate flex-1 ${
            error ? 'text-red-700' : isUploading ? 'text-gray-700' : 'text-green-700'
          }`}>
            {file.name}
          </span>
          {isUploading && (
            <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
      
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Files upload zone component
export function FileUploadZone({ 
  onFilesSelected, 
  accept = 'image/*,.pdf,.doc,.docx,.txt,.md,.csv',
  multiple = true,
  className = '' 
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFilesSelected) {
      onFilesSelected(files);
    }
    e.target.value = ''; // Reset input
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFilesSelected) {
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      <input
        type="file"
        id="file-upload"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <label
        htmlFor="file-upload"
        className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-emtek-navy bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          Images, PDFs, documents up to 10MB
        </p>
      </label>
    </div>
  );
}
