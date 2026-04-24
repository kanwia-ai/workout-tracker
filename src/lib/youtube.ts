// ─── YouTube URL helpers ─────────────────────────────────────────────────
// Extracts the 11-character video ID from a variety of YouTube URL forms:
//   https://www.youtube.com/shorts/ABCDEFGHIJK
//   https://youtube.com/shorts/ABCDEFGHIJK
//   https://youtu.be/ABCDEFGHIJK
//   https://www.youtube.com/watch?v=ABCDEFGHIJK
// Returns `null` for any URL we can't parse confidently. Keeping this tight
// so we never end up embedding an empty iframe that tries to load youtube.com's
// homepage in a fullscreen player.

export function extractYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    // youtu.be/<id>
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return isValidId(id) ? id : null
    }

    // youtube.com/shorts/<id> or youtube.com/embed/<id>
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const m = u.pathname.match(/^\/(?:shorts|embed|v)\/([^/?#]+)/)
      if (m && isValidId(m[1])) return m[1]
      const v = u.searchParams.get('v')
      if (v && isValidId(v)) return v
    }

    return null
  } catch {
    return null
  }
}

function isValidId(id: string): boolean {
  // YouTube IDs are 11 chars, [A-Za-z0-9_-]. Be permissive on length in case
  // of future format changes, but reject anything obviously wrong.
  return /^[A-Za-z0-9_-]{6,20}$/.test(id)
}

// ─── Search shortcuts ───────────────────────────────────────────────────
// Opens YouTube search biased toward Shorts-format clips (appends "shorts"
// to the query) and sorted by view count (sp=CAMSAhAB → order:viewCount,
// type:video). Deep-links into youtube.com so iOS/Android hands off to the
// native YouTube app when installed.
export function youtubeShortsSearchUrl(query: string): string {
  const q = encodeURIComponent(`${query} form shorts`)
  return `https://www.youtube.com/results?search_query=${q}&sp=CAMSAhAB`
}
