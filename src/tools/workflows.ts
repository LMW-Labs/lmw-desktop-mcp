import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../lib/logger.js";

export function register(server: McpServer): void {
  server.tool(
    "run_workflow",
    "Dispatch a named workflow on the desktop. Built-in workflows: 'status', 'ping'.",
    {
      workflow_name: z.string().describe("Name of the workflow to run"),
      args: z.record(z.string()).optional().describe("Optional key/value arguments"),
    },
    async ({ workflow_name, args }) => {
      log("tool_called", { tool: "run_workflow", workflow_name, args: args ?? {} });

      switch (workflow_name) {
        case "status": {
          const result = {
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
          };
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        case "ping": {
          const result = { pong: true, args: args ?? {} };
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown workflow: "${workflow_name}"` }],
            isError: true,
          };
      }
    }
  );
}
