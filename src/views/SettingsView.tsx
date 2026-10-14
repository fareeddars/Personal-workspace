import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  BookOpen, 
  ShieldCheck, 
  HardDrive, 
  Download, 
  Trash2, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

export const SettingsView: React.FC = () => {
  const { user, profile, refreshProfile, theme, toggleTheme, signOut, getIdToken } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [role, setRole] = useState(profile?.role || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [emailNotifications, setEmailNotifications] = useState(profile?.emailNotifications ?? true);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError(null);

    try {
      await api.updateProfile({
        displayName,
        institution,
        role,
        department,
        bio,
        emailNotifications,
      });
      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/user/export', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegisdocs-academic-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt('WARNING: This will permanently delete your account, research journal, and all uploaded vault files. Type "DELETE" to confirm:');
    if (confirmation !== 'DELETE') return;

    setDeleting(true);
    try {
      await api.deleteAccount();
      await signOut();
    } catch (err) {
      console.error('Delete account error:', err);
      alert('Failed to delete account');
      setDeleting(false);
    }
  };

  const storageUsed = profile?.storageUsedBytes || 0;
  const storageLimit = profile?.storageLimitBytes || 21474836480;
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your researcher profile, academic affiliation, storage allocation, and confidential data privacy.
        </p>
      </div>

      {/* Profile & Academic Info Form */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Researcher Profile
            </h3>
          </div>
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved!
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name / Academic Title
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dr. Alex Rivera"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Academic Email
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              University / Institute
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Stanford University / MIT"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department / Faculty
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science & AI Lab"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Research Bio & Focus
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Summarize your scholarly areas, active projects, or dissertation focus..."
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Appearance & Preferences */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          Workspace Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Color Theme Mode
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toggle between refined Emerald Light and High-Contrast Dark mode.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-700 dark:text-slate-300"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span className="capitalize">{theme} Mode</span>
          </button>
        </div>
      </div>

      {/* Storage & Quota Widget */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <HardDrive className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Vault Storage & Quota
          </h3>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Encrypted Document Storage</span>
            <span>{storagePercent}% ({((storageUsed) / (1024 * 1024)).toFixed(1)} MB / {((storageLimit) / (1024 * 1024 * 1024)).toFixed(1)} GB)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${storagePercent}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">
            All files are held in sandboxed storage with MIME and extension whitelisting.
          </p>
        </div>
      </div>

      {/* Privacy, Export, and Data Purge */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Data Portability & Privacy Controls
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              Export Complete Workspace Data
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download your profile, document records, research notes, and audit logs as standard JSON.
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-xs transition-all self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export JSON Backup'}</span>
          </button>
        </div>

        {/* Danger zone */}
        <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Purge Account & All Physical Files
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanently wipes all documents, research notes, share links, and user database records.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors self-start sm:self-auto"
            >
              {deleting ? 'Deleting...' : 'Delete Account Forever'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
