# dsh-archived-sessions

一个 DeepSeek Harness (DSH) 插件：在 Web UI 的「设置」面板里查看、恢复、以及彻底删除**已归档（隐藏）的会话**。

## 为什么需要它

DSH 的会话右键菜单有「归档会话」，但当前版本（`0.1.0-rc.6`）**没有**查看或恢复已归档会话的入口——`dsh-client-ui-workspace` 的 README 原文是 *"No Session deletion or unarchive control"*。归档之后会话从侧边栏消失，且没有内置办法找回来。

本插件补上了这个能力，并且在「设置 → 已归档会话」里提供三个操作：

- **列出**：显示每个已归档会话的标题、所属工作区、会话 id。
- **恢复**：把会话从归档集合移除，立即回到侧边栏。
- **彻底删除**：二次确认后，从归档集合移除、从工作区会话清单 `detachSession`、并删除本地日志文件（`session.jsonl.zstd`，不可恢复）。

所有操作都走宿主的持久化写入，会触发 `domain/changed` → 前端实时刷新，**无需重启**。

## 特性

- 零构建：纯 JavaScript，不需要 TypeScript / tsdown / typert-generator。
- 宿主侧走 Typert 网关的 **SRC 模式**：只靠 `typertRemote` 绑定 + `Remote` 方法标记即可被自动发现，无需手写 manifest。
- 客户端 `dsh.client` bundle 挂载 `TYPERT_REMOTE` 后，用 `ctx.remote.<namespace>.<method>()` 调用宿主，codec 只需一个 `{ parse(value) }` 对象（不依赖 zod）。

## 目录结构

```
dsh-archived-sessions/
├── package.json      # dsh.client 声明 + exports
├── lib/
│   ├── index.js      # 宿主侧：ArchivedSessionsService（list / restore / removeSession）
│   └── client.js     # 浏览器侧：挂载 Remote + 注册 settings.section 页面
└── README.md
```

## 工作原理

### 宿主侧（`lib/index.js`）

`ArchivedSessionsService` 继承 `@deepseek-ai/dsh-typert-protocol` 的 `TypertRemoteService`，其构造器会自动设置 `typertRemote` 绑定（`{ service, serviceKey, namespace }`）。

因为纯 JS 无法在调用点产生 TC39 stage-3 装饰器的 `context.addInitializer`，这里**手工构造**了装饰器上下文并调用 `Remote(name)`，把方法标记注入 `remoteMethods()` 读到的私有 marker 表。Typert 网关的 SRC 发现据此把 `archivedSessions/list`、`archivedSessions/restore`、`archivedSessions/removeSession` 三个端点路由到本服务的方法。

关键点：

- 服务通过 `inject: ["workspaceRegistry", "sessionQuery", "sessionPersistence"]` 拿到宿主能力。
- `restore` 用 `workspaceRegistry.setState()` 把 id 从 `archivedSessionIds` 里去掉（持久化 + 更新内存缓存）。
- `removeSession` 额外用 `workspace.detachSession(id)` 从工作区清单移除，并用 `sessionPersistence.locate(header)` 找到日志文件路径后 `node:fs/promises` 的 `rm` 删除。

### 浏览器侧（`lib/client.js`）

一个标准的 `dsh.client` 工厂 bundle：

1. `require("react")`（平台 seed 模块，无需打包）。
2. 定义 `TYPERT_REMOTE`（3 个 descriptor，codec 用 `mode: "strict"` + 带 `parse()` 的普通对象）。
3. `apply(ctx)` 里 `await ctx.remote.$mount(TYPERT_REMOTE)`，然后 `ctx.get("remote.archivedSessions")` 拿到命名空间服务。
4. 用 `ctx.slots` 在 `settings.section` 注册「已归档会话」页面。

## 安装

### 方式 A：手动（最简单）

1. 本地开发安装（推荐）：

   ```powershell
   dsh plugin --profile web add link:../../../Desktop/other/dsh/dsh-archived-sessions
   ```

2. 编辑 `~/.dsh/profiles/web/cordis.patch.yml`，加入：

   ```yaml
   - insert:
       - id: archived-sessions
         name: dsh-archived-sessions
   ```

3. 重启 DSH。

> 注意：`cordis.patch.yml` 是 profile 的用户补丁层；`cordis.yml` 顶部注释明确写着 "Edit cordis.patch.yml, not this file."。插件必须能被 `require.resolve('<name>/package.json')` 从 `ctx.baseUrl`（`profiles/web/`）解析到，所以放在 `profiles/node_modules` 里。

### 方式 B：接入 pnpm workspace

把本目录加进 profile 的 `pnpm-workspace.yaml` 的 `packages` 列表并 `pnpm install`，再用上面同样的 patch 条目挂载。

## 运行时依赖（宿主侧服务）

插件不打包任何依赖，宿主必须已提供以下 Cordis 服务（`@deepseek-ai/dsh-base` / `@deepseek-ai/dsh-web-app` 默认都有）：

- `workspaceRegistry`、`sessionQuery`、`sessionPersistence`（宿主侧）
- `remote`（api-gateway 客户端）、`slots`（浏览器侧）
- `@deepseek-ai/dsh-typert-protocol`（宿主侧 import）

## 发布

包名已使用社区命名 `dsh-archived-sessions`。发布到 npm 前请确认 `package.json` 的 `repository` 指向本仓库；GitHub 仓库需打上 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic。

## License

MIT
