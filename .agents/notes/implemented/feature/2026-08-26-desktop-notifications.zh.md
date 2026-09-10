# Agent Note: 会话状态切换的桌面通知与点击聚焦

Status: implemented

[English](2026-08-26-desktop-notifications.md) | 中文

## 问题

当某个会话需要操作者介入或完成工作时，若其标签页处于后台，Web GUI 不会给出任何带外信号。操作者把任务委托出去后切到别的标签页，只有回到本标签页才能发现某会话在等待审批、有问题待答或已经完成——这违背了切走的初衷。浏览器桌面通知是天然的通道，但有两点约束决定了设计：Web Notifications API 要求一次用户手势来请求权限（页面加载时请求会被 Firefox 72+/Safari 拒绝，并被 Lighthouse 标记），且 `useSyncExternalStore` 的选择器必须保持纯净——选择器里的副作用既违反契约，又会在选择结果为常量时跳过重渲染。

## 决定

在应用根部放置一个 `DesktopNotifications` 副作用组件，它不渲染任何内容，并在标签页隐藏（`document.hidden`）时针对两种切换触发浏览器通知：一个新的挂起交互到来（approval / plan-review / question），以及某个会话停止工作（running → idle）。

选择器在 Client 暴露的两个框架数据源上保持纯净：会话列表（`ctx.sessions.list`）投影出逐会话的 `{ id, title, running }` 表面，相等判断仅基于 `id` + `running`；而 `uiSession` 服务的 `pendingInteractions` 映射作为独立快照读取（仅在交互到来或清除时替换引用）。一个以两个切片为依赖的 `useEffect` 与上一份 ref 做差分并触发通知。`notify()` 在 `Notification.permission !== 'granted'` 或标签页可见时直接返回；权限在第一次 `pointerdown`（一次用户手势）时请求，绝不在加载时请求；且 `Notification` 实例的 `onclick` 调用 `window.focus()`，使点击通知在 Windows 上（Chrome/Edge/Firefox）把 harness 标签页及其窗口带到前台。通知标题由 locale 拥有：按挂起交互的 `kind` 判别键在 `renderer` 命名空间词典中解析（遵循 [客户端 UI 文案归 locale 所有的决策](../architecture/2026-08-23-locale-owned-client-ui-copy.zh.md)）。

"Done" 以 `running` 切换（busy → idle）为依据——而非 `SessionSummary.completed`，后者按 [完成提醒点笔记](../../archived/feature/2026-08-06-session-completed-done-dot.md) 只为未被选中的会话置位，因此对操作者正在观看的会话永不触发。当会话停止是为了请求交互时，"Done" 被抑制，使一次切换不会同时叠出 "Done" 与 "Waiting for approval" 两条通知。

## 考虑过的替代方案

- **把副作用放进 uSES 选择器。** 最初实现把 `new Notification()` 与切换检测放在选择器内并返回 `null`；`useSyncExternalStore` 随即把常量选择视为未变并跳过重渲染，使副作用只在 store 变更探测中运行，脱离 React 生命周期，在 StrictMode 与并发渲染下脆弱。在派生表面上挂 effect 的模式让选择器保持纯净，并在 effect 阶段触发。
- **以 `SessionSummary.completed` 作为 "Done" 依据。** `completed` 是侧边栏的每浏览器 "完成提醒"，只为未选中的会话置位；对于操作者正盯着完成的那个选中会话它始终缺失，"Done" 因此永不触发。`running` 是可靠的 working↔idle 信号。
- **在挂载时调用 `Notification.requestPermission()`。** 浏览器要求一次瞬时用户激活；加载时请求被拒绝（Firefox 72+、Safari）并被 Lighthouse 标记，使权限停留在 "default"，每个 `new Notification()` 都抛异常。推迟到第一次 `pointerdown`。
- **Service Worker 的 `showNotification` + `notificationclick` → `client.focus()`/`openWindow()`。** 更强大——能在标签页关闭后存活并重新启动已安装的 PWA——但引入了 harness 本不拥有的 Service Worker 生命周期。文档级 `new Notification()` + `onclick`/`window.focus()` 路径覆盖了标签页仍开着的当前需求；若聚焦需要在标签页关闭后存活，Service Worker 路径是升级方向。

## 后果

通知按设计仅在标签页隐藏时触发，因此操作者盯着标签页测试时，在切走之前什么也看不到。该特性只新增一个根部副作用组件与一次性的 `pointerdown` 监听器，不触及任何会话日志、线上协议或磁盘格式。测试用真实 `bindSnapshotSelector` uSES hook 对两个切片各自的最小 observable 驱动（ exercising 被有缺陷的选择器隐藏的订阅与相等性短路路径），并配以一个在权限非 "granted" 时抛异常的逼真 `Notification` 桩，使副作用一旦回到选择器内，测试套件即失败。
