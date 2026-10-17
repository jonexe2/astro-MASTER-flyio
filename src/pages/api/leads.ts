import type { APIRoute } from "astro";
import { handleLeadRequest } from "@/lib/server/leads/handler.ts";

// POST /api/leads/: the one submission endpoint for both lead forms. Runs on
// the server on every request; all checks live in the shared handler.
export const prerender = false;

export const ALL: APIRoute = (context) => {
  let clientAddress: string | undefined;
  try {
    clientAddress = context.clientAddress;
  } catch {
    clientAddress = undefined; // not provided by the runtime: shared "unknown" bucket
  }
  return handleLeadRequest(context.request, { clientAddress });
};
