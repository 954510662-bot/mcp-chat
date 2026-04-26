import { EchoProvider } from "./echo.js";
import { OpenAIProvider } from "./openai.js";

export function createProviderRegistry() {
  const openai = new OpenAIProvider();
  const echo = new EchoProvider();

  return new Map([
    ["openai", openai],
    ["echo", echo]
  ]);
}
