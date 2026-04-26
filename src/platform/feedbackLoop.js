import { EventEmitter } from "node:events";
import readline from "node:readline";

export class FeedbackQuestion {
  constructor({ agentId, question, context, options = null }) {
    this.id = Math.random().toString(36).slice(2);
    this.agentId = agentId;
    this.question = question;
    this.context = context || "";
    this.options = options; // 可选: ["是", "否"] 等选项
    this.answer = null;
    this.answeredAt = null;
    this.createdAt = Date.now();
    this.status = "pending"; // pending, answered, cancelled
  }
}

export class FeedbackLoop extends EventEmitter {
  constructor() {
    super();
    this.pendingQuestions = new Map();
    this.answeredQuestions = new Map();
    this.rl = null;
  }

  // Agent 发起询问
  async ask(agentId, question, options = null) {
    const q = new FeedbackQuestion({
      agentId,
      question,
      options
    });

    this.pendingQuestions.set(q.id, q);
    this.emit("question_pending", q);

    return new Promise((resolve) => {
      const checkAnswer = () => {
        if (q.status === "answered") {
          resolve(q.answer);
        } else if (q.status === "cancelled") {
          resolve(null);
        } else {
          setTimeout(checkAnswer, 100);
        }
      };
      checkAnswer();
    });
  }

  // 用户回答问题
  answer(questionId, answer) {
    const q = this.pendingQuestions.get(questionId);
    if (!q) return false;

    q.answer = answer;
    q.answeredAt = Date.now();
    q.status = "answered";

    this.pendingQuestions.delete(questionId);
    this.answeredQuestions.set(questionId, q);
    this.emit("question_answered", q);

    return true;
  }

  // 取消问题
  cancel(questionId) {
    const q = this.pendingQuestions.get(questionId);
    if (!q) return false;

    q.status = "cancelled";
    this.pendingQuestions.delete(questionId);
    this.emit("question_cancelled", q);

    return true;
  }

  // 获取待回答问题
  getPendingQuestions(agentId = null) {
    const questions = Array.from(this.pendingQuestions.values());
    if (agentId) {
      return questions.filter(q => q.agentId === agentId);
    }
    return questions;
  }

  // CLI 交互式提问
  async askInCLI(question) {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    return new Promise((resolve) => {
      const optionsText = question.options ?
        ` [${question.options.join("/")}]` : "";

      console.log(`\n🤔 ${question.agentId} 询问: ${question.question}${optionsText}`);

      this.rl.question("你的回答> ", (answer) => {
        this.answer(question.id, answer);
        resolve(answer);
      });
    });
  }

  // 清理
  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

export const feedbackLoop = new FeedbackLoop();
