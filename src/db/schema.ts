import { boolean, integer, pgTable, text, timestamp, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users profile table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID or unique user id
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  displayName: text('display_name').default('Academic Scholar'),
  photoUrl: text('photo_url').default(''),
  institution: text('institution').default('University Academic & Research Center'),
  role: text('role').default('Graduate Researcher'),
  department: text('department').default('Computer Science & Information Systems'),
  bio: text('bio').default('Research focus on distributed systems, secure data management, and privacy-preserving algorithms.'),
  storageUsedBytes: bigint('storage_used_bytes', { mode: 'number' }).default(0),
  storageLimitBytes: bigint('storage_limit_bytes', { mode: 'number' }).default(21474836480), // 20 GB default limit
  themePreference: text('theme_preference').default('light'),
  emailNotifications: boolean('email_notifications').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Folders table supporting nested subfolders and category tagging
export const folders = pgTable('folders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  category: text('category').default('general').notNull(),
  color: text('color').default('#10b981'),
  icon: text('icon').default('folder'),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  isTrashed: boolean('is_trashed').default(false).notNull(),
  trashedAt: timestamp('trashed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Documents table for personal and academic files
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  storedFilename: text('stored_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileExtension: text('file_extension').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  category: text('category').notNull().default('general'), // cv, research, university, projects, certificates, personal
  description: text('description').default(''),
  tags: text('tags').default('[]').notNull(), // JSON array string
  isFavorite: boolean('is_favorite').default(false).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  isTrashed: boolean('is_trashed').default(false).notNull(),
  trashedAt: timestamp('trashed_at'),
  viewCount: integer('view_count').default(0).notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Research Projects module
export const researchProjects = pgTable('research_projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  abstract: text('abstract').default(''),
  objectives: text('objectives').default(''),
  methodology: text('methodology').default(''),
  status: text('status').default('In Progress').notNull(), // Idea, Planning, In Progress, Under Review, Completed
  keywords: text('keywords').default('[]').notNull(), // JSON array string
  supervisor: text('supervisor').default(''),
  collaborators: text('collaborators').default(''),
  deadline: text('deadline').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Research Notes with autosave support
export const researchNotes = pgTable('research_notes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Literature & Source References
export const researchReferences = pgTable('research_references', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  authors: text('authors').default(''),
  publicationYear: text('publication_year').default(''),
  sourceUrl: text('source_url').default(''),
  citation: text('citation').default(''),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Linked documents for research projects
export const researchLinkedDocuments = pgTable('research_linked_documents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Secure Sharing Links and Permissions
export const documentShares = pgTable('document_shares', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').notNull().unique(), // Cryptographic token
  targetEmail: text('target_email').default(''), // Specific recipient email or empty for link sharing
  permission: text('permission').default('viewer').notNull(), // viewer, commenter, editor
  allowDownload: boolean('allow_download').default(true).notNull(),
  isPasswordProtected: boolean('is_password_protected').default(false).notNull(),
  passwordHash: text('password_hash'),
  expiresAt: timestamp('expires_at'),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Document Comments
export const documentComments = pgTable('document_comments', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  authorId: text('author_id'),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').default(''),
  content: text('content').notNull(),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Activity and Audit Logs
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  documentId: text('document_id'),
  folderId: text('folder_id'),
  action: text('action').notNull(), // upload, view, download, share, revoke_share, rename, delete, restore, permanent_delete, comment, create_project, update_project
  details: text('details').default(''),
  ipAddress: text('ip_address').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  folders: many(folders),
  documents: many(documents),
  researchProjects: many(researchProjects),
  shares: many(documentShares),
  activityLogs: many(activityLogs),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.userId],
    references: [users.uid],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  shares: many(documentShares),
  comments: many(documentComments),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(users, {
    fields: [folders.userId],
    references: [users.uid],
  }),
  documents: many(documents),
}));

export const researchProjectsRelations = relations(researchProjects, ({ one, many }) => ({
  owner: one(users, {
    fields: [researchProjects.userId],
    references: [users.uid],
  }),
  notes: many(researchNotes),
  references: many(researchReferences),
  linkedDocs: many(researchLinkedDocuments),
}));
