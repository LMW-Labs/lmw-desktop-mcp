import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register as registerWorkflows } from "./workflows.js";
import { register as registerFiles } from "./files.js";
import { register as registerSystem } from "./system.js";

export function registerAllTools(server: McpServer): void {
  registerWorkflows(server);
  registerFiles(server);
  registerSystem(server);
}
