import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Lock, 
  ShieldCheck, 
  Calendar, 
  Mail, 
  Download, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { DocumentItem, DocumentShareItem } from '../types.ts';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onShareCreated?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  document,
  onShareCreated,
}) => {
  const [permission, setPermission] = useState<'viewer' | 'commenter' | 'editor'>('viewer');
  const [targetEmail, setTargetEmail] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresDays, setExpiresDays] = useState<string>('7');
  
  const [loading, setLoading] = useState(false);
  const [createdShare, setCreatedShare] = useState<DocumentShareItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.createShare({
        documentId: document.id,
        targetEmail: targetEmail.trim() || undefined,
        permission,
        allowDownload,
        password: enablePassword ? password : undefined,
        expiresDays: expiresDays === 'never' ? undefined : Number(expiresDays),
      });

      setCreatedShare(res.share);
      onShareCreated?.();
    } catch (err: any) {
      console.error('Share generation error:', err);
      setError(err.message || 'Failed to generate secure share link.');
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = (token: string) => {
    const origin = window.location.origin;
    return `${origin}/share/${token}`;
  };

  const handleCopy = (token: string) => {
    const url = getShareUrl(token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#101917] rounded-2xl border border-emerald-950/10 dark:border-emerald-500/20 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Secure Document Sharing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                "{document.title}" ({document.originalFilename})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {createdShare ? (
            /* Created Share Success View */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cryptographic Share Link Generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(createdShare.shareToken)}
                    className="flex-1 h-9 px-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
                  />
                  <button
                    onClick={() => handleCopy(createdShare.shareToken)}
                    className="px-3.5 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Share Properties Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Access Level</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{createdShare.permission}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Download Permission</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {createdShare.allowDownload ? 'Allowed' : 'View-Only (Restricted)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Password Protection</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {createdShare.isPasswordProtected ? 'Encrypted Password Set' : 'None (Direct link)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Link Expiration</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {createdShare.expiresAt ? new Date(createdShare.expiresAt).toLocaleDateString() : 'Never expires'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={getShareUrl(createdShare.shareToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview as external recipient</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedShare(null);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Share Configuration Form */
            <form onSubmit={handleCreateShare} className="space-y-4">
              {/* Permission level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recipient Permission
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPermission('viewer')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      permission === 'viewer'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <p className="font-semibold text-xs">Viewer</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Read & view only</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermission('commenter')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      permission === 'commenter'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <p className="font-semibold text-xs">Commenter</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Can leave review notes</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermission('editor')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      permission === 'editor'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <p className="font-semibold text-xs">Reviewer / Co-author</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Full collaboration</p>
                  </button>
                </div>
              </div>

              {/* Specific email restriction */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Restrict to Specific Email (Optional)
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="professor.supervisor@university.edu (Leave blank for link access)"
                    className="w-full h-9 pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Expiration date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Link Expiration
                  </label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <select
                      value={expiresDays}
                      onChange={(e) => setExpiresDays(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="1">1 Day</option>
                      <option value="7">7 Days (1 Week)</option>
                      <option value="30">30 Days (1 Month)</option>
                      <option value="90">90 Days (1 Semester)</option>
                      <option value="never">Never (Until Revoked)</option>
                    </select>
                  </div>
                </div>

                {/* Download restriction toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Download Permission
                  </label>
                  <button
                    type="button"
                    onClick={() => setAllowDownload(!allowDownload)}
                    className={`w-full h-9 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
                      allowDownload
                        ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                        : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <span>{allowDownload ? 'Download Allowed' : 'View-Only (No Download)'}</span>
                    <Download className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Password Protection */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Require Access Password
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>

                {enablePassword && (
                  <input
                    type="password"
                    required={enablePassword}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set confidential access password"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{loading ? 'Creating...' : 'Create Secure Share Link'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
