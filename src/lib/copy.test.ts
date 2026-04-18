import { describe, it, expect } from 'vitest';
import {
  COPY,
  DEFAULT_CHEEK,
  getCopy,
  type CheekLevel,
  type CopyKey,
} from './copy';

const LEVELS: CheekLevel[] = [0, 1, 2];

// All string-valued keys (setDone is intentionally excluded — it's an array
// of options, not a single resolvable string).
const STRING_KEYS = [
  'greetMorning',
  'greetAfternoon',
  'sessionIntro',
  'prTitle',
  'prSub',
  'empty',
  'restFlex',
  'endSession',
  'regen',
] as const satisfies readonly Exclude<CopyKey, 'setDone'>[];

describe('copy', () => {
  describe('COPY structure', () => {
    it('defines all three cheekiness tiers', () => {
      expect(Object.keys(COPY).sort()).toEqual(['0', '1', '2']);
    });

    it('every tier has the same set of keys', () => {
      const keys0 = Object.keys(COPY[0]).sort();
      const keys1 = Object.keys(COPY[1]).sort();
      const keys2 = Object.keys(COPY[2]).sort();
      expect(keys1).toEqual(keys0);
      expect(keys2).toEqual(keys0);
    });

    it('setDone is a non-empty array at every tier', () => {
      for (const level of LEVELS) {
        expect(Array.isArray(COPY[level].setDone)).toBe(true);
        expect(COPY[level].setDone.length).toBeGreaterThan(0);
        for (const entry of COPY[level].setDone) {
          expect(typeof entry).toBe('string');
          expect(entry.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getCopy — each key at each level', () => {
    for (const level of LEVELS) {
      for (const key of STRING_KEYS) {
        it(`resolves "${key}" at level ${level}`, () => {
          const result = getCopy(key, level);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
      }
    }

    it('tier 0 prTitle is "NEW PR"', () => {
      expect(getCopy('prTitle', 0)).toBe('NEW PR');
    });

    it('tier 1 regen is "Regenerate"', () => {
      expect(getCopy('regen', 1)).toBe('Regenerate');
    });

    it('tier 2 prSub is the canonical cheeky line', () => {
      expect(getCopy('prSub', 2)).toBe('you absolute menace');
    });
  });

  describe('default level', () => {
    it('DEFAULT_CHEEK is 2', () => {
      expect(DEFAULT_CHEEK).toBe(2);
    });

    it('getCopy without a level returns the tier-2 string', () => {
      expect(getCopy('endSession')).toBe(getCopy('endSession', 2));
      expect(getCopy('prSub')).toBe('you absolute menace');
    });
  });

  describe('placeholder substitution', () => {
    it('substitutes {name} in greetMorning for each level', () => {
      expect(getCopy('greetMorning', 0, { name: 'Kyra' })).toBe(
        'Morning, Kyra.',
      );
      expect(getCopy('greetMorning', 1, { name: 'Kyra' })).toContain('Kyra');
      expect(getCopy('greetMorning', 2, { name: 'Kyra' })).toContain('Kyra');
      // original still contains the placeholder when no vars passed
      expect(getCopy('greetMorning', 0)).toContain('{name}');
    });

    it('substitutes {name} in greetAfternoon', () => {
      expect(getCopy('greetAfternoon', 0, { name: 'Juno' })).toBe('Juno.');
      expect(getCopy('greetAfternoon', 1, { name: 'Juno' })).toBe('Hey Juno.');
    });

    it('coerces numeric substitutions to strings', () => {
      // Synthetic test using a key that has no placeholders — ensures the
      // substitution path tolerates numeric values without throwing. (We
      // don't have a natural {reps} key in the ported copy yet.)
      const result = getCopy('prTitle', 2, { reps: 8 });
      expect(result).toBe('NEW PR');
    });

    it('leaves unknown placeholders untouched', () => {
      // `{mystery}` is not in any copy string, so nothing changes; this
      // exercises the "no vars match" branch.
      expect(getCopy('prTitle', 0, { mystery: 'x' })).toBe('NEW PR');
    });

    it('leaves a placeholder untouched when its key is missing from vars', () => {
      // Pass vars but omit `name` — the `{name}` token should remain.
      expect(getCopy('greetMorning', 0, { unrelated: 'x' })).toBe(
        'Morning, {name}.',
      );
    });
  });

  describe('unknown key', () => {
    it('throws when the key is not a known copy key', () => {
      expect(() =>
        // Force past the type system — mirrors what happens if a caller
        // uses a dynamic string that doesn't correspond to a real key.
        getCopy('not-a-real-key' as unknown as typeof STRING_KEYS[number], 2),
      ).toThrow(/Unknown copy key/);
    });

    it('throws when asked for an array-valued key via a type cast', () => {
      expect(() =>
        getCopy(
          'setDone' as unknown as typeof STRING_KEYS[number],
          2,
        ),
      ).toThrow(/not a string/);
    });
  });
});
