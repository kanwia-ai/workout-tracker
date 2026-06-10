import { describe, expect, it } from 'vitest'
import {
  loadKnowledgeBase,
  loadKnowledgeBaseErrors,
  parseFrontmatterYAML,
  splitFrontmatter,
  extractEntrySections,
} from './loader'
import { expandInjuryToken } from './retrieval'
import { BodyPart } from '../../types/profile'

describe('splitFrontmatter', () => {
  it('returns null when the file has no frontmatter', () => {
    expect(splitFrontmatter('plain markdown\n# title')).toBeNull()
  })

  it('extracts the YAML block + remaining body', () => {
    const raw = '---\nid: foo\n---\n\n# Body\n\ncontent'
    const out = splitFrontmatter(raw)
    expect(out?.frontmatter).toBe('id: foo')
    expect(out?.body).toBe('# Body\n\ncontent')
  })

  it('returns null when the closing --- is missing', () => {
    expect(splitFrontmatter('---\nid: foo\n# never closed')).toBeNull()
  })
})

describe('parseFrontmatterYAML', () => {
  it('parses scalar string values', () => {
    const out = parseFrontmatterYAML('id: my-entry\ntitle: My Entry')
    expect(out.id).toBe('my-entry')
    expect(out.title).toBe('My Entry')
  })

  it('parses quoted strings (preserving inner whitespace)', () => {
    const out = parseFrontmatterYAML('title: "Rep ranges for hypertrophy"')
    expect(out.title).toBe('Rep ranges for hypertrophy')
  })

  it('parses inline arrays', () => {
    const out = parseFrontmatterYAML('tags: [a, b, c]')
    expect(out.tags).toEqual(['a', 'b', 'c'])
  })

  it('parses empty inline arrays', () => {
    const out = parseFrontmatterYAML('injuries: []')
    expect(out.injuries).toEqual([])
  })

  it('parses block sequences', () => {
    const out = parseFrontmatterYAML(
      'citations:\n  - one\n  - two',
    )
    expect(out.citations).toEqual(['one', 'two'])
  })

  it('parses nested mappings (applicability)', () => {
    const yaml = [
      'applicability:',
      '  goals: [build_muscle, fat_loss]',
      '  training_age: any',
      '  sex: any',
      '  injuries: []',
    ].join('\n')
    const out = parseFrontmatterYAML(yaml)
    expect(out.applicability).toEqual({
      goals: ['build_muscle', 'fat_loss'],
      training_age: 'any',
      sex: 'any',
      injuries: [],
    })
  })
})

describe('extractEntrySections', () => {
  it('pulls Claim + Nuance sections', () => {
    const body = [
      '# Title',
      '',
      '## Claim',
      'Some claim text.',
      '',
      '## Nuance',
      'The caveat.',
      '',
      '## Application in this app',
      'Use this way.',
    ].join('\n')
    const out = extractEntrySections(body)
    expect(out.claim).toContain('Some claim text.')
    expect(out.nuance).toContain('The caveat.')
    expect(out.application).toContain('Use this way.')
  })

  it('returns null fields when a section is missing', () => {
    const out = extractEntrySections('# Title\n\n## Claim\nOnly claim here.')
    expect(out.claim).not.toBeNull()
    expect(out.nuance).toBeNull()
    expect(out.application).toBeNull()
  })
})

describe('loadKnowledgeBase (glob-backed)', () => {
  it('returns at least one entry', () => {
    const entries = loadKnowledgeBase()
    // The KB currently has 107 entries. We assert a non-trivial floor so a
    // glob regression (mistyped path, missing eager flag, etc.) trips this.
    expect(entries.length).toBeGreaterThanOrEqual(50)
  })

  it('parses every entry without errors', () => {
    const errors = loadKnowledgeBaseErrors()
    if (errors.length > 0) {
      // Print all errors so a CI failure surfaces every malformed entry at
      // once instead of forcing a re-run after each fix.
      console.error('KB load errors:', errors)
    }
    expect(errors).toEqual([])
  })

  it('every entry has a valid id, type, and domain', () => {
    const entries = loadKnowledgeBase()
    for (const entry of entries) {
      expect(entry.frontmatter.id, `${entry.filePath} id`).toBeTruthy()
      expect(entry.frontmatter.type, `${entry.filePath} type`).toBeTruthy()
      expect(entry.frontmatter.domain, `${entry.filePath} domain`).toBeTruthy()
      expect(entry.frontmatter.applicability, `${entry.filePath} applicability`).toBeTruthy()
    }
  })

  it('produces unique ids across the whole KB', () => {
    const entries = loadKnowledgeBase()
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const e of entries) {
      if (seen.has(e.frontmatter.id)) dupes.push(e.frontmatter.id)
      seen.add(e.frontmatter.id)
    }
    expect(dupes).toEqual([])
  })

  it('every applicability.injuries token resolves to at least one BodyPart enum value', () => {
    // Retrieval matches entry injury tokens against profile.injuries[].part
    // (the sided BodyPart enum). A token that expands to nothing means the
    // entry can never match any user — injury-token drift made the most
    // owner-relevant entries permanently unreachable.
    const bodyParts = new Set<string>(BodyPart.options)
    const unresolvable: string[] = []
    for (const e of loadKnowledgeBase()) {
      for (const token of e.frontmatter.applicability.injuries) {
        const expanded = expandInjuryToken(token)
        if (expanded.length === 0 || !expanded.every((p) => bodyParts.has(p))) {
          unresolvable.push(`${e.frontmatter.id}: '${token}' -> [${expanded.join(', ')}]`)
        }
      }
    }
    expect(unresolvable).toEqual([])
  })

  it('every related/contradicts cross-reference resolves to a live entry id', () => {
    // The cross-reference graph is only useful if every edge points at a real
    // entry. Phantom ids (e.g. 'myth-*' refs that were never written) silently
    // break "see also" traversal and the contradicts guardrails.
    const entries = loadKnowledgeBase()
    const ids = new Set(entries.map((e) => e.frontmatter.id))
    const phantoms: string[] = []
    for (const e of entries) {
      for (const ref of [...e.frontmatter.related, ...e.frontmatter.contradicts]) {
        if (!ids.has(ref)) phantoms.push(`${e.frontmatter.id} -> ${ref}`)
      }
    }
    expect(phantoms).toEqual([])
  })
})
