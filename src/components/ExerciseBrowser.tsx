import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, ChevronLeft, X, Plus, Trash2 } from 'lucide-react'
import { EXERCISE_LIBRARY } from '../data/exercises'
import { ExerciseDetail } from './ExerciseDetail'
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

const KNEE_SAFETY_COLORS: Record<KneeSafety, string> = {
  knee_safe: '#4ade80',
  knee_caution: '#f59e0b',
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
            <h1 className="text-[20px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
              Exercise Library
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {filtered.length + visibleCustom.length} exercise{(filtered.length + visibleCustom.length) !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!userId}
            aria-label="Add your own exercise"
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-brand text-white active:scale-95 transition-transform disabled:opacity-40"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-raised border border-border-subtle text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle button + "mine" chip */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: showFilters || activeFilterCount > 0 ? '#f9731622' : '#1a1a1e',
              color: showFilters || activeFilterCount > 0 ? '#f97316' : '#888',
              border: activeFilterCount > 0 ? '1px solid #f9731644' : '1px solid #2a2a2e',
            }}
          >
            <Filter size={14} />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button
            onClick={() => setMineOnly(v => !v)}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: mineOnly ? 'var(--accent-plum, #a78bfa)' : '#1a1a1e',
              color: mineOnly ? '#fff' : '#888',
              border: mineOnly ? '1px solid transparent' : '1px solid #2a2a2e',
            }}
          >
            Mine{customExercises.length > 0 ? ` (${customExercises.length})` : ''}
          </button>
        </div>

        {/* Filter panels */}
        {showFilters && (
          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5 mb-3 space-y-3">

            {/* Clear all button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-brand font-semibold active:opacity-60"
              >
                Clear all filters
              </button>
            )}

            {/* Muscle Group */}
            <div>
              <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Muscle Group</div>
              <div className="flex flex-wrap gap-1">
                {MUSCLE_FILTER_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: muscleFilter === m ? '#f97316' : '#2a2a2e',
                      color: muscleFilter === m ? '#fff' : '#888',
                    }}
                  >
                    {MUSCLE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Equipment</div>
              <div className="flex flex-wrap gap-1">
                {EQUIPMENT_FILTER_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEquipmentFilter(equipmentFilter === e ? null : e)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: equipmentFilter === e ? '#f97316' : '#2a2a2e',
                      color: equipmentFilter === e ? '#fff' : '#888',
                    }}
                  >
                    {EQUIPMENT_LABELS[e]}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Region */}
            <div>
              <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Body Region</div>
              <div className="flex flex-wrap gap-1">
                {BODY_REGION_OPTIONS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBodyRegionFilter(bodyRegionFilter === b ? null : b)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: bodyRegionFilter === b ? '#f97316' : '#2a2a2e',
                      color: bodyRegionFilter === b ? '#fff' : '#888',
                    }}
                  >
                    {BODY_REGION_LABELS[b]}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Difficulty</div>
              <div className="flex flex-wrap gap-1">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(difficultyFilter === d ? null : d)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: difficultyFilter === d ? '#f97316' : '#2a2a2e',
                      color: difficultyFilter === d ? '#fff' : '#888',
                    }}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Knee Safety */}
            <div>
              <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Knee Safety</div>
              <div className="flex flex-wrap gap-1">
                {KNEE_SAFETY_OPTIONS.map(k => (
                  <button
                    key={k}
                    onClick={() => setKneeSafetyFilter(kneeSafetyFilter === k ? null : k)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: kneeSafetyFilter === k ? KNEE_SAFETY_COLORS[k] : '#2a2a2e',
                      color: kneeSafetyFilter === k ? (k === 'knee_safe' ? '#111' : '#fff') : '#888',
                    }}
                  >
                    {KNEE_SAFETY_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-1.5">
          {visibleCustom.map(c => (
            <div
              key={c.id}
              className="relative bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-bold text-zinc-200 truncate">{c.name}</div>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{ color: 'var(--accent-plum, #a78bfa)', background: 'rgba(167, 139, 250, 0.14)' }}
                    >
                      Custom
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {c.primary_muscles.slice(0, 3).map(m => (
                      <span key={m} className="text-[10px] font-semibold text-zinc-400 bg-surface-overlay px-1.5 py-0.5 rounded">
                        {CUSTOM_MUSCLE_LABELS[m as CustomMuscle] || m}
                      </span>
                    ))}
                    {c.equipment && (
                      <span className="text-[10px] font-semibold text-zinc-500 bg-surface-overlay px-1.5 py-0.5 rounded">
                        {CUSTOM_EQUIPMENT_LABELS[c.equipment as CustomExerciseEquipment] || c.equipment}
                      </span>
                    )}
                  </div>
                  {c.notes && (
                    <div className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
                      {c.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteCustom(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="text-zinc-600 hover:text-red-400 p-1 shrink-0 active:scale-95 transition-transform"
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
              className="w-full text-left bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-zinc-200 truncate">{exercise.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {exercise.primary_muscles.slice(0, 2).map(m => (
                      <span key={m} className="text-[10px] font-semibold text-zinc-400 bg-surface-overlay px-1.5 py-0.5 rounded">
                        {MUSCLE_LABELS[m] || m}
                      </span>
                    ))}
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: KNEE_SAFETY_COLORS[exercise.knee_safety],
                        background: KNEE_SAFETY_COLORS[exercise.knee_safety] + '18',
                      }}
                    >
                      {exercise.knee_safety === 'knee_safe' ? 'Safe' : exercise.knee_safety === 'knee_caution' ? 'Caution' : 'Avoid'}
                    </span>
                  </div>
                  {exercise.description && (
                    <div className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
                      {exercise.description}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-zinc-600 font-semibold mt-0.5 shrink-0">
                  {DIFFICULTY_LABELS[exercise.difficulty]}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && visibleCustom.length === 0 && (
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-2 border border-border-subtle">
            <div className="text-4xl mb-3">{mineOnly ? '✨' : '🔍'}</div>
            <div className="text-lg font-bold text-zinc-400">
              {mineOnly ? 'No custom exercises yet' : 'No exercises found'}
            </div>
            <div className="text-zinc-500 text-sm mt-1.5">
              {mineOnly
                ? 'Tap "Add" to save your own variations.'
                : 'Try adjusting your search or filters'}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-brand text-sm font-semibold active:opacity-60"
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center px-3 pb-3 pt-6 safe-top"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-surface-raised border border-border-subtle rounded-2xl p-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-extrabold text-zinc-100">Add your own exercise</div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 rounded-lg text-zinc-500 active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Name */}
        <label className="block mb-3">
          <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1 block">Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Incline Push-ups"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl bg-surface-overlay border border-border-subtle text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand"
          />
        </label>

        {/* Primary muscles */}
        <div className="mb-3">
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Primary muscles <span className="text-zinc-600">(required)</span></div>
          <div className="flex flex-wrap gap-1">
            {CUSTOM_MUSCLE_OPTIONS.map(m => {
              const on = primary.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m, 'primary')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: on ? '#f97316' : '#2a2a2e',
                    color: on ? '#fff' : '#888',
                  }}
                >
                  {CUSTOM_MUSCLE_LABELS[m]}
                </button>
              )
            })}
          </div>
          {muscleError && (
            <div className="text-[11px] text-red-400 mt-1.5">{muscleError}</div>
          )}
        </div>

        {/* Secondary muscles */}
        <div className="mb-3">
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Secondary muscles <span className="text-zinc-600">(optional)</span></div>
          <div className="flex flex-wrap gap-1">
            {CUSTOM_MUSCLE_OPTIONS.map(m => {
              const on = secondary.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m, 'secondary')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: on ? '#7c3aed' : '#2a2a2e',
                    color: on ? '#fff' : '#888',
                  }}
                >
                  {CUSTOM_MUSCLE_LABELS[m]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-3">
          <div className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">Equipment</div>
          <div className="flex flex-wrap gap-1">
            {CUSTOM_EQUIPMENT_OPTIONS.map(eq => {
              const on = equipment === eq
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setEquipment(eq)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: on ? '#f97316' : '#2a2a2e',
                    color: on ? '#fff' : '#888',
                  }}
                >
                  {CUSTOM_EQUIPMENT_LABELS[eq]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Video URL */}
        <label className="block mb-3">
          <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1 block">Video URL <span className="text-zinc-600">(optional)</span></span>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            inputMode="url"
            className="w-full px-3 py-2.5 rounded-xl bg-surface-overlay border border-border-subtle text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand"
          />
          {videoWarning && (
            <div className="text-[11px] text-amber-400 mt-1.5">{videoWarning}</div>
          )}
        </label>

        {/* Notes */}
        <label className="block mb-4">
          <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-1 block">Notes <span className="text-zinc-600">(optional)</span></span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Form cues, weight range, rest time..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-surface-overlay border border-border-subtle text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand resize-none"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-surface-overlay text-zinc-400 border border-border-subtle active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-brand text-white active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
