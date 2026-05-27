// Knowledge-base loader. Lazy-loads every `docs/knowledge-base/domains/**/*.md`
// file as raw text via Vite's `import.meta.glob`, parses YAML frontmatter +
// markdown body, and exposes a typed list of entries to the retrieval layer.
//
// Why glob (not a build-time codegen step):
//   - Adding a new KB entry is a one-file change with no codegen run.
//   - Vite handles the bundling — the raw markdown gets stamped into the JS
//     output at build time, so production has zero filesystem access.
//   - The `eager: true` mode means everything is loaded synchronously at
//     module-import time, matching how the rest of the app reads constants.
//
// Frontmatter parser:
//   - Hand-rolled minimal YAML reader (the README only uses simple key:value,
//     `- item` arrays, and `[a, b, c]` inline arrays — no nested maps, no
//     anchors, no multiline scalars). Adding `gray-matter` was rejected at
//     spec time to avoid a new dependency for ~100 entries of static data.
//   - Returns `unknown` and lets KBEntryFrontmatterSchema validate. Any field
//     drift surfaces as a Zod parse error with the file path attached.
import {
  type KBEntry,
  type KBEntryFrontmatter,
  KBEntryFrontmatterSchema,
  type KBEntrySections,
} from './types'

// ─── Frontmatter splitter ──────────────────────────────────────────────────
// Splits a markdown string into (frontmatter, body). Returns null if the file
// doesn't start with `---\n` (the spec says every entry MUST have frontmatter
// — anything else is malformed and surfaces a load-time error).
export function splitFrontmatter(
  raw: string,
): { frontmatter: string; body: string } | null {
  // Tolerate a leading BOM or whitespace in case an editor added one.
  const trimmed = raw.replace(/^﻿/, '')
  if (!trimmed.startsWith('---')) return null

  // Find the closing `---` on its own line. The opening is at index 0..3
  // (followed by a newline); the closing is the next line that is `---`
  // exactly. We search starting at index 4 (past the first `---\n`).
  const lines = trimmed.split('\n')
  if (lines[0].trim() !== '---') return null
  let closeIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closeIdx = i
      break
    }
  }
  if (closeIdx === -1) return null

  const frontmatter = lines.slice(1, closeIdx).join('\n')
  const body = lines.slice(closeIdx + 1).join('\n').replace(/^\n+/, '')
  return { frontmatter, body }
}

// ─── Minimal YAML parser ───────────────────────────────────────────────────
// Handles the exact subset of YAML used by KB entries:
//
//   key: value                            -> scalar string
//   key: [a, b, c]                        -> inline string array
//   key: 'quoted value'                   -> quoted scalar (single)
//   key: "quoted value"                   -> quoted scalar (double)
//   key:                                  -> opens a block, next lines start
//     subkey: value                          with two-space indent (one nest
//   key:                                     level — applicability is the
//     - item                                 only place we use nested keys)
//     - item                              -> block sequence (`tags:` etc.)
//
// We intentionally don't support: anchors, references, multiline strings,
// flow maps, types other than string. The README schema doesn't need them.
// If a future entry introduces unsupported syntax, the Zod parse downstream
// will fail loudly with the file path.
function stripQuotes(s: string): string {
  const t = s.trim()
  if (t.length < 2) return t
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function parseInlineArray(s: string): string[] {
  // s is like `[a, b, "c, with comma"]` — for our KB, commas inside values
  // are NOT used in inline arrays, so a simple split is sufficient. Quoted
  // values are stripped after split.
  const inner = s.slice(1, -1).trim()
  if (inner.length === 0) return []
  return inner.split(',').map((p) => stripQuotes(p.trim())).filter((p) => p.length > 0)
}

function parseScalarValue(rawValue: string): string | string[] {
  const v = rawValue.trim()
  if (v.startsWith('[') && v.endsWith(']')) return parseInlineArray(v)
  return stripQuotes(v)
}

interface YAMLBlock {
  [key: string]: string | string[] | YAMLBlock
}

/**
 * Parse the KB-subset of YAML. Pure; throws a descriptive error on syntax
 * we don't support so the loader can surface "malformed KB entry: X.md".
 */
export function parseFrontmatterYAML(raw: string): YAMLBlock {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'))

  const root: YAMLBlock = {}
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // Top-level entry: must start with no indent.
    if (line.startsWith('  ') || line.startsWith('\t')) {
      throw new Error(`unexpected indent at line ${i}: ${line}`)
    }
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) {
      throw new Error(`missing colon at line ${i}: ${line}`)
    }
    const key = line.slice(0, colonIdx).trim()
    const after = line.slice(colonIdx + 1)
    i++

    // If the value is on the same line, capture it directly.
    if (after.trim().length > 0) {
      root[key] = parseScalarValue(after)
      continue
    }

    // Otherwise, the value is a block — peek the next indented lines.
    const blockLines: string[] = []
    while (i < lines.length && (lines[i].startsWith('  ') || lines[i].startsWith('\t'))) {
      blockLines.push(lines[i])
      i++
    }
    if (blockLines.length === 0) {
      // Empty block → empty value
      root[key] = ''
      continue
    }

    // Sequence: every block line starts with `-`
    const isSeq = blockLines.every((l) => l.trim().startsWith('-'))
    if (isSeq) {
      root[key] = blockLines.map((l) => stripQuotes(l.trim().replace(/^-\s*/, '')))
      continue
    }

    // Mapping: parse each sub-line as `subkey: value`. We only support a
    // single nesting level — applicability is the only place this matters.
    const sub: YAMLBlock = {}
    for (const sline of blockLines) {
      const trimmedSub = sline.replace(/^\s{2}|^\t/, '')
      const subColon = trimmedSub.indexOf(':')
      if (subColon === -1) {
        throw new Error(`malformed sub-line under ${key}: ${sline}`)
      }
      const subKey = trimmedSub.slice(0, subColon).trim()
      const subAfter = trimmedSub.slice(subColon + 1)
      if (subAfter.trim().length > 0) {
        sub[subKey] = parseScalarValue(subAfter)
      } else {
        // For now we don't support sub-sub blocks; treat as empty string. No
        // KB entry today nests beyond one level.
        sub[subKey] = ''
      }
    }
    root[key] = sub
  }
  return root
}

// ─── Body section extractor ────────────────────────────────────────────────
// Pull the short "Claim" + "Nuance" + "Application in this app" sections out
// of the markdown body so the prompt builder can include them verbatim
// without dragging in the citation list and contradicts-block.
//
// Sections are identified by `## ` headers. A section ends at the next
// `## ` header (any level deeper is kept inside the current section).
export function extractEntrySections(body: string): KBEntrySections {
  const lines = body.split('\n')
  const sections: Record<string, string[]> = {}
  let current: string | null = null
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (m) {
      current = m[1].toLowerCase()
      sections[current] = []
      continue
    }
    if (current) {
      sections[current].push(line)
    }
  }
  const get = (name: string): string | null => {
    const v = sections[name]
    if (!v) return null
    const joined = v.join('\n').trim()
    return joined.length > 0 ? joined : null
  }
  return {
    claim:
      get('claim') ||
      get('the claim') ||
      get('the myth (verbatim)') ||
      get('the heuristic') ||
      null,
    nuance: get('nuance') || get('the corrected understanding') || null,
    application: get('application in this app') || null,
  }
}

// ─── Glob-backed registry ──────────────────────────────────────────────────
// Vite's `import.meta.glob` with `eager: true` + `query: '?raw'` returns an
// object keyed by file path → raw string. Paths are relative to THIS file,
// so we climb three directories to reach the repo root, then descend into
// docs/knowledge-base/.
//
// The `import: 'default'` option unwraps the `{ default: string }` ESM
// wrapper Vite produces for `?raw` imports.
type RawGlob = Record<string, string>

const rawEntries: RawGlob = import.meta.glob(
  '../../../docs/knowledge-base/domains/**/*.md',
  { eager: true, query: '?raw', import: 'default' },
) as RawGlob

// ─── Public API ────────────────────────────────────────────────────────────
// Lazy-once parse: the first caller pays the cost (~100 small files), all
// subsequent calls hit the cached array. Exported as a function (not a
// const) so tests can import the raw `parseFrontmatterYAML` separately.
let cached: KBEntry[] | null = null
let cachedErrors: KBLoadError[] | null = null

export interface KBLoadError {
  filePath: string
  message: string
}

function parseOne(filePath: string, raw: string): KBEntry | KBLoadError {
  try {
    const split = splitFrontmatter(raw)
    if (!split) {
      return { filePath, message: 'no frontmatter (missing leading ---)' }
    }
    const parsed = parseFrontmatterYAML(split.frontmatter)

    // The YAML parser produces `string | string[] | YAMLBlock` for nested
    // values; coerce the applicability block to match the Zod schema's
    // expected shape. Goals + injuries are arrays; training_age and sex are
    // strings (or arrays).
    const result = KBEntryFrontmatterSchema.safeParse(parsed)
    if (!result.success) {
      return {
        filePath,
        message: `frontmatter validation failed: ${result.error.message}`,
      }
    }
    return {
      frontmatter: result.data,
      body: split.body,
      filePath,
    }
  } catch (err) {
    return {
      filePath,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

// Filenames that the glob picks up but are NOT KB entries — domain READMEs,
// drafts, scratch notes. Filtered out before parsing.
const NON_ENTRY_FILES = new Set(['README.md', 'readme.md'])

function isEntryFile(filePath: string): boolean {
  const basename = filePath.split('/').pop() ?? filePath
  if (NON_ENTRY_FILES.has(basename)) return false
  return basename.endsWith('.md')
}

function loadAll(): { entries: KBEntry[]; errors: KBLoadError[] } {
  if (cached !== null && cachedErrors !== null) {
    return { entries: cached, errors: cachedErrors }
  }
  const entries: KBEntry[] = []
  const errors: KBLoadError[] = []
  for (const [filePath, raw] of Object.entries(rawEntries)) {
    if (!isEntryFile(filePath)) continue
    const out = parseOne(filePath, raw)
    if ('frontmatter' in out) entries.push(out)
    else errors.push(out)
  }
  cached = entries
  cachedErrors = errors
  return { entries, errors }
}

/** All successfully-parsed KB entries. */
export function loadKnowledgeBase(): KBEntry[] {
  return loadAll().entries
}

/** Entries that failed to parse (frontmatter missing, validation failed, etc.). */
export function loadKnowledgeBaseErrors(): KBLoadError[] {
  return loadAll().errors
}

/** Lookup a single entry by id. O(n); n ≤ 200 in practice. */
export function getEntryById(id: string): KBEntry | null {
  return loadKnowledgeBase().find((e) => e.frontmatter.id === id) ?? null
}

/**
 * Reset the cached registry. Test-only — production code never needs this.
 * Marked with an underscore prefix as a convention for "if you call this in
 * production, you're doing something wrong."
 */
export function _resetKnowledgeBaseCache(): void {
  cached = null
  cachedErrors = null
}

// Re-export for callers that want to walk the same parser without the
// glob-backed cache (test harnesses, ad-hoc tooling).
export type { KBEntry, KBEntryFrontmatter }
