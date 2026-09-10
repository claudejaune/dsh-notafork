---
description: "Web 会话头部的桌面通知开关胶囊：开启或关闭渲染器装配的桌面通知，状态持久化在浏览器中。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-desktop-notifications

[English](README.md) | 中文

## 概述

本包提供桌面通知功能的用户可见控件：一个会话头部开关胶囊，用于开启或关闭桌面通知，并把选择持久化在浏览器中（`dsh-desktop-notifications`，`'1'` 为开启——默认值——`'0'` 为关闭），不接入设置能力图。通知副作用本身位于渲染器装配（`@deepseek-ai/dsh-client-ui-renderer`）；本包只拥有控件与偏好写入。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

把本插件行挂进 Web 组合；本行不接受任何配置。只要会话头部渲染其实用工具簇，头部就会出现一枚铃铛胶囊。

### 预期行为

胶囊紧邻 open-in-app 分体按钮之左（`order: -20` 对该按钮的 `-10`），样式为头部 28px 控制行的一员——同高、胶囊圆角、发丝描边——因此与整行垂直居中，并随面板缩放一起移动。禁用时铃铛图形带删除线。点击立即切换并持久化；无障碍名称与 tooltip 经双语 `desktop-notifications` 命名空间归 locale 所有。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部——点击展开</summary>

插件经 `ctx.slots.inject` 在 `conversation.session.header.utilities` 上注册胶囊——它等待 ui-conversation 的声明，并在该声明折叠时卸载贡献，因此上游槽位改名退化为"按钮缺席"而不是启动失败——并把 `desktop-notifications` 词典注册为一个 effect。组件从 localStorage 读初始状态，并经 [`src/client/notification-preference.ts`](src/client/notification-preference.ts) 写入。渲染器装配的副作用宿主用自己的最小访问器读同一个键：两个包按值共享该键。node 半部是空 `apply`，把插件保留在主机花名册上。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [dsh-client-ui-renderer](../ui-renderer/README.zh.md) — 挂载 `DesktopNotifications` 副作用宿主（在触发时消费该偏好）的渲染器装配。
- [dsh-client-ui-open-in-app](../ui-open-in-app/README.zh.md) — 胶囊所邻接的头部实用工具分体按钮。
- [桌面通知 Agent Note](../../../.agents/notes/implemented/feature/2026-08-26-desktop-notifications.zh.md) — 功能级决策，包括开关的头部位置。

-----

<a id="model-experience"></a>
## 模型体验

无，开关是浏览器 UI；这里没有任何内容到达模型请求。

#### KV Cache 影响

无；本包既不组装也不发送 provider 请求。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **存储键按值共享。** 键同时存在于本包的写入方与渲染器装配的读取方；改名必须同时落在两处 `src/client/notification-preference.ts`。
- **无 `Notification` API 的浏览器。** 开关仍持久化偏好，但不产生效果；触发时读取方在触发点直接空转。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作背景——点击展开</summary>

开关的位置决策——utilities 列表、固定次序、优雅折叠契约——记录在[桌面通知 Agent Note](../../../.agents/notes/implemented/feature/2026-08-26-desktop-notifications.zh.md)。

</details>

**运行时不变量：** 不发布伴随物。插件注册一个词典 effect 与一个头部槽位条目（HMR 安全规格证明其可卸载）；偏好是单一 localStorage 键，没有会漂移的第二副本。
