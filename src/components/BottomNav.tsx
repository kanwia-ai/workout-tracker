import { Dumbbell, BookOpen, Activity, BarChart3, Heart } from 'lucide-react'

export type AppView = 'workout' | 'exercises' | 'mobility' | 'progress' | 'cardio' | 'capture'

interface BottomNavProps {
  active: AppView
  onNavigate: (view: AppView) => void
}

const NAV_ITEMS: { view: AppView; icon: typeof Dumbbell; label: string }[] = [
  { view: 'workout', icon: Dumbbell, label: 'Workout' },
  { view: 'exercises', icon: BookOpen, label: 'Exercises' },
  { view: 'mobility', icon: Activity, label: 'Mobility' },
  { view: 'progress', icon: BarChart3, label: 'Progress' },
  { view: 'cardio', icon: Heart, label: 'Cardio' },
]

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: 'var(--lumo-bg)',
        borderTop: '1px solid var(--lumo-border)',
      }}
    >
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(item => {
          const isActive = active === item.view
          const Icon = item.icon
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 active:scale-95 transition-all"
              style={{ position: 'relative', background: 'transparent', border: 'none' }}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'color-mix(in srgb, var(--brand) 22%, transparent)',
                    filter: 'blur(10px)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <Icon
                size={20}
                className="transition-colors"
                style={{
                  color: isActive ? 'var(--brand)' : 'var(--lumo-text-sec)',
                  position: 'relative',
                }}
              />
              <span
                className="transition-colors"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: isActive ? 'var(--brand)' : 'var(--lumo-text-ter)',
                  position: 'relative',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
