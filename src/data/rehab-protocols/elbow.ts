// Elbow — medial (golfer's) / lateral (tennis) epicondylopathy.
//
// Tendinopathy of the wrist flexor/extensor origins at the elbow. Responds
// robustly to eccentric loading (Tyler twist / flexbar) and progressive
// wrist/grip resistance training. Reduce loaded grip VOLUME (heavy curls,
// high-rep pulls) while building tendon capacity.

import type { Protocol } from './types'

export const elbowProtocol: Protocol = {
  id: 'elbow',
  title: 'Elbow epicondylopathy (tennis / golfer\'s elbow)',
  summary:
    'Eccentric wrist extensor/flexor loading (flexbar). Reduce grip volume early. Progressive reloading over 6-8 weeks. Neutral-grip bias for pulling.',

  citations: [
    {
      authors: 'Tyler TF, Thomas GC, Nicholas SJ, McHugh MP',
      year: 2010,
      title: 'Addition of isolated wrist extensor eccentric exercise to standard treatment for chronic lateral epicondylosis: a prospective randomized trial',
      journal: 'J Shoulder Elbow Surg',
      note: 'Flexbar eccentric protocol — clinically meaningful improvement in 7 weeks.',
    },
    {
      authors: 'Cullinane FL, Boocock MG, Trevelyan FC',
      year: 2014,
      title: 'Is eccentric exercise an effective treatment for lateral epicondylitis?',
      journal: 'Clin Rehabil',
      note: 'Systematic review supporting eccentric loading.',
    },
    {
      authors: 'Waseem M, Nuhmani S, Ram CS, Sachin Y',
      year: 2013,
      title: 'Lateral epicondylitis: A review of the literature',
      journal: 'J Back Musculoskelet Rehabil',
    },
  ],

  by_severity: {
    avoid: {
      hard_ban_patterns: [
        'heavy_gripping_volume',
        'biceps_curls_heavy',
        'wrist_curls_heavy',
        'hammer_grip_pulls_heavy',
      ],
      permitted_adjacent_work: [
        'flexbar_eccentric_light',
        'isometric_wrist_extension_light',
        'lower_body_full',
        'overhead_press_provided_pain_free',
      ],
      rationale: 'Offload the tendon, start isometric holds within pain-free range, begin eccentric protocol after 1-2 weeks.',
    },
    rehab: {
      stages: [
        {
          id: 'wk1_2_isometric_and_eccentric_intro',
          target_weeks: [1, 2],
          gate_criteria: ['can_grip_light_dumbbell_pain_free', 'flexbar_eccentric_light_pain_free'],
          allowed_main_variants: [
            'flexbar_eccentric_3x15_daily',
            'isometric_wrist_extension_30s_x5',
            'neutral_grip_rows_light',
          ],
          banned_variants: ['supinated_pullups_heavy', 'biceps_curl_high_volume'],
          warmup_protocol: [
            { name: 'wrist_flexion_extension_mobility', reps: 15 },
            { name: 'forearm_light_massage', duration_sec: 60 },
          ],
          rep_scheme_override: [10, 15],
          rationale: 'Start eccentric loading. Isometrics for pain modulation. Very light pulling with neutral grip.',
        },
        {
          id: 'wk3_4_progressive_loading',
          target_weeks: [3, 4],
          gate_criteria: ['flexbar_red_eccentric_pain_free', 'neutral_grip_row_bodyweight_pain_free'],
          allowed_main_variants: [
            'flexbar_eccentric_progressive',
            'hammer_curls_light',
            'neutral_grip_pullup_assisted',
            'bench_press_moderate',
          ],
          banned_variants: ['max_grip_deadlift_untrained'],
          warmup_protocol: [
            { name: 'wrist_mobility', reps: 12 },
            { name: 'flexbar_warmup_set', reps: 10 },
          ],
          rep_scheme_override: [8, 12],
          rationale: 'Progressive grip + forearm loading. Reintroduce curl pattern with neutral grip.',
        },
        {
          id: 'wk5_6_return',
          target_weeks: [5, 6],
          gate_criteria: ['full_load_grip_pain_free_during_session'],
          allowed_main_variants: [
            'pullup_full',
            'barbell_curl_moderate',
            'deadlift_full_load',
          ],
          banned_variants: [],
          warmup_protocol: [
            { name: 'flexbar_warmup_set', reps: 10 },
          ],
          rep_scheme_override: null,
          rationale: 'Return to full pulling and curling. Maintain flexbar prophylactically 2-3x/week.',
        },
      ],
    },
    chronic: {
      priority_work: [
        'flexbar_eccentric_3x15_daily',
        'forearm_isometric_holds',
        'neutral_grip_pulling_bias',
      ],
      daily_correctives: ['flexbar_eccentric_3x15'],
      avoid_under_load: ['max_grip_barbell_without_straps_flare_history', 'high_rep_biceps_curl_to_failure'],
      do_not_ban: ['pullup', 'row', 'curl'],
      why_not_banned: 'Tendinopathy heals via progressive loading. Avoiding the pattern lets the tendon further deteriorate.',
    },
    ok: {
      watch_out: ['volume_spikes_in_pulling_work', 'new_grip_intensive_tools_untrained'],
      regression_if_pain: ['return_to_flexbar_daily', 'drop_one_pulling_session_per_week'],
    },
  },

  per_session_type: {
    upper_pull: {
      warmup_focus: ['wrist_mobility', 'flexbar_warmup_set'],
      priority_work: ['flexbar_eccentric_post_session'],
      modifications: ['neutral_grip_over_supinated_early_weeks', 'use_straps_for_heavy_rows'],
      pair_with: [],
      avoid_on_this_session: ['biceps_curl_high_volume_flare_period'],
    },
    upper_push: {
      warmup_focus: ['wrist_mobility'],
      priority_work: [],
      modifications: ['avoid_wide_grip_bench_if_wrist_position_aggravates_elbow'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_squat_focus: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['front_squat_cross_arm_grip_reduces_elbow_stress'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_hinge_focus: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['use_lifting_straps_early_weeks_to_limit_grip_stress'],
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
      warmup_focus: ['flexbar_warmup_set'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: ['heavy_kettlebell_swings_untrained_grip'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: ['flexbar_eccentric', 'wrist_mobility', 'forearm_massage_release'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Uses flexbar eccentrics — the most evidence-backed exercise for this — plus progressive grip loading to rebuild tendon capacity.',
    what_to_report: ['pain >4/10 during loading', 'no change after 4 weeks of consistent flexbar use'],
    when_to_see_professional:
      'No improvement after 6-8 weeks of consistent eccentric loading → PT for soft-tissue work or corticosteroid/PRP consult.',
  },
}
