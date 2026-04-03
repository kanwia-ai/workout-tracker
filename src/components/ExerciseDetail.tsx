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

const KNEE_SAFETY_CONFIG: Record<KneeSafety, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  knee_safe: { label: 'Knee Safe', color: '#4ade80', bg: '#1e3a2e', icon: CheckCircle },
  knee_caution: { label: 'Use Caution', color: '#f59e0b', bg: '#3a2e1e', icon: AlertTriangle },
  knee_avoid: { label: 'Avoid', color: '#ef4444', bg: '#3a1e1e', icon: AlertTriangle },
}

interface ExerciseDetailProps {
  exercise: Exercise
  onBack: () => void
}

export function ExerciseDetail({ exercise, onBack }: ExerciseDetailProps) {
  const kneeConfig = KNEE_SAFETY_CONFIG[exercise.knee_safety]
  const KneeIcon = kneeConfig.icon

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-zinc-400 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-white truncate">
              {exercise.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-zinc-400 bg-surface-overlay px-1.5 py-0.5 rounded">
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </span>
              {exercise.movement_pattern && (
                <span className="text-[10px] font-semibold text-zinc-400 bg-surface-overlay px-1.5 py-0.5 rounded">
                  {MOVEMENT_LABELS[exercise.movement_pattern] || exercise.movement_pattern}
                </span>
              )}
              {exercise.laterality && (
                <span className="text-[10px] font-semibold text-zinc-400 bg-surface-overlay px-1.5 py-0.5 rounded capitalize">
                  {exercise.laterality}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Knee Safety Banner */}
        <div
          className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-3"
          style={{
            background: kneeConfig.bg,
            border: `1px solid ${kneeConfig.color}30`,
          }}
        >
          <KneeIcon size={18} className="shrink-0 mt-0.5" style={{ color: kneeConfig.color }} />
          <div>
            <div className="text-sm font-bold" style={{ color: kneeConfig.color }}>
              {kneeConfig.label}
            </div>
            {exercise.knee_safety_notes && (
              <div className="text-[12px] text-zinc-300 mt-0.5 leading-relaxed">
                {exercise.knee_safety_notes}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {exercise.description && (
          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
            <div className="text-sm text-zinc-300 leading-relaxed">
              {exercise.description}
            </div>
          </div>
        )}

        {/* Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
            <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2.5">
              How To
            </div>
            <ol className="space-y-2">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-xs font-extrabold text-brand mt-0.5 shrink-0 w-5 text-right">
                    {i + 1}.
                  </span>
                  <span className="text-[13px] text-zinc-300 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Form Cues */}
        {exercise.cues && exercise.cues.length > 0 && (
          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
            <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2.5">
              Form Cues
            </div>
            <div className="space-y-1.5">
              {exercise.cues.map((cue, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Info size={12} className="text-brand shrink-0 mt-1" />
                  <span className="text-[13px] text-zinc-300">{cue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Muscles Worked */}
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
          <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2.5">
            Muscles Worked
          </div>

          {/* Primary */}
          <div className="mb-2">
            <div className="text-[11px] text-zinc-500 font-semibold mb-1">Primary</div>
            <div className="flex flex-wrap gap-1.5">
              {exercise.primary_muscles.map(m => (
                <span
                  key={m}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background: '#f9731622', color: '#f97316' }}
                >
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>
          </div>

          {/* Secondary */}
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div>
              <div className="text-[11px] text-zinc-500 font-semibold mb-1">Secondary</div>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map(m => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-overlay text-zinc-400"
                  >
                    {MUSCLE_LABELS[m] || m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Equipment */}
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
          <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2.5">
            Equipment
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exercise.equipment.map(e => (
              <span
                key={e}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-overlay text-zinc-300"
              >
                {EQUIPMENT_LABELS[e] || e}
              </span>
            ))}
          </div>
        </div>

        {/* Source */}
        {exercise.source && (
          <div className="text-center text-[11px] text-zinc-600 mt-4">
            Source: {exercise.source}
          </div>
        )}
      </div>
    </div>
  )
}
