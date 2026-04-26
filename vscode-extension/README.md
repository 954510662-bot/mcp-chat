# 🚀 MCP 多 Agent 协作平台 - VS Code 插件

在 VS Code / Cursor 中直接使用多 AI Agent 协作能力。

## ✨ 功能特性

- 🤖 **三个专业 Agent 协作**
  - 🦅 OpenClaw - 架构师 & 后端专家
  - ⚡ Claude Code - 全栈代码专家
  - 🚀 Hermes - 部署 & 运维专家

- 🔧 **内置工具**
  - Shell 命令执行
  - 文件读写（沙盒环境）
  - HTTP 请求

- 💾 **独立上下文管理**
  - 每个 Agent 独立内存容量
  - 自动上下文裁剪

- 📝 **功能**
  - 项目架构分析
  - 代码生成与优化
  - 部署建议
  - 代码审查

## 📦 安装

### 开发模式运行

```bash
cd vscode-extension
npm install

# 编译
npm run compile

# 按 F5 打开扩展开发主机
```

### 打包安装

```bash
npm install -g @vscode/vsce
cd vscode-extension
vsce package
# 生成 .vsix 文件，在 VS Code 中手动安装
```

## 🎮 使用方式

### 1. 侧边栏面板

点击左侧活动栏的 MCP 图标打开侧边栏：
- 查看可用 Agent 列表
- 一键快速操作（分析架构、生成代码等）

### 2. 聊天面板

命令面板 (`Ctrl+Shift+P`) → 输入 `MCP Chat: 打开多 Agent 协作平台`

在聊天面板中直接输入你的需求，三个 Agent 会协作完成任务。

### 3. 命令列表

| 命令 | 说明 |
|------|------|
| `MCP Chat: 打开多 Agent 协作平台` | 打开聊天面板 |
| `MCP Chat: 新建任务` | 开启新的任务会话 |
| `MCP Chat: 清空历史` | 清空聊天历史 |

## 💡 使用示例

### 架构设计

```
用户: 帮我设计一个博客系统的后端架构

🦅 OpenClaw: 开始分析需求...
→ 设计数据库表结构
→ 设计 RESTful API
→ 推荐技术栈

⚡ Claude Code: 开始生成代码...
→ 生成模型定义
→ 生成路由代码
→ 生成配置文件

🚀 Hermes: 开始准备部署方案...
→ Docker 配置
→ Nginx 配置
→ 部署脚本
```

### 代码生成

```
用户: 帮我生成一个 React 登录组件

⚡ Claude Code: 开始生成代码...
→ 生成登录表单组件
→ 集成表单验证
→ 添加样式
→ 生成使用示例
```

### 项目分析

```
用户: 分析一下当前项目的结构

🦅 OpenClaw: 开始分析项目...
→ 分析目录结构
→ 识别技术栈
→ 发现潜在问题
→ 给出优化建议
```

## ⚙️ 配置选项

在 VS Code 设置中搜索 `mcp-chat`:

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxContextSize` | number | 100000 | 最大上下文字符数 |
| `enableAutoDeploy` | boolean | false | 启用自动部署确认 |
| `workspacePath` | string | "" | Agent 工作区路径 |

## 🔧 开发

### 项目结构

```
vscode-extension/
├── src/
│   └── extension.ts       # 插件主入口
├── resources/
│   ├── icon.svg           # 插件图标
│   └── sidebar.svg        # 侧边栏图标
├── package.json           # 插件配置
├── tsconfig.json          # TypeScript 配置
└── README.md
```

### 调试

1. 在 VS Code 中打开 `vscode-extension` 目录
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中测试插件功能

## 📝 注意事项

1. **首次启动**: 插件首次启动时会初始化 Agent 平台，可能需要几秒钟
2. **工作区**: Agent 的文件操作默认在插件的沙盒工作区中进行
3. **网络**: Agent 需要网络连接来调用远程服务（如果配置了）

## 🔮 后续功能

- [ ] 选择特定 Agent 执行任务
- [ ] Agent 间对话可视化
- [ ] 代码直接插入编辑器
- [ ] 文件差异预览
- [ ] 任务历史记录
- [ ] 自定义 Agent 配置
- [ ] 插件市场集成

## 📄 License

MIT
