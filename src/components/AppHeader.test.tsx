import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
  afterEach(() => cleanup())

  it('renders the Lumo wordmark', () => {
    render(<AppHeader onOpenSettings={() => {}} />)
    expect(screen.getByText(/^Lumo$/)).toBeInTheDocument()
  })

  it('fires onOpenSettings when the gear is tapped', () => {
    const onOpenSettings = vi.fn()
    render(<AppHeader onOpenSettings={onOpenSettings} />)
    fireEvent.click(screen.getByTestId('open-settings'))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('exposes an accessible label on the settings button', () => {
    render(<AppHeader onOpenSettings={() => {}} />)
    expect(screen.getByLabelText(/open settings/i)).toBeInTheDocument()
  })
})
