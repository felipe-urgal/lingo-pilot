export const errorCodes = {
  authAccountUnavailable: "AUTH_ACCOUNT_UNAVAILABLE",
  authForbidden: "AUTH_FORBIDDEN",
  authInvalidCredentials: "AUTH_INVALID_CREDENTIALS",
  authUnauthorized: "AUTH_UNAUTHORIZED",
  databaseUnavailable: "DB_UNAVAILABLE",
  internalUnexpected: "INTERNAL_UNEXPECTED",
  requestInvalidInput: "REQUEST_INVALID_INPUT",
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export type SafeHttpError = Readonly<{
  code: ErrorCode;
  status: number;
  legacyError: string;
}>;

const safeHttpErrors: Readonly<Record<ErrorCode, SafeHttpError>> = {
  AUTH_ACCOUNT_UNAVAILABLE: {
    code: "AUTH_ACCOUNT_UNAVAILABLE",
    status: 409,
    legacyError: "account_unavailable",
  },
  AUTH_FORBIDDEN: {
    code: "AUTH_FORBIDDEN",
    status: 403,
    legacyError: "forbidden",
  },
  AUTH_INVALID_CREDENTIALS: {
    code: "AUTH_INVALID_CREDENTIALS",
    status: 401,
    legacyError: "invalid_credentials",
  },
  AUTH_UNAUTHORIZED: {
    code: "AUTH_UNAUTHORIZED",
    status: 401,
    legacyError: "unauthorized",
  },
  DB_UNAVAILABLE: {
    code: "DB_UNAVAILABLE",
    status: 503,
    legacyError: "unavailable",
  },
  INTERNAL_UNEXPECTED: {
    code: "INTERNAL_UNEXPECTED",
    status: 500,
    legacyError: "internal_error",
  },
  REQUEST_INVALID_INPUT: {
    code: "REQUEST_INVALID_INPUT",
    status: 400,
    legacyError: "invalid_request",
  },
};

export function getSafeHttpError(code: ErrorCode): SafeHttpError {
  return safeHttpErrors[code];
}

export function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
