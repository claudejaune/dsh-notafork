# Agent Note: Per-conversation `x-opencode-session` header for OpenCode routes

Status: implemented

[English](2026-09-10-opencode-session-header.md) | 中文

## Problem

OpenCode Go 托管推理网关自 2026-09-05 起要求每个推理请求携带稳定的按会话 `x-opencode-session` 标头，否则返回 `400 MissingSessionID`。harness 的 pi-ai 适配器已把会话 id 传给 pi-ai（`options.sessionId`），但 pi-ai 的会话亲和格式只发出 `session_id`、`x-client-request-id`、`x-session-affinity` 或 `x-session-id`；其中没有所需的标头，且 Chat Completions 路径根本不发出亲和标头。因此 OpenCode 路由上的用户中断了，而直连 DeepSeek 适配器早已把自己的会话 id 作为 `x-deepseek-harness-session-id` 发出（`packages/llm/llm-deepseek/src/adapter.ts`）。静态的 `headers: { x-opencode-session: … }` profile 条目可以解除 400，却把所有会话固定到同一个 id，破坏了网关的路由与提示缓存亲和。

## Decision

`dsh-llm-pi-ai` 在发往 OpenCode 网关的每个请求上，以请求的 `GenerateOptions.sessionId` 填充 `x-opencode-session`。当路由键为 `opencode` 或以 `opencode-` 开头（已安装的 `opencode` 与 `opencode-go` 目录路由），或其解析后的模型端点主机为 `opencode.ai` 或子域时，该路由即为 OpenCode 网关。该取值是 harness 会话 id，由于 agent loop 每个会话只填充一次，它在轮次、恢复、压缩与重试之间保持稳定（`packages/core/agent-loop/src/agent.ts`）。

`requestHeaders()` 中的标头优先级为：profile 标头、按会话标头、Harness 归因。按会话取值会替换同名的静态 `headers` 条目，因为固定值无法标识会话；归因名仍归 Harness 所有并在所有冲突中胜出。OpenCode 网关之外的路由不受影响，其他提供方不会收到该标头。

检测与注入位于 pi-ai 包内，而非按部署配置：它归一化的是某个提供方的特殊要求，符合该包的职责，也与已经集中管理提供方请求身份的[强制归因决策](2026-06-21-mandatory-app-attribution-headers.zh.md)一致。这是 [DeepSeek 请求身份决策](../feature/2026-08-11-deepseek-request-user-id-header.zh.md)在 pi-ai 侧的对应实现，后者负责直连适配器的会话 id 标头。

## Testing

`packages/llm/llm-pi-ai/tests/adapter.spec.ts` 断言该标头会携带会话 id 到达 `opencode-go` 路由的线上请求、在非 OpenCode 路由上不出现、会替换同名的静态 profile 标头，并断言 `isOpenCodeRoute` 能按路由键与端点主机识别该网关。

## Alternatives considered

**可选的 `sessionHeader` profile 字段。** 由部署配置的标头名（例如 `sessionHeader: x-opencode-session`）可推广到 OpenCode 之外，并让行为保持显式。未采用它，因为该要求是外部网关契约，而非随部署变化的可调项，且可选默认会让每个既有 OpenCode 用户在编辑设置前一直中断。自动规则无需配置即可修复已发布的目录路由。

**在所有路由上发送该标头。** 拒绝：对不识别它的提供方而言 `x-opencode-session` 没有意义，且 harness 一向只把提供方特定身份限制在记录它的提供方上。

**同时发出 pi 原生的 `n-session` / `n-client` 标头。** 拒绝：`x-opencode-session` 是网关在其错误中点名的标头，在线上已经足够；额外的原生标头只增加表面积而没有消费者。

**把取值归一化为裸 UUID。** 曾考虑，因为一些社区补丁会从 `session-<uuid>` 中提取裸 UUID。拒绝：网关接受 harness 的 id 形态，而归一化会让适配器耦合到一种 id 格式，而 harness 在不同入口会生成 `session-<n>`、`session-<uuid>` 与裸 UUID。

## Consequences

OpenCode Go 与 Zen 用户无需更改配置即可继续使用，且由于标头跟随会话 id，每个会话保有自己的路由与提示缓存亲和。同名的静态 profile 标头在 OpenCode 路由上不再生效，这是有意的，并已在包 README 中记录。检测基于主机与路由键；把 OpenCode 代理到无关主机的部署必须自行通过 `headers` 设置该标头，而若 OpenCode 增加另一个必需标头，本规则也需随之扩展。
