// Single-source-of-truth microcopy with 3 cheekiness tiers.
//
// Ported verbatim from the Lumo design reference (`COPY_BY_CHEEK` in
// /tmp/workout-app-design/app.jsx). The original used functions for
// greet* keys; those are encoded here as `{name}` placeholder strings
// so every value is either a plain string (with optional `{placeholder}`
// tokens) or a `readonly string[]` of options (for `setDone`).
//
// Unknown keys throw — callers should fail loudly rather than silently
// render a fallback that looks like a real message.

export type CheekLevel = 0 | 1 | 2;

export const DEFAULT_CHEEK: CheekLevel = 2;

// Values can be strings (with `{name}`-style placeholders) or arrays
// of strings (for pools of alternates like per-set acknowledgements).
type CopyValue = string | readonly string[];

type CopyShape = {
  readonly greetMorning: string;
  readonly greetAfternoon: string;
  readonly sessionIntro: string;
  readonly setDone: readonly string[];
  readonly prTitle: string;
  readonly prSub: string;
  readonly empty: string;
  readonly restFlex: string;
  readonly endSession: string;
  readonly regen: string;
};

export const COPY: Readonly<Record<CheekLevel, CopyShape>> = {
  0: {
    greetMorning: 'Morning, {name}.',
    greetAfternoon: '{name}.',
    sessionIntro:
      'Glute day. 48h recovery from Wednesday. Legs should feel ready.',
    setDone: ['logged.', 'next set.', 'keep going.', 'good.'],
    prTitle: 'NEW PR',
    prSub: 'you just did that',
    empty: 'no workout logged yet.',
    restFlex: 'rest. shake it out.',
    endSession: 'end session?',
    regen: 'make a new one',
  },
  1: {
    greetMorning: 'Good morning, {name} \u273F',
    greetAfternoon: 'Hey {name}.',
    sessionIntro:
      "Today's about glutes. You've had 48h of recovery from Wednesday \u2014 legs should feel ready.",
    setDone: ["nice.", "that's one.", 'sweet. next set.', 'keep it honest.'],
    prTitle: 'NEW PR',
    prSub: 'look at you.',
    empty: "we haven't worked out together yet. let's fix that.",
    restFlex: '45s. shake it out.',
    endSession: 'End for today?',
    regen: 'Regenerate',
  },
  2: {
    greetMorning: 'hi {name}, ready? \uD83C\uDF38',
    greetAfternoon: "you're back!",
    sessionIntro:
      "today's about glutes. you had 48h off since wednesday \u2014 legs should feel ready. this one's kinda mean, sorry.",
    setDone: [
      'nice. same weight next set.',
      'that counts. keep going.',
      'mm. do it again.',
      'log it honestly.',
    ],
    prTitle: 'NEW PR',
    prSub: 'you absolute menace',
    empty: "we haven't worked out together yet. rude. let's fix it.",
    restFlex: '45s. shake it out. no scrolling.',
    endSession: 'calling it?',
    regen: 'make a new one',
  },
};

export type CopyKey = keyof CopyShape;

// Only keys whose value is a string (not an array) can resolve via getCopy.
type StringCopyKey = {
  [K in CopyKey]: CopyShape[K] extends string ? K : never;
}[CopyKey];

/**
 * Resolve a microcopy string for a given key at a given cheekiness level.
 *
 * @param key    A string-valued key from {@link COPY}. Array-valued keys
 *               (currently `setDone`) are not supported here — read them
 *               directly from `COPY[level].setDone`.
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
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = vars[name];
    return v === undefined ? match : String(v);
  });
}
