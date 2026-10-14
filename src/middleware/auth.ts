import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifyToken } from '../lib/jwt.ts';
import { getOrCreateUser, getUserProfile } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    displayName?: string;
    picture?: string;
    photoURL?: string;
  };
  dbUser?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
  }

  // 1. Try our native secure session token
  const localPayload = verifyToken(token);
  if (localPayload) {
    req.user = {
      uid: localPayload.uid,
      email: localPayload.email,
      name: localPayload.name,
      displayName: localPayload.name,
    };
    try {
      const dbUser = await getUserProfile(localPayload.uid);
      req.dbUser = dbUser;
      return next();
    } catch (err) {
      console.error('Error fetching db user:', err);
      return res.status(500).json({ error: 'Database session error' });
    }
  }

  // 2. Try Firebase ID token (for Google OAuth)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      displayName: decodedToken.name,
      picture: decodedToken.picture,
      photoURL: decodedToken.picture,
    };

    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@academic.internal`,
      decodedToken.name,
      decodedToken.picture
    );
    req.dbUser = dbUser;
    return next();
  } catch (error) {
    // Both failed
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }
  const localPayload = verifyToken(token);
  if (localPayload) {
    req.user = {
      uid: localPayload.uid,
      email: localPayload.email,
      name: localPayload.name,
      displayName: localPayload.name,
    };
    try {
      req.dbUser = await getUserProfile(localPayload.uid);
    } catch {}
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      displayName: decodedToken.name,
      picture: decodedToken.picture,
      photoURL: decodedToken.picture,
    };
    req.dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@academic.internal`,
      decodedToken.name,
      decodedToken.picture
    );
  } catch {}
  next();
};
