/**
 * Real-UI assembly closure. The whole layout tree hangs from the built-in
 * `root` slot, which is the only ctx-level slot render in the application.
 *
 * Local patch (kept beside the upstream assembly, see the local-patches Agent
 * Note): the desktop-notification side-effect host and the notifications toggle
 * mount here as siblings of the frame instead of registering into
 * `shell.overlay`, so the patch survives upstream slot-schema churn. `ui-session` and `locale` are read through structural views of
 * `ctx.get` because both packages type-import this one, so a project reference
 * would cycle; their service contracts own the real types. The copy lives in
 * the `renderer` locale namespace.
 */
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: the Client Sessions contract merges ctx.sessions into Context.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { HostObservable, Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from './bind.ts'
import { DesktopNotifications, type PendingInteractionView } from './DesktopNotifications.tsx'
import { NotificationsToggle } from './NotificationsToggle.tsx'
import { en, zh } from './locales.ts'

/** Locale namespace owned by this package's overlay copy. */
const NS = 'renderer'

/** The `uiSession` service fact the overlay consumes. */
interface UiSessionView {
  readonly pendingInteractions: HostObservable<ReadonlyMap<string, PendingInteractionView>>
}

/** The `locale` service facts the overlay consumes (LocaleRuntime in full). */
interface LocaleView {
  register(ns: string, dicts: Record<'zh' | 'en', Record<string, string>>): () => void
  bind(ns: string): Translate
  getSnapshot(): { revision: number }
  subscribe(fn: () => void): () => void
}

/** Locale runtimes whose dictionaries this module has already registered. */
const registeredLocales = new WeakSet<object>()

/** Inputs available after the UI renderer's inject set activates. */
export interface AssemblyDeps {
  /** Client context carrying the slots, sessions, uiSession, and locale services. */
  ctx: Context
}

/**
 * Build the assembled application factory.
 * @param deps - Active UI-renderer dependencies.
 * @returns Factory producing the application React tree.
 */
export function buildRenderApp(deps: AssemblyDeps): () => ReactNode {
  const { ctx } = deps
  // One component keeps a stable identity across boot-handoff re-renders;
  // services resolve at first render, so a context without the registry or
  // the overlay services fails loud at render time, not build time.
  const Assembly = ({ frame }: { frame: ReactNode }): ReactNode => {
    const sessions = ctx.get('sessions')
    const uiSession = ctx.get('uiSession') as UiSessionView | undefined
    const locale = ctx.get('locale') as LocaleView | undefined
    if (sessions === undefined) throw new Error('ui renderer: sessions service unavailable')
    if (uiSession === undefined) throw new Error('ui renderer: uiSession service unavailable')
    if (locale === undefined) throw new Error('ui renderer: locale service unavailable')
    if (!registeredLocales.has(locale)) {
      registeredLocales.add(locale)
      locale.register(NS, { zh, en })
    }
    const t = locale.bind(NS)
    const useSessions = bindSnapshotSelector(sessions.list)
    const usePendingInteractions = bindSnapshotSelector(uiSession.pendingInteractions)
    const useLocale = bindSnapshotSelector(locale)
    // Re-render the overlay copy when the active locale switches.
    useLocale(snapshot => snapshot.revision)
    return (
      <>
        <NotificationsToggle t={t} />
        <DesktopNotifications
          useSessions={useSessions}
          usePendingInteractions={usePendingInteractions}
          t={t}
        />
        {frame}
      </>
    )
  }
  // Resolve the slot registry at render-closure time: a context without it
  // fails loud here, before React ever mounts the assembly.
  return () => <Assembly frame={ctx.slots.renderSlot('root', {})} />
}
