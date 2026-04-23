import { useLiveQuery } from 'dexie-react-hooks'
import { Loader2, X } from 'lucide-react'
import { db, type LibraryExercise } from '../lib/db'
import { getDemo } from '../data/exercise-demos'
import { extractYouTubeVideoId } from '../lib/youtube'
import { resolveVariant } from '../lib/planner/variants'
import { EXERCISE_LIBRARY } from '../data/exercises'

// ─── ExerciseInfoSheet ────────────────────────────────────────────────────
// Full-screen overlay that shows rich library data for a single exercise.
// Driven by a `library_id` (e.g., `fedb:Barbell_Squat`) that the caller passes
// from the planned session's exercise row. Content comes from the Dexie
// `exerciseLibrary` table seeded from the public-domain free-exercise-db
// dataset. When `libraryId === null` the component renders nothing so callers
// can mount it unconditionally and just toggle the id.

const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

interface Props {
  libraryId: string | null
  onClose: () => void
}

export function ExerciseInfoSheet({ libraryId, onClose }: Props) {
  // Reactive fetch from Dexie. `useLiveQuery` returns `undefined` while the
  // query is pending and `null`/row once resolved. Keyed on libraryId so the
  // effect re-fires when the caller switches exercises without unmounting.
  //
  // Lookup order so the sheet doesn't come up empty on local-planner plans:
  //   1. Dexie `exerciseLibrary` (free-exercise-db seeds + custom inserts)
  //   2. Curated `EXERCISE_LIBRARY` constant (Kyra-priority lifts w/ cues)
  //   3. Planner variants pool (fallback: at least show name + muscles)
  const exercise = useLiveQuery<LibraryExercise | null | undefined>(
    async () => {
      if (!libraryId) return null
      // 1. Try Dexie (free-exercise-db / custom)
      const row = await db.exerciseLibrary.get(libraryId)
      if (row) return row
      // 2. Try curated library (ex-*)
      const curated = EXERCISE_LIBRARY.find((e) => e.id === libraryId)
      if (curated) {
        return {
          id: curated.id,
          name: curated.name,
          force: null,
          level: curated.difficulty ?? null,
          mechanic: null,
          equipment: curated.equipment.join(', '),
          primaryMuscles: curated.primary_muscles,
          secondaryMuscles: curated.secondary_muscles,
          instructions: curated.instructions,
          category: null,
          imageCount: 0,
          rawId: curated.id,
        } as LibraryExercise
      }
      // 3. Try planner variants (variant:*)
      if (libraryId.startsWith('variant:')) {
        const v = resolveVariant(libraryId.slice('variant:'.length))
        if (v) {
          return {
            id: libraryId,
            name: v.name,
            force: null,
            level: null,
            mechanic: null,
            equipment: v.equipment.join(', '),
            primaryMuscles: v.primary_muscles,
            secondaryMuscles: v.secondary_muscles,
            instructions: [],
            category: v.role,
            imageCount: 0,
            rawId: libraryId,
          } as LibraryExercise
        }
      }
      return null
    },
    [libraryId],
  )

  if (libraryId === null) return null

  const loading = exercise === undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise info"
    >
      {/* Backdrop: tap-outside-to-close. Rendered as a sibling button-sized
          div so clicks on the sheet itself don't bubble to the backdrop. */}
      <div
        data-testid="exercise-info-backdrop"
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-raised border border-border-subtle rounded-t-3xl sm:rounded-3xl p-5 pb-8"
      >
        {/* Close button — always visible in the top-right corner */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-surface transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X size={20} />
        </button>

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-zinc-400 py-8"
          >
            <Loader2 size={16} className="text-brand animate-spin" />
            <span>Loading exercise…</span>
          </div>
        )}

        {!loading && !exercise && (
          <div className="py-8 pr-10">
            <h2 className="text-lg font-extrabold text-zinc-100 mb-2">
              Exercise info
            </h2>
            <p className="text-sm text-zinc-400">
              No details for this exercise.
            </p>
          </div>
        )}

        {!loading && exercise && (
          <div className="pr-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              {exercise.name}
            </h2>

            {/* Level + category row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {exercise.level && (
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-surface text-zinc-300 capitalize">
                  {exercise.level}
                </span>
              )}
              {exercise.category && (
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-surface text-zinc-300 capitalize">
                  {exercise.category}
                </span>
              )}
            </div>

            {/* Curated form demo (YouTube Short from whitelisted creators).
                If no demo is curated, fall back to the hotlinked first image
                from free-exercise-db; if neither, show a gentle "no demo" note. */}
            {(() => {
              const demo = getDemo(exercise.id)
              const videoId = extractYouTubeVideoId(demo?.demo_url)
              if (videoId) {
                return (
                  <div className="mb-4">
                    <iframe
                      data-testid="exercise-demo-iframe"
                      width="100%"
                      height="220"
                      src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                      title={`Demo: ${exercise.name}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ border: 0, borderRadius: 12 }}
                    />
                    {demo?.creator && (
                      <div
                        className="text-[10px] mt-1.5"
                        style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.08em' }}
                      >
                        DEMO · {demo.creator.toUpperCase()}
                      </div>
                    )}
                  </div>
                )
              }
              if (exercise.imageCount > 0) {
                return (
                  <img
                    src={`${IMAGE_BASE}/${exercise.rawId}/0.jpg`}
                    alt={exercise.name}
                    className="w-full max-h-64 object-contain rounded-2xl bg-black/40 mb-4"
                    loading="lazy"
                  />
                )
              }
              return (
                <div
                  data-testid="exercise-demo-empty"
                  className="text-[12px] mb-4"
                  style={{
                    color: 'var(--lumo-text-ter)',
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                  }}
                >
                  no demo curated yet — swipe down to close
                </div>
              )
            })()}

            {/* Muscles */}
            {(exercise.primaryMuscles.length > 0 ||
              exercise.secondaryMuscles.length > 0) && (
              <div className="mb-4">
                <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2">
                  Muscles
                </div>
                {exercise.primaryMuscles.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[11px] text-zinc-500 font-semibold mb-1">
                      Primary
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.primaryMuscles.map(m => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize"
                          style={{ background: '#f9731622', color: '#f97316' }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.secondaryMuscles.length > 0 && (
                  <div>
                    <div className="text-[11px] text-zinc-500 font-semibold mb-1">
                      Secondary
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.secondaryMuscles.map(m => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface text-zinc-400 capitalize"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Equipment */}
            {exercise.equipment && (
              <div className="mb-4">
                <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2">
                  Equipment
                </div>
                <div className="text-sm text-zinc-300 capitalize">
                  {exercise.equipment}
                </div>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-bold text-brand uppercase tracking-wide mb-2">
                  How To
                </div>
                <ol className="space-y-2">
                  {exercise.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-xs font-extrabold text-brand mt-0.5 shrink-0 w-5 text-right">
                        {i + 1}.
                      </span>
                      <span className="text-[13px] text-zinc-300 leading-relaxed">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
