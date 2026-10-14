import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Star, 
  Calendar, 
  HardDrive, 
  Eye, 
  MessageSquare, 
  CheckCircle, 
  Send, 
  FileText, 
  FileSpreadsheet, 
  FileCode,
  File, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Copy, 
  Check, 
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { DocumentItem, DocumentCommentItem } from '../types.ts';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onOpenShare: (doc: DocumentItem) => void;
  onToggleFavorite: (doc: DocumentItem) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  onOpenShare,
  onToggleFavorite,
}) => {
  const [comments, setComments] = useState<DocumentCommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'comments' | 'details'>('preview');

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // Image controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Word DOCX preview state
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Spreadsheet preview state
  const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetSearch, setSheetSearch] = useState<string>('');

  // Text preview state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (document && isOpen) {
      loadDocumentContent(document);
      loadComments(document.id);
    }

    return () => {
      // Clean up previous blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [document?.id, isOpen]);

  const loadDocumentContent = async (doc: DocumentItem) => {
    setPreviewLoading(true);
    setPreviewError(null);
    setDocxHtml(null);
    setSheetsData({});
    setSheetNames([]);
    setActiveSheet('');
    setTextContent(null);
    setZoomLevel(1);
    setRotation(0);

    try {
      const token = await api.getAuthToken();
      if (token) setAuthToken(token);

      const cleanExt = (doc.fileExtension || '').toLowerCase().replace('.', '');
      const mime = (doc.mimeType || '').toLowerCase();

      const { blob } = await api.fetchDocumentBlob(doc.id);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      // Handle DOCX files
      if (cleanExt === 'docx') {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value || '<p className="text-slate-500 italic">This document is empty.</p>');
        } catch (docxErr: any) {
          console.error('Mammoth DOCX parsing failed:', docxErr);
          setPreviewError('Could not render DOCX format inline. You can download the file to view.');
        }
      }
      // Handle Spreadsheets (XLSX, XLS, CSV, TSV)
      else if (['xlsx', 'xls', 'csv', 'tsv'].includes(cleanExt) || mime.includes('spreadsheet') || mime.includes('excel')) {
        try {
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
        } catch (sheetErr: any) {
          console.error('Spreadsheet parsing failed:', sheetErr);
          setPreviewError('Could not parse spreadsheet structure.');
        }
      }
      // Handle Text / Code / Markdown
      else if (
        mime.startsWith('text/') || 
        ['txt', 'csv', 'tsv', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml', 'log', 'tex', 'bib', 'sql', 'js', 'ts', 'html', 'css', 'py'].includes(cleanExt)
      ) {
        try {
          const text = await blob.text();
          setTextContent(text);
        } catch (textErr: any) {
          console.error('Text read error:', textErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to load document content:', err);
      setPreviewError(err.message || 'Unable to load preview for this file.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadComments = async (docId: string) => {
    setLoadingComments(true);
    try {
      const res = await api.getComments(docId);
      setComments(res.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.addComment(document.id, newComment.trim());
      setComments([res.comment, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleToggleResolve = async (commentId: string) => {
    try {
      const res = await api.toggleResolveComment(commentId);
      setComments(comments.map(c => c.id === commentId ? res.comment : c));
    } catch (err) {
      console.error('Error resolving comment:', err);
    }
  };

  const copyTextToClipboard = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !document) return null;

  const cleanExt = (document.fileExtension || '').toLowerCase().replace('.', '');
  const mime = (document.mimeType || '').toLowerCase();

  const isPDF = mime.includes('pdf') || cleanExt === 'pdf';
  const isImage = mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'tiff', 'tif', 'avif'].includes(cleanExt);
  const isDocx = cleanExt === 'docx';
  const isSpreadsheet = ['xlsx', 'xls', 'csv', 'tsv'].includes(cleanExt) || mime.includes('spreadsheet') || mime.includes('excel');
  const isTextFile = mime.startsWith('text/') || ['txt', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml', 'log', 'tex', 'bib', 'sql', 'js', 'ts', 'html', 'css', 'py'].includes(cleanExt);

  const directPreviewUrl = `/api/documents/${document.id}/preview${authToken ? `?token=${encodeURIComponent(authToken)}` : ''}`;
  const downloadUrl = `/api/documents/${document.id}/download${authToken ? `?token=${encodeURIComponent(authToken)}` : ''}`;

  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(document.tags);
  } catch {
    parsedTags = document.tags ? [document.tags] : [];
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filter spreadsheet rows
  const currentSheetRows = (sheetsData[activeSheet] || []);
  const filteredSheetRows = sheetSearch.trim()
    ? currentSheetRows.filter(row => 
        row.some(cell => String(cell ?? '').toLowerCase().includes(sheetSearch.toLowerCase()))
      )
    : currentSheetRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl h-[94vh] max-h-[960px] bg-white dark:bg-[#101917] rounded-2xl border border-emerald-950/10 dark:border-emerald-500/20 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 truncate max-w-lg sm:max-w-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              {isPDF ? (
                <FileText className="w-5 h-5" />
              ) : isImage ? (
                <Eye className="w-5 h-5" />
              ) : isSpreadsheet ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : isTextFile ? (
                <FileCode className="w-5 h-5" />
              ) : (
                <File className="w-5 h-5" />
              )}
            </div>
            <div className="truncate">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                {document.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {document.fileExtension}
                </span>
                <span>•</span>
                <span>{formatBytes(document.sizeBytes)}</span>
                <span>•</span>
                <span className="capitalize">{document.category}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Image zoom & rotate controls toolbar */}
            {isImage && blobUrl && (
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
                <button
                  onClick={() => { setZoomLevel(1); setRotation(0); }}
                  className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-emerald-600 font-semibold"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Favorite button */}
            <button
              onClick={() => onToggleFavorite(document)}
              className={`p-2 rounded-xl transition-colors ${
                document.isFavorite 
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={document.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${document.isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Share button */}
            <button
              onClick={() => onOpenShare(document)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Download button */}
            <a
              href={downloadUrl}
              download={document.originalFilename}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Close modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 text-center border-b-2 ${activeTab === 'preview' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-2.5 text-center border-b-2 ${activeTab === 'comments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
          >
            Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2.5 text-center border-b-2 ${activeTab === 'details' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
          >
            Details
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Preview Area */}
          <div className={`flex-1 bg-slate-100/80 dark:bg-[#0a0f0e] p-3 sm:p-5 flex flex-col items-center justify-center overflow-auto relative ${activeTab !== 'preview' ? 'hidden md:flex' : 'flex'}`}>
            {previewLoading ? (
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Loading secure document stream...
                </p>
              </div>
            ) : previewError ? (
              <div className="text-center p-8 max-w-md bg-white dark:bg-[#121c19] rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Preview Issue
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {previewError}
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => loadDocumentContent(document)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <a
                    href={downloadUrl}
                    download={document.originalFilename}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                </div>
              </div>
            ) : isImage ? (
              /* High-Resolution Interactive Image & Photo Viewer (e.g. CV in JPG/PNG) */
              <div className="w-full h-full flex flex-col items-center justify-center overflow-auto relative p-2 select-none">
                <div 
                  className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={blobUrl || directPreviewUrl}
                    alt={document.title}
                    onError={() => {
                      setPreviewError('The image could not be decoded. Please verify file integrity or download to inspect.');
                    }}
                    className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Mobile zoom controls */}
                <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs shadow-lg">
                  <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))} className="p-1">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] px-1">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} className="p-1">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-1 ml-1">
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : isPDF ? (
              /* Inline PDF Viewer */
              <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-sm bg-white">
                <iframe
                  src={blobUrl || directPreviewUrl}
                  title={document.title}
                  className="w-full h-full border-none"
                />
              </div>
            ) : isDocx && docxHtml ? (
              /* Microsoft Word DOCX Rendered Academic Paper View */
              <div className="w-full h-full overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto bg-white dark:bg-[#121c19] p-8 sm:p-14 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        Microsoft Word Document
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {document.title}
                      </h1>
                    </div>
                  </div>
                  <div 
                    className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm space-y-4"
                    dangerouslySetInnerHTML={{ __html: docxHtml }} 
                  />
                </div>
              </div>
            ) : isSpreadsheet && sheetNames.length > 0 ? (
              /* Interactive Excel / Spreadsheet Grid View */
              <div className="w-full h-full flex flex-col bg-white dark:bg-[#121c19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Spreadsheet Top Bar */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
                  {/* Sheet switcher tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => setActiveSheet(name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                          activeSheet === name 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        📊 {name}
                      </button>
                    ))}
                  </div>

                  {/* Filter / Search within sheet */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={sheetSearch}
                      onChange={(e) => setSheetSearch(e.target.value)}
                      placeholder="Filter sheet rows..."
                      className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 w-36"
                    />
                    {sheetSearch && (
                      <button onClick={() => setSheetSearch('')} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Data Matrix */}
                <div className="flex-1 overflow-auto">
                  {filteredSheetRows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No rows matching filter criteria.
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 w-12 text-center">#</th>
                          {(filteredSheetRows[0] || []).map((_, colIdx) => (
                            <th key={colIdx} className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                              {String.fromCharCode(65 + (colIdx % 26)) + (colIdx >= 26 ? Math.floor(colIdx / 26) : '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSheetRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors">
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
                  )}
                </div>
              </div>
            ) : isTextFile && textContent !== null ? (
              /* Formatted Monospace Code / Markdown / Text Viewer */
              <div className="w-full h-full flex flex-col bg-white dark:bg-[#101917] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                  <span className="font-mono text-xs text-slate-500">
                    {document.originalFilename} • {textContent.split('\n').length} lines
                  </span>
                  <button
                    onClick={copyTextToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-600 shadow-2xs transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Content'}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-950/50">
                  {textContent}
                </div>
              </div>
            ) : (
              /* Fallback for other formats (archives, binaries, presentations) */
              <div className="text-center p-8 max-w-md bg-white dark:bg-[#121c19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <File className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {document.fileExtension.toUpperCase()} Document
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    This file format is configured for your local desktop suite. You can download the encrypted original anytime.
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href={downloadUrl}
                    download={document.originalFilename}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original Document</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Comments & Metadata */}
          <div className={`w-full md:w-80 lg:w-96 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-[#101917] flex flex-col ${activeTab === 'preview' ? 'hidden md:flex' : 'flex'}`}>
            {/* Metadata Section */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Document Details
              </h4>
              {document.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {document.description}
                </p>
              )}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Uploaded</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {new Date(document.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> File Size</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatBytes(document.sizeBytes)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> View Count</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{document.viewCount} views</span>
                </div>
              </div>

              {/* Tags */}
              {parsedTags.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {parsedTags.map((t, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Thread Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Comments & Annotations ({comments.length})
                  </span>
                </div>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingComments ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <p>No comments or review notes yet.</p>
                    <p className="text-[11px] mt-1">Reviewers with share access can also leave comments here.</p>
                  </div>
                ) : (
                  comments.map((comm) => (
                    <div 
                      key={comm.id}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                        comm.isResolved 
                          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {comm.authorName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comm.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {comm.content}
                      </p>
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => handleToggleResolve(comm.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                            comm.isResolved 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-400 hover:text-emerald-600'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{comm.isResolved ? 'Resolved' : 'Mark Resolved'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment submission input */}
              <form onSubmit={handleAddComment} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a review note..."
                  className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
