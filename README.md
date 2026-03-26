# lmw-desktop-mcp

A remote MCP server that runs on your home desktop and lets Claude.ai (on any device, including mobile) interact with local workflows, files, and system info via HTTPS.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your secret
cp .env.example .env
# Edit .env — set MCP_SECRET to a long random string (e.g. openssl rand -hex 32)
```

## Running

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

## Exposing via Cloudflare Tunnel

In a separate terminal:

```bash
cloudflared tunnel --url http://localhost:3456
```

Cloudflare will print a public HTTPS URL like `https://xyz.trycloudflare.com`. Use that URL in Claude.ai.

## Connecting in Claude.ai

1. Go to **Settings → Integrations → Add MCP Server**
2. **URL**: the `https://xyz.trycloudflare.com` URL from cloudflared
3. **Header**: `Authorization: Bearer <your MCP_SECRET>`

## Available Tools

| Tool | Description |
|------|-------------|
| `run_workflow` | Dispatch a named workflow (`status`, `ping`) with optional args |
| `read_file` | Read a file from `./workspace` or `./exports` |
| `write_file` | Write a file to `./workspace` or `./exports` |
| `system_status` | Node version, platform, uptime, memory usage |

## Adding New Tools

1. Create `src/tools/my_tool.ts` — export a `register(server: McpServer): void` function
2. Import and call it in `src/tools/index.ts`

See existing tool files for the pattern.

## Security Notes

- **Never commit `.env`** — it contains your secret token
- **Rotate `MCP_SECRET`** immediately if it's ever exposed
- The server refuses to start if `MCP_SECRET` is not set
- File tools are restricted to `./workspace` and `./exports` with path traversal protection
- All tool invocations are logged with timestamps (but never log the secret)
