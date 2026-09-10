/**
 * Browser half of the desktop-notifications toggle: one Session-header
 * capsule in the utilities cluster, left of the open-in-app split button.
 * `ctx.slots.inject` waits on the ui-conversation declaration and removes the
 * contribution if that declaration collapses, so an upstream slot rename
 * degrades to "toggle absent" instead of a boot failure.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { NotificationsToggle } from './NotificationsToggle.tsx'
import { en, NS, zh } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Session-header desktop-notifications toggle copy. */
    'desktop-notifications': keyof typeof zh
  }
}

/** Required services for locale registration and the header-slot contribution. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the dictionaries and the header toggle.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'desktop-notifications: dictionaries')
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'desktop-notifications-toggle',
    order: -20,
    locale: NS,
  }, NotificationsToggle))
}
