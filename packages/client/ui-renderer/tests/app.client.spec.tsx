// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
// Type-only: Context merge for ctx.uiSession.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { buildRenderApp } from '../src/client/app.tsx'
import { bindSnapshotSelector } from '../src/client/bind.ts'
import { DesktopNotifications, type PendingInteractionsView } from '../src/client/DesktopNotifications.tsx'
import { setNotificationsEnabled } from '../src/client/notification-preference.ts'
import { en, type RendererKey } from '../src/client/locales.ts'

/** English translate stub: dictionary lookup at the keys the components pass. */
const t: Translate<RendererKey> = key => en[key]

let runtime: SlotTestRuntime | undefined

// jsdom localStorage is not available by default; provide a simple shim.
const storage = new Map<string, string>()
const localStorageShim = {
  getItem(key: string) { return storage.get(key) ?? null },
  setItem(key: string, value: string) { storage.set(key, value) },
  removeItem(key: string) { storage.delete(key) },
  clear() { storage.clear() },
}
vi.stubGlobal('localStorage', localStorageShim)

afterEach(async () => {
  cleanup()
  await runtime?.dispose()
  runtime = undefined
  vi.unstubAllEnvs()
  storage.clear()
})

async function bench() {
  runtime = await SlotTestRuntime.create()
  // The overlay copy is locale-owned; mount the real dictionary registry and
  // pin English so accessible names assert against the `en` dictionary.
  const locale = new LocaleRuntime(runtime.ctx)
  locale.setLocale('en')
  runtime.ctx.provide('locale', locale)
  await runtime.root.declare({}, () => <div data-testid="frame" />)
  return { runtime, renderApp: buildRenderApp({ ctx: runtime.ctx }) }
}

describe('buildRenderApp', () => {
  it('fails loud when the slot registry is unavailable', () => {
    const renderApp = buildRenderApp({ ctx: new Context() })
    expect(() => renderApp()).toThrow()
  })

  it('renders the root slot tree', async () => {
    const b = await bench()
    const view = render(<>{b.renderApp()}</>)
    expect(view.getByTestId('frame')).toBeTruthy()
  })
})

describe('DesktopNotifications', () => {
  let notificationSpy: ReturnType<typeof vi.fn<(title: string, options?: { body?: string }) => void>>
  let hiddenValue = true
  let permissionValue: NotificationPermission = 'granted'
  let createdInstances: { onclick: (() => void) | null }[]

  /**
   * Build a SessionListState from per-session overrides. Required SessionSummary
   * fields (blank, updatedAt) are filled with inert defaults; only the fields the
   * component reads are parameterized. Pending interactions ride their own
   * snapshot (the `uiSession` contract), not the list rows.
   */
  function makeState(
    overrides: Record<string, {
      running?: boolean
      displayTitle?: string
    }> = {},
  ): SessionListState {
    const ids = Object.keys(overrides) as SessionListState['ids']
    const byId = {} as Record<string, SessionSummary>
    for (const [id, entry] of Object.entries(overrides)) {
      byId[id] = {
        id: id as SessionSummary['id'],
        displayTitle: entry.displayTitle ?? id,
        running: entry.running ?? false,
        blank: false,
        updatedAt: 0,
      }
    }
    return { ids, byId, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined }
  }

  /**
   * Minimal HostObservable driving the real uSES-bound selector hook from a
   * mutable snapshot. Exercising the real `useSyncExternalStoreWithSelector`
   * path (subscribe + equality bail-out) is what proves the selector is pure
   * and the effect fires only on real transitions.
   */
  function createSource<S>(initial: S) {
    let state = initial
    const listeners = new Set<() => void>()
    const observable = {
      subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } },
      getSnapshot(): S { return state },
    }
    const useSource = bindSnapshotSelector(observable)
    const update = (next: S): void => {
      state = next
      for (const fn of listeners) fn()
    }
    return { useSource, update }
  }

  function makePending(entries: Record<string, string>): PendingInteractionsView {
    return new Map(Object.entries(entries).map(([id, kind]) => [id, { kind }]))
  }

  beforeEach(() => {
    notificationSpy = vi.fn<(title: string, options?: { body?: string }) => void>()
    hiddenValue = true
    permissionValue = 'granted'
    createdInstances = []
    // Realistic Notification: the constructor throws unless permission is
    // "granted" (the spec blocks construction under any other permission),
    // `.permission` reads the live value so tests can flip it mid-run, and
    // each construction returns a fresh instance whose `onclick` the component
    // sets; the instances are recorded so a test can simulate a click.
    function Notification(this: unknown, title: string, options?: { body?: string }): { onclick: (() => void) | null } {
      if (permissionValue !== 'granted') throw new DOMException('Notification: permission denied', 'NotAllowedError')
      notificationSpy(title, options)
      const instance: { onclick: (() => void) | null } = { onclick: null }
      createdInstances.push(instance)
      return instance
    }
    Object.defineProperty(Notification, 'permission', { get: () => permissionValue, configurable: true })
    Object.assign(Notification, { requestPermission: vi.fn(async () => permissionValue) })
    vi.stubGlobal('Notification', Notification)
    Object.defineProperty(document, 'hidden', { get: () => hiddenValue, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    vi.stubGlobal('localStorage', localStorageShim)
  })

  function renderNotifications(state: SessionListState, pending: PendingInteractionsView) {
    const sessions = createSource(state)
    const pendings = createSource(pending)
    render(
      <DesktopNotifications
        useSessions={sessions.useSource}
        usePendingInteractions={pendings.useSource}
        t={t}
      />,
    )
    return { sessions, pendings }
  }

  it('fires Done when a session stops working (working → idle) while the tab is hidden', () => {
    const { sessions } = renderNotifications(makeState({ s1: { running: true, displayTitle: 'My task' } }), new Map())
    act(() => {
      sessions.update(makeState({ s1: { running: false, displayTitle: 'My task' } }))
    })
    expect(notificationSpy).toHaveBeenCalledTimes(1)
    expect(notificationSpy).toHaveBeenCalledWith('Done', { body: 'My task' })
  })

  it('focuses the harness tab when a notification is clicked', () => {
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {})
    const { sessions } = renderNotifications(makeState({ s1: { running: true, displayTitle: 'My task' } }), new Map())
    act(() => {
      sessions.update(makeState({ s1: { running: false, displayTitle: 'My task' } }))
    })
    expect(notificationSpy).toHaveBeenCalledTimes(1)
    const instance = createdInstances.at(0)
    expect(instance).toBeDefined()
    if (instance === undefined) return
    instance.onclick?.()
    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  it('fires Waiting for approval (not Done) when a session stops working to ask for approval', () => {
    const { sessions, pendings } = renderNotifications(makeState({ s1: { running: true, displayTitle: 'Escalation' } }), new Map())
    act(() => {
      sessions.update(makeState({ s1: { running: false, displayTitle: 'Escalation' } }))
      pendings.update(makePending({ s1: 'approval' }))
    })
    expect(notificationSpy).toHaveBeenCalledTimes(1)
    expect(notificationSpy).toHaveBeenCalledWith('Waiting for approval', { body: 'Escalation' })
  })

  it('fires a notification when a pending question arrives while the tab is hidden', () => {
    const { pendings } = renderNotifications(makeState({ s1: { displayTitle: 'Q session' } }), new Map())
    act(() => {
      pendings.update(makePending({ s1: 'question' }))
    })
    expect(notificationSpy).toHaveBeenCalledTimes(1)
    expect(notificationSpy).toHaveBeenCalledWith('Question', { body: 'Q session' })
  })

  it('fires a notification when a pending plan-review arrives while the tab is hidden', () => {
    const { pendings } = renderNotifications(makeState({ s1: { displayTitle: 'Review me' } }), new Map())
    act(() => {
      pendings.update(makePending({ s1: 'plan-review' }))
    })
    expect(notificationSpy).toHaveBeenCalledTimes(1)
    expect(notificationSpy).toHaveBeenCalledWith('Plan review', { body: 'Review me' })
  })

  it('does not fire when the tab is visible', () => {
    hiddenValue = false
    const { pendings } = renderNotifications(makeState({ s1: { displayTitle: 'Visible' } }), new Map())
    act(() => {
      pendings.update(makePending({ s1: 'question' }))
    })
    expect(notificationSpy).not.toHaveBeenCalled()
  })

  it('does not fire or throw when permission is not granted', () => {
    permissionValue = 'default'
    const { sessions } = renderNotifications(makeState({ s1: { running: true, displayTitle: 'No perm' } }), new Map())
    act(() => {
      sessions.update(makeState({ s1: { running: false, displayTitle: 'No perm' } }))
    })
    expect(notificationSpy).not.toHaveBeenCalled()
  })

  it('does not fire on unrelated changes (title-only, same surface)', () => {
    const { sessions } = renderNotifications(makeState({ s1: { running: true, displayTitle: 'Old title' } }), new Map())
    act(() => {
      sessions.update(makeState({ s1: { running: true, displayTitle: 'New title' } }))
    })
    expect(notificationSpy).not.toHaveBeenCalled()
  })

  it('does not fire when the user has disabled notifications via the toggle', () => {
    setNotificationsEnabled(false)
    const { sessions } = renderNotifications(makeState({ s1: { running: true, displayTitle: 'Muted' } }), new Map())
    act(() => {
      sessions.update(makeState({ s1: { running: false, displayTitle: 'Muted' } }))
    })
    expect(notificationSpy).not.toHaveBeenCalled()
    setNotificationsEnabled(true)
  })
})
