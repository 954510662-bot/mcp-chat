import "dotenv/config";
import { createConnectorRegistry } from "./src/connectors/index.js";
import { healthCheckAll, formatHealthCheck } from "./src/utils/healthCheck.js";

const connectors = createConnectorRegistry();
console.log("开始健康检查...\n");
const results = await healthCheckAll(connectors);
console.log(formatHealthCheck(results));
