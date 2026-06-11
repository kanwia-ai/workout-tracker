// "adjust today" — one sheet for today-only session edits:
//   - add mobility for a tight area (woven into the session, not a screen)
//   - re-pick exercises for the equipment actually available today
//   - jump to video capture to add something new
//   - reset today back to the plan
// Everything writes a DayAmendment via saveAmendmentForDate; useDayOverrides
// reactivity updates HomeScreen/WorkoutView automatically. The plan itself
// is never touched.
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Link2, RotateCcw, Sparkles, Wrench, X } from 'lucide-react'
import type { PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import { Equipment } from '../types/profile'
import {
  MOBILITY_AREAS,
  MOBILITY_AREA_LABELS,
  equipmentRepickForSession,
  loadAmendmentForDate,
  mobilityExercisesForArea,
  saveAmendmentForDate,
  clearAmendmentForDate,
  type MobilityArea,
  type EquipmentRepick,
} from '../lib/amendToday'
import { amendmentIsEmpty, emptyAmendment, type DayAmendment } from '../types/amendment'
import { loadProfileLocal } from '../lib/profileRepo'

const EQUIPMENT_LABELS: Record<UserProgramProfile['equipment'][number], string> = {
  full_gym: 'full gym',
  home_weights: 'home weights',
  bands_only: 'bands',
  bodyweight_only: 'bodyweight',
  cable_machine: 'cable machine',
  barbell: 'barbell',
}

interface AdjustTodaySheetProps {
  userId: string
  dateISO: string
  /** Today's session WITHOUT the amendment applied (the editing baseline). */
  scheduledSession: PlannedSession
  onClose: () => void
  /** Route to the video-capture flow ("paste a link"). */
  onNavigateToCapture?: () => void
}

type Panel = 'root' | 'mobility' | 'equipment'

export function AdjustTodaySheet({
  userId,
  dateISO,
  scheduledSession,
  onClose,
  onNavigateToCapture,
}: AdjustTodaySheetProps) {
  const [panel, setPanel] = useState<Panel>('root')
  const [amendment, setAmendment] = useState<DayAmendment>(emptyAmendment())
  const [profile, setProfile] = useState<UserProgramProfile | null>(null)
  const [area, setArea] = useState<MobilityArea | null>(null)
  const [equipToday, setEquipToday] = useState<Set<string>>(new Set())
  const [repick, setRepick] = useState<EquipmentRepick | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadAmendmentForDate(userId, dateISO).then(setAmendment)
    void loadProfileLocal(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
  }, [userId, dateISO])

  useEffect(() => {
    // Equipment chips default: existing amendment beats profile.
    if (amendment.equipment_today) {
      setEquipToday(new Set(amendment.equipment_today))
    } else if (profile) {
      setEquipToday(new Set(profile.equipment))
    }
  }, [amendment.equipment_today, profile])

  const persist = async (next: DayAmendment) => {
    setSaving(true)
    try {
      await saveAmendmentForDate(userId, dateISO, scheduledSession.id, next)
      setAmendment(next)
    } finally {
      setSaving(false)
    }
  }

  // ── add mobility ──
  const previewMoves = useMemo(
    () => (area ? mobilityExercisesForArea(area) : []),
    [area],
  )
  const addMobility = async () => {
    if (!area) return
    const existing = new Set(amendment.added_exercises.map((e) => e.library_id))
    const fresh = previewMoves.filter((m) => !existing.has(m.library_id))
    await persist({
      ...amendment,
      added_exercises: [...amendment.added_exercises, ...fresh],
    })
    onClose()
  }

  // ── different equipment ──
  const computeRepick = () => {
    if (!profile) return
    const equipment = [...equipToday] as UserProgramProfile['equipment']
    if (equipment.length === 0) return
    setRepick(equipmentRepickForSession(scheduledSession, equipment, profile))
  }
  const applyRepick = async () => {
    if (!repick) return
    await persist({
      ...amendment,
      equipment_today: [...equipToday] as UserProgramProfile['equipment'],
      swaps: repick.swaps,
    })
    onClose()
  }

  const resetToday = async () => {
    await clearAmendmentForDate(userId, dateISO, scheduledSession.id)
    setAmendment(emptyAmendment())
    onClose()
  }

  const nameOf = (libraryId: string): string =>
    scheduledSession.exercises.find((e) => e.library_id === libraryId)?.name ?? libraryId

  const active = !amendmentIsEmpty(amendment)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-today-title"
      data-testid="adjust-today-sheet"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 12,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          borderRadius: 20,
          padding: 22,
          color: 'var(--lumo-text)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2
            id="adjust-today-title"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 22,
              margin: 0,
            }}
          >
            adjust today
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--lumo-text-sec)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--lumo-text-sec)', margin: '0 0 16px' }}>
          just for today — your plan stays exactly as it was.
        </p>

        {panel === 'root' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RowButton
              testId="adjust-add-mobility"
              icon={<Sparkles size={16} />}
              title="add mobility"
              subtitle="tight hips? stiff back? slot a short block into today"
              onClick={() => setPanel('mobility')}
            />
            <RowButton
              testId="adjust-equipment"
              icon={<Wrench size={16} />}
              title="different equipment today"
              subtitle="hotel gym, home, no barbell — re-pick today's exercises"
              onClick={() => setPanel('equipment')}
            />
            {onNavigateToCapture && (
              <RowButton
                testId="adjust-capture"
                icon={<Link2 size={16} />}
                title="add from a video"
                subtitle="paste a youtube short — we'll turn it into an exercise"
                onClick={() => {
                  onClose()
                  onNavigateToCapture()
                }}
              />
            )}
            {active && (
              <button
                type="button"
                data-testid="adjust-reset"
                onClick={() => void resetToday()}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'center',
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px dashed var(--lumo-border-strong)',
                  background: 'transparent',
                  color: 'var(--lumo-text-sec)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
                reset today to the original plan
              </button>
            )}
          </div>
        )}

        {panel === 'mobility' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--lumo-text-sec)', margin: '0 0 10px' }}>
              where do you want to open up?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {MOBILITY_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  data-testid={`mobility-area-${a}`}
                  onClick={() => setArea(a)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: `1.5px solid ${area === a ? 'var(--brand)' : 'var(--lumo-border)'}`,
                    background: area === a ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
                    color: 'var(--lumo-text)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {MOBILITY_AREA_LABELS[a]}
                </button>
              ))}
            </div>
            {area && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {previewMoves.map((m) => (
                  <div
                    key={m.library_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid var(--lumo-border)',
                      fontSize: 13,
                    }}
                  >
                    <span>{m.name}</span>
                    <span style={{ color: 'var(--lumo-text-ter)' }}>
                      {m.sets}×{m.reps}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <SheetFooter
              backLabel="back"
              onBack={() => { setArea(null); setPanel('root') }}
              confirmLabel={saving ? 'adding…' : 'add to today'}
              confirmDisabled={!area || saving}
              confirmTestId="mobility-confirm"
              onConfirm={() => void addMobility()}
            />
          </div>
        )}

        {panel === 'equipment' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--lumo-text-sec)', margin: '0 0 10px' }}>
              what's actually available today?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {Equipment.options.map((eq) => {
                const on = equipToday.has(eq)
                return (
                  <button
                    key={eq}
                    type="button"
                    data-testid={`equip-today-${eq}`}
                    onClick={() => {
                      setEquipToday((prev) => {
                        const next = new Set(prev)
                        if (next.has(eq)) next.delete(eq)
                        else next.add(eq)
                        return next
                      })
                      setRepick(null)
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: `1.5px solid ${on ? 'var(--brand)' : 'var(--lumo-border)'}`,
                      background: on ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
                      color: 'var(--lumo-text)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {EQUIPMENT_LABELS[eq]}
                  </button>
                )
              })}
            </div>

            {repick && (
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(repick.swaps).map(([fromId, to]) => (
                  <div
                    key={fromId}
                    data-testid="repick-swap-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid var(--lumo-border)',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--lumo-text-ter)', textDecoration: 'line-through' }}>
                      {nameOf(fromId)}
                    </span>
                    <ArrowRight size={13} style={{ color: 'var(--lumo-text-ter)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{to.name}</span>
                  </div>
                ))}
                {Object.keys(repick.swaps).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--lumo-text-sec)', margin: 0 }}>
                    everything in today's session already works with that gear. nice.
                  </p>
                )}
                {repick.unswappable.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--lumo-text-ter)', margin: 0 }}>
                    no good stand-in for: {repick.unswappable.map(nameOf).join(', ')} — kept as-is, skip if you can't load it.
                  </p>
                )}
              </div>
            )}

            <SheetFooter
              backLabel="back"
              onBack={() => { setRepick(null); setPanel('root') }}
              confirmLabel={
                repick
                  ? saving ? 'applying…' : 'apply to today'
                  : 'preview changes'
              }
              confirmDisabled={equipToday.size === 0 || saving || !profile}
              confirmTestId="equipment-confirm"
              onConfirm={() => (repick ? void applyRepick() : computeRepick())}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function RowButton({
  icon,
  title,
  subtitle,
  onClick,
  testId,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '13px 14px',
        borderRadius: 14,
        border: '1px solid var(--lumo-border)',
        background: 'transparent',
        color: 'var(--lumo-text)',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: 'var(--brand)', display: 'flex' }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--lumo-text-sec)' }}>{subtitle}</span>
      </span>
    </button>
  )
}

function SheetFooter({
  backLabel,
  onBack,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  confirmTestId,
}: {
  backLabel: string
  onBack: () => void
  confirmLabel: string
  confirmDisabled: boolean
  onConfirm: () => void
  confirmTestId: string
}) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          flex: 1,
          padding: '12px 0',
          borderRadius: 12,
          border: '1px solid var(--lumo-border)',
          background: 'transparent',
          color: 'var(--lumo-text-sec)',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {backLabel}
      </button>
      <button
        type="button"
        data-testid={confirmTestId}
        onClick={onConfirm}
        disabled={confirmDisabled}
        style={{
          flex: 2,
          padding: '12px 0',
          borderRadius: 12,
          border: 'none',
          background: confirmDisabled ? 'var(--lumo-border)' : 'var(--brand)',
          color: confirmDisabled ? 'var(--lumo-text-ter)' : '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: confirmDisabled ? 'default' : 'pointer',
        }}
      >
        {confirmLabel}
      </button>
    </div>
  )
}
