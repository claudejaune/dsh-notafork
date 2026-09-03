/**
 * Fixed-position toggle that enables/disables desktop notifications. Sits
 * just left of the Session log button in the conversation header, styled as a
 * matching capsule (same height, radius, border, and alias color tokens) so it
 * reads correctly in both light and dark mode. The on/off state persists in
 * localStorage via {@link setNotificationsEnabled}: inline styles,
 * localStorage persistence, and no settings/locale capability dependency, so
 * the shell stays merge-friendly with upstream.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { notificationsEnabled, setNotificationsEnabled } from './notification-preference.ts'
import type { RendererKey } from './locales.ts'

/**
 * Header right inset (28px) + Session log button min-width (111px) +
 * utilities gap (8px). Mirrors `ConversationRoot.module.css` `.header`
 * padding-right and `.headerUtilities` gap so this capsule sits flush left of
 * the Session log button.
 */
const RIGHT_OFFSET = 28 + 111 + 8

/** Outer wrapper: aligned with the conversation header's top-right cluster. */
const wrapperStyle: CSSProperties = {
  position: 'fixed',
  top: 12,
  right: RIGHT_OFFSET,
  zIndex: 1000,
}

/**
 * Capsule button style mirroring the Session log button
 * (`HeaderAction.module.css` `.sessionLogButton`): 32px height, 18px radius,
 * `--dsw-alias-border-l2` border, `--dsw-alias-label-primary` text, transparent
 * background, hover fill — all alias tokens so it adapts to dark mode. The
 * off state uses the dimmed label token instead of an opacity hack.
 */
function buttonStyle(enabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    minWidth: 32,
    padding: '6px 10px',
    gap: 4,
    border: '1px solid var(--dsw-alias-border-l2)',
    borderRadius: 18,
    color: enabled ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-dimmed)',
    background: 'transparent',
    fontFamily: 'var(--dsw-font-family)',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: '20px',
    cursor: 'pointer',
  }
}

/** Hover fill, applied via a class so it tracks the same alias token. */
const hoverStyle: CSSProperties = {
  background: 'var(--dsw-alias-interactive-bg-hover)',
}

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
export function NotificationsToggle({ t }: { t: Translate<RendererKey> }): ReactNode {
  const [enabled, setEnabled] = useState<boolean>(notificationsEnabled)

  const toggle = (): void => {
    const next = !enabled
    setEnabled(next)
    setNotificationsEnabled(next)
  }

  return (
    <div style={wrapperStyle}>
      <button
        type="button"
        style={buttonStyle(enabled)}
        aria-pressed={enabled}
        aria-label={enabled ? t('toggle.disable') : t('toggle.enable')}
        title={enabled ? t('toggle.on') : t('toggle.off')}
        onClick={toggle}
        // Inline `onMouseEnter/Leave` swaps in the hover fill because inline
        // styles cannot express `:hover`; the alias token keeps it theme-correct.
        onMouseEnter={(e) => { Object.assign(e.currentTarget.style, hoverStyle) }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <Bell struck={!enabled} />
      </button>
    </div>
  )
}
