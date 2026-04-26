# Quickstart (3 Minutes)

This guide helps users connect `mcp-chat` to OpenClaw or Claude Code quickly without npm publishing.

## 1) Clone And Start Server

```bash
git clone https://github.com/954510662-bot/mcp-chat.git
cd mcp-chat
npm install
npm start
```

Default transport is `stdio`.

## 2) OpenClaw Configuration

Add MCP server config:

```json
{
  "mcpServers": {
    "mcp-chat": {
      "command": "node",
      "args": ["d:/path/to/mcp-chat/src/server.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "MCP_PERSISTENCE": "file",
        "MCP_STORE_FILE": "./data/store.json"
      }
    }
  }
}
```

## 3) Claude Code Configuration

Add MCP server config:

```json
{
  "servers": {
    "mcp-chat": {
      "command": "node",
      "args": ["d:/path/to/mcp-chat/src/server.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "MCP_PERSISTENCE": "file",
        "MCP_STORE_FILE": "./data/store.json"
      }
    }
  }
}
```

## 4) First Validation Calls

Run tools in this order:

1. `server_info`
2. `create_group`
3. `send_message`
4. `get_messages`
5. `summarize_group`

For safe deletion operations:

- `delete_group` requires `confirm=true`
- `cleanup_groups` requires `confirm=true`

## 5) Optional: Real Model Provider

If using OpenAI-compatible provider, set in `.env`:

```env
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
DEFAULT_MODEL=gpt-4o-mini
```
