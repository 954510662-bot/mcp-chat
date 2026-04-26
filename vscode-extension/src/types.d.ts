declare module 'mcp-chat-core' {
  export class MultiAgentPlatform {
    constructor(config?: any);
    init(): Promise<void>;
    execute(prompt: string, options?: any): Promise<any>;
    listAgents(): any[];
    getAgent(agentId: string): any;
    stop(taskId: string): boolean;
    listTasks(status?: string): any[];
    getTask(taskId: string): any;
    on(event: string, callback: (data: any) => void): void;
    destroy(): Promise<void>;
  }
}
