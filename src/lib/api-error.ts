// API error envelope helpers (§4.8). The single error shape for every route:
//   { "error": { "code", "message", "fields"? } }
import type { FieldError } from './types';
import { S } from './strings';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'LIMIT_PER_LINE'
  | 'STOCK_CONFLICT'
  | 'CART_EMPTY';

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  USERNAME_TAKEN: 409,
  LIMIT_PER_LINE: 409,
  STOCK_CONFLICT: 409,
  CART_EMPTY: 409,
};

const MESSAGE: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: S.ERR_VALIDATION,
  INVALID_CREDENTIALS: S.ERR_INVALID_CREDENTIALS,
  UNAUTHENTICATED: S.ERR_UNAUTHENTICATED,
  FORBIDDEN: S.ERR_FORBIDDEN,
  NOT_FOUND: S.ERR_NOT_FOUND,
  EMAIL_TAKEN: S.ERR_EMAIL_TAKEN,
  USERNAME_TAKEN: S.ERR_USERNAME_TAKEN,
  LIMIT_PER_LINE: S.ERR_QTY_LIMIT,
  STOCK_CONFLICT: S.ERR_STOCK_CONFLICT,
  CART_EMPTY: S.ERR_CART_EMPTY,
};

type ErrorBody = { error: { code: ApiErrorCode; message: string; fields?: FieldError[]; conflicts?: unknown[] } };

export function errorResponse(code: ApiErrorCode, fields?: FieldError[], conflicts?: unknown[]): Response {
  const body: ErrorBody = { error: { code, message: MESSAGE[code] } };
  if (fields && fields.length > 0) body.error.fields = fields;
  if (conflicts) body.error.conflicts = conflicts;
  return Response.json(body, { status: STATUS[code] });
}

export function notFoundResponse(): Response {
  return errorResponse('NOT_FOUND');
}

export function unauthenticatedResponse(): Response {
  return errorResponse('UNAUTHENTICATED');
}

export function forbiddenResponse(): Response {
  return errorResponse('FORBIDDEN');
}

export function invalidBodyResponse(): Response {
  return errorResponse('VALIDATION_ERROR', [{ field: 'body', message: S.ERR_BODY }]);
}
