import { randomUUID } from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

export class TaskDispatcher {
  constructor({ store, connectors }) {
    this.store = store;
    this.connectors = connectors;
    this.runningTasks = new Map();
  }

  getTask(taskId) {
    const task = this.store.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return task;
  }

  listTasks(groupId, status) {
    let tasks = this.store.listTasks(groupId);
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }
    return tasks;
  }

  async dispatchTask({ groupId, instruction, targets, async = false }) {
    const connectorNames = targets?.length
      ? targets
      : ["openclaw", "claude_code", "hermes"];

    const task = {
      id: randomUUID(),
      groupId,
      instruction,
      targets: connectorNames,
      status: async ? "pending" : "running",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      results: [],
      progress: 0,
      async
    };

    this.store.saveTask(task);

    if (async) {
      this.executeTaskAsync(task);
      return {
        task: { ...task, results: undefined },
        message: `任务已提交，ID: ${task.id}，正在后台执行`
      };
    }

    return this.executeTaskSync(task);
  }

  async executeTaskSync(task) {
    const executions = task.targets.map(async (target) => {
      const connector = this.connectors.get(target);
      if (!connector) {
        return {
          connector: target,
          status: "failed",
          ack: `${target} 未接入`,
          message: `Connector ${target} is not registered`,
          at: nowIso()
        };
      }

      try {
        const result = await connector.executeTaskWithTimeout({
          task,
          group: this.store.getGroup(task.groupId)
        });
        return {
          connector: target,
          status: result.status ?? "success",
          ack: `${target}：收到`,
          message: result.message ?? "",
          at: nowIso()
        };
      } catch (error) {
        return {
          connector: target,
          status: "failed",
          ack: `${target}：执行失败`,
          message: error.message,
          at: nowIso()
        };
      }
    });

    task.results = await Promise.all(executions);
    task.status = task.results.some((r) => r.status !== "success")
      ? "partial_success"
      : "success";
    task.progress = 100;
    task.updatedAt = nowIso();
    this.store.saveTask(task);

    return {
      task,
      receipts: task.results.map((r) => r.ack)
    };
  }

  executeTaskAsync(task) {
    task.status = "running";
    this.store.saveTask(task);
    this.runningTasks.set(task.id, task);

    setImmediate(async () => {
      let completed = 0;
      const total = task.targets.length;

      for (const target of task.targets) {
        const connector = this.connectors.get(target);
        if (!connector) {
          task.results.push({
            connector: target,
            status: "failed",
            ack: `${target} 未接入`,
            message: `Connector ${target} is not registered`,
            at: nowIso()
          });
        } else {
          try {
            const result = await connector.executeTaskWithTimeout({
              task,
              group: this.store.getGroup(task.groupId)
            });
            task.results.push({
              connector: target,
              status: result.status ?? "success",
              ack: `${target}：收到`,
              message: result.message ?? "",
              at: nowIso()
            });
          } catch (error) {
            task.results.push({
              connector: target,
              status: "failed",
              ack: `${target}：执行失败`,
              message: error.message,
              at: nowIso()
            });
          }
        }

        completed++;
        task.progress = Math.round((completed / total) * 100);
        task.updatedAt = nowIso();
        this.store.saveTask(task);
      }

      task.status = task.results.some((r) => r.status !== "success")
        ? "partial_success"
        : "success";
      task.progress = 100;
      task.updatedAt = nowIso();
      this.store.saveTask(task);
      this.runningTasks.delete(task.id);
    });
  }

  cancelTask(taskId) {
    const task = this.getTask(taskId);
    if (!this.runningTasks.has(taskId)) {
      throw new Error(`任务 ${taskId} 未在运行，无法取消`);
    }
    task.status = "cancelled";
    task.updatedAt = nowIso();
    this.store.saveTask(task);
    this.runningTasks.delete(taskId);
    return task;
  }
}
