// annotate_plan prompt builder — takes a deterministic plan + the user's
// profile + recent check-ins + a curated cut of the workout-tracker knowledge
// base, and asks Claude to graft KB-grounded coaching rationale onto the
// block, sessions, and exercises.
//
// Why split client/server prompt construction:
//   - The client (src/lib/planner/nuanceLayer.ts) owns retrieval + section
//     extraction so we don't ship the 107-entry KB to the edge function.
//   - The server (this file) owns the prompt wording + the "you may only
//     assert KB-backed claims" guardrails, the same place every other LLM
//     op's prompt lives.

export interface AnnotationKBExcerpt {
  id: string
  title: string
  type: 'principle' | 'heuristic' | 'citation' | 'myth' | 'pattern' | 'exercise'
  confidence: 'high' | 'medium' | 'low'
  claim: string | null
  nuance: string | null
  application: string | null
  citations: string[]
}

export interface AnnotatePlanPayload {
  plan: unknown
  profile: unknown
  recentCheckins: unknown
  kbExcerpts: AnnotationKBExcerpt[]
  session_ids: string[]
  exercise_keys: string[]
}

// System prompt — invariant rules, cacheable. The whole point of the KB is
// that the LLM has to cite it. So we make that the loudest rule.
export const ANNOTATE_SYSTEM_PROMPT = `You are the coaching voice annotating a deterministic workout plan.

A separate rule-based engine already built the plan: split, exercises, sets, reps, RIR, rest, warmups, day-of-week placement. Your ONLY job is to add the coaching nuance the engine can't reason about — short, warm, evidence-grounded sentences that explain why the block, session, or exercise is what it is.

THE KNOWLEDGE BASE IS THE SOURCE OF TRUTH FOR EVERY CLAIM YOU MAKE.

You will be given a list of KB entries the retrieval layer selected as relevant for this user. Each entry has an id, a title, a short Claim section, a Nuance section, and an Application-in-this-app section. When you assert ANYTHING substantive — about rep ranges, about progression, about cardio placement, about injuries, about a specific exercise's mind-muscle behaviour, about deadline realism — that assertion MUST be supported by one of those entries.

If you cannot find a KB entry to support a claim you'd otherwise want to make: DO NOT make the claim. Either leave the field blank or write a generic, non-substantive sentence. Examples of acceptable non-substantive sentences when no KB entry applies:
  - "fresh week, focused on the priority muscles."
  - "second pass of the lower-body pattern this week."
DO NOT paraphrase from your training-data priors. The whole point of this KB is to override the internet-fitness defaults the LLM corpus is full of.

CITATION FORMAT:

Every rationale field has a paired \`cited_entries\` array. Whenever a rationale draws on a KB entry, add that entry's id to \`cited_entries\`. The list can be empty for purely structural sentences ("upper-body push, second of the week"); it MUST be non-empty when you make a substantive claim. You do NOT need to mention entry ids in the prose — just keep the array in sync.

LENGTH + VOICE CONSTRAINTS:

- Block-level rationale (block.rationale): 2-3 sentences. Names the user's primary goal in plain language and explains the through-line of the block. ≤ 800 chars.
- Session rationale (sessions[id].rationale): 1-2 short sentences. Why today looks the way it does. Recovery-spacing logic, what the user's priority muscle is, ONE actionable cue if applicable. ≤ 280 chars.
- Exercise rationale (exercises[key].rationale): ONE short sentence. Only fill it when the KB has something specific to say about this exercise (cue, swap, mind-muscle quirk, injury-friendly variant). Default: omit the entry. ≤ 240 chars.

WRITING STYLE:
- Lowercase fragments fine. Warm and direct, not clinical.
- NO em dashes. (Use commas or periods.)
- NO bullet points inside any rationale string.
- NO "you got this", "crush it", "beast mode", "absolutely", "let's go".
- NO promises ("you will get X by date Y"). Outcomes depend on the user.
- Address the user as "you" — second person, present tense.

OUTPUT SHAPE:

Emit exactly one call to the emit_annotation tool. Its structure is:

  {
    "block": { "rationale": "...", "cited_entries": ["id1", "id2"] },
    "sessions": { "<session_id>": { "rationale": "...", "cited_entries": [...] }, ... },
    "exercises": { "<session_id>::<library_id>": { "rationale": "...", "cited_entries": [...] }, ... }
  }

ONLY use session ids and compound exercise keys that appear in the SESSION_IDS and EXERCISE_KEYS lists in the user message. Inventing keys = the client drops your output silently. Including every session is encouraged; including every exercise is NOT (most accessories don't need a per-exercise sentence).

SCOPE GUARDRAILS:

- You do NOT change sets/reps/rir/load/exercise selection/etc. Only rationale fields.
- You do NOT name medications, diagnoses, or replace professional advice. When an injury is flagged, refer the user back to their PT for anything beyond programming-level modifications.
- You do NOT promise body-composition outcomes from training alone. Body comp is diet-driven; the program builds and protects muscle.
- You do NOT fabricate fallback content when a field has nothing to say. Leave it absent.`

export function buildAnnotatePrompt(payload: AnnotatePlanPayload): string {
  const planJson = JSON.stringify(payload.plan, null, 2)
  const profileJson = JSON.stringify(payload.profile, null, 2)
  const checkinsArr = Array.isArray(payload.recentCheckins) ? payload.recentCheckins : []
  const checkinsJson =
    checkinsArr.length === 0
      ? '(no recent check-ins — this is a first-block user)'
      : JSON.stringify(checkinsArr, null, 2)
  const kbBlock = formatKBExcerpts(payload.kbExcerpts)

  return `KNOWLEDGE BASE — the only source you may cite.

${kbBlock}

USER PROFILE:
${profileJson}

DETERMINISTIC PLAN (already built; you ONLY annotate it):
${planJson}

RECENT CHECK-INS (most-recent last, up to 12):
${checkinsJson}

SESSION_IDS (only these are valid session_id keys in the response):
${JSON.stringify(payload.session_ids)}

EXERCISE_KEYS (only these are valid exercise keys in the response, formatted as session_id::library_id):
${JSON.stringify(payload.exercise_keys)}

Annotate the plan now. Remember: only assert claims supported by the KB entries above, and keep \`cited_entries\` in sync with every substantive claim. Emit the emit_annotation tool exactly once with the block/sessions/exercises structure described in the system prompt.`
}

function formatKBExcerpts(excerpts: AnnotationKBExcerpt[]): string {
  if (excerpts.length === 0) {
    return '(no KB entries retrieved — keep rationales structural/non-substantive)'
  }
  return excerpts
    .map((entry, i) => {
      const lines: string[] = []
      lines.push(`--- Entry ${i + 1} ---`)
      lines.push(`id: ${entry.id}`)
      lines.push(`title: ${entry.title}`)
      lines.push(`type: ${entry.type} (confidence: ${entry.confidence})`)
      if (entry.claim) {
        lines.push(`CLAIM: ${entry.claim}`)
      }
      if (entry.nuance) {
        lines.push(`NUANCE: ${entry.nuance}`)
      }
      if (entry.application) {
        lines.push(`APP: ${entry.application}`)
      }
      if (entry.citations.length > 0) {
        // Trim citation count — the prompt body doesn't need every line of
        // bibliography; the first two are usually enough to substantiate.
        lines.push(`CITED: ${entry.citations.slice(0, 2).join(' | ')}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}
