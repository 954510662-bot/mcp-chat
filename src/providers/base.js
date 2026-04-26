export class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  async generateResponse() {
    throw new Error(`Provider ${this.name} does not implement generateResponse`);
  }
}
