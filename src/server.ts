import "dotenv/config";
import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isAuthorized } from "./lib/auth.js";
import { readBody } from "./lib/body.js";
import { log } from "./lib/logger.js";
import { registerAllTools } from "./tools/index.js";
import { createRequire } from "node:module";

// Read version from package.json
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const PORT = parseInt(process.env.PORT ?? "3456", 10);

// OAuth paths that the SDK v1.28+ auto-exposes — we block them all so
// Claude.ai's connector UI never attempts an OAuth flow against this server.
const OAUTH_PATH_PREFIXES = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/oauth/",
  "/authorize",
  "/token",
];

function isOAuthPath(url: string): boolean {
  const path = url.split("?")[0];
  return OAUTH_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

// HTTP server — stateless: a fresh McpServer + transport is created per request
const httpServer = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  // ── 1. Block OAuth discovery endpoints (must be first, no auth needed) ──
  if (isOAuthPath(url)) {
    log("oauth_blocked", { method: req.method, url });
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  // ── 2. Unauthenticated utility routes ──
  if (req.method === "GET" && url.split("?")[0] === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", name: "lmw-desktop", version }));
    return;
  }

  if (req.method === "GET" && url.split("?")[0] === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ name: "lmw-desktop", version, auth: "bearer" }));
    return;
  }

  // ── 3. Auth gate: POST requests (tool calls) require Bearer token ──
  // GET requests are MCP handshake/discovery probes from claude.ai — let them
  // through so the connector can be created successfully.
  if (req.method === "POST" && !isAuthorized(req)) {
    log("auth_failed", { method: req.method, url });
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  log("request", { method: req.method, url });

  try {
    const rawBody = await readBody(req);
    // Transport expects parsed JSON, not a raw Buffer
    const body = rawBody.length > 0 ? JSON.parse(rawBody.toString()) : undefined;

    // Fresh server + transport per request (required for stateless mode —
    // reusing a single McpServer across requests causes connect() to fail
    // on the second request since the server is already bound to a transport)
    const mcpServer = new McpServer({ name: "lmw-desktop", version });
    registerAllTools(mcpServer);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Clean up transport when the response closes
    res.on("close", () => transport.close());

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    log("request_error", { error: String(err) });
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

httpServer.listen(PORT, () => {
  log("server_started", { port: PORT, version, name: "lmw-desktop" });
  console.log(`lmw-desktop MCP server listening on http://localhost:${PORT}`);
});