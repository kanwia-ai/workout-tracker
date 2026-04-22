// Single-source-of-truth microcopy with 3 cheekiness tiers.
//
// Ported from the Lumo design reference (`COPY_BY_CHEEK` in
// /tmp/workout-app-design/app.jsx) and then EXPANDED with per-key pools so
// the per-set reactions don't get stale. Every key is either a plain string
// (with optional `{placeholder}` tokens) or a `readonly string[]` of
// alternates (used by `pickCopy` with an anti-repeat ref).
//
// Voice rules (enforced by review, not by type):
//  - close friend who also lifts. low-key, dry, warm, never shouty.
//  - zero fitness-bro phrases. NO "you got this", "crush it", "beast mode",
//    "no pain no gain", "let's go", etc.
//  - lowercase by default, em-dashes used sparingly, sentence fragments ok.
//
// Unknown keys throw — callers should fail loudly rather than silently
// render a fallback that looks like a real message.

export type CheekLevel = 0 | 1 | 2;

export const DEFAULT_CHEEK: CheekLevel = 2;

// Values can be strings (with `{name}`-style placeholders) or arrays
// of strings (for pools of alternates like per-set acknowledgements).
type CopyValue = string | readonly string[];

type CopyShape = {
  // Single strings (may contain {name} placeholders).
  readonly greetMorning: string;
  readonly greetAfternoon: string;
  readonly sessionIntro: string;
  readonly prTitle: string;
  readonly prSub: string;
  readonly empty: string;
  readonly restFlex: string;
  readonly endSession: string;
  readonly regen: string;
  // Pools (use pickCopy to sample with anti-repeat).
  readonly setDone: readonly string[];
  readonly setDonePR: readonly string[];
  /**
   * Low-key acknowledgements fired when the user taps a WARMUP set complete.
   * These are intentionally less celebratory than setDone — warmups don't earn
   * "you absolute menace". 20+ entries at tier 2 per spec.
   */
  readonly warmupDone: readonly string[];
  readonly preamble_morning: readonly string[];
  readonly preamble_afternoon: readonly string[];
  readonly preamble_evening: readonly string[];
  readonly restStart: readonly string[];
  readonly restSkipEarly: readonly string[];
  /**
   * Fires when a rest timer completes naturally (hits zero). Lumo nudges the
   * user back to the bar. 8+ entries per tier.
   */
  readonly restEnd: readonly string[];
  /**
   * Pool of lines rotated through while the plan is generating. Each tier
   * has its own voice (dry, friendly, cheeky). Tier 2 must have 25+ entries
   * per the Lumo loading-screen spec.
   */
  readonly generatingPlan: readonly string[];
  /**
   * Pool shown once generation has exceeded the "still cooking" threshold
   * (~180s). Softer / more patient voice than `generatingPlan`.
   */
  readonly generatingPlanLong: readonly string[];

  // ── Onboarding pools (v2 rebuild) ──────────────────────────────────────
  /** Welcome screen greeting lines. 10+/8+/6+ by tier. */
  readonly onboardingWelcome: readonly string[];
  /** Goal-step speech bubbles. 8+ per tier. */
  readonly onboardingGoal: readonly string[];
  /** Injury-step speech bubbles. 8+ per tier. Supports {injury}. */
  readonly onboardingInjuries: readonly string[];
  /** Acknowledgements when the user skips an optional step. 5+ per tier. */
  readonly onboardingSkipOk: readonly string[];
  /** Confirm-step summary intros. 8+ per tier. Supports {name}. */
  readonly onboardingConfirm: readonly string[];
  /** Easter egg: tapping a completed footprint. 4+ per tier. */
  readonly onboardingFootprintTap: readonly string[];
  // ── Per-step bubble pools (added 2026-04) ──────────────────────────────
  /** Aesthetic-step bubble. 3+ per tier. */
  readonly onboardingAesthetic: readonly string[];
  /** Specific-target free-text step. 3+ per tier. */
  readonly onboardingSpecificTarget: readonly string[];
  /** Cadence step — sessions/week picker. 3+ per tier. */
  readonly onboardingSessions: readonly string[];
  /** Active-minutes step — lifting duration. 3+ per tier. */
  readonly onboardingActiveMinutes: readonly string[];
  /** Equipment step. 3+ per tier. */
  readonly onboardingEquipment: readonly string[];
  /** Experience / training-age step. 3+ per tier. */
  readonly onboardingExperience: readonly string[];
  /** Muscle-priority step. 3+ per tier. */
  readonly onboardingMusclePriority: readonly string[];
  /** Dislikes step. 3+ per tier. */
  readonly onboardingDislikes: readonly string[];
  /** Body-stats step — age, sex, weight, height. 3+ per tier. */
  readonly onboardingBodyStats: readonly string[];
  /** Posture / free-text notes step. 3+ per tier. */
  readonly onboardingPosture: readonly string[];
};

/**
 * Body parts the plan-generation narration can call out by name. Mirrors
 * the BodyPart enum in src/types/profile.ts but kept structural so copy.ts
 * has no runtime dep on the profile schema. Unknown parts fall back to the
 * generic `generatingPlan` pool.
 */
export type NarrationBodyPart =
  | 'left_meniscus'
  | 'right_meniscus'
  | 'lower_back'
  | 'upper_back'
  | 'hip_flexors'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'shoulder'
  | 'left_trap'
  | 'right_trap'
  | 'left_knee'
  | 'right_knee'
  | 'neck'
  | 'wrist'
  | 'ankle'
  | 'elbow';

/**
 * Injury-specific narration callouts, keyed by cheek tier then body part.
 * Each body-part bucket has 3+ entries per tier. When the user's profile
 * includes an injury, these lines are interleaved into the `generatingPlan`
 * rotation so narration can reference real body parts ("negotiating with
 * your left meniscus"). Intentionally lives outside CopyShape because its
 * value shape (Record<part, string[]>) doesn't match CopyShape's per-key
 * string-or-pool constraint.
 */
export const GENERATING_PLAN_INJURED: Readonly<
  Record<CheekLevel, Readonly<Partial<Record<NarrationBodyPart, readonly string[]>>>>
> = {
  0: {
    left_meniscus: [
      'accounting for left meniscus.',
      'skipping risky knee loads.',
      'safer squat variants only.',
    ],
    right_meniscus: [
      'accounting for right meniscus.',
      'skipping risky knee loads.',
      'safer squat variants only.',
    ],
    lower_back: [
      'accounting for lower back.',
      'limiting loaded flexion.',
      'hinge pattern checks.',
    ],
    upper_back: [
      'accounting for upper back.',
      'limiting loaded extension.',
      'scapular prep added.',
    ],
    hip_flexors: [
      'accounting for hip flexors.',
      'limiting anterior load.',
      'hip mobility added.',
    ],
    left_shoulder: [
      'accounting for left shoulder.',
      'limiting overhead load.',
      'rotator prep added.',
    ],
    right_shoulder: [
      'accounting for right shoulder.',
      'limiting overhead load.',
      'rotator prep added.',
    ],
    shoulder: [
      'accounting for shoulder.',
      'limiting overhead load.',
      'rotator prep added.',
    ],
    left_trap: [
      'accounting for left trap.',
      'limiting shrug-dominant work.',
      'neck mobility added.',
    ],
    right_trap: [
      'accounting for right trap.',
      'limiting shrug-dominant work.',
      'neck mobility added.',
    ],
    left_knee: [
      'accounting for left knee.',
      'shallower knee flexion on squats.',
      'unilateral tempo work.',
    ],
    right_knee: [
      'accounting for right knee.',
      'shallower knee flexion on squats.',
      'unilateral tempo work.',
    ],
    neck: [
      'accounting for neck.',
      'limiting loaded neck positions.',
      'mobility added.',
    ],
    wrist: [
      'accounting for wrist.',
      'neutral grip preferred.',
      'wrist prep added.',
    ],
    ankle: [
      'accounting for ankle.',
      'reducing plyometric load.',
      'ankle mobility added.',
    ],
    elbow: [
      'accounting for elbow.',
      'limiting heavy pressing.',
      'tendon-friendly variants.',
    ],
  },
  1: {
    left_meniscus: [
      'Being careful with your left meniscus.',
      'Swapping out anything your left knee would hate.',
      'Skipping deep knee flexion on that side.',
    ],
    right_meniscus: [
      'Being careful with your right meniscus.',
      'Swapping out anything your right knee would hate.',
      'Skipping deep knee flexion on that side.',
    ],
    lower_back: [
      'Minding your lower back.',
      'Cutting loaded spinal flexion.',
      'Keeping hinges clean and controlled.',
    ],
    upper_back: [
      'Minding your upper back.',
      'Adding scapular prep so nothing tweaks.',
      'Limiting loaded extension.',
    ],
    hip_flexors: [
      'Giving your hip flexors a break.',
      'Dialing back on anterior chain loading.',
      'Weaving in hip mobility.',
    ],
    left_shoulder: [
      'Easy on your left shoulder.',
      'Limiting overhead work on that side.',
      'Adding rotator prep.',
    ],
    right_shoulder: [
      'Easy on your right shoulder.',
      'Limiting overhead work on that side.',
      'Adding rotator prep.',
    ],
    shoulder: [
      'Easy on your shoulders.',
      'Limiting overhead load.',
      'Adding rotator prep.',
    ],
    left_trap: [
      'Being careful with your left trap.',
      'Skipping shrug-dominant work.',
      'Adding neck and shoulder mobility.',
    ],
    right_trap: [
      'Being careful with your right trap.',
      'Skipping shrug-dominant work.',
      'Adding neck and shoulder mobility.',
    ],
    left_knee: [
      'Minding your left knee.',
      'Shallower knee flexion where it counts.',
      'Tempo work so it stays happy.',
    ],
    right_knee: [
      'Minding your right knee.',
      'Shallower knee flexion where it counts.',
      'Tempo work so it stays happy.',
    ],
    neck: [
      'Looking after your neck.',
      'Avoiding loaded neck positions.',
      'Adding gentle mobility.',
    ],
    wrist: [
      'Looking after your wrists.',
      'Preferring neutral grip.',
      'Adding wrist prep.',
    ],
    ankle: [
      'Looking after your ankles.',
      'Dialing back plyos.',
      'Adding ankle mobility.',
    ],
    elbow: [
      'Looking after your elbows.',
      'Limiting heavy pressing.',
      'Choosing tendon-friendly variants.',
    ],
  },
  2: {
    left_meniscus: [
      'negotiating with your left meniscus.',
      'making sure your left knee still likes me.',
      'skipping anything that\u2019d make your left knee sob.',
      'whispering sweet nothings to your left meniscus.',
    ],
    right_meniscus: [
      'negotiating with your right meniscus.',
      'making sure your right knee still likes me.',
      'skipping anything that\u2019d make your right knee sob.',
      'whispering sweet nothings to your right meniscus.',
    ],
    lower_back: [
      'babying your lower back on purpose.',
      'killing the loaded rounding. not today, back.',
      'keeping hinges clean so your back stays happy.',
      'no stupid deadlifts for you. trust me.',
    ],
    upper_back: [
      'babying your upper back on purpose.',
      'adding scap prep so nothing pops.',
      'killing the loaded extension drama.',
    ],
    hip_flexors: [
      'giving your hip flexors a therapy break.',
      'dialing back on the front-of-hip chaos.',
      'slipping in hip mobility when you\u2019re not looking.',
    ],
    left_shoulder: [
      'treading lightly on your left shoulder.',
      'cutting overhead work on that side.',
      'adding rotator prep so nothing snaps.',
    ],
    right_shoulder: [
      'treading lightly on your right shoulder.',
      'cutting overhead work on that side.',
      'adding rotator prep so nothing snaps.',
    ],
    shoulder: [
      'treading lightly on your shoulders.',
      'cutting overhead like it personally wronged me.',
      'adding rotator prep so nothing snaps.',
    ],
    left_trap: [
      'babying your left trap like a tiny baby.',
      'cutting shrug-dominant nonsense on that side.',
      'sneaking in neck mobility for your left trap.',
    ],
    right_trap: [
      'babying your right trap like a tiny baby.',
      'cutting shrug-dominant nonsense on that side.',
      'sneaking in neck mobility for your right trap.',
    ],
    left_knee: [
      'tiptoeing around your left knee.',
      'shallower knee flexion on that side.',
      'tempo work so your left knee behaves.',
    ],
    right_knee: [
      'tiptoeing around your right knee.',
      'shallower knee flexion on that side.',
      'tempo work so your right knee behaves.',
    ],
    neck: [
      'pampering your neck.',
      'no loaded neck positions. ew.',
      'adding the good mobility stuff.',
    ],
    wrist: [
      'treating your wrists like they\u2019re made of glass.',
      'neutral grip only. no drama.',
      'wrist prep added, you\u2019re welcome.',
    ],
    ankle: [
      'babying your ankles for a change.',
      'no surprise plyos. chill.',
      'ankle mobility, sneakily.',
    ],
    elbow: [
      'treating your elbows with respect.',
      'cutting the heavy pressing nonsense.',
      'picking tendon-friendly variants.',
    ],
  },
};

export const COPY: Readonly<Record<CheekLevel, CopyShape>> = {
  0: {
    greetMorning: 'Morning, {name}.',
    greetAfternoon: '{name}.',
    sessionIntro:
      'Glute day. 48h recovery from Wednesday. Legs should feel ready.',
    prTitle: 'NEW PR',
    prSub: 'you just did that',
    empty: 'no workout logged yet.',
    restFlex: 'rest. shake it out.',
    endSession: 'end session?',
    regen: 'make a new one',
    // Tier 0: dry/minimal. 12+ entries.
    setDone: [
      'logged.',
      'next set.',
      'keep going.',
      'good.',
      'set done.',
      'one down.',
      'noted.',
      'moving on.',
      'clean.',
      'solid.',
      'continue.',
      'fine.',
      'rep counted.',
      'carry on.',
    ],
    // Tier 0: dry PR acknowledgements (10+).
    setDonePR: [
      'new pr logged.',
      'pr recorded.',
      'top set. logged.',
      'that beats last time.',
      'record updated.',
      'new best. continue.',
      'past last time. noted.',
      'number up.',
      'new top set.',
      'pr. continue.',
    ],
    preamble_morning: [
      'Morning, {name}. Plan loaded.',
      'Session ready, {name}.',
      'Ready when you are.',
      'Day is on. Legs will feel it.',
      "Let's work.",
      '{name}. Plan is set.',
      'Warmup first.',
      'Mobility before load.',
      'Clock in when ready.',
      'Session queued.',
      'On deck.',
      'Plan loaded. Start.',
    ],
    preamble_afternoon: [
      'Afternoon, {name}.',
      'Session ready.',
      'Clock in.',
      'Plan loaded.',
      'Warmup first.',
      'Ready when you are.',
      'Start when ready.',
      'On deck.',
      'Time to move.',
      'Training slot open.',
    ],
    preamble_evening: [
      'Evening session, {name}.',
      'Last slot of the day.',
      'Light check. Ready.',
      'Warmup first.',
      'Plan loaded.',
      'Clock in.',
      'Session ready.',
      'Short session tonight.',
      'Wind down after.',
      'Ready when you are.',
    ],
    restStart: [
      'resting.',
      'hold.',
      'breathe.',
      'timer running.',
      'reset.',
      'pause.',
      'settle.',
      'stand up.',
      'walk if needed.',
      'steady breath.',
      'recovery time.',
      'wait out the clock.',
    ],
    restSkipEarly: [
      'rest skipped. continue.',
      'skipped. next set.',
      'noted. continue.',
      'skipped rest.',
      'continuing.',
      'noted. move on.',
      'rest short.',
      'early start. logged.',
    ],
    // Tier 0: dry warmup acknowledgements (12+ entries — 10 minimum).
    warmupDone: [
      'warmup logged.',
      'primed.',
      'moving on.',
      'noted.',
      'set up.',
      'warm.',
      'ready.',
      'checked.',
      'loose.',
      'next.',
      'primed. continue.',
      'warmup in the bank.',
    ],
    // Tier 0: dry rest-end (10+ entries).
    restEnd: [
      'time.',
      'rest over. next set.',
      'back to it.',
      "clock's up.",
      'continue.',
      'resume.',
      'go.',
      'next set.',
      'rest done.',
      'resuming.',
    ],
    // Tier 0: dry plan-generation narration (12+ entries).
    generatingPlan: [
      'reading profile.',
      'picking exercises.',
      'checking recovery windows.',
      'building week 1.',
      'building week 2.',
      'checking spacing.',
      'adding warmups.',
      'adding cooldowns.',
      'sequencing sessions.',
      'cross-checking volume.',
      'balancing push and pull.',
      'matching equipment.',
      'last touches.',
      'finalizing.',
    ],
    // Tier 0: long-wait narration (10+ entries).
    generatingPlanLong: [
      'still working.',
      'longer than usual. hold.',
      'still generating.',
      'almost there.',
      'hold tight.',
      'no timeout yet.',
      'last pass.',
      'model still thinking.',
      'retrying the block.',
      'still in progress.',
      'finalizing.',
    ],
    // Tier 0: onboarding welcome (6+ entries).
    onboardingWelcome: [
      'hi. setup first.',
      'first time. quick setup.',
      'profile setup.',
      'short questionnaire.',
      'a few questions.',
      'new plan setup.',
      'build profile.',
    ],
    // Tier 0: onboarding goal prompt (8+ entries).
    onboardingGoal: [
      'what do you want.',
      'pick a goal.',
      'primary goal.',
      'what are we optimizing for.',
      'pick one.',
      'top priority.',
      'main focus.',
      'clearest goal first.',
    ],
    // Tier 0: onboarding injuries (8+ entries).
    onboardingInjuries: [
      'injuries. anything active.',
      'flag anything sore.',
      'list what to avoid.',
      'acknowledge or skip.',
      'anything to program around.',
      'any pain or limits.',
      'add them here.',
      'flag injuries.',
    ],
    // Tier 0: skip ack (5+ entries).
    onboardingSkipOk: [
      'skipped. defaults applied.',
      'noted. moving on.',
      'skipped.',
      'default used.',
      'ok. next.',
      'defaulted.',
    ],
    // Tier 0: confirm (8+ entries).
    onboardingConfirm: [
      'review below.',
      'final check.',
      'confirm profile.',
      '{name}. review.',
      'ready to generate.',
      'last pass.',
      'everything correct.',
      'confirm and submit.',
    ],
    // Tier 0: footprint tap easter egg (4+ entries).
    onboardingFootprintTap: [
      'step complete.',
      'already done.',
      'done. keep going.',
      'logged.',
    ],
    onboardingAesthetic: [
      'pick a look.',
      'what shape are we building.',
      'optional. skip fine.',
    ],
    onboardingSpecificTarget: [
      'any concrete target.',
      'one line goal. optional.',
      'skip if none.',
    ],
    onboardingSessions: [
      'how many days.',
      'weekly cadence.',
      'pick 2-6.',
    ],
    onboardingActiveMinutes: [
      'active lift minutes.',
      'work time only. no rest.',
      'pick a range.',
    ],
    onboardingEquipment: [
      'what you have.',
      'select all that apply.',
      'gym or home.',
    ],
    onboardingExperience: [
      'training history.',
      'closest fit.',
      'months lifting.',
    ],
    onboardingMusclePriority: [
      'priority muscles.',
      'tap in order.',
      'optional.',
    ],
    onboardingDislikes: [
      'list dislikes.',
      'we will avoid these.',
      'optional.',
    ],
    onboardingBodyStats: [
      'basic stats.',
      'age and sex needed.',
      'weight + height optional.',
    ],
    onboardingPosture: [
      'lifestyle notes.',
      'optional context.',
      'skip if none.',
    ],
  },
  1: {
    greetMorning: 'Good morning, {name} \u273F',
    greetAfternoon: 'Hey {name}.',
    sessionIntro:
      "Today's about glutes. You've had 48h of recovery from Wednesday \u2014 legs should feel ready.",
    prTitle: 'NEW PR',
    prSub: 'look at you.',
    empty: "we haven't worked out together yet. let's fix that.",
    restFlex: '45s. shake it out.',
    endSession: 'End for today?',
    regen: 'Regenerate',
    // Tier 1: friendly. 12+ entries.
    setDone: [
      'nice.',
      "that's one.",
      'sweet. next set.',
      'keep it honest.',
      'clean rep.',
      'good one.',
      'logged, nice.',
      'felt solid.',
      'another down.',
      'that counts.',
      'good work.',
      'nailed it.',
      'onward.',
      'take a breath, good one.',
    ],
    // Tier 1: PR acknowledgements (10+).
    setDonePR: [
      'new pr, nice work.',
      "that's a pr — proud of you.",
      "look at that, new best.",
      'pr logged. good one.',
      "you just beat last time.",
      "that's a new top.",
      'new record. nice.',
      'pr! that was clean.',
      "nice. new best is yours.",
      'past your last. well done.',
    ],
    preamble_morning: [
      'Good morning, {name}. Ready when you are.',
      'Morning, {name}. Warmup first, ok?',
      'Hey {name}. Legs should feel fresh today.',
      'Good morning. Plan looks good.',
      'Morning. Easy start, build in.',
      'Morning, {name}. Take the warmup slow.',
      "Hi {name}. Let's get moving.",
      'Morning. Hydrate, then warmup.',
      "Hope you slept well, {name}.",
      "Good morning. Here's today's plan.",
      'Morning, {name}. Start when you are.',
      'Rise and warm up, {name}.',
    ],
    preamble_afternoon: [
      'Hey {name}. Session is queued.',
      'Afternoon, {name}. Ready?',
      "Hi {name}. Let's get into it.",
      'Afternoon. Warmup first.',
      "Good to see you, {name}. Let's work.",
      'Hey. Plan is loaded.',
      'Afternoon, {name}. Take it step by step.',
      'Hi {name}. Quick warmup, then lift.',
      "Afternoon. Let's move.",
      'Hey {name}. Clock in when ready.',
    ],
    preamble_evening: [
      'Evening, {name}. Session waiting.',
      'Hi {name}. Evening work is the best kind.',
      "Evening. Let's keep it moving.",
      'Hey {name}. Short warmup, then lift.',
      'Evening, {name}. Ease in.',
      'Plan is loaded, {name}.',
      'Evening. Warm up well.',
      "Hi {name}. Let's end the day strong.",
      'Evening. Easy start.',
      'Hey {name}. Ready when you are.',
    ],
    restStart: [
      "rest. shake it out.",
      'breathe. reset.',
      'quick pause.',
      "take a sip. you're doing great.",
      'recovery clock running.',
      'walk it off, come back fresh.',
      'steady breath.',
      'rest up. next set soon.',
      'hands on head, recover.',
      'good set. rest.',
      'shake the legs out.',
      'loose shoulders, breathe.',
    ],
    restSkipEarly: [
      'jumping right in? ok.',
      'skipping rest, got it.',
      'straight back to it.',
      'early start, go.',
      'cutting rest short. ok.',
      'no rest? your call.',
      'skipping. continue.',
      'noted, next set.',
    ],
    // Tier 1: friendly warmup acknowledgements (12+ entries, 10 minimum).
    warmupDone: [
      "warmup's in, nice.",
      'easy does it.',
      'warming up nicely.',
      'nothing heavy yet.',
      'feeling it out.',
      'primed and ready.',
      'good, move on.',
      'getting loose.',
      'just a little wake-up.',
      'blood moving, good.',
      'body online.',
      'warm. lets lift.',
    ],
    // Tier 1: friendly rest-end (10+ entries).
    restEnd: [
      "time's up, back at it.",
      'alright, next set.',
      'ready when you are.',
      "let's go, next set.",
      'rest done, keep going.',
      "okay, back to work.",
      'up you go, next rep.',
      "that's rest, continue.",
      'you rested. now lift.',
      'deep breath, next set.',
    ],
    // Tier 1: friendly plan-generation narration (12+ entries).
    generatingPlan: [
      'Reading your profile.',
      'Picking exercises that fit your body.',
      'Checking your recovery windows.',
      'Building week 1.',
      'Building week 2.',
      'Checking recovery spacing.',
      'Adding warmups for every session.',
      'Adding cooldowns so you can walk tomorrow.',
      'Sequencing sessions so nothing doubles up.',
      'Balancing push and pull.',
      'Matching lifts to your equipment.',
      'Sanity-checking volume.',
      'Doing last touches.',
      'Picking your accessories.',
      'Measuring twice before I cut anything.',
    ],
    // Tier 1: long-wait narration (10+ entries).
    generatingPlanLong: [
      'Still working on it — thanks for your patience.',
      'Taking a little longer than usual. Still going.',
      "This one's a chunky block. Give me a sec.",
      'Cross-checking the tricky bits.',
      'Almost there — promise.',
      'Doing one more pass to be safe.',
      'Still cooking.',
      'Hang tight, friend.',
      'I promise this is worth it.',
      'Deep-breathing, still working.',
    ],
    // Tier 1: onboarding welcome (8+ entries).
    onboardingWelcome: [
      "nice to meet you. let's build your plan.",
      "hi. quick setup and we're off.",
      "hey. i'll ask a few things, then we lift.",
      "first time? easy. a few questions.",
      "let's get you set up.",
      "start here. short questionnaire, then a plan.",
      "good to see you. setup first.",
      "hi. i need a handful of details.",
      'welcome. quick profile setup.',
      'ready when you are — a few questions first.',
    ],
    // Tier 1: onboarding goal (8+ entries).
    onboardingGoal: [
      "what are we aiming for?",
      "pick the closest fit — we can tune later.",
      "what's the main goal?",
      "one goal first, then the details.",
      'what do you want out of training?',
      "closest to the truth wins.",
      "pick your north star.",
      "top priority, be honest.",
      "what's the job of your training?",
    ],
    // Tier 1: onboarding injuries (8+ entries).
    onboardingInjuries: [
      "anything tweaky we should dodge?",
      "anything sore, flared, or off-limits?",
      "tell me what to program around.",
      "any pain to respect?",
      "anything you don't want to load?",
      "flag injuries here — we'll adapt.",
      "anything history-of-issues?",
      "anything off? i'll program around it.",
      "what should we be careful with?",
    ],
    // Tier 1: skip ack (5+ entries).
    onboardingSkipOk: [
      "skipped for now — defaults are fine.",
      "no worries, defaults applied.",
      "we'll come back to this.",
      "ok, moving on.",
      "fine. next question.",
      "filling blanks with sensible defaults.",
    ],
    // Tier 1: confirm (8+ entries).
    onboardingConfirm: [
      "{name}, here's what i heard. look right?",
      "double-check before we generate.",
      "here's the summary. good?",
      "confirm and i'll build your plan.",
      'review below and hit go when ready.',
      "one last look, {name}.",
      'all set? generate when ready.',
      "i got all this. confirm?",
      'ready to build when you are.',
    ],
    // Tier 1: footprint tap (4+ entries).
    onboardingFootprintTap: [
      "already logged — nice work.",
      "that one's in the bank.",
      "done step. keep going.",
      "nice, you cleared that.",
      'logged already, keep rolling.',
    ],
    onboardingAesthetic: [
      "what do you want the mirror to show?",
      'pick a shape — we can tune later.',
      "what's the look you're after?",
      'optional. skip if you just want results.',
    ],
    onboardingSpecificTarget: [
      'any one specific goal?',
      'concrete target, optional.',
      'one line, if there is one.',
      'skip if nothing comes to mind.',
    ],
    onboardingSessions: [
      'how many sessions a week?',
      'be honest — what you will actually show up for.',
      "pick the number you'll hit.",
      'weekly cadence.',
    ],
    onboardingActiveMinutes: [
      'how long is your actual lifting time?',
      'work minutes only — rest between sets not counted.',
      'active time on the floor.',
      'we budget rest separately.',
    ],
    onboardingEquipment: [
      'what do you have access to?',
      "we'll only program what you own.",
      'pick every option that applies.',
    ],
    onboardingExperience: [
      'how long have you been lifting?',
      'shapes intensity — closest fit.',
      'training experience.',
    ],
    onboardingMusclePriority: [
      'any muscles to prioritize?',
      'tap in order — first tap is top priority.',
      'optional. skip for balanced.',
    ],
    onboardingDislikes: [
      "anything you don't want to see?",
      'tell me what to dodge.',
      'totally valid. optional.',
    ],
    onboardingBodyStats: [
      'a bit about you.',
      'age + sex for calibration. rest optional.',
      'quick stats.',
    ],
    onboardingPosture: [
      'anything else about your lifestyle?',
      'desk-job vibes? chronic tension? any context.',
      'optional free text.',
    ],
  },
  2: {
    greetMorning: 'hi {name}, ready? \uD83C\uDF38',
    greetAfternoon: "you're back!",
    sessionIntro:
      "today's about glutes. you had 48h off since wednesday \u2014 legs should feel ready. this one's kinda mean, sorry.",
    prTitle: 'NEW PR',
    prSub: 'you absolute menace',
    empty: "we haven't worked out together yet. rude. let's fix it.",
    restFlex: '45s. shake it out. no scrolling.',
    endSession: 'calling it?',
    regen: 'make a new one',
    // Tier 2: cheeky (default). 25+ entries per spec.
    setDone: [
      'you absolute menace',
      'one down, unit',
      'nailed it, sweet pea',
      'certified banger',
      'get OUT of here with that',
      'nice. next set, same weight.',
      'mm. do it again.',
      'log it honestly.',
      'that counts. keep going.',
      "that's one. shake it out.",
      'sneaky strong today',
      'oh we are locking in',
      "okay show-off",
      "clean. don't get cocky.",
      'menace behavior',
      "imagine doing that on purpose",
      'reps look disrespectful',
      "that's the one.",
      "proud of you. don't tell anyone.",
      "excuse YOU",
      'crisp. same weight next.',
      'rude rep honestly',
      "little treat for the muscles",
      "okay but that? that was clean.",
      "locked in, love to see it",
      "mm. again please.",
      "that rep had opinions",
      'unit behavior detected',
      "you ate that",
      'chef kissed it',
    ],
    // Tier 2: PR acknowledgements (15+).
    setDonePR: [
      'that was a pr btw. menace.',
      "new pr just happened. casually.",
      'oh. OH. new best.',
      "excuse me?? new pr??",
      'past your last. obnoxious.',
      "pr behavior. get out.",
      'new top set. sneaky.',
      "your last number is sobbing rn",
      "rudely, that's a pr.",
      'calmly setting prs. ok.',
      "new record. don't make it weird.",
      'pr alert. menace confirmed.',
      "beat yourself. favorite hobby.",
      'new ceiling. keep going.',
      "top set, top of the pops.",
      "that pr was unnecessary",
    ],
    preamble_morning: [
      "morning {name}. warmup first or i'm telling.",
      "hi {name}, ready? this one's kinda mean sorry.",
      "{name}. coffee first. then legs.",
      "good morning menace. plan loaded.",
      "{name} hi. we're moving today.",
      "morning. stretch while you read this.",
      "hi hi {name}. easy start, we build.",
      "you slept, good. now we lift.",
      "morning {name}. hammies don't warmup themselves.",
      "hi, ready? don't answer, warmup.",
      "okay {name}, short warmup, real session.",
      "morning. drink water. then work.",
      "hi {name}. let's be annoying and strong today.",
      "oh good, you're up. we move.",
      "warmup is not optional {name}, ty.",
      "morning. rude hour but here we are.",
    ],
    preamble_afternoon: [
      "you're back! warmup first.",
      "afternoon {name}. you know the drill.",
      "oh hi {name}. legs, today.",
      "back for more? ok, menace.",
      "afternoon. we move. we lift. we nap later.",
      "hi {name}, quick warmup then we're in.",
      "look who showed up. ok, work.",
      "{name}. tea, then work.",
      "afternoon. it's lifting o'clock.",
      "hi. yes. warmup. now.",
      "back already? love that for us.",
      "afternoon {name}. the weights are waiting.",
      "you came back. proud. warmup please.",
      "{name} hi. ease in, don't yeet.",
      "okay. short warmup. then real work.",
      "afternoon menace. ready when you are.",
    ],
    preamble_evening: [
      "evening {name}. last slot, let's be annoying and strong.",
      "hi. yes i know it's late. warmup anyway.",
      "evening session {name}. no skipping warmup.",
      "you made it. tired? me too. warmup.",
      "{name} hi. short warmup, short session.",
      "evening menace. we lift, then we rest.",
      "okay one more session {name}, come on.",
      "evening. you earned this. warmup first.",
      "hi {name}, night owl energy. let's move.",
      "evening. short warmup, then actual work.",
      "{name}. last workout of the day. make it count.",
      "late but here. respect. warmup.",
      "evening {name}. short, sweet, mean.",
      "hi. tea after. lifts now.",
      "evening {name}. we lift, then we flop.",
    ],
    restStart: [
      "45s. shake it out. no scrolling.",
      "rest. breathe like you mean it.",
      "ok. pause. no scrolling tiktok.",
      "breathe. walk two steps. come back.",
      "rest. don't check your phone.",
      "put the phone down menace.",
      "quick pause. loose shoulders.",
      "steady breath. next set is coming.",
      "shake the legs out. hydrate.",
      "rest. be a person for 45s.",
      "pause. sip water. be normal.",
      "breathe in, breathe out, don't scroll.",
      "rest. your hr is probably high, fine.",
      "chill. we go again soon.",
    ],
    restSkipEarly: [
      "skipping rest? ok, menace.",
      "no rest? bold. your nervous system said what.",
      "cutting rest. fine. i see you.",
      "early start. noted. mean.",
      "straight back in? unhinged, love it.",
      "no rest?? you have NO chill.",
      "ok machine. going again.",
      "skipped the timer, menace energy.",
      "rest was a suggestion apparently.",
    ],
    // Tier 2: cheeky warmup acknowledgements (20+ entries per spec).
    warmupDone: [
      'easy does it.',
      'just feeling it out.',
      'warming up, no drama.',
      'nothing heavy yet, chill.',
      'loose and ready.',
      'primed. next one.',
      'body online, nice.',
      'little wake-up call.',
      'ok, blood is moving.',
      'cute. more.',
      "that's one warmup. next.",
      'warm. barely.',
      "that's the polite one.",
      "okay, not scary yet.",
      'soft start, good.',
      "we're easing in.",
      'warmup behavior.',
      'cute little rep.',
      "we're just saying hi.",
      "we're being nice to your joints.",
      "yeah yeah, warmup done.",
      'joints: unlocked.',
      'body: online.',
      "okay. no drama yet.",
      'warmup in the bank.',
    ],
    // Tier 2: cheeky rest-end (10+ entries).
    restEnd: [
      "time's up menace. back at it.",
      "alright, next set. let's.",
      "clock's done. stop scrolling.",
      "okay, go. next set.",
      "rest's over, lift again.",
      "deep breath menace. go.",
      "up up up. next set.",
      "put your phone down, next set.",
      "ok rest over. be strong again.",
      "quit stretching and go.",
      "ok warmed back up? go.",
      "times up. be annoying and strong.",
    ],
    // Tier 2: cheeky plan-generation narration (25+ entries per spec).
    generatingPlan: [
      "scanning your profile like it\u2019s gossip.",
      'matching 873 exercises to your actual body.',
      "picking exercises that won\u2019t hate your knees.",
      'building the perfect plan for a tight bum.',
      "double-checking your knees won\u2019t hate me.",
      "sneaking rehab into places you won\u2019t notice.",
      "making sure you don\u2019t deadlift your way to the ER.",
      "cross-referencing your injuries with what\u2019s fun.",
      'spacing your sessions so you can walk on tuesday.',
      'assembling week 1 like a picky sandwich.',
      'thinking hard about your hamstrings.',
      "choosing glute work you\u2019ll actually do.",
      'matching lifts to the bars you own.',
      'adding warmups so nothing pops.',
      "slipping in mobility when you\u2019re not looking.",
      'balancing push and pull so your posture survives.',
      "scheduling rest days you\u2019ll respect. probably.",
      "making sure legs + glutes aren\u2019t back-to-back.",
      "picking accessories that won\u2019t waste your time.",
      'triple-checking recovery windows.',
      'dialing in rep ranges for actual progress.',
      'rehearsing the order so sessions flow.',
      'giving your weak points some love.',
      'finding the sweet spot between gentle and hard.',
      'making sure you peak, not plateau.',
      'rationing intensity so you come back tomorrow.',
      'doing last touches. almost done.',
      'putting the pretty bow on it.',
      'negotiating with the model, politely.',
    ],
    // Tier 2: long-wait narration (10+ entries).
    generatingPlanLong: [
      "this is taking longer than usual \u2014 still cooking though.",
      'still cooking, you absolute menace.',
      'the model is being thorough, not broken.',
      "one more pass and i\u2019m handing it over.",
      'i promise this is worth the wait.',
      'building it right, not fast.',
      "still in the oven. don\u2019t open the door.",
      'deep thinking. give me a sec.',
      "this block\u2019s chunky. hold my drink.",
      "almost there, i\u2019m not ghosting you.",
      "i swear i\u2019m not buffering.",
      'quality control, not procrastination.',
    ],
    // Tier 2: onboarding welcome (10+ entries).
    onboardingWelcome: [
      "alright let's do this.",
      "hi hi. quick setup, then we lift.",
      "hello menace. i need some details.",
      "nice to meet you. i\u2019ll be annoying about questions.",
      "okay. a few questions, then a plan.",
      "hi. don\u2019t worry, this is fast.",
      "hello. let\u2019s make you a real program.",
      "hi. a few questions. honest answers please.",
      "okay. setup time. don\u2019t overthink it.",
      "hi. i\u2019ll make this quick, promise.",
      "hello you. a few details and we\u2019re off.",
      'ready? a handful of questions, then fun.',
    ],
    // Tier 2: onboarding goal (8+ entries).
    onboardingGoal: [
      "what\u2019s the goal? be honest.",
      "pick one. it\u2019s fine to change later.",
      'what are we actually training for?',
      'clearest goal wins.',
      'pick the one that\u2019s true today.',
      'one goal. don\u2019t pick three.',
      'what\u2019s the north star here?',
      'the truthful answer works best.',
      'what do you want, seriously.',
      'goal time. no wishy-washy.',
    ],
    // Tier 2: onboarding injuries (8+ entries).
    onboardingInjuries: [
      "anything tweaky we should dodge?",
      "tell me where the skeletons are.",
      "anything sore, flared, or dramatic?",
      "i'll program around it. just tell me.",
      "what hurts? i won\u2019t rat.",
      "anything been acting up lately?",
      "no shame. list the bad boys.",
      "honest answer: what\u2019s cranky?",
      'what are we tiptoeing around today?',
      "nothing tweaky is okay to miss \u2014 be thorough.",
    ],
    // Tier 2: skip ack (5+ entries).
    onboardingSkipOk: [
      "fine, i\u2019ll fill in the blanks.",
      "skipping. i\u2019ll pick sensible defaults.",
      "noted. moving on.",
      "ok menace. defaults applied.",
      "skipped. i got you.",
      "not today? fine. defaults on.",
      "leaving it blank, defaults on.",
    ],
    // Tier 2: confirm (8+ entries).
    onboardingConfirm: [
      "{name}, this is what i heard.",
      "okay. this look right?",
      "last look. does this match reality?",
      "let me read this back. correct me.",
      "hit go and i\u2019ll build it.",
      "{name}, confirm and we lift.",
      "final check. no take-backs after.",
      'ready? this is what i\u2019ll work from.',
      'confirm or go back. your call.',
      "alright. you ready for me to build this?",
    ],
    // Tier 2: footprint tap (4+ entries).
    onboardingFootprintTap: [
      "already handled that one.",
      "that step? already yours.",
      "done. nothing to see here.",
      "checked off, menace.",
      "you already told me that one.",
      'already in the bank, love.',
    ],
    onboardingAesthetic: [
      "lock it in — what do you want the mirror to show?",
      'what shape are we building today?',
      "pick your vibe. you can tune later.",
      "what do you want to look like, for real.",
      'choose a look, no judgment.',
    ],
    onboardingSpecificTarget: [
      'got one goal you’re gunning for? tell me.',
      'one concrete target. optional but fun.',
      'any specific thing? a pull-up? glutes by june?',
      'name a target. totally skippable.',
    ],
    onboardingSessions: [
      'how many days a week, honestly?',
      'real talk — what will you actually show up for.',
      "don't overpromise. pick what's real.",
      'weekly cadence time. no lying.',
      'sessions per week — real number.',
    ],
    onboardingActiveMinutes: [
      "how long is your actual lifting? rest doesn't count.",
      'work time only, menace. rest we budget separately.',
      'active minutes on the floor — not total gym time.',
      'how long are you actually under the bar?',
      'time you’re actually lifting, not scrolling.',
    ],
    onboardingEquipment: [
      "what's in your toolbox?",
      'tell me what you have. i won’t make you buy anything.',
      "pick everything you've got access to.",
      "gym, garage, bands — what do you work with?",
    ],
    onboardingExperience: [
      'how long you been lifting?',
      "be real about your experience — i'll calibrate.",
      'months under the bar, ballpark.',
      'training history, closest fit.',
    ],
    onboardingMusclePriority: [
      'any muscles to spotlight? first tap wins.',
      'pick priorities in order. optional.',
      'what do you want more of?',
      'tap the ones you want fed. optional.',
    ],
    onboardingDislikes: [
      "what do you refuse to do?",
      "anything we should never see? flag it.",
      'dealbreakers. i respect them.',
      'what makes you want to go home?',
    ],
    onboardingBodyStats: [
      'quick stats. for calibration, not vibes.',
      'age + sex please. rest is optional.',
      'just the basics, no judgment.',
      "i don't care about the number. it just calibrates.",
    ],
    onboardingPosture: [
      'anything else i should know? desk job? tight hips?',
      'last free-text box. lifestyle, context, anything.',
      'optional brain dump. tell me about your day.',
      'skip or drop any last context.',
    ],
  },
};

export type CopyKey = keyof CopyShape;

// Only keys whose value is a string (not an array) can resolve via getCopy.
type StringCopyKey = {
  [K in CopyKey]: CopyShape[K] extends string ? K : never;
}[CopyKey];

// Only keys whose value is an array (a pool) can resolve via pickCopy.
type PoolCopyKey = {
  [K in CopyKey]: CopyShape[K] extends readonly string[] ? K : never;
}[CopyKey];

/**
 * Resolve a microcopy string for a given key at a given cheekiness level.
 *
 * @param key    A string-valued key from {@link COPY}. Array-valued (pool)
 *               keys must be read via {@link pickCopy} instead.
 * @param level  Cheekiness tier (0 dry, 1 friendly, 2 cheeky). Defaults
 *               to {@link DEFAULT_CHEEK} (2).
 * @param vars   Optional map of `{placeholder}` substitutions. Missing
 *               placeholders are left untouched.
 * @throws Error when `key` is not a known string-valued copy key.
 */
export function getCopy(
  key: StringCopyKey,
  level: CheekLevel = DEFAULT_CHEEK,
  vars?: Readonly<Record<string, string | number>>,
): string {
  const tier = COPY[level];
  if (!tier || !(key in tier)) {
    throw new Error(`Unknown copy key: ${String(key)}`);
  }
  const raw: CopyValue = tier[key];
  if (typeof raw !== 'string') {
    // Defensive: the type system forbids this, but guard at runtime so
    // callers that cast their way around the type get a loud failure.
    throw new Error(`Copy key "${String(key)}" is not a string.`);
  }
  return applyVars(raw, vars);
}

/**
 * Pick one string from a copy pool (array-valued key) with anti-repeat.
 *
 * The caller passes a ref whose `.current` is the last-shown line for that
 * key (or null). The helper picks a new entry uniformly at random but, when
 * the pool has ≥2 entries, never returns the same value as `ref.current`.
 * After picking, it writes the chosen value back to `ref.current` so the
 * next call sees the updated state.
 *
 * Placeholders in the chosen entry are substituted via {@link applyVars}.
 *
 * @param key    An array-valued key from {@link COPY}.
 * @param level  Cheekiness tier. Defaults to {@link DEFAULT_CHEEK}.
 * @param ref    Mutable ref whose `.current` holds the last shown line
 *               (or null). The helper updates it in place.
 * @param vars   Optional `{placeholder}` substitutions.
 * @throws Error when `key` is not a known pool copy key.
 */
export function pickCopy(
  key: PoolCopyKey,
  level: CheekLevel = DEFAULT_CHEEK,
  ref?: { current: string | null },
  vars?: Readonly<Record<string, string | number>>,
): string {
  const tier = COPY[level];
  if (!tier || !(key in tier)) {
    throw new Error(`Unknown copy key: ${String(key)}`);
  }
  const raw: CopyValue = tier[key];
  if (!Array.isArray(raw)) {
    throw new Error(`Copy key "${String(key)}" is not a pool.`);
  }
  const pool = raw as readonly string[];
  if (pool.length === 0) {
    throw new Error(`Copy pool "${String(key)}" is empty at level ${level}.`);
  }
  const last = ref?.current ?? null;
  let candidates: readonly string[] = pool;
  if (pool.length > 1 && last !== null) {
    const filtered = pool.filter(entry => entry !== last);
    if (filtered.length > 0) candidates = filtered;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
  if (ref) ref.current = pick;
  return applyVars(pick, vars);
}

/**
 * Build a rotation pool for the plan-generation narration at a given cheek
 * tier, interleaving any injury-specific lines from
 * {@link GENERATING_PLAN_INJURED} when the user's profile has matching parts.
 * Unknown parts are silently ignored.
 *
 * When `long` is true, returns the "still cooking" (`generatingPlanLong`)
 * pool for the same tier — injury interleaving is skipped here because the
 * long-wait voice is meant to be patient, not clever.
 */
export function buildGeneratingPlanPool(
  level: CheekLevel = DEFAULT_CHEEK,
  injuries?: readonly { part: string }[],
  long = false,
): readonly string[] {
  const tier = COPY[level];
  if (long) return tier.generatingPlanLong;
  const base = tier.generatingPlan;
  if (!injuries || injuries.length === 0) return base;

  const injuryLines: string[] = [];
  const bucket = GENERATING_PLAN_INJURED[level];
  for (const inj of injuries) {
    const lines = bucket[inj.part as NarrationBodyPart];
    if (lines) injuryLines.push(...lines);
  }
  if (injuryLines.length === 0) return base;
  return [...base, ...injuryLines];
}

// ─── internal ────────────────────────────────────────────────────────────

function applyVars(
  raw: string,
  vars?: Readonly<Record<string, string | number>>,
): string {
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = vars[name];
    return v === undefined ? match : String(v);
  });
}
