# 🚀 MCP 多 Agent 协作平台

功能完整的多 AI Agent 协作框架，支持 Agent 插件系统、工具挂载、独立上下文管理、用户反馈循环、插件市场等功能。

## ✨ 功能特性

| 功能 | 状态 | 说明 |
|------|------|------|
| 🤖 **Agent 插件系统** | ✅ | 标准化 BaseAgent 基类 |
| 🔧 **工具挂载层** | ✅ | Shell/File/Fetch 三大标准工具 |
| 💾 **独立上下文窗口** | ✅ | 每个 Agent 独立内存容量 |
| ❓ **用户反馈循环** | ✅ | Agent 可暂停向用户提问 |
| 🏪 **插件市场接口** | ✅ | 动态发现、安装、管理 |
| 📊 **任务规划引擎** | ✅ | 智能路由，多步骤执行 |
| 📡 **MCP Server** | ✅ | 兼容 Model Context Protocol |

## 📦 快速开始

```bash
git clone https://github.com/954510662-bot/mcp-chat.git
cd mcp-chat
npm install
npm start
```

## 🎯 两种运行模式

### 模式 A：交互平台模式 (推荐)

```bash
npm start
```

命令行内支持:
- 直接输入需求，多 Agent 协作执行
- `/agents` - 查看可用 Agent
- `/plugins` - 查看插件市场
- `/status` - 查看平台状态

### 模式 B：MCP Server 模式

```bash
npm run start:server
```

兼容 [Model Context Protocol](https://modelcontextprotocol.io)，支持通过 MCP 客户端调用。

**MCP 内置工具:**
- `create_group` - 创建聊天组
- `send_message` - 发送消息
- `get_messages` - 获取聊天记录
- `summarize_group` - 总结对话
- `dispatch_task` - 分发协作任务
- `get_task` - 查询任务状态

## 🤖 内置 Agent

| Agent | 角色 | 上下文容量 | 工具 |
|-------|------|-----------|------|
| 🦅 **OpenClaw** | 架构师 & 后端专家 | 1500 行 / 75KB | Shell, File, Fetch |
| ⚡ **Claude Code** | 全栈代码专家 | 2000 行 / 100KB | Shell, File, Fetch |
| 🚀 **Hermes** | 云服务器 & 部署专家 | 500 行 / 25KB | Shell, Fetch |

## 💻 代码集成

```javascript
import { MultiAgentPlatform } from "mcp-chat";

// 1. 创建平台实例
const platform = new MultiAgentPlatform();

// 2. 初始化
await platform.init();

// 3. 执行任务
const result = await platform.execute("帮我设计一个博客系统");
console.log(result);
```

## 🔧 核心 API

```javascript
// 任务执行
async execute(prompt, options?)       // 执行任务
async stop(taskId)                    // 停止任务

// Agent 管理
listAgents()                          // 列出 Agent
getAgent(agentId)                     // 获取 Agent

// 插件管理
listPlugins()                         // 列出插件
async installPlugin(pluginId)         // 安装插件
searchPlugins(query)                  // 搜索插件

// 事件监听
on("task_start", callback)
on("task_complete", callback)
on("step_start", callback)
on("user_feedback_required", callback)
```

## 🎮 自定义 Agent

```javascript
import { BaseAgent, ShellTool } from "mcp-chat";

export class MyAgent extends BaseAgent {
  constructor() {
    super({
      id: "my_agent",
      name: "我的 Agent",
      emoji: "🤖",
      title: "自定义 Agent",
      specialty: ["我的专长"]
    });
    this.registerTool(new ShellTool());
  }

  async _execute(task) {
    return {
      status: "success",
      message: "任务完成！"
    };
  }
}
```

## 🔧 环境配置

复制 `.env.example` 到 `.env`:

```bash
# 启用 HTTP 传输模式
MCP_TRANSPORT=http
MCP_PORT=3000

# HTTP Auth Token
MCP_AUTH_TOKEN=your-token-here

# 持久化: file / memory
MCP_PERSISTENCE=file

# 数据保留天数 (0=不自动清理)
MCP_RETENTION_DAYS=7
```

## 📁 项目结构

```
mcp-chat/
├── src/
│   ├── index.js                  # 统一对外入口
│   ├── server.js                 # MCP Server 入口
│   ├── agents/
│   │   ├── baseAgent.js          # Agent 基类
│   │   ├── openclawAgent.js
│   │   ├── claudeCodeAgent.js
│   │   └── hermesAgent.js
│   ├── tools/
│   │   └── toolManager.js        # 工具系统
│   └── platform/
│       ├── multiAgentPlatform.js # 统一平台类
│       ├── taskPlanner.js        # 任务规划
│       ├── contextManager.js     # 上下文管理
│       ├── feedbackLoop.js       # 用户反馈
│       └── pluginMarketplace.js  # 插件市场
├── platform.js                    # 交互平台入口
├── example-usage.js               # 使用示例
└── package.json
```

## Marketplace Ready

- Registry manifest: `mcp-registry.manifest.json`
- One-command install: `npx -y mcp-chat-server`

## Requirements

- Node.js 18+
