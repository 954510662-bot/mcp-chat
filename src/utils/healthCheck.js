export async function checkEndpoint(url, timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeout);
    return {
      ok: response.ok,
      status: response.status,
      message: "在线"
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error.name === "AbortError" ? "超时" : "连接失败"
    };
  }
}

export async function healthCheckAll(connectors) {
  const results = [];

  for (const [name, connector] of connectors.entries()) {
    const endpoint = connector.endpoint || "本地";
    let health;

    if (connector.endpoint) {
      health = await checkEndpoint(connector.endpoint.replace("/execute", ""));
    } else if (name === "claude_code") {
      health = { ok: true, message: "本地 CLI" };
    } else {
      health = { ok: true, message: "Mock 模式" };
    }

    results.push({
      name,
      endpoint,
      status: health.ok ? "✅ 在线" : "❌ 离线",
      message: health.message,
      timeout: connector.timeoutMs
    });
  }

  return results;
}

export function formatHealthCheck(results) {
  const lines = ["\n📊 Agent 健康状态", "━━━━━━━━━━━━━━━━━━━━"];

  for (const r of results) {
    lines.push(`${r.status} ${r.name.toUpperCase()}`);
    lines.push(`   地址: ${r.endpoint}`);
    lines.push(`   状态: ${r.message}`);
    lines.push(`   超时: ${r.timeout}ms`);
    lines.push("");
  }

  return lines.join("\n");
}
