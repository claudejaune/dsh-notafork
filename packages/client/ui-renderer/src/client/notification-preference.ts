/**
 * Desktop-notification user preference, persisted in localStorage. The toggle
 * (`NotificationsToggle`) writes it; the side-effect component
 * (`DesktopNotifications`) reads it at fire time. No reactive store is needed
 * because firing only depends on the value at the moment of a transition, and
 * the toggle is the sole writer. Uses localStorage directly — no settings
 * capability, so the shell stays out of the settings/locale dependency graph.
 */

/** localStorage key holding `'1'` (enabled, the default) or `'0'` (disabled). */
const NOTIFICATIONS_PREF_KEY = 'dsh-desktop-notifications'

/**
 * Whether desktop notifications are enabled. Defaults to `true` when the API,
 * storage, or stored value is absent or unparsable — a missing preference
 * never silently disables a working feature.
 * @returns the persisted preference, defaulting to enabled.
 */
export function notificationsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_PREF_KEY)
    if (raw === null) return true
    return raw !== '0'
  } catch {
    // localStorage unavailable (private mode, disabled storage) — keep the
    // feature on; the toggle simply will not persist across reloads.
    return true
  }
}

/**
 * Persist the preference. Silently ignores storage failures so a toggle click
 * never throws into the React tree.
 * @param enabled - whether desktop notifications should fire.
 */
export function setNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATIONS_PREF_KEY, enabled ? '1' : '0')
  } catch {
    // Storage full or unavailable — the in-memory toggle state still flips;
    // only persistence is lost.
  }
}
