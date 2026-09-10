---
description: "Web Session-header desktop-notifications toggle capsule: enables or disables desktop notifications for the renderer assembly, persisted in the browser."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-desktop-notifications

English | [中文](README.zh.md)

## Summary

This package provides the user-facing control of the desktop-notifications feature: a Session-header toggle capsule that enables or disables notifications and persists the choice in the browser (`dsh-desktop-notifications`, `'1'` enabled — the default — or `'0'` disabled), with no settings capability so the feature stays out of the settings dependency graph. The notification side effects themselves live in the renderer assembly (`@deepseek-ai/dsh-client-ui-renderer` mounts `DesktopNotifications`); this package owns only the control and the preference writes.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin row in the Web composition; it takes no config. The Session header grows a bell capsule whenever the conversation header renders its utilities cluster.

### What to expect

The capsule sits immediately left of the open-in-app split button (`order: -20` versus that button's `-10`), styled as a member of the header's 28px control row — same height, pill radius, and hairline border — so it centers vertically with and moves with the cluster as panels resize. The bell glyph is struck through when disabled. Clicking toggles and persists immediately; the accessible name and tooltip are locale-owned through the bilingual `desktop-notifications` namespace.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin registers the capsule on `conversation.session.header.utilities` through `ctx.slots.inject` — which waits on the ui-conversation declaration and uninstalls the contribution if that declaration collapses, so an upstream slot rename degrades to a missing toggle rather than a boot failure — and registers the `desktop-notifications` dictionaries as one effect. The component reads its initial state from localStorage and writes through [`src/client/notification-preference.ts`](src/client/notification-preference.ts). The renderer assembly's side-effect host reads the same key with its own minimal accessor: the two packages share the key by value. The node half is an empty `apply` that keeps the plugin on the host roster.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [dsh-client-ui-renderer](../ui-renderer/README.md) — the renderer assembly mounting the `DesktopNotifications` side-effect host that consumes the preference at fire time.
- [dsh-client-ui-open-in-app](../ui-open-in-app/README.md) — the neighboring header utility whose split button the capsule sits beside.
- [Desktop notifications Agent Note](../../../.agents/notes/implemented/feature/2026-08-26-desktop-notifications.md) — the feature decisions, including the toggle's header placement.

-----

<a id="model-experience"></a>
## Model Experience

None, as the toggle is browser chrome; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **The storage key is shared by value.** The key lives in both this package's writer and the renderer assembly's reader; a rename must land in both `src/client/notification-preference.ts` files.
- **Browsers without the `Notification` API.** The toggle persists a preference with no effect; the host side no-ops at fire time.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The toggle's placement decision — the utilities list slot, the fixed ordering, and the graceful-collapse contract — is recorded in the [desktop notifications Agent Note](../../../.agents/notes/implemented/feature/2026-08-26-desktop-notifications.md).

</details>

**Runtime invariant:** No companion is published. The plugin registers one dictionary effect and one header-slot entry whose disposal the HMR-safety spec proves; the preference is a single localStorage key with no second copy to diverge.
