import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, normalize } from "node:path";
import { log } from "../lib/logger.js";

// Only files inside these directories may be read or written.
const ALLOWED_DIRS = [
  resolve("./workspace"),
  resolve("./exports"),
];

/**
 * Resolves the given path and confirms it is inside one of the allowed directories.
 * Throws if the resolved path escapes the allowlist (path traversal protection).
 */
function safeResolve(filePath: string): string {
  const resolved = normalize(resolve(filePath));
  const allowed = ALLOWED_DIRS.some((dir) => resolved.startsWith(dir + "/") || resolved === dir);
  if (!allowed) {
    throw new Error(
      `Access denied: "${filePath}" is outside the allowed directories (${ALLOWED_DIRS.join(", ")})`
    );
  }
  return resolved;
}

export function register(server: McpServer): void {
  server.tool(
    "read_file",
    "Read a file from an allowlisted directory (./workspace or ./exports).",
    {
      file_path: z.string().describe("Path to the file to read (must be within allowed dirs)"),
    },
    async ({ file_path }) => {
      log("tool_called", { tool: "read_file", file_path });

      let resolved: string;
      try {
        resolved = safeResolve(file_path);
      } catch (err) {
        return { content: [{ type: "text", text: String(err) }], isError: true };
      }

      try {
        const contents = await readFile(resolved, "utf-8");
        return { content: [{ type: "text", text: contents }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Failed to read file: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "write_file",
    "Write content to a file in an allowlisted directory (./workspace or ./exports).",
    {
      file_path: z.string().describe("Path to the file to write (must be within allowed dirs)"),
      content: z.string().describe("Content to write to the file"),
    },
    async ({ file_path, content }) => {
      log("tool_called", { tool: "write_file", file_path });

      let resolved: string;
      try {
        resolved = safeResolve(file_path);
      } catch (err) {
        return { content: [{ type: "text", text: String(err) }], isError: true };
      }

      try {
        await writeFile(resolved, content, "utf-8");
        return { content: [{ type: "text", text: `Successfully wrote to ${resolved}` }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Failed to write file: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
