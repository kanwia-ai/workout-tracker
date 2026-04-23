// Chronic non-specific lower back pain.
//
// Majority of "lower back pain" in active adults is non-specific (no
// identifiable structural cause) and driven by motor control deficits —
// poor hip-hinge pattern, glute inhibition, lumbar compensation during
// hip-dominant movements. The fix is NOT to avoid loading the spine; it's
// to strengthen the posterior chain, correct the hinge, and build
// spine-stiffness endurance via McGill's "big 3."

import type { Protocol } from './types'

export const lowerBackProtocol: Protocol = {
  id: 'lower_back',
  title: 'Chronic non-specific lower back pain',
  summary:
    'Motor-control-focused management: build hip hinge, strengthen glutes, endure spine stiffness via McGill big 3. Do not ban compound lifts — progress them.',

  citations: [
    {
      authors: 'McGill SM',
      year: 2007,
      title: 'Ultimate Back Fitness and Performance (4th ed.)',
      journal: 'Backfitpro',
      note: 'Source for McGill big 3 (curl-up, side plank, bird dog) + spine-hygiene principles.',
    },
    {
      authors: 'Nourbakhsh MR, Arab AM',
      year: 2002,
      title: 'Relationship between mechanical factors and incidence of low back pain',
      journal: 'J Orthop Sports Phys Ther',
      note: 'Hip flexor tightness + hamstring extensibility correlate with LBP incidence.',
    },
    {
      authors: 'North American Spine Society',
      year: 2020,
      title: 'Clinical Guidelines for Diagnosis and Treatment of Low Back Pain',
      url: 'https://www.spine.org/Research-Clinical-Care/Quality-Improvement/Clinical-Guidelines',
      note: 'Exercise therapy (motor control + graded activity) is first-line for non-specific LBP.',
    },
    {
      authors: "O'Sullivan P",
      year: 2005,
      title: 'Diagnosis and classification of chronic low back pain disorders',
      journal: 'Manual Therapy',
      note: 'Movement-impairment classification framework used to rule out red-flag pathology.',
    },
  ],

  by_severity: {
    avoid: {
      hard_ban_patterns: [
        'loaded_deadlift',
        'loaded_back_squat',
        'loaded_overhead_press_standing',
        'loaded_spinal_flexion',
        'weighted_situps',
      ],
      permitted_adjacent_work: [
        'supine_glute_bridge_bodyweight',
        'bird_dog',
        'side_plank_modified',
        'supported_hip_flexor_stretch',
        'walking',
      ],
      see_professional_after_days: 10,
      rationale:
        'Acute flare-up — neutralize spinal load, maintain activity via low-load motor-control work, see PT/chiro if not resolving in ~10 days.',
    },
    rehab: {
      stages: [
        {
          id: 'wk1_2_reintroduction',
          target_weeks: [1, 2],
          gate_criteria: [
            'pain_under_3_of_10_all_day',
            'can_hinge_unloaded_without_symptom_flare',
          ],
          allowed_main_variants: [
            'goblet_squat_light',
            'trap_bar_deadlift_light',
            'kettlebell_hip_hinge',
            'single_leg_glute_bridge',
          ],
          banned_variants: [
            'barbell_back_squat_heavy',
            'conventional_deadlift_over_60pct_1rm',
            'good_mornings',
          ],
          warmup_protocol: [
            { name: 'cat_cow', reps: 8, cue: 'end-range, no pain' },
            { name: 'bird_dog', sets: 2, reps: 8, cue: 'neutral spine, no rotation' },
            { name: 'mcgill_curl_up', sets: 2, reps: 8 },
            { name: 'side_plank', sets: 2, duration_sec: 20 },
            { name: 'hip_flexor_stretch_kneeling', duration_sec: 60 },
          ],
          rep_scheme_override: [8, 12],
          rationale:
            'Reintroduce hinge + squat at light loads. Emphasize pattern quality, not load. Daily McGill big 3 for spine endurance.',
        },
        {
          id: 'wk3_4_loading',
          target_weeks: [3, 4],
          gate_criteria: [
            'pain_under_2_of_10',
            'goblet_squat_bw_full_depth_pain_free',
            'trap_bar_dl_bw_pain_free',
          ],
          allowed_main_variants: [
            'trap_bar_deadlift_moderate',
            'goblet_squat_moderate',
            'romanian_deadlift_light',
            'bulgarian_split_squat_bodyweight',
          ],
          banned_variants: ['conventional_deadlift_over_80pct_1rm'],
          warmup_protocol: [
            { name: '90_90_hip_stretch', sets: 2, duration_sec: 45 },
            { name: 'bird_dog', sets: 2, reps: 10 },
            { name: 'glute_bridge_march', sets: 2, reps: 12 },
            { name: 'banded_lateral_walk', sets: 2, reps: 12 },
          ],
          rep_scheme_override: [6, 8],
          rationale:
            'Progressive load, prioritize trap-bar over conventional DL (reduced shear). Introduce unilateral work for pelvic stability.',
        },
        {
          id: 'wk5_6_return',
          target_weeks: [5, 6],
          gate_criteria: [
            'pain_under_1_of_10',
            'rdl_light_pain_free',
          ],
          allowed_main_variants: [
            'conventional_deadlift_moderate',
            'back_squat_moderate',
            'romanian_deadlift_moderate',
            'bulgarian_split_squat_loaded',
          ],
          banned_variants: [],
          warmup_protocol: [
            { name: '90_90_hip_stretch', duration_sec: 60 },
            { name: 'bird_dog', sets: 2, reps: 10 },
            { name: 'glute_bridge_march', sets: 2, reps: 12 },
          ],
          rep_scheme_override: null,
          rationale:
            'Return to full compound-lift pattern. Load progressively, retain daily core endurance work.',
        },
      ],
    },
    chronic: {
      priority_work: [
        'glute_max_activation_bridge_variants',
        'glute_med_isolation_banded',
        'hip_hinge_patterning',
        'mcgill_big_3_daily',
        'hip_flexor_lengthening',
        'thoracic_extension_mobility',
      ],
      daily_correctives: [
        'mcgill_curl_up_x3_sets_8',
        'side_plank_x2_sets_30s',
        'bird_dog_x2_sets_10',
        'couch_stretch_60s_per_side',
      ],
      avoid_under_load: [
        'loaded_spinal_flexion',
        'heavy_jefferson_curl_untrained',
        'ballistic_trunk_rotation',
      ],
      do_not_ban: ['deadlift', 'squat', 'rdl', 'good_morning_light'],
      why_not_banned:
        'Chronic non-specific LBP is typically a motor-control deficit + posterior-chain weakness. Strengthening the hinge pattern and glutes reduces pain long-term; avoidance entrenches dysfunction.',
    },
    ok: {
      watch_out: [
        'heavy_conventional_deadlift_after_long_sitting',
        'asymmetric_loading_suitcase_carries_untrained',
      ],
      regression_if_pain: [
        'drop_to_trap_bar_deadlift',
        'reduce_load_20_percent',
        'add_daily_big_3',
      ],
    },
  },

  per_session_type: {
    lower_squat_focus: {
      warmup_focus: ['cat_cow', 'bird_dog', 'glute_bridge_march', 'hip_flexor_stretch'],
      priority_work: ['glute_med_activation', 'mcgill_big_3_micro_dose'],
      modifications: ['use_goblet_or_front_squat_before_back_squat_heavy'],
      pair_with: ['hanging_decompression_30s_post_main_lift'],
      avoid_on_this_session: ['ab_wheel_rollout_to_failure', 'loaded_sit_ups'],
    },
    lower_hinge_focus: {
      warmup_focus: ['90_90_hip_stretch', 'bird_dog', 'banded_lateral_walk', 'cat_cow'],
      priority_work: ['glute_max_bridge', 'rdl_pattern_drilling'],
      modifications: ['trap_bar_over_conventional_if_flare_history'],
      pair_with: ['hip_flexor_lengthening_post_session'],
      avoid_on_this_session: ['good_morning_heavy', 'kettlebell_swing_untrained'],
    },
    upper_push: {
      warmup_focus: ['thoracic_extension'],
      priority_work: [],
      modifications: ['prefer_seated_press_if_standing_aggravates'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    upper_pull: {
      warmup_focus: ['thoracic_extension', 'scap_retraction'],
      priority_work: [],
      modifications: ['chest_supported_row_if_bent_over_aggravates'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_a: {
      warmup_focus: ['cat_cow', 'bird_dog', 'hip_flexor_stretch'],
      priority_work: ['glute_med_activation'],
      modifications: ['prefer_trap_bar_dl', 'goblet_over_barbell_squat_early_weeks'],
      pair_with: ['decompression_hang_post_main'],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['cat_cow', 'bird_dog', 'glute_bridge_march'],
      priority_work: ['mcgill_big_3'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['walk_or_bike_over_running_if_impact_flares'],
      pair_with: [],
      avoid_on_this_session: ['hill_sprints_untrained'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: ['mcgill_big_3', 'hip_flexor_stretch', 'thoracic_rotations'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {
    lower_squat_focus: {
      priority: [
        { exercise_pattern: 'glute_medius_isolation', reason: 'addresses tracking + stability' },
        { exercise_pattern: 'mcgill_big_3', reason: 'spine stiffness endurance' },
      ],
      decompression_pair: [
        {
          exercise_pattern: 'hanging_decompression',
          reason: 'offload lumbar after axial compression',
        },
      ],
      avoid: ['loaded_spinal_flexion'],
    },
    lower_hinge_focus: {
      priority: [
        { exercise_pattern: 'glute_max_bridge_or_hip_thrust', reason: 'primary driver correction' },
        { exercise_pattern: 'hamstring_eccentric_work', reason: 'posterior chain resilience' },
      ],
      decompression_pair: [],
      avoid: ['jefferson_curl_heavy'],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Strengthens your hinge pattern, glutes, and core endurance so your back works better under load — not less. Heavy lifts come back in when you\'re ready.',
    what_to_report: [
      'pain above 4/10 during a session',
      'any leg numbness, tingling, or weakness',
      'pain that lasts >48h after a session',
      'a specific pop or tear sensation',
    ],
    when_to_see_professional:
      'If pain is above 5/10 consistently, if you have any neurological symptoms (numbness, tingling, weakness), or if no progress after 2 weeks, see a physical therapist or sports-med doctor. This plan assumes non-specific LBP; structural issues need imaging.',
  },
}
