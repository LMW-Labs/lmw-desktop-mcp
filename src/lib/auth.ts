import type { IncomingMessage } from "node:http";
import { URL } from "node:url";

// Validate MCP_SECRET is present at startup — fail fast if missing
if (!process.env.MCP_SECRET) {
  console.error("FATAL: MCP_SECRET environment variable is not set. Refusing to start.");
  process.exit(1);
}

/**
 * Returns true if the request carries a valid token matching MCP_SECRET.
 * Accepts either:
 *   - Authorization: Bearer <secret>  (header)
 *   - ?token=<secret>                 (query param, for clients that can't set headers)
 * Never logs the secret value.
 */
export function isAuthorized(req: IncomingMessage): boolean {
  // Check Authorization header
  const authHeader = req.headers["authorization"] ?? "";
  if (authHeader === `Bearer ${process.env.MCP_SECRET}`) return true;

  // Check ?token= query param
  const base = `http://localhost${req.url ?? ""}`;
  const token = new URL(base).searchParams.get("token") ?? "";
  return token === process.env.MCP_SECRET;
}
