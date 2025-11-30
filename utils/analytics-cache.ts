import { db } from "@/lib/db";
import { subDays } from "date-fns";
import type { JsonValue } from "@/lib/db.d";

export type TimeRange = "1week" | "1month" | "3months" | "6months";

export type CacheStatus = "pending" | "complete";

export interface CachedAnalyticsData {
  "1week": unknown;
  "1month": unknown;
  "3months": unknown;
}

/**
 * Generate cache key for analytics data (owner/repo only, no timeRange)
 */
export function generateCacheKey(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}

/**
 * Get cached analytics data for a specific time range if it exists and is not expired
 */
export async function getCachedAnalytics<T>(
  owner: string,
  repo: string,
  timeRange: TimeRange
): Promise<T | null> {
  const cacheKey = generateCacheKey(owner, repo);

  const cached = await db
    .selectFrom("githubAnalyticsCache")
    .selectAll()
    .where("cacheKey", "=", cacheKey)
    .where("expiresAt", ">", new Date())
    .where("status", "=", "complete")
    .executeTakeFirst();

  if (!cached) {
    return null;
  }

  const data = cached.data as unknown as CachedAnalyticsData;
  // Only return if timeRange is one of the supported ranges
  if (
    timeRange === "1week" ||
    timeRange === "1month" ||
    timeRange === "3months"
  ) {
    return (data[timeRange] as T) || null;
  }
  return null;
}

/**
 * Get cache entry (for checking status)
 */
export async function getCacheEntry(owner: string, repo: string) {
  const cacheKey = generateCacheKey(owner, repo);

  return await db
    .selectFrom("githubAnalyticsCache")
    .selectAll()
    .where("cacheKey", "=", cacheKey)
    .where("expiresAt", ">", new Date())
    .executeTakeFirst();
}

/**
 * Set cached analytics data with all time ranges
 */
export async function setCachedAnalytics(
  owner: string,
  repo: string,
  data: CachedAnalyticsData,
  status: CacheStatus = "complete"
): Promise<void> {
  const cacheKey = generateCacheKey(owner, repo);
  const now = new Date();
  const expiresAt = subDays(now, -14); // 14 days (2 weeks) from now

  await db
    .insertInto("githubAnalyticsCache")
    .values({
      cacheKey,
      owner,
      repo,
      data: JSON.parse(JSON.stringify(data)) as JsonValue,
      status,
      cachedAt: now,
      expiresAt,
    })
    .onConflict((oc) =>
      oc.column("cacheKey").doUpdateSet({
        data: JSON.parse(JSON.stringify(data)) as JsonValue,
        status,
        cachedAt: now,
        expiresAt,
        updatedAt: now,
      })
    )
    .execute();
}

/**
 * Update cache status
 */
export async function updateCacheStatus(
  owner: string,
  repo: string,
  status: CacheStatus
): Promise<void> {
  const cacheKey = generateCacheKey(owner, repo);

  await db
    .updateTable("githubAnalyticsCache")
    .set({
      status,
      updatedAt: new Date(),
    })
    .where("cacheKey", "=", cacheKey)
    .execute();
}

/**
 * Delete expired cache entries (cleanup utility)
 */
export async function deleteExpiredCache(): Promise<number> {
  const result = await db
    .deleteFrom("githubAnalyticsCache")
    .where("expiresAt", "<=", new Date())
    .execute();

  return result.length;
}
