// Trap (left / right) — scapular dyskinesis, upper-trap dominance.
//
// Unilateral trap tension is usually upper-trap dominance with lower-trap
// inhibition — the user feels it as a tight neck/trap knot. Root cause: poor
// scapular control during overhead and pulling work. Fix: lower trap
// isolation, serratus activation, face pulls, address breathing pattern
// (apical → diaphragmatic).

import type { Protocol } from './types'

export const trapProtocol: Protocol = {
  id: 'trap',
  title: 'Trap tension / scapular dyskinesis / upper-trap dominance',
  summary:
    'Downregulate upper trap, upregulate lower trap + serratus. Face pulls + prone Y. Scapular control during press and pull patterns.',

  citations: [
    {
      authors: 'Kibler WB, Ludewig PM, McClure PW et al.',
      year: 2013,
      title: 'Clinical implications of scapular dyskinesis in shoulder injury: the 2013 consensus statement',
      journal: 'Br J Sports Med',
      note: 'Consensus on scap dyskinesis + rehab hierarchy.',
    },
    {
      authors: 'Cools AM, Struyf F, De Mey K et al.',
      year: 2014,
      title: 'Rehabilitation of scapular dyskinesis: from the office worker to the elite overhead athlete',
      journal: 'Br J Sports Med',
      note: 'Exercise selection by EMG activation ratios.',
    },
    {
      authors: 'Neumann DA, Camargo PR',
      year: 2019,
      title: 'Kinesiologic considerations for targeting activation of scapulothoracic muscles',
      journal: 'Braz J Phys Ther',
    },
  ],

  by_severity: {
    chronic: {
      priority_work: [
        'lower_trap_isolation_prone_y',
        'serratus_anterior_wall_slide',
        'face_pull_high_volume',
        'scap_pushup',
        'chin_tuck_diaphragmatic_breath',
      ],
      daily_correctives: [
        'prone_y_2x10',
        'banded_pull_apart_2x15',
        'chin_tuck_isometric_5x10s',
      ],
      avoid_under_load: ['shrug_dominant_overhead_press', 'upright_row'],
      do_not_ban: ['overhead_press', 'pullup', 'row'],
      why_not_banned:
        'Upper-trap dominance corrects via lower-trap + serratus strengthening and conscious scap depression during overhead work. Avoiding overhead work reinforces the dominance.',
    },
    ok: {
      watch_out: ['stress_posture_elevated_shoulders_under_fatigue'],
      regression_if_pain: ['add_face_pull_and_scap_pushup_to_every_warmup'],
    },
  },

  per_session_type: {
    upper_push: {
      warmup_focus: ['scap_pushup', 'banded_pull_apart', 'chin_tuck'],
      priority_work: ['lower_trap_isolation_before_pressing'],
      modifications: ['neutral_grip_dumbbell_over_barbell_if_shrug_pattern_dominant'],
      pair_with: ['face_pull_between_pressing_sets'],
      avoid_on_this_session: ['upright_row'],
    },
    upper_pull: {
      warmup_focus: ['prone_y_t_w', 'wall_slide'],
      priority_work: ['face_pull_high_volume', 'lower_trap_isolation'],
      modifications: ['chest_supported_row_reduces_upper_trap_recruitment'],
      pair_with: [],
      avoid_on_this_session: ['shrug_heavy_volume'],
    },
    lower_squat_focus: {
      warmup_focus: ['chin_tuck_for_bar_position'],
      priority_work: [],
      modifications: ['front_squat_if_bar_position_aggravates_trap'],
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
      warmup_focus: ['scap_pushup', 'wall_slide'],
      priority_work: ['lower_trap_isolation'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    full_body_b: {
      warmup_focus: ['banded_pull_apart', 'prone_y_raise'],
      priority_work: ['face_pull'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
    conditioning: {
      warmup_focus: [],
      priority_work: [],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: ['heavy_farmer_carries_shrug_pattern_unrefined'],
    },
    rehab_mobility: {
      warmup_focus: [],
      priority_work: ['prone_y_t_w', 'wall_slide', 'chin_tuck', 'doorway_pec_stretch'],
      modifications: [],
      pair_with: [],
      avoid_on_this_session: [],
    },
  },

  user_facing: {
    what_this_plan_does:
      "Rebalances your shoulder blade so the upper trap doesn't carry the load. Face pulls + proneY become weekly staples.",
    what_to_report: ['radiation into arm', 'headaches tied to training'],
    when_to_see_professional:
      'Radiating pain into the arm or training-induced headaches warrant cervical spine + thoracic outlet screening.',
  },
}
