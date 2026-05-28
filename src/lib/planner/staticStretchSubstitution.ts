// Static-stretch substitution — single source of truth.
//
// WHY: Static stretching >30s pre-lift acutely depresses peak force ~3.7-5%
// (Behm & Chaouachi 2011, Behm 2016). Dynamic ROM work doesn't. Static work
// belongs in cooldown / mobility-only contexts. Any static-stretch id pulled
// from a protocol's warmup_focus (or rehab stage warmup_protocol) gets swapped
// for a dynamic equivalent targeting the same region; if no equivalent exists
// it's dropped from the warmup (cooldown / standalone mobility picks it up).
//
// Both generateWarmup (structured warmup render) and buildMesocycle
// (mergeDirectivesForSession → warmup_elements) consume protocol warmup_focus,
// so the map lives here to keep the two paths from drifting apart.

// Substitution map: protocol-emitted id → dynamic warmup id already in the
// warmup catalog. `null` means "drop entirely from warmup".
export const STATIC_STRETCH_SUBSTITUTIONS: Record<string, string | null> = {
  couch_stretch: 'hip_airplane', // hip-flexor lengthening → dynamic hip ER/IR
  couch_stretch_60s: 'hip_airplane',
  couch_stretch_60s_per_side: 'hip_airplane',
  couch_stretch_daily: 'hip_airplane',
  hip_flexor_stretch: 'hip_airplane',
  hip_flexor_stretch_kneeling: 'hip_airplane',
  hip_flexor_kneeling_stretch: 'hip_airplane',
  hip_flexor_pnf_stretch: 'hip_airplane',
  supine_hip_flexor_stretch: 'hip_airplane',
  supported_hip_flexor_stretch: 'hip_airplane',
  soleus_stretch: 'ankle_dorsiflexion_mobility', // static calf → dynamic ankle DF
  '90_90_hip_stretch': '90_90_hip', // re-label as mobility, not "stretch"
}

/**
 * Resolve a warmup id through the static-stretch substitution map.
 * Returns the dynamic substitute id, `null` to drop the element entirely,
 * or the original id unchanged when it isn't a flagged static stretch.
 */
export function substituteStaticStretch(id: string): string | null {
  if (id in STATIC_STRETCH_SUBSTITUTIONS) return STATIC_STRETCH_SUBSTITUTIONS[id]
  return id
}
