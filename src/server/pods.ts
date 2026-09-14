import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { pods } from '@/db/schema'
import type { Db } from '@/db/types'

/**
 * Finds a Pod by exact (trimmed) name, creating it if it doesn't exist yet
 * — the user never manages pods directly, they're created implicitly by
 * typing a new name into the (still free-text, still typeable) pod field.
 * `onConflictDoNothing` + re-select makes this safe even if called
 * concurrently for the same name. See roadmap issue #120.
 */
export async function findOrCreatePod(
  db: Db,
  name: string,
): Promise<{ id: number; name: string }> {
  const trimmed = name.trim()
  await db.insert(pods).values({ name: trimmed }).onConflictDoNothing()
  const [pod] = await db.select().from(pods).where(eq(pods.name, trimmed))
  if (!pod) {
    throw new Error(`Failed to find or create pod "${trimmed}"`)
  }
  return pod
}

/** Every pod name, for the pod field's autocomplete suggestions. */
export const listPods = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const rows = await db
      .select({ name: pods.name })
      .from(pods)
      .orderBy(pods.name)
    return rows.map((row) => row.name)
  },
)
