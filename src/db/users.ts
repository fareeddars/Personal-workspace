import { db } from './index.ts';
import { users, activityLogs } from './schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const defaultName = displayName || (email ? email.split('@')[0] : 'Academic Scholar');
    const result = await db.insert(users)
      .values({
        id: uid,
        uid: uid,
        email: email,
        displayName: defaultName,
        photoUrl: photoUrl || '',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email,
          displayName: displayName || defaultName,
          photoUrl: photoUrl || '',
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database operation failed while synchronizing user profile.', { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw new Error('Could not retrieve user profile.', { cause: error });
  }
}

export async function updateUserProfile(uid: string, updates: Partial<{
  displayName: string;
  institution: string;
  role: string;
  department: string;
  bio: string;
  themePreference: string;
  emailNotifications: boolean;
}>) {
  try {
    const result = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error('Could not update user profile.', { cause: error });
  }
}

export async function logActivity(userId: string, action: string, details: string, documentId?: string, folderId?: string, ipAddress?: string) {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId,
      action,
      details,
      documentId: documentId || null,
      folderId: folderId || null,
      ipAddress: ipAddress || '',
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
    // Silent fail for logs so user operations don't get blocked
  }
}
