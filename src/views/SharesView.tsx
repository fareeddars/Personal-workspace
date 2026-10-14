import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  ShieldAlert, 
  Eye, 
  Download, 
  Calendar, 
  Lock, 
  Mail, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { DocumentShareItem, DocumentItem } from '../types.ts';

export const SharesView: React.FC = () => {
  const [shares, setShares] = useState<{ share: DocumentShareItem; document: DocumentItem }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    setLoading(true);
    try {
      const res = await api.getShares();
      setShares(res.shares);
    } catch (err) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to immediately revoke this share link? Anyone with the URL will lose access.')) return;
    try {
      await api.revokeShare(shareId);
      setShares(shares.map(s => s.share.id === shareId ? { ...s, share: { ...s.share, isRevoked: true } } : s));
    } catch (err) {
      console.error('Failed to revoke share', err);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Secure Share Management & Audit
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Cryptographic Tokens
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor, update, and instantly revoke active external links granted to professors, advisors, and collaborators.
        </p>
      </div>

      <div className="bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading share records...</div>
        ) : shares.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Share2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No active share links
            </h4>
            <p className="mt-1">
              Select any document in your vault and click "Share" to generate cryptographically signed guest links.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {shares.map(({ share, document }) => {
              const isExpired = share.expiresAt && new Date() > new Date(share.expiresAt);
              const isRevoked = share.isRevoked;
              const isInactive = isExpired || isRevoked;

              return (
                <div 
                  key={share.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isInactive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30' : 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  {/* Document & Token Info */}
                  <div className="space-y-1.5 flex-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isRevoked 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : isExpired 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                      </span>
                      <span className="text-xs font-semibold uppercase text-slate-400 capitalize">
                        {share.permission} access
                      </span>
                      {!share.allowDownload && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50">
                          View-Only
                        </span>
                      )}
                      {share.isPasswordProtected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 flex items-center gap-1 border border-blue-200/50">
                          <Lock className="w-2.5 h-2.5" /> Password
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {document ? document.title : 'Shared Resource'}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Token: {share.shareToken.substring(0, 12)}...</span>
                      {share.targetEmail && (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Mail className="w-3 h-3" />
                          {share.targetEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats & Expiration */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>{share.viewCount} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>{share.downloadCount} downloads</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{share.expiresAt ? `Expires: ${new Date(share.expiresAt).toLocaleDateString()}` : 'No Expiry'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!isInactive && (
                      <button
                        onClick={() => handleCopyLink(share.shareToken)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        {copiedToken === share.shareToken ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={`${window.location.origin}/share/${share.shareToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Open share preview in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {!isRevoked && (
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Revoke access immediately"
                      >
                        Revoke Link
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
