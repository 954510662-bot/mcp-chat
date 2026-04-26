#!/usr/bin/env node
import http from "node:http";
import { spawn } from "node:child_process";

// 配置
const config = {
  onebotHttpPort: 3001,
  mcpServerPath: "./src/server.js",
  botAdminQQ: "你的QQ号"
};

// MCP Server 子进程
let mcpServer = null;
let responseCallbacks = new Map();
let nextRequestId = 1;

function startMcpServer() {
  mcpServer = spawn("node", [config.mcpServerPath], {
    stdio: ["pipe", "pipe", "inherit"]
  });

  let buffer = "";
  mcpServer.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const callback = responseCallbacks.get(msg.id);
        if (callback) {
          responseCallbacks.delete(msg.id);
          callback(msg);
        }
      } catch (e) {}
    }
  });

  console.log("MCP Server started");
}

function callMcpTool(name, args) {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    responseCallbacks.set(id, resolve);

    mcpServer.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args }
      }) + "\n"
    );

    setTimeout(() => {
      responseCallbacks.delete(id);
      reject(new Error("Timeout"));
    }, 120000);
  });
}

// 创建群聊 group（只创建一次，之后复用）
let cachedGroupId = null;
async function getOrCreateGroup() {
  if (cachedGroupId) return cachedGroupId;

  const result = await callMcpTool("create_group", {
    name: "QQ Group Chat",
    members: [{ name: "Coordinator", provider: "echo" }]
  });

  cachedGroupId = result.result?.structuredContent?.data?.id;
  return cachedGroupId;
}

// OneBot 接收消息
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const event = JSON.parse(body);
      await handleEvent(event);
    } catch (e) {
      console.error("Event error:", e);
    }
    res.writeHead(200);
    res.end("OK");
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

async function handleEvent(event) {
  // 只处理群聊 @我 或 私聊
  const isGroupAt =
    event.message_type === "group" &&
    event.message?.some?.((m) => m.type === "at" && m.data?.qq === String(event.self_id));

  const isPrivate = event.message_type === "private";

  if (!isGroupAt && !isPrivate) return;

  const text = event.message
    .filter((m) => m.type === "text")
    .map((m) => m.data?.text ?? "")
    .join(" ")
    .trim();

  if (!text) return;

  console.log(`[QQ] ${event.user_id}: ${text}`);

  // 命令处理
  if (text.startsWith("/task")) {
    const instruction = text.slice(5).trim();
    if (!instruction) {
      reply(event, "用法: /task 你的指令");
      return;
    }

    reply(event, "[平台] 收到，正在分发给 Agent...");

    try {
      const groupId = await getOrCreateGroup();
      const result = await callMcpTool("dispatch_task", {
        groupId,
        instruction
      });

      const task = result.result?.structuredContent?.data?.task;
      if (task) {
        let msg = `[任务完成] TaskID: ${task.id}\n`;
        for (const r of task.results) {
          msg += `\n=== ${r.connector.toUpperCase()} ===\n`;
          msg += `状态: ${r.status}\n`;
          msg += r.message;
        }
        reply(event, msg);
      }
    } catch (e) {
      reply(event, `错误: ${e.message}`);
    }
  } else if (text === "/help") {
    reply(event, "可用命令:\n/task [指令] - 分发任务\n/help - 帮助");
  }
}

function reply(event, message) {
  // 输出到控制台，实际部署时调用 OneBot send_msg API
  console.log(`[回复] ${message}`);
}

// 启动
startMcpServer();
server.listen(3001, () => {
  console.log("QQ Bot running on http://localhost:3001");
  console.log("请配置 NapCat/LLOneBot 的 HTTP 上报地址为: http://localhost:3001");
});
