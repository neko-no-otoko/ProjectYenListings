import { db } from "../../db";
import { sql } from "drizzle-orm";

const heldLocks = new Set<string>();

export async function isLockHeldInDb(jobName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_locks 
      WHERE locktype = 'advisory' 
      AND objid = hashtext(${jobName})
      AND granted = true
    ) as held
  `);
  return result.rows[0]?.held === true;
}

export async function tryJobLock(jobName: string): Promise<boolean> {
  const alreadyHeld = await isLockHeldInDb(jobName);
  if (alreadyHeld) {
    console.log(`[JobLock] Lock ${jobName} already held`);
    return false;
  }

  const result = await db.execute(sql`
    SELECT pg_try_advisory_lock(hashtext(${jobName})) as acquired
  `);
  
  const acquired = result.rows[0]?.acquired === true;
  
  if (acquired) {
    heldLocks.add(jobName);
    console.log(`[JobLock] Acquired lock for ${jobName}`);
  } else {
    console.log(`[JobLock] Failed to acquire lock for ${jobName}`);
  }
  
  return acquired;
}

export async function releaseJobLock(jobName: string): Promise<void> {
  try {
    await db.execute(sql`
      SELECT pg_advisory_unlock(hashtext(${jobName}))
    `);
    console.log(`[JobLock] Released lock for ${jobName}`);
  } catch (error) {
    console.error(`[JobLock] Error releasing lock for ${jobName}:`, error);
  } finally {
    heldLocks.delete(jobName);
  }
}

export function isJobLockedLocally(jobName: string): boolean {
  return heldLocks.has(jobName);
}

export async function withJobLock<T>(
  jobName: string,
  fn: () => Promise<T>
): Promise<{ executed: boolean; result?: T; skipped?: boolean }> {
  const acquired = await tryJobLock(jobName);
  
  if (!acquired) {
    return { executed: false, skipped: true };
  }
  
  try {
    const result = await fn();
    return { executed: true, result };
  } finally {
    await releaseJobLock(jobName);
  }
}
