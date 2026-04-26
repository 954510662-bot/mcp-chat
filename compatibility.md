# MCP Client Compatibility

This project supports two MCP transports:

- `stdio` (default)
- `http-streamable` via `/mcp`

Use `server_info` tool to probe capabilities from clients.

## 1) OpenClaw (example)

Use stdio mode for local development.

```json
{
  "mcpServers": {
    "mcp-chat": {
      "command": "node",
      "args": ["d:/ClaudeCode/mcp-chat/src/server.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "OPENAI_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

## 2) Claude Code / Cursor CLI style MCP config (example)

```json
{
  "servers": {
    "mcp-chat": {
      "command": "node",
      "args": ["d:/ClaudeCode/mcp-chat/src/server.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "OPENAI_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

## 3) Hermes Agent style (HTTP mode template)

Start server:

```bash
# PowerShell
$env:MCP_TRANSPORT="http"
$env:MCP_PORT="3000"
node d:/ClaudeCode/mcp-chat/src/server.js
```

Then point Hermes MCP endpoint to:

- URL: `http://127.0.0.1:3000/mcp`
- Transport: Streamable HTTP

## Notes

- Different clients use slightly different config schema keys (`mcpServers`, `servers`, etc.).
- Keep tool names stable for best compatibility across clients.
- For internet-facing deployment, put `/mcp` behind a gateway and auth.
