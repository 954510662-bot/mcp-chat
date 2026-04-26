import { EventEmitter } from "node:events";

export class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.messageHistory = [];
    this.maxHistory = 1000;
  }

  registerAgent(agentName, agent) {
    this.agents.set(agentName, agent);
    agent.setPlatform(this);
    agent.connect();
    console.log(`[MessageBus] Agent "${agentName}" 已注册`);
  }

  unregisterAgent(agentName) {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.disconnect();
      this.agents.delete(agentName);
      console.log(`[MessageBus] Agent "${agentName}" 已注销`);
    }
  }

  routeMessage(message) {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }

    this.emit("message", message);

    console.log(
      `[MessageBus] ${message.from} → ${message.to}:`,
      typeof message.content === "string"
        ? message.content.slice(0, 50)
        : message.content.type || message.content.question?.slice(0, 50)
    );

    if (message.to === "platform") {
      this.emit("message:to_platform", message);
      return;
    }

    if (message.to === "user") {
      this.emit("message:to_user", message);
      return;
    }

    if (message.to === "all") {
      this.emit("message:broadcast", message);
      for (const [name, agent] of this.agents.entries()) {
        if (name !== message.from) {
          try {
            agent.receiveMessage(message);
          } catch (e) {
            console.error(`[MessageBus] 发送给 ${name} 失败:`, e.message);
          }
        }
      }
      return;
    }

    const targetAgent = this.agents.get(message.to);
    if (targetAgent) {
      try {
        targetAgent.receiveMessage(message);
      } catch (e) {
        console.error(`[MessageBus] 发送给 ${message.to} 失败:`, e.message);
      }
    } else {
      console.warn(`[MessageBus] 目标 Agent "${message.to}" 不存在`);
    }
  }

  broadcast(from, content) {
    const message = {
      id: Math.random().toString(36).slice(2),
      from,
      to: "all",
      type: "broadcast",
      content,
      timestamp: new Date().toISOString()
    };
    this.routeMessage(message);
    return message;
  }

  sendToAgent(from, to, content) {
    const message = {
      id: Math.random().toString(36).slice(2),
      from,
      to,
      type: "platform_to_agent",
      content,
      timestamp: new Date().toISOString()
    };
    this.routeMessage(message);
    return message;
  }

  sendToUser(from, content) {
    const message = {
      id: Math.random().toString(36).slice(2),
      from,
      to: "user",
      type: "to_user",
      content,
      timestamp: new Date().toISOString()
    };
    this.routeMessage(message);
    return message;
  }

  getAgentStatus() {
    const status = [];
    for (const [name, agent] of this.agents.entries()) {
      status.push({
        name,
        online: agent.online,
        endpoint: agent.endpoint || "本地"
      });
    }
    return status;
  }

  getConversation(conversationId) {
    return this.messageHistory.filter((m) => m.conversationId === conversationId);
  }

  getMessagesForAgent(agentName) {
    return this.messageHistory.filter(
      (m) => m.from === agentName || m.to === agentName || m.to === "all"
    );
  }
}

export const messageBus = new MessageBus();
