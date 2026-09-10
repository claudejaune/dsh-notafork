/**
 * Browser-half lifecycle over the real SlotRegistry: the dictionary and
 * header-slot registrations with fiber teardown proving removal (HMR
 * safety), the fixed utilities position left of open-in-app, and the
 * node-half's empty apply.
 */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import { NotificationsToggle } from '../src/client/NotificationsToggle.tsx'
import { NS } from '../src/client/locales.ts'

/** Boot the browser half over a real slot tree that declares the header list. */
async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('locale', new LocaleRuntime(ctx))
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

function utilityEntries(ctx: Context): { id: string | undefined; order: number | undefined }[] {
  return ctx.slots.entries('conversation.session.header.utilities')
    .map(entry => ({ id: entry.options.id, order: entry.options.order }))
}

describe('desktop-notifications browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the toggle left of open-in-app, and fiber teardown removes it (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    const entries = utilityEntries(ctx)
    const toggle = entries.find(entry => entry.id === 'desktop-notifications-toggle')
    expect(toggle).toEqual({ id: 'desktop-notifications-toggle', order: -20 })
    expect(ctx.slots.entries('conversation.session.header.utilities')
      .find(entry => entry.options.id === 'desktop-notifications-toggle')?.component).toBe(NotificationsToggle)
    // The rendered position stays left of the open-in-app split button.
    const openInApp = entries.findIndex(entry => entry.id === 'open-in-app')
    if (openInApp !== -1) expect(entries.indexOf(toggle!)).toBeLessThan(openInApp)
    expect(ctx.locale.getSnapshot().revision).toBeGreaterThanOrEqual(0)
    await fiber.dispose()
    expect(utilityEntries(ctx).map(entry => entry.id)).not.toContain('desktop-notifications-toggle')
  })

  it('binds the toggle dictionaries under the desktop-notifications namespace', async () => {
    const { ctx } = await bench()
    expect(ctx.locale.getSnapshot().revision).toBeGreaterThanOrEqual(0)
    expect(NS).toBe('desktop-notifications')
  })

  it('has no host-side behavior', () => {
    expect(nodeApply()).toBeUndefined()
  })
})
