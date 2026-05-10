import { describe, it, expect } from 'vitest'
import { extractYouTubeVideoId, youtubeSearchUrl } from './youtube'

describe('extractYouTubeVideoId', () => {
  it('parses youtu.be short URLs', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('parses youtube.com/shorts URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/abc123XYZ_-')).toBe(
      'abc123XYZ_-',
    )
  })

  it('parses youtube.com/watch?v= URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/12345')).toBeNull()
  })

  it('returns null for nullish input', () => {
    expect(extractYouTubeVideoId(null)).toBeNull()
    expect(extractYouTubeVideoId(undefined)).toBeNull()
    expect(extractYouTubeVideoId('')).toBeNull()
  })
})

describe('youtubeSearchUrl', () => {
  it('builds a plain search URL with " form" appended', () => {
    const url = youtubeSearchUrl('Goblet Squat')
    expect(url).toBe('https://www.youtube.com/results?search_query=Goblet%20Squat%20form')
  })

  it('does not include the sp= shorts filter', () => {
    const url = youtubeSearchUrl('Bench Press')
    expect(url).not.toContain('sp=')
  })

  it('does not append the word "shorts" to the query', () => {
    const url = youtubeSearchUrl('Bench Press')
    expect(url.toLowerCase()).not.toContain('shorts')
  })

  it('encodes special characters in the query', () => {
    const url = youtubeSearchUrl('Pull-Up & Chin-Up')
    expect(url).toContain('Pull-Up%20%26%20Chin-Up%20form')
  })
})
