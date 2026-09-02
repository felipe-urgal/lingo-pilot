export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(): string;
}

export type ApplicationError<TCode extends string> = Readonly<{
  code: TCode;
}>;

export type Result<TValue, TError> =
  | Readonly<{ ok: true; value: TValue }>
  | Readonly<{ ok: false; error: TError }>;

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { error, ok: false };
}
