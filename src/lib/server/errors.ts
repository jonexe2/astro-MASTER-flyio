import "./server-only.ts";

// Convention for backend errors:
// - Throw ServerError for problems we expect (bad settings, failed save). Its
//   message must be safe to print: say WHAT is wrong and HOW to fix it, and never
//   include setting values, credentials or anything a customer submitted.
// - Anything else is "unexpected". We log only its name (and, in development, a
//   short message). We never log request bodies, form data, env values or `cause`.
// - Never return error details to the browser; return a generic message.

export class ServerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ServerError";
    this.code = code;
  }
}

const MAX_DEV_MESSAGE = 200;

export const formatError = (scope: string, error: unknown, isDevelopment: boolean): string => {
  if (error instanceof ServerError) return `[${scope}] ${error.code}: ${error.message}`;
  const name = error instanceof Error ? error.name : "NonError";
  if (!isDevelopment || !(error instanceof Error)) {
    return `[${scope}] UNEXPECTED: ${name} (details hidden)`;
  }
  return `[${scope}] UNEXPECTED: ${name}: ${error.message.slice(0, MAX_DEV_MESSAGE)}`;
};

export const logServerError = (scope: string, error: unknown, isDevelopment: boolean): void => {
  console.error(formatError(scope, error, isDevelopment));
};
