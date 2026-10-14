import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  FileText, 
  Folder as FolderIcon,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { DocumentItem, FolderItem } from '../types.ts';

export const RecycleBinView: React.FC = () => {
  const [trashedDocs, setTrashedDocs] = useState<DocumentItem[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecycleBin();
  }, []);

  const loadRecycleBin = async () => {
    setLoading(true);
    try {
      const [docsRes, foldersRes] = await Promise.all([
        api.getDocuments({ isTrashed: true }),
        api.getFolders({ isTrashed: true }),
      ]);
      setTrashedDocs(docsRes.documents);
      setTrashedFolders(foldersRes.folders);
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDoc = async (doc: DocumentItem) => {
    try {
      await api.updateDocument(doc.id, { isTrashed: false });
      setTrashedDocs(trashedDocs.filter(d => d.id !== doc.id));
    } catch (err) {
      console.error('Failed to restore document', err);
    }
  };

  const handlePermanentDeleteDoc = async (doc: DocumentItem) => {
    if (!confirm(`Permanently delete "${doc.title}"? This cannot be undone and will permanently wipe the physical file from storage.`)) return;
    try {
      await api.permanentDeleteDocument(doc.id);
      setTrashedDocs(trashedDocs.filter(d => d.id !== doc.id));
    } catch (err) {
      console.error('Failed to purge document', err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recycle Bin
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Safe Soft-Delete
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Items here are held safely and can be restored back to your personal vault anytime or purged permanently.
        </p>
      </div>

      <div className="bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading trash...</div>
        ) : trashedDocs.length === 0 && trashedFolders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Trash2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Recycle bin is clean
            </h4>
            <p className="mt-1">
              No files or folders have been discarded.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {trashedDocs.map(doc => (
              <div 
                key={doc.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{formatBytes(doc.sizeBytes)}</span>
                      <span>•</span>
                      <span>Trashed: {doc.trashedAt ? new Date(doc.trashedAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestoreDoc(doc)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDeleteDoc(doc)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Forever</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
