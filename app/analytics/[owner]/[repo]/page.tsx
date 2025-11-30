"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { swrKeys } from "@/utils/swr-keys";
import { RepositoryHeader } from "@/components/analytics/repository-header";
import { IssueLifecycleSection } from "@/components/analytics/issue-lifecycle-section";
import { ReviewerInsightsSection } from "@/components/analytics/reviewer-insights-section";
import { ContributorFrictionSection } from "@/components/analytics/contributor-friction-section";
import { BacklogHealthSection } from "@/components/analytics/backlog-health-section";
import type { AnalyticsResponse } from "@/app/api/analytics/github/route";
import type { TimeRange } from "@/utils/analytics-cache";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function AnalyticsDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const timeRangeParam = (searchParams.get("timeRange") ||
    "1week") as TimeRange; // Default to 1 week

  const [timeRange, setTimeRange] = useState<TimeRange>(timeRangeParam);

  // Update timeRange when URL param changes
  useEffect(() => {
    const param = (searchParams.get("timeRange") || "1week") as TimeRange; // Default to 1 week
    setTimeRange(param);
  }, [searchParams]);

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("timeRange", value);
    router.push(`/analytics/${owner}/${repo}?${params.toString()}`);
  };

  const { data, error, isLoading } = useSWR<AnalyticsResponse>(
    swrKeys.analytics(owner, repo, timeRange),
    async (url: string) => {
      const res = await fetch(url);
      if (res.status === 202) {
        const json = await res.json();
        throw new Error(json.error || "Analytics are being generated");
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to fetch analytics");
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
    }
  );

  // Check for errors first (except pending/generating errors)
  const isPendingError =
    error && error.message.includes("Analytics are being generated");
  const isOtherError = error && !isPendingError;

  if (isOtherError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load analytics data"}
            </p>
            <Link
              href="/analytics"
              className="text-primary hover:underline mt-4 inline-block"
            >
              Try another repository
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show "Generating Analytics" UI for both loading and pending states
  if (!data || isLoading || isPendingError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Generating Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Analytics are being generated for this repository. This may take a
              few minutes...
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Processing</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <RepositoryHeader
          fullName={data.repository.fullName}
          stars={data.repository.stars}
          forks={data.repository.forks}
          url={data.repository.url}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />

        <div className="space-y-8">
          <IssueLifecycleSection
            data={data.issueLifecycle}
            timeRange={timeRange}
          />
          <ReviewerInsightsSection data={data.reviewerInsights} />
          <ContributorFrictionSection data={data.contributorFriction} />
          <BacklogHealthSection data={data.backlogHealth} />
        </div>
      </div>
    </div>
  );
}
