import crypto from 'node:crypto';
import { getDb } from '@/db';
import { SESSION_COOKIE, SESSION_TTL_DAYS } from './constants';
import type { Role, User } from './types';

export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = decodeURIComponent(trimmed.slice(0, eq));
    const value = decodeURIComponent(trimmed.slice(eq + 1));
    out[key] = value;
  }
  return out;
}

export function createSession(userId: number): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_DAYS * 86400}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function destroySession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

type UserRow = {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
  expires_at: string;
};

export function getSessionUser(cookieHeader: string | null | undefined): User | null {
  const token = parseCookieHeader(cookieHeader)[SESSION_COOKIE];
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.username, u.role, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as UserRow | undefined;
  if (!row) return null;
  if (row.expires_at <= new Date().toISOString()) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role as Role,
    createdAt: row.created_at,
  };
}

export function userFromRequest(request: Request): User | null {
  return getSessionUser(request.headers.get('cookie'));
}
