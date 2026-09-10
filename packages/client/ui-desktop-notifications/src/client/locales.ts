/**
 * `desktop-notifications` namespace dictionaries: the Session-header toggle
 * capsule copy. The notification titles themselves stay in the renderer
 * assembly's `renderer` namespace (`@deepseek-ai/dsh-client-ui-renderer`).
 */

/** Locale dictionary key union. */
export type ToggleKey =
  | 'toggle.enable'
  | 'toggle.disable'
  | 'toggle.on'
  | 'toggle.off'

/** Simplified Chinese dictionary. */
export const zh: Record<ToggleKey, string> = {
  'toggle.enable': '开启桌面通知',
  'toggle.disable': '关闭桌面通知',
  'toggle.on': '桌面通知：开',
  'toggle.off': '桌面通知：关',
}

/** English dictionary, checked complete against the zh key set. */
export const en: Record<ToggleKey, string> = {
  'toggle.enable': 'Enable desktop notifications',
  'toggle.disable': 'Disable desktop notifications',
  'toggle.on': 'Desktop notifications: on',
  'toggle.off': 'Desktop notifications: off',
}

/** The locale namespace id this package owns. */
export const NS = 'desktop-notifications'
