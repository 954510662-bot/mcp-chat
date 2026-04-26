# mcp-chat-server

A publish-ready multi-AI group chat MCP server.

## Features

- Create chat groups with multiple AI members
- Send one user message and orchestrate multi-round replies
- Read full chat transcript
- Summarize the current discussion
- Provider timeout/retry for better stability
- Optional HTTP Bearer auth
- File-based persistence (default)

## Requirements

- Node.js 18+

## Install

```bash
npm install
```

Run directly without local install:

```bash
npx -y mcp-chat-server
```

## Run

```bash
npm start
```

Use this server through an MCP client over stdio transport.

Run HTTP transport:

```bash
# PowerShell
$env:MCP_TRANSPORT="http"; $env:MCP_PORT="3000"; npm start
```

Enable HTTP auth:

```bash
# PowerShell
$env:MCP_TRANSPORT="http"; $env:MCP_AUTH_TOKEN="replace-with-strong-token"; npm start
```

Disable persistence (memory only):

```bash
# PowerShell
$env:MCP_PERSISTENCE="memory"; npm start
```

## Environment

Copy `.env.example` to `.env` and set provider keys as needed.

Current implementation includes:
- `openai` provider (OpenAI-compatible REST endpoint)
- `echo` provider (local mock provider for testing)

Persistence defaults to local file `./data/store.json`.

## MCP Tools

- `create_group`
- `send_message`
- `get_messages`
- `summarize_group`
- `list_groups`
- `delete_group`
- `cleanup_groups`
- `server_info`

## Compatibility

See `compatibility.md` for OpenClaw / Claude Code / Hermes Agent integration templates.

## Marketplace Ready

- Registry manifest template: `mcp-registry.manifest.json`
- Submission checklist: `marketplace-submission.md`
- One-command install pattern:
  - `command`: `npx`
  - `args`: `["-y", "mcp-chat-server"]`

## Retention And Cleanup

- `MCP_RETENTION_DAYS=0` means no automatic cleanup.
- Set `MCP_RETENTION_DAYS=7` (example) to delete groups older than 7 days on startup.
- `delete_group` and `cleanup_groups` require `confirm=true` as a safety guard.
- Use `cleanup_groups` to run manual cleanup (`confirm=true`, optional `maxAgeDays` input).
