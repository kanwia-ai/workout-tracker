// Shoulder — subacromial impingement / rotator cuff tendinopathy.
//
// Non-surgical shoulder pain with overhead pressing and horizontal pressing.
// Typical presentation in lifters: painful arc 60-120° abduction, weakness
// in external rotation, scapular dyskinesis. The fix: cuff isolation, scap
// control, avoid empty-can and upright-row patterns, progressively return to
// full overhead press.

import type { Protocol } from './types'

export const shoulderProtocol: Protocol = {
  id: 'shoulder',
  title: 'Shoulder impingement / rotator cuff tendinopathy',
  summary:
    'Rotator cuff + scapular stabilizer bias, avoid empty-can/upright-row, progress back to full pressing. Modify horizontal and vertical push patterns until symptom-free.',

  citations: [
    {
      authors: 'Kibler WB, Ludewig PM, McClure PW et al.',
      year: 2013,
      title: 'Clinical implications of scapular dyskinesis in shoulder injury: the 2013 consensus statement',
      journal: 'Br J Sports Med',
      note: 'Consensus on scap dyskinesis assessment + rehab priorities.',
    },
    {
      authors: 'Ludewig PM, Reynolds JF',
      year: 2009,
      title: 'The association of scapular kinematics and glenohumeral joint pathologies',
      journal: 'J Orthop Sports Phys Ther',
      note: 'Mechanics basis for why scap control matters in impingement.',
    },
    {
      authors: 'Cook CE, Hegedus EJ',
      year: 2013,
      title: 'Orthopedic physical examination tests — shoulder chapter',
      journal: 'Pearson',
      note: 'Diagnostic accuracy framework for ruling out instability/labral pathology before loading.',
    },
    {
      authors: 'Page P',
      year: 2011,
      title: 'Shoulder muscle imbalance and subacromial impingement syndrome in overhead athletes',
      journal: 'Int J Sports Phys Ther',
      note: 'Lower trap + serratus anterior programming rationale.',
    },
  ],

  by_severity: {
    avoid: {
      hard_ban_patterns: [
        'overhead_press_any_load',
        'behind_neck_press',
        'upright_row',
        'empty_can_raise',
        'bench_press_flat_wide_grip',
        'lat_pulldown_behind_neck',
      ],
      permitted_adjacent_work: [
        'external_rotation_banded_neutral',
        'scapular_retraction_banded',
        'face_pull_light',
        'lower_body_work_full',
        'core_work_non_overhead',
      ],
      see_professional_after_days: 14,
      rationale:
        'Acute impingement — offload overhead, isolate cuff + scap stabilizers, image if no improvement in 2 weeks (rule out tear).',
    },
    rehab: {
      stages: [
        {
          id: 'wk1_2_cuff_and_scap',
          target_weeks: [1, 2],
          gate_criteria: [
            'pain_free_full_flexion_unloaded',
            'external_rotation_banded_pain_free_at_light_load',
          ],
          allowed_main_variants: [
            'landmine_press',
            'incline_dumbbell_press_neutral_grip',
            'cable_row_neutral',
            'face_pull',
          ],
          banned_variants: [
            'overhead_barbell_press',
            'behind_neck_press',
            'upright_row',
            'dips_deep',
          ],
          warmup_protocol: [
            { name: 'banded_external_rotation_neutral', sets: 2, reps: 15 },
            { name: 'banded_scap_retraction_depression', sets: 2, reps: 12 },
            { name: 'wall_slide_lower_trap', sets: 2, reps: 10 },
            { name: 'thoracic_extension_foam_roller', duration_sec: 60 },
          ],
          rep_scheme_override: [10, 15],
          rationale:
            'High-volume low-load cuff + scap bias. Landmine press trains overhead pattern in a pain-free plane (45°) while rebuilding control.',
        },
        {
          id: 'wk3_4_modified_pressing',
          target_weeks: [3, 4],
          gate_criteria: [
            'landmine_press_moderate_load_pain_free',
            'full_scap_retraction_controlled',
          ],
          allowed_main_variants: [
            'dumbbell_shoulder_press_neutral_grip',
            'incline_dumbbell_press',
            'single_arm_landmine_press',
            'seated_cable_row',
            'chest_supported_row',
          ],
          banned_variants: ['overhead_barbell_press_heavy', 'upright_row'],
          warmup_protocol: [
            { name: 'banded_external_rotation', sets: 2, reps: 12 },
            { name: 'face_pull_high', sets: 2, reps: 15 },
            { name: 'scap_push_up', sets: 2, reps: 10 },
            { name: 'thoracic_extension', duration_sec: 45 },
          ],
          rep_scheme_override: [6, 10],
          rationale:
            'Load the cleaned-up press pattern. Neutral-grip dumbbell reduces internal rotation stress vs. barbell bench.',
        },
        {
          id: 'wk5_6_return_to_overhead',
          target_weeks: [5, 6],
          gate_criteria: [
            'dumbbell_press_at_bodyweight_0_4x_pain_free',
            'no_painful_arc_in_active_abduction',
          ],
          allowed_main_variants: [
            'overhead_dumbbell_press',
            'overhead_barbell_press_moderate',
            'bench_press_close_grip_paused',
          ],
          banned_variants: [],
          warmup_protocol: [
            { name: 'banded_external_rotation', sets: 1, reps: 15 },
            { name: 'face_pull', sets: 1, reps: 15 },
            { name: 'scap_push_up', sets: 1, reps: 10 },
          ],
          rep_scheme_override: null,
          rationale:
            'Progressive return to full overhead load. Retain cuff/scap prep prophylactically in every warmup going forward.',
        },
      ],
    },
    chronic: {
      priority_work: [
        'external_rotation_banded_high_volume',
        'face_pull_high_volume',
        'scap_retraction_with_depression',
        'lower_trap_isolation_prone_y',
        'serratus_anterior_wall_slide',
      ],
      daily_correctives: [
        'banded_external_rotation_2x15',
        'thoracic_extension_foam_roll_60s',
      ],
      avoid_under_load: [
        'upright_row',
        'empty_can_raise',
        'behind_neck_press',
        'wide_grip_pause_bench',
      ],
      do_not_ban: ['overhead_press', 'bench_press', 'pullup'],
      why_not_banned:
        'Chronic impingement improves with strengthening the rotator cuff + scap stabilizers. Avoidance of overhead work weakens the corrective pattern and entrenches dysfunction.',
    },
    ok: {
      watch_out: [
        'high_rep_barbell_overhead_press_unwarmed',
        'sudden_volume_increase_in_bench_press',
        'overhead_work_when_fatigued_scap_control_poor',
      ],
      regression_if_pain: [
        'switch_to_dumbbell_neutral_grip',
        'reduce_load_30_percent',
        'add_face_pull_and_external_rotation_as_warmup',
      ],
    },
  },

  per_session_type: {
    upper_push: {
      warmup_focus: [
        'banded_external_rotation',
        'face_pull_high',
        'scap_push_up',
        'thoracic_extension',
      ],
      priority_work: ['rotator_cuff_ER_IR_pre_pressing'],
      modifications: [
        'dumbbell_neutral_grip_over_barbell_early_weeks',
        'landmine_press_for_overhead_pattern_wk1_2',
      ],
      pair_with: ['face_pull_between_pressing_sets'],
      avoid_on_this_session: ['upright_row', 'empty_can_raise', 'behind_neck_press'],
    },
    upper_pull: {
      warmup_focus: ['banded_scap_retraction', 'thoracic_extension'],
      priority_work: ['face_pull_high_volume', 'lower_trap_isolation'],
      modifications: ['chest_supported_row_reduces_compensation'],
      pair_with: [],
      avoid_on_this_session: ['behind_neck_lat_pulldown'],
    },
    lower_squat_focus: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['front_squat_over_back_squat_if_bar_position_aggravates'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_hinge_focus: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['trap_bar_over_barbell_if_shrug_aggravates'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_a: {
      warmup_focus: ['banded_external_rotation', 'face_pull'],
      priority_work: ['cuff_prep_before_pressing'],
      modifications: ['neutral_grip_press_variants'],
      pair_with: [],
      avoid_on_this_session: ['upright_row'],
    },
    full_body_b: {
      warmup_focus: ['banded_external_rotation', 'scap_push_up'],
      priority_work: ['cuff_prep_before_pressing'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['ski_erg_over_kettlebell_swings_if_overhead_aggravates'],
      pair_with: [],
      avoid_on_this_session: ['overhead_medicine_ball_slams_wk1_4'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: [
        'external_rotation_isolated',
        'face_pull',
        'prone_y_t_w',
        'thoracic_extension_mobility',
      ],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {
    upper_push: {
      priority: [
        { exercise_pattern: 'banded_external_rotation', reason: 'cuff activation pre-press' },
        { exercise_pattern: 'face_pull', reason: 'lower trap + posterior shoulder for balance' },
      ],
      decompression_pair: [
        { exercise_pattern: 'doorway_pec_stretch', reason: 'offload anterior shoulder post-press' },
      ],
      avoid: ['lateral_raise_heavy_ballistic_early_weeks'],
    },
    upper_pull: {
      priority: [
        { exercise_pattern: 'face_pull', reason: 'high volume, central to protocol' },
        { exercise_pattern: 'prone_Y_raise', reason: 'lower trap isolation' },
      ],
      decompression_pair: [],
      avoid: [],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Rebuilds rotator cuff + scapular stabilizer strength with modified pressing. Returns you to full overhead work over the block.',
    what_to_report: [
      'sharp pain in any specific arc of motion',
      'catching or popping',
      'night pain that wakes you up',
      'progressive weakness or loss of ROM',
    ],
    when_to_see_professional:
      'Night pain, significant ROM loss, or any weakness on simple arm elevation needs imaging. Labral tears and full-thickness cuff tears do not self-resolve — rule them out.',
  },
}
