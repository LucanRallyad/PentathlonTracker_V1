/**
 * Custom application error classes with error codes.
 * Never expose internal details to clients.
 */

export enum ErrorCode {
  // Auth errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_PASSWORD_EXPIRED = 'AUTH_PASSWORD_EXPIRED',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_INVALID = 'AUTH_SESSION_INVALID',

  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  OWNERSHIP_REQUIRED = 'OWNERSHIP_REQUIRED',
  COMPETITION_ACCESS_DENIED = 'COMPETITION_ACCESS_DENIED',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Privacy errors
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  MINOR_DATA_RESTRICTED = 'MINOR_DATA_RESTRICTED',
  DATA_CLASSIFICATION_DENIED = 'DATA_CLASSIFICATION_DENIED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

// Map error codes to HTTP status codes
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 423,
  [ErrorCode.AUTH_PASSWORD_EXPIRED]: 403,
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCode.AUTH_SESSION_INVALID]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_ROLE]: 403,
  [ErrorCode.OWNERSHIP_REQUIRED]: 403,
  [ErrorCode.COMPETITION_ACCESS_DENIED]: 403,
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.CONSENT_REQUIRED]: 403,
  [ErrorCode.MINOR_DATA_RESTRICTED]: 403,
  [ErrorCode.DATA_CLASSIFICATION_DENIED]: 403,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
};

// Safe client-facing messages (never leak internals)
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_REQUIRED]: 'Authentication required',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'Account temporarily locked',
  [ErrorCode.AUTH_PASSWORD_EXPIRED]: 'Password has expired',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Session has expired',
  [ErrorCode.AUTH_SESSION_INVALID]: 'Invalid session',
  [ErrorCode.FORBIDDEN]: 'Access denied',
  [ErrorCode.INSUFFICIENT_ROLE]: 'Access denied',
  [ErrorCode.OWNERSHIP_REQUIRED]: 'Access denied',
  [ErrorCode.COMPETITION_ACCESS_DENIED]: 'Access denied',
  [ErrorCode.VALIDATION_FAILED]: 'Invalid request data',
  [ErrorCode.INVALID_INPUT]: 'Invalid input',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.CONFLICT]: 'Resource conflict',
  [ErrorCode.RATE_LIMITED]: 'Too many requests',
  [ErrorCode.CONSENT_REQUIRED]: 'Consent required for this operation',
  [ErrorCode.MINOR_DATA_RESTRICTED]: 'Access denied',
  [ErrorCode.DATA_CLASSIFICATION_DENIED]: 'Access denied',
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
  [ErrorCode.DATABASE_ERROR]: 'An unexpected error occurred',
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly clientMessage: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    internalMessage?: string,
    details?: Record<string, unknown>
  ) {
    super(internalMessage || ERROR_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code];
    this.clientMessage = ERROR_MESSAGES[code];
    this.details = details;
  }

  /** Safe JSON response body for the client */
  toClientJSON() {
    return {
      error: this.clientMessage,
      code: this.code,
      ...(this.details && this.code === ErrorCode.VALIDATION_FAILED
        ? { validationErrors: this.details }
        : {}),
    };
  }
}
