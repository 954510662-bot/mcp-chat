import { EventEmitter } from "node:events";

export class ContextWindow {
  constructor(maxLines = 1000, maxChars = 50000) {
    this.maxLines = maxLines;
    this.maxChars = maxChars;
    this.lines = [];
    this.totalChars = 0;
  }

  add(line) {
    const lineStr = typeof line === "string" ? line : JSON.stringify(line);
    const lineLength = lineStr.length;

    this.lines.push({
      content: lineStr,
      length: lineLength,
      timestamp: Date.now()
    });

    this.totalChars += lineLength;
    this.trim();
  }

  trim() {
    // 1. 先按行数裁剪
    while (this.lines.length > this.maxLines) {
      const removed = this.lines.shift();
      this.totalChars -= removed.length;
    }

    // 2. 再按字符数裁剪
    while (this.totalChars > this.maxChars && this.lines.length > 3) {
      const removed = this.lines.shift();
      this.totalChars -= removed.length;
    }
  }

  getContext() {
    return this.lines.map(l => l.content).join("\n");
  }

  getLines(count) {
    return this.lines.slice(-count).map(l => l.content);
  }

  getSummary() {
    return {
      lines: this.lines.length,
      chars: this.totalChars,
      maxLines: this.maxLines,
      maxChars: this.maxChars,
      usagePercent: Math.round((this.totalChars / this.maxChars) * 100)
    };
  }

  clear() {
    this.lines = [];
    this.totalChars = 0;
  }
}

export class SessionContext extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    // 全局共享记忆 (所有 Agent 都能访问)
    this.sharedMemory = new Map();

    // 每个 Agent 的私有上下文窗口 (不同容量)
    this.agentContexts = new Map();

    // 全局对话历史 (完整)
    this.fullHistory = [];

    // Agent 容量配置
    this.agentLimits = {
      openclaw: { maxLines: 1000, maxChars: 50000 },
      claude_code: { maxLines: 2000, maxChars: 100000 },
      hermes: { maxLines: 3000, maxChars: 150000 }
    };
  }

  // 初始化 Agent 上下文窗口
  initAgentContext(agentName) {
    const limits = this.agentLimits[agentName] || { maxLines: 1000, maxChars: 50000 };
    if (!this.agentContexts.has(agentName)) {
      this.agentContexts.set(agentName, new ContextWindow(limits.maxLines, limits.maxChars));
    }
  }

  // 添加消息到会话
  addMessage(from, to, content, type = "message") {
    const message = {
      id: Math.random().toString(36).slice(2),
      from,
      to,
      content,
      type,
      timestamp: Date.now()
    };

    this.fullHistory.push(message);
    this.updatedAt = Date.now();

    // 同步到相关 Agent 的上下文窗口
    if (to === "all") {
      // 广播消息：所有 Agent 都接收
      for (const agentName of this.agentContexts.keys()) {
        this.addToAgentContext(agentName, message);
      }
    } else {
      // 点对点消息：发送方和接收方都记录
      this.addToAgentContext(from, message);
      this.addToAgentContext(to, message);
    }

    this.emit("message", message);
    return message;
  }

  // 添加到指定 Agent 的上下文窗口 (自动裁剪)
  addToAgentContext(agentName, message) {
    this.initAgentContext(agentName);
    const context = this.agentContexts.get(agentName);

    const line = `[${new Date(message.timestamp).toISOString()}] ${message.from} → ${message.to}: ${
      typeof message.content === "string"
        ? message.content.slice(0, 500)
        : JSON.stringify(message.content).slice(0, 500)
    }`;

    context.add(line);
  }

  // 获取某个 Agent 的上下文
  getAgentContext(agentName) {
    this.initAgentContext(agentName);
    return this.agentContexts.get(agentName).getContext();
  }

  // 获取 Agent 的上下文状态
  getAgentContextStatus(agentName) {
    this.initAgentContext(agentName);
    return {
      agent: agentName,
      ...this.agentContexts.get(agentName).getSummary()
    };
  }

  // 获取所有 Agent 的上下文状态
  getAllContextStatus() {
    const status = [];
    for (const agentName of this.agentContexts.keys()) {
      status.push(this.getAgentContextStatus(agentName));
    }
    return status;
  }

  // 共享记忆操作
  setSharedMemory(key, value, sourceAgent = null) {
    this.sharedMemory.set(key, {
      value,
      setBy: sourceAgent,
      setAt: Date.now(),
      accessCount: 0
    });
    this.updatedAt = Date.now();
  }

  getSharedMemory(key) {
    const entry = this.sharedMemory.get(key);
    if (entry) {
      entry.accessCount++;
      return entry.value;
    }
    return null;
  }

  getSharedMemoryKeys() {
    return Array.from(this.sharedMemory.keys());
  }

  // 获取会话摘要
  getSummary() {
    return {
      sessionId: this.sessionId,
      age: Date.now() - this.createdAt,
      totalMessages: this.fullHistory.length,
      sharedMemoryKeys: this.getSharedMemoryKeys(),
      agentContexts: this.getAllContextStatus()
    };
  }

  // 清理旧会话
  cleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
    const age = Date.now() - this.createdAt;
    if (age > maxAgeMs) {
      this.emit("expired");
      return true;
    }
    return false;
  }
}

export class ContextManager {
  constructor() {
    this.sessions = new Map();
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      const session = new SessionContext(sessionId);
      this.sessions.set(sessionId, session);
      return session;
    }
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  cleanupExpiredSessions(maxAgeMs) {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.cleanup(maxAgeMs)) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}

export const contextManager = new ContextManager();
