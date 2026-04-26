"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const mcp_chat_core_1 = require("mcp-chat-core");
let platform = null;
let panel = null;
async function activate(context) {
    console.log('[MCP Chat] 插件已激活');
    // 初始化平台
    platform = new mcp_chat_core_1.MultiAgentPlatform();
    await platform.init();
    // 注册命令
    context.subscriptions.push(vscode.commands.registerCommand('mcp-chat.start', () => {
        createOrShowPanel(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mcp-chat.newTask', () => {
        if (panel) {
            panel.webview.postMessage({ type: 'clear' });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mcp-chat.clearHistory', () => {
        // 清空历史
    }));
    // 注册侧边栏视图提供者
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('mcp-chat-sidebar', new SidebarViewProvider(context)));
}
class SidebarViewProvider {
    constructor(_context) {
        this._context = _context;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // 处理来自 WebView 的消息
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'execute':
                    await this._executeTask(message.prompt);
                    break;
                case 'openChat':
                    createOrShowPanel(this._context);
                    break;
            }
        });
    }
    async _executeTask(prompt) {
        if (!platform) {
            return;
        }
        this._view?.webview.postMessage({
            type: 'task_start',
            prompt
        });
        try {
            const result = await platform.execute(prompt);
            this._view?.webview.postMessage({
                type: 'task_complete',
                result
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: 'task_error',
                error: String(error)
            });
        }
    }
    _getHtmlForWebview(webview) {
        return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            padding: 10px;
            font-family: var(--vscode-font-family);
          }
          .agent-list {
            margin-bottom: 20px;
          }
          .agent-item {
            display: flex;
            align-items: center;
            padding: 8px;
            margin-bottom: 5px;
            background: var(--vscode-list-hoverBackground);
            border-radius: 4px;
          }
          .agent-emoji {
            font-size: 20px;
            margin-right: 10px;
          }
          .agent-name {
            font-weight: bold;
          }
          .agent-title {
            font-size: 12px;
            opacity: 0.7;
          }
          .quick-actions {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .action-btn {
            padding: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-align: left;
          }
          .action-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .section-title {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.6;
            margin: 15px 0 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="section-title">可用 Agent</div>
        <div class="agent-list">
          <div class="agent-item">
            <span class="agent-emoji">🦅</span>
            <div>
              <div class="agent-name">OpenClaw</div>
              <div class="agent-title">架构师 & 后端专家</div>
            </div>
          </div>
          <div class="agent-item">
            <span class="agent-emoji">⚡</span>
            <div>
              <div class="agent-name">Claude Code</div>
              <div class="agent-title">全栈代码专家</div>
            </div>
          </div>
          <div class="agent-item">
            <span class="agent-emoji">🚀</span>
            <div>
              <div class="agent-name">Hermes</div>
              <div class="agent-title">部署 & 运维专家</div>
            </div>
          </div>
        </div>

        <div class="section-title">快速操作</div>
        <div class="quick-actions">
          <button class="action-btn" onclick="openChat()">💬 打开聊天面板</button>
          <button class="action-btn" onclick="quickExecute('帮我分析当前项目架构')">🏗️ 分析项目架构</button>
          <button class="action-btn" onclick="quickExecute('帮我生成一个新组件')">📦 生成代码</button>
          <button class="action-btn" onclick="quickExecute('帮我检查代码问题')">🔍 代码审查</button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function openChat() {
            vscode.postMessage({ type: 'openChat' });
          }

          function quickExecute(prompt) {
            vscode.postMessage({ type: 'execute', prompt });
          }
        </script>
      </body>
      </html>
    `;
    }
}
function createOrShowPanel(context) {
    const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
    if (panel) {
        panel.reveal(column);
        return;
    }
    panel = vscode.window.createWebviewPanel('mcpChatPanel', 'MCP 多 Agent 协作', column || vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.webview.html = getChatPanelHtml(panel.webview, context);
    // 处理消息
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
            case 'sendMessage':
                await handleChatMessage(message.text);
                break;
        }
    });
    panel.onDidDispose(() => {
        panel = null;
    }, null, context.subscriptions);
}
async function handleChatMessage(text) {
    if (!platform || !panel) {
        return;
    }
    // 显示用户消息
    panel.webview.postMessage({
        type: 'userMessage',
        text,
        timestamp: Date.now()
    });
    // 显示思考中
    panel.webview.postMessage({
        type: 'thinking',
        agent: 'platform'
    });
    try {
        // 监听执行过程
        platform.on('step_start', ({ step, agent }) => {
            panel?.webview.postMessage({
                type: 'agentStep',
                agent,
                description: step.description
            });
        });
        platform.on('step_complete', ({ step, result }) => {
            panel?.webview.postMessage({
                type: 'agentComplete',
                agent: step.agent,
                result: result.message
            });
        });
        const result = await platform.execute(text);
        panel.webview.postMessage({
            type: 'finalResult',
            result
        });
    }
    catch (error) {
        panel.webview.postMessage({
            type: 'error',
            message: String(error)
        });
    }
}
function getChatPanelHtml(webview, context) {
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        .chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }
        .message {
          margin-bottom: 15px;
          max-width: 85%;
        }
        .message.user {
          margin-left: auto;
        }
        .message.user .content {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border-radius: 12px 12px 0 12px;
          padding: 10px 15px;
        }
        .message.agent .content {
          background: var(--vscode-textBlockQuote-background);
          border-radius: 12px 12px 12px 0;
          padding: 10px 15px;
          border-left: 3px solid var(--vscode-testing-iconPassed);
        }
        .agent-header {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
          font-size: 12px;
          opacity: 0.7;
        }
        .agent-emoji {
          margin-right: 5px;
          font-size: 16px;
        }
        .thinking {
          padding: 10px 15px;
          font-style: italic;
          opacity: 0.6;
        }
        .input-area {
          padding: 15px;
          border-top: 1px solid var(--vscode-panel-border);
          background: var(--vscode-panel-background);
        }
        .input-wrapper {
          display: flex;
          gap: 10px;
        }
        textarea {
          flex: 1;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 6px;
          padding: 8px 12px;
          resize: none;
          font-family: inherit;
          font-size: inherit;
        }
        textarea:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
        }
        button {
          padding: 8px 16px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        .step-update {
          padding: 8px 12px;
          margin: 5px 0;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          font-size: 13px;
        }
        .code-block {
          background: var(--vscode-textCodeBlock-background);
          padding: 10px;
          border-radius: 6px;
          font-family: var(--vscode-editor-font-family);
          font-size: 0.9em;
          margin: 8px 0;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="chat-container" id="chatContainer"></div>

      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            id="input"
            rows="3"
            placeholder="输入你的需求，三个 Agent 会协作完成..."
          ></textarea>
          <button onclick="sendMessage()">发送</button>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const input = document.getElementById('input');

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });

        function sendMessage() {
          const text = input.value.trim();
          if (!text) { return; }
          input.value = '';
          vscode.postMessage({ type: 'sendMessage', text });
        }

        function addMessage(type, content, agent = null) {
          const div = document.createElement('div');
          div.className = 'message ' + type;

          if (agent) {
            const header = document.createElement('div');
            header.className = 'agent-header';
            const agentInfo = {
              openclaw: { emoji: '🦅', name: 'OpenClaw' },
              claude_code: { emoji: '⚡', name: 'Claude Code' },
              hermes: { emoji: '🚀', name: 'Hermes' },
              platform: { emoji: '🤖', name: '平台' }
            };
            const info = agentInfo[agent] || { emoji: '🤖', name: agent };
            header.innerHTML = '<span class="agent-emoji">' + info.emoji + '</span> ' + info.name;
            div.appendChild(header);
          }

          const contentDiv = document.createElement('div');
          contentDiv.className = 'content';
          contentDiv.innerHTML = content;
          div.appendChild(contentDiv);

          chatContainer.appendChild(div);
          scrollToBottom();
        }

        function addStepUpdate(agent, description) {
          const agentInfo = {
            openclaw: { emoji: '🦅', name: 'OpenClaw' },
            claude_code: { emoji: '⚡', name: 'Claude Code' },
            hermes: { emoji: '🚀', name: 'Hermes' }
          };
          const info = agentInfo[agent] || { emoji: '🤖', name: agent };

          const div = document.createElement('div');
          div.className = 'step-update';
          div.innerHTML = info.emoji + ' <b>' + info.name + '</b> 正在处理: ' + description;
          chatContainer.appendChild(div);
          scrollToBottom();
        }

        function addThinking() {
          const div = document.createElement('div');
          div.id = 'thinking';
          div.className = 'thinking';
          div.innerHTML = '🤔 Agent 正在分析需求...';
          chatContainer.appendChild(div);
          scrollToBottom();
        }

        function removeThinking() {
          const el = document.getElementById('thinking');
          if (el) { el.remove(); }
        }

        function scrollToBottom() {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // 接收来自扩展的消息
        window.addEventListener('message', (event) => {
          const message = event.data;

          switch (message.type) {
            case 'userMessage':
              addMessage('user', message.text);
              addThinking();
              break;

            case 'agentStep':
              removeThinking();
              addStepUpdate(message.agent, message.description);
              break;

            case 'agentComplete':
              addMessage('agent', message.result, message.agent);
              break;

            case 'finalResult':
              removeThinking();
              break;

            case 'error':
              removeThinking();
              addMessage('agent', '❌ 错误: ' + message.message, 'platform');
              break;
          }
        });
      </script>
    </body>
    </html>
  `;
}
function deactivate() {
    platform = null;
}
//# sourceMappingURL=extension.js.map