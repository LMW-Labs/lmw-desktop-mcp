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

// Instantiate MCP server
const mcpServer = new McpServer({ name: "lmw-desktop", version });
registerAllTools(mcpServer);

// HTTP server — stateless: a fresh transport is created per request
const httpServer = http.createServer(async (req, res) => {
  // Auth check
  if (!isAuthorized(req)) {
    log("auth_failed", { method: req.method, url: req.url });
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  log("request", { method: req.method, url: req.url });

  try {
    const body = await readBody(req);

    // Stateless transport — no session management
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
