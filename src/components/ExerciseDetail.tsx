import { ChevronLeft, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { Exercise, KneeSafety } from '../types'

// ─── Display helpers ────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  hip_flexors: 'Hip Flexors', adductors: 'Adductors', abductors: 'Abductors',
  chest: 'Chest', back_upper: 'Upper Back', back_lower: 'Lower Back',
  lats: 'Lats', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', core_anterior: 'Abs', core_obliques: 'Obliques',
  core_posterior: 'Lower Back / Erectors', pelvic_floor: 'Pelvic Floor',
  full_body: 'Full Body',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'Bodyweight', dumbbells: 'Dumbbells', kettlebells: 'Kettlebells',
  barbell: 'Barbell', cable_machine: 'Cable Machine', smith_machine: 'Smith Machine',
  leg_press: 'Leg Press', leg_extension: 'Leg Extension', leg_curl: 'Leg Curl',
  lat_pulldown: 'Lat Pulldown', chest_press_machine: 'Chest Press',
  bench: 'Bench', pull_up_bar: 'Pull-Up Bar', resistance_band: 'Resistance Band',
  mini_band: 'Mini Band', foam_roller: 'Foam Roller', stability_ball: 'Stability Ball',
  trx_suspension: 'TRX', stair_master: 'StairMaster', treadmill: 'Treadmill',
  elliptical: 'Elliptical', stationary_bike: 'Bike', box_step: 'Box / Step',
  yoga_mat: 'Yoga Mat', medicine_ball: 'Medicine Ball', bosu_ball: 'BOSU Ball',
}

const MOVEMENT_LABELS: Record<string, string> = {
  squat: 'Squat', hinge: 'Hip Hinge', push_horizontal: 'Horizontal Push',
  push_vertical: 'Vertical Push', pull_horizontal: 'Horizontal Pull',
  pull_vertical: 'Vertical Pull', lunge: 'Lunge', carry: 'Carry',
  rotation: 'Rotation', anti_rotation: 'Anti-Rotation',
  anti_extension: 'Anti-Extension', anti_lateral_flexion: 'Anti-Lateral Flexion',
  isolation: 'Isolation', plyometric: 'Plyometric', mobility: 'Mobility',
  cardio: 'Cardio',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}

// Knee safety uses Lumo accent tokens: mint = safe, sun = caution, soft red = avoid.
const KNEE_SAFETY_CONFIG: Record<
  KneeSafety,
  { label: string; color: string; tintBg: string; tintBorder: string; icon: typeof CheckCircle }
> = {
  knee_safe: {
    label: 'Knee Safe',
    color: 'var(--accent-mint)',
    tintBg: 'color-mix(in srgb, var(--accent-mint) 18%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--accent-mint) 40%, transparent)',
    icon: CheckCircle,
  },
  knee_caution: {
    label: 'Use Caution',
    color: 'var(--accent-sun)',
    tintBg: 'color-mix(in srgb, var(--accent-sun) 18%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--accent-sun) 40%, transparent)',
    icon: AlertTriangle,
  },
  knee_avoid: {
    label: 'Avoid',
    color: '#ef4444',
    tintBg: 'color-mix(in srgb, #ef4444 16%, transparent)',
    tintBorder: 'color-mix(in srgb, #ef4444 40%, transparent)',
    icon: AlertTriangle,
  },
}

interface ExerciseDetailProps {
  exercise: Exercise
  onBack: () => void
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 22,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--lumo-text-ter)',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--lumo-text-sec)',
        background: 'var(--lumo-overlay)',
        border: '1px solid var(--lumo-border)',
        padding: '3px 8px',
        borderRadius: 10,
        textTransform: 'capitalize',
      }}
    >
      {children}
    </span>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExerciseDetail({ exercise, onBack }: ExerciseDetailProps) {
  const kneeConfig = KNEE_SAFETY_CONFIG[exercise.knee_safety]
  const KneeIcon = kneeConfig.icon

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
      className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
    >
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform"
            style={{ color: 'var(--lumo-text-sec)' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1
              className="truncate"
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'var(--lumo-text)',
              }}
            >
              {exercise.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <MetaChip>{DIFFICULTY_LABELS[exercise.difficulty]}</MetaChip>
              {exercise.movement_pattern && (
                <MetaChip>
                  {MOVEMENT_LABELS[exercise.movement_pattern] || exercise.movement_pattern}
                </MetaChip>
              )}
              {exercise.laterality && (
                <MetaChip>{exercise.laterality}</MetaChip>
              )}
            </div>
          </div>
        </div>

        {/* Knee Safety Banner */}
        <div
          className="flex items-start gap-3"
          style={{
            background: kneeConfig.tintBg,
            border: `1px solid ${kneeConfig.tintBorder}`,
            borderRadius: 22,
            padding: '14px 16px',
            marginBottom: 12,
          }}
        >
          <KneeIcon size={18} className="shrink-0 mt-0.5" style={{ color: kneeConfig.color }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: kneeConfig.color }}>
              {kneeConfig.label}
            </div>
            {exercise.knee_safety_notes && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--lumo-text-sec)',
                  marginTop: 3,
                  lineHeight: 1.45,
                }}
              >
                {exercise.knee_safety_notes}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {exercise.description && (
          <SectionCard>
            <div
              style={{
                fontSize: 14,
                color: 'var(--lumo-text)',
                lineHeight: 1.55,
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              {exercise.description}
            </div>
          </SectionCard>
        )}

        {/* Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <SectionCard>
            <Kicker>How to</Kicker>
            <ol className="space-y-2">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="tabular-nums shrink-0 mt-0.5"
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--brand)',
                      width: 20,
                      textAlign: 'right',
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--lumo-text)',
                      lineHeight: 1.5,
                    }}
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </SectionCard>
        )}

        {/* Form Cues */}
        {exercise.cues && exercise.cues.length > 0 && (
          <SectionCard>
            <Kicker>Form cues</Kicker>
            <div className="space-y-1.5">
              {exercise.cues.map((cue, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Info size={12} className="shrink-0 mt-1" style={{ color: 'var(--brand)' }} />
                  <span style={{ fontSize: 13, color: 'var(--lumo-text)' }}>{cue}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Muscles Worked */}
        <SectionCard>
          <Kicker>Muscles</Kicker>

          {/* Primary */}
          <div className="mb-3">
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--lumo-text-ter)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Primary
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exercise.primary_muscles.map(m => (
                <span
                  key={m}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
                    color: 'var(--brand)',
                    border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
                  }}
                >
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>
          </div>

          {/* Secondary */}
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--lumo-text-ter)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Secondary
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map(m => (
                  <span
                    key={m}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'var(--lumo-overlay)',
                      color: 'var(--lumo-text-sec)',
                      border: '1px solid var(--lumo-border)',
                    }}
                  >
                    {MUSCLE_LABELS[m] || m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Equipment */}
        <SectionCard>
          <Kicker>Equipment</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {exercise.equipment.map(e => (
              <span
                key={e}
                style={{
                  padding: '5px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'var(--lumo-overlay)',
                  color: 'var(--lumo-text)',
                  border: '1px solid var(--lumo-border)',
                }}
              >
                {EQUIPMENT_LABELS[e] || e}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Source */}
        {exercise.source && (
          <div
            className="text-center mt-4"
            style={{
              fontSize: 11,
              color: 'var(--lumo-text-ter)',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            source: {exercise.source}
          </div>
        )}
      </div>
    </div>
  )
}
