// Wrist — loaded wrist pain (push-up, bench, front rack).
//
// Usually a mobility deficit + weakness in wrist extensor isometric
// capacity, aggravated by loaded extension (push-up, bench press at end
// range). Fix: wrist mobility, isometric loading, neutral-grip bias,
// gradual return to full extension loading.

import type { Protocol } from './types'

export const wristProtocol: Protocol = {
  id: 'wrist',
  title: 'Wrist pain under loaded extension',
  summary:
    'Wrist mobility + isometric extensor strengthening. Use push-up handles, dumbbell bench. Gradual return to loaded wrist extension.',

  citations: [
    {
      authors: 'Rettig AC',
      year: 2003,
      title: 'Athletic injuries of the wrist and hand',
      journal: 'Am J Sports Med',
      note: 'Framework for conservative management of wrist overuse in athletes.',
    },
    {
      authors: 'Henning PT, Yang L, Awan T et al.',
      year: 2018,
      title: 'Ultrasound-guided evaluation and management of common wrist injuries',
      journal: 'Curr Sports Med Rep',
    },
  ],

  by_severity: {
    rehab: {
      stages: [
        {
          id: 'wk1_2_mobility_isometric',
          target_weeks: [1, 2],
          gate_criteria: ['full_pain_free_extension_unloaded'],
          allowed_main_variants: ['dumbbell_bench_neutral_grip', 'pushup_on_handles', 'pushup_on_dumbbells'],
          banned_variants: ['barbell_bench_wide_grip', 'pushup_palm_flat_to_failure'],
          warmup_protocol: [
            { name: 'wrist_extension_mobility', sets: 2, reps: 12 },
            { name: 'wrist_flexion_mobility', sets: 2, reps: 12 },
            { name: 'isometric_wrist_extension_hold', sets: 3, duration_sec: 20 },
          ],
          rep_scheme_override: [8, 12],
          rationale: 'Restore pain-free ROM + build isometric capacity. Neutral-grip pressing avoids end-range wrist extension under load.',
        },
        {
          id: 'wk3_4_progressive_loading',
          target_weeks: [3, 4],
          gate_criteria: ['pushup_on_handles_pain_free', 'dumbbell_bench_moderate_pain_free'],
          allowed_main_variants: ['barbell_bench_moderate_narrow_grip', 'pushup_palm_flat_bodyweight', 'dumbbell_shoulder_press'],
          banned_variants: [],
          warmup_protocol: [
            { name: 'wrist_extension_mobility', sets: 1, reps: 12 },
            { name: 'isometric_wrist_extension_hold', sets: 2, duration_sec: 20 },
          ],
          rep_scheme_override: null,
          rationale: 'Reintroduce loaded wrist extension progressively.',
        },
      ],
    },
    chronic: {
      priority_work: ['wrist_extension_isometric_hold', 'wrist_mobility_daily'],
      daily_correctives: ['wrist_extension_isometric_hold_3x20s'],
      avoid_under_load: ['barbell_bench_wide_grip_flare_history', 'front_rack_deep_extension_heavy'],
      do_not_ban: ['bench_press', 'pushup', 'front_squat'],
      why_not_banned: 'Wrist capacity grows with progressive loading. Mobility + isometrics remove the limiting factor.',
    },
    ok: {
      watch_out: ['high_volume_pushups_unwarmed'],
      regression_if_pain: ['use_pushup_handles', 'add_isometric_warmup'],
    },
  },

  per_session_type: {
    upper_push: {
      warmup_focus: ['wrist_mobility', 'isometric_wrist_extension_hold'],
      priority_work: [],
      modifications: ['dumbbell_over_barbell_bench_if_wrist_angle_aggravates', 'pushup_on_handles_early_weeks'],
      pair_with: [],
      avoid_on_this_session: ['weighted_pushups_wide_hand_position_early_weeks'],
    },
    upper_pull: {
      warmup_focus: ['wrist_mobility'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_squat_focus: {
      warmup_focus: ['wrist_mobility'],
      priority_work: [],
      modifications: ['cross_arm_front_squat_grip_if_full_rack_aggravates'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_hinge_focus: {
      warmup_focus: [],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_a: {
      warmup_focus: ['wrist_mobility'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['wrist_mobility'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['avoid_burpees_with_wrist_flare', 'rower_handle_light'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: ['wrist_mobility', 'isometric_wrist_extension_hold', 'fingertip_pushup_progressions'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {},

  user_facing: {
    what_this_plan_does:
      'Restores pain-free wrist extension loading through mobility and isometric work, then progresses back to barbell pressing.',
    what_to_report: ['sharp catching pain', 'numbness or tingling into the hand'],
    when_to_see_professional:
      'Catching pain or hand numbness → orthopedic or hand-specialist eval. Rule out carpal tunnel / TFCC tear / ganglion.',
  },
}
