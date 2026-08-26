import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getSessionByTokenHash, getUserById, Session, User } from './db';

const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Hashes a plain password with a random cryptographically secure salt using PBKDF2-SHA512 (600k rounds)
 */
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return { hash, salt };
}

/**
 * Verifies a password against the stored PBKDF2 hash using constant-time comparison (supporting 600k and legacy 100k)
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    // 1. Try with standard 600,000 iterations
    const hash600k = crypto.pbkdf2Sync(password, salt, 600000, KEY_LENGTH, DIGEST).toString('hex');
    const hashBuf600k = Buffer.from(hash600k, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (hashBuf600k.length === storedBuf.length && crypto.timingSafeEqual(hashBuf600k, storedBuf)) {
      return true;
    }

    // 2. Fallback to 100,000 iterations for legacy compatibility
    const hash100k = crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, DIGEST).toString('hex');
    const hashBuf100k = Buffer.from(hash100k, 'hex');
    if (hashBuf100k.length === storedBuf.length && crypto.timingSafeEqual(hashBuf100k, storedBuf)) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Generates a 256-bit cryptographically secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a session token with SHA-256 for secure database storage
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Constant-time comparison for CSRF tokens
 */
export function verifyCsrfToken(submittedToken: string, sessionCsrfToken: string): boolean {
  try {
    if (!submittedToken || !sessionCsrfToken) return false;
    const subBuf = Buffer.from(submittedToken);
    const sesBuf = Buffer.from(sessionCsrfToken);
    if (subBuf.length !== sesBuf.length) return false;
    return crypto.timingSafeEqual(subBuf, sesBuf);
  } catch {
    return false;
  }
}

/**
 * Extracts session token from Cookie header or Authorization Bearer header
 */
export function extractSessionToken(req: NextRequest): string | null {
  // 1. Check HttpOnly cookie
  const cookie = req.cookies.get('recon_session');
  if (cookie?.value) {
    return cookie.value;
  }

  // 2. Check Authorization header: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Verifies request authentication and returns user & session
 */
export async function verifyAuth(req: NextRequest): Promise<{
  authenticated: boolean;
  user: User | null;
  session: Session | null;
  error?: string;
}> {
  const token = extractSessionToken(req);
  if (!token) {
    return { authenticated: false, user: null, session: null, error: 'Token de sessão ausente' };
  }

  const tokenHash = hashSessionToken(token);
  const session = await getSessionByTokenHash(tokenHash);

  if (!session) {
    return { authenticated: false, user: null, session: null, error: 'Sessão inválida ou expirada' };
  }

  const expiresTime = new Date(session.expiresAt).getTime();
  if (expiresTime <= Date.now()) {
    return { authenticated: false, user: null, session: null, error: 'Sessão expirada' };
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return { authenticated: false, user: null, session: null, error: 'Usuário não encontrado' };
  }

  return {
    authenticated: true,
    user,
    session,
  };
}
