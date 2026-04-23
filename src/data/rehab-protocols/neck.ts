// Neck — postural / "text neck" pattern.
//
// Forward head posture + overactive suboccipitals + weak deep neck flexors.
// Often comorbid with upper-trap dominance and thoracic kyphosis. Fix: chin
// tuck isometrics (deep neck flexor endurance), thoracic extension, avoid
// loaded neck flexion / extension under spinal compression.

import type { Protocol } from './types'

export const neckProtocol: Protocol = {
  id: 'neck',
  title: 'Postural neck pain / forward head pattern',
  summary:
    'Deep neck flexor strengthening (chin tucks), thoracic mobility, avoid loaded neck flexion/extension. Overhead work stays in with attention to head position.',

  citations: [
    {
      authors: 'Falla D, Jull G, Hodges P',
      year: 2004,
      title: 'Training the cervical muscles with prescribed motor tasks does not change muscle activation during a functional activity',
      journal: 'Manual Therapy',
      note: 'Deep neck flexor activation framework.',
    },
    {
      authors: 'Kim SY, Koo SJ',
      year: 2015,
      title: 'Effect of duration of smartphone use on muscle fatigue and pain caused by forward head posture in adults',
      journal: 'J Phys Ther Sci',
    },
    {
      authors: 'Hanney WJ, Kolber MJ',
      year: 2007,
      title: 'Improving muscle performance of the deep neck flexors',
      journal: 'Strength Cond J',
    },
  ],

  by_severity: {
    chronic: {
      priority_work: [
        'chin_tuck_isometric_holds',
        'thoracic_extension_foam_roller',
        'upper_trap_downregulation',
        'suboccipital_release',
      ],
      daily_correctives: [
        'chin_tuck_isometric_5x10s',
        'thoracic_extension_foam_roll_60s',
      ],
      avoid_under_load: ['loaded_neck_flexion', 'heavy_shrug_with_head_tilt'],
      do_not_ban: ['overhead_press', 'deadlift', 'squat'],
      why_not_banned: 'Postural neck pain reshapes via deep-flexor strengthening + thoracic mobility. Avoiding compound work deconditions the support system.',
    },
    ok: {
      watch_out: ['long_phone_bouts_pre_training', 'barbell_bench_with_head_lifted_off_pad'],
      regression_if_pain: ['add_chin_tuck_isometrics_to_warmup'],
    },
  },

  per_session_type: {
    upper_push: {
      warmup_focus: ['chin_tuck_isometric', 'thoracic_extension'],
      priority_work: [],
      modifications: ['keep_head_on_bench_during_press'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    upper_pull: {
      warmup_focus: ['chin_tuck_isometric', 'thoracic_extension'],
      priority_work: ['deep_neck_flexor_activation'],
      modifications: ['chest_supported_row_minimizes_neck_extension_compensation'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_squat_focus: {
      warmup_focus: ['thoracic_extension'],
      priority_work: [],
      modifications: ['neutral_head_during_squat_no_chin_lift'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_hinge_focus: {
      warmup_focus: [],
      priority_work: [],
      modifications: ['neutral_head_during_deadlift'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_a: {
      warmup_focus: ['chin_tuck_isometric'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['chin_tuck_isometric', 'thoracic_extension'],
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
      avoid_on_this_session: [],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: [
        'chin_tuck_isometric_endurance',
        'thoracic_extension_foam_roller',
        'suboccipital_release',
        'doorway_pec_stretch',
      ],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  user_facing: {
    what_this_plan_does:
      'Builds deep-neck-flexor endurance so your head holds position without the upper traps overworking. Adds thoracic mobility to reduce forward head drive.',
    what_to_report: ['radiating pain or numbness into the arm', 'severe headaches linked to sessions'],
    when_to_see_professional:
      'Radiation into the arm or neurologic signs warrant cervical imaging and referral. Do not self-manage nerve-pattern pain.',
  },
}
