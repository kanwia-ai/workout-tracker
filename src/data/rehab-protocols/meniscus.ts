// Meniscus (medial or lateral) — post-acute rehab through full return.
//
// Post-meniscectomy or conservative meniscus rehab. Graded loading of knee
// flexion is the evidence-based path back to full function. Quad dominance
// correction + hip strengthening for tracking. Avoid pivoting under load and
// ballistic cutting while symptomatic; keep introducing loaded variants.

import type { Protocol } from './types'

export const meniscusProtocol: Protocol = {
  id: 'meniscus',
  title: 'Meniscus tear / post-meniscectomy rehab',
  summary:
    'Graded exposure to loaded knee flexion. Hamstring priority + glute med for tracking. Progress from heel-elevated goblet → front → back squat over the block.',

  citations: [
    {
      authors: 'Logerstedt DS, Snyder-Mackler L, Ritter RC, Axe MJ',
      year: 2010,
      title: 'Knee pain and mobility impairments: meniscal and articular cartilage lesions',
      journal: 'J Orthop Sports Phys Ther (JOSPT Clinical Practice Guideline)',
      note: 'Primary guideline — criteria-based progression, loaded exercise efficacy.',
    },
    {
      authors: 'Paterno MV, Prodromos CC',
      year: 2014,
      title: 'Return-to-sport criteria after knee surgery',
      journal: 'Sports Health',
      note: 'Functional testing thresholds for advancing rehab stages.',
    },
    {
      authors: 'Peeler J, Leiter J, MacDonald P',
      year: 2014,
      title: 'Accuracy and reliability of anterior cruciate ligament clinical examination in a multidisciplinary sports medicine setting',
      journal: 'Clin J Sport Med',
      note: 'Rule out concurrent ACL involvement before loading.',
    },
    {
      authors: 'Patterson BE, Culvenor AG et al.',
      year: 2020,
      title: 'Worsening knee osteoarthritis features on MRI 1-5 years after ACL reconstruction',
      journal: 'Osteoarthritis and Cartilage',
      note: 'Supports strengthening-forward rather than avoidance approach.',
    },
  ],

  by_severity: {
    avoid: {
      hard_ban_patterns: [
        'loaded_knee_flexion_under_90',
        'back_squat_any_load',
        'walking_lunge_loaded',
        'jumping_landing',
        'pivoting_cutting',
      ],
      permitted_adjacent_work: [
        'terminal_knee_extensions_banded',
        'seated_leg_curl_light',
        'glute_bridge_bodyweight',
        'calf_raises',
        'upper_body_work_full',
      ],
      see_professional_after_days: 14,
      rationale:
        'Acute phase — protect the joint, maintain adjacent strength, see orthopedic assessment for surgical vs conservative decision.',
    },
    rehab: {
      stages: [
        {
          id: 'wk1_2_reintegration',
          target_weeks: [1, 2],
          gate_criteria: [
            'pain_under_3_of_10_during_session',
            'full_active_rom_unloaded',
            'can_goblet_bodyweight_to_parallel_no_pain',
          ],
          allowed_main_variants: [
            'heel_elevated_goblet_squat',
            'box_squat_high',
            'split_squat_rear_foot_elevated_bodyweight',
            'leg_press_narrow_rom',
          ],
          banned_variants: [
            'back_squat',
            'walking_lunge_loaded',
            'jumping_landing',
            'bulgarian_split_squat_loaded',
          ],
          warmup_protocol: [
            {
              name: 'reverse_incline_walking',
              duration_sec: 300,
              cue: 'treadmill incline 10, speed 1 mph — patellar tendon loading + VMO',
              params: { incline_percent: 10, speed_mph: 1 },
            },
            { name: 'terminal_knee_extensions_banded', sets: 2, reps: 15 },
            { name: 'ankle_dorsiflexion_mobility', duration_sec: 60 },
            { name: 'hip_90_90_rotations', duration_sec: 60 },
          ],
          rep_scheme_override: [8, 12],
          rationale:
            'Reintegrate loaded knee flexion at reduced demand. Reverse incline walking is a staple post-op patellar tendon loading modality. Higher reps, lower load for pattern quality.',
        },
        {
          id: 'wk3_4_loading',
          target_weeks: [3, 4],
          gate_criteria: [
            'pain_under_2_of_10',
            'heel_elevated_goblet_at_bw_x_0_5_pain_free',
            'single_leg_squat_to_box_pain_free',
          ],
          allowed_main_variants: [
            'front_squat_moderate',
            'heel_elevated_barbell_back_squat',
            'reverse_lunge_loaded',
            'split_squat_loaded',
          ],
          banned_variants: ['jumping_landing_loaded', 'plyometric_bounds'],
          warmup_protocol: [
            {
              name: 'reverse_incline_walking',
              duration_sec: 240,
              params: { incline_percent: 10, speed_mph: 1.5 },
            },
            { name: 'terminal_knee_extensions_banded', sets: 2, reps: 12 },
            { name: 'banded_monster_walk', sets: 2, reps: 12 },
            { name: '90_90_hip_stretch', duration_sec: 60 },
          ],
          rep_scheme_override: [5, 8],
          rationale:
            'Heavier loading on modified variants. Front squat preferred over back squat — upright torso reduces shear.',
        },
        {
          id: 'wk5_6_return',
          target_weeks: [5, 6],
          gate_criteria: [
            'pain_under_1_of_10',
            'front_squat_at_bw_x_0_6_pain_free',
            'single_leg_step_down_controlled',
          ],
          allowed_main_variants: [
            'back_squat_moderate_load',
            'front_squat',
            'forward_lunge_loaded',
            'bulgarian_split_squat_loaded',
          ],
          banned_variants: [],
          warmup_protocol: [
            { name: 'reverse_incline_walking', duration_sec: 180 },
            { name: 'banded_monster_walk', sets: 2, reps: 12 },
            { name: 'ankle_dorsiflexion_mobility', duration_sec: 60 },
          ],
          rep_scheme_override: null,
          rationale:
            'Return to full-ROM loaded squat pattern. Follow the goal-driven rep scheme. Retain knee-specific warmup prophylactically.',
        },
      ],
    },
    chronic: {
      priority_work: [
        'hamstring_isolation_leg_curl',
        'glute_med_isolation_hip_abduction',
        'vmo_biased_step_down',
        'ankle_dorsiflexion_mobility',
      ],
      daily_correctives: [
        'terminal_knee_extensions_banded_2x15',
        'couch_stretch_60s',
      ],
      avoid_under_load: [
        'pivoting_under_load',
        'ballistic_lunges',
        'deep_knee_flexion_ballistic',
      ],
      do_not_ban: ['squat', 'lunge', 'deadlift'],
      why_not_banned:
        'Chronic meniscal symptoms respond best to progressive loading + quad/hip strengthening. Avoidance leads to atrophy which worsens joint loading over time.',
    },
    ok: {
      watch_out: [
        'plyometrics_unwarmed',
        'deep_ATG_squat_heavy',
      ],
      regression_if_pain: [
        'heel_elevated_squat_variant',
        'reduce_load_30_percent',
        'add_seated_leg_curl_as_warmup_opener',
      ],
    },
  },

  per_session_type: {
    lower_squat_focus: {
      warmup_focus: [
        'reverse_incline_walking_5min',
        'terminal_knee_extensions_banded',
        'banded_monster_walk',
        'ankle_dorsiflexion',
      ],
      priority_work: ['hamstring_isolation_pre_main', 'glute_med_activation'],
      modifications: [
        'heel_elevated_goblet_wk1_2',
        'front_squat_wk3_4',
        'back_squat_wk5_6',
      ],
      pair_with: ['lying_leg_pullover_decompression_post_main'],
      avoid_on_this_session: ['unilateral_pivoting', 'plyometric_bounds'],
    },
    lower_hinge_focus: {
      warmup_focus: ['glute_bridge_march', 'hip_90_90', 'hamstring_dynamic'],
      priority_work: ['hamstring_eccentric', 'glute_max'],
      modifications: ['trap_bar_dl_preferred_over_conventional'],
      pair_with: [],
      avoid_on_this_session: ['heavy_cleans', 'snatches'],
    },
    upper_push: {
      warmup_focus: [],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    upper_pull: {
      warmup_focus: [],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_a: {
      warmup_focus: ['reverse_incline_walking_3min', 'terminal_knee_extensions'],
      priority_work: ['hamstring_opener_before_squat_pattern'],
      modifications: ['use_stage_appropriate_squat_variant'],
      pair_with: [],
      avoid_on_this_session: ['pivoting_lunges'],
    },
    full_body_b: {
      warmup_focus: ['reverse_incline_walking_3min', 'banded_monster_walk'],
      priority_work: ['hamstring_opener_before_squat_pattern'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: [
        'walking_hill_over_running_early_weeks',
        'bike_over_running_high_impact',
      ],
      pair_with: [],
      avoid_on_this_session: ['sprint_cutting_drills_untrained'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: [
        'terminal_knee_extensions',
        'ankle_mobility_knee_to_wall',
        'hip_90_90',
      ],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {
    lower_squat_focus: {
      priority: [
        {
          exercise_pattern: 'seated_leg_curl',
          reason: 'hamstring pre-activation corrects quad dominance (common post-meniscus)',
        },
        {
          exercise_pattern: 'hip_abduction_machine',
          reason: 'glute med for frontal-plane knee tracking',
        },
      ],
      decompression_pair: [
        {
          exercise_pattern: 'lying_leg_pullover',
          reason: 'spinal decompression after axial-load main lift',
        },
      ],
      avoid: ['walking_lunge_loaded_early_weeks'],
    },
    lower_hinge_focus: {
      priority: [
        { exercise_pattern: 'glute_max_bridge_or_hip_thrust', reason: 'primary driver' },
        { exercise_pattern: 'nordic_hamstring_curl', reason: 'hamstring eccentric strength' },
      ],
      decompression_pair: [],
      avoid: [],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Progresses you from safe modified squats back to full-loaded squatting by the end of the block. Addresses the quad dominance that often comes with meniscus injury.',
    what_to_report: [
      'sharp catching, locking, or giving way of the knee',
      'pain above 4/10 during a session',
      'swelling that lasts >24h after training',
      'any new pain above or below the knee',
    ],
    when_to_see_professional:
      'Any catching or locking sensations, significant swelling, or giving-way episodes need orthopedic evaluation. If rehab stalls at stage 1 for more than 3 weeks, see a PT.',
  },
}
