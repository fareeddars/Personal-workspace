import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { db } from './src/db/index.ts';
import { 
  users, 
  folders, 
  documents, 
  researchProjects, 
  researchNotes, 
  researchReferences, 
  researchLinkedDocuments, 
  documentShares, 
  documentComments, 
  activityLogs 
} from './src/db/schema.ts';
import { eq, and, desc, sql, or, isNull, inArray } from 'drizzle-orm';
import { requireAuth, optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserProfile, updateUserProfile, logActivity } from './src/db/users.ts';
import { createToken } from './src/lib/jwt.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure secure storage directory exists
const UPLOADS_DIR = path.resolve(__dirname, 'secure_storage');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Path traversal defense helper
function getSafeFilePath(storedFilename: string): string {
  const safeBase = path.basename(storedFilename);
  return path.join(UPLOADS_DIR, safeBase);
}

// Multer storage engine with cryptographic file naming
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeRandom = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${safeRandom}${ext}`);
  },
});

// Helper to guarantee accurate MIME types for inline preview
function getResolvedMimeType(ext: string, storedMime?: string): string {
  const cleanExt = (ext || '').toLowerCase().replace('.', '');
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    txt: 'text/plain; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    tsv: 'text/tab-separated-values; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    markdown: 'text/markdown; charset=utf-8',
    json: 'application/json; charset=utf-8',
    xml: 'text/xml; charset=utf-8',
    yaml: 'text/yaml; charset=utf-8',
    yml: 'text/yaml; charset=utf-8',
    log: 'text/plain; charset=utf-8',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    rtf: 'application/rtf',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    tex: 'text/x-tex; charset=utf-8',
    bib: 'text/x-bibtex; charset=utf-8',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  if (mimeMap[cleanExt]) return mimeMap[cleanExt];
  if (storedMime && storedMime !== 'application/octet-stream') return storedMime;
  return 'application/octet-stream';
}

// Prohibited hazardous executable and script extensions
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.vbs', '.msi', '.com', '.scr', 
  '.ps1', '.pif', '.application', '.gadget', '.bin', '.reg'
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Security policy: Executable file types ('${ext}') cannot be uploaded to the vault.`));
    }
    cb(null, true);
  },
});

/* ==========================================================================
   AUTHENTICATION & USER PROFILE
   ========================================================================== */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists or is unavailable.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = 'usr_' + crypto.randomBytes(12).toString('hex');
    const name = displayName?.trim() || normalizedEmail.split('@')[0];

    const newUser = await db.insert(users).values({
      id: uid,
      uid,
      email: normalizedEmail,
      passwordHash,
      displayName: name,
      photoUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const token = createToken({ uid, email: normalizedEmail, name });
    await logActivity(uid, 'register', 'Created private researcher vault', undefined, undefined, req.ip);

    // Don't send back passwordHash
    const safeUser = { ...newUser[0], passwordHash: undefined };
    res.status(201).json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Unable to complete account registration. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existing.length === 0 || !existing[0].passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password combination. Please verify your credentials.' });
    }

    const user = existing[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash!);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password combination. Please verify your credentials.' });
    }

    const token = createToken({ uid: user.uid, email: user.email, name: user.displayName || undefined });
    await logActivity(user.uid, 'login', 'Signed in to workspace', undefined, undefined, req.ip);

    const safeUser = { ...user, passwordHash: undefined };
    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed. Please check credentials.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  // Generic timing-safe response preventing enumeration
  res.json({ message: 'If an account exists with this email address, password reset instructions have been dispatched.' });
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getUserProfile(req.user!.uid);
    res.json({ user: profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
});

app.patch('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName, institution, role, department, bio, themePreference, emailNotifications } = req.body;
    const updated = await updateUserProfile(req.user!.uid, {
      displayName,
      institution,
      role,
      department,
      bio,
      themePreference,
      emailNotifications,
    });
    await logActivity(req.user!.uid, 'update_profile', 'Updated personal profile settings', undefined, undefined, req.ip);
    res.json({ user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user profile' });
  }
});

/* ==========================================================================
   DASHBOARD STATS (Aggregated Real Database Queries)
   ========================================================================== */
app.get('/api/dashboard/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;

    const [docsList, foldersList, sharesList, recentActs, recentFiles, pinnedFiles] = await Promise.all([
      db.select().from(documents).where(and(eq(documents.userId, uid), eq(documents.isTrashed, false))),
      db.select().from(folders).where(and(eq(folders.userId, uid), eq(folders.isTrashed, false))),
      db.select().from(documentShares).where(and(eq(documentShares.ownerId, uid), eq(documentShares.isRevoked, false))),
      db.select().from(activityLogs).where(eq(activityLogs.userId, uid)).orderBy(desc(activityLogs.createdAt)).limit(10),
      db.select().from(documents).where(and(eq(documents.userId, uid), eq(documents.isTrashed, false))).orderBy(desc(documents.createdAt)).limit(6),
      db.select().from(documents).where(and(eq(documents.userId, uid), eq(documents.isPinned, true), eq(documents.isTrashed, false))).limit(6),
    ]);

    const totalStorageBytes = docsList.reduce((acc, doc) => acc + (doc.sizeBytes || 0), 0);
    const favoriteCount = docsList.filter(d => d.isFavorite).length;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    for (const doc of docsList) {
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
    }

    res.json({
      totalDocuments: docsList.length,
      totalFolders: foldersList.length,
      totalShares: sharesList.length,
      totalStorageBytes,
      storageLimitBytes: req.dbUser?.storageLimitBytes || 21474836480,
      favoriteCount,
      categoryCounts,
      recentUploads: recentFiles,
      pinnedDocuments: pinnedFiles,
      recentActivity: recentActs,
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard statistics' });
  }
});

/* ==========================================================================
   FOLDERS (Nested Folders, Category Filter)
   ========================================================================== */
app.get('/api/folders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { parentId, category, isTrashed } = req.query;

    const conditions = [eq(folders.userId, uid)];

    if (isTrashed === 'true') {
      conditions.push(eq(folders.isTrashed, true));
    } else {
      conditions.push(eq(folders.isTrashed, false));
      if (parentId !== undefined) {
        if (parentId === 'root' || parentId === '') {
          conditions.push(isNull(folders.parentId));
        } else {
          conditions.push(eq(folders.parentId, parentId as string));
        }
      }
      if (category && category !== 'all') {
        conditions.push(eq(folders.category, category as string));
      }
    }

    const result = await db.select().from(folders).where(and(...conditions)).orderBy(desc(folders.createdAt));
    res.json({ folders: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

app.post('/api/folders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { name, parentId, category, color, icon } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const newFolder = await db.insert(folders).values({
      id: crypto.randomUUID(),
      userId: uid,
      name: name.trim(),
      parentId: parentId || null,
      category: category || 'general',
      color: color || '#10b981',
      icon: icon || 'folder',
      isFavorite: false,
      isTrashed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await logActivity(uid, 'create_folder', `Created folder "${name.trim()}"`, undefined, newFolder[0].id, req.ip);
    res.status(201).json({ folder: newFolder[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

app.patch('/api/folders/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { name, color, isFavorite, isTrashed } = req.body;

    const existing = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.userId, uid))).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Folder not found or unauthorized' });
    }

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    if (isFavorite !== undefined) updates.isFavorite = Boolean(isFavorite);
    if (isTrashed !== undefined) {
      updates.isTrashed = Boolean(isTrashed);
      updates.trashedAt = isTrashed ? new Date() : null;
    }

    const updated = await db.update(folders).set(updates).where(eq(folders.id, id)).returning();
    await logActivity(uid, 'update_folder', `Updated folder "${updated[0].name}"`, undefined, id, req.ip);
    res.json({ folder: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

/* ==========================================================================
   DOCUMENTS (List, Search, Multi-Filter, Sorting)
   ========================================================================== */
app.get('/api/documents', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { 
      category, 
      folderId, 
      tag, 
      search, 
      isFavorite, 
      isPinned, 
      isTrashed,
      sort = 'createdAt', 
      order = 'desc',
      limit = 100,
      offset = 0
    } = req.query;

    const conditions = [eq(documents.userId, uid)];

    if (isTrashed === 'true') {
      conditions.push(eq(documents.isTrashed, true));
    } else {
      conditions.push(eq(documents.isTrashed, false));

      if (category && category !== 'all') {
        conditions.push(eq(documents.category, category as string));
      }
      if (folderId !== undefined) {
        if (folderId === 'root' || folderId === '') {
          conditions.push(isNull(documents.folderId));
        } else {
          conditions.push(eq(documents.folderId, folderId as string));
        }
      }
      if (isFavorite === 'true') {
        conditions.push(eq(documents.isFavorite, true));
      }
      if (isPinned === 'true') {
        conditions.push(eq(documents.isPinned, true));
      }
    }

    // Dynamic order column
    const orderCol = sort === 'title' ? documents.title : sort === 'sizeBytes' ? documents.sizeBytes : documents.createdAt;
    const orderClause = order === 'asc' ? orderCol : desc(orderCol);

    let docs = await db.select().from(documents)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(Number(limit))
      .offset(Number(offset));

    // Client search filter if supplied
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(q) ||
        d.originalFilename.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.tags.toLowerCase().includes(q)
      );
    }

    if (tag && typeof tag === 'string') {
      const targetTag = tag.toLowerCase();
      docs = docs.filter(d => {
        try {
          const parsed = JSON.parse(d.tags);
          return Array.isArray(parsed) && parsed.some(t => t.toLowerCase() === targetTag);
        } catch {
          return d.tags.toLowerCase().includes(targetTag);
        }
      });
    }

    res.json({ documents: docs });
  } catch (err: any) {
    console.error('Fetch docs error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/* ==========================================================================
   DOCUMENT UPLOAD (Multer Multi-file with Validation)
   ========================================================================== */
app.post('/api/documents/upload', requireAuth, upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const { folderId, category = 'general', description = '', tags = '[]' } = req.body;

    const insertedDocs = [];
    let totalBytesAdded = 0;

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const baseTitle = path.basename(file.originalname, ext);

      const docId = crypto.randomUUID();
      const newDoc = await db.insert(documents).values({
        id: docId,
        userId: uid,
        folderId: folderId || null,
        title: baseTitle,
        originalFilename: file.originalname,
        storedFilename: file.filename,
        mimeType: file.mimetype || 'application/octet-stream',
        fileExtension: ext.replace('.', ''),
        sizeBytes: file.size,
        category: category,
        description: description,
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags),
        isFavorite: false,
        isPinned: false,
        isTrashed: false,
        viewCount: 0,
        downloadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      totalBytesAdded += file.size;
      insertedDocs.push(newDoc[0]);

      await logActivity(uid, 'upload', `Uploaded "${file.originalname}" (${(file.size / 1024).toFixed(1)} KB)`, docId, folderId || undefined, req.ip);
    }

    // Update user storage bytes
    await db.update(users)
      .set({
        storageUsedBytes: sql`${users.storageUsedBytes} + ${totalBytesAdded}`,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid));

    res.status(201).json({ documents: insertedDocs });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

/* ==========================================================================
   DOCUMENT DETAILS, PREVIEW, DOWNLOAD, ACTIONS
   ========================================================================== */
app.get('/api/documents/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    const doc = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, uid))).limit(1);
    if (!doc.length) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    // Update view count and access time
    await db.update(documents).set({
      viewCount: sql`${documents.viewCount} + 1`,
      lastAccessedAt: new Date(),
    }).where(eq(documents.id, id));

    res.json({ document: doc[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch document details' });
  }
});

app.patch('/api/documents/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { title, description, category, tags, folderId, isFavorite, isPinned, isTrashed } = req.body;

    const existing = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, uid))).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = typeof tags === 'string' ? tags : JSON.stringify(tags);
    if (folderId !== undefined) updates.folderId = folderId || null;
    if (isFavorite !== undefined) updates.isFavorite = Boolean(isFavorite);
    if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);
    if (isTrashed !== undefined) {
      updates.isTrashed = Boolean(isTrashed);
      updates.trashedAt = isTrashed ? new Date() : null;
    }

    const updated = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    const actionDesc = isTrashed !== undefined ? (isTrashed ? 'Moved to recycle bin' : 'Restored from recycle bin') : 'Updated document metadata';
    await logActivity(uid, isTrashed !== undefined ? (isTrashed ? 'delete' : 'restore') : 'rename', `${actionDesc}: "${updated[0].title}"`, id, undefined, req.ip);

    res.json({ document: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Permanent delete
app.delete('/api/documents/:id/permanent', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    const existing = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, uid))).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = existing[0];
    const filePath = getSafeFilePath(doc.storedFilename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('File unlink error:', e);
      }
    }

    // Delete record
    await db.delete(documents).where(eq(documents.id, id));

    // Deduct storage
    await db.update(users).set({
      storageUsedBytes: sql`GREATEST(0, ${users.storageUsedBytes} - ${doc.sizeBytes})`,
      updatedAt: new Date(),
    }).where(eq(users.uid, uid));

    await logActivity(uid, 'permanent_delete', `Permanently deleted "${doc.title}"`, id, undefined, req.ip);
    res.json({ success: true, message: 'Document permanently deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to permanently delete document' });
  }
});

// Stream preview (PDF, Image, Text, Office)
app.get('/api/documents/:id/preview', optionalAuth, async (req: AuthRequest, res) => {
  try {
    let uid = req.user?.uid;
    const { id } = req.params;

    // Check query token fallback
    const queryToken = req.query.token as string | undefined;
    if (!uid && queryToken) {
      const local = verifyToken(queryToken);
      if (local) {
        uid = local.uid;
      } else {
        try {
          const decoded = await adminAuth.verifyIdToken(queryToken);
          uid = decoded.uid;
        } catch {}
      }
    }

    // Check if accessed through a share token
    const shareToken = req.query.share as string | undefined;
    let allowedByShare = false;
    if (shareToken) {
      const share = await db.select().from(documentShares).where(and(eq(documentShares.shareToken, shareToken), eq(documentShares.documentId, id))).limit(1);
      if (share.length && !share[0].isRevoked && (!share[0].expiresAt || new Date() <= new Date(share[0].expiresAt))) {
        allowedByShare = true;
      }
    }

    if (!uid && !allowedByShare) {
      return res.status(401).send('Unauthorized: Please sign in or supply a valid session token.');
    }

    const docConditions = allowedByShare ? [eq(documents.id, id)] : [eq(documents.id, id), eq(documents.userId, uid!)];
    const doc = await db.select().from(documents).where(and(...docConditions)).limit(1);
    if (!doc.length) {
      return res.status(404).send('Document not found or access denied');
    }

    const filePath = getSafeFilePath(doc[0].storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Physical file missing from storage');
    }

    // Accurate MIME type ensures images, PDFs, text render correctly inline
    const resolvedMime = getResolvedMimeType(doc[0].fileExtension, doc[0].mimeType);
    res.setHeader('Content-Type', resolvedMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc[0].originalFilename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    console.error('Preview error:', err);
    res.status(500).send('Preview unavailable');
  }
});

// Secure Download
app.get('/api/documents/:id/download', optionalAuth, async (req: AuthRequest, res) => {
  try {
    let uid = req.user?.uid;
    const { id } = req.params;

    const queryToken = req.query.token as string | undefined;
    if (!uid && queryToken) {
      const local = verifyToken(queryToken);
      if (local) {
        uid = local.uid;
      } else {
        try {
          const decoded = await adminAuth.verifyIdToken(queryToken);
          uid = decoded.uid;
        } catch {}
      }
    }

    const shareToken = req.query.share as string | undefined;
    let allowedByShare = false;
    if (shareToken) {
      const share = await db.select().from(documentShares).where(and(eq(documentShares.shareToken, shareToken), eq(documentShares.documentId, id))).limit(1);
      if (share.length && !share[0].isRevoked && share[0].allowDownload && (!share[0].expiresAt || new Date() <= new Date(share[0].expiresAt))) {
        allowedByShare = true;
      }
    }

    if (!uid && !allowedByShare) {
      return res.status(401).send('Unauthorized: Please sign in or supply a valid session token.');
    }

    const docConditions = allowedByShare ? [eq(documents.id, id)] : [eq(documents.id, id), eq(documents.userId, uid!)];
    const doc = await db.select().from(documents).where(and(...docConditions)).limit(1);
    if (!doc.length) {
      return res.status(404).send('Document not found');
    }

    const filePath = getSafeFilePath(doc[0].storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Physical file missing');
    }

    await db.update(documents).set({
      downloadCount: sql`${documents.downloadCount} + 1`,
      lastAccessedAt: new Date(),
    }).where(eq(documents.id, id));

    if (uid) {
      await logActivity(uid, 'download', `Downloaded "${doc[0].originalFilename}"`, id, undefined, req.ip);
    }

    const resolvedMime = getResolvedMimeType(doc[0].fileExtension, doc[0].mimeType);
    res.setHeader('Content-Type', resolvedMime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc[0].originalFilename)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).send('Download failed');
  }
});

/* ==========================================================================
   DOCUMENT COMMENTS
   ========================================================================== */
app.get('/api/documents/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    // Verify ownership
    const doc = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, uid))).limit(1);
    if (!doc.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const comments = await db.select().from(documentComments).where(eq(documentComments.documentId, id)).orderBy(desc(documentComments.createdAt));
    res.json({ comments });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/documents/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const doc = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, uid))).limit(1);
    if (!doc.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const authorName = req.dbUser?.displayName || req.user?.name || req.user?.email || 'Academic Scholar';
    const newComment = await db.insert(documentComments).values({
      id: crypto.randomUUID(),
      documentId: id,
      authorId: uid,
      authorName,
      authorEmail: req.user?.email || '',
      content: content.trim(),
      isResolved: false,
      createdAt: new Date(),
    }).returning();

    await logActivity(uid, 'comment', `Commented on "${doc[0].title}"`, id, undefined, req.ip);
    res.status(201).json({ comment: newComment[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.patch('/api/comments/:commentId/toggle-resolve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { commentId } = req.params;

    const comm = await db.select().from(documentComments).where(eq(documentComments.id, commentId)).limit(1);
    if (!comm.length) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const updated = await db.update(documentComments).set({
      isResolved: !comm[0].isResolved,
      resolvedAt: !comm[0].isResolved ? new Date() : null,
      resolvedBy: !comm[0].isResolved ? (req.user?.name || req.user?.email || uid) : null,
    }).where(eq(documentComments.id, commentId)).returning();

    res.json({ comment: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
});

/* ==========================================================================
   SECURE DOCUMENT SHARING (Owner Management)
   ========================================================================== */
app.get('/api/shares', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const shares = await db.select({
      share: documentShares,
      document: documents,
    })
    .from(documentShares)
    .leftJoin(documents, eq(documentShares.documentId, documents.id))
    .where(eq(documentShares.ownerId, uid))
    .orderBy(desc(documentShares.createdAt));

    res.json({ shares });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load active shares' });
  }
});

app.post('/api/shares/create', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { documentId, folderId, targetEmail, permission = 'viewer', allowDownload = true, password, expiresDays } = req.body;

    if (!documentId && !folderId) {
      return res.status(400).json({ error: 'A document or folder must be selected for sharing' });
    }

    // Verify ownership
    if (documentId) {
      const doc = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, uid))).limit(1);
      if (!doc.length) {
        return res.status(403).json({ error: 'You do not own this document' });
      }
    }

    // Generate cryptographic token
    const shareToken = crypto.randomBytes(24).toString('base64url');

    // Hash password if supplied
    let passwordHash: string | null = null;
    let isPasswordProtected = false;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
      isPasswordProtected = true;
    }

    // Compute expiration
    let expiresAt: Date | null = null;
    if (expiresDays && Number(expiresDays) > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiresDays));
    }

    const newShare = await db.insert(documentShares).values({
      id: crypto.randomUUID(),
      ownerId: uid,
      documentId: documentId || null,
      folderId: folderId || null,
      shareToken,
      targetEmail: targetEmail ? targetEmail.trim() : '',
      permission: permission as 'viewer' | 'commenter' | 'editor',
      allowDownload: Boolean(allowDownload),
      isPasswordProtected,
      passwordHash,
      expiresAt,
      isRevoked: false,
      createdAt: new Date(),
    }).returning();

    await logActivity(uid, 'share', `Created secure share link (Token: ${shareToken.substring(0, 8)}..., Perm: ${permission})`, documentId || undefined, folderId || undefined, req.ip);

    res.status(201).json({ share: newShare[0] });
  } catch (err: any) {
    console.error('Create share error:', err);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

app.patch('/api/shares/:id/revoke', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    const share = await db.select().from(documentShares).where(and(eq(documentShares.id, id), eq(documentShares.ownerId, uid))).limit(1);
    if (!share.length) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const updated = await db.update(documentShares).set({
      isRevoked: true,
    }).where(eq(documentShares.id, id)).returning();

    await logActivity(uid, 'revoke_share', `Revoked share link #${id}`, share[0].documentId || undefined, undefined, req.ip);
    res.json({ share: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

/* ==========================================================================
   PUBLIC SECURE SHARE ACCESS (Validation, Password, Preview, Download)
   ========================================================================== */
app.post('/api/public/share/:token/access', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await db.select().from(documentShares).where(eq(documentShares.shareToken, token)).limit(1);
    if (!share.length) {
      return res.status(404).json({ error: 'Share link does not exist or has been removed.' });
    }

    const s = share[0];

    // Check revocation
    if (s.isRevoked) {
      return res.status(410).json({ error: 'This secure link has been revoked by the owner.' });
    }

    // Check expiration
    if (s.expiresAt && new Date() > new Date(s.expiresAt)) {
      return res.status(410).json({ error: 'This share link has expired.' });
    }

    // Check target email restriction if configured
    if (s.targetEmail && s.targetEmail.trim() !== '') {
      if (!req.user || req.user.email?.toLowerCase() !== s.targetEmail.toLowerCase()) {
        return res.status(403).json({ 
          error: `Restricted Access: This document is strictly shared with ${s.targetEmail}. Please sign in with that authorized account.` 
        });
      }
    }

    // Check password if protected
    if (s.isPasswordProtected && s.passwordHash) {
      if (!password) {
        return res.status(401).json({ requiresPassword: true, error: 'Password required to unlock this document' });
      }
      const isMatch = await bcrypt.compare(password, s.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ requiresPassword: true, error: 'Incorrect access password' });
      }
    }

    // Fetch document metadata safely (NO private paths or storage internals exposed)
    const doc = await db.select({
      id: documents.id,
      title: documents.title,
      originalFilename: documents.originalFilename,
      mimeType: documents.mimeType,
      fileExtension: documents.fileExtension,
      sizeBytes: documents.sizeBytes,
      category: documents.category,
      description: documents.description,
      tags: documents.tags,
      createdAt: documents.createdAt,
    }).from(documents).where(eq(documents.id, s.documentId!)).limit(1);

    if (!doc.length) {
      return res.status(404).json({ error: 'The shared document no longer exists.' });
    }

    // Update view statistics on the share
    await db.update(documentShares).set({
      viewCount: sql`${documentShares.viewCount} + 1`,
      lastAccessedAt: new Date(),
    }).where(eq(documentShares.id, s.id));

    // Fetch comments if permitted
    let comments: any[] = [];
    if (s.permission === 'commenter' || s.permission === 'editor') {
      comments = await db.select().from(documentComments).where(eq(documentComments.documentId, s.documentId!)).orderBy(desc(documentComments.createdAt));
    }

    // Owner public name
    const owner = await db.select({ displayName: users.displayName, institution: users.institution }).from(users).where(eq(users.uid, s.ownerId)).limit(1);

    res.json({
      share: {
        id: s.id,
        permission: s.permission,
        allowDownload: s.allowDownload,
        expiresAt: s.expiresAt,
      },
      document: doc[0],
      owner: owner[0] || { displayName: 'Academic Researcher', institution: 'University' },
      comments,
    });
  } catch (err: any) {
    console.error('Public access error:', err);
    res.status(500).json({ error: 'Failed to verify share access' });
  }
});

// Public Share: Preview Stream
app.get('/api/public/share/:token/preview', async (req, res) => {
  try {
    const { token } = req.params;
    const share = await db.select().from(documentShares).where(eq(documentShares.shareToken, token)).limit(1);
    if (!share.length || share[0].isRevoked) {
      return res.status(404).send('Share link expired or invalid');
    }

    const s = share[0];
    if (s.expiresAt && new Date() > new Date(s.expiresAt)) {
      return res.status(410).send('Share link expired');
    }

    // Enforce password if share is protected
    if (s.isPasswordProtected && s.passwordHash) {
      const pwd = (req.query.pwd as string) || '';
      const isMatch = await bcrypt.compare(pwd, s.passwordHash);
      if (!isMatch) {
        return res.status(401).send('Password required to preview this protected document');
      }
    }

    const doc = await db.select().from(documents).where(eq(documents.id, s.documentId!)).limit(1);
    if (!doc.length) {
      return res.status(404).send('Document not found');
    }

    const filePath = getSafeFilePath(doc[0].storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File unavailable');
    }

    const resolvedMime = getResolvedMimeType(doc[0].fileExtension, doc[0].mimeType);
    res.setHeader('Content-Type', resolvedMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc[0].originalFilename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=600');
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).send('Error streaming document');
  }
});

// Public Share: Download (strictly respects allowDownload flag)
app.get('/api/public/share/:token/download', async (req, res) => {
  try {
    const { token } = req.params;
    const share = await db.select().from(documentShares).where(eq(documentShares.shareToken, token)).limit(1);
    if (!share.length || share[0].isRevoked) {
      return res.status(404).send('Share link expired or invalid');
    }

    const s = share[0];
    if (s.expiresAt && new Date() > new Date(s.expiresAt)) {
      return res.status(410).send('Share link expired');
    }

    if (!s.allowDownload) {
      return res.status(403).send('Download restriction enforced: The document owner has disabled downloading for this share link.');
    }

    // Enforce password if share is protected
    if (s.isPasswordProtected && s.passwordHash) {
      const pwd = (req.query.pwd as string) || '';
      const isMatch = await bcrypt.compare(pwd, s.passwordHash);
      if (!isMatch) {
        return res.status(401).send('Password required to download this protected document');
      }
    }

    const doc = await db.select().from(documents).where(eq(documents.id, s.documentId!)).limit(1);
    if (!doc.length) {
      return res.status(404).send('Document not found');
    }

    const filePath = getSafeFilePath(doc[0].storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File missing');
    }

    await db.update(documentShares).set({
      downloadCount: sql`${documentShares.downloadCount} + 1`,
    }).where(eq(documentShares.id, s.id));

    const resolvedMime = getResolvedMimeType(doc[0].fileExtension, doc[0].mimeType);
    res.setHeader('Content-Type', resolvedMime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc[0].originalFilename)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).send('Download error');
  }
});

// Public Share: Post comment (allowed if permission is commenter or editor)
app.post('/api/public/share/:token/comments', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.params;
    const { content, authorName, authorEmail } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const share = await db.select().from(documentShares).where(eq(documentShares.shareToken, token)).limit(1);
    if (!share.length || share[0].isRevoked) {
      return res.status(404).json({ error: 'Invalid share link' });
    }

    const s = share[0];
    if (s.permission === 'viewer') {
      return res.status(403).json({ error: 'Comment permission denied: Read-only viewer access' });
    }

    const commenterName = req.user?.name || authorName || 'Professor / Reviewer';
    const commenterEmail = req.user?.email || authorEmail || '';

    const newComment = await db.insert(documentComments).values({
      id: crypto.randomUUID(),
      documentId: s.documentId!,
      authorId: req.user?.uid || null,
      authorName: commenterName,
      authorEmail: commenterEmail,
      content: content.trim(),
      isResolved: false,
      createdAt: new Date(),
    }).returning();

    res.status(201).json({ comment: newComment[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

/* ==========================================================================
   RESEARCH WORKSPACE MODULE (Projects, Notes, References, Document Links)
   ========================================================================== */
app.get('/api/research/projects', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const projects = await db.select().from(researchProjects).where(eq(researchProjects.userId, uid)).orderBy(desc(researchProjects.createdAt));
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch research projects' });
  }
});

app.post('/api/research/projects', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { title, abstract, objectives, methodology, status = 'In Progress', keywords = '[]', supervisor, collaborators, deadline } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    const newProj = await db.insert(researchProjects).values({
      id: crypto.randomUUID(),
      userId: uid,
      title: title.trim(),
      abstract: abstract || '',
      objectives: objectives || '',
      methodology: methodology || '',
      status: status || 'In Progress',
      keywords: typeof keywords === 'string' ? keywords : JSON.stringify(keywords),
      supervisor: supervisor || '',
      collaborators: collaborators || '',
      deadline: deadline || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await logActivity(uid, 'create_project', `Created research project "${title.trim()}"`, undefined, undefined, req.ip);
    res.status(201).json({ project: newProj[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create research project' });
  }
});

app.get('/api/research/projects/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    const proj = await db.select().from(researchProjects).where(and(eq(researchProjects.id, id), eq(researchProjects.userId, uid))).limit(1);
    if (!proj.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [notes, refs, linkedDocs] = await Promise.all([
      db.select().from(researchNotes).where(eq(researchNotes.projectId, id)).orderBy(desc(researchNotes.updatedAt)),
      db.select().from(researchReferences).where(eq(researchReferences.projectId, id)).orderBy(desc(researchReferences.createdAt)),
      db.select({
        linkId: researchLinkedDocuments.id,
        document: documents,
      })
      .from(researchLinkedDocuments)
      .innerJoin(documents, eq(researchLinkedDocuments.documentId, documents.id))
      .where(eq(researchLinkedDocuments.projectId, id)),
    ]);

    res.json({
      project: proj[0],
      notes,
      references: refs,
      linkedDocuments: linkedDocs.map(ld => ({ ...ld.document, linkId: ld.linkId })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load project details' });
  }
});

app.patch('/api/research/projects/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { title, abstract, objectives, methodology, status, keywords, supervisor, collaborators, deadline } = req.body;

    const existing = await db.select().from(researchProjects).where(and(eq(researchProjects.id, id), eq(researchProjects.userId, uid))).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (abstract !== undefined) updates.abstract = abstract;
    if (objectives !== undefined) updates.objectives = objectives;
    if (methodology !== undefined) updates.methodology = methodology;
    if (status !== undefined) updates.status = status;
    if (keywords !== undefined) updates.keywords = typeof keywords === 'string' ? keywords : JSON.stringify(keywords);
    if (supervisor !== undefined) updates.supervisor = supervisor;
    if (collaborators !== undefined) updates.collaborators = collaborators;
    if (deadline !== undefined) updates.deadline = deadline;

    const updated = await db.update(researchProjects).set(updates).where(eq(researchProjects.id, id)).returning();
    await logActivity(uid, 'update_project', `Updated research project "${updated[0].title}"`, undefined, undefined, req.ip);
    res.json({ project: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update research project' });
  }
});

// Research Notes with Autosave
app.post('/api/research/projects/:id/notes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { title = 'Untitled Research Note', content = '' } = req.body;

    const newNote = await db.insert(researchNotes).values({
      id: crypto.randomUUID(),
      projectId: id,
      userId: uid,
      title: title.trim(),
      content: content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json({ note: newNote[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create research note' });
  }
});

app.patch('/api/research/notes/:noteId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { noteId } = req.params;
    const { title, content } = req.body;

    const existing = await db.select().from(researchNotes).where(and(eq(researchNotes.id, noteId), eq(researchNotes.userId, uid))).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content;

    const updated = await db.update(researchNotes).set(updates).where(eq(researchNotes.id, noteId)).returning();
    res.json({ note: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/research/notes/:noteId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { noteId } = req.params;
    await db.delete(researchNotes).where(and(eq(researchNotes.id, noteId), eq(researchNotes.userId, uid)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Research References
app.post('/api/research/projects/:id/references', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { title, authors, publicationYear, sourceUrl, citation, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Citation/Reference title is required' });
    }

    const newRef = await db.insert(researchReferences).values({
      id: crypto.randomUUID(),
      projectId: id,
      userId: uid,
      title: title.trim(),
      authors: authors || '',
      publicationYear: publicationYear || '',
      sourceUrl: sourceUrl || '',
      citation: citation || '',
      notes: notes || '',
      createdAt: new Date(),
    }).returning();

    res.status(201).json({ reference: newRef[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create reference' });
  }
});

app.delete('/api/research/references/:refId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { refId } = req.params;
    await db.delete(researchReferences).where(and(eq(researchReferences.id, refId), eq(researchReferences.userId, uid)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete reference' });
  }
});

// Link Document to Project
app.post('/api/research/projects/:id/link-document', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { documentId } = req.body;

    const doc = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, uid))).limit(1);
    if (!doc.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const linked = await db.insert(researchLinkedDocuments).values({
      id: crypto.randomUUID(),
      projectId: id,
      documentId: documentId,
      createdAt: new Date(),
    }).returning();

    res.status(201).json({ linked: linked[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to link document' });
  }
});

app.delete('/api/research/projects/:id/unlink-document/:linkId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { linkId } = req.params;
    await db.delete(researchLinkedDocuments).where(eq(researchLinkedDocuments.id, linkId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unlink document' });
  }
});

/* ==========================================================================
   ACTIVITY LOGS & AUDIT TRAIL
   ========================================================================== */
app.get('/api/activity-logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const logs = await db.select().from(activityLogs).where(eq(activityLogs.userId, uid)).orderBy(desc(activityLogs.createdAt)).limit(100);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

/* ==========================================================================
   SETTINGS: DATA EXPORT & ACCOUNT PURGE
   ========================================================================== */
app.get('/api/user/export', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const [profile, userDocs, userFolders, userProjects, userShares, userLogs] = await Promise.all([
      db.select().from(users).where(eq(users.uid, uid)),
      db.select().from(documents).where(eq(documents.userId, uid)),
      db.select().from(folders).where(eq(folders.userId, uid)),
      db.select().from(researchProjects).where(eq(researchProjects.userId, uid)),
      db.select().from(documentShares).where(eq(documentShares.ownerId, uid)),
      db.select().from(activityLogs).where(eq(activityLogs.userId, uid)),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      profile: profile[0] || null,
      documents: userDocs,
      folders: userFolders,
      researchProjects: userProjects,
      shares: userShares,
      activityLogs: userLogs,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="aegisdocs-export-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate account export' });
  }
});

app.delete('/api/user/delete-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;

    // Remove all physical files
    const userDocs = await db.select().from(documents).where(eq(documents.userId, uid));
    for (const doc of userDocs) {
      const filePath = getSafeFilePath(doc.storedFilename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    // Cascade delete user in DB
    await db.delete(users).where(eq(users.uid, uid));

    res.json({ success: true, message: 'All personal documents and user records deleted permanently' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/* ==========================================================================
   VITE DEV SERVER & STATIC ASSETS
   ========================================================================== */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AegisDocs Academic Workspace server running on port ${PORT}`);
  });
}

startServer();
