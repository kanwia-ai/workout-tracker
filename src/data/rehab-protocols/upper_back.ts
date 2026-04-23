// Upper back — thoracic mobility + mid/lower trap weakness.
//
// Classic desk-posture pattern: thoracic kyphosis, rounded shoulders, weak
// mid-trap and rhomboids, overactive upper trap and pec minor. The fix:
// thoracic extension mobility, lower-trap biased pulling, posterior chain
// strengthening. Preserves all compound work while reshaping posture.

import type { Protocol } from './types'

export const upperBackProtocol: Protocol = {
  id: 'upper_back',
  title: 'Upper back stiffness / thoracic kyphosis / mid-trap weakness',
  summary:
    'Thoracic extension mobility + lower trap strengthening. Face pulls high volume. Reduce upper-trap-dominant patterns. Compound lifts stay in.',

  citations: [
    {
      authors: 'Sahrmann SA',
      year: 2002,
      title: 'Diagnosis and Treatment of Movement Impairment Syndromes',
      journal: 'Mosby',
      note: 'Scapular downward rotation syndrome + corrective framework.',
    },
    {
      authors: 'Page P, Frank CC, Lardner R',
      year: 2010,
      title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach',
      journal: 'Human Kinetics',
      note: 'Upper-crossed syndrome model + intervention hierarchy.',
    },
    {
      authors: 'Cools AM, Dewitte V, Lanszweert F et al.',
      year: 2007,
      title: 'Rehabilitation of scapular muscle balance',
      journal: 'Am J Sports Med',
      note: 'Prone Y/T/W protocol + lower-trap EMG selection.',
    },
  ],

  by_severity: {
    chronic: {
      priority_work: [
        'thoracic_extension_foam_roller',
        'prone_y_t_w_lower_trap_isolation',
        'face_pull_high_volume',
        'serratus_anterior_wall_slide',
        'banded_pull_apart',
      ],
      daily_correctives: [
        'thoracic_extension_foam_roll_60s',
        'banded_pull_apart_2x15',
      ],
      avoid_under_load: ['shrug_dominant_overhead_pressing'],
      do_not_ban: ['pullup', 'row', 'overhead_press', 'deadlift'],
      why_not_banned:
        'Upper back stiffness reshapes through posterior chain strengthening and thoracic mobility — not through avoiding loaded posterior work.',
    },
    ok: {
      watch_out: ['forward_head_posture_during_heavy_bench'],
      regression_if_pain: ['add_thoracic_mobility_to_every_warmup'],
    },
  },

  per_session_type: {
    upper_pull: {
      warmup_focus: ['thoracic_extension_foam_roll', 'banded_pull_apart', 'wall_slide'],
      priority_work: ['face_pull_high_volume', 'prone_y_raise'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    upper_push: {
      warmup_focus: ['thoracic_extension', 'banded_pull_apart'],
      priority_work: ['scap_control_pre_press'],
      modifications: [],
      pair_with: ['face_pull_between_pressing_sets'],
      avoid_on_this_session: [],
    },
    lower_squat_focus: {
      warmup_focus: ['thoracic_extension_for_bar_rack_position'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    lower_hinge_focus: {
      warmup_focus: ['thoracic_extension'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_a: {
      warmup_focus: ['thoracic_extension', 'wall_slide'],
      priority_work: ['face_pull'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['thoracic_extension', 'banded_pull_apart'],
      priority_work: ['prone_y_t_w'],
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
        'thoracic_extension_foam_roller',
        'prone_y_t_w',
        'wall_slide',
        'doorway_pec_stretch',
      ],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {},

  user_facing: {
    what_this_plan_does:
      "Strengthens the muscles that pull your shoulder blades back and down, improves your thoracic spine mobility so overhead work doesn't hitch.",
    what_to_report: ['any radiating pain into the arm', 'numbness in hands'],
    when_to_see_professional:
      'Arm radiation or hand numbness suggests nerve involvement (thoracic outlet, cervical radiculopathy). See a PT or neuro.',
  },
}
