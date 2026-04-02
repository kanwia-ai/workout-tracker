import type { ScheduleDay } from '../types'

export const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { day_of_week: 0, day_label: 'Mon', workout_id: 'w-glutes-legs-back', label: 'Glutes, Legs & Back', is_rest_day: false },
  { day_of_week: 1, day_label: 'Tue', workout_id: 'w-shoulders-arms', label: 'Shoulders & Arms', is_rest_day: false },
  { day_of_week: 2, day_label: 'Wed', workout_id: null, label: 'Rest / Cardio', is_rest_day: true },
  { day_of_week: 3, day_label: 'Thu', workout_id: 'w-heavy-legs', label: 'Heavy Legs', is_rest_day: false },
  { day_of_week: 4, day_label: 'Fri', workout_id: 'w-back-focus', label: 'Back Focus', is_rest_day: false },
  { day_of_week: 5, day_label: 'Sat', workout_id: 'w-home-circuit', label: 'At-Home Circuit', is_rest_day: false },
  { day_of_week: 6, day_label: 'Sun', workout_id: null, label: 'Rest / Cardio', is_rest_day: true },
]
