import { EventEmitter } from "node:events";
import defaultConfig from "../config/default.js";
import { createAgent, listAvailableAgents } from "../agents/index.js";
import { taskPlanner } from "./taskPlanner.js";
import { contextManager } from "./contextManager.js";
import { feedbackLoop } from "./feedbackLoop.js";
import { pluginMarketplace } from "./pluginMarketplace.js";
import { messageBus } from "./messageBus.js";

export class MultiAgentPlatform extends EventEmitter {
  constructor(customConfig = {}) {
    super();
    this.config = { ...defaultConfig, ...customConfig };
    this.agents = new Map();
    this.tasks = new Map();
    this.initialized = false;
  }

  // ========== 初始化 ==========
  async init() {
    if (this.initialized) return;

    console.log("[Platform] 初始化多 Agent 协作平台...");

    // 1. 初始化插件市场
    if (this.config.platform.enablePlugins) {
      await pluginMarketplace.init();
      console.log(`[Platform] 插件市场已加载: ${pluginMarketplace.listAvailable().length} 个可用插件`);
    }

    // 2. 注册所有启用的 Agent
    for (const agentInfo of listAvailableAgents()) {
      const agentConfig = this.config.agents[agentInfo.id];
      if (agentConfig?.enabled !== false) {
        const agent = createAgent(agentInfo.id, agentConfig);
        this.agents.set(agentInfo.id, agent);
        messageBus.registerAgent(agentInfo.id, agent);
        console.log(`[Platform] Agent 已注册: ${agentInfo.emoji} ${agentInfo.name}`);
      }
    }

    // 3. 转发事件
    this._forwardEvents();

    this.initialized = true;
    console.log(`[Platform] 初始化完成！已加载 ${this.agents.size} 个 Agent`);
    this.emit("platform_ready", { agentCount: this.agents.size });
  }

  // ========== 核心执行入口 ==========
  async execute(prompt, options = {}) {
    if (!this.initialized) {
      throw new Error("Platform not initialized. Call init() first.");
    }

    const taskId = options.taskId || Math.random().toString(36).slice(2);
    const groupId = options.groupId || "default";

    const task = {
      id: taskId,
      instruction: prompt,
      groupId,
      status: "running",
      createdAt: Date.now(),
      ...options
    };

    this.tasks.set(taskId, task);
    this.emit("task_start", { taskId, prompt });

    try {
      // 1. 任务规划
      const plan = await taskPlanner.plan(prompt, groupId);
      this.emit("plan_ready", { taskId, plan });

      // 2. 初始化会话上下文
      const session = contextManager.getSession(groupId);
      plan.targetAgents.forEach(a => session.initAgentContext(a));

      // 3. 按计划执行
      const results = [];
      for (const step of plan.steps) {
        const agent = this.agents.get(step.agent);
        if (!agent) continue;

        this.emit("step_start", { taskId, step, agent: step.agent });

        try {
          const result = await agent.execute({
            id: taskId,
            instruction: step.description,
            groupId
          });

          results.push({
            step: step.id,
            agent: step.agent,
            result
          });

          this.emit("step_complete", { taskId, step, result });
        } catch (error) {
          this.emit("step_error", { taskId, step, error: error.message });
          results.push({
            step: step.id,
            agent: step.agent,
            error: error.message
          });
        }
      }

      task.status = "completed";
      task.completedAt = Date.now();
      this.emit("task_complete", { taskId, results });

      return {
        taskId,
        status: "success",
        results,
        duration: task.completedAt - task.createdAt
      };

    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      this.emit("task_error", { taskId, error: error.message });
      throw error;
    }
  }

  // ========== Agent 管理 ==========
  listAgents() {
    return Array.from(this.agents.values()).map(agent => agent.getStatus());
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  enableAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.enabled = true;
      return true;
    }
    return false;
  }

  disableAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.enabled = false;
      return true;
    }
    return false;
  }

  // ========== 插件管理 ==========
  listPlugins() {
    return pluginMarketplace.listAvailable();
  }

  async installPlugin(pluginId) {
    return pluginMarketplace.install(pluginId);
  }

  async uninstallPlugin(pluginId) {
    return pluginMarketplace.uninstall(pluginId);
  }

  enablePlugin(pluginId) {
    return pluginMarketplace.togglePlugin(pluginId, true);
  }

  disablePlugin(pluginId) {
    return pluginMarketplace.togglePlugin(pluginId, false);
  }

  searchPlugins(query) {
    return pluginMarketplace.search(query);
  }

  // ========== 任务管理 ==========
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  listTasks(status = null) {
    let tasks = Array.from(this.tasks.values());
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    return tasks;
  }

  stop(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = "cancelled";
      this.emit("task_cancelled", { taskId });
      return true;
    }
    return false;
  }

  // ========== 用户反馈 ==========
  getPendingQuestions() {
    return feedbackLoop.getPendingQuestions();
  }

  answerQuestion(questionId, answer) {
    return feedbackLoop.answer(questionId, answer);
  }

  // ========== 内部方法 ==========
  _forwardEvents() {
    // 转发所有内部事件
    feedbackLoop.on("question_pending", (q) => {
      this.emit("user_feedback_required", { question: q });
    });

    messageBus.on("agent_message", (msg) => {
      this.emit("agent_message", msg);
    });
  }

  // ========== 清理 ==========
  async destroy() {
    feedbackLoop.close();
    this.initialized = false;
    this.emit("platform_shutdown");
  }
}
