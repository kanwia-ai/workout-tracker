// interpretProfile — Phase 1 of the clinical planner pipeline.
//
// Reads a UserProgramProfile and produces structured ProgrammingDirectives
// that downstream planning modules consume. The interpretation runs in two
// layers:
//
//   1) Rule-based (this file) — handles every known profile field via pure
//      TypeScript. Maps body_part→protocol, severity→stage, goal→rep scheme,
//      sessions_per_week→week shape, and pattern-matches common posture notes.
//      Deterministic, zero API cost, fully testable.
//
//   2) LLM fallback (Phase 5) — only fires when the rule layer leaves
//      `matched_protocol: null` OR free-text is genuinely novel. Narrow
//      prompts, cheap models (Llama/Sonnet), not Opus.
//
// Phase 1 implements (1). The LLM hook is stubbed with a clear TODO so we can
// drop it in during Phase 5 without shape churn.

import {
  type UserProgramProfile,
  type PrimaryGoal,
  type AestheticPreference,
} from '../../types/profile'
import {
  type ProgrammingDirectives,
  type GoalDirectives,
  type WeekShape,
  type InjuryDirective,
  type RootCauseFlag,
  type SessionType,
  type WeeklyProgression,
  type RepSchemeBias,
  BODY_PART_TO_PROTOCOL,
  extractUnilateralSide,
} from '../../types/directives'

// ─── Goal → directives ──────────────────────────────────────────────────────
// Driven by primary_goals[0] (dominant), refined by aesthetic_preference.
// Source: MASTER-SYNTHESIS goal taxonomy; NSCA Essentials for rep ranges;
// Schoenfeld 2021 (hypertrophy), Rhea 2003 (strength) meta-analyses.

const GOAL_DEFAULTS: Record<PrimaryGoal, GoalDirectives> = {
  athletic: {
    aesthetic: 'athletic',
    primary_adaptation: 'strength_power',
    rep_scheme_bias: {
      main_compounds: [3, 6],
      accessories: [6, 10],
      finishers: [10, 15],
    },
    intensity_bias: 'heavy compounds + explosive accessories, moderate volume',
    cardio_policy: 'separated',
  },
  get_stronger: {
    aesthetic: 'athletic',
    primary_adaptation: 'strength_power',
    rep_scheme_bias: {
      main_compounds: [3, 5],
      accessories: [5, 8],
      finishers: [8, 12],
    },
    intensity_bias: 'heavy compounds, low volume, long rest',
    cardio_policy: 'minimal',
  },
  build_muscle: {
    aesthetic: 'hypertrophy',
    primary_adaptation: 'size',
    rep_scheme_bias: {
      main_compounds: [5, 8],
      accessories: [8, 12],
      finishers: [12, 15],
    },
    intensity_bias: 'moderate load, higher volume, RIR 1-3',
    cardio_policy: 'integrated',
  },
  lean_and_strong: {
    aesthetic: 'athletic',
    primary_adaptation: 'mixed',
    rep_scheme_bias: {
      main_compounds: [4, 6],
      accessories: [6, 10],
      finishers: [10, 15],
    },
    intensity_bias: 'strength compounds + hypertrophy accessories',
    cardio_policy: 'separated',
  },
  fat_loss: {
    aesthetic: 'general',
    primary_adaptation: 'work_capacity',
    rep_scheme_bias: {
      main_compounds: [6, 8],
      accessories: [8, 12],
      finishers: [12, 20],
    },
    intensity_bias: 'moderate load, density-focused, short rest',
    cardio_policy: 'aggressive',
  },
  mobility: {
    aesthetic: 'general',
    primary_adaptation: 'mixed',
    rep_scheme_bias: {
      main_compounds: [8, 12],
      accessories: [10, 15],
      finishers: [12, 20],
    },
    intensity_bias: 'ROM-first, light load, quality over intensity',
    cardio_policy: 'integrated',
  },
  general_fitness: {
    aesthetic: 'general',
    primary_adaptation: 'mixed',
    rep_scheme_bias: {
      main_compounds: [5, 8],
      accessories: [8, 12],
      finishers: [10, 15],
    },
    intensity_bias: 'balanced compound + accessory work',
    cardio_policy: 'integrated',
  },
}

function refineGoalWithAesthetic(
  base: GoalDirectives,
  pref: AestheticPreference | undefined,
): GoalDirectives {
  if (!pref || pref === 'none') return base
  if (pref === 'muscle_size_bulk') {
    return {
      ...base,
      aesthetic: 'hypertrophy',
      primary_adaptation: 'size',
      rep_scheme_bias: {
        main_compounds: [5, 8],
        accessories: [8, 12],
        finishers: [12, 15],
      },
      intensity_bias: 'compound-heavy hypertrophy, RIR 1-2',
    }
  }
  if (pref === 'athletic') {
    return {
      ...base,
      aesthetic: 'athletic',
      primary_adaptation: 'strength_power',
      rep_scheme_bias: {
        main_compounds: [3, 6],
        accessories: [6, 10],
        finishers: [10, 15],
      },
      intensity_bias: base.intensity_bias,
    }
  }
  if (pref === 'toned_lean') {
    return {
      ...base,
      rep_scheme_bias: {
        main_compounds: [6, 10] as [number, number],
        accessories: [10, 15] as [number, number],
        finishers: [12, 20] as [number, number],
      },
    }
  }
  return base
}

function deriveGoalDirectives(profile: UserProgramProfile): GoalDirectives {
  const dominant: PrimaryGoal =
    profile.primary_goals?.[0] ??
    profile.primary_goal ??
    'general_fitness'
  const base = GOAL_DEFAULTS[dominant]
  return refineGoalWithAesthetic(base, profile.aesthetic_preference)
}

// ─── Sessions per week → week shape ─────────────────────────────────────────
// Split selection follows standard periodization: 2-3 = full body, 4 = upper/
// lower, 5 = PPL+UL, 6 = PPL x2. Cardio placement follows goal.cardio_policy.

function deriveWeekShape(
  profile: UserProgramProfile,
  goal: GoalDirectives,
): WeekShape {
  const n = profile.sessions_per_week
  let template: SessionType[]
  let spacing: WeekShape['session_spacing']
  if (n <= 2) {
    template = ['full_body_a', 'full_body_b']
    spacing = 'alternating'
  } else if (n === 3) {
    template = ['full_body_a', 'full_body_b', 'full_body_a']
    spacing = 'alternating'
  } else if (n === 4) {
    template = ['lower_squat_focus', 'upper_push', 'lower_hinge_focus', 'upper_pull']
    spacing = 'upper_lower'
  } else if (n === 5) {
    template = ['lower_squat_focus', 'upper_push', 'lower_hinge_focus', 'upper_pull', 'conditioning']
    spacing = 'upper_lower'
  } else {
    template = ['upper_push', 'lower_squat_focus', 'upper_pull', 'upper_push', 'lower_hinge_focus', 'upper_pull']
    spacing = 'ppl'
  }
  const cardio_days: WeekShape['cardio_days'] = (() => {
    switch (goal.cardio_policy) {
      case 'aggressive':
        return ['standalone', 'standalone', 'post_upper']
      case 'integrated':
        return ['post_upper', 'rest_day']
      case 'separated':
        return ['rest_day']
      case 'minimal':
        return ['none']
    }
  })()
  return {
    sessions_per_week: n,
    template: template.slice(0, n),
    session_spacing: spacing,
    cardio_days,
  }
}

// ─── Severity → stage ───────────────────────────────────────────────────────
// Rehab stage interpretation. 'avoid' = acute, early stage. 'modify' = active
// rehab, mid-stage. 'chronic' = ongoing, not time-boxed. 'ok' = past acute.

function severityToStageWeeks(
  severity: 'avoid' | 'modify' | 'chronic' | 'ok',
  noteHint: string | undefined,
): number {
  // User may embed a stage hint in the note: "rehab week 3" → 3
  if (noteHint) {
    const match = noteHint.match(/(?:rehab\s+)?(?:week|wk)\s*(\d+)/i)
    if (match && match[1]) return Number.parseInt(match[1], 10)
  }
  switch (severity) {
    case 'avoid':
      return 0         // acute — not cleared for loaded work
    case 'modify':
      return 2         // active rehab, reintroducing load
    case 'chronic':
      return 52        // ongoing, address root cause; not time-boxed
    case 'ok':
      return 12        // past acute, sensible watch-outs
  }
}

function severityToDirectiveSeverity(
  s: 'avoid' | 'modify' | 'chronic' | 'ok',
): InjuryDirective['severity'] {
  if (s === 'avoid') return 'acute'
  if (s === 'modify') return 'rehab'
  return s  // 'chronic' | 'ok' pass through
}

// ─── Injury → directive ─────────────────────────────────────────────────────
// Phase 1 emits the skeleton. per_session_type and progression_arc start
// EMPTY; Phase 3 (planner) merges in the per-protocol YAML content. The
// matched_protocol field tells the planner which YAML to load.

function deriveInjuryDirective(
  injury: UserProgramProfile['injuries'][number],
): InjuryDirective {
  const protocol = BODY_PART_TO_PROTOCOL[injury.part] ?? null
  const side = extractUnilateralSide(injury.part)
  const severity = severityToDirectiveSeverity(injury.severity)
  const stage_weeks = severityToStageWeeks(injury.severity, injury.note)
  const rationale = protocol
    ? `${injury.part} (${injury.severity}); stage ${stage_weeks}wk into rehab per protocol '${protocol}'`
    : `${injury.part} (${injury.severity}); no matched protocol — conservative defaults applied`
  return {
    source: injury.part,
    matched_protocol: protocol,
    severity,
    stage_weeks,
    unilateral_side: side,
    rationale,
    global_avoid: [],           // filled by protocol merge in Phase 3
    per_session_type: {},        // filled by protocol merge
    progression_arc: [],         // filled by protocol merge
    recovery_target:
      severity === 'chronic'
        ? 'ongoing management; symptom reduction + pattern correction'
        : severity === 'ok'
          ? 'maintain; avoid reinjury'
          : 'full ROM, pain-free loaded movement by end of block',
  }
}

// ─── Root cause interpretation (posture notes + chronic complaints) ─────────
// Rule-based pattern matching for the most common presentations.
// Desk-worker + chronic LBP is the giant one — it's typically NOT a spine
// problem but weak glute med + tight hip flexors + poor hinge pattern.
// (Sahrmann, Janda, McGill — core movement impairment literature)

interface Pattern {
  matches: (p: UserProgramProfile) => boolean
  flag: RootCauseFlag
}

const ROOT_CAUSE_PATTERNS: Pattern[] = [
  {
    matches: (p) => {
      const chronicLBP = p.injuries.some(
        (i) => i.part === 'lower_back' && i.severity === 'chronic',
      )
      const deskHint = /desk|sit(ting)?|sedentary|office/i.test(
        p.posture_notes ?? '',
      )
      return chronicLBP && deskHint
    },
    flag: {
      observation: 'chronic lower back pain + desk-bound lifestyle',
      likely_cause:
        'quad/hip-flexor dominance + underactive glute medius + poor hip-hinge pattern',
      priority_work: [
        'glute_med_isolation',
        'hip_hinge_patterning_light',
        'couch_stretch_daily',
        'thoracic_mobility',
      ],
      avoid_under_load: ['spinal_flexion_compressed', 'loaded_sit_ups'],
      do_not_ban: ['deadlift', 'squat', 'rdl'],
      why_not_banned:
        'back pain driven by weak posterior chain + tight anterior hip; strengthening via hinge + abduction IS the fix',
    },
  },
  {
    matches: (p) => {
      const hipFlexorIssue = p.injuries.some((i) => i.part === 'hip_flexors')
      const tightHint = /tight.*hip|hip.*tight/i.test(p.posture_notes ?? '')
      return hipFlexorIssue || tightHint
    },
    flag: {
      observation: 'tight hip flexors (psoas/TFL dominance pattern)',
      likely_cause:
        'prolonged seated posture + underactive glute max/med + shortened anterior hip',
      priority_work: [
        'couch_stretch',
        '90_90_hip_mobility',
        'glute_max_bridge',
        'dead_bug_for_psoas_inhibition',
      ],
      avoid_under_load: ['loaded_hip_flexion_kicks'],
      do_not_ban: ['squat', 'lunge'],
      why_not_banned:
        'tight hip flexors need lengthening via glute activation + full-ROM hinge, not avoidance',
    },
  },
  {
    matches: (p) => {
      const neckOrTrap = p.injuries.some(
        (i) => i.part === 'neck' || i.part === 'left_trap' || i.part === 'right_trap',
      )
      const postureHint = /forward\s*head|text\s*neck|rounded\s*shoulder|kyphotic/i.test(
        p.posture_notes ?? '',
      )
      return neckOrTrap || postureHint
    },
    flag: {
      observation: 'upper-cross / postural pattern (trap / neck tension)',
      likely_cause:
        'overactive upper trap + suboccipitals, underactive deep neck flexors + mid-trap/rhomboid',
      priority_work: [
        'chin_tuck_isometrics',
        'scap_retraction_with_depression',
        'thoracic_extension_mobility',
        'face_pulls_high_volume',
      ],
      avoid_under_load: ['shrug_dominant_overhead_work', 'loaded_ipsilateral_head_tilt'],
      do_not_ban: ['overhead_press', 'pullup'],
      why_not_banned:
        'upper-cross corrects via lower-trap / deep-flexor strengthening; avoiding overhead work entrenches it',
    },
  },
]

function deriveRootCauses(profile: UserProgramProfile): RootCauseFlag[] {
  const out: RootCauseFlag[] = []
  for (const pat of ROOT_CAUSE_PATTERNS) {
    if (pat.matches(profile)) out.push(pat.flag)
  }
  return out
}

// ─── Progression narrative ─────────────────────────────────────────────────
// Generic 6-week arc. Per-injury arcs override in the InjuryDirective.

function deriveProgression(_goal: GoalDirectives): WeeklyProgression {
  return {
    wk1_2: 'accumulation: conservative loads, rehab variants where injury active, technique focus',
    wk3_4: 'intensification: introduce full-ROM variants as rehab progression permits, add intensity',
    wk5: 'peak intensity: PR attempts on safe lifts, highest volume/load of block',
    wk6: 'deload: 50-60% volume, maintain patterns, reassess injuries + goals',
  }
}

// ─── Unhandled-input detection ─────────────────────────────────────────────
// Anything the rule layer can't map is listed for LLM fallback or UI flag.

function detectUnhandled(profile: UserProgramProfile): string[] {
  const unhandled: string[] = []
  for (const inj of profile.injuries) {
    if (inj.part === 'other') {
      unhandled.push(`injury: ${inj.note ?? 'unspecified'} (other)`)
    }
  }
  if (profile.specific_target && profile.specific_target.length > 0) {
    // specific_target is free-text; leave for an LLM pass when/if one runs.
    unhandled.push(`specific_target: ${profile.specific_target}`)
  }
  return unhandled
}

// ─── Top-level entry ───────────────────────────────────────────────────────
// Pure function. Zero network. Zero API cost.

export function interpretProfile(
  profile: UserProgramProfile,
): ProgrammingDirectives {
  const goal = deriveGoalDirectives(profile)
  const week_shape = deriveWeekShape(profile, goal)
  const injury_directives = profile.injuries.map(deriveInjuryDirective)
  const root_causes = deriveRootCauses(profile)
  const progression = deriveProgression(goal)
  const unhandled_inputs = detectUnhandled(profile)

  return {
    goal,
    week_shape,
    injury_directives,
    root_causes,
    progression,
    source: 'rules',
    unhandled_inputs,
  }
}

// ─── Helper: re-export for callers that need rep ranges without re-deriving ─
export function goalRepBias(goal: GoalDirectives): RepSchemeBias {
  return goal.rep_scheme_bias
}
