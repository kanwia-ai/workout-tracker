import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, ChevronLeft, X, Plus, Trash2 } from 'lucide-react'
import { EXERCISE_LIBRARY } from '../data/exercises'
import { ExerciseDetail } from './ExerciseDetail'
import { Lumo } from './Lumo'
import { supabase } from '../lib/supabase'
import {
  loadCustomExercises,
  saveCustomExercise,
  deleteCustomExercise,
  type CustomExerciseEquipment,
} from '../lib/customExercises'
import { extractYouTubeVideoId } from '../lib/youtube'
import type { LocalCustomExercise } from '../lib/db'
import type { Exercise, MuscleGroup, BodyRegion, Difficulty, KneeSafety, Equipment } from '../types'

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

const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  lower_body: 'Lower Body', upper_body: 'Upper Body', core: 'Core', full_body: 'Full Body',
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}

const KNEE_SAFETY_LABELS: Record<KneeSafety, string> = {
  knee_safe: 'Knee Safe', knee_caution: 'Caution', knee_avoid: 'Avoid',
}

// Knee safety colors — Lumo accents (mint/sun) + a soft red for the real
// warning case. Mirrors the palette in ExerciseDetail.
const KNEE_SAFETY_COLORS: Record<KneeSafety, string> = {
  knee_safe: 'var(--accent-mint)',
  knee_caution: 'var(--accent-sun)',
  knee_avoid: '#ef4444',
}

// ─── Filter chips (only the most commonly used values) ──────────────────────

const MUSCLE_FILTER_OPTIONS: MuscleGroup[] = [
  'glutes', 'quads', 'hamstrings', 'lats', 'chest', 'shoulders',
  'biceps', 'triceps', 'core_anterior', 'core_obliques', 'calves',
]

const EQUIPMENT_FILTER_OPTIONS: Equipment[] = [
  'bodyweight', 'dumbbells', 'kettlebells', 'barbell', 'cable_machine',
  'resistance_band', 'mini_band', 'bench', 'leg_press',
]

const BODY_REGION_OPTIONS: BodyRegion[] = ['lower_body', 'upper_body', 'core', 'full_body']
const DIFFICULTY_OPTIONS: Difficulty[] = ['beginner', 'intermediate', 'advanced']
const KNEE_SAFETY_OPTIONS: KneeSafety[] = ['knee_safe', 'knee_caution', 'knee_avoid']

// ─── Custom-exercise form constants ─────────────────────────────────────────
// Use the simple flat muscle list from the brief rather than the granular
// MuscleGroup enum — users building their own exercise don't need to decide
// between `back_upper`/`back_lower`/`lats`, and these map cleanly for display.
const CUSTOM_MUSCLE_OPTIONS = [
  'quads', 'hamstrings', 'glutes', 'calves',
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'cardio',
] as const
type CustomMuscle = typeof CUSTOM_MUSCLE_OPTIONS[number]

const CUSTOM_MUSCLE_LABELS: Record<CustomMuscle, string> = {
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps', core: 'Core', cardio: 'Cardio',
}

const CUSTOM_EQUIPMENT_OPTIONS: CustomExerciseEquipment[] = [
  'bodyweight', 'dumbbell', 'barbell', 'cable',
  'machine', 'kettlebell', 'bands', 'other',
]

const CUSTOM_EQUIPMENT_LABELS: Record<CustomExerciseEquipment, string> = {
  bodyweight: 'Body only',
  dumbbell: 'Dumbbell',
  barbell: 'Barbell',
  cable: 'Cable',
  machine: 'Machine',
  kettlebell: 'Kettlebell',
  bands: 'Bands',
  other: 'Other',
}

// ─── Shared style helpers ───────────────────────────────────────────────────

const KICKER_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
  marginBottom: 6,
}

function chipStyle(on: boolean, onColor?: string): React.CSSProperties {
  return {
    padding: '7px 12px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    background: on
      ? onColor ?? 'var(--brand)'
      : 'var(--lumo-overlay)',
    color: on ? 'var(--lumo-bg)' : 'var(--lumo-text-sec)',
    border: on
      ? '1px solid transparent'
      : '1px solid var(--lumo-border)',
    cursor: 'pointer',
    transition: 'background 160ms ease, color 160ms ease',
  }
}

interface ExerciseBrowserProps {
  onBack: () => void
}

export function ExerciseBrowser({ onBack }: ExerciseBrowserProps) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  // Filters
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | null>(null)
  const [bodyRegionFilter, setBodyRegionFilter] = useState<BodyRegion | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | null>(null)
  const [kneeSafetyFilter, setKneeSafetyFilter] = useState<KneeSafety | null>(null)
  const [mineOnly, setMineOnly] = useState(false)

  // Custom-exercise state
  const [userId, setUserId] = useState<string | null>(null)
  const [customExercises, setCustomExercises] = useState<LocalCustomExercise[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  // Resolve user id. In dev-bypass mode (useAuth also does this) we fall
  // back to `dev-user` so local testing works without Supabase credentials.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setUserId(data.session?.user?.id ?? 'dev-user')
    }).catch(() => {
      if (!cancelled) setUserId('dev-user')
    })
    return () => { cancelled = true }
  }, [])

  // Load custom exercises once we know who the user is.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadCustomExercises(userId).then(rows => {
      if (!cancelled) setCustomExercises(rows)
    })
    return () => { cancelled = true }
  }, [userId])

  const activeFilterCount = [muscleFilter, equipmentFilter, bodyRegionFilter, difficultyFilter, kneeSafetyFilter, mineOnly ? 'mine' : null]
    .filter(Boolean).length

  const clearFilters = () => {
    setMuscleFilter(null)
    setEquipmentFilter(null)
    setBodyRegionFilter(null)
    setDifficultyFilter(null)
    setKneeSafetyFilter(null)
    setMineOnly(false)
  }

  async function handleSaveCustom(input: {
    name: string
    primary_muscles: string[]
    secondary_muscles: string[]
    equipment: CustomExerciseEquipment
    video_url: string | null
    notes: string | null
  }) {
    if (!userId) return
    const row = await saveCustomExercise(userId, input)
    setCustomExercises(prev => [row, ...prev])
    setShowAddModal(false)
  }

  async function handleDeleteCustom(id: string) {
    await deleteCustomExercise(id)
    setCustomExercises(prev => prev.filter(c => c.id !== id))
  }

  const filtered = useMemo(() => {
    // "Mine only" short-circuits to the user's custom exercises — we skip the
    // curated library entirely. The downstream UI keys off `isCustom`.
    if (mineOnly) return [] as Exercise[]

    let pool = EXERCISE_LIBRARY

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      pool = pool.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.primary_muscles.some(m => MUSCLE_LABELS[m]?.toLowerCase().includes(q))
      )
    }

    // Muscle group
    if (muscleFilter) {
      pool = pool.filter(e =>
        e.primary_muscles.includes(muscleFilter) ||
        (e.secondary_muscles && e.secondary_muscles.includes(muscleFilter))
      )
    }

    // Equipment
    if (equipmentFilter) {
      pool = pool.filter(e => e.equipment.includes(equipmentFilter))
    }

    // Body region
    if (bodyRegionFilter) {
      pool = pool.filter(e => e.body_region === bodyRegionFilter)
    }

    // Difficulty
    if (difficultyFilter) {
      pool = pool.filter(e => e.difficulty === difficultyFilter)
    }

    // Knee safety
    if (kneeSafetyFilter) {
      pool = pool.filter(e => e.knee_safety === kneeSafetyFilter)
    }

    return pool
  }, [search, muscleFilter, equipmentFilter, bodyRegionFilter, difficultyFilter, kneeSafetyFilter, mineOnly])

  // Custom exercises visible right now. When "mine" is on we show ALL custom
  // rows (still respecting the search query). When filters target muscle or
  // equipment we also surface matching custom rows above the curated list so
  // the user's own work is never buried.
  const visibleCustom = useMemo(() => {
    let rows = customExercises
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(c => c.name.toLowerCase().includes(q)
        || c.primary_muscles.some(m => m.toLowerCase().includes(q))
        || (c.notes && c.notes.toLowerCase().includes(q)))
    }
    if (muscleFilter) {
      rows = rows.filter(c =>
        c.primary_muscles.includes(muscleFilter) ||
        c.secondary_muscles.includes(muscleFilter),
      )
    }
    return rows
  }, [customExercises, search, muscleFilter])

  // Exercise detail view
  if (selectedExercise) {
    return (
      <ExerciseDetail
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
      />
    )
  }

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
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'var(--lumo-text)',
              }}
            >
              Exercise Library
            </h1>
            <p
              style={{
                fontSize: 11,
                color: 'var(--lumo-text-ter)',
                marginTop: 2,
              }}
            >
              {filtered.length + visibleCustom.length} exercise{(filtered.length + visibleCustom.length) !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!userId}
            aria-label="Add your own exercise"
            className="active:scale-95 transition-transform disabled:opacity-40 flex items-center gap-1"
            style={{
              padding: '8px 12px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 800,
              background: 'var(--brand)',
              color: 'var(--lumo-bg)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--lumo-text-ter)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full outline-none transition-colors"
            style={{
              paddingLeft: 36,
              paddingRight: 40,
              paddingTop: 12,
              paddingBottom: 12,
              borderRadius: 16,
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text)',
              fontSize: 14,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--lumo-text-ter)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle button + "mine" chip */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="active:scale-95 transition-all flex items-center gap-2"
            style={{
              padding: '8px 12px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 700,
              background: showFilters || activeFilterCount > 0
                ? 'color-mix(in srgb, var(--brand) 14%, transparent)'
                : 'var(--lumo-raised)',
              color: showFilters || activeFilterCount > 0
                ? 'var(--brand)'
                : 'var(--lumo-text-sec)',
              border: activeFilterCount > 0
                ? '1px solid color-mix(in srgb, var(--brand) 35%, transparent)'
                : '1px solid var(--lumo-border)',
              cursor: 'pointer',
            }}
          >
            <Filter size={14} />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button
            onClick={() => setMineOnly(v => !v)}
            className="active:scale-95 transition-all"
            style={{
              padding: '8px 12px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 800,
              background: mineOnly
                ? 'var(--accent-plum)'
                : 'var(--lumo-raised)',
              color: mineOnly ? 'var(--lumo-bg)' : 'var(--lumo-text-sec)',
              border: mineOnly
                ? '1px solid transparent'
                : '1px solid var(--lumo-border)',
              cursor: 'pointer',
            }}
          >
            Mine{customExercises.length > 0 ? ` (${customExercises.length})` : ''}
          </button>
        </div>

        {/* Filter panels */}
        {showFilters && (
          <div
            className="mb-3 space-y-3"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              borderRadius: 22,
              padding: 14,
            }}
          >

            {/* Clear all button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="active:opacity-60"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--brand)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear all filters
              </button>
            )}

            {/* Muscle Group */}
            <div>
              <div style={KICKER_STYLE}>Muscle group</div>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_FILTER_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
                    className="active:scale-95"
                    style={chipStyle(muscleFilter === m)}
                  >
                    {MUSCLE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <div style={KICKER_STYLE}>Equipment</div>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_FILTER_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEquipmentFilter(equipmentFilter === e ? null : e)}
                    className="active:scale-95"
                    style={chipStyle(equipmentFilter === e)}
                  >
                    {EQUIPMENT_LABELS[e]}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Region */}
            <div>
              <div style={KICKER_STYLE}>Body region</div>
              <div className="flex flex-wrap gap-1.5">
                {BODY_REGION_OPTIONS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBodyRegionFilter(bodyRegionFilter === b ? null : b)}
                    className="active:scale-95"
                    style={chipStyle(bodyRegionFilter === b)}
                  >
                    {BODY_REGION_LABELS[b]}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <div style={KICKER_STYLE}>Difficulty</div>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(difficultyFilter === d ? null : d)}
                    className="active:scale-95"
                    style={chipStyle(difficultyFilter === d)}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Knee Safety */}
            <div>
              <div style={KICKER_STYLE}>Knee safety</div>
              <div className="flex flex-wrap gap-1.5">
                {KNEE_SAFETY_OPTIONS.map(k => (
                  <button
                    key={k}
                    onClick={() => setKneeSafetyFilter(kneeSafetyFilter === k ? null : k)}
                    className="active:scale-95"
                    style={chipStyle(kneeSafetyFilter === k, KNEE_SAFETY_COLORS[k])}
                  >
                    {KNEE_SAFETY_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-2">
          {visibleCustom.map(c => (
            <div
              key={c.id}
              style={{
                position: 'relative',
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 20,
                padding: '14px 16px',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className="truncate"
                      style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}
                    >
                      {c.name}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 8,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--accent-plum)',
                        background: 'color-mix(in srgb, var(--accent-plum) 14%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--accent-plum) 30%, transparent)',
                      }}
                    >
                      Custom
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {c.primary_muscles.slice(0, 3).map(m => (
                      <span
                        key={m}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--lumo-text-sec)',
                          background: 'var(--lumo-overlay)',
                          border: '1px solid var(--lumo-border)',
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {CUSTOM_MUSCLE_LABELS[m as CustomMuscle] || m}
                      </span>
                    ))}
                    {c.equipment && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--lumo-text-ter)',
                          background: 'var(--lumo-overlay)',
                          border: '1px solid var(--lumo-border)',
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {CUSTOM_EQUIPMENT_LABELS[c.equipment as CustomExerciseEquipment] || c.equipment}
                      </span>
                    )}
                  </div>
                  {c.notes && (
                    <div
                      className="line-clamp-1"
                      style={{ fontSize: 11, color: 'var(--lumo-text-ter)', marginTop: 6 }}
                    >
                      {c.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteCustom(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="p-1 shrink-0 active:scale-95 transition-transform"
                  style={{
                    color: 'var(--accent-plum)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {filtered.map(exercise => (
            <button
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
              className="w-full text-left active:scale-[0.98] transition-transform"
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 20,
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}
                  >
                    {exercise.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {exercise.primary_muscles.slice(0, 2).map(m => (
                      <span
                        key={m}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--lumo-text-sec)',
                          background: 'var(--lumo-overlay)',
                          border: '1px solid var(--lumo-border)',
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {MUSCLE_LABELS[m] || m}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 8,
                        color: KNEE_SAFETY_COLORS[exercise.knee_safety],
                        background: `color-mix(in srgb, ${KNEE_SAFETY_COLORS[exercise.knee_safety]} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${KNEE_SAFETY_COLORS[exercise.knee_safety]} 30%, transparent)`,
                      }}
                    >
                      {exercise.knee_safety === 'knee_safe' ? 'Safe' : exercise.knee_safety === 'knee_caution' ? 'Caution' : 'Avoid'}
                    </span>
                  </div>
                  {exercise.description && (
                    <div
                      className="line-clamp-1"
                      style={{ fontSize: 11, color: 'var(--lumo-text-ter)', marginTop: 6 }}
                    >
                      {exercise.description}
                    </div>
                  )}
                </div>
                <div
                  className="shrink-0 mt-0.5"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--lumo-text-ter)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {DIFFICULTY_LABELS[exercise.difficulty]}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && visibleCustom.length === 0 && (
          <div
            className="text-center mt-2"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              borderRadius: 22,
              padding: '32px 20px',
            }}
          >
            <div className="flex justify-center mb-2">
              <Lumo state="curious" size={72} />
            </div>
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.3,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              {mineOnly
                ? 'no custom exercises yet — tap "add" to save your own.'
                : 'no matches — try loosening the filters.'}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 active:opacity-60"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--brand)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {showAddModal && userId && (
        <AddCustomExerciseModal
          onCancel={() => setShowAddModal(false)}
          onSave={handleSaveCustom}
        />
      )}
    </div>
  )
}

// ─── Add-custom modal ───────────────────────────────────────────────────────

interface AddCustomModalProps {
  onCancel: () => void
  onSave: (input: {
    name: string
    primary_muscles: string[]
    secondary_muscles: string[]
    equipment: CustomExerciseEquipment
    video_url: string | null
    notes: string | null
  }) => void | Promise<void>
}

function AddCustomExerciseModal({ onCancel, onSave }: AddCustomModalProps) {
  const [name, setName] = useState('')
  const [primary, setPrimary] = useState<CustomMuscle[]>([])
  const [secondary, setSecondary] = useState<CustomMuscle[]>([])
  const [equipment, setEquipment] = useState<CustomExerciseEquipment>('bodyweight')
  const [videoUrl, setVideoUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const nameError = name.trim().length === 0 ? 'Name is required.' : null
  const muscleError = primary.length === 0 ? 'Pick at least one muscle.' : null
  // Tolerant URL validation — an empty value is fine, but if the user typed
  // something that isn't a parseable URL at all we surface an inline warning.
  // We don't block save on an unparseable URL (user might paste a raw ID);
  // we only flag URLs that look like YouTube but don't have a video id.
  const videoWarning = (() => {
    const trimmed = videoUrl.trim()
    if (!trimmed) return null
    if (/youtube\.com|youtu\.be/i.test(trimmed) && !extractYouTubeVideoId(trimmed)) {
      return 'This looks like a YouTube URL but we couldn\'t find a video ID.'
    }
    return null
  })()
  const canSave = !nameError && !muscleError && !saving

  function toggleMuscle(m: CustomMuscle, target: 'primary' | 'secondary') {
    if (target === 'primary') {
      setPrimary(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    } else {
      setSecondary(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    }
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        primary_muscles: primary,
        // Filter out any muscle that's also in `primary` — keep the two lists
        // disjoint so we don't double-count in downstream filtering.
        secondary_muscles: secondary.filter(m => !primary.includes(m)),
        equipment,
        video_url: videoUrl.trim() || null,
        notes: notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 14,
    background: 'var(--lumo-overlay)',
    border: '1px solid var(--lumo-border)',
    color: 'var(--lumo-text)',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 pb-3 pt-6 safe-top"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          borderRadius: 22,
          padding: 18,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--lumo-text)',
              letterSpacing: '-0.01em',
            }}
          >
            Add your own exercise
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="active:scale-95"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'var(--lumo-overlay)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Name */}
        <label className="block mb-3">
          <span style={{ ...KICKER_STYLE, display: 'block' }}>Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Incline Push-ups"
            autoFocus
            style={inputStyle}
          />
        </label>

        {/* Primary muscles */}
        <div className="mb-3">
          <div style={KICKER_STYLE}>
            Primary muscles <span style={{ color: 'var(--lumo-text-ter)', textTransform: 'none', letterSpacing: 0 }}>(required)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOM_MUSCLE_OPTIONS.map(m => {
              const on = primary.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m, 'primary')}
                  className="active:scale-95"
                  style={chipStyle(on)}
                >
                  {CUSTOM_MUSCLE_LABELS[m]}
                </button>
              )
            })}
          </div>
          {muscleError && (
            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{muscleError}</div>
          )}
        </div>

        {/* Secondary muscles */}
        <div className="mb-3">
          <div style={KICKER_STYLE}>
            Secondary muscles <span style={{ color: 'var(--lumo-text-ter)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOM_MUSCLE_OPTIONS.map(m => {
              const on = secondary.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m, 'secondary')}
                  className="active:scale-95"
                  style={chipStyle(on, 'var(--accent-plum)')}
                >
                  {CUSTOM_MUSCLE_LABELS[m]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-3">
          <div style={KICKER_STYLE}>Equipment</div>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOM_EQUIPMENT_OPTIONS.map(eq => {
              const on = equipment === eq
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setEquipment(eq)}
                  className="active:scale-95"
                  style={chipStyle(on)}
                >
                  {CUSTOM_EQUIPMENT_LABELS[eq]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Video URL */}
        <label className="block mb-3">
          <span style={{ ...KICKER_STYLE, display: 'block' }}>
            Video URL <span style={{ color: 'var(--lumo-text-ter)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </span>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            inputMode="url"
            style={inputStyle}
          />
          {videoWarning && (
            <div style={{ fontSize: 11, color: 'var(--accent-sun)', marginTop: 6 }}>
              {videoWarning}
            </div>
          )}
        </label>

        {/* Notes */}
        <label className="block mb-4">
          <span style={{ ...KICKER_STYLE, display: 'block' }}>
            Notes <span style={{ color: 'var(--lumo-text-ter)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Form cues, weight range, rest time..."
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 active:scale-95 transition-transform"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              background: 'var(--lumo-overlay)',
              color: 'var(--lumo-text-sec)',
              border: '1px solid var(--lumo-border)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              background: 'var(--brand)',
              color: 'var(--lumo-bg)',
              border: 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
