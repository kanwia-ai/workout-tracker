// Patellofemoral pain syndrome (PFP) — anterior knee pain under load.
//
// The most common knee complaint in active adults. Pain at the front of the
// knee during squatting, stair descent, prolonged sitting. Driven by
// patellar maltracking typically secondary to weak hip abductors/external
// rotators + frontal-plane knee collapse. Primary intervention: HIP
// strengthening (more evidence than knee-only work), graded loading.

import type { Protocol } from './types'

export const kneePfpProtocol: Protocol = {
  id: 'knee_pfp',
  title: 'Patellofemoral pain syndrome',
  summary:
    'Hip-strengthening-forward rehab. Frontal-plane knee control via glute med + ER. Graded squat depth progression. Reverse incline walking for VMO + patellar tendon conditioning.',

  citations: [
    {
      authors: 'Crossley KM, van Middelkoop M et al.',
      year: 2016,
      title: '2016 Patellofemoral pain consensus statement from the 4th International Patellofemoral Pain Research Retreat',
      journal: 'Br J Sports Med',
      note: 'Flagship consensus — hip + knee strengthening combined superior to either alone.',
    },
    {
      authors: 'Barton CJ, Lack S, Hemmings S, Tufail S, Morrissey D',
      year: 2015,
      title: 'The "best practice guide to conservative management of patellofemoral pain": incorporating level 1 evidence with expert clinical reasoning',
      journal: 'Br J Sports Med',
      note: 'Hip strengthening has largest effect size in meta-analyses.',
    },
    {
      authors: 'Rathleff MS, Rathleff CR, Crossley KM, Barton CJ',
      year: 2014,
      title: 'Is hip strength a risk factor for patellofemoral pain? A systematic review',
      journal: 'Br J Sports Med',
      note: 'Prospective evidence for hip strength as modifiable risk factor.',
    },
    {
      authors: 'Macrum E, Bell DR, Boling M, Lewek M, Padua D',
      year: 2012,
      title: 'Effect of limiting ankle-dorsiflexion range of motion on lower extremity kinematics and muscle-activation patterns during a squat',
      journal: 'J Sport Rehabil',
      note: 'Ankle mobility affects knee tracking — worth screening.',
    },
  ],

  by_severity: {
    avoid: {
      hard_ban_patterns: [
        'deep_knee_flexion_under_load',
        'step_ups_high_box_loaded',
        'plyometric_landing',
        'hill_running_downhill',
      ],
      permitted_adjacent_work: [
        'hip_abduction_banded',
        'glute_bridge',
        'hamstring_curl',
        'isometric_wall_sit_partial',
        'upper_body_full',
      ],
      see_professional_after_days: 14,
      rationale:
        'Acute flare — offload the patellofemoral joint, isolate hip/glute/hamstring, image if persistent.',
    },
    rehab: {
      stages: [
        {
          id: 'wk1_2_hip_focus',
          target_weeks: [1, 2],
          gate_criteria: [
            'pain_under_3_of_10_during_session',
            'single_leg_sit_to_stand_pain_free',
            'banded_lateral_walk_15_reps_each_side_pain_free',
          ],
          allowed_main_variants: [
            'heel_elevated_goblet_squat',
            'split_squat_bodyweight',
            'leg_press_narrow_rom',
          ],
          banned_variants: [
            'deep_back_squat',
            'walking_lunge_deep',
            'box_jump',
            'step_up_high_box_loaded',
          ],
          warmup_protocol: [
            {
              name: 'reverse_incline_walking',
              duration_sec: 300,
              params: { incline_percent: 10, speed_mph: 1 },
            },
            { name: 'banded_lateral_walk', sets: 2, reps: 12 },
            { name: 'banded_monster_walk', sets: 2, reps: 12 },
            { name: 'clamshell_banded', sets: 2, reps: 15 },
          ],
          rep_scheme_override: [8, 12],
          rationale:
            'Hip-biased opening stage. Build glute med + ER to control frontal-plane collapse that drives PFP.',
        },
        {
          id: 'wk3_4_load_progression',
          target_weeks: [3, 4],
          gate_criteria: [
            'pain_under_2_of_10',
            'heel_elevated_goblet_bw_x_0_5_pain_free',
          ],
          allowed_main_variants: [
            'front_squat_moderate',
            'heel_elevated_barbell_back_squat',
            'reverse_lunge_loaded',
            'split_squat_loaded',
          ],
          banned_variants: ['plyometric_landing_loaded'],
          warmup_protocol: [
            { name: 'reverse_incline_walking', duration_sec: 240 },
            { name: 'banded_lateral_walk', sets: 2, reps: 12 },
            { name: 'hip_airplane', sets: 2, reps: 8 },
            { name: 'ankle_dorsiflexion_knee_to_wall', duration_sec: 60 },
          ],
          rep_scheme_override: [6, 8],
          rationale:
            'Load the now-better-controlled pattern. Front squat over back squat for torso position and reduced patellofemoral compressive load.',
        },
        {
          id: 'wk5_6_return',
          target_weeks: [5, 6],
          gate_criteria: [
            'pain_under_1_of_10',
            'single_leg_step_down_controlled_without_valgus',
          ],
          allowed_main_variants: [
            'back_squat_moderate',
            'front_squat',
            'bulgarian_split_squat_loaded',
          ],
          banned_variants: [],
          warmup_protocol: [
            { name: 'reverse_incline_walking', duration_sec: 180 },
            { name: 'banded_monster_walk', sets: 1, reps: 12 },
          ],
          rep_scheme_override: null,
          rationale:
            'Full-depth squat return. Keep hip activation + ankle mobility in warmup.',
        },
      ],
    },
    chronic: {
      priority_work: [
        'glute_medius_isolation',
        'hip_external_rotator_banded_clamshell',
        'vmo_biased_terminal_knee_extension',
        'ankle_dorsiflexion_mobility',
      ],
      daily_correctives: [
        'banded_lateral_walk_2x12',
        'glute_bridge_single_leg_2x10',
        'couch_stretch_60s',
      ],
      avoid_under_load: [
        'deep_knee_flexion_under_load_without_hip_activation',
        'high_impact_untrained',
      ],
      do_not_ban: ['squat', 'lunge', 'step_up'],
      why_not_banned:
        'PFP responds to hip + knee strengthening. Avoidance perpetuates the weakness-pain cycle. The pattern stays in — the form and loading change.',
    },
    ok: {
      watch_out: ['plyometric_volume_ramp_too_fast', 'downhill_running_high_volume'],
      regression_if_pain: [
        'return_to_heel_elevated_variant',
        'reduce_load_30_percent',
        'reintroduce_reverse_incline_warmup',
      ],
    },
  },

  per_session_type: {
    lower_squat_focus: {
      warmup_focus: [
        'reverse_incline_walking_5min',
        'banded_lateral_walk',
        'banded_monster_walk',
        'ankle_dorsiflexion',
      ],
      priority_work: ['glute_med_activation_pre_main', 'hip_external_rotation'],
      modifications: [
        'heel_elevated_goblet_wk1_2',
        'front_squat_wk3_4',
        'back_squat_wk5_6',
      ],
      pair_with: ['vmo_biased_terminal_knee_extension_post_main'],
      avoid_on_this_session: ['valgus_drift_bodyweight_squat_high_rep'],
    },
    lower_hinge_focus: {
      warmup_focus: ['banded_monster_walk', 'glute_bridge_march'],
      priority_work: ['hamstring_work_light'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
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
      warmup_focus: ['reverse_incline_walking_3min', 'banded_lateral_walk'],
      priority_work: ['glute_med_activation'],
      modifications: ['use_stage_appropriate_squat_variant'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['banded_monster_walk', 'clamshell'],
      priority_work: ['glute_med_activation'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: [
        'cycling_over_running_early_weeks',
        'rower_or_ski_erg_over_jumping',
      ],
      pair_with: [],
      avoid_on_this_session: ['hill_sprints_downhill', 'plyometric_boxes_untrained'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: [
        'ankle_dorsiflexion_knee_to_wall',
        'hip_90_90',
        'glute_bridge_single_leg',
        'banded_clamshell',
      ],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {
    lower_squat_focus: {
      priority: [
        { exercise_pattern: 'hip_abduction_machine', reason: 'glute med — primary PFP target' },
        { exercise_pattern: 'banded_clamshell', reason: 'external rotator activation' },
        { exercise_pattern: 'vmo_terminal_knee_extension', reason: 'patellar tracking support' },
      ],
      decompression_pair: [],
      avoid: ['heavy_step_ups_valgus_prone_untrained'],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Rebuilds hip and knee control in parallel so your kneecap tracks better under load. Progresses you back to full-depth squats by block end.',
    what_to_report: [
      'sharp catching or giving-way',
      'swelling that lasts past 24h',
      'pain that migrates to specific spots (joint line, patellar tendon)',
    ],
    when_to_see_professional:
      'Catching, giving way, or swelling beyond 24h warrants imaging. If no progress after 3-4 weeks of hip-biased work, PT referral.',
  },
}
