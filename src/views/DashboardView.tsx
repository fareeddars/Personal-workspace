import React, { useState, useEffect } from 'react';
import { 
  Files, 
  Folder, 
  Share2, 
  HardDrive, 
  Upload, 
  FolderPlus, 
  BookOpen, 
  Star, 
  Clock, 
  Eye, 
  Download, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Activity,
  Plus
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { DashboardStats, DocumentItem, ActivityLogItem } from '../types.ts';

interface DashboardViewProps {
  onOpenUpload: (category?: string) => void;
  onOpenCreateFolder: () => void;
  onOpenCreateProject: () => void;
  onNavigate: (view: string, category?: string) => void;
  onViewDocument: (doc: DocumentItem) => void;
  onOpenShare: (doc: DocumentItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenUpload,
  onOpenCreateFolder,
  onOpenCreateProject,
  onNavigate,
  onViewDocument,
  onOpenShare,
}) => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to fetch workspace statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const storageUsed = stats?.totalStorageBytes || 0;
  const storageLimit = stats?.storageLimitBytes || 21474836480;
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {profile?.displayName || user?.displayName || 'Scholar'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Secure Vault
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {profile?.institution || 'University Research Center'} • {profile?.department || 'Academic Department'}
          </p>
        </div>

        {/* Quick action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenUpload()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <button
            onClick={onOpenCreateFolder}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm shadow-xs transition-all"
          >
            <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>New Folder</span>
          </button>
          <button
            onClick={onOpenCreateProject}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm shadow-xs transition-all"
          >
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>New Research</span>
          </button>
          <button
            onClick={() => onOpenUpload('cv')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Add CV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div 
          onClick={() => onNavigate('documents', 'all')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Files className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats?.totalDocuments || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{stats?.favoriteCount || 0} pinned / favorites</span>
          </p>
        </div>

        {/* Total Folders */}
        <div 
          onClick={() => onNavigate('documents', 'all')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organized Folders</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats?.totalFolders || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Hierarchical directory tree
          </p>
        </div>

        {/* Active Shares */}
        <div 
          onClick={() => onNavigate('shares')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Shares</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats?.totalShares || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Professors & supervisor links
          </p>
        </div>

        {/* Vault Storage */}
        <div 
          onClick={() => onNavigate('settings')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vault Storage</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {formatBytes(storageUsed)}
          </p>
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${storagePercent}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>{storagePercent}% used</span>
            <span>of {formatBytes(storageLimit)}</span>
          </p>
        </div>
      </div>

      {/* Academic Category Overview Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Academic & Personal Vaults
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'cv', label: 'CVs & Career', count: stats?.categoryCounts?.cv || 0, color: 'from-emerald-500 to-teal-600' },
            { id: 'research', label: 'Research Papers', count: stats?.categoryCounts?.research || 0, color: 'from-teal-500 to-cyan-600' },
            { id: 'university', label: 'University Records', count: stats?.categoryCounts?.university || 0, color: 'from-blue-500 to-indigo-600' },
            { id: 'projects', label: 'Projects & Code', count: stats?.categoryCounts?.projects || 0, color: 'from-indigo-500 to-violet-600' },
            { id: 'certificates', label: 'Certificates', count: stats?.categoryCounts?.certificates || 0, color: 'from-amber-500 to-orange-600' },
            { id: 'personal', label: 'Private Records', count: stats?.categoryCounts?.personal || 0, color: 'from-rose-500 to-pink-600' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigate('documents', cat.id)}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-400 text-left transition-all group"
            >
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center text-xs font-bold shadow-xs mb-2 group-hover:scale-105 transition-transform`}>
                {cat.count}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{cat.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{cat.count} documents</p>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Recently Uploaded Files & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Documents */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Recently Uploaded & Updated
            </h2>
            <button
              onClick={() => onNavigate('documents', 'all')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
            {stats?.recentUploads && stats.recentUploads.length > 0 ? (
              stats.recentUploads.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onViewDocument(doc)}
                  className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="uppercase font-mono">{doc.fileExtension}</span>
                        <span>•</span>
                        <span>{formatBytes(doc.sizeBytes)}</span>
                        <span>•</span>
                        <span className="capitalize">{doc.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenShare(doc); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Share document"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      download={doc.originalFilename}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p>No documents uploaded yet.</p>
                <button
                  onClick={() => onOpenUpload()}
                  className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs"
                >
                  Upload Your First Document
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Activity Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Activity Log</span>
            </h2>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Audit Trail
            </button>
          </div>

          <div className="bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs space-y-3 max-h-[380px] overflow-y-auto">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs pb-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {act.details || act.action}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No recent activity recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
