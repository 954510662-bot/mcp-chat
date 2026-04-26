import { withTimeout } from "../utils/timeout.js";
import { EventEmitter } from "node:events";

export class AgentMessage {
  constructor({ from, to, type, content, conversationId, timestamp }) {
    this.id = Math.random().toString(36).slice(2);
    this.from = from;
    this.to = to;
    this.type = type;
    this.content = content;
    this.conversationId = conversationId;
    this.timestamp = timestamp || new Date().toISOString();
  }
}

export class BaseConnector extends EventEmitter {
  constructor(name, timeoutMs = 30000) {
    super();
    this.name = name;
    this.timeoutMs = timeoutMs;
    this.platform = null;
    this.online = false;
  }

  setPlatform(platform) {
    this.platform = platform;
  }

  async executeTask(ctx) {
    throw new Error(`${this.name} connector must implement executeTask`);
  }

  async executeTaskWithTimeout(ctx) {
    return withTimeout(
      this.executeTask(ctx),
      this.timeoutMs,
      `${this.name} connector timed out after ${this.timeoutMs}ms`
    );
  }

  async receiveMessage(message) {
    console.log(`[${this.name}] 收到消息:`, message.content);
    return { status: "received" };
  }

  sendToPlatform(content) {
    if (!this.platform) {
      throw new Error("Not connected to platform");
    }
    const message = new AgentMessage({
      from: this.name,
      to: "platform",
      type: "agent_to_platform",
      content
    });
    this.platform.routeMessage(message);
    return message;
  }

  sendToAgent(targetAgent, content) {
    if (!this.platform) {
      throw new Error("Not connected to platform");
    }
    const message = new AgentMessage({
      from: this.name,
      to: targetAgent,
      type: "agent_to_agent",
      content
    });
    this.platform.routeMessage(message);
    return message;
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
    const message = new AgentMessage({
      from: this.name,
      to: "user",
      type: "agent_to_user",
      content
    });
    this.platform.routeMessage(message);
    return message;
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
    return { key, value, setBy: this.name, at: new Date().toISOString() };
  }

  appendMemory(group, key, item) {
    const memory = this.getMemory(group);
    const existing = memory.get(key) ?? [];
    if (!Array.isArray(existing)) {
      throw new Error(`Memory key ${key} is not an array, cannot append`);
    }
    existing.push({ item, addedBy: this.name, at: new Date().toISOString() });
    memory.set(key, existing);
    return { key, length: existing.length };
  }
}
