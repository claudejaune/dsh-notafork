# Agent Note: Desktop notifications with click-to-focus for session transitions

Status: implemented

English | [中文](2026-08-26-desktop-notifications.zh.md)

## Problem

The web GUI gives no out-of-band signal when a session needs the operator or finishes work while its tab is in the background. An operator who delegated a task and switched away learns a session is awaiting approval, has a question, or is done only by returning to the tab — defeating the point of switching away. Browser desktop notifications are the natural channel, but two constraints shape the design: the Web Notifications API requires a user gesture to request permission (on-load requests are rejected by Firefox 72+/Safari and flagged by Lighthouse), and a `useSyncExternalStore` selector must stay pure — side effects in the selector both violate the contract and bail out of re-rendering when the selection is constant.

## Decision

A `DesktopNotifications` side-effect component at the app root renders nothing and fires browser notifications on two transitions while the tab is hidden (`document.hidden`): a pending interaction arrives (approval / plan-review / question), and a session stops working (running → idle).

The selectors stay pure over the two framework sources the Client exposes: the session list (`ctx.sessions.list`) projects a per-session surface `{ id, title, running }` with a custom equality over `id` + `running` only, and the `uiSession` service's `pendingInteractions` map is read as its own snapshot (identity is replaced only when an interaction arrives or clears). A `useEffect` keyed on both slices diffs against prev refs and fires. `notify()` no-ops unless `Notification.permission === 'granted'` and the tab is hidden; permission is requested off the first `pointerdown` (a user gesture), never on load; and the `Notification` instance's `onclick` calls `window.focus()` so clicking the toast brings the harness tab and its window to the foreground on Windows (Chrome/Edge/Firefox). Notification titles are locale-owned: they resolve through the `renderer` namespace dictionary (per the [locale-owned client UI copy decision](../architecture/2026-08-23-locale-owned-client-ui-copy.md)) keyed by the pending interaction's `kind` discriminant.

The toggle that turns the feature on and off lives in its own plugin package (`packages/client/ui-desktop-notifications`), which registers a 28px capsule into the Session header's `conversation.session.header.utilities` list at `order: -20` — immediately left of the open-in-app split button's `order: -10` — so it is a flex member of the header's control row: it centers vertically with and moves with the cluster as panels resize. `ctx.slots.inject` waits on the ui-conversation declaration and uninstalls the contribution if that declaration collapses, so an upstream slot rename degrades to a missing toggle rather than a boot failure. The toggle writes and the host reads the same `dsh-desktop-notifications` localStorage key, shared by value across the two packages.

"Done" keys off the `running` transition (busy → idle) — not `SessionSummary.completed`, which [the done-dot note](../../archived/feature/2026-08-06-session-completed-done-dot.md) arms only for sessions that are not the selected one, so it never fires for the session the operator is watching. "Done" is suppressed when the session stopped in order to ask for an interaction, so a single transition does not stack a "Done" and a "Waiting for approval" toast.

## Alternatives considered

- **Side effects inside the uSES selector.** The first implementation ran `new Notification()` and the transition diff inside the selector and returned `null`; `useSyncExternalStore` then treated the constant selection as unchanged and bailed out of re-rendering, leaving the side effect to run only inside the store-change probe, outside React's lifecycle and fragile across StrictMode and concurrent rendering. The effect-on-a-derived-surface pattern keeps the selector pure and fires in the effect phase.
- **Key "Done" off `SessionSummary.completed`.** `completed` is the sidebar's per-browser "done reminder," armed only for non-selected sessions; for the selected session the operator is watching finish it stays absent, so "Done" never fired. `running` is the reliable working↔idle signal.
- **`Notification.requestPermission()` on mount.** Browsers require a transient user activation; on-load requests are rejected (Firefox 72+, Safari) and flagged by Lighthouse, leaving permission at "default" so every `new Notification()` throws. Defer to the first `pointerdown`.
- **Service-worker `showNotification` + `notificationclick` → `client.focus()`/`openWindow()`.** More powerful — it survives a closed tab and relaunches installed PWAs — but adds a service-worker lifecycle the harness does not otherwise own. The document `new Notification()` + `onclick`/`window.focus()` path covers the tab-still-open case, which is the current need; the service-worker path is the upgrade if focus must survive a closed tab.

## Consequences

Notifications are hidden-tab-only by design, so an operator testing while watching the tab sees nothing until they switch away. The feature adds one root side-effect component and a one-shot `pointerdown` listener and touches no session log, wire, or on-disk format. The test drives the real `bindSnapshotSelector` uSES hooks against minimal observables for both slices (exercising the subscribe and equality bail-out path the buggy selector hid) with a realistic `Notification` stub that throws unless permission is "granted," so the suite fails the moment side effects move back into the selector.
