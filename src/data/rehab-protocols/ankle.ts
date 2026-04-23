// Ankle — limited dorsiflexion affecting squat depth.
//
// Limited dorsiflexion ROM is the single most common mobility restriction
// affecting squat mechanics. Forces heel lift, forward knee collapse, or
// lumbar flexion compensation. Fix: soleus-biased mobility (bent knee
// stretches), knee-to-wall drilling, heel-elevated squats while working on
// mobility.

import type { Protocol } from './types'

export const ankleProtocol: Protocol = {
  id: 'ankle',
  title: 'Limited ankle dorsiflexion',
  summary:
    'Soleus mobility + knee-to-wall drilling. Heel-elevated squats as compensation while training mobility. Progress to full depth as ROM improves.',

  citations: [
    {
      authors: 'Macrum E, Bell DR, Boling M, Lewek M, Padua D',
      year: 2012,
      title: 'Effect of limiting ankle-dorsiflexion range of motion on lower extremity kinematics and muscle-activation patterns during a squat',
      journal: 'J Sport Rehabil',
      note: 'Limited DF → increased knee valgus, reduced quad activation, forward torso lean.',
    },
    {
      authors: 'Kim KM, Hart JM, Saliba SA, Hertel J',
      year: 2015,
      title: 'Effects of focal ankle joint mobilization on limits of stability and postural control',
      journal: 'Int J Sports Phys Ther',
    },
    {
      authors: 'Hoch MC, Staton LC, McKeon PO',
      year: 2011,
      title: 'Dorsiflexion range of motion significantly influences dynamic balance',
      journal: 'J Sci Med Sport',
    },
  ],

  by_severity: {
    chronic: {
      priority_work: [
        'knee_to_wall_dorsiflexion_mobility_daily',
        'soleus_bent_knee_calf_stretch',
        'banded_ankle_mobilization',
        'tibialis_anterior_raises',
      ],
      daily_correctives: [
        'knee_to_wall_2x10_per_side',
        'soleus_stretch_60s_per_side',
      ],
      avoid_under_load: ['deep_ATG_squat_heavy_without_compensation'],
      do_not_ban: ['squat', 'lunge', 'front_squat'],
      why_not_banned: 'Mobility grows through end-range loaded training. Heel-elevated squats bridge the gap while mobility improves.',
    },
    ok: {
      watch_out: ['full_depth_back_squat_unwarmed', 'high_volume_running_with_stiff_calves'],
      regression_if_pain: ['add_knee_to_wall_before_every_leg_session'],
    },
  },

  per_session_type: {
    lower_squat_focus: {
      warmup_focus: ['knee_to_wall_mobility', 'soleus_stretch', 'banded_ankle_mobilization'],
      priority_work: ['dorsiflexion_mobility_drill_pre_main'],
      modifications: ['heel_elevated_squat_until_knee_to_wall_12cm_bilateral'],
      pair_with: [],
      avoid_on_this_session: ['ATG_back_squat_heavy_if_DF_deficit_severe'],
    },
    lower_hinge_focus: {
      warmup_focus: ['knee_to_wall_mobility'],
      priority_work: [],
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
      warmup_focus: ['knee_to_wall_mobility'],
      priority_work: ['dorsiflexion_drill_pre_squat'],
      modifications: ['heel_elevated_squat_variant'],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['knee_to_wall_mobility'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: ['knee_to_wall_mobility_if_running'],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: [
        'knee_to_wall_dorsiflexion_mobility',
        'soleus_stretch',
        'banded_ankle_mobilization',
        'single_leg_calf_raise_full_rom',
      ],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  per_session_accessories: {},

  user_facing: {
    what_this_plan_does:
      'Improves ankle mobility over the block so full-depth squatting becomes accessible. Heel-elevated variants bridge the gap.',
    what_to_report: ['sharp pain at end range', 'swelling or color change after loading'],
    when_to_see_professional:
      'Sharp pain or swelling with loading suggests impingement or synovitis — image if persistent.',
  },
}
