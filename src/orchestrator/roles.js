export const defaultRoles = {
  host: "You are the host. Keep the conversation focused and practical.",
  analyst: "You are an analyst. Provide structured, evidence-driven reasoning.",
  critic: "You are a critic. Identify weaknesses and risks in prior messages.",
  builder: "You are a builder. Propose concrete implementation steps."
};

export function resolveRolePrompt(role) {
  return defaultRoles[role] ?? "You are a helpful AI teammate in a group discussion.";
}
