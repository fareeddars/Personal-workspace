export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  institution: string;
  role: string;
  department: string;
  bio: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  themePreference: 'light' | 'dark';
  emailNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  category: string;
  color: string;
  icon: string;
  isFavorite: boolean;
  isTrashed: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  fileExtension: string;
  sizeBytes: number;
  category: 'cv' | 'research' | 'university' | 'projects' | 'certificates' | 'personal' | 'general';
  description: string;
  tags: string; // JSON array string
  isFavorite: boolean;
  isPinned: boolean;
  isTrashed: boolean;
  trashedAt?: string | null;
  viewCount: number;
  downloadCount: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchProjectItem {
  id: string;
  userId: string;
  title: string;
  abstract: string;
  objectives: string;
  methodology: string;
  status: 'Idea' | 'Planning' | 'In Progress' | 'Under Review' | 'Completed';
  keywords: string; // JSON array string
  supervisor: string;
  collaborators: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchNoteItem {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchReferenceItem {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  authors: string;
  publicationYear: string;
  sourceUrl: string;
  citation: string;
  notes: string;
  createdAt: string;
}

export interface DocumentShareItem {
  id: string;
  ownerId: string;
  documentId: string | null;
  folderId: string | null;
  shareToken: string;
  targetEmail: string;
  permission: 'viewer' | 'commenter' | 'editor';
  allowDownload: boolean;
  isPasswordProtected: boolean;
  expiresAt: string | null;
  isRevoked: boolean;
  viewCount: number;
  downloadCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  document?: DocumentItem;
}

export interface DocumentCommentItem {
  id: string;
  documentId: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  content: string;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  documentId?: string | null;
  folderId?: string | null;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalFolders: number;
  totalShares: number;
  totalStorageBytes: number;
  storageLimitBytes: number;
  favoriteCount: number;
  categoryCounts: Record<string, number>;
  recentUploads: DocumentItem[];
  pinnedDocuments: DocumentItem[];
  recentActivity: ActivityLogItem[];
}
