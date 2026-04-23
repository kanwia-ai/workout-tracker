// Rehab protocol registry.
//
// Single source of truth for the 11 injury protocols the planner uses to
// merge clinical directives into the InjuryDirective skeletons emitted by
// the interpretation pass. Every protocol is validated against the schema
// at import time so malformed data fails the build, not the user's plan.

import { type Protocol, validateProtocol } from './types'
import type { ProtocolId } from '../../types/directives'

import { lowerBackProtocol } from './lower_back'
import { meniscusProtocol } from './meniscus'
import { shoulderProtocol } from './shoulder'
import { kneePfpProtocol } from './knee_pfp'
import { hipFlexorsProtocol } from './hip_flexors'
import { upperBackProtocol } from './upper_back'
import { trapProtocol } from './trap'
import { elbowProtocol } from './elbow'
import { wristProtocol } from './wrist'
import { ankleProtocol } from './ankle'
import { neckProtocol } from './neck'

// Validate at module-load time. Any schema violation throws on import —
// which the TS build + test harness will surface loudly instead of
// shipping a broken protocol.
const RAW: Record<ProtocolId, unknown> = {
  lower_back: lowerBackProtocol,
  meniscus: meniscusProtocol,
  shoulder: shoulderProtocol,
  knee_pfp: kneePfpProtocol,
  hip_flexors: hipFlexorsProtocol,
  upper_back: upperBackProtocol,
  trap: trapProtocol,
  elbow: elbowProtocol,
  wrist: wristProtocol,
  ankle: ankleProtocol,
  neck: neckProtocol,
}

export const PROTOCOLS: Record<ProtocolId, Protocol> = Object.fromEntries(
  (Object.entries(RAW) as [ProtocolId, unknown][]).map(([id, raw]) => [
    id,
    validateProtocol(raw),
  ]),
) as Record<ProtocolId, Protocol>

// Convenience lookup. Returns null for unknown ids (defensive — all
// callers should be using typed ProtocolId values anyway).
export function getProtocol(id: ProtocolId): Protocol | null {
  return PROTOCOLS[id] ?? null
}

// Compile-time exhaustiveness guard — if a new ProtocolId is added to the
// zod enum but not given a protocol file + entry in RAW, TS will complain.
export const ALL_PROTOCOL_IDS: ProtocolId[] = Object.keys(PROTOCOLS) as ProtocolId[]
