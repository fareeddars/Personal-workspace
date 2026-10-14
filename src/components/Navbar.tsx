import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Sun, 
  Moon, 
  Upload, 
  FolderPlus, 
  BookOpen, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  ShieldAlert,
  Menu,
  X,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenCreateFolder: () => void;
  onOpenCreateProject: () => void;
  onOpenAuthModal: () => void;
  onNavigate: (view: string) => void;
  onToggleSidebar: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenCreateFolder,
  onOpenCreateProject,
  onOpenAuthModal,
  onNavigate,
  onToggleSidebar,
}) => {
  const { user, profile, signOut, theme, toggleTheme, searchQuery, setSearchQuery } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-emerald-950/5 dark:border-emerald-500/10 bg-white/90 dark:bg-[#0f1715]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden">
          <BrandLogo size="sm" showSubtitle={false} />
        </div>

        {/* Global Search Input */}
        <div className="hidden sm:flex relative items-center flex-1 max-w-md">
          <Search className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/70 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, tags, research notes..."
            className="w-full h-9 pl-9 pr-9 rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Button */}
        {user && (
          <div className="relative" ref={quickMenuRef}>
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">New</span>
            </button>

            {showQuickMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenUpload(); }}
                  className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5"
                >
                  <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Upload Documents</span>
                </button>
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenCreateFolder(); }}
                  className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5"
                >
                  <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>New Folder</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => { setShowQuickMenu(false); onOpenCreateProject(); }}
                  className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5"
                >
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>New Research Project</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Quick Button */}
        {user && (
          <button
            onClick={() => onNavigate('activity')}
            title="Activity Logs & Security Audit"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <History className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
        </button>

        {/* User Account / Sign In */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-900 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center overflow-hidden">
                {profile?.photoUrl || user.photoURL ? (
                  <img src={profile?.photoUrl || user.photoURL!} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.displayName || user.displayName || user.email || 'A')[0].toUpperCase()
                )}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                {profile?.displayName || user.displayName || user.email?.split('@')[0]}
              </span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {profile?.displayName || user.displayName || 'Researcher'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {profile?.role || 'Academic Researcher'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setShowDropdown(false); onNavigate('settings'); }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Profile & Settings</span>
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); onNavigate('activity'); }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2"
                  >
                    <History className="w-4 h-4 text-slate-400" />
                    <span>Activity & Audit Trail</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => { setShowDropdown(false); signOut(); }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
};
