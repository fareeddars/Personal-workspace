import React, { useState, useEffect } from 'react';
import { 
  Folder as FolderIcon, 
  FileText, 
  Upload, 
  FolderPlus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Star, 
  MoreVertical, 
  Share2, 
  Download, 
  Trash2, 
  ChevronRight, 
  CornerDownRight,
  Pin,
  Eye,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { DocumentItem, FolderItem } from '../types.ts';

interface DocumentsViewProps {
  category: string; // 'all' | 'cv' | 'research' | 'university' | 'projects' | 'certificates' | 'personal' | 'favorites'
  onOpenUpload: (category?: string, folderId?: string) => void;
  onOpenCreateFolder: (parentId?: string | null) => void;
  onViewDocument: (doc: DocumentItem) => void;
  onOpenShare: (doc: DocumentItem) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  category,
  onOpenUpload,
  onOpenCreateFolder,
  onViewDocument,
  onOpenShare,
}) => {
  const { searchQuery } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View & Filter states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'sizeBytes'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [category, currentFolderId, sortBy, sortOrder, searchQuery, selectedTag]);

  const loadData = async () => {
    setLoading(true);
    try {
      const isFav = category === 'favorites';
      const actualCategory = (category === 'all' || category === 'favorites') ? undefined : category;

      const [docsRes, foldersRes] = await Promise.all([
        api.getDocuments({
          category: actualCategory,
          folderId: currentFolderId || (category === 'all' && !isFav ? undefined : undefined),
          isFavorite: isFav ? true : undefined,
          search: searchQuery || undefined,
          tag: selectedTag || undefined,
          sort: sortBy,
          order: sortOrder,
        }),
        api.getFolders({
          category: actualCategory,
          parentId: currentFolderId || (category === 'all' ? 'root' : undefined),
        }),
      ]);

      setDocuments(docsRes.documents);
      setFolders(foldersRes.folders);

      // Extract unique tags
      const tagSet = new Set<string>();
      docsRes.documents.forEach(d => {
        try {
          const parsed = JSON.parse(d.tags);
          if (Array.isArray(parsed)) parsed.forEach(t => tagSet.add(t));
        } catch {}
      });
      setAvailableTags(Array.from(tagSet));
    } catch (err) {
      console.error('Failed to load documents view data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setFolderBreadcrumbs([...folderBreadcrumbs, folder]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderBreadcrumbs([]);
    } else {
      const target = folderBreadcrumbs[index];
      setCurrentFolderId(target.id);
      setFolderBreadcrumbs(folderBreadcrumbs.slice(0, index + 1));
    }
  };

  const handleToggleFavorite = async (doc: DocumentItem) => {
    try {
      await api.updateDocument(doc.id, { isFavorite: !doc.isFavorite });
      setDocuments(documents.map(d => d.id === doc.id ? { ...d, isFavorite: !doc.isFavorite } : d));
    } catch (err) {
      console.error('Failed to update favorite', err);
    }
  };

  const handleTogglePin = async (doc: DocumentItem) => {
    try {
      await api.updateDocument(doc.id, { isPinned: !doc.isPinned });
      setDocuments(documents.map(d => d.id === doc.id ? { ...d, isPinned: !doc.isPinned } : d));
    } catch (err) {
      console.error('Failed to update pin', err);
    }
  };

  const handleSoftDelete = async (doc: DocumentItem) => {
    if (!confirm(`Move "${doc.title}" to Recycle Bin?`)) return;
    try {
      await api.updateDocument(doc.id, { isTrashed: true });
      setDocuments(documents.filter(d => d.id !== doc.id));
    } catch (err) {
      console.error('Failed to trash document', err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'cv': return 'CVs & Career Vault';
      case 'research': return 'Research & Publications';
      case 'university': return 'University & Academic Records';
      case 'projects': return 'Projects & Portfolio';
      case 'certificates': return 'Certificates & Achievements';
      case 'personal': return 'Private Personal Documents';
      case 'favorites': return 'Pinned & Favorite Documents';
      default: return 'All Academic Documents';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getCategoryTitle()}
          </h1>

          {/* Breadcrumb path */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
            >
              Root
            </button>
            {folderBreadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-emerald-600 font-medium ${idx === folderBreadcrumbs.length - 1 ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : ''}`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenCreateFolder(currentFolderId)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm shadow-xs transition-all"
          >
            <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
          <button
            onClick={() => onOpenUpload(category === 'all' || category === 'favorites' ? undefined : category, currentFolderId || undefined)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tag filter pills */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-slate-400 font-medium">Tags:</span>
              <button
                onClick={() => setSelectedTag('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${!selectedTag ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                All
              </button>
              {availableTags.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? '' : t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedTag === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50'}`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sorting */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="createdAt">Date Uploaded</option>
              <option value="title">Alphabetical (Name)</option>
              <option value="sizeBytes">File Size</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:text-emerald-600 font-bold"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Grid vs Table view */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders Section (if any) */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-400 shadow-xs flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div 
                    style={{ backgroundColor: folder.color || '#10b981' }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                  >
                    <FolderIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {folder.name}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Documents ({documents.length})
          </h3>
          <span className="text-xs text-slate-400">
            Total {documents.reduce((acc, d) => acc + d.sizeBytes, 0) > 0 ? formatBytes(documents.reduce((acc, d) => acc + d.sizeBytes, 0)) : '0 B'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No documents in this view
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Upload your research papers, CVs, or university credentials to organize them in this vault.
            </p>
            <button
              onClick={() => onOpenUpload(category === 'all' || category === 'favorites' ? undefined : category, currentFolderId || undefined)}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              Upload Document Now
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map(doc => {
              let tags: string[] = [];
              try { tags = JSON.parse(doc.tags); } catch {}

              return (
                <div
                  key={doc.id}
                  onClick={() => onViewDocument(doc)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top: icon & actions */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase font-mono shadow-xs">
                        {doc.fileExtension.slice(0, 4)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePin(doc); }}
                          className={`p-1.5 rounded-lg transition-colors ${doc.isPinned ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 hover:text-slate-500'}`}
                          title="Pin document"
                        >
                          <Pin className={`w-3.5 h-3.5 ${doc.isPinned ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(doc); }}
                          className={`p-1.5 rounded-lg transition-colors ${doc.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}
                          title="Favorite"
                        >
                          <Star className={`w-3.5 h-3.5 ${doc.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenShare(doc); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="Share securely"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSoftDelete(doc); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate mb-2">
                      {doc.originalFilename}
                    </p>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium">
                            #{t}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Metadata */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Category</th>
                  <th className="py-3 px-4 hidden md:table-cell">Size</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {documents.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => onViewDocument(doc)}
                    className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer group transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate max-w-xs">{doc.title}</span>
                      {doc.isPinned && <Pin className="w-3 h-3 text-emerald-600 fill-current" />}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-slate-500 capitalize">
                      {doc.category}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-500 font-mono">
                      {formatBytes(doc.sizeBytes)}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleFavorite(doc)}
                          className={`p-1.5 rounded-lg ${doc.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}
                        >
                          <Star className={`w-3.5 h-3.5 ${doc.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => onOpenShare(doc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          download={doc.originalFilename}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleSoftDelete(doc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
