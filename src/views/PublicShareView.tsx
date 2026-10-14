import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Download, 
  Eye, 
  FileText, 
  Calendar, 
  HardDrive, 
  AlertCircle, 
  MessageSquare, 
  Send,
  Building,
  UserCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Copy,
  Check,
  FileSpreadsheet,
  FileCode,
  File,
  X
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.tsx';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface PublicShareViewProps {
  shareToken: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ shareToken }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guest comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Enhanced preview states
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetSearch, setSheetSearch] = useState<string>('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Image controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    accessShare();
  }, [shareToken]);

  const accessShare = async (password?: string) => {
    setLoading(true);
    setPasswordError(null);
    try {
      const res = await fetch(`/api/public/share/${shareToken}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.requiresPassword) {
          setRequiresPassword(true);
          if (password) setPasswordError(body.error || 'Incorrect access password');
        } else {
          setError(body.error || 'This share link is unavailable or expired.');
        }
        return;
      }

      setData(body);
      setRequiresPassword(false);
      setComments(body.comments || []);

      // If document is available, fetch rich preview content (DOCX, Spreadsheet, Text)
      if (body.document) {
        loadRichPreview(body.document, password);
      }
    } catch (err: any) {
      setError('Unable to connect to document server.');
    } finally {
      setLoading(false);
    }
  };

  const loadRichPreview = async (doc: any, pwd?: string) => {
    const cleanExt = (doc.fileExtension || '').toLowerCase().replace('.', '');
    const mime = (doc.mimeType || '').toLowerCase();
    const pwdQuery = pwd ? `?pwd=${encodeURIComponent(pwd)}` : '';
    const url = `/api/public/share/${shareToken}/preview${pwdQuery}`;

    // For DOCX, Spreadsheets, or Text: fetch the blob and parse
    if (
      cleanExt === 'docx' || 
      ['xlsx', 'xls', 'csv', 'tsv'].includes(cleanExt) || 
      mime.includes('spreadsheet') || 
      mime.includes('excel') ||
      mime.startsWith('text/') || 
      ['txt', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml', 'log', 'tex', 'bib', 'sql'].includes(cleanExt)
    ) {
      setPreviewLoading(true);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();

          if (cleanExt === 'docx') {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocxHtml(result.value || '<p className="italic text-slate-400">Empty document</p>');
          } else if (['xlsx', 'xls', 'csv', 'tsv'].includes(cleanExt) || mime.includes('spreadsheet') || mime.includes('excel')) {
            const arrayBuffer = await blob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheets: { [name: string]: any[][] } = {};
            workbook.SheetNames.forEach(name => {
              const sheet = workbook.Sheets[name];
              sheets[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            });
            setSheetNames(workbook.SheetNames);
            setSheetsData(sheets);
            if (workbook.SheetNames.length > 0) {
              setActiveSheet(workbook.SheetNames[0]);
            }
          } else {
            const text = await blob.text();
            setTextContent(text);
          }
        }
      } catch (e) {
        console.error('Failed to parse rich share preview:', e);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    accessShare(passwordInput.trim());
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/public/share/${shareToken}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          authorName: reviewerName.trim() || 'Academic Reviewer',
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setComments([result.comment, ...comments]);
        setNewComment('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const copyTextToClipboard = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading && !requiresPassword) {
    return (
      <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying cryptographic share credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Access Restricted or Expired
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xs"
            >
              Go to Workspace Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Confidential Document Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The owner of this academic resource requires an authorized passcode to unlock preview and download.
            </p>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Access Password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
            >
              {loading ? 'Verifying...' : 'Unlock Document'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { document: doc, share, owner } = data || {};
  if (!doc) return null;

  const cleanExt = (doc.fileExtension || '').toLowerCase().replace('.', '');
  const mime = (doc.mimeType || '').toLowerCase();

  const isPDF = mime.includes('pdf') || cleanExt === 'pdf';
  const isImage = mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'tiff', 'tif', 'avif'].includes(cleanExt);
  const isDocx = cleanExt === 'docx';
  const isSpreadsheet = ['xlsx', 'xls', 'csv', 'tsv'].includes(cleanExt) || mime.includes('spreadsheet') || mime.includes('excel');
  const isTextFile = mime.startsWith('text/') || ['txt', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml', 'log', 'tex', 'bib', 'sql'].includes(cleanExt);

  const pwdQuery = passwordInput ? `?pwd=${encodeURIComponent(passwordInput)}` : '';
  const previewUrl = `/api/public/share/${shareToken}/preview${pwdQuery}`;
  const downloadUrl = `/api/public/share/${shareToken}/download${pwdQuery}`;

  // Filter spreadsheet rows
  const currentSheetRows = (sheetsData[activeSheet] || []);
  const filteredSheetRows = sheetSearch.trim()
    ? currentSheetRows.filter(row => 
        row.some(cell => String(cell ?? '').toLowerCase().includes(sheetSearch.toLowerCase()))
      )
    : currentSheetRows;

  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c1210] flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-emerald-950/5 dark:border-emerald-500/10 bg-white/90 dark:bg-[#101917]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden sm:inline text-xs text-slate-500 font-medium">Shared Academic Resource</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Image Toolbar */}
          {isImage && (
            <div className="hidden sm:flex items-center gap-1 mr-2 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                className="p-1 hover:text-emerald-600 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-10 text-center font-medium">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                className="p-1 hover:text-emerald-600 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-0.5" />
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1 hover:text-emerald-600 rounded"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {share.allowDownload ? (
            <a
              href={downloadUrl}
              download={doc.originalFilename}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          ) : (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200/50">
              Download Restricted by Owner
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Preview Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col h-[78vh]">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="truncate">
              <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                {doc.title}
              </h1>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {doc.originalFilename} ({formatBytes(doc.sizeBytes)})
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {share.permission} access
            </span>
          </div>

          <div className="flex-1 bg-slate-100/70 dark:bg-[#0a0f0e] p-3 sm:p-5 flex items-center justify-center overflow-auto relative">
            {previewLoading ? (
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Formatting document preview...</p>
              </div>
            ) : isImage ? (
              /* High-Resolution Interactive Image & Photo Viewer */
              <div className="w-full h-full flex flex-col items-center justify-center overflow-auto relative p-2 select-none">
                <div 
                  className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={doc.title}
                    className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            ) : isPDF ? (
              <iframe
                src={previewUrl}
                title={doc.title}
                className="w-full h-full rounded-xl bg-white border border-slate-300 dark:border-slate-800 shadow-sm"
              />
            ) : isDocx && docxHtml ? (
              /* Microsoft Word Document */
              <div className="w-full h-full overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto bg-white dark:bg-[#121c19] p-8 sm:p-12 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
                  <div 
                    className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm space-y-4"
                    dangerouslySetInnerHTML={{ __html: docxHtml }} 
                  />
                </div>
              </div>
            ) : isSpreadsheet && sheetNames.length > 0 ? (
              /* Interactive Excel / Spreadsheet Grid */
              <div className="w-full h-full flex flex-col bg-white dark:bg-[#121c19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => setActiveSheet(name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                          activeSheet === name 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50'
                        }`}
                      >
                        📊 {name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={sheetSearch}
                      onChange={(e) => setSheetSearch(e.target.value)}
                      placeholder="Filter rows..."
                      className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 w-32"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 w-12 text-center">#</th>
                        {(filteredSheetRows[0] || []).map((_, colIdx) => (
                          <th key={colIdx} className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                            {String.fromCharCode(65 + (colIdx % 26))}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSheetRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20">
                          <td className="py-2 px-3 bg-slate-50 dark:bg-slate-900 font-mono text-[10px] text-slate-400 border-r border-slate-200 dark:border-slate-800 text-center">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell, colIdx) => (
                            <td key={colIdx} className="py-2 px-3 border-r border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {cell !== undefined && cell !== null ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isTextFile && textContent !== null ? (
              <div className="w-full h-full flex flex-col bg-white dark:bg-[#101917] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                  <span className="font-mono text-xs text-slate-500">{doc.originalFilename}</span>
                  <button
                    onClick={copyTextToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-600"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-slate-200">
                  {textContent}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm space-y-3">
                <FileText className="w-10 h-10 mx-auto text-emerald-600" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {doc.fileExtension.toUpperCase()} Document
                </h4>
                <p className="text-xs text-slate-400">
                  This document format is configured for your local desktop software.
                </p>
                {share.allowDownload && (
                  <a
                    href={downloadUrl}
                    download={doc.originalFilename}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata & Comments (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Owner & Academic Affiliation Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Document Authority & Ownership
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center">
                {(owner.displayName || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {owner.displayName || 'Academic Scholar'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building className="w-3 h-3 text-emerald-600" />
                  {owner.institution || 'University Research Lab'}
                </p>
              </div>
            </div>

            {doc.description && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">Author Note:</p>
                {doc.description}
              </div>
            )}
          </div>

          {/* Comments / Reviewer Notes Section (if Commenter or Editor) */}
          {share.permission !== 'viewer' ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Review Annotations ({comments.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No reviewer annotations left yet.
                  </p>
                ) : (
                  comments.map((c: any) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                        <span>{c.authorName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Your Name / Title (e.g. Prof. Smith)"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave review note or feedback..."
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
              <span>Read-Only Guest Mode Active</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
