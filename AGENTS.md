# AGENTS.md — toolkit-desktop

## 项目概述

基于 **Tauri 2.0** 的桌面日常工具集，第一版包含 5 个工具模块：

| 模块 | 说明 |
|------|------|
| JSON / XML Formatter | JSON 和 XML 的格式化、压缩、校验、树形展示 |
| Timestamp Tool | 时间戳与日期互转、多时区支持 |
| WebSocket Debugger | WebSocket 连接、消息收发、协议调试 |
| Text Diff | 两段文本的差异对比，支持多种对比模式 |
| FLV Player | FLV 流媒体本地播放器 |

---

## 技术栈

| 层 | 技术选型 |
|----|----------|
| 后端 | Rust (Tauri 2.0) |
| 前端 | Vue 3 + TypeScript + Vite |
| 状态管理 | Pinia |
| UI 组件 | 自建组件体系（不引入外部 UI 库） |
| 样式 | UnoCSS + CSS Variables 主题系统 |
| 路由 | Vue Router (hash 模式) |
| FLV 播放 | 本地引入 flv.js (dist 文件置于 `src/lib/flv.js/`) |

---

## 核心原则

### 1. 本地优先
- **禁止使用 CDN 或远程依赖**，所有第三方库必须下载到仓库本地
- npm 包通过 `package.json` 管理，但需确认其本身不依赖运行时联网
- flv.js 等浏览器库以 dist 产物形式存放于 `src/lib/` 目录
- Rust 侧依赖通过 Cargo.toml 管理，均为本地编译

### 2. 模块化架构
每个工具是一个独立模块，遵循统一的模块注册协议。

### 3. 共用部分提取
所有跨工具共享的逻辑必须抽取到 `shared/` 或 `core/` 层，禁止工具间直接引用。

---

## 目录结构

```
toolkit-desktop/
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/             # Tauri commands (全局)
│   │   │   ├── mod.rs
│   │   │   └── ...
│   │   └── modules/              # Rust 侧工具模块
│   │       ├── mod.rs
│   │       ├── formatter/        # JSON/XML 格式化 Rust 逻辑
│   │       ├── timestamp/
│   │       ├── websocket/
│   │       ├── diff/
│   │       └── flv/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # Vue 3 前端
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件 (壳)
│   ├── router/
│   │   └── index.ts              # 路由配置 (动态注册模块路由)
│   ├── stores/                   # Pinia 全局 store
│   │   ├── app.ts                # 全局应用状态 (当前工具、主题等)
│   │   └── index.ts
│   │
│   ├── core/                     # 核心抽象层
│   │   ├── module-registry.ts    # 模块注册器 (设计模式: Registry)
│   │   ├── module.ts             # 模块接口定义
│   │   ├── event-bus.ts          # 事件总线 (设计模式: Observer / Pub-Sub)
│   │   ├── command-manager.ts    # 命令管理器 (设计模式: Command)
│   │   └── plugin-system.ts      # 插件系统 (设计模式: Plugin)
│   │
│   ├── shared/                   # 共用组件和工具 (跨模块共享)
│   │   ├── components/           # 通用 UI 组件
│   │   │   ├── ToolShell.vue     # 工具壳组件 (统一布局)
│   │   │   ├── TabBar.vue        # 工具标签栏
│   │   │   ├── CodeEditor.vue    # 代码编辑器组件
│   │   │   ├── Toolbar.vue       # 通用工具栏
│   │   │   ├── StatusBar.vue     # 状态栏
│   │   │   ├── JsonTreeView.vue  # JSON 树形视图
│   │   │   ├── MonacoWrapper.vue # Monaco Editor 封装
│   │   │   └── ...
│   │   ├── composables/          # Vue 组合式函数
│   │   │   ├── useClipboard.ts
│   │   │   ├── useTheme.ts
│   │   │   ├── useNotification.ts
│   │   │   ├── useShortcuts.ts
│   │   │   └── useModule.ts      # 模块接入 Hook
│   │   ├── utils/                # 纯工具函数
│   │   │   ├── format.ts
│   │   │   ├── validator.ts
│   │   │   ├── clipboard.ts
│   │   │   └── storage.ts
│   │   ├── types/                # 共享类型定义
│   │   │   ├── module.ts
│   │   │   ├── common.ts
│   │   │   └── index.ts
│   │   └── styles/               # 全局样式
│   │       ├── variables.css     # CSS Variables (主题)
│   │       ├── reset.css
│   │       └── global.css
│   │
│   ├── lib/                      # 本地引入的第三方库 (非 npm)
│   │   └── flv.js/
│   │       └── flv.min.js
│   │
│   └── modules/                  # 工具模块目录 (每个模块自包含)
│       ├── index.ts              # 模块自动发现 & 注册
│       │
│       ├── formatter/
│       │   ├── index.ts          # 模块定义 & 注册
│       │   ├── meta.ts           # 模块元数据 (名称、图标、快捷键)
│       │   ├── components/
│       │   │   ├── FormatterView.vue
│       │   │   ├── JsonPanel.vue
│       │   │   ├── XmlPanel.vue
│       │   │   └── ...
│       │   ├── composables/
│       │   │   ├── useFormatter.ts
│       │   │   └── useValidation.ts
│       │   └── store.ts          # 模块内部 Pinia store
│       │
│       ├── timestamp/
│       │   ├── index.ts
│       │   ├── meta.ts
│       │   ├── components/
│       │   │   ├── TimestampView.vue
│       │   │   ├── Converter.vue
│       │   │   └── TimezoneTable.vue
│       │   ├── composables/
│       │   │   └── useTimestamp.ts
│       │   └── store.ts
│       │
│       ├── websocket/
│       │   ├── index.ts
│       │   ├── meta.ts
│       │   ├── components/
│       │   │   ├── WebsocketView.vue
│       │   │   ├── ConnectionPanel.vue
│       │   │   ├── MessageList.vue
│       │   │   └── SendPanel.vue
│       │   ├── composables/
│       │   │   ├── useWebSocket.ts
│       │   │   └── useMessageLog.ts
│       │   └── store.ts
│       │
│       ├── diff/
│       │   ├── index.ts
│       │   ├── meta.ts
│       │   ├── components/
│       │   │   ├── DiffView.vue
│       │   │   ├── SideBySide.vue
│       │   │   └── UnifiedView.vue
│       │   ├── composables/
│       │   │   └── useDiff.ts
│       │   └── store.ts
│       │
│       └── flv/
│           ├── index.ts
│           ├── meta.ts
│           ├── components/
│           │   ├── FlvPlayerView.vue
│           │   ├── VideoPlayer.vue
│           │   └── StreamInfo.vue
│           ├── composables/
│           │   └── useFlvPlayer.ts
│           └── store.ts
│
├── public/
│   └── icons/                    # 工具图标 (SVG)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── AGENTS.md
```

---

## 设计模式

### Registry 模式 — 模块注册

```
// src/core/module.ts — 模块接口
export interface ToolModule {
  id: string
  name: string
  icon: string
  shortcut?: string
  route: RouteRecordRaw
  store?: () => StoreDefinition
  onActivate?(): void
  onDeactivate?(): void
}
```

```
// src/core/module-registry.ts
单例注册中心，所有模块在启动时调用 register() 注册自身
模块切换时调用 onDeactivate / onActivate 生命周期钩子
```

### Observer / Pub-Sub — 事件总线

```
// src/core/event-bus.ts
跨模块通信的唯一通道
事件类型定义在 shared/types/events.ts
禁止模块间直接 import 其他模块的内部代码
```

### Command 模式 — 操作管理

```
// src/core/command-manager.ts
用于 Undo/Redo、批量操作等场景
每个操作封装为 Command 对象 (execute / undo)
```

### Plugin 模式 — 扩展点

```
// src/core/plugin-system.ts
为未来工具扩展预留的插件机制
插件通过 definePlugin() 声明，注册到模块注册器
```

---

## 模块注册协议

每个模块必须包含以下文件：

| 文件 | 职责 |
|------|------|
| `index.ts` | 导出 `defineModule()` 调用结果，注册路由和 store |
| `meta.ts` | 导出模块元数据 `{ id, name, icon, shortcut }` |
| `components/` | 模块私有组件 |
| `composables/` | 模块私有组合式函数 |
| `store.ts` | 模块内部 Pinia store (可选) |

模块自动注册流程：

```ts
// src/modules/index.ts
const moduleFiles = import.meta.glob('./*/index.ts', { eager: true })
Object.values(moduleFiles).forEach(mod => {
  if (mod.default) moduleRegistry.register(mod.default)
})
```

---

## 共用部分清单

以下内容属于 `shared/`，任何模块均可引用：

| 类别 | 内容 |
|------|------|
| 组件 | ToolShell, TabBar, CodeEditor, Toolbar, StatusBar, JsonTreeView, MonacoWrapper |
| Composables | useClipboard, useTheme, useNotification, useShortcuts, useModule |
| Utils | format, validator, clipboard, storage |
| Types | module, common, events |
| Styles | variables.css, reset.css, global.css |

**禁止**：
- 模块 A 直接 import 模块 B 的任何文件
- shared 层 import modules 层
- 任何地方使用 `window.location` 或 `fetch` 请求远程资源

---

## Tauri Commands 约定

Rust 侧 Tauri Commands 按职责分组到 `src-tauri/src/modules/` 下：

| 模块 | Commands |
|------|----------|
| formatter | `format_json`, `format_xml`, `validate_json`, `validate_xml` |
| timestamp | `get_system_timestamp`, `convert_timestamp` |
| websocket | WebSocket 在前端直接处理，无需 Tauri command |
| diff | `compute_diff` (大文本差异计算卸载到 Rust) |
| flv | 文件路径读取等系统级操作 |

所有 Commands 在 `src-tauri/src/lib.rs` 中统一注册。

---

## 主题系统

使用 CSS Variables 实现：

```css
/* src/shared/styles/variables.css */
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-accent: #3b82f6;
  --color-border: #e5e7eb;
  /* ... */
}

[data-theme="dark"] {
  --color-bg-primary: #1a1a1a;
  --color-text-primary: #e5e7eb;
  --color-accent: #60a5fa;
  --color-border: #374151;
}
```

通过 `useTheme()` composable 切换，状态持久化到 localStorage。

---

## 开发规范

### 命名规范
- 组件：PascalCase (`JsonPanel.vue`)
- Composables：`use` 前缀 (`useFormatter.ts`)
- Store：模块名 + Store (`formatterStore`)
- Types：PascalCase 接口，文件 kebab-case
- CSS 类名：BEM 或 kebab-case

### TypeScript 严格模式
- `strict: true`
- 禁止 `any`，使用 `unknown` + 类型守卫
- 所有公共 API 必须有类型声明

### 代码组织
- 单个文件不超过 300 行，超出则拆分
- 组件内部逻辑通过 composables 抽离
- 纯函数与副作用分离

---

## 构建与运行

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建
npm run tauri build

# 前端类型检查
npm run typecheck

# 前端 lint
npm run lint

# Rust 检查
cd src-tauri && cargo check
```

---

## Lint / Typecheck

每次代码变更后必须运行：

```bash
npm run lint && npm run typecheck
```

Rust 侧变更后：

```bash
cd src-tauri && cargo clippy && cargo check
```

---

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
