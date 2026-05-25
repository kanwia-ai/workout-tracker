import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Supabase client (graceful when env is missing) ────────────────────────
// When VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are absent (local-only
// build, fresh CI without secrets, Replit deploy where someone forgot to
// paste them) we still need `supabase.*` accesses to type-check across the
// existing call sites (useAuth, profileRepo, generate, persistence, etc.)
// without forcing every caller to add `?? noop` chains.
//
// Strategy:
//   - Export `isSupabaseConfigured` so callers that want to short-circuit
//     (e.g. don't even render the magic-link form) can ask.
//   - Export `supabase` as a real client when configured, OR a "rejecting
//     stub" client when not — same SupabaseClient TS shape, but every method
//     throws a clear error instead of silently hitting a placeholder URL.
//     The OLD behaviour was to point at `placeholder.supabase.co`, which
//     actually fired network requests (and confusingly *worked* enough to
//     blow up only deep inside the response parser).
//
// This satisfies the "degrade gracefully when env missing" requirement
// without forcing a `SupabaseClient | null` propagation through the
// codebase (which would touch hooks/useAuth.ts — owned by another agent).
// Net effect: the same type contract, but missing env produces immediate,
// debuggable errors instead of mysterious fetch failures.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured: boolean =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase credentials not configured. Running in offline-only mode. ' +
      'Any supabase.* call will throw — gate cloud features on `isSupabaseConfigured`.',
  )
}

/**
 * Build a stub SupabaseClient-shaped object. Every method we touch from the
 * app throws a descriptive error. We only need to satisfy the surface area
 * the codebase actually uses — `.auth.*`, `.from(...)`, `.functions.invoke`,
 * `.storage` — not the full SupabaseClient API.
 *
 * The thrown error is loud on purpose: if it ever reaches the user, the
 * console message tells you exactly what's wrong (missing env) and how to
 * gate it (`isSupabaseConfigured`). No more "Failed to fetch" mysteries.
 */
function createStubClient(): SupabaseClient {
  const reject = (op: string): never => {
    throw new Error(
      `Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). ` +
        `Refusing to call ${op}. Gate this call on isSupabaseConfigured.`,
    )
  }

  // We type the stub as `unknown` then cast to SupabaseClient — the surface
  // area we hit is small and the cast keeps callers type-checking without
  // making them deal with `SupabaseClient | null`.
  const stub = {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithOtp: () => reject('auth.signInWithOtp'),
      signOut: () =>
        Promise.resolve({ error: null }),
      getUser: () =>
        Promise.resolve({ data: { user: null }, error: null }),
    },
    from: (table: string) => {
      // Build a chainable thenable so `await supabase.from('x').select()`
      // resolves to a no-data envelope rather than throwing — Dexie is the
      // source of truth in offline mode, the cloud query should be a no-op.
      // Mutating ops (insert/update/delete/upsert) DO throw, since a silent
      // success would be data loss masquerading as a save.
      const noDataEnvelope = Promise.resolve({ data: null, error: null })
      const writeReject = () =>
        Promise.resolve({
          data: null,
          error: new Error(
            `Supabase not configured: refusing write to '${table}'. Gate on isSupabaseConfigured.`,
          ),
        })
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        single: () => noDataEnvelope,
        maybeSingle: () => noDataEnvelope,
        insert: writeReject,
        update: writeReject,
        delete: writeReject,
        upsert: writeReject,
        then: (resolve: (v: { data: null; error: null }) => void) =>
          noDataEnvelope.then(resolve),
      }
      return chain
    },
    functions: {
      invoke: () => reject('functions.invoke'),
    },
    storage: {
      from: () => ({
        upload: () => reject('storage.from(...).upload'),
        download: () => reject('storage.from(...).download'),
      }),
    },
  }
  return stub as unknown as SupabaseClient
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        storageKey: 'workout-tracker-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createStubClient()
