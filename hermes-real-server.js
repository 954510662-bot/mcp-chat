import http from "http";
import { exec } from "child_process";
import { writeFile, readFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";

const PORT = 8787;
const WORKSPACE = "/root/hermes-workspace";

if (!existsSync(WORKSPACE)) mkdirSync(WORKSPACE, { recursive: true });

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("🤖 Hermes DevOps Agent running on 121.41.83.189");
    return;
  }

  if (req.method === "POST" && req.url === "/execute") {
    let body = "";
    for await (const chunk of req) body += chunk;

    try {
      const task = JSON.parse(body);
      const result = await handleTask(task);

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ status: "error", message: e.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

async function handleTask(task) {
  const instruction = task.instruction || "";
  const lower = instruction.toLowerCase();

  console.log(`[${new Date().toISOString()}] 收到任务: ${instruction}`);

  if (lower.includes("执行") || lower.includes("命令") || lower.includes("cmd") || lower.includes("run")) {
    const cmdMatch = instruction.match(/(?:执行|命令|run|cmd)[：: ]*(.+)/i);
    const cmd = cmdMatch ? cmdMatch[1].trim() : instruction.replace(/(执行|命令|run|cmd)/gi, "").trim();

    if (cmd) {
      return {
        status: "success",
        message: `🤖 Hermes 执行命令: ${cmd}\n\n${await execCmd(cmd)}`
      };
    }
  }

  if (lower.includes("写文件") || lower.includes("创建文件") || lower.includes("write file")) {
    const lines = instruction.split("\n");
    let filename = "output.txt";
    let content = instruction;

    for (const line of lines) {
      if (line.includes("文件名") || line.includes("文件名:") || line.includes("文件名:")) {
        filename = line.replace(/.*文件名[：:] */, "").trim();
      }
    }

    const filepath = `${WORKSPACE}/${filename}`;
    await writeFile(filepath, content);

    return {
      status: "success",
      message: `🤖 Hermes 已写文件: ${filepath}\n\n内容:\n${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`
    };
  }

  if (lower.includes("状态") || lower.includes("系统信息") || lower.includes("系统状态")) {
    const [uname, df, freeMem, uptime] = await Promise.all([
      execCmd("uname -a"),
      execCmd("df -h"),
      execCmd("free -h"),
      execCmd("uptime")
    ]);

    return {
      status: "success",
      message: `🤖 Hermes 系统状态 (服务器 121.41.83.189)\n\n━━━ 系统信息 ━━━\n${uname.trim()}\n\n━━━ 运行时间 ━━━\n${uptime.trim()}\n\n━━━ 内存 ━━━\n${freeMem.trim()}\n\n━━━ 磁盘 ━━━\n${df.trim()}`
    };
  }

  if (lower.includes("文件") || lower.includes("列表") || lower.includes("ls")) {
    const files = await execCmd("ls -la " + WORKSPACE);
    return {
      status: "success",
      message: `🤖 Hermes 工作区文件列表:\n\n${files}`
    };
  }

  return {
    status: "success",
    message: `🤖 Hermes DevOps Agent (运行于 121.41.83.189)\n\n我可以帮你:\n  • 执行命令 - "执行 ls -la"\n  • 写文件 - "写文件: 文件名 + 内容"\n  • 系统状态 - "查看系统状态"\n  • 列出文件 - "列出工作区文件"\n\n收到任务: ${instruction}`
  };
}

function execCmd(cmd) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve("❌ 命令执行超时"), 30000);
    exec(cmd, { cwd: WORKSPACE, timeout: 25000 }, (error, stdout, stderr) => {
      clearTimeout(timeout);
      if (error) {
        resolve(`❌ 错误: ${error.message}\n${stderr}`);
      } else {
        resolve(stdout || stderr || "(无输出)");
      }
    });
  });
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🤖 Hermes DevOps Agent running on port ${PORT}`);
  console.log(`📍 Workspace: ${WORKSPACE}`);
});
