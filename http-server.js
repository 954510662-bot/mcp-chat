#!/usr/bin/env node
import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MultiAgentPlatform } from "./src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.join(__dirname, "web", "public");

const PORT = process.env.PORT || 3001;
const platform = new MultiAgentPlatform();

// 存储活跃连接（SSE）
const connections = new Set();

// 简单的请求解析
function parseReq(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// 发送 JSON 响应
function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

// SSE 事件推送
function sendSSEEvent(res, type, data) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// 初始化平台
console.log("=".repeat(60));
console.log("🚀 MCP 多 Agent 协作平台 - HTTP Server");
console.log("=".repeat(60));

await platform.init();
console.log(`✅ 平台初始化完成，已加载 ${platform.listAgents().length} 个 Agent`);

// 注册事件监听，转发到 SSE
platform.on("task_start", ({ taskId, prompt }) => {
  connections.forEach((res) => {
    sendSSEEvent(res, "task_start", { taskId, prompt });
  });
});

platform.on("step_start", ({ taskId, step, agent }) => {
  connections.forEach((res) => {
    sendSSEEvent(res, "step_start", { taskId, step, agent });
  });
});

platform.on("step_complete", ({ taskId, step, result }) => {
  connections.forEach((res) => {
    sendSSEEvent(res, "step_complete", { taskId, step, result });
  });
});

platform.on("task_complete", ({ taskId, results }) => {
  connections.forEach((res) => {
    sendSSEEvent(res, "task_complete", { taskId, results });
  });
});

platform.on("user_feedback_required", ({ question }) => {
  connections.forEach((res) => {
    sendSSEEvent(res, "feedback_required", { question });
  });
});

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // ========== 静态文件服务 (Web UI) ==========
  if (req.method === "GET" && !path.startsWith("/api/")) {
    let filePath = path === "/" ? "/index.html" : path;
    const fullPath = path.join(WEB_ROOT, filePath);

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const ext = path.extname(fullPath);
      const contentType = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json"
      }[ext] || "text/plain";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
      return;
    } catch (e) {
      // 继续到 API 路由
    }
  }

  // ========== API 路由 ==========

  // 1. 健康检查
  if (path === "/health") {
    sendJson(res, {
      status: "ok",
      name: "MCP Multi-Agent Platform",
      version: "1.0.0",
      agentCount: platform.listAgents().length,
      uptime: process.uptime()
    });
    return;
  }

  // 2. 获取 Agent 列表
  if (path === "/api/agents" && req.method === "GET") {
    sendJson(res, {
      agents: platform.listAgents().map(a => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        title: a.title,
        specialty: a.specialty,
        contextSize: a.maxContextChars
      }))
    });
    return;
  }

  // 3. 执行任务
  if (path === "/api/execute" && req.method === "POST") {
    const body = await parseReq(req);
    const { prompt, taskId } = body;

    if (!prompt) {
      sendJson(res, { error: "prompt is required" }, 400);
      return;
    }

    // 异步执行，客户端通过 SSE 监听进度
    platform.execute(prompt, { taskId }).catch((err) => {
      console.error("Task error:", err);
    });

    sendJson(res, {
      taskId: taskId || Math.random().toString(36).slice(2),
      status: "running",
      message: "Task started, listen to /api/events for progress"
    });
    return;
  }

  // 4. SSE 事件流
  if (path === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    connections.add(res);
    sendSSEEvent(res, "connected", { message: "Connected to MCP platform" });

    // 连接断开时清理
    req.on("close", () => {
      connections.delete(res);
    });
    return;
  }

  // 5. 获取任务列表
  if (path === "/api/tasks" && req.method === "GET") {
    const status = url.searchParams.get("status");
    sendJson(res, {
      tasks: platform.listTasks(status)
    });
    return;
  }

  // 6. 获取指定任务
  if (path.startsWith("/api/tasks/") && req.method === "GET") {
    const taskId = path.split("/")[3];
    const task = platform.getTask(taskId);
    if (task) {
      sendJson(res, { task });
    } else {
      sendJson(res, { error: "Task not found" }, 404);
    }
    return;
  }

  // 7. 停止任务
  if (path.startsWith("/api/tasks/") && req.method === "DELETE") {
    const taskId = path.split("/")[3];
    const stopped = platform.stop(taskId);
    sendJson(res, { success: stopped });
    return;
  }

  // 8. 回答问题
  if (path === "/api/feedback" && req.method === "POST") {
    const body = await parseReq(req);
    const { questionId, answer } = body;

    if (!questionId || !answer) {
      sendJson(res, { error: "questionId and answer are required" }, 400);
      return;
    }

    const success = platform.answerQuestion(questionId, answer);
    sendJson(res, { success });
    return;
  }

  // 9. 插件列表
  if (path === "/api/plugins" && req.method === "GET") {
    sendJson(res, {
      plugins: platform.listPlugins()
    });
    return;
  }

  // 10. 搜索插件
  if (path === "/api/plugins/search" && req.method === "GET") {
    const query = url.searchParams.get("q") || "";
    sendJson(res, {
      plugins: platform.searchPlugins(query)
    });
    return;
  }

  // 404
  sendJson(res, { error: "Not found" }, 404);
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`\n🌐 Server running on http://localhost:${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET  /health                - 健康检查`);
  console.log(`   GET  /api/agents           - 获取 Agent 列表`);
  console.log(`   POST /api/execute          - 执行任务`);
  console.log(`   GET  /api/events           - SSE 事件流`);
  console.log(`   GET  /api/tasks            - 获取任务列表`);
  console.log(`   GET  /api/tasks/:id        - 获取指定任务`);
  console.log(`   DELETE /api/tasks/:id      - 停止任务`);
  console.log(`   POST /api/feedback         - 回答 Agent 的问题`);
  console.log(`   GET  /api/plugins          - 获取插件列表`);
  console.log(`   GET  /api/plugins/search   - 搜索插件`);
  console.log(`\n💡 使用示例:`);
  console.log(`   curl -X POST http://localhost:${PORT}/api/execute \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"prompt":"三个 Agent 介绍自己"}'`);
  console.log(`\n   打开 /api/events 监听实时进度`);
  console.log("=".repeat(60));
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("\n\n👋 Shutting down...");
  await platform.destroy();
  server.close();
  process.exit(0);
});
