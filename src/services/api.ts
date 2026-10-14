import { auth } from '../lib/firebase.ts';
import type { 
  DashboardStats, 
  FolderItem, 
  DocumentItem, 
  ResearchProjectItem, 
  ResearchNoteItem, 
  ResearchReferenceItem,
  DocumentShareItem,
  DocumentCommentItem,
  ActivityLogItem 
} from '../types.ts';

async function getAuthToken(): Promise<string | null> {
  const local = localStorage.getItem('aegis_auth_token');
  if (local) return local;
  return auth.currentUser ? await auth.currentUser.getIdToken() : null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const body = await res.json();
      errorMsg = body.error || errorMsg;
    } catch {
      errorMsg = await res.text();
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  getAuthToken,

  async fetchDocumentBlob(id: string): Promise<{ blob: Blob; contentType: string }> {
    const token = await getAuthToken();
    const url = `/api/documents/${id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to fetch document content');
    }
    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return { blob, contentType };
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/dashboard/stats', { headers });
    return handleResponse<DashboardStats>(res);
  },

  // Folders
  async getFolders(params?: { parentId?: string; category?: string; isTrashed?: boolean }): Promise<{ folders: FolderItem[] }> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.parentId !== undefined) searchParams.set('parentId', params.parentId);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.isTrashed) searchParams.set('isTrashed', 'true');

    const res = await fetch(`/api/folders?${searchParams.toString()}`, { headers });
    return handleResponse<{ folders: FolderItem[] }>(res);
  },

  async createFolder(data: { name: string; parentId?: string | null; category?: string; color?: string; icon?: string }): Promise<{ folder: FolderItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ folder: FolderItem }>(res);
  },

  async updateFolder(id: string, updates: Partial<{ name: string; color: string; isFavorite: boolean; isTrashed: boolean }>): Promise<{ folder: FolderItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<{ folder: FolderItem }>(res);
  },

  // Documents
  async getDocuments(params?: { 
    category?: string; 
    folderId?: string; 
    tag?: string; 
    search?: string; 
    isFavorite?: boolean; 
    isPinned?: boolean; 
    isTrashed?: boolean; 
    sort?: string; 
    order?: 'asc' | 'desc';
  }): Promise<{ documents: DocumentItem[] }> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.folderId !== undefined) searchParams.set('folderId', params.folderId);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.isFavorite) searchParams.set('isFavorite', 'true');
    if (params?.isPinned) searchParams.set('isPinned', 'true');
    if (params?.isTrashed) searchParams.set('isTrashed', 'true');
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.order) searchParams.set('order', params.order);

    const res = await fetch(`/api/documents?${searchParams.toString()}`, { headers });
    return handleResponse<{ documents: DocumentItem[] }>(res);
  },

  async uploadDocuments(formData: FormData): Promise<{ documents: DocumentItem[] }> {
    const token = await getAuthToken();
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse<{ documents: DocumentItem[] }>(res);
  },

  async updateDocument(id: string, updates: Partial<{
    title: string;
    description: string;
    category: string;
    tags: string[];
    folderId: string | null;
    isFavorite: boolean;
    isPinned: boolean;
    isTrashed: boolean;
  }>): Promise<{ document: DocumentItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<{ document: DocumentItem }>(res);
  },

  async permanentDeleteDocument(id: string): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/documents/${id}/permanent`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Document comments
  async getComments(documentId: string): Promise<{ comments: DocumentCommentItem[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/documents/${documentId}/comments`, { headers });
    return handleResponse<{ comments: DocumentCommentItem[] }>(res);
  },

  async addComment(documentId: string, content: string): Promise<{ comment: DocumentCommentItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });
    return handleResponse<{ comment: DocumentCommentItem }>(res);
  },

  async toggleResolveComment(commentId: string): Promise<{ comment: DocumentCommentItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/comments/${commentId}/toggle-resolve`, {
      method: 'PATCH',
      headers,
    });
    return handleResponse<{ comment: DocumentCommentItem }>(res);
  },

  // Shares
  async getShares(): Promise<{ shares: { share: DocumentShareItem; document: DocumentItem }[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/shares', { headers });
    return handleResponse<{ shares: { share: DocumentShareItem; document: DocumentItem }[] }>(res);
  },

  async createShare(data: {
    documentId?: string;
    folderId?: string;
    targetEmail?: string;
    permission: 'viewer' | 'commenter' | 'editor';
    allowDownload: boolean;
    password?: string;
    expiresDays?: number | string;
  }): Promise<{ share: DocumentShareItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/shares/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ share: DocumentShareItem }>(res);
  },

  async revokeShare(id: string): Promise<{ share: DocumentShareItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/shares/${id}/revoke`, {
      method: 'PATCH',
      headers,
    });
    return handleResponse<{ share: DocumentShareItem }>(res);
  },

  // Research Projects
  async getResearchProjects(): Promise<{ projects: ResearchProjectItem[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/research/projects', { headers });
    return handleResponse<{ projects: ResearchProjectItem[] }>(res);
  },

  async getResearchProjectDetails(id: string): Promise<{
    project: ResearchProjectItem;
    notes: ResearchNoteItem[];
    references: ResearchReferenceItem[];
    linkedDocuments: (DocumentItem & { linkId: string })[];
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/projects/${id}`, { headers });
    return handleResponse(res);
  },

  async createResearchProject(data: Partial<ResearchProjectItem>): Promise<{ project: ResearchProjectItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/research/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ project: ResearchProjectItem }>(res);
  },

  async updateResearchProject(id: string, data: Partial<ResearchProjectItem>): Promise<{ project: ResearchProjectItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/projects/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ project: ResearchProjectItem }>(res);
  },

  async createResearchNote(projectId: string, data: { title: string; content: string }): Promise<{ note: ResearchNoteItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/projects/${projectId}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ note: ResearchNoteItem }>(res);
  },

  async updateResearchNote(noteId: string, data: { title?: string; content?: string }): Promise<{ note: ResearchNoteItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/notes/${noteId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ note: ResearchNoteItem }>(res);
  },

  async deleteResearchNote(noteId: string): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/notes/${noteId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async createResearchReference(projectId: string, data: Partial<ResearchReferenceItem>): Promise<{ reference: ResearchReferenceItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/projects/${projectId}/references`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<{ reference: ResearchReferenceItem }>(res);
  },

  async deleteResearchReference(refId: string): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/references/${refId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async linkDocumentToProject(projectId: string, documentId: string): Promise<{ linked: any }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/projects/${projectId}/link-document`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId }),
    });
    return handleResponse<{ linked: any }>(res);
  },

  async unlinkDocumentFromProject(projectId: string, linkId: string): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/research/projects/${projectId}/unlink-document/${linkId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Activity logs
  async getActivityLogs(): Promise<{ logs: ActivityLogItem[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/activity-logs', { headers });
    return handleResponse<{ logs: ActivityLogItem[] }>(res);
  },

  // User Settings & Purge
  async updateProfile(updates: any): Promise<{ user: any }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<{ user: any }>(res);
  },

  async deleteAccount(): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/user/delete-account', {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean }>(res);
  },
};
