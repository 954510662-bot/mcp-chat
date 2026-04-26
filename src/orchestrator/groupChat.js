import { randomUUID } from "node:crypto";
import { resolveRolePrompt } from "./roles.js";

function nowIso() {
  return new Date().toISOString();
}

export class GroupChatOrchestrator {
  constructor({ store, providers, retentionDays = 0 }) {
    this.store = store;
    this.providers = providers;
    this.retentionMs =
      Number(retentionDays) > 0 ? Number(retentionDays) * 24 * 60 * 60 * 1000 : 0;
  }

  createGroup({ name, members }) {
    if (!Array.isArray(members) || members.length === 0) {
      throw new Error("members must contain at least one AI member");
    }

    const normalizedMembers = members.map((member, idx) => ({
      id: member.id ?? `member-${idx + 1}`,
      name: member.name ?? `AI-${idx + 1}`,
      provider: member.provider ?? "echo",
      role: member.role ?? "analyst",
      rolePrompt: member.rolePrompt ?? resolveRolePrompt(member.role ?? "analyst")
    }));

    const group = this.store.createGroup({
      id: randomUUID(),
      name,
      members: normalizedMembers,
      createdAt: nowIso(),
      sharedMemory: new Map()
    });

    return group;
  }

  getMessages(groupId) {
    this.assertGroupExists(groupId);
    return this.store.listMessages(groupId);
  }

  listGroups() {
    return this.store
      .listGroups()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  deleteGroup(groupId) {
    const deleted = this.store.deleteGroup(groupId);
    if (!deleted) {
      throw new Error(`Group ${groupId} not found`);
    }
    return deleted;
  }

  cleanupExpiredGroups() {
    if (!this.retentionMs) {
      return { deletedCount: 0, deletedGroupIds: [] };
    }

    return this.cleanupOlderThan(this.retentionMs);
  }

  cleanupOlderThan(maxAgeMs) {
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
      throw new Error("maxAgeMs must be a positive number");
    }

    const threshold = Date.now() - maxAgeMs;
    const deletedGroupIds = [];
    for (const group of this.store.listGroups()) {
      const createdAt = new Date(group.createdAt).getTime();
      if (Number.isFinite(createdAt) && createdAt < threshold) {
        this.store.deleteGroup(group.id);
        deletedGroupIds.push(group.id);
      }
    }

    return {
      deletedCount: deletedGroupIds.length,
      deletedGroupIds
    };
  }

  async sendMessage({ groupId, userMessage, maxRounds = 1 }) {
    const group = this.assertGroupExists(groupId);
    const safeRounds = Math.max(1, Math.min(Number(maxRounds) || 1, 5));

    this.store.appendMessage(groupId, {
      role: "user",
      speaker: "user",
      content: userMessage,
      createdAt: nowIso()
    });

    for (let round = 1; round <= safeRounds; round += 1) {
      for (const member of group.members) {
        const provider = this.providers.get(member.provider);
        let content = "";
        let isError = false;

        if (!provider) {
          content = `Provider "${member.provider}" not found for ${member.name}`;
          isError = true;
        } else {
          try {
            const transcript = this.store.listMessages(groupId);
            content = await provider.generateResponse({
              group,
              member,
              transcript,
              userMessage,
              round
            });
          } catch (error) {
            isError = true;
            content = error instanceof Error ? error.message : String(error);
          }
        }

        this.store.appendMessage(groupId, {
          role: "assistant",
          speaker: member.name,
          memberId: member.id,
          provider: member.provider,
          content: content || "(empty response)",
          isError,
          createdAt: nowIso()
        });
      }
    }

    return this.store.listMessages(groupId);
  }

  async summarize(groupId) {
    const group = this.assertGroupExists(groupId);
    const transcript = this.store.listMessages(groupId);
    const provider = this.providers.get(group.members[0]?.provider ?? "echo");

    if (!provider) {
      throw new Error("No provider available for summary");
    }

    const content = await provider
      .generateResponse({
        group,
        member: {
          name: "Summarizer",
          rolePrompt:
            "You summarize a multi-agent discussion into: key points, disagreements, and recommended next actions."
        },
        transcript,
        userMessage: "Summarize this discussion in concise bullet points.",
        round: 1
      })
      .catch((error) =>
        `Summary failed: ${error instanceof Error ? error.message : String(error)}`
      );

    return content;
  }

  assertGroupExists(groupId) {
    const group = this.store.getGroup(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    return group;
  }
}
