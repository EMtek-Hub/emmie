import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ChatFileType } from '../../lib/chat/interfaces';

const DocumentsContext = createContext(undefined);

export const DocumentsProvider = ({ children, initialFolderDetails }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [presentingDocument, setPresentingDocument] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [folderDetails, setFolderDetails] = useState(initialFolderDetails || null);
  const [currentMessageFiles, setCurrentMessageFiles] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFolders = async () => {
      await refreshFolders();
      setIsLoading(false);
    };
    fetchFolders();
  }, []);

  const refreshFolders = async () => {
    try {
      const response = await fetch('/api/user/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      setError('Failed to fetch folders');
    }
  };

  const uploadFile = useCallback(async (formData, folderId) => {
    if (folderId) {
      formData.append('folder_id', folderId.toString());
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/file/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload file');
      }

      const data = await response.json();
      await refreshFolders();
      return data;
    } catch (error) {
      console.error('Failed to upload file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (name, description = '') => {
    try {
      const response = await fetch('/api/user/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (!response.ok) throw new Error('Failed to create folder');
      
      const newFolder = await response.json();
      await refreshFolders();
      return newFolder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }, []);

  const deleteItem = useCallback(async (itemId, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/user/folders/${itemId}` : `/api/user/file/${itemId}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      
      if (!response.ok) throw new Error('Failed to delete item');
      
      await refreshFolders();
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  }, []);

  const moveItem = async (itemId, newFolderId, isFolder) => {
    try {
      const endpoint = isFolder 
        ? `/api/user/folders/${itemId}/move`
        : `/api/user/file/${itemId}/move`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_folder_id: newFolderId })
      });

      if (!response.ok) throw new Error('Failed to move item');
      
      await refreshFolders();
    } catch (error) {
      console.error('Failed to move item:', error);
      setError(error instanceof Error ? error.message : 'Failed to move item');
      throw error;
    }
  };

  const downloadItem = useCallback(async (documentId) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) throw new Error('Failed to download document');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    } catch (error) {
      console.error('Failed to download item:', error);
      throw error;
    }
  }, []);

  const renameItem = useCallback(async (itemId, newName, isFolder) => {
    try {
      const endpoint = isFolder
        ? `/api/user/folders/${itemId}`
        : `/api/user/file/${itemId}`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) throw new Error('Failed to rename item');
      
      await refreshFolders();
    } catch (error) {
      console.error('Failed to rename item:', error);
      throw error;
    }
  }, []);

  const getFolderDetails = useCallback(async (folderId) => {
    try {
      const response = await fetch(`/api/user/folders/${folderId}`);
      if (!response.ok) throw new Error('Failed to get folder details');
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get folder details:', error);
      throw error;
    }
  }, []);

  const updateFolderDetails = useCallback(async (folderId, name, description) => {
    try {
      const response = await fetch(`/api/user/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (!response.ok) throw new Error('Failed to update folder');
      
      await refreshFolders();
    } catch (error) {
      console.error('Failed to update folder details:', error);
      throw error;
    }
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

  const refreshFolderDetails = useCallback(async () => {
    if (folderDetails) {
      const details = await getFolderDetails(folderDetails.id);
      setFolderDetails(details);
    }
  }, [folderDetails, getFolderDetails]);

  const createFileFromLink = useCallback(async (url, folderId) => {
    try {
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
      throw error;
    }
  }, []);

  const handleUpload = useCallback(async (files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      setIsLoading(true);

      await uploadFile(formData, folderDetails?.id || null);
      await refreshFolderDetails();
    } catch (error) {
      console.error('Error uploading documents:', error);
      setError('Failed to upload documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadFile, folderDetails, refreshFolderDetails]);

  const getFolders = async () => {
    try {
      const response = await fetch('/api/user/folders');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return await response.json();
    } catch (error) {
      console.error('Error fetching folders:', error);
      return [];
    }
  };

  const getFilesIndexingStatus = async (fileIds) => {
    try {
      const queryParams = fileIds.map(id => `file_ids=${id}`).join('&');
      const response = await fetch(`/api/user/file/indexing-status?${queryParams}`);

      if (!response.ok) throw new Error('Failed to fetch indexing status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching indexing status:', error);
      return {};
    }
  };

  const renameFile = useCallback(async (fileId, newName) => {
    await renameItem(fileId, newName, false);
  }, [renameItem]);

  const renameFolder = useCallback(async (folderId, newName) => {
    await renameItem(folderId, newName, true);
  }, [renameItem]);

  const value = {
    files: folders.flatMap(folder => folder.files || []),
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
    moveItem,
    renameFile,
    renameFolder,
    uploadFile,
    setCurrentFolder,
    setPresentingDocument,
    setSearchQuery,
    setPage,
    getFilesIndexingStatus,
    getFolderDetails,
    downloadItem,
    renameItem,
    createFileFromLink,
    handleUpload,
    refreshFolderDetails,
    getFolders,
    folderDetails,
    updateFolderDetails,
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
