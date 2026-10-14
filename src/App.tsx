import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { DocumentsView } from './views/DocumentsView.tsx';
import { ResearchWorkspaceView } from './views/ResearchWorkspaceView.tsx';
import { SharesView } from './views/SharesView.tsx';
import { RecycleBinView } from './views/RecycleBinView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { ActivityLogsView } from './views/ActivityLogsView.tsx';
import { PublicShareView } from './views/PublicShareView.tsx';

import { AuthModal } from './components/AuthModal.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { CreateFolderModal } from './components/CreateFolderModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { DocumentViewerModal } from './components/DocumentViewerModal.tsx';

import { BrandLogo } from './components/BrandLogo.tsx';
import { 
  ShieldCheck, 
  Lock, 
  Files, 
  Share2, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  HardDrive
} from 'lucide-react';
import { api } from './services/api.ts';
import type { DocumentItem, FolderItem } from './types.ts';

function MainLayout() {
  const { user, profile, loading } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [documentCategory, setDocumentCategory] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('general');
  const [uploadFolderId, setUploadFolderId] = useState<string | undefined>(undefined);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [parentFolderIdForCreate, setParentFolderIdForCreate] = useState<string | null>(null);

  // Document viewer & share modal state
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [sharingDocument, setSharingDocument] = useState<DocumentItem | null>(null);

  // Folders cache for upload modal
  const [folders, setFolders] = useState<FolderItem[]>([]);

  useEffect(() => {
    if (user) {
      api.getFolders().then(res => setFolders(res.folders)).catch(() => {});
    }
  }, [user, isCreateFolderOpen]);

  // Route parser for /share/:token
  const [shareToken, setShareToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      return path.replace('/share/', '');
    }
    return null;
  });

  if (shareToken) {
    return <PublicShareView shareToken={shareToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <BrandLogo size="lg" />
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mt-4" />
          <p className="text-xs font-semibold text-slate-500">Initializing encrypted vault...</p>
        </div>
      </div>
    );
  }

  const handleNavigate = (view: string, category?: string) => {
    if (view === 'documents') {
      setCurrentView('documents');
      setDocumentCategory(category || 'all');
    } else {
      setCurrentView(view);
    }
  };

  const openUploadModal = (cat?: string, folderId?: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setUploadCategory(cat || 'general');
    setUploadFolderId(folderId);
    setIsUploadModalOpen(true);
  };

  const openCreateFolderModal = (parentId?: string | null) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setParentFolderIdForCreate(parentId || null);
    setIsCreateFolderOpen(true);
  };

  // If user is not authenticated, show welcoming landing portal with immediate access to sign in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex flex-col selection:bg-emerald-100">
        <header className="h-20 border-b border-emerald-950/5 dark:border-emerald-500/10 px-6 sm:px-12 flex items-center justify-between bg-white/80 dark:bg-[#101917]/80 backdrop-blur-md">
          <BrandLogo size="md" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-semibold text-xs sm:text-sm transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Built for Academic Researchers & University Scholars</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-3xl">
            Secure Personal Workspace & <span className="text-emerald-600 dark:text-emerald-400">Selective Document Sharing</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Store, organize, and manage academic publications, university transcripts, CVs, and final-year project files. Selectively share with professors and advisors via password-protected cryptographic links without ever exposing your private workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Open Private Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left w-full">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Row-Level Vault Isolation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Complete database-backed user isolation. No student or researcher can access another user's records.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Secure Tokenized Sharing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Unique cryptographic tokens, download restrictions, hashed password gates, and one-click instant revocation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Research Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dedicated research journal with autosave, literature reference manager, and document linking.
              </p>
            </div>
          </div>
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  // Authenticated Workspace Layout
  const storageUsed = profile?.storageUsedBytes || 0;
  const storageLimit = profile?.storageLimitBytes || 21474836480;

  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView === 'documents' ? `documents-${documentCategory}` : currentView}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        storageUsedBytes={storageUsed}
        storageLimitBytes={storageLimit}
        onOpenUpload={() => openUploadModal()}
      />

      {/* Main Body */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen transition-all">
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenUpload={() => openUploadModal()}
          onOpenCreateFolder={() => openCreateFolderModal()}
          onOpenCreateProject={() => handleNavigate('research-workspace')}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="flex-1 pb-16">
          {currentView === 'dashboard' && (
            <DashboardView
              onOpenUpload={openUploadModal}
              onOpenCreateFolder={() => openCreateFolderModal()}
              onOpenCreateProject={() => handleNavigate('research-workspace')}
              onNavigate={handleNavigate}
              onViewDocument={(doc) => setViewingDocument(doc)}
              onOpenShare={(doc) => setSharingDocument(doc)}
            />
          )}

          {currentView === 'documents' && (
            <DocumentsView
              category={documentCategory}
              onOpenUpload={openUploadModal}
              onOpenCreateFolder={openCreateFolderModal}
              onViewDocument={(doc) => setViewingDocument(doc)}
              onOpenShare={(doc) => setSharingDocument(doc)}
            />
          )}

          {currentView === 'research-workspace' && (
            <ResearchWorkspaceView
              onViewDocument={(doc) => setViewingDocument(doc)}
              onOpenUpload={openUploadModal}
            />
          )}

          {currentView === 'shares' && (
            <SharesView />
          )}

          {currentView === 'recycle' && (
            <RecycleBinView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}

          {currentView === 'activity' && (
            <ActivityLogsView />
          )}
        </main>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={() => {
          // Trigger refresh of views if needed
          window.dispatchEvent(new CustomEvent('vault_refresh'));
        }}
        folders={folders}
        defaultCategory={uploadCategory}
        defaultFolderId={uploadFolderId}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreated={() => {
          api.getFolders().then(res => setFolders(res.folders)).catch(() => {});
        }}
        parentFolderId={parentFolderIdForCreate}
      />

      <ShareModal
        isOpen={Boolean(sharingDocument)}
        onClose={() => setSharingDocument(null)}
        document={sharingDocument}
      />

      <DocumentViewerModal
        isOpen={Boolean(viewingDocument)}
        onClose={() => setViewingDocument(null)}
        document={viewingDocument}
        onOpenShare={(doc) => setSharingDocument(doc)}
        onToggleFavorite={async (doc) => {
          try {
            await api.updateDocument(doc.id, { isFavorite: !doc.isFavorite });
            setViewingDocument({ ...doc, isFavorite: !doc.isFavorite });
          } catch {}
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
