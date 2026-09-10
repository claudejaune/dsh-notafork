// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { NotificationsToggle, type NotificationsToggleProps } from '../src/client/NotificationsToggle.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const t: NotificationsToggleProps['t'] = makeTranslate(zh)

function props(over: { stored?: string } = {}): NotificationsToggleProps {
  if (over.stored !== undefined) localStorage.setItem('dsh-desktop-notifications', over.stored)
  return { t } as unknown as NotificationsToggleProps
}

describe('NotificationsToggle', () => {
  it('starts enabled with the pressed state and no stored value', () => {
    const view = render(<NotificationsToggle {...props()} />)
    const button = screen.getByRole('button', { name: '关闭桌面通知' })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('title')).toBe('桌面通知：开')
    expect(button.getAttribute('data-enabled')).toBe('true')
    expect(button.querySelector('line')).toBeNull()
    expect(localStorage.getItem('dsh-desktop-notifications')).toBeNull()
    view.unmount()
  })

  it('persists disabled on click and shows the struck bell', () => {
    render(<NotificationsToggle {...props()} />)
    fireEvent.click(screen.getByRole('button'))
    const button = screen.getByRole('button', { name: '开启桌面通知' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.getAttribute('title')).toBe('桌面通知：关')
    expect(button.getAttribute('data-enabled')).toBe('false')
    expect(button.querySelector('line')).not.toBeNull()
    expect(localStorage.getItem('dsh-desktop-notifications')).toBe('0')
  })

  it('starts disabled when the stored preference says so', () => {
    render(<NotificationsToggle {...props({ stored: '0' })} />)
    const button = screen.getByRole('button', { name: '开启桌面通知' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.querySelector('line')).not.toBeNull()
  })

  it('re-enables and re-persists a stored disabled preference', () => {
    render(<NotificationsToggle {...props({ stored: '0' })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: '关闭桌面通知' }).getAttribute('aria-pressed')).toBe('true')
    expect(localStorage.getItem('dsh-desktop-notifications')).toBe('1')
  })
})
