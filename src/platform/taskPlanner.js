import { AGENT_ROLES, routeTask, getAgentIntro } from "./agentRoles.js";
import { contextManager } from "./contextManager.js";

export class TaskPlan {
  constructor(instruction, groupId) {
    this.id = Math.random().toString(36).slice(2);
    this.instruction = instruction;
    this.groupId = groupId;
    this.createdAt = Date.now();
    this.status = "planning"; // planning, ready, running, completed
    this.steps = [];
    this.targetAgents = [];
    this.estimatedTime = 0;
    this.summary = "";
  }

  addStep(agentName, description, dependsOn = []) {
    this.steps.push({
      id: `step_${this.steps.length + 1}`,
      agent: agentName,
      description,
      status: "pending",
      dependsOn,
      result: null,
      startedAt: null,
      completedAt: null
    });
  }
}

export class TaskPlanner {
  constructor() {
    this.plans = new Map();
  }

  // 分析用户需求，生成执行计划
  async plan(instruction, groupId) {
    const plan = new TaskPlan(instruction, groupId);

    // 1. 关键词分析，确定需要哪些 Agent
    plan.targetAgents = routeTask(instruction);

    // 2. 生成任务摘要
    plan.summary = this.generateSummary(instruction, plan.targetAgents);

    // 3. 生成执行步骤
    this.generateSteps(plan, instruction);

    plan.status = "ready";
    this.plans.set(plan.id, plan);

    return plan;
  }

  generateSummary(instruction, targets) {
    const agentNames = targets.map(t => AGENT_ROLES[t]?.name || t).join(" + ");
    return `任务: ${instruction.slice(0, 50)}${instruction.length > 50 ? "..." : ""}\n参与: ${agentNames}`;
  }

  generateSteps(plan, instruction) {
    const lower = instruction.toLowerCase();

    // ============== 部署类任务 ==============
    if (lower.includes("部署") || lower.includes("服务器") || lower.includes("安装")) {
      plan.addStep("openclaw", "分析需求，设计部署架构");
      plan.addStep("claude_code", "准备部署脚本和配置文件", ["step_1"]);
      plan.addStep("hermes", "在云服务器上执行部署", ["step_2"]);
      plan.estimatedTime = 180;
      return;
    }

    // ============== 网页/应用类任务 ==============
    if (lower.includes("网页") || lower.includes("网站") || lower.includes("应用") || lower.includes("写个")) {
      plan.addStep("openclaw", "设计整体架构和后端 API", []);
      plan.addStep("claude_code", "实现前端界面和后端代码", ["step_1"]);
      plan.addStep("hermes", "部署到云服务器并启动服务", ["step_2"]);
      plan.estimatedTime = 300;
      return;
    }

    // ============== 代码类任务 ==============
    if (lower.includes("代码") || lower.includes("重构") || lower.includes("bug") || lower.includes("修复")) {
      plan.addStep("openclaw", "分析问题，确定修改方案", []);
      plan.addStep("claude_code", "编写/修改代码", ["step_1"]);
      plan.addStep("hermes", "测试运行，验证结果", ["step_2"]);
      plan.estimatedTime = 120;
      return;
    }

    // ============== 默认：所有 Agent 并行执行 ==============
    for (const agent of plan.targetAgents) {
      plan.addStep(agent, `由 ${AGENT_ROLES[agent]?.title || agent} 处理`);
    }
    plan.estimatedTime = 60 * plan.targetAgents.length;
  }

  // 格式化计划给用户看
  formatPlan(plan) {
    const lines = ["📋 任务执行计划", "=".repeat(40), ""];

    lines.push(`📝 任务: ${plan.instruction}`);
    lines.push(`👥 参与 Agent: ${plan.targetAgents.map(a => AGENT_ROLES[a]?.emoji || "").join(" ")}`);
    lines.push(`⏱️  预计耗时: ~${Math.ceil(plan.estimatedTime / 60)} 分钟`);
    lines.push("");
    lines.push("━━━ 执行步骤 ━━━");

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const role = AGENT_ROLES[step.agent];
      const statusIcon = step.status === "completed" ? "✅" : step.status === "running" ? "⏳" : "📌";
      const dep = step.dependsOn.length > 0 ? ` (依赖: ${step.dependsOn.join(", ")})` : "";

      lines.push(`${statusIcon} ${i + 1}. ${role?.emoji || ""} ${role?.name || step.agent}: ${step.description}${dep}`);
    }

    lines.push("");
    lines.push("💡 提示: 每个 Agent 会根据自己的角色处理相应任务");

    return lines.join("\n");
  }

  getPlan(planId) {
    return this.plans.get(planId);
  }

  getAllPlans() {
    return Array.from(this.plans.values());
  }
}

export const taskPlanner = new TaskPlanner();
