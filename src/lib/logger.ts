/**
 * Writes a timestamped JSON log line to stdout.
 * Never include MCP_SECRET in event or detail.
 */
export function log(event: string, detail?: object): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...detail,
  };
  console.log(JSON.stringify(entry));
}
