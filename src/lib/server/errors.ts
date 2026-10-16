import "./server-only.ts";

// Convention for backend errors:
// - Throw ServerError for problems we expect (bad settings, failed save). Give it a
//   constant CODE and a PREDEFINED message that says what is wrong and how to fix it.
//   Never build the message from setting values, credentials or anything a customer
//   submitted.
// - Anything else is "unexpected". We log only that it happened and where. Raw error
//   messages, error names, stacks, `cause`, request bodies and env values are never
//   logged, even in development: libraries put emails, form values and credentials
//   in messages. To diagnose one, reproduce it locally with a debugger, or catch it
//   at the failing call site and throw a ServerError with a predefined message.
// - Never return error details to the browser; return a generic message.

export class ServerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ServerError";
    this.code = code;
  }
}

// `scope` should be a constant such as "leads"; anything else is replaced.
const SAFE_LABEL = /^[A-Za-z0-9:_-]{1,40}$/;

export const formatError = (scope: string, error: unknown): string => {
  const where = SAFE_LABEL.test(scope) ? scope : "unknown";
  if (error instanceof ServerError && SAFE_LABEL.test(error.code)) {
    return `[${where}] ${error.code}: ${error.message}`;
  }
  return `[${where}] UNEXPECTED: details hidden`;
};

export const logServerError = (scope: string, error: unknown): void => {
  console.error(formatError(scope, error));
};
