import { EventEmitter } from "node:events";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export class PluginInfo {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version || "1.0.0";
    this.type = config.type; // "agent" 或 "tool"
    this.author = config.author || "anonymous";
    this.description = config.description || "";
    this.category = config.category || "general";
    this.enabled = config.enabled !== false;
    this.installed = config.installed || false;
    this.path = config.path || null;
    this.capabilities = config.capabilities || [];
    this.dependencies = config.dependencies || [];
  }
}

export class PluginMarketplace extends EventEmitter {
  constructor(pluginsDir) {
    super();
    this.pluginsDir = pluginsDir || join(process.cwd(), "plugins");
    this.installedPlugins = new Map();
    this.availablePlugins = new Map();
    this.registry = [];
  }

  // 初始化 - 扫描已安装插件
  async init() {
    try {
      await this.scanInstalledPlugins();
      await this.loadRegistry();
    } catch (e) {
      console.log(`[PluginMarketplace] 初始化警告: ${e.message}`);
    }
  }

  // 扫描本地已安装插件
  async scanInstalledPlugins() {
    try {
      const files = await readdir(this.pluginsDir);
      for (const file of files) {
        if (file.endsWith(".js") || file.endsWith(".json")) {
          const plugin = await this.loadPluginManifest(join(this.pluginsDir, file));
          if (plugin) {
            this.installedPlugins.set(plugin.id, plugin);
          }
        }
      }
    } catch (e) {
      // 目录不存在，忽略
    }
  }

  // 加载插件清单
  async loadPluginManifest(path) {
    try {
      const content = await readFile(path, "utf8");
      const config = JSON.parse(content);
      return new PluginInfo({ ...config, path, installed: true });
    } catch (e) {
      return null;
    }
  }

  // 加载可用插件注册表
  async loadRegistry() {
    this.registry = [
      {
        id: "web_explorer",
        name: "Web Explorer",
        version: "1.0.0",
        type: "agent",
        author: "MCP Team",
        description: "网页浏览和信息检索专家",
        category: "research",
        capabilities: ["web_browse", "fetch", "scraper"],
        enabled: false
      },
      {
        id: "data_scientist",
        name: "Data Scientist",
        version: "1.0.0",
        type: "agent",
        author: "MCP Team",
        description: "数据分析和可视化专家",
        category: "data",
        capabilities: ["data_analysis", "visualization", "statistics"],
        enabled: false
      },
      {
        id: "git_master",
        name: "Git Master",
        version: "1.0.0",
        type: "agent",
        author: "MCP Team",
        description: "Git 版本控制专家",
        category: "devops",
        capabilities: ["git", "version_control", "code_review"],
        enabled: false
      },
      {
        id: "database_tool",
        name: "Database Tool",
        version: "1.0.0",
        type: "tool",
        author: "MCP Team",
        description: "数据库连接和查询工具",
        category: "data",
        enabled: false
      }
    ];

    for (const item of this.registry) {
      const plugin = new PluginInfo(item);
      this.availablePlugins.set(plugin.id, plugin);
    }
  }

  // 获取可用插件列表
  listAvailable(category = null) {
    let plugins = Array.from(this.availablePlugins.values());
    if (category) {
      plugins = plugins.filter(p => p.category === category);
    }
    return plugins;
  }

  // 获取已安装插件列表
  listInstalled() {
    return Array.from(this.installedPlugins.values());
  }

  // 获取插件信息
  getPlugin(pluginId) {
    return this.installedPlugins.get(pluginId) ||
           this.availablePlugins.get(pluginId) ||
           null;
  }

  // 安装插件（模拟）
  async install(pluginId) {
    const plugin = this.availablePlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    this.emit("plugin_installing", plugin);

    // 模拟安装过程
    plugin.installed = true;
    plugin.enabled = true;
    this.installedPlugins.set(pluginId, plugin);

    this.emit("plugin_installed", plugin);
    return plugin;
  }

  // 卸载插件
  async uninstall(pluginId) {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not installed: ${pluginId}`);
    }

    this.emit("plugin_uninstalling", plugin);

    plugin.installed = false;
    this.installedPlugins.delete(pluginId);

    this.emit("plugin_uninstalled", plugin);
    return true;
  }

  // 启用/禁用插件
  togglePlugin(pluginId, enabled) {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not installed: ${pluginId}`);
    }

    plugin.enabled = enabled;
    this.emit(enabled ? "plugin_enabled" : "plugin_disabled", plugin);
    return plugin;
  }

  // 检查插件是否可用
  isAvailable(pluginId) {
    return this.availablePlugins.has(pluginId);
  }

  // 检查插件是否已安装
  isInstalled(pluginId) {
    return this.installedPlugins.has(pluginId);
  }

  // 搜索插件
  search(query) {
    const lower = query.toLowerCase();
    return Array.from(this.availablePlugins.values()).filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower)
    );
  }

  // 获取分类列表
  getCategories() {
    const categories = new Set();
    this.availablePlugins.forEach(p => categories.add(p.category));
    return Array.from(categories);
  }
}

export const pluginMarketplace = new PluginMarketplace();
