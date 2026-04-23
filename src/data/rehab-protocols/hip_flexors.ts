// Hip flexors — psoas/TFL overactivity / tightness pattern.
//
// Rarely an acute "injury" — far more often a postural/dominance pattern
// from prolonged sitting. Chronic management = primary use case. The fix:
// glute max activation (reciprocally inhibits hip flexors), soft-tissue
// lengthening, dead-bug / McGill big 3 to prevent lumbar compensation.

import type { Protocol } from './types'

export const hipFlexorsProtocol: Protocol = {
  id: 'hip_flexors',
  title: 'Hip flexor tightness / psoas dominance pattern',
  summary:
    'Lengthen anterior hip, activate glute max to reciprocally inhibit, train dead bug for psoas dissociation. Addresses lower-crossed syndrome root cause.',

  citations: [
    {
      authors: 'Sahrmann SA',
      year: 2002,
      title: 'Diagnosis and Treatment of Movement Impairment Syndromes',
      journal: 'Mosby',
      note: 'Source framework for psoas vs. iliacus differentiation and corrective strategy.',
    },
    {
      authors: 'Janda V',
      year: 1987,
      title: 'Muscles and motor control in cervicogenic disorders: assessment and management',
      note: 'Original lower-crossed syndrome description — tight hip flexors + inhibited glutes.',
    },
    {
      authors: 'Neumann DA',
      year: 2010,
      title: 'Kinesiology of the hip: a focus on muscular actions',
      journal: 'J Orthop Sports Phys Ther',
      note: 'Biomechanical basis for hip flexor role + reciprocal inhibition with glute max.',
    },
    {
      authors: 'Mills M, Frank B, Goto S et al.',
      year: 2015,
      title: 'Effect of restricted hip flexor muscle length on hip extensor muscle activity and lower extremity biomechanics in college-aged female soccer players',
      journal: 'Int J Sports Phys Ther',
      note: 'Empirical confirmation of reciprocal inhibition effect.',
    },
  ],

  by_severity: {
    avoid: {
      hard_ban_patterns: [
        'loaded_hip_flexion_kicks',
        'weighted_leg_raise_high_volume',
      ],
      permitted_adjacent_work: [
        'couch_stretch',
        'supine_hip_flexor_stretch',
        'glute_bridge',
        'dead_bug',
        'full_body_work_excluding_hip_flexor_loaded',
      ],
      rationale:
        'Rare as acute — if user picks "avoid" it usually means strain. Offload, stretch, activate antagonists.',
    },
    chronic: {
      priority_work: [
        'couch_stretch_daily',
        '90_90_hip_mobility',
        'glute_max_bridge_variations',
        'dead_bug_for_psoas_dissociation',
        'hip_airplane',
      ],
      daily_correctives: [
        'couch_stretch_60s_per_side',
        'glute_bridge_2x12',
        'dead_bug_2x8_per_side',
      ],
      avoid_under_load: [
        'loaded_hip_flexion_to_failure',
        'weighted_hanging_leg_raise_high_volume',
      ],
      do_not_ban: ['squat', 'lunge', 'deadlift'],
      why_not_banned:
        'Tight hip flexors need lengthening through full-ROM hinge patterns + glute activation. Avoiding the patterns that require hip extension entrenches shortness.',
    },
    ok: {
      watch_out: ['long_sitting_bouts_pre_training'],
      regression_if_pain: ['add_10min_hip_mobility_before_session'],
    },
  },

  per_session_type: {
    lower_squat_focus: {
      warmup_focus: ['couch_stretch', '90_90_hip', 'hip_airplane', 'glute_bridge'],
      priority_work: ['glute_max_activation_pre_main'],
      modifications: [],
      pair_with: ['psoas_release_post_session'],
      avoid_on_this_session: [],
    },
    lower_hinge_focus: {
      warmup_focus: ['couch_stretch', 'hip_flexor_pnf_stretch', 'glute_bridge_march'],
      priority_work: ['glute_max_hip_thrust'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: ['heavy_hanging_leg_raise_volume'],
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
      warmup_focus: ['couch_stretch', 'hip_flexor_kneeling_stretch'],
      priority_work: ['glute_bridge'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['couch_stretch', 'hip_airplane'],
      priority_work: ['glute_max_activation'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: ['high_knee_sprint_drills_untrained'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: ['couch_stretch', '90_90_hip', 'glute_bridge', 'dead_bug'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Restores full hip extension through glute activation + daily stretching. Prevents the lower-back compensation that tight hips typically cause.',
    what_to_report: ['sharp anterior hip pain', 'any numbness into the thigh'],
    when_to_see_professional:
      'Groin pain that feels sharp or catches, or numbness into the thigh, warrants PT eval for labral pathology or femoral nerve involvement.',
  },
}
