import { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  Globe, 
  Database,
  ChevronRight,
  ExternalLink,
  Calendar,
  User
} from 'lucide-react';

// Document type icons
const getDocumentIcon = (sourceType) => {
  switch (sourceType) {
    case 'web':
      return <Globe className="w-4 h-4" />;
    case 'file':
      return <FileText className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
};

// Single document item in the sidebar
function DocumentItem({ document, isSelected, onToggle, onView }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
      <div className="p-3 bg-white hover:bg-gray-50 transition-colors duration-200">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="mt-1 rounded border-gray-300 text-emtek-navy focus:ring-emtek-navy"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="text-gray-400 mt-0.5">
                {getDocumentIcon(document.source_type)}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                  {document.title || document.semantic_identifier}
                </h4>
                
                {document.source_type && (
                  <p className="text-xs text-gray-500 mt-1">
                    {document.source_type}
                  </p>
                )}
                
                {document.score && (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Relevance:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                        <div 
                          className="bg-emtek-navy h-1.5 rounded-full"
                          style={{ width: `${Math.min(document.score * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round(document.score * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-emtek-navy hover:text-emtek-blue transition-colors flex items-center gap-1"
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                {isExpanded ? 'Hide' : 'Show'} preview
              </button>
              
              {document.link && (
                <a
                  href={document.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emtek-navy hover:text-emtek-blue transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
              )}
              
              <button
                onClick={onView}
                className="text-xs text-emtek-navy hover:text-emtek-blue transition-colors"
              >
                View full
              </button>
            </div>
          </div>
        </div>
        
        {isExpanded && document.content && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-600 line-clamp-4">
              {document.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main document sidebar component
export function DocumentSidebar({
  isOpen,
  onClose,
  documents = [],
  selectedDocuments = [],
  onToggleDocument,
  onClearSelection,
  onViewDocument,
  selectedMessageId,
  width = 400,
  className = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Filter documents based on search and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      (doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       doc.semantic_identifier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       doc.content?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || doc.source_type === filterType;
    
    return matchesSearch && matchesType;
  });
  
  // Get unique source types
  const sourceTypes = ['all', ...new Set(documents.map(d => d.source_type).filter(Boolean))];
  
  return (
    <div
      className={`fixed right-0 top-0 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${className}`}
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Sources & Documents
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emtek-navy"
          />
        </div>
        
        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {sourceTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterType === type
                  ? 'bg-emtek-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Selection info */}
      {selectedDocuments.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
      
      {/* Documents list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No documents match your search' : 'No documents available'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc, idx) => (
              <DocumentItem
                key={doc.document_id || idx}
                document={doc}
                isSelected={selectedDocuments.some(d => d.document_id === doc.document_id)}
                onToggle={() => onToggleDocument(doc)}
                onView={() => onViewDocument(doc)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with stats */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-xs text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Total documents:</span>
            <span className="font-medium">{documents.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Showing:</span>
            <span className="font-medium">{filteredDocuments.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Resizable handle for the sidebar
export function ResizableHandle({ onResize, isResizing, setIsResizing }) {
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      onResize(Math.max(300, Math.min(800, newWidth)));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize, setIsResizing]);
  
  return (
    <div
      className="absolute left-0 top-0 h-full w-1 hover:w-2 bg-gray-300 hover:bg-emtek-navy cursor-col-resize transition-all"
      onMouseDown={() => setIsResizing(true)}
    />
  );
}
