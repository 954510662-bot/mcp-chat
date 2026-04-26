import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

function jsonRpcError(res, code, message) {
  res.status(400).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null
  });
}

function isAuthorized(req, authToken) {
  if (!authToken) {
    return true;
  }
  const raw = req.headers.authorization;
  if (!raw?.startsWith("Bearer ")) {
    return false;
  }
  const token = raw.slice("Bearer ".length).trim();
  return token === authToken;
}

export async function startHttpServer({ buildServer, port }) {
  const app = createMcpExpressApp();
  const transports = new Map();
  const authToken = process.env.MCP_AUTH_TOKEN;

  app.use("/mcp", (req, res, next) => {
    if (!isAuthorized(req, authToken)) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null
      });
      return;
    }
    next();
  });

  app.post("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      let transport = sessionId ? transports.get(sessionId) : null;

      if (!transport) {
        if (sessionId) {
          jsonRpcError(res, -32000, "Invalid session ID");
          return;
        }

        if (!isInitializeRequest(req.body)) {
          jsonRpcError(res, -32000, "Missing initialize request");
          return;
        }

        const server = buildServer();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, transport);
          }
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) {
            transports.delete(sid);
          }
        };

        await server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("HTTP MCP request failed:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error"
          },
          id: null
        });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports.has(sessionId)) {
      jsonRpcError(res, -32000, "Invalid or missing session ID");
      return;
    }
    await transports.get(sessionId).handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports.has(sessionId)) {
      jsonRpcError(res, -32000, "Invalid or missing session ID");
      return;
    }
    await transports.get(sessionId).handleRequest(req, res);
  });

  app.listen(port, (error) => {
    if (error) {
      console.error("Failed to start HTTP transport:", error);
      process.exit(1);
    }
    const authState = authToken ? "enabled" : "disabled";
    console.error(`mcp-chat-server running on streamable HTTP :${port}/mcp (auth ${authState})`);
  });
}
