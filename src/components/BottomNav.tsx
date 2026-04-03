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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border-subtle safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(item => {
          const isActive = active === item.view
          const Icon = item.icon
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 active:scale-95 transition-all"
            >
              <Icon
                size={20}
                className="transition-colors"
                style={{ color: isActive ? '#f97316' : '#555' }}
              />
              <span
                className="text-[10px] font-bold transition-colors"
                style={{ color: isActive ? '#f97316' : '#555' }}
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
