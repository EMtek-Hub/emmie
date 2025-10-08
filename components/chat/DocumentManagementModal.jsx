import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Folder, 
  FileText, 
  Plus,
  Trash2,
  Edit2,
  Save,
  FolderPlus,
  Move,
  Upload
} from 'lucide-react';
import { useDocumentsContext } from './DocumentsContext-simple';

export default function DocumentManagementModal({ isOpen, onClose }) {
  const {
    folders,
    files,
    refreshFolders
  } = useDocumentsContext();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [movingFiles, setMovingFiles] = useState(false);
  const [targetFolder, setTargetFolder] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [deletingFolderId, setDeletingFolderId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Flatten all files from folders
  const allFiles = [
    ...files,
    ...folders.flatMap(folder => (folder.files || []).map(file => ({
      ...file,
      folderName: folder.name,
      folderId: folder.id
    })))
  ];

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      });

      if (response.ok) {
        setNewFolderName('');
        setShowNewFolder(false);
        await refreshFolders();
      } else {
        console.error('Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleRenameFolder = async (folderId, newName) => {
    if (!newName.trim()) return;

    try {
      const response = await fetch(`/api/documents/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (response.ok) {
        setEditingFolder(null);
        await refreshFolders();
      } else {
        console.error('Failed to rename folder');
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Delete this folder and all its files?')) return;

    try {
      const response = await fetch(`/api/documents/folders/${folderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await refreshFolders();
      } else {
        console.error('Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return;

    try {
      const response = await fetch(`/api/documents/files/${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await refreshFolders();
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
      } else {
        console.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleMoveFiles = async () => {
    if (selectedFiles.length === 0 || !targetFolder) return;

    try {
      const response = await fetch('/api/documents/files/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: selectedFiles,
          folderId: targetFolder
        })
      });

      if (response.ok) {
        setSelectedFiles([]);
        setMovingFiles(false);
        setTargetFolder(null);
        await refreshFolders();
      } else {
        console.error('Failed to move files');
      }
    } catch (error) {
      console.error('Error moving files:', error);
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          console.error('Failed to upload file:', file.name);
        }
      }

      // Refresh the file list
      await refreshFolders();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

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
          <h2 className="text-xl font-semibold text-gray-900">Manage Documents</h2>
          <div className="flex items-center gap-2">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="Upload files"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Folders */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Folders</h3>
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
                  title="Create folder"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {/* New Folder Input */}
              {showNewFolder && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateFolder();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowNewFolder(false);
                        setNewFolderName('');
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateFolder();
                    }}
                    className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Save folder"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolder(false);
                      setNewFolderName('');
                    }}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Folders List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      targetFolder === folder.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    {editingFolder === folder.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={folder.name}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameFolder(folder.id, e.target.value);
                            } else if (e.key === 'Escape') {
                              setEditingFolder(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingFolder(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => movingFiles && setTargetFolder(folder.id)}
                        >
                          <Folder className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 truncate">{folder.name}</span>
                          <span className="text-xs text-gray-400">({folder.files?.length || 0})</span>
                        </div>
                        {deletingFolderId === folder.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600">Delete?</span>
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/documents/folders/${folder.id}`, {
                                    method: 'DELETE'
                                  });

                                  if (response.ok) {
                                    await refreshFolders();
                                    setDeletingFolderId(null);
                                  } else {
                                    console.error('Failed to delete folder');
                                    setDeletingFolderId(null);
                                  }
                                } catch (error) {
                                  console.error('Error deleting folder:', error);
                                  setDeletingFolderId(null);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingFolderId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingFolder(folder.id)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeletingFolderId(folder.id)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Files */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                All Files ({allFiles.length})
              </h3>
              {selectedFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedFiles.length} selected
                  </span>
                  {!movingFiles ? (
                    <>
                      <button
                        onClick={() => setMovingFiles(true)}
                        className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                      >
                        <Move className="w-3 h-3" />
                        Move
                      </button>
                      <button
                        onClick={async () => {
                          // Delete all selected files
                          for (const fileId of selectedFiles) {
                            try {
                              await fetch(`/api/documents/files/${fileId}`, {
                                method: 'DELETE'
                              });
                            } catch (error) {
                              console.error('Error deleting file:', error);
                            }
                          }
                          // Refresh and clear selection
                          await refreshFolders();
                          setSelectedFiles([]);
                        }}
                        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleMoveFiles}
                        disabled={!targetFolder}
                        className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Confirm Move
                      </button>
                      <button
                        onClick={() => {
                          setMovingFiles(false);
                          setTargetFolder(null);
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {allFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${
                      selectedFiles.includes(file.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {file.folderName && (
                          <span className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            {file.folderName}
                          </span>
                        )}
                        {file.file_size && (
                          <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    </div>
                    {deletingFileId === file.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/documents/files/${file.id}`, {
                                method: 'DELETE'
                              });

                              if (response.ok) {
                                await refreshFolders();
                                setSelectedFiles(prev => prev.filter(id => id !== file.id));
                                setDeletingFileId(null);
                              } else {
                                console.error('Failed to delete file');
                                setDeletingFileId(null);
                              }
                            } catch (error) {
                              console.error('Error deleting file:', error);
                              setDeletingFileId(null);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeletingFileId(null)}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingFileId(file.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-all"
                        title="Delete file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
