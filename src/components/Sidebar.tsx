import React from 'react';
import { 
  LayoutDashboard, 
  Files, 
  Briefcase, 
  GraduationCap, 
  FolderGit2, 
  Award, 
  Lock, 
  Star, 
  Share2, 
  Trash2, 
  Settings, 
  FlaskConical,
  HardDrive,
  X,
  Upload
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, category?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  storageUsedBytes: number;
  storageLimitBytes: number;
  onOpenUpload: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onClose,
  storageUsedBytes,
  storageLimitBytes,
  onOpenUpload,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all', label: 'All Documents', icon: Files },
    { type: 'header', label: 'ACADEMIC & CAREER' },
    { id: 'cv', label: 'CVs & Career', icon: Briefcase, category: 'cv' },
    { id: 'research-docs', label: 'Research & Papers', icon: FlaskConical, category: 'research' },
    { id: 'university', label: 'University Records', icon: GraduationCap, category: 'university' },
    { id: 'projects', label: 'Projects & Portfolio', icon: FolderGit2, category: 'projects' },
    { id: 'certificates', label: 'Certificates & Honors', icon: Award, category: 'certificates' },
    { id: 'personal', label: 'Private Records', icon: Lock, category: 'personal' },
    { type: 'header', label: 'MANAGEMENT & WORKSPACE' },
    { id: 'research-workspace', label: 'Research Workspace', icon: FlaskConical, badge: 'Pro' },
    { id: 'shares', label: 'Active Share Links', icon: Share2 },
    { id: 'favorites', label: 'Pinned & Favorites', icon: Star },
    { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
    { id: 'settings', label: 'Settings & Privacy', icon: Settings },
  ];

  const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);
  const gbVal = storageLimitBytes / (1024 * 1024 * 1024);
  const storageLimitGB = Number.isInteger(gbVal) ? gbVal.toString() : gbVal.toFixed(1);
  const percentUsed = Math.min(100, Math.round((storageUsedBytes / (storageLimitBytes || 1)) * 100));

  const handleItemClick = (item: any) => {
    if (item.category) {
      onNavigate('documents', item.category);
    } else if (item.id === 'all') {
      onNavigate('documents', 'all');
    } else if (item.id === 'favorites') {
      onNavigate('documents', 'favorites');
    } else {
      onNavigate(item.id);
    }
    onClose();
  };

  const isActive = (item: any) => {
    if (item.category && currentView === `documents-${item.category}`) return true;
    if (item.id === 'all' && currentView === 'documents-all') return true;
    if (item.id === 'favorites' && currentView === 'documents-favorites') return true;
    return currentView === item.id;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#0c1412] border-r border-emerald-950/5 dark:border-emerald-500/10 flex flex-col justify-between transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between border-b border-emerald-950/5 dark:border-emerald-500/10">
          <BrandLogo size="md" />
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <div key={idx} className="pt-3 pb-1 px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {item.label}
                </div>
              );
            }

            const Icon = item.icon!;
            const active = isActive(item);

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors
                  ${active 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Storage Widget & Upload Action */}
        <div className="p-4 border-t border-emerald-950/5 dark:border-emerald-500/10 bg-slate-50/50 dark:bg-[#0e1715]/50">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Vault Storage</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">{percentUsed}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${percentUsed > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            <span>{storageUsedMB} MB used</span>
            <span>{storageLimitGB} GB limit</span>
          </div>

          {user && (
            <button
              onClick={onOpenUpload}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
