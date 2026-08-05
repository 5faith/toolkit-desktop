# AGENTS.md — toolkit-desktop

## 项目概述

基于 **Tauri 2.0** 的桌面日常工具集，当前包含 6 个工具模块：

| 模块 | 说明 |
|------|------|
| JSON / XML Formatter | JSON 和 XML 的格式化、压缩、校验 |
| Timestamp Tool | 时间戳与日期互转 |
| WebSocket Debugger | WebSocket 连接、消息收发、协议调试 |
| Text Diff | 两段文本的差异对比 |
| Live Player | RTMP/RTSP/FLV 流媒体本地播放器 |
| Encryption | UUID 生成、MD5 哈希、AES-256 加解密 |

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
| FLV 播放 | 本地引入 mpegts.js (dist 文件置于 `src/lib/mpegts.js/`) |

---

## 核心原则

### 1. 本地优先
- **禁止使用 CDN 或远程依赖**，所有第三方库必须下载到仓库本地
- npm 包通过 `package.json` 管理，但需确认其本身不依赖运行时联网
- mpegts.js 等浏览器库以 dist 产物形式存放于 `src/lib/` 目录
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
│   │   ├── commands/             # Tauri commands
│   │   │   ├── mod.rs
│   │   │   ├── formatter.rs      # format_json, format_xml, validate_json, validate_xml
│   │   │   ├── timestamp.rs      # get_system_timestamp, convert_timestamp
│   │   │   ├── diff.rs           # compute_diff
│   │   │   ├── flv.rs            # read_local_file
│   │   │   ├── live.rs           # start_stream_proxy, stop_stream_proxy
│   │   │   ├── exif.rs           # read_exif_metadata
│   │   │   └── fileshare.rs      # 文件分享相关
│   │   └── modules/              # Rust 侧工具模块 (占位)
│   │       ├── mod.rs
│   │       ├── formatter/mod.rs
│   │       ├── timestamp/mod.rs
│   │       ├── diff/mod.rs
│   │       └── flv/mod.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # Vue 3 前端
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件 (侧边栏 + 路由 + 状态栏)
│   ├── env.d.ts                  # TypeScript 声明 (Vue SFC, flv.js)
│   │
│   ├── router/
│   │   └── index.ts              # 路由配置 (动态注册模块路由)
│   │
│   ├── stores/                   # Pinia 全局 store
│   │   ├── index.ts              # createPinia()
│   │   └── app.ts                # activeModuleId, theme, sidebarCollapsed
│   │
│   ├── core/                     # 核心抽象层
│   │   ├── module.ts             # ToolModule 接口定义
│   │   ├── module-registry.ts    # 模块注册器 (Registry 模式, 单例)
│   │   ├── event-bus.ts          # 事件总线 (Pub-Sub 模式, 单例)
│   │   ├── command-manager.ts    # 命令管理器 (Command 模式, 单例)
│   │   └── plugin-system.ts      # 插件系统 (Plugin 模式, 预留)
│   │
│   ├── shared/                   # 共用层 (跨模块共享)
│   │   ├── components/
│   │   │   ├── ToolShell.vue     # 布局壳 (sidebar + content + statusbar)
│   │   │   ├── CodeEditor.vue    # 代码编辑器 (textarea + v-model)
│   │   │   ├── Toolbar.vue       # 通用工具栏
│   │   │   ├── TabBar.vue        # 标签栏
│   │   │   └── StatusBar.vue     # 状态栏
│   │   ├── composables/
│   │   │   ├── useClipboard.ts   # 剪贴板复制 + 自动重置
│   │   │   ├── useModule.ts      # 模块访问 Hook
│   │   │   ├── useNotification.ts # Toast 通知系统
│   │   │   ├── useShortcuts.ts   # 全局快捷键注册
│   │   │   └── useTheme.ts       # 主题切换 (light/dark/system)
│   │   ├── utils/
│   │   │   ├── clipboard.ts      # copyToClipboard()
│   │   │   ├── format.ts         # formatDate(), formatNumber(), formatBytes()
│   │   │   ├── storage.ts        # localStorage 封装
│   │   │   └── validator.ts      # isValidJson(), isValidUrl(), isNonEmpty()
│   │   ├── types/
│   │   │   ├── index.ts          # Barrel export
│   │   │   ├── common.ts         # ThemeMode, NotificationOptions, ClipboardResult
│   │   │   ├── events.ts         # AppEvents 接口
│   │   │   └── module.ts         # Re-exports ToolModule, ModuleMeta
│   │   └── styles/
│   │       ├── variables.css     # CSS Variables (light/dark 主题)
│   │       ├── reset.css         # CSS Reset
│   │       └── global.css        # 全局样式
│   │
│   ├── lib/                      # 本地第三方库
│   │   └── mpegts.js/
│   │       ├── mpegts.min.js     # mpegts.js UMD 打包产物
│   │       └── index.d.ts        # TypeScript 类型声明
│   │
│   └── modules/                  # 工具模块 (每个模块自包含)
│       ├── index.ts              # 模块聚合 & registerAllModules()
│       │
│       ├── formatter/
│       │   ├── index.ts          # 模块定义 & 路由注册
│       │   ├── meta.ts           # { id: 'formatter', name: 'Formatter', icon: '{}', shortcut: 'Ctrl+1' }
│       │   ├── store.ts          # Pinia store
│       │   ├── components/
│       │   │   └── FormatterView.vue
│       │   └── composables/
│       │       ├── useFormatter.ts
│       │       └── useValidation.ts
│       │
│       ├── timestamp/
│       │   ├── index.ts
│       │   ├── meta.ts           # { id: 'timestamp', icon: '⏱', shortcut: 'Ctrl+2' }
│       │   ├── store.ts
│       │   ├── components/
│       │   │   └── TimestampView.vue
│       │   └── composables/
│       │       └── useTimestamp.ts
│       │
│       ├── websocket/
│       │   ├── index.ts
│       │   ├── meta.ts           # { id: 'websocket', icon: '🔌', shortcut: 'Ctrl+3' }
│       │   ├── store.ts
│       │   ├── components/
│       │   │   └── WebsocketView.vue
│       │   └── composables/
│       │       ├── useWebSocket.ts
│       │       └── useMessageLog.ts
│       │
│       ├── diff/
│       │   ├── index.ts
│       │   ├── meta.ts           # { id: 'diff', name: 'Text Diff', icon: '⇄', shortcut: 'Ctrl+4' }
│       │   ├── store.ts
│       │   ├── components/
│       │   │   └── DiffView.vue
│       │   └── composables/
│       │       └── useDiff.ts
│       │
│       ├── flv/
│       │   ├── index.ts
│       │   ├── meta.ts           # { id: 'live', name: 'Live Player', icon: '📡', shortcut: 'Ctrl+5' }
│       │   ├── store.ts
│       │   ├── components/
│       │   │   └── FlvPlayerView.vue
│       │   └── composables/
│       │       └── useFlvPlayer.ts
│       │
│       └── encrypt/
│           ├── index.ts
│           ├── meta.ts           # { id: 'encrypt', name: 'Encryption', icon: '🔐', shortcut: 'Ctrl+6' }
│           ├── store.ts
│           ├── components/
│           │   └── EncryptView.vue
│           └── composables/
│               └── useEncrypt.ts  # UUID, MD5, AES-256-CBC (Web Crypto API)
│
├── public/
│   └── icons/                    # SVG 图标
│       ├── toolkit.svg           # 软件主图标
│       ├── formatter.svg
│       ├── timestamp.svg
│       ├── websocket.svg
│       ├── diff.svg
│       ├── flv.svg
│       ├── settings.svg
│       └── theme.svg
│
├── .github/
│   └── workflows/
│       └── release.yml           # CI/CD: 多平台构建 & GitHub Release
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── uno.config.ts
└── AGENTS.md
```

---

## 设计模式

### Registry 模式 — 模块注册

```ts
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

```ts
// src/core/module-registry.ts
// 单例注册中心，所有模块在启动时调用 register() 注册自身
// 模块切换时调用 onDeactivate / onActivate 生命周期钩子
```

### Observer / Pub-Sub — 事件总线

```ts
// src/core/event-bus.ts
// 跨模块通信的唯一通道
// 事件类型定义在 shared/types/events.ts
// 禁止模块间直接 import 其他模块的内部代码
```

### Command 模式 — 操作管理

```ts
// src/core/command-manager.ts
// 用于 Undo/Redo、批量操作等场景
// 每个操作封装为 Command 对象 (execute / undo)
```

### Plugin 模式 — 扩展点

```ts
// src/core/plugin-system.ts
// 为未来工具扩展预留的插件机制
// 插件通过 definePlugin() 声明，注册到模块注册器
```

---

## 模块注册协议

每个模块必须包含以下文件：

| 文件 | 职责 |
|------|------|
| `index.ts` | 导出 `ToolModule` 对象，注册路由 |
| `meta.ts` | 导出模块元数据 `{ id, name, icon, shortcut }` |
| `components/` | 模块私有组件 |
| `composables/` | 模块私有组合式函数 |
| `store.ts` | 模块内部 Pinia store (可选) |

模块注册流程：

```ts
// src/modules/index.ts
import formatterModule from './formatter'
import timestampModule from './websocket'
// ...
const modules: ToolModule[] = [formatterModule, timestampModule, ...]
export function registerAllModules() {
  modules.forEach(mod => moduleRegistry.register(mod))
}
```

---

## 共用部分清单

以下内容属于 `shared/`，任何模块均可引用：

| 类别 | 内容 |
|------|------|
| 组件 | ToolShell, CodeEditor, Toolbar, TabBar, StatusBar |
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

Rust 侧 Tauri Commands 在 `src-tauri/src/commands/` 下：

| 模块 | Commands | 实现文件 |
|------|----------|----------|
| formatter | `format_json`, `format_xml`, `validate_json`, `validate_xml` | `commands/formatter.rs` |
| timestamp | `get_system_timestamp`, `convert_timestamp` | `commands/timestamp.rs` |
| diff | `compute_diff` | `commands/diff.rs` |
| flv | `read_local_file` | `commands/flv.rs` |
| live | `start_stream_proxy`, `stop_stream_proxy` | `commands/live.rs` |

所有 Commands 在 `src-tauri/src/lib.rs` 中统一注册。

---

## 主题系统

使用 CSS Variables 实现：

```css
/* src/shared/styles/variables.css */
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #111827;
  --color-accent: #3b82f6;
  --color-border: #e5e7eb;
  /* ... */
}

[data-theme="dark"] {
  --color-bg-primary: #111827;
  --color-text-primary: #f9fafb;
  --color-accent: #60a5fa;
  --color-border: #374151;
}
```

通过 `useTheme()` composable 切换，状态持久化到 localStorage。

---

## 开发规范

### 命名规范
- 组件：PascalCase (`FormatterView.vue`)
- Composables：`use` 前缀 (`useEncrypt.ts`)
- Store：模块名 + Store (`useEncryptStore`)
- Types：PascalCase 接口，文件 kebab-case
- CSS 类名：BEM (`encrypt-view__toolbar`, `mode-tab--active`)

### TypeScript 严格模式
- `strict: true`
- 禁止 `any`，使用 `unknown` + 类型守卫
- 所有公共 API 必须有类型声明

### 代码组织
- 单个文件不超过 300 行，超出则拆分
- 组件内部逻辑通过 composables 抽离
- 纯函数与副作用分离

---

## 版本升级

发布新版本时需要同步修改以下 4 个文件中的 `version` 字段：

| 文件 | 位置 | 示例 |
|------|------|------|
| `package.json` | 第 2 行 `"version"` | `"version": "0.3.0"` |
| `package-lock.json` | 第 2 行顶层 `"version"` + 第 9 行 `""` 包的 `"version"` (两处) | `"version": "0.3.0"` |
| `src-tauri/Cargo.toml` | 第 3 行 `version` | `version = "0.3.0"` |
| `src-tauri/tauri.conf.json` | 第 4 行 `"version"` | `"version": "0.3.0"` |

**注意**：`package-lock.json` 有两处版本号需要修改（顶层和 `""` 包），可用 `npm version` 自动更新前两个文件，但 `Cargo.toml` 和 `tauri.conf.json` 需手动修改。

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

---

## 前端侧已知问题

### mpegts.js UMD 加载方式

`src/lib/mpegts.js/mpegts.min.js` 是 UMD 格式库，**不能**通过 Vite 的 `import()` 动态导入。

**原因**：Vite 在构建时会将 `import()` 包装为 ES module 的 namespace 对象，导致 UMD IIFE 中 `window` 全局对象引用被遮蔽，`window.mpegts` 永远不会被设置，运行时报错 `"mpegts.js loaded but not found on window"`。

**正确做法**：通过 `<script>` 标签加载 UMD 库，确保 IIFE 直接执行到 `window.mpegts`：

```ts
await new Promise<void>((resolve, reject) => {
  const script = document.createElement('script')
  script.src = new URL('@/lib/mpegts.js/mpegts.min.js', import.meta.url).href
  script.onload = () => resolve()
  script.onerror = () => reject(new Error('Failed to load mpegts.js'))
  document.head.appendChild(script)
})
const mpegts = (window as Record<string, unknown>).mpegts as MpegtsStatic
```

---

## Rust 侧已知问题

### kamadak-exif API 注意事项 (v0.5)

`kamadak-exif` crate 的 `Field` 类型 API 与直觉不符：

- **`field.rational()` 和 `field.get_uint()` 是私有方法**，不能直接调用
- 正确方式：使用 `field.value.rational()` 和 `field.value.get_uint(0)`，其中 `field.value` 是 `exif::Value` 类型
- 简单字段（字符串类）直接用 `field.display_value().to_string()` 即可
- Tag 枚举名与常见命名不同：`ISOSpeedRatings` 在此 crate 中是 `Tag::ISOSpeed`
- 建议封装 `get_display()` 辅助函数统一处理字符串类字段

#### Tag 枚举名陷阱
- `Tag::SerialNumber` 不存在 → 用 `Tag::BodySerialNumber`
- `Tag::LensSerialNumber` 可正常工作
- 类似地，其他 Tag 名称也可能与常见命名不同，编译器报错时按提示的 similar name 修正

### WSL 环境限制

`cargo check` / `cargo clippy` 在 WSL 上会因缺少 GTK 系统依赖（`pkg-config`, `libgtk-3-dev`, `libglib2.0-dev` 等）而失败。这是环境问题，不是代码问题。CI/CD 在 Windows 上构建不受影响。

---

## CI/CD 已知问题

### Portable ZIP 上传到 Release

`tauri-apps/tauri-action` 和 `softprops/action-gh-release` **不能混用**来操作同一个 Release：

- `tauri-apps/tauri-action` 创建 Release 后，其他 action（如 `softprops/action-gh-release`）会报 `Resource not accessible by integration` 错误
- `gh release upload` 对 `tauri-apps/tauri-action` 创建的 Release 静默成功但文件未上传

**解决方案**：使用 GitHub REST API 直接上传 Release Asset：

```yaml
# 获取 Release ID
RELEASE_ID=$(gh api "repos/${{ github.repository }}/releases/tags/${TAG}" --jq '.id')

# 使用 uploads API 上传
curl -sL \
  -X POST \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Content-Type: application/zip" \
  -T "${ZIP_PATH}" \
  "https://uploads.github.com/repos/${{ github.repository }}/releases/${RELEASE_ID}/assets?name=${ZIP_NAME}"
```

### ffmpeg 下载源

`gyan.dev` 服务器不稳定，CI 中会返回 503。已改用 BtbN GitHub 托管构建：
`https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip`
