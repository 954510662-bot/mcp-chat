import { randomUUID } from "node:crypto";
import { messageBus } from "./messageBus.js";

function nowIso() {
  return new Date().toISOString();
}

export class CollaborativeTask {
  constructor({ id, groupId, instruction, targets, store }) {
    this.id = id || randomUUID();
    this.groupId = groupId;
    this.instruction = instruction;
    this.targets = targets || ["openclaw", "claude_code", "hermes"];
    this.store = store;
    this.status = "pending";
    this.createdAt = nowIso();
    this.updatedAt = nowIso();
    this.results = [];
    this.progress = 0;
    this.conversationId = `conv_${this.id}`;
    this.messages = [];
  }

  async execute() {
    this.status = "running";
    this.updatedAt = nowIso();
    this.save();

    console.log(`\n[协作任务] ${this.id} 开始执行`);
    console.log(`[协作任务] 参与 Agent: ${this.targets.join(", ")}`);
    console.log(`[协作任务] 指令: ${this.instruction}\n`);

    messageBus.broadcast("platform", {
      type: "task_start",
      taskId: this.id,
      instruction: this.instruction,
      conversationId: this.conversationId
    });

    const userMessage = {
      type: "user_instruction",
      instruction: this.instruction,
      canAskOthers: true
    };

    const executions = this.targets.map(async (target) => {
      const agent = messageBus.agents.get(target);
      if (!agent) {
        return {
          connector: target,
          status: "failed",
          message: `Agent ${target} 未注册`
        };
      }

      try {
        const result = await agent.executeTaskWithTimeout({
          task: this,
          group: this.store.getGroup(this.groupId),
          canCollaborate: true,
          conversationId: this.conversationId
        });

        return {
          connector: target,
          status: result.status ?? "success",
          message: result.message ?? "",
          at: nowIso()
        };
      } catch (error) {
        return {
          connector: target,
          status: "failed",
          message: error.message,
          at: nowIso()
        };
      }
    });

    this.results = await Promise.all(executions);
    this.status = this.results.some((r) => r.status !== "success")
      ? "partial_success"
      : "success";
    this.progress = 100;
    this.updatedAt = nowIso();
    this.save();

    messageBus.broadcast("platform", {
      type: "task_complete",
      taskId: this.id,
      status: this.status
    });

    return {
      task: this,
      results: this.results
    };
  }

  save() {
    this.store.saveTask({
      id: this.id,
      groupId: this.groupId,
      instruction: this.instruction,
      targets: this.targets,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      results: this.results,
      progress: this.progress,
      conversationId: this.conversationId,
      messages: this.messages
    });
  }
}
