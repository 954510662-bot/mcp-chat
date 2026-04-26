# Marketplace Submission Checklist

Use this checklist when submitting to MCP directory websites (domestic or international).

## 1) Package Publishing

- Publish package to npm:
  - `npm login`
  - `npm publish`
- Verify binary works:
  - `npx -y mcp-chat-server`

## 2) Required Metadata

- Project name: `mcp-chat-server`
- Description: Multi-AI group chat orchestration MCP server
- License: MIT
- Repository URL: update in `package.json` and `mcp-registry.manifest.json`
- Homepage URL: update in `package.json` and `mcp-registry.manifest.json`

## 3) Install Snippet (recommended)

```json
{
  "command": "npx",
  "args": ["-y", "mcp-chat-server"],
  "env": {
    "MCP_TRANSPORT": "stdio",
    "MCP_PERSISTENCE": "file",
    "MCP_STORE_FILE": "./data/store.json"
  }
}
```

## 4) Validation Before Submission

- `server_info` works
- `create_group` -> `send_message` -> `get_messages` -> `summarize_group` works
- `delete_group` and `cleanup_groups` confirm guard works (`confirm=true`)

## 5) Notes For Directory Review

- Supports both `stdio` and `streamable http`.
- Supports optional HTTP bearer auth (`MCP_AUTH_TOKEN`).
- Uses local file persistence by default.
