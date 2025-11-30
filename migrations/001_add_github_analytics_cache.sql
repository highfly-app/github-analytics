-- Create githubAnalyticsCache table
CREATE TABLE IF NOT EXISTS "githubAnalyticsCache" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cacheKey" TEXT NOT NULL UNIQUE, -- Format: "owner/repo"
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "data" JSONB NOT NULL, -- Full analytics response with all time ranges: { "1week": {...}, "1month": {...}, "3months": {...} }
    "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'complete'
    "cachedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "expiresAt" TIMESTAMPTZ NOT NULL, -- cachedAt + 7 days
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idxGithubAnalyticsCacheKey" ON "githubAnalyticsCache"("cacheKey");
CREATE INDEX "idxGithubAnalyticsCacheExpires" ON "githubAnalyticsCache"("expiresAt");
CREATE INDEX "idxGithubAnalyticsCacheStatus" ON "githubAnalyticsCache"("status");

