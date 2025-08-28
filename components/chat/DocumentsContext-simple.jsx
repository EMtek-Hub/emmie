import React, { createContext, useContext, useState, useCallback } from 'react';

const DocumentsContext = createContext(undefined);

export const DocumentsProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [presentingDocument, setPresentingDocument] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [currentMessageFiles, setCurrentMessageFiles] = useState([]);
  const [error, setError] = useState(null);

  // Simplified non-failing implementations
  const refreshFolders = useCallback(async () => {
    // No-op for now - prevents crashes
  }, []);

  const uploadFile = useCallback(async (formData, folderId) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (name, description = '') => {
    console.log('Create folder:', name, description);
    return { id: Date.now(), name, description };
  }, []);

  const deleteItem = useCallback(async (itemId, isFolder) => {
    console.log('Delete item:', itemId, isFolder);
  }, []);

  const addSelectedFile = useCallback((file) => {
    setSelectedFiles(prev => {
      if (prev.find(f => f.id === file.id)) return prev;
      return [...prev, file];
    });
  }, []);

  const removeSelectedFile = useCallback((file) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
  }, []);

  const addSelectedFolder = useCallback((folder) => {
    setSelectedFolders(prev => {
      if (prev.find(f => f.id === folder.id)) return prev;
      return [...prev, folder];
    });
  }, []);

  const removeSelectedFolder = useCallback((folder) => {
    setSelectedFolders(prev => prev.filter(f => f.id !== folder.id));
  }, []);

  const clearSelectedItems = useCallback(() => {
    setSelectedFiles([]);
    setSelectedFolders([]);
  }, []);

  const handleUpload = useCallback(async (files) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Upload each file individually
      for (const file of files) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        await uploadFile(fileFormData, null);
      }
      
      await refreshFolders();
    } catch (error) {
      console.error('Error uploading documents:', error);
      setError('Failed to upload documents. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [uploadFile, refreshFolders]);

  const createFileFromLink = useCallback(async (url, folderId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/file/from-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, folder_id: folderId })
      });

      if (!response.ok) throw new Error('Failed to create file from link');
      
      const data = await response.json();
      await refreshFolders();
      return data;
    } catch (error) {
      console.error('Failed to create file from link:', error);
      setError('Failed to create file from link. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFolders]);

  const value = {
    files: [],
    folders,
    currentFolder,
    presentingDocument,
    searchQuery,
    page,
    isLoading,
    error,
    selectedFiles,
    selectedFolders,
    addSelectedFile,
    removeSelectedFile,
    addSelectedFolder,
    removeSelectedFolder,
    clearSelectedItems,
    setSelectedFiles,
    setSelectedFolders,
    refreshFolders,
    createFolder,
    deleteItem,
    uploadFile,
    handleUpload,
    createFileFromLink,
    setCurrentFolder,
    setPresentingDocument,
    setSearchQuery,
    setPage,
    currentMessageFiles,
    setCurrentMessageFiles
  };

  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocumentsContext = () => {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
};
