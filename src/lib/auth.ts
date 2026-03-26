import type { IncomingMessage } from "node:http";

// Validate MCP_SECRET is present at startup — fail fast if missing
if (!process.env.MCP_SECRET) {
  console.error("FATAL: MCP_SECRET environment variable is not set. Refusing to start.");
  process.exit(1);
}

/**
 * Returns true if the request carries a valid Bearer token matching MCP_SECRET.
 * Never logs the secret value.
 */
export function isAuthorized(req: IncomingMessage): boolean {
  const authHeader = req.headers["authorization"] ?? "";
  return authHeader === `Bearer ${process.env.MCP_SECRET}`;
}
