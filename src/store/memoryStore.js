export class MemoryStore {
  constructor() {
    this.groups = new Map();
    this.messages = new Map();
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
}
