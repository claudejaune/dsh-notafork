/**
 * Session-header toggle capsule that enables/disables desktop notifications.
 * Registered into `conversation.session.header.utilities` at `order: -20`,
 * immediately left of the open-in-app split button (`order: -10`), so it is
 * a flex member of the header's 28px control row: it centers vertically and
 * moves with the cluster as panels resize. The on/off state persists in
 * localStorage via {@link setNotificationsEnabled}.
 */
import { useState, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { notificationsEnabled, setNotificationsEnabled } from './notification-preference.ts'
import { NS } from './locales.ts'
import css from './NotificationsToggle.module.css'

/** Full props for the Session-header notifications toggle. */
export type NotificationsToggleProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<typeof NS>

/** Bell glyph; struck through with a line when disabled. */
function Bell({ struck }: { struck: boolean }): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {struck ? <line x1="4" y1="4" x2="20" y2="20" /> : null}
    </svg>
  )
}

/**
 * Render the desktop-notifications toggle capsule.
 * @param props.t - translate seat owning the accessible name and tooltip.
 * @returns the toggle button.
 */
export function NotificationsToggle(props: NotificationsToggleProps): ReactNode {
  const { t } = props
  const [enabled, setEnabled] = useState<boolean>(notificationsEnabled)

  const toggle = (): void => {
    const next = !enabled
    setEnabled(next)
    setNotificationsEnabled(next)
  }

  return (
    <button
      type="button"
      className={css.toggle}
      data-enabled={enabled}
      aria-pressed={enabled}
      aria-label={enabled ? t('toggle.disable') : t('toggle.enable')}
      title={enabled ? t('toggle.on') : t('toggle.off')}
      onClick={toggle}
    >
      <Bell struck={!enabled} />
    </button>
  )
}
