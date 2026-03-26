import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { log } from "../lib/logger.js";

export function register(server: McpServer): void {
  server.tool(
    "system_status",
    "Returns Node version, platform, uptime, and memory usage for the desktop server.",
    {},
    async () => {
      log("tool_called", { tool: "system_status" });

      const mem = process.memoryUsage();
      const result = {
        node_version: process.version,
        platform: process.platform,
        uptime_seconds: Math.floor(process.uptime()),
        memory: {
          used_mb: Math.round(mem.rss / 1024 / 1024),
          heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
        },
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
