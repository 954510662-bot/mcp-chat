import { OpenClawAgent } from "../agents/openclawAgent.js";
import { ClaudeCodeAgent } from "../agents/claudeCodeAgent.js";
import { HermesAgent } from "../agents/hermesAgent.js";
import { messageBus } from "../platform/messageBus.js";

export function createConnectorRegistry() {
  const connectors = new Map();

  const openclaw = new OpenClawAgent({ endpoint: process.env.OPENCLAW_ENDPOINT });
  const claudeCode = new ClaudeCodeAgent({ cwd: process.env.CLAUDE_CODE_CWD });
  const hermes = new HermesAgent({ endpoint: process.env.HERMES_ENDPOINT });

  messageBus.registerAgent("openclaw", openclaw);
  messageBus.registerAgent("claude_code", claudeCode);
  messageBus.registerAgent("hermes", hermes);

  connectors.set("openclaw", openclaw);
  connectors.set("claude_code", claudeCode);
  connectors.set("hermes", hermes);

  return connectors;
}

export { messageBus };

