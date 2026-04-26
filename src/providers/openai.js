import { BaseProvider } from "./base.js";

function toChatMessages(transcript, member, userMessage) {
  const context = transcript.slice(-12).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: `${m.speaker}: ${m.content}`
  }));

  return [
    {
      role: "system",
      content: `${member.rolePrompt}\nKeep responses concise and relevant to the latest user goal.`
    },
    ...context,
    {
      role: "user",
      content: `User prompt: ${userMessage}`
    }
  ];
}

export class OpenAIProvider extends BaseProvider {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model = process.env.DEFAULT_MODEL ?? "gpt-4o-mini",
    timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS ?? 25000),
    retries = Number(process.env.PROVIDER_RETRIES ?? 2)
  } = {}) {
    super("openai");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
    this.timeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : 25000;
    this.retries = Number.isFinite(retries) ? retries : 2;
  }

  async generateResponse({ transcript, member, userMessage }) {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.model,
            temperature: 0.7,
            messages: toChatMessages(transcript, member, userMessage)
          })
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(`OpenAI provider error (${response.status}): ${details}`);
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content?.trim() ?? "";
      } catch (error) {
        lastError = error;
        if (attempt < this.retries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `OpenAI provider failed after ${this.retries + 1} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
}
