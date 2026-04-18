import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { PRCelebration } from './PRCelebration'

describe('PRCelebration', () => {
  const baseProps = {
    exerciseName: 'Bulgarian Split Squat',
    oldValue: '95 lb × 5',
    newValue: '100 lb × 5',
  }

  it('renders old/new values and exercise name when open', () => {
    render(
      <PRCelebration open onClose={vi.fn()} {...baseProps} />,
    )

    expect(screen.getByText('NEW PR')).toBeInTheDocument()
    expect(screen.getByText('Bulgarian Split Squat')).toBeInTheDocument()
    expect(screen.getByTestId('pr-old-value')).toHaveTextContent('95 lb × 5')
    expect(screen.getByTestId('pr-new-value')).toHaveTextContent('100 lb × 5')
  })

  it('renders the optional metric label when provided', () => {
    render(
      <PRCelebration
        open
        onClose={vi.fn()}
        metric="1RM estimate"
        {...baseProps}
      />,
    )

    expect(screen.getByText('1RM estimate')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <PRCelebration open={false} onClose={vi.fn()} {...baseProps} />,
    )

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('NEW PR')).not.toBeInTheDocument()
  })

  it('sets role=dialog and aria-modal=true', () => {
    render(
      <PRCelebration open onClose={vi.fn()} {...baseProps} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // Labelled by the NEW PR heading.
    const headingId = dialog.getAttribute('aria-labelledby')
    expect(headingId).toBeTruthy()
    expect(document.getElementById(headingId!)).toHaveTextContent('NEW PR')
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <PRCelebration open onClose={onClose} {...baseProps} />,
    )

    const backdrop = screen.getByTestId('pr-celebration-backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onClose when the card itself is clicked', () => {
    const onClose = vi.fn()
    render(
      <PRCelebration open onClose={onClose} {...baseProps} />,
    )

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <PRCelebration open onClose={onClose} {...baseProps} />,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the keep-going button is clicked', () => {
    const onClose = vi.fn()
    render(
      <PRCelebration open onClose={onClose} {...baseProps} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /keep going/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
