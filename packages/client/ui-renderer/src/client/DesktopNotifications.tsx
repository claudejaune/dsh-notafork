/**
 * Desktop notification side-effect component. Subscribes to the session list
 * and the pending-interaction map and fires browser Notification messages when:
 *   1. A session completes while the tab is hidden ("Done" reminder).
 *   2. A pending interaction (approval / plan-review / question) arrives.
 *
 * Renders nothing. The selectors stay pure and return small derived slices;
 * all side effects live in a useEffect keyed on those slices.
 */
import { useEffect, useRef } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotSelectorHook, Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { notificationsEnabled } from './notification-preference.ts'
import type { RendererKey } from './locales.ts'

/** Session id as the session list keys it. */
type SessionId = SessionListState['ids'][number]

/** One pending interaction as far as the overlay reads it (`ui-session` owns the contract). */
export interface PendingInteractionView {
  readonly kind: string
}

/** The pending-interaction snapshot as far as the overlay reads it. */
export type PendingInteractionsView = ReadonlyMap<string, PendingInteractionView>

/** Per-session facts used to detect transitions. */
interface SurfaceEntry {
  id: SessionId
  /** Body text for the fired notification. */
  title: string
  running: boolean
}

/**
 * Fire a browser notification that focuses the harness tab when clicked.
 * No-ops when the user has disabled notifications, the API is unavailable, the
 * tab is visible, or the user has not granted permission.
 * @param title - notification title.
 * @param body - notification body text.
 */
function notify(title: string, body: string): void {
  if (!notificationsEnabled()) return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  if (!document.hidden) return
  let notification: Notification
  try {
    notification = new Notification(title, { body })
  } catch {
    // NotAllowedError: a "granted" permission can still be overridden by
    // restrictive per-site settings (silent mode, Focus); the page cannot
    // recover, so drop this one event.
    return
  }
  // A notification click is a user-activation event, so window.focus() is
  // permitted: bring the harness tab (the document that owns this
  // notification) and its window to the foreground.
  notification.onclick = () => { window.focus() }
}

/**
 * Request notification permission off the first user gesture. Browsers require
 * a transient user activation for `Notification.requestPermission()`; calling
 * it on page load is rejected (Firefox 72+, Safari) and flagged by Lighthouse,
 * leaving permission at "default" so every later `new Notification()` throws.
 */
function useNotificationPermission(): void {
  useEffect(() => {
    const requestOnGesture = (): void => {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'default') void Notification.requestPermission()
    }
    window.addEventListener('pointerdown', requestOnGesture, { passive: true, once: true })
    return () => { window.removeEventListener('pointerdown', requestOnGesture) }
  }, [])
}

/**
 * Project the per-session running surface. The custom equality compares only
 * id + running, so React re-renders only on a relevant transition — not on
 * every streaming-token store tick (title and updatedAt churn). Pure: no side
 * effects. Pending interactions ride their own snapshot (below), so a pending
 * arrival need not rebuild this slice.
 * @param state - session list snapshot.
 * @returns the running surface in host-list order.
 */
function selectSurface(state: SessionListState): SurfaceEntry[] {
  const entries: SurfaceEntry[] = []
  for (const id of state.ids) {
    const entry = state.byId[id]
    if (entry === undefined) continue
    entries.push({ id, title: entry.displayTitle, running: entry.running })
  }
  return entries
}

/**
 * Surface equality on id + running only. Returning true makes
 * `useSyncExternalStoreWithSelector` reuse the prior selection and skip the
 * re-render, so the effect below runs only on a real transition.
 * @param a - previous surface.
 * @param b - next surface.
 * @returns whether the two surfaces are transitionally equivalent.
 */
function sameSurface(a: SurfaceEntry[], b: SurfaceEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    // Equal length makes both defined; the guard satisfies noUncheckedIndexedAccess.
    if (x === undefined || y === undefined) return false
    if (x.id !== y.id || x.running !== y.running) return false
  }
  return true
}

/**
 * Title dictionary key for one pending-interaction kind. ui-user-questions
 * owns `'question'` and `'plan-review'`; ui-approval owns `'approval'`;
 * unknown future kinds fall through to the approval wording.
 * @param kind - the pending interaction's discriminant.
 * @returns the notification title key.
 */
function pendingKey(kind: string): RendererKey {
  if (kind === 'question') return 'notify.question'
  if (kind === 'plan-review') return 'notify.planReview'
  return 'notify.approval'
}

/**
 * Desktop notifications for session state transitions.
 * @param props.useSessions - the bound session-list selector hook.
 * @param props.usePendingInteractions - the bound pending-interaction map hook.
 * @param props.t - translate seat owning the notification titles.
 * @returns no rendered content.
 */
export function DesktopNotifications({
  useSessions,
  usePendingInteractions,
  t,
}: {
  useSessions: SnapshotSelectorHook<SessionListState>
  usePendingInteractions: SnapshotSelectorHook<PendingInteractionsView>
  t: Translate<RendererKey>
}): null {
  useNotificationPermission()

  const surface = useSessions(selectSurface, sameSurface)
  // The published map replaces its identity only when an interaction arrives
  // or clears, so the snapshot selector needs no custom equality.
  const pending: PendingInteractionsView = usePendingInteractions(map => map)

  const prevSurfaceRef = useRef<SurfaceEntry[]>(surface)
  const prevPendingRef = useRef<PendingInteractionsView>(pending)
  useEffect(() => {
    const prevById = new Map<SurfaceEntry['id'], SurfaceEntry>(
      prevSurfaceRef.current.map(entry => [entry.id, entry]),
    )
    const prevPending = prevPendingRef.current
    for (const entry of surface) {
      const was = prevById.get(entry.id)
      const nowPending: PendingInteractionView | undefined = pending.get(entry.id)
      if (nowPending !== undefined && prevPending.get(entry.id) === undefined) {
        notify(t(pendingKey(nowPending.kind)), entry.title)
      }
      // "Done": a session stopped working and is not now waiting on an
      // interaction (that case is covered by the pending notification above).
      // Keys off the busy→idle edge of `running`; `completed` only arms for
      // non-selected sessions and never fires for the watched one.
      if (was?.running === true && !entry.running && nowPending === undefined) {
        notify(t('notify.done'), entry.title)
      }
    }
    prevSurfaceRef.current = surface
    prevPendingRef.current = pending
  }, [surface, pending, t])

  return null
}
