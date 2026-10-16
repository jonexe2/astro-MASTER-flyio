import "./server-only.ts";

export const getHealthPayload = () => ({
  status: "ok" as const,
  serverTime: new Date().toISOString(),
});
