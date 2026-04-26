import { EventEmitter } from "node:events";
import { ToolManager } from "../tools/toolManager.js";
import { feedbackLoop } from "../platform/feedbackLoop.js";

export class AgentCapability {
  static CODE_EXECUTION = "code_execution";
  static FILE_SYSTEM = "file_system";
  static WEB_BROWSE = "web_browse";
  static DATABASE = "database";
  static GIT = "git";
  static SHELL = "shell";
  static DEPLOY = "deploy";
}

export class BaseAgent extends EventEmitter {
  constructor(config) {
    super();

    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || this.id;
    this.emoji = config.emoji || "🤖";
    this.title = config.title || "AI Agent";
    this.specialty = config.specialty || [];
    this.personality = config.personality || "";
    this.strengths = config.strengths || [];
    this.weaknesses = config.weaknesses || [];

    // 上下文配置
    this.maxContextLines = config.maxContextLines || 1000;
    this.maxContextChars = config.maxContextChars || 50000;
    this.contextLines = [];

    // 工具管理器
    this.tools = new ToolManager();

    // 状态
    this.isBusy = false;
    this.currentTask = null;
    this.createdAt = Date.now();
    this.totalTasksCompleted = 0;
  }

  // ========== 核心执行方法 ==========
  async execute(task) {
    this.isBusy = true;
    this.currentTask = task;
    this.emit("task_start", task);

    try {
      const result = await this._execute(task);

      this.totalTasksCompleted++;
      this.emit("task_complete", { task, result });

      return {
        status: "success",
        agent: this.id,
        ...result
      };
    } catch (error) {
      this.emit("task_error", { task, error: error.message });
      return {
        status: "failed",
        agent: this.id,
        error: error.message,
        message: error.message
      };
    } finally {
      this.isBusy = false;
      this.currentTask = null;
    }
  }

  // 子类实现具体逻辑
  async _execute(task) {
    throw new Error("_execute must be implemented by subclass");
  }

  // ========== 用户反馈 ==========
  async askUser(question, options = null) {
    this.emit("ask_user", { question, options });
    return feedbackLoop.ask(this.id, question, options);
  }

  // ========== 工具调用 ==========
  registerTool(tool) {
    this.tools.register(tool);
  }

  async useTool(toolName, params) {
    return this.tools.execute(toolName, params);
  }

  getAvailableTools() {
    return this.tools.listTools();
  }

  // ========== 上下文管理 ==========
  addToContext(message) {
    this.contextLines.push({
      content: message,
      timestamp: Date.now()
    });
    this.trimContext();
  }

  trimContext() {
    // 先按行数裁剪
    while (this.contextLines.length > this.maxContextLines) {
      this.contextLines.shift();
    }

    // 再按字符数裁剪
    let totalChars = this.contextLines.reduce((sum, l) => sum + l.content.length, 0);
    while (totalChars > this.maxContextChars && this.contextLines.length > 3) {
      const removed = this.contextLines.shift();
      totalChars -= removed.content.length;
    }
  }

  getContext() {
    return this.contextLines.map(l => l.content).join("\n");
  }

  clearContext() {
    this.contextLines = [];
  }

  // ========== Agent 间通信 ==========
  sendMessage(toAgentId, message) {
    this.emit("message_out", {
      from: this.id,
      to: toAgentId,
      content: message,
      timestamp: Date.now()
    });
  }

  receiveMessage(fromAgentId, message) {
    this.emit("message_in", {
      from: fromAgentId,
      to: this.id,
      content: message,
      timestamp: Date.now()
    });
    this.addToContext(`[From ${fromAgentId}] ${message}`);
  }

  // ========== 状态查询 ==========
  getStatus() {
    const contextChars = this.contextLines.reduce((sum, l) => sum + l.content.length, 0);
    return {
      id: this.id,
      name: this.name,
      title: this.title,
      emoji: this.emoji,
      isBusy: this.isBusy,
      currentTask: this.currentTask?.slice(0, 50),
      context: {
        lines: this.contextLines.length,
        chars: contextChars,
        maxLines: this.maxContextLines,
        maxChars: this.maxContextChars,
        usagePercent: Math.round((contextChars / this.maxContextChars) * 100)
      },
      tools: this.getAvailableTools(),
      stats: {
        totalTasksCompleted: this.totalTasksCompleted,
        uptime: Date.now() - this.createdAt
      }
    };
  }

  getIntro() {
    return `${this.emoji} ${this.name} - ${this.title}
擅长: ${this.specialty.join("、")}
性格: ${this.personality}
可用工具: ${this.getAvailableTools().join(", ") || "无"}`;
  }

  // ========== Connector 兼容层 ==========
  setPlatform(platform) {
    this.platform = platform;
  }

  async executeTaskWithTimeout(ctx) {
    return this.execute(ctx.task);
  }

  sendToPlatform(content) {
    if (!this.platform) {
      throw new Error("Not connected to platform");
    }
    this.platform.routeMessage({
      id: Math.random().toString(36).slice(2),
      from: this.id,
      to: "platform",
      type: "agent_to_platform",
      content,
      timestamp: new Date().toISOString()
    });
  }

  sendToAgent(targetAgent, content) {
    if (!this.platform) {
      throw new Error("Not connected to platform");
    }
    this.platform.routeMessage({
      id: Math.random().toString(36).slice(2),
      from: this.id,
      to: targetAgent,
      type: "agent_to_agent",
      content,
      timestamp: new Date().toISOString()
    });
  }

  askAgent(targetAgent, question) {
    return this.sendToAgent(targetAgent, {
      type: "question",
      question
    });
  }

  sendToUser(content) {
    if (!this.platform) {
      throw new Error("Not connected to platform");
    }
    this.platform.routeMessage({
      id: Math.random().toString(36).slice(2),
      from: this.id,
      to: "user",
      type: "agent_to_user",
      content,
      timestamp: new Date().toISOString()
    });
  }

  connect() {
    this.online = true;
    this.emit("connected");
  }

  disconnect() {
    this.online = false;
    this.emit("disconnected");
  }

  getMemory(group) {
    if (!group.sharedMemory) {
      group.sharedMemory = new Map();
    }
    return group.sharedMemory;
  }

  setMemory(group, key, value) {
    const memory = this.getMemory(group);
    memory.set(key, value);
    return { key, value, setBy: this.id, at: new Date().toISOString() };
  }

  appendMemory(group, key, item) {
    const memory = this.getMemory(group);
    const existing = memory.get(key) ?? [];
    if (!Array.isArray(existing)) {
      throw new Error(`Memory key ${key} is not an array, cannot append`);
    }
    existing.push({ item, addedBy: this.id, at: new Date().toISOString() });
    memory.set(key, existing);
    return { key, length: existing.length };
  }
}
