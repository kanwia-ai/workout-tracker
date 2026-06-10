// rehabContinuity — cross-block rehab stage progression.
//
// The stage system inside ONE block already advances week by week
// (resolveStage walks the protocol's target_weeks bands), but every new
// block used to restart at effective week 1 — a meniscus user repeated
// stage 1 forever (audit 2026-06-09, critical finding #2). This module
// reads prior-block completion straight from Dexie (mesocycle history +
// check-ins + workout session logs — fully offline) and produces
// per-injury stage_weeks offsets so the next block picks up where the
// last one left off.
//
// Deterministic rule: a prior block advances the stage clock by its own
// length_weeks when the user completed at least 70% of its PROTOCOL
// sessions — sessions whose main slot trains a movement pattern the
// protocol's rehab stages constrain (squat-pattern days for meniscus).
// Anything less repeats the same stages. Blocks whose profile snapshot
// didn't carry the injury never advance it (you can't have done rehab
// work that wasn't programmed).
//
// Session ids collide across blocks (`session-wk1-s1` in every block), so
// completion is window-scoped: a check-in / session log only counts for
// the block that was live when it happened (generated_at of the block up
// to the generated_at of the next one).

import { db } from '../db'
import { getProtocol } from '../../data/rehab-protocols'
import type { Protocol } from '../../data/rehab-protocols/types'
import { resolveVariant, type MovementPattern } from './variants'
import { SESSION_MAIN_PATTERN, sessionTypeForSubtitle } from './buildMesocycle'
import {
  BODY_PART_TO_PROTOCOL,
  type ProgrammingDirectives,
  type ProtocolId,
} from '../../types/directives'
import type { UserProgramProfile } from '../../types/profile'

/** Completed-protocol-session share required to advance the stage clock. */
export const REHAB_ADVANCE_COMPLETION_THRESHOLD = 0.7

/** Injury source (profile `injuries[].part`) → extra rehab weeks. */
export type RehabStageOffsets = Readonly<Record<string, number>>

export interface RehabContinuityOptions {
  /**
   * Skip one block's advancement without rewriting history — the local
   * replan's pain guard withholds the just-completed block when the user's
   * check-in notes flag pain.
   */
  excludeMesocycleId?: string
}

// ─── Protocol stage patterns ────────────────────────────────────────────────
// Which main-slot movement patterns a protocol's rehab stages constrain.
// Meniscus stages list squat variants → squat-pattern sessions are the
// "protocol sessions" whose completion gates stage advancement.
export function protocolStagePatterns(protocol: Protocol): Set<MovementPattern> {
  const out = new Set<MovementPattern>()
  for (const stage of protocol.by_severity.rehab?.stages ?? []) {
    for (const id of stage.allowed_main_variants) {
      const p = resolveVariant(id)?.pattern
      if (p) out.add(p)
    }
  }
  return out
}

// ─── Completion records ─────────────────────────────────────────────────────
interface CompletionRecord {
  session_id: string
  at: string // ISO timestamp
}

async function loadCompletionRecords(userId: string): Promise<CompletionRecord[]> {
  const out: CompletionRecord[] = []
  const checkins = await db.sessionCheckins.where('user_id').equals(userId).toArray()
  for (const r of checkins) {
    out.push({ session_id: r.session_id, at: r.completed_at })
  }
  // A finished workout counts even when the user skipped the check-in sheet.
  const logs = await db.sessionLogs.where('user_id').equals(userId).toArray()
  for (const r of logs) {
    out.push({ session_id: r.workout_id, at: r.ended_at ?? r.date })
  }
  return out
}

// ─── Stored-row parsing (defensive — legacy rows must never crash this) ────
interface StoredInjury {
  part?: unknown
  severity?: unknown
}

interface StoredSession {
  id?: unknown
  subtitle?: unknown
}

function parseJsonArrayField<T>(json: string, pick: (raw: unknown) => T[]): T[] {
  try {
    return pick(JSON.parse(json))
  } catch {
    return []
  }
}

function snapshotInjuries(profileSnapshotJson: string): StoredInjury[] {
  return parseJsonArrayField(profileSnapshotJson, (raw) => {
    const injuries = (raw as { injuries?: unknown })?.injuries
    return Array.isArray(injuries) ? (injuries as StoredInjury[]) : []
  })
}

function storedSessions(sessionsJson: string): StoredSession[] {
  return parseJsonArrayField(sessionsJson, (raw) =>
    Array.isArray(raw) ? (raw as StoredSession[]) : [],
  )
}

function snapshotHadRehabInjury(
  profileSnapshotJson: string,
  protocolId: ProtocolId,
): boolean {
  return snapshotInjuries(profileSnapshotJson).some(
    (i) =>
      typeof i.part === 'string' &&
      i.severity === 'modify' &&
      BODY_PART_TO_PROTOCOL[i.part] === protocolId,
  )
}

// ─── Per-block completion ───────────────────────────────────────────────────
function blockProtocolCompletion(args: {
  sessionsJson: string
  patterns: ReadonlySet<MovementPattern>
  records: readonly CompletionRecord[]
  windowStart: string
  windowEnd: string | null // null = open-ended (latest block)
}): { protocolSessions: number; completed: number } {
  const { sessionsJson, patterns, records, windowStart, windowEnd } = args
  let protocolSessions = 0
  let completed = 0
  for (const s of storedSessions(sessionsJson)) {
    if (typeof s.id !== 'string' || typeof s.subtitle !== 'string') continue
    const sessionType = sessionTypeForSubtitle(s.subtitle)
    if (!sessionType) continue
    if (!patterns.has(SESSION_MAIN_PATTERN[sessionType])) continue
    protocolSessions += 1
    const done = records.some(
      (r) =>
        r.session_id === s.id &&
        r.at >= windowStart &&
        (windowEnd === null || r.at < windowEnd),
    )
    if (done) completed += 1
  }
  return { protocolSessions, completed }
}

// ─── Main entry: per-injury stage offsets ───────────────────────────────────
/**
 * Walk the user's mesocycle history (oldest → newest) and accumulate the
 * stage advancement each substantially-completed block earned, per rehab
 * injury on the CURRENT profile. Pure Dexie reads — works fully offline.
 */
export async function computeRehabStageOffsets(
  userId: string,
  profile: UserProgramProfile,
  opts: RehabContinuityOptions = {},
): Promise<RehabStageOffsets> {
  const rehabInjuries = profile.injuries.filter(
    (i) => i.severity === 'modify' && BODY_PART_TO_PROTOCOL[i.part],
  )
  if (rehabInjuries.length === 0) return {}

  const rows = await db.mesocycles.where('user_id').equals(userId).toArray()
  if (rows.length === 0) return {}
  rows.sort((a, b) => (a.generated_at < b.generated_at ? -1 : 1))
  const records = await loadCompletionRecords(userId)

  const offsets: Record<string, number> = {}
  for (const inj of rehabInjuries) {
    const protocolId = BODY_PART_TO_PROTOCOL[inj.part]!
    const protocol = getProtocol(protocolId)
    if (!protocol) continue
    const patterns = protocolStagePatterns(protocol)
    if (patterns.size === 0) continue

    let offset = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      if (row.id === opts.excludeMesocycleId) continue
      if (!snapshotHadRehabInjury(row.profile_snapshot_json, protocolId)) continue
      const { protocolSessions, completed } = blockProtocolCompletion({
        sessionsJson: row.sessions_json,
        patterns,
        records,
        windowStart: row.generated_at,
        windowEnd: rows[i + 1]?.generated_at ?? null,
      })
      if (
        protocolSessions > 0 &&
        completed / protocolSessions >= REHAB_ADVANCE_COMPLETION_THRESHOLD
      ) {
        offset += row.length_weeks
      }
    }
    if (offset > 0) offsets[inj.part] = offset
  }
  return offsets
}

// ─── Directive application ──────────────────────────────────────────────────
/**
 * Add the continuity offsets onto matching rehab injury directives. Pure;
 * returns the input untouched when there's nothing to apply.
 */
export function applyRehabStageOffsets(
  directives: ProgrammingDirectives,
  offsets: RehabStageOffsets,
): ProgrammingDirectives {
  const applicable = directives.injury_directives.some(
    (d) => d.severity === 'rehab' && (offsets[d.source] ?? 0) > 0,
  )
  if (!applicable) return directives
  return {
    ...directives,
    injury_directives: directives.injury_directives.map((d) => {
      const extra = offsets[d.source] ?? 0
      if (extra <= 0 || d.severity !== 'rehab') return d
      return {
        ...d,
        stage_weeks: d.stage_weeks + extra,
        rationale: `${d.rationale}; +${extra}wk carried over from completed prior block(s)`,
      }
    }),
  }
}
