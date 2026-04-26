import "dotenv/config";
import http from "http";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { TaskDispatcher } from "./src/platform/taskDispatcher.js";

const store = await FileStore.create("./data/web-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });
const dispatcher = new TaskDispatcher({ store, connectors });

const group = orchestrator.createGroup({
  name: "Web Chat Group",
  members: [{ name: "Coordinator", provider: "echo" }]
});

function detectIntent(text) {
  const t = text.toLowerCase();

  if (
    t.includes("状态") ||
    t.includes("在线") ||
    t.includes("哪些") ||
    t.includes("平台") ||
    t.includes("信息") ||
    t.includes("健康") ||
    t.includes("检查")
  ) {
    if (!t.includes("帮我") && !t.includes("写") && !t.includes("做")) {
      return "info";
    }
  }

  if (
    (t.includes("任务") && (t.includes("状态") || t.includes("进度") || t.includes("历史") || t.includes("记录"))) ||
    t.includes("刚才做了什么") ||
    t.includes("看一下任务")
  ) {
    return "tasks";
  }

  if (
    t.includes("帮我") ||
    t.includes("大家一起") ||
    t.includes("三个 agent") ||
    t.includes("一起写") ||
    t.includes("分发任务")
  ) {
    return "dispatch_task";
  }

  return "chat";
}

async function handleMessage(text) {
  const intent = detectIntent(text);

  switch (intent) {
    case "info":
      let info = "📊 Agent 状态\n\n";
      for (const [name, conn] of connectors.entries()) {
        info += `✅ ${name.toUpperCase()}\n`;
        info += `   地址: ${conn.endpoint || "本地"}\n\n`;
      }
      return info;

    case "tasks":
      const tasks = store.listTasks(group.id).slice(-5).reverse();
      if (tasks.length === 0) {
        return "📋 还没有执行过任务哦";
      }
      let taskStr = "📋 最近任务\n\n";
      for (const t of tasks) {
        taskStr += `[${t.status}] ${t.instruction.slice(0, 30)}\n`;
        taskStr += `进度: ${t.progress || 0}%\n\n`;
      }
      return taskStr;

    case "dispatch_task":
      const result = await dispatcher.dispatchTask({
        groupId: group.id,
        instruction: text
      });

      let resp = `✅ 任务完成\n\n`;
      for (const r of result.task.results) {
        resp += `━━━ ${r.connector.toUpperCase()} ━━━\n`;
        resp += `状态: ${r.status}\n`;
        resp += r.message + "\n\n";
      }
      return resp;

    case "chat":
    default:
      await orchestrator.sendMessage({
        groupId: group.id,
        userMessage: text
      });
      const messages = orchestrator.getMessages(group.id);
      const last = messages[messages.length - 1];
      return last?.content || "收到";
  }
}

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🤖 多 Agent 协作平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; height: 100vh; display: flex; flex-direction: column; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
    .header h1 { font-size: 20px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .messages { flex: 1; overflow-y: auto; padding: 20px; }
    .msg { margin-bottom: 15px; max-width: 80%; }
    .msg.user { margin-left: auto; }
    .msg.bot { margin-right: auto; }
    .msg-content { padding: 12px 16px; border-radius: 18px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
    .msg.user .msg-content { background: #667eea; color: white; border-bottom-right-radius: 4px; }
    .msg.bot .msg-content { background: white; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .input-area { display: flex; padding: 15px; background: white; border-top: 1px solid #eee; }
    .input-area input { flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 24px; font-size: 16px; outline: none; }
    .input-area input:focus { border-color: #667eea; }
    .input-area button { margin-left: 10px; padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 24px; font-size: 16px; cursor: pointer; }
    .input-area button:active { transform: scale(0.95); }
    .typing { color: #999; font-size: 14px; padding: 5px 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 多 Agent 协作平台</h1>
      <p>OpenClaw + Hermes + Claude Code 一起帮你</p>
    </div>
    <div class="messages" id="messages">
      <div class="msg bot">
        <div class="msg-content">你好！我是多 Agent 协作平台。试着对我说：\n\n• 现在有哪些 Agent 在线？\n• 帮我三个 Agent 一起写个爬虫\n• 看一下刚才的任务状态</div>
      </div>
    </div>
    <div class="typing" id="typing" style="display:none;">Agent 正在思考...</div>
    <div class="input-area">
      <input type="text" id="input" placeholder="说点什么..." autocomplete="off">
      <button onclick="sendMessage()">发送</button>
    </div>
  </div>

  <script>
    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('input');
    const typing = document.getElementById('typing');

    function addMessage(text, isUser = false) {
      const div = document.createElement('div');
      div.className = 'msg ' + (isUser ? 'user' : 'bot');
      div.innerHTML = '<div class="msg-content">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      addMessage(text, true);
      input.value = '';
      typing.style.display = 'block';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.text();
        addMessage(data, false);
      } catch (e) {
        addMessage('出错了：' + e.message, false);
      }

      typing.style.display = 'none';
    }

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { message } = JSON.parse(body);

    console.log(`[收到消息] ${message}`);
    const response = await handleMessage(message);

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(response);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌐 Web 服务器已启动！`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`📱 手机访问: http://你的电脑IP:${PORT}`);
  console.log(`\n确保手机和电脑在同一 WiFi 下\n`);
});
