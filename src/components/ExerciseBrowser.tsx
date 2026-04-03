import { useState, useMemo } from 'react'
import { Search, Filter, ChevronLeft, X } from 'lucide-react'
import { EXERCISE_LIBRARY } from '../data/exercises'
import { ExerciseDetail } from './ExerciseDetail'
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

  const activeFilterCount = [muscleFilter, equipmentFilter, bodyRegionFilter, difficultyFilter, kneeSafetyFilter]
    .filter(Boolean).length

  const clearFilters = () => {
    setMuscleFilter(null)
    setEquipmentFilter(null)
    setBodyRegionFilter(null)
    setDifficultyFilter(null)
    setKneeSafetyFilter(null)
  }

  const filtered = useMemo(() => {
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
  }, [search, muscleFilter, equipmentFilter, bodyRegionFilter, difficultyFilter, kneeSafetyFilter])

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
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
              Exercise Library
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
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

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{
            background: showFilters || activeFilterCount > 0 ? '#f9731622' : '#1a1a1e',
            color: showFilters || activeFilterCount > 0 ? '#f97316' : '#888',
            border: activeFilterCount > 0 ? '1px solid #f9731644' : '1px solid #2a2a2e',
          }}
        >
          <Filter size={14} />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

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
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-2 border border-border-subtle">
            <div className="text-4xl mb-3">{'🔍'}</div>
            <div className="text-lg font-bold text-zinc-400">No exercises found</div>
            <div className="text-zinc-500 text-sm mt-1.5">Try adjusting your search or filters</div>
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
    </div>
  )
}
