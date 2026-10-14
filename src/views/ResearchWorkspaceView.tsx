import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Plus, 
  BookOpen, 
  Clock, 
  UserCheck, 
  Users, 
  Calendar, 
  FileText, 
  Link as LinkIcon, 
  Trash2, 
  Save, 
  Download, 
  CheckCircle2, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  BookmarkPlus,
  Share2
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { 
  ResearchProjectItem, 
  ResearchNoteItem, 
  ResearchReferenceItem, 
  DocumentItem 
} from '../types.ts';

interface ResearchWorkspaceViewProps {
  onViewDocument: (doc: DocumentItem) => void;
  onOpenUpload: (category?: string) => void;
}

export const ResearchWorkspaceView: React.FC<ResearchWorkspaceViewProps> = ({
  onViewDocument,
  onOpenUpload,
}) => {
  const [projects, setProjects] = useState<ResearchProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<{
    project: ResearchProjectItem;
    notes: ResearchNoteItem[];
    references: ResearchReferenceItem[];
    linkedDocuments: (DocumentItem & { linkId: string })[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // New project form state
  const [newTitle, setNewTitle] = useState('');
  const [newAbstract, setNewAbstract] = useState('');
  const [newSupervisor, setNewSupervisor] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newStatus, setNewStatus] = useState<'Idea' | 'Planning' | 'In Progress' | 'Under Review' | 'Completed'>('In Progress');

  // Active note editor state & autosave
  const [selectedNote, setSelectedNote] = useState<ResearchNoteItem | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autosaveTimerRef = useRef<any>(null);

  // Reference addition form state
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [refTitle, setRefTitle] = useState('');
  const [refAuthors, setRefAuthors] = useState('');
  const [refYear, setRefYear] = useState('');
  const [refUrl, setRefUrl] = useState('');
  const [refCitation, setRefCitation] = useState('');

  // Link document modal state
  const [showLinkDocModal, setShowLinkDocModal] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<DocumentItem[]>([]);
  const [selectedDocToLink, setSelectedDocToLink] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.getResearchProjects();
      setProjects(res.projects);
      if (res.projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.projects[0].id);
      }
    } catch (err) {
      console.error('Failed to load research projects', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const data = await api.getResearchProjectDetails(id);
      setProjectDetails(data);
      if (data.notes.length > 0) {
        setSelectedNote(data.notes[0]);
        setNoteTitle(data.notes[0].title);
        setNoteContent(data.notes[0].content);
        setSaveStatus('saved');
      } else {
        setSelectedNote(null);
        setNoteTitle('');
        setNoteContent('');
      }
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.createResearchProject({
        title: newTitle.trim(),
        abstract: newAbstract.trim(),
        supervisor: newSupervisor.trim(),
        deadline: newDeadline,
        status: newStatus,
      });

      setProjects([res.project, ...projects]);
      setSelectedProjectId(res.project.id);
      setIsCreatingProject(false);
      setNewTitle('');
      setNewAbstract('');
      setNewSupervisor('');
      setNewDeadline('');
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  // Autosave notes
  const handleNoteContentChange = (content: string) => {
    setNoteContent(content);
    setSaveStatus('unsaved');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      if (!selectedNote) return;
      setSaveStatus('saving');
      try {
        await api.updateResearchNote(selectedNote.id, {
          title: noteTitle,
          content,
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('unsaved');
      }
    }, 1000);
  };

  const handleCreateNote = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await api.createResearchNote(selectedProjectId, {
        title: `Research Note #${(projectDetails?.notes.length || 0) + 1}`,
        content: '',
      });
      if (projectDetails) {
        setProjectDetails({
          ...projectDetails,
          notes: [res.note, ...projectDetails.notes],
        });
      }
      setSelectedNote(res.note);
      setNoteTitle(res.note.title);
      setNoteContent('');
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to create note', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this research note?')) return;
    try {
      await api.deleteResearchNote(noteId);
      if (projectDetails) {
        const remaining = projectDetails.notes.filter(n => n.id !== noteId);
        setProjectDetails({ ...projectDetails, notes: remaining });
        if (selectedNote?.id === noteId) {
          if (remaining.length > 0) {
            setSelectedNote(remaining[0]);
            setNoteTitle(remaining[0].title);
            setNoteContent(remaining[0].content);
          } else {
            setSelectedNote(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleExportNote = () => {
    if (!selectedNote) return;
    const blob = new Blob([`# ${noteTitle}\n\n${noteContent}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !refTitle.trim()) return;

    try {
      const res = await api.createResearchReference(selectedProjectId, {
        title: refTitle.trim(),
        authors: refAuthors.trim(),
        publicationYear: refYear.trim(),
        sourceUrl: refUrl.trim(),
        citation: refCitation.trim(),
      });

      if (projectDetails) {
        setProjectDetails({
          ...projectDetails,
          references: [res.reference, ...projectDetails.references],
        });
      }
      setShowAddRefModal(false);
      setRefTitle('');
      setRefAuthors('');
      setRefYear('');
      setRefUrl('');
      setRefCitation('');
    } catch (err) {
      console.error('Failed to add reference', err);
    }
  };

  const handleDeleteReference = async (refId: string) => {
    try {
      await api.deleteResearchReference(refId);
      if (projectDetails) {
        setProjectDetails({
          ...projectDetails,
          references: projectDetails.references.filter(r => r.id !== refId),
        });
      }
    } catch (err) {
      console.error('Failed to delete ref', err);
    }
  };

  const openLinkDocModal = async () => {
    try {
      const res = await api.getDocuments();
      // Filter out docs already linked
      const alreadyLinkedIds = new Set(projectDetails?.linkedDocuments.map(ld => ld.id) || []);
      const unlinked = res.documents.filter(d => !alreadyLinkedIds.has(d.id));
      setAvailableDocs(unlinked);
      if (unlinked.length > 0) setSelectedDocToLink(unlinked[0].id);
      setShowLinkDocModal(true);
    } catch (err) {
      console.error('Failed to fetch available docs', err);
    }
  };

  const handleLinkDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedDocToLink) return;

    try {
      await api.linkDocumentToProject(selectedProjectId, selectedDocToLink);
      await loadProjectDetails(selectedProjectId);
      setShowLinkDocModal(false);
    } catch (err) {
      console.error('Failed to link document', err);
    }
  };

  const handleUnlinkDoc = async (linkId: string) => {
    if (!selectedProjectId) return;
    try {
      await api.unlinkDocumentFromProject(selectedProjectId, linkId);
      if (projectDetails) {
        setProjectDetails({
          ...projectDetails,
          linkedDocuments: projectDetails.linkedDocuments.filter(ld => ld.linkId !== linkId),
        });
      }
    } catch (err) {
      console.error('Failed to unlink document', err);
    }
  };

  const statusColors = {
    'Idea': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    'Planning': 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    'In Progress': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    'Under Review': 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    'Completed': 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Research Management Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Notion & Lab-Grade
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize research objectives, literature reviews, lab notes with autosave, and linked library documents.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingProject(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Research Project</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Projects List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Research Projects ({projects.length})
          </h3>

          <div className="space-y-2.5">
            {projects.map(p => {
              const active = p.id === selectedProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#101917] border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'bg-white/60 dark:bg-[#101917]/60 border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-1">
                      {p.title}
                    </h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[p.status] || ''}`}>
                      {p.status}
                    </span>
                  </div>

                  {p.abstract && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {p.abstract}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      {p.supervisor || 'Academic Committee'}
                    </span>
                    {p.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {p.deadline}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && !loading && (
              <div className="p-8 text-center bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No research projects created yet.</p>
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs"
                >
                  Create Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Project Details & Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {projectDetails ? (
            <div className="space-y-6">
              {/* Project Card Header */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusColors[projectDetails.project.status] || ''}`}>
                      {projectDetails.project.status}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-2">
                      {projectDetails.project.title}
                    </h2>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Deadline: {projectDetails.project.deadline || 'Ongoing'}</p>
                    <p className="mt-0.5">Supervisor: {projectDetails.project.supervisor || 'Faculty Lead'}</p>
                  </div>
                </div>

                {projectDetails.project.abstract && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <strong className="text-slate-800 dark:text-slate-200">Abstract: </strong>
                    {projectDetails.project.abstract}
                  </p>
                )}
              </div>

              {/* Research Notes Editor Section */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Research Notes & Lab Journal
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Autosave status indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mr-2">
                      {saveStatus === 'saving' ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>Autosaving...</span>
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Saved to Cloud</span>
                        </>
                      ) : (
                        <span>Unsaved edits</span>
                      )}
                    </div>

                    <button
                      onClick={handleExportNote}
                      disabled={!selectedNote}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center gap-1"
                      title="Export Note to Markdown"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </button>

                    <button
                      onClick={handleCreateNote}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Note</span>
                    </button>
                  </div>
                </div>

                {/* Notes Selector Tabs */}
                {projectDetails.notes.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {projectDetails.notes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNote(n);
                          setNoteTitle(n.title);
                          setNoteContent(n.content);
                          setSaveStatus('saved');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          selectedNote?.id === n.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <span>{n.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Note Editor Area */}
                {selectedNote ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => {
                        setNoteTitle(e.target.value);
                        handleNoteContentChange(noteContent);
                      }}
                      placeholder="Note Title..."
                      className="w-full text-base font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 focus:outline-none focus:border-emerald-500"
                    />

                    <textarea
                      rows={10}
                      value={noteContent}
                      onChange={(e) => handleNoteContentChange(e.target.value)}
                      placeholder="Start writing experiment notes, hypotheses, references, or meeting summaries..."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 leading-relaxed font-mono"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Updated: {new Date(selectedNote.updatedAt).toLocaleTimeString()}</span>
                      <button
                        onClick={() => handleDeleteNote(selectedNote.id)}
                        className="text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete this note</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <p>No research note selected.</p>
                    <button
                      onClick={handleCreateNote}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                    >
                      + Add Note
                    </button>
                  </div>
                )}
              </div>

              {/* Linked Library Documents */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Linked Primary Documents & Papers ({projectDetails.linkedDocuments.length})
                    </h3>
                  </div>
                  <button
                    onClick={openLinkDocModal}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Document</span>
                  </button>
                </div>

                {projectDetails.linkedDocuments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No documents from your vault linked to this project yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projectDetails.linkedDocuments.map(ld => (
                      <div
                        key={ld.linkId}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between group"
                      >
                        <div 
                          onClick={() => onViewDocument(ld)}
                          className="flex items-center gap-2.5 truncate cursor-pointer flex-1"
                        >
                          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600">
                            {ld.title}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnlinkDoc(ld.linkId)}
                          className="p-1 text-slate-400 hover:text-rose-500 ml-2"
                          title="Unlink from project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Literature & Citations Section */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#101917] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <BookmarkPlus className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Literature Sources & Citations ({projectDetails.references.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddRefModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Citation</span>
                  </button>
                </div>

                {projectDetails.references.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No references added yet. Organize external DOIs and bibliographic sources here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projectDetails.references.map(ref => (
                      <div
                        key={ref.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between text-xs"
                      >
                        <div className="space-y-1 pr-3">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{ref.title}</p>
                          <p className="text-slate-500 text-[11px]">
                            {ref.authors} {ref.publicationYear ? `(${ref.publicationYear})` : ''}
                          </p>
                          {ref.citation && (
                            <p className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded">
                              {ref.citation}
                            </p>
                          )}
                          {ref.sourceUrl && (
                            <a 
                              href={ref.sourceUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"
                            >
                              <span>{ref.sourceUrl}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteReference(ref.id)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#101917] rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
              Select or create a research project to view its journal, references, and linked papers.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Project */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#101917] rounded-2xl border border-emerald-950/10 dark:border-emerald-500/20 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Create Research Project
            </h3>
            <form onSubmit={handleCreateProjectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus in Byzantine Networks"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Abstract / Scope
                </label>
                <textarea
                  rows={3}
                  value={newAbstract}
                  onChange={(e) => setNewAbstract(e.target.value)}
                  placeholder="Summary of research problem, objectives, and target venue..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supervisor / Advisor
                  </label>
                  <input
                    type="text"
                    value={newSupervisor}
                    onChange={(e) => setNewSupervisor(e.target.value)}
                    placeholder="Prof. Jane Doe"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="Idea">Idea</option>
                  <option value="Planning">Planning</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Reference */}
      {showAddRefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#101917] rounded-2xl border border-emerald-950/10 dark:border-emerald-500/20 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Add Literature Source / Citation
            </h3>
            <form onSubmit={handleAddReference} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Article or Paper Title
                </label>
                <input
                  type="text"
                  required
                  value={refTitle}
                  onChange={(e) => setRefTitle(e.target.value)}
                  placeholder="e.g. Practical Byzantine Fault Tolerance"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Authors & Year
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={refAuthors}
                    onChange={(e) => setRefAuthors(e.target.value)}
                    placeholder="Castro & Liskov"
                    className="col-span-2 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <input
                    type="text"
                    value={refYear}
                    onChange={(e) => setRefYear(e.target.value)}
                    placeholder="1999"
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Citation / BibTeX / DOI
                </label>
                <input
                  type="text"
                  value={refCitation}
                  onChange={(e) => setRefCitation(e.target.value)}
                  placeholder="OSDI '99, pp. 173-186 / 10.1145/..."
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source URL
                </label>
                <input
                  type="url"
                  value={refUrl}
                  onChange={(e) => setRefUrl(e.target.value)}
                  placeholder="https://doi.org/..."
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRefModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs"
                >
                  Save Citation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Document */}
      {showLinkDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#101917] rounded-2xl border border-emerald-950/10 dark:border-emerald-500/20 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Link Vault Document to Research
            </h3>
            {availableDocs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                All existing documents are already linked or no files have been uploaded yet.
              </p>
            ) : (
              <form onSubmit={handleLinkDocSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Document from Vault
                  </label>
                  <select
                    value={selectedDocToLink}
                    onChange={(e) => setSelectedDocToLink(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    {availableDocs.map(d => (
                      <option key={d.id} value={d.id}>
                        📄 {d.title} ({d.fileExtension.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowLinkDocModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs"
                  >
                    Link to Project
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
