import { BaseAgent, AgentCapability } from "./baseAgent.js";
import { OpenClawAgent } from "./openclawAgent.js";
import { ClaudeCodeAgent } from "./claudeCodeAgent.js";
import { HermesAgent } from "./hermesAgent.js";

export {
  BaseAgent,
  AgentCapability,
  OpenClawAgent,
  ClaudeCodeAgent,
  HermesAgent
};

export const createAgent = (type, options = {}) => {
  switch (type) {
    case "openclaw":
      return new OpenClawAgent(options);
    case "claude_code":
      return new ClaudeCodeAgent(options);
    case "hermes":
      return new HermesAgent(options);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
};

export const listAvailableAgents = () => [
  {
    id: "openclaw",
    name: "OpenClaw",
    title: "架构师 & 后端专家",
    emoji: "🦅",
    tools: ["shell", "file", "fetch"]
  },
  {
    id: "claude_code",
    name: "Claude Code",
    title: "全栈代码专家",
    emoji: "⚡",
    tools: ["shell", "file", "fetch"]
  },
  {
    id: "hermes",
    name: "Hermes",
    title: "云服务器 & 部署专家",
    emoji: "🚀",
    tools: ["shell", "fetch"]
  }
];
