import type { APIRoute } from "astro";

// Server-rendered on every request (the rest of the site is prerendered).
// Returns no configuration, secrets, or visitor data.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ status: "ok", serverTime: new Date().toISOString() }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
