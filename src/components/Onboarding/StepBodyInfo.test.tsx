import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepBodyInfo } from './StepBodyInfo'

describe('StepBodyInfo', () => {
  it('requires age and sex', () => {
    const onNext = vi.fn()
    render(<StepBodyInfo onNext={onNext} />)
    fireEvent.click(screen.getByTestId('step-body-info-next'))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('submits age + sex; omits weight/height when blank', () => {
    const onNext = vi.fn()
    render(<StepBodyInfo onNext={onNext} />)
    fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText(/female/i))
    fireEvent.click(screen.getByTestId('step-body-info-next'))
    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ age: 30, sex: 'female' }),
    )
    const call = onNext.mock.calls[0][0]
    expect(call.weight_kg).toBeUndefined()
    expect(call.height_cm).toBeUndefined()
  })

  it('submits weight and height when provided', () => {
    const onNext = vi.fn()
    render(<StepBodyInfo onNext={onNext} />)
    // Default units is 'imperial' — switch to metric so the test speaks kg/cm directly.
    fireEvent.click(screen.getByTestId('step-body-info-units-metric'))
    fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: '28' } })
    fireEvent.click(screen.getByLabelText(/^male$/i))
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '72' } })
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '175' } })
    fireEvent.click(screen.getByTestId('step-body-info-next'))
    expect(onNext).toHaveBeenCalledWith({
      age: 28,
      sex: 'male',
      weight_kg: 72,
      height_cm: 175,
      units: 'metric',
    })
  })
})
