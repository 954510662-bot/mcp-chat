export class MemoryStore {
  constructor() {
    this.groups = new Map();
    this.messages = new Map();
    this.tasks = new Map();
  }

  createGroup(group) {
    this.groups.set(group.id, group);
    this.messages.set(group.id, []);
    return group;
  }

  getGroup(groupId) {
    return this.groups.get(groupId) ?? null;
  }

  listGroups() {
    return Array.from(this.groups.values());
  }

  listMessages(groupId) {
    return this.messages.get(groupId) ?? [];
  }

  appendMessage(groupId, message) {
    const bucket = this.messages.get(groupId);
    if (!bucket) {
      throw new Error(`Group ${groupId} not found`);
    }
    bucket.push(message);
    return message;
  }

  deleteGroup(groupId) {
    const deletedGroup = this.groups.get(groupId) ?? null;
    this.groups.delete(groupId);
    this.messages.delete(groupId);
    return deletedGroup;
  }

  saveTask(task) {
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(taskId) {
    return this.tasks.get(taskId) ?? null;
  }

  listTasks(groupId) {
    const all = Array.from(this.tasks.values());
    return groupId ? all.filter((t) => t.groupId === groupId) : all;
  }

  deleteTask(taskId) {
    const task = this.tasks.get(taskId) ?? null;
    this.tasks.delete(taskId);
    return task;
  }

  cleanupTasksByGroup(groupId) {
    const toDelete = this.listTasks(groupId);
    for (const t of toDelete) {
      this.tasks.delete(t.id);
    }
    return toDelete.length;
  }

  cleanupExpiredTasks(maxAgeMs) {
    const now = Date.now();
    const expired = Array.from(this.tasks.values()).filter((t) => {
      const createdAt = new Date(t.createdAt).getTime();
      return now - createdAt > maxAgeMs;
    });
    for (const t of expired) {
      this.tasks.delete(t.id);
    }
    return expired.length;
  }

  deleteGroup(groupId) {
    const deletedGroup = this.groups.get(groupId) ?? null;
    this.groups.delete(groupId);
    this.messages.delete(groupId);
    this.cleanupTasksByGroup(groupId);
    return deletedGroup;
  }
}
