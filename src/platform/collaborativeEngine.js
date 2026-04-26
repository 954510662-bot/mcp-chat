import { EventEmitter } from "node:events";
import { AGENT_ROLES, getAgentIntro } from "./agentRoles.js";
import { taskPlanner } from "./taskPlanner.js";
import { contextManager } from "./contextManager.js";

export class CollaborativeEngine extends EventEmitter {
  constructor({ store, connectors }) {
    super();
    this.store = store;
    this.connectors = connectors;
    this.runningTasks = new Map();
  }

  async executeTask(instruction, groupId) {
    // 1. 任务规划
    this.emit("planning", { instruction, groupId });
    const plan = await taskPlanner.plan(instruction, groupId);

    this.emit("plan_ready", { plan, planText: taskPlanner.formatPlan(plan) });

    // 2. 获取或创建会话上下文
    const session = contextManager.getSession(groupId);
    plan.targetAgents.forEach(a => session.initAgentContext(a));

    // 3. 开始执行
    plan.status = "running";
    this.runningTasks.set(plan.id, plan);

    this.emit("execution_start", { planId: plan.id, stepCount: plan.steps.length });

    // 4. 按依赖顺序执行
    for (const step of plan.steps) {
      // 等待依赖完成
      for (const depId of step.dependsOn) {
        const depStep = plan.steps.find(s => s.id === depId);
        while (depStep && depStep.status !== "completed") {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // 执行当前步骤
      step.status = "running";
      step.startedAt = Date.now();
      this.emit("step_start", { planId: plan.id, step });

      const agent = this.connectors.get(step.agent);
      if (!agent) {
        step.result = { error: `Agent ${step.agent} not found` };
        step.status = "failed";
        step.completedAt = Date.now();
        continue;
      }

      try {
        // 获取该 Agent 的上下文
        const context = session.getAgentContext(step.agent);

        // 记录到会话
        session.addMessage("platform", step.agent, `请处理: ${step.description}`);

        // 执行
        const result = await agent.executeTaskWithTimeout({
          task: { id: plan.id, instruction: step.description },
          group: this.store.getGroup(groupId),
          canCollaborate: true,
          context
        });

        step.result = result;
        step.status = "success";
        step.completedAt = Date.now();

        // 记录返回结果
        session.addMessage(step.agent, "platform", result.message?.slice(0, 500) || "");

        this.emit("step_complete", { planId: plan.id, step, result });
      } catch (error) {
        step.result = { error: error.message };
        step.status = "failed";
        step.completedAt = Date.now();
        this.emit("step_error", { planId: plan.id, step, error: error.message });
      }
    }

    // 5. 完成，汇总结果
    plan.status = "completed";
    this.runningTasks.delete(plan.id);

    const summary = this.summarizeResults(plan);
    this.emit("task_complete", { planId: plan.id, plan, summary });

    return { plan, summary };
  }

  // Agent 之间对话
  async agentTalk(fromAgent, toAgent, message) {
    const session = contextManager.getSession(fromAgent + "_" + toAgent);
    session.addMessage(fromAgent, toAgent, message);

    this.emit("agent_talk", { from: fromAgent, to: toAgent, message });

    // 如果目标 Agent 存在，转发给它
    const target = this.connectors.get(toAgent);
    if (target && target.receiveMessage) {
      await target.receiveMessage({
        from: fromAgent,
        to: toAgent,
        type: "agent_to_agent",
        content: { type: "message", text: message }
      });
    }
  }

  // 汇总所有结果
  summarizeResults(plan) {
    const lines = [];

    lines.push("=".repeat(50));
    lines.push("✅ 任务完成报告");
    lines.push("=".repeat(50));
    lines.push("");
    lines.push(`📝 原始指令: ${plan.instruction}`);
    lines.push(`⏱️  耗时: ${((Date.now() - plan.createdAt) / 1000).toFixed(1)} 秒`);
    lines.push("");

    lines.push("━━━ 各 Agent 执行结果 ━━━");
    lines.push("");

    for (const step of plan.steps) {
      const role = AGENT_ROLES[step.agent];
      const icon = step.status === "success" ? "✅" : "❌";

      lines.push(`${icon} ${role?.emoji || ""} ${role?.name || step.agent}`);
      lines.push(`   任务: ${step.description}`);

      if (step.result) {
        if (step.result.message) {
          lines.push("   输出:");
          const msgLines = step.result.message.split("\n").slice(0, 10);
          for (const line of msgLines) {
            lines.push(`     ${line}`);
          }
          if (step.result.message.split("\n").length > 10) {
            lines.push("     ... (更多内容已省略)");
          }
        }
        if (step.result.error) {
          lines.push(`   ❌ 错误: ${step.result.error}`);
        }
      }
      lines.push("");
    }

    lines.push("=".repeat(50));
    lines.push("💡 提示: 你可以继续提问，Agent 会记得之前的对话");

    return lines.join("\n");
  }

  getRunningTask(planId) {
    return this.runningTasks.get(planId);
  }
}
