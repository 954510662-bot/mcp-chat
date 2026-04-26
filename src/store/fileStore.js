import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class FileStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.groups = new Map();
    this.messages = new Map();
    this.tasks = new Map();
    this.writeQueue = Promise.resolve();
  }

  static async create(filePath) {
    const store = new FileStore(filePath);
    await store.load();
    return store;
  }

  async load() {
    await mkdir(dirname(this.filePath), { recursive: true });
    if (!existsSync(this.filePath)) {
      await this.persist();
      return;
    }

    const raw = await readFile(this.filePath, "utf8");
    if (!raw.trim()) {
      return;
    }

    const parsed = JSON.parse(raw);
    this.groups = new Map(
      (parsed.groups ?? []).map((g) => {
        if (g.sharedMemory) {
          g.sharedMemory = new Map(g.sharedMemory);
        }
        return [g.id, g];
      })
    );
    this.messages = new Map(parsed.messages ?? []);
    this.tasks = new Map((parsed.tasks ?? []).map((t) => [t.id, t]));
  }

  snapshot() {
    return {
      groups: Array.from(this.groups.values()).map((g) => ({
        ...g,
        sharedMemory: g.sharedMemory ? Array.from(g.sharedMemory.entries()) : undefined
      })),
      messages: Array.from(this.messages.entries()),
      tasks: Array.from(this.tasks.values())
    };
  }

  enqueuePersist() {
    this.writeQueue = this.writeQueue.then(() => this.persist());
    return this.writeQueue;
  }

  async persist() {
    const tmp = `${this.filePath}.tmp`;
    const data = JSON.stringify(this.snapshot(), null, 2);
    await writeFile(tmp, data, "utf8");
    await rename(tmp, this.filePath);
  }

  createGroup(group) {
    this.groups.set(group.id, group);
    this.messages.set(group.id, []);
    this.enqueuePersist();
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
    this.enqueuePersist();
    return message;
  }

  deleteGroup(groupId) {
    const deletedGroup = this.groups.get(groupId) ?? null;
    this.groups.delete(groupId);
    this.messages.delete(groupId);
    this.cleanupTasksByGroup(groupId);
    this.enqueuePersist();
    return deletedGroup;
  }

  saveTask(task) {
    this.tasks.set(task.id, task);
    this.enqueuePersist();
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
    this.enqueuePersist();
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
    if (expired.length > 0) {
      this.enqueuePersist();
    }
    return expired.length;
  }
}
