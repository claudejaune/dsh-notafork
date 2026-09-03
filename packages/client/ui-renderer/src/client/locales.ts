/**
 * `renderer` namespace dictionaries: the copy of the local-patch overlay
 * (desktop-notification toggle, desktop notifications).
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'toggle.enable': '开启桌面通知',
  'toggle.disable': '关闭桌面通知',
  'toggle.on': '桌面通知：开',
  'toggle.off': '桌面通知：关',
  'notify.question': '收到问题',
  'notify.planReview': '计划待审',
  'notify.approval': '等待批准',
  'notify.done': '已完成',
} satisfies Record<string, string>

/** The renderer overlay namespace key union. */
export type RendererKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'toggle.enable': 'Enable desktop notifications',
  'toggle.disable': 'Disable desktop notifications',
  'toggle.on': 'Desktop notifications: on',
  'toggle.off': 'Desktop notifications: off',
  'notify.question': 'Question',
  'notify.planReview': 'Plan review',
  'notify.approval': 'Waiting for approval',
  'notify.done': 'Done',
} satisfies Record<string, string>
