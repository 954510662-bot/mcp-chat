import { BaseProvider } from "./base.js";

export class EchoProvider extends BaseProvider {
  constructor() {
    super("echo");
  }

  async generateResponse({ member, userMessage, round }) {
    return `[${member.name}] round ${round}: I received "${userMessage}"`;
  }
}
