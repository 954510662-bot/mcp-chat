export default {
  agents: {
    openclaw: {
      enabled: true,
      maxContextLines: 1500,
      maxContextChars: 75000
    },
    claude_code: {
      enabled: true,
      maxContextLines: 2000,
      maxContextChars: 100000
    },
    hermes: {
      enabled: true,
      maxContextLines: 500,
      maxContextChars: 25000
    }
  },

  tools: {
    shell: {
      timeout: 30000
    },
    file: {
      sandbox: true,
      basePath: "./workspace"
    },
    fetch: {
      timeout: 30000
    }
  },

  platform: {
    maxConcurrentTasks: 3,
    defaultTimeout: 300000,
    enableFeedback: true,
    enablePlugins: true
  }
};
