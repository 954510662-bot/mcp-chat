// ============================================
// MCP 多 Agent 协作平台 - 统一对外入口
// ============================================

// 核心平台
export { MultiAgentPlatform } from "./platform/multiAgentPlatform.js";

// Agent 系统
export {
  BaseAgent,
  AgentCapability,
  OpenClawAgent,
  ClaudeCodeAgent,
  HermesAgent,
  createAgent,
  listAvailableAgents
} from "./agents/index.js";

// 工具系统
export {
  BaseTool,
  ToolManager,
  ToolResult,
  ShellTool,
  FileTool,
  FetchTool,
  standardTools
} from "./tools/toolManager.js";

// 平台组件
export { TaskPlanner, taskPlanner } from "./platform/taskPlanner.js";
export { CollaborativeEngine } from "./platform/collaborativeEngine.js";
export { contextManager } from "./platform/contextManager.js";
export { FeedbackLoop, feedbackLoop } from "./platform/feedbackLoop.js";
export { PluginMarketplace, pluginMarketplace } from "./platform/pluginMarketplace.js";
export { messageBus } from "./connectors/index.js";

// 配置
export { default as defaultConfig } from "./config/default.js";

// ============================================
// 快速开始示例:
/*
import { MultiAgentPlatform } from "mcp-chat";

const platform = new MultiAgentPlatform();
await platform.init();

const result = await platform.execute("帮我设计一个博客系统");
console.log(result);
*/
// ============================================
