import type { FieldError } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: FieldError[] = [],
  ) { super(message); }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Something went wrong. Please try again.', []);
  }
  if (response.ok) return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  const body = await response.json().catch(() => null);
  const err = body?.error;
  throw new ApiError(
    response.status,
    err?.code ?? 'UNKNOWN',
    err?.message ?? 'Something went wrong. Please try again.',
    err?.fields ?? [],
  );
}
