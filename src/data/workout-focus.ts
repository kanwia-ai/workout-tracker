// Maps workout IDs to their primary muscle focus areas
// Used by the adaptive warm-up/cool-down engine

type FocusArea = 'legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body'

export const WORKOUT_FOCUS: Record<string, FocusArea[]> = {
  'w-glutes-legs-back': ['glutes', 'legs', 'back'],
  'w-shoulders-arms': ['shoulders', 'arms', 'core'],
  'w-heavy-legs': ['legs', 'glutes', 'core'],
  'w-back-focus': ['back', 'core'],
  'w-home-circuit': ['full_body', 'legs', 'arms'],
}
