import http from "http";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/execute") {
    let body = "";
    for await (const chunk of req) body += chunk;

    const task = JSON.parse(body);
    console.log("[" + new Date().toLocaleString() + "] 收到任务: " + task.instruction);

    const response = {
      status: "success",
      message: "🤖 Hermes (云服务器 121.41.83.189) 已处理\n任务: " + task.instruction + "\n时间: " + new Date().toLocaleString()
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Hermes Agent is running! 服务器: 121.41.83.189");
});

const PORT = 8787;
server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Hermes 服务已启动: http://0.0.0.0:" + PORT);
  console.log("📍 公网地址: http://121.41.83.189:" + PORT);
});
