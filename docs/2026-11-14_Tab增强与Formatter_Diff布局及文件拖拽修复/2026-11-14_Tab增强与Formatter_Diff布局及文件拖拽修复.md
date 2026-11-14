# 2026-11-14 Tab 增强与 Formatter/Diff 布局及文件分享拖拽修复

> 本文按本次提出的 5 项需求，整理实际实现、验证结果与遗留项。
> 验证结果：`npm run typecheck`、`npm run lint`、`cargo check`、`cargo clippy` 均通过；浏览器冒烟测试通过。

## 一、需求与实现概览

| # | 需求 | 实际改动 | 状态 |
|---|------|----------|------|
| 1 | Tab 功能太少 | 支持复制 Tab（独立状态）、拖拽排序、中键关闭、关闭右侧/其他/全部、溢出滚动、切换快捷键 | 完成 |
| 2 | Formatter 设计问题 | 重新归位操作入口；中间加入可拖拽分隔条；补上缩进选择 | 完成 |
| 3 | Diff 上下布局问题 | 输入区可拖拽调高、可一键收起；结果区成为主区域并补充统计 | 完成 |
| 4 | 文件分享拖拽问题 | 接入全页面拖拽、高亮覆盖层、去重提示；Tauri 改为路径拖拽 | 完成，需桌面端复验 |
| 5 | 文件分享启动流程 | 移除「开启服务」页，打开 Tab 自动启动；移除「服务自启」开关 | 完成 |

---

## 二、Tab 功能增强

### 2.1 数据模型

`src/stores/app.ts` 从 `openTabs: string[]` 改为 Tab 实例模型：

```ts
interface TabInstance {
  id: string        // 唯一实例 id
  moduleId: string  // 对应工具
}
```

- 首个实例 id 直接使用 `moduleId`。
- 复制出的实例 id 为 `${moduleId}::${uuid}`。
- 持久化升级为 `toolkit.json` 的 `tabsV2` 键，并兼容读取旧的 `openTabs` + `activeModuleId`。

### 2.2 行为变化

| 操作 | 当前行为 |
|------|----------|
| 侧边栏 / Ctrl+1..9 | 已打开则激活第一个实例，不会重复创建 |
| 右键 Duplicate Tab | 在源 Tab 右侧创建独立实例，并复制当前输入/配置 |
| `Ctrl+Shift+D` | 复制当前 Tab |
| 拖拽 Tab | 调整顺序，松手后持久化 |
| 中键点击 Tab | 关闭该 Tab |
| 右键 Close / Close Others / Close Tabs to the Right / Close All | 均已支持 |
| `Ctrl+W` | 关闭当前 Tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | 循环切换；同时兼容 `Ctrl+PageDown` / `Ctrl+PageUp` |
| 鼠标滚轮 | 在 Tab 栏横向滚动；激活项自动滚入视野 |
| 关闭全部 Tab | 显示空状态，不再自动重新打开第一个工具 |

### 2.3 独立状态实现

新增：

- `src/shared/composables/useCurrentTab.ts`：`TabHost` 通过 provide 注入当前 `tabId`。
- `src/shared/composables/useTabStore.ts`：按 `moduleId::tabId` 动态创建/销毁 Pinia store，并支持复制时的 seed。
- `src/shared/components/TabHost.vue`：按 Tab 渲染模块组件，卸载时释放该 Tab 的 store。

已改为按 Tab 隔离的模块：

- Formatter、Text Diff、Timestamp、Encryption、WebSocket、EXIF。
- `useWebSocket.ts` 中原来模块级的单个 `ws` 改为 `Map<tabId, WebSocket>`，每个 Tab 可独立连接、独立断开。

不参与复制的模块：

- Live Player、File Share、Shortcuts：`duplicatable: false`（播放器、端口、全局配置属于单例资源）。
- Encoding 使用组件局部状态，复制出来为空实例，但两个实例互不影响。

### 2.4 渲染方式

`src/App.vue` 移除了单个 `<router-view>` + `<KeepAlive>` 的渲染方式，改为按 `openTabs` 循环渲染 `TabHost`：

- 所有普通 Tab 保持挂载，用 `v-show` 切换，行为和原来的 KeepAlive 一致。
- `keepAlive === false` 的 Live 模块只在激活时渲染，切走即卸载。
- 路由仍保留，用于深链接和 URL 同步；切换复制 Tab 不再改变 URL。
- 路由注册从 `App.onMounted` 提前到 `main.ts`，避免首屏 `/` 无匹配警告。

---

## 三、Formatter 布局重排

### 3.1 操作入口调整

| 功能 | 修改后位置 |
|------|------------|
| JSON / XML / YAML | 顶部左侧 |
| 缩进 2/4 空格 | 顶部左侧，新增下拉选择 |
| Unescape | 顶部右侧次级按钮 |
| Compress Copy | 顶部右侧次级按钮（XML/YAML 禁用） |
| Format | 顶部右侧主按钮 |
| Copy | 只保留在输出卡片头，删除顶部重复按钮 |
| Wrap / Copy / Search | 输出卡片头（下载按钮已移除，Wrap/Copy 按钮放大到 32px） |
| Paste / Clear | 输入卡片头 |
| 校验徽标、输入统计 | 输入卡片头 |
| 输出行数、字符数、格式化耗时 | 输出卡片头 |
| Swap | 分隔条中央，跟随分隔条移动 |
| 错误信息 | 工具栏下方紧凑错误条；修改输入后自动消失 |

底部独立的 In/Out 统计行已删除，纵向空间让给编辑区。

### 3.2 可拖拽分栏

新增 `src/shared/components/SplitPane.vue`：

- 支持 `horizontal` / `vertical`。
- Pointer Events 拖拽，带最小/最大比例和像素宽度约束。
- 双击分隔条恢复默认 50%。
- 支持键盘 `←/→`、`Home` 调整，带 `role="separator"`。
- Formatter 分栏比例写入 `formatter:splitRatio`，重启后恢复。

相关文件：

- `src/modules/formatter/components/FormatterView.vue`
- `src/modules/formatter/components/FormatterToolbar.vue`
- `src/modules/formatter/components/FormatterOutputPane.vue`
- `src/modules/formatter/components/formatter-card.css`
- `src/modules/formatter/store.ts`

---

## 四、Text Diff 布局改造

- 输入区与结果区改为纵向 `SplitPane`：
  - 默认输入 28%，结果 72%。
  - 输入区最小 12%、最大 55%。
  - 双击分隔条恢复 28%，比例持久化到 `diff:splitRatio`。
- 工具栏新增「收起输入 / 展开输入」：
  - 收起后输入区完全隐藏，只显示「原文 N 行 · 修改后 M 行」摘要。
  - 展开后恢复收起前的比例。
  - 状态持久化到 `diff:inputCollapsed`。
- 对比结果头部新增：
  - `+新增 / -删除 / 未变` 统计。
  - Side by Side / Unified 切换从顶部工具栏移到结果头部。
- 输入面板头部新增行数统计、Paste、Clear。
- 结果为空时显示「粘贴两段文本后点击 Compare」。
- 新增 `src/modules/diff/components/DiffResultPane.vue`，承载结果区渲染、统计和双栏滚动同步；`DiffView.vue` 只负责工具栏、输入区和分栏。

相关文件：

- `src/modules/diff/components/DiffView.vue`
- `src/modules/diff/components/DiffResultPane.vue`（新增）
- `src/modules/diff/store.ts`

---

## 五、文件分享拖拽修复

### 5.1 根因与修改

- 根因一：`FileShareView.vue` 没有接入 `useFileDrop`，拖文件到页面没有任何反馈。
- 根因二：`tauri.conf.json` 中 `dragDropEnabled: false`，Tauri 不发送带绝对路径的拖拽事件，而 `register_shared_file` 需要文件路径。

修改：

- `src-tauri/tauri.conf.json`：`dragDropEnabled` 改为 `true`。
- `FileShareView.vue`：整个页面作为拖放目标，拖入时显示虚线高亮覆盖层「释放文件以添加到分享列表」。
- 拖放处理：
  - 过滤已存在的路径/同名文件。
  - 批量调用 `addManualFiles`。
  - 成功后提示「已添加 N 个文件，跳过 M 个重复项」。
  - 文件夹、失败项给出错误提示。
  - 设置弹窗、分享文本弹窗打开时忽略拖拽。
- 浏览器开发模式兜底：尝试读取非标准 `File.path`，读不到时提示使用「选择文件」。
- `useFileDrop.ts`：只有 `dataTransfer.types` 包含 `Files` 时才显示拖拽高亮，避免拖动选中文本时误触发。
- `fileshare.rs`：`register_shared_file` 增加 `is_file()` 校验，拒绝文件夹。
- `fileshare.rs`：新增 `shutdown_residual_file_share` 命令，用 Rust 侧 TCP 连接发送 `/__shutdown`，替代前端 `fetch`；端口无服务时静默返回 `false`，不再在控制台产生 `ERR_CONNECTION_REFUSED`。

### 5.2 兼容性说明

启用 Tauri 路径拖拽后，Windows WebView2 的 HTML5 DnD 会被接管，因此：

- Tab 排序使用 Pointer Events 实现，不依赖 HTML5 DnD。
- EXIF 拖拽继续走 `useFileDrop` 的 Tauri 路径分支，浏览器开发模式仍有 HTML5 兜底。
- 其他位置没有使用 `draggable` / `dragstart`。

### 5.3 启动页移除与自动启动

- 删除 FileShare 的「开启服务」空闲页，包括圆形启动按钮、关闭残留服务和打开上传目录入口。
- 首次挂载及每次 Tab 重新激活时自动调用 `startServer()`；已在运行则不重复启动。
- 启动前等待 `store.initialize()` 完成，避免用默认端口/路径启动，导致覆盖已保存设置。
- 移除设置中的「服务自启」开关及 `autoStart` 字段。
- 自动启动失败时在页面顶部展示错误，并提供「重试」按钮。

---

## 六、验证记录

已执行并通过：

```bash
npm run typecheck
npm run lint
cd src-tauri && cargo check
cd src-tauri && cargo clippy
```

`cargo clippy` 通过，仅保留 `exif.rs` 中既有的 7 条风格 warning，与本次改动无关。

浏览器冒烟测试（http://localhost:14200）：

- [x] 应用正常加载，侧边栏、TabBar、Formatter 正常渲染。
- [x] Formatter 左右面板之间存在可拖拽分隔条和居中 Swap 按钮。
- [x] 侧边栏切换到 Text Diff 正常。
- [x] 右键 Formatter Tab → Duplicate Tab 生成 `Formatter (2)`。
- [x] 第二个 Formatter Tab 输入内容后，第一个 Tab 仍为空，状态相互独立。
- [x] Text Diff 点击「收起输入」隐藏编辑器并显示行数摘要，点击「展开输入」恢复。
- [x] 控制台无 uncaught error。

未在浏览器环境验证：

- Tauri 原生文件拖拽（浏览器无法模拟 Tauri 路径事件）。
- 多显示器 / 高 DPI 下的拖拽命中测试。
- 实际桌面端 WebView2 中 `Ctrl+Tab` 是否会被系统截获。

建议在 `npm run tauri dev` 桌面端补测以上三项。

---

## 七、本次未纳入的项

- TabBar 的「+」工具选择按钮、`Ctrl+Shift+T` 恢复关闭的 Tab、Tab 固定（Pin）。
- Encoding 复制 Tab 时复制当前输入（目前为空实例）。
- File Share 应用重启后重新注册 `manualFiles` 到后端注册表。
- WebSocket 复制 Tab 只复制 URL，不复制连接和历史消息（符合设计）。
