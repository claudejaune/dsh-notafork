/**
 * Desktop-notification user preference, persisted in localStorage. This
 * module owns writes (the toggle is the sole writer); the reader at fire
 * time is the renderer assembly's side-effect host
 * (`@deepseek-ai/dsh-client-ui-renderer`), which reads the same key with its
 * own minimal accessor. No reactive store is needed because firing only
 * depends on the value at the moment of a transition. Uses localStorage
 * directly — no settings capability, so the feature stays out of the
 * settings/locale dependency graph.
 */

/**
 * localStorage key holding `'1'` (enabled, the default) or `'0'` (disabled).
 * Shared by value with the renderer assembly's reader; both sides must spell
 * the same key.
 */
const NOTIFICATIONS_PREF_KEY = 'dsh-desktop-notifications'

/**
 * Whether desktop notifications are enabled. Defaults to `true` when the
 * storage or stored value is absent or unparsable — a missing preference
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
