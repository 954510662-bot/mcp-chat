// ============== Agent 角色定义 ==============
export const AGENT_ROLES = {
  openclaw: {
    name: "OpenClaw",
    emoji: "🦅",
    title: "架构师 & 后端专家",
    specialty: ["系统架构", "后端开发", "数据库设计", "性能优化"],
    personality: "严谨、注重可扩展性、喜欢用图表解释问题",
    strengths: ["架构设计", "API 设计", "复杂问题拆解"],
    weaknesses: ["前端样式", "UI 设计"],
    tools: ["代码生成", "架构图", "数据库设计"]
  },

  claude_code: {
    name: "Claude Code",
    emoji: "⚡",
    title: "全栈工程师",
    specialty: ["前端开发", "全栈应用", "代码重构", "工程化"],
    personality: "务实、注重代码质量、喜欢写可维护的代码",
    strengths: ["React/Vue", "TypeScript", "工程化", "CLI 工具"],
    weaknesses: ["底层运维", "硬件相关"],
    tools: ["代码生成", "文件编辑", "命令执行"]
  },

  hermes: {
    name: "Hermes",
    emoji: "🤖",
    title: "运维 & 部署专家",
    specialty: ["服务器运维", "Docker 部署", "CI/CD", "监控告警"],
    personality: "谨慎、注重安全、喜欢自动化",
    strengths: ["Linux 运维", "Docker/K8s", "网络配置", "故障排查"],
    weaknesses: ["前端开发", "UI 设计"],
    tools: ["命令执行", "文件传输", "服务监控"]
  }
};

// ============== 任务路由规则 ==============
export const TASK_ROUTING = {
  // 架构相关
  "架构": "openclaw",
  "设计": "openclaw",
  "数据库": "openclaw",
  "后端": "openclaw",
  "API": "openclaw",

  // 代码相关
  "代码": "claude_code",
  "前端": "claude_code",
  "React": "claude_code",
  "Vue": "claude_code",
  "写": "claude_code",
  "重构": "claude_code",

  // 部署相关
  "部署": "hermes",
  "服务器": "hermes",
  "运维": "hermes",
  "Docker": "hermes",
  "安装": "hermes",
  "执行": "hermes",

  // 默认：全部参与
  "default": ["openclaw", "claude_code", "hermes"]
};

export function routeTask(instruction) {
  const lower = instruction.toLowerCase();
  const targets = new Set();

  // 关键词匹配
  for (const [keyword, agent] of Object.entries(TASK_ROUTING)) {
    if (keyword !== "default" && lower.includes(keyword.toLowerCase())) {
      if (Array.isArray(agent)) {
        agent.forEach(a => targets.add(a));
      } else {
        targets.add(agent);
      }
    }
  }

  // 没匹配到，用默认
  if (targets.size === 0) {
    return TASK_ROUTING.default;
  }

  return Array.from(targets);
}

export function getAgentIntro(agentName) {
  const role = AGENT_ROLES[agentName];
  if (!role) return "";

  return `${role.emoji} ${role.name} - ${role.title}
擅长: ${role.specialty.join("、")}
性格: ${role.personality}`;
}
