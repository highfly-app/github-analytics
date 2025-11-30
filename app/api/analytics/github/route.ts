import { NextRequest, NextResponse } from "next/server";
import {
  getCachedAnalytics,
  setCachedAnalytics,
  getCacheEntry,
  type TimeRange,
} from "@/utils/analytics-cache";
import {
  fetchRepositoryInfo,
  fetchIssuesWithDetails,
  fetchPullRequestsWithDetails,
  getStartDate,
} from "@/utils/github-analytics";
import {
  calculateIssueLifecycleMetrics,
  calculateReviewerInsightsMetrics,
  calculateContributorFrictionMetrics,
  calculateBacklogHealthMetrics,
} from "@/utils/analytics-metrics";

export interface AnalyticsResponse {
  repository: {
    owner: string;
    repo: string;
    fullName: string;
    stars: number;
    forks: number;
    url: string;
  };
  timeRange: {
    value: string;
    startDate: string;
    endDate: string;
  };
  issueLifecycle: {
    medianTimeToFirstResponse: number;
    medianTimeToFirstMeaningfulResponse: number;
    medianTimeToTriage: number;
    medianTimeToResolution: number;
    staleIssueRate: {
      after30Days: number;
      after60Days: number;
      after90Days: number;
    };
    reopenedIssueRate: number;
    timeSeries: Array<{
      date: string;
      medianTimeToFirstResponse: number;
      medianTimeToResolution: number;
      issuesCreated: number;
      issuesClosed: number;
    }>;
  };
  reviewerInsights: {
    totalPRs: number;
    medianTimeToFirstReview: number;
    medianTimeFromReviewToMerge: number;
    prsMergedWithoutReview: number;
    prsClosedWithoutReview: number;
    topReviewers: Array<{
      username: string;
      prsReviewed: number;
      avgTimeToFirstReview: number;
      approvals: number;
      changesRequested: number;
      commentsOnly: number;
    }>;
    topContributors: Array<{
      username: string;
      commits: number;
      additions: number;
      deletions: number;
      netLines: number;
    }>;
  };
  contributorFriction: {
    firstTimePRs: number;
    returningPRs: number;
    firstTimeMergeRate: number;
    returningMergeRate: number;
    firstTimeMedianTimeToReview: number;
    returningMedianTimeToReview: number;
    firstTimeMedianReviewCycles: number;
    firstTimeIssuesWithoutPR: number;
  };
  backlogHealth: {
    score: number;
    label: "Healthy" | "Needs Attention" | "Overloaded";
    issues: {
      totalOpen: number;
      byAge: {
        "0-30": number;
        "31-60": number;
        "61-90": number;
        "90+": number;
      };
      unlabeled: number;
      unlabeledPercentage: number;
      orphan: number;
      orphanPercentage: number;
    };
    pullRequests: {
      totalOpen: number;
      byAge: {
        "0-7": number;
        "8-14": number;
        "15-30": number;
        "30+": number;
      };
      withoutReview: number;
      withoutReviewPercentage: number;
    };
  };
  cached: boolean;
  cachedAt?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const timeRangeParam = searchParams.get("timeRange") || "1month";

    // Validate inputs
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing owner or repo parameter" },
        { status: 400 }
      );
    }

    // Validate time range
    const validTimeRanges: TimeRange[] = ["1week", "1month", "3months"];
    if (!validTimeRanges.includes(timeRangeParam as TimeRange)) {
      return NextResponse.json(
        { error: "Invalid time range" },
        { status: 400 }
      );
    }

    const timeRange = timeRangeParam as TimeRange;

    // Check cache first
    const cached = await getCachedAnalytics<AnalyticsResponse>(
      owner,
      repo,
      timeRange
    );
    if (cached) {
      console.log("Cached analytics found for:", owner, repo, timeRange);
      return NextResponse.json({
        ...cached,
        cached: true,
        cachedAt: new Date().toISOString(),
      });
    }

    // Check if there's a pending cache entry (someone else is fetching)
    const cacheEntry = await getCacheEntry(owner, repo);
    if (cacheEntry && cacheEntry.status === "pending") {
      // Check if the cache entry was created more than 20 minutes ago
      const createdAt = cacheEntry.cachedAt;
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes in milliseconds

      if (createdAt && createdAt < twentyMinutesAgo) {
        return NextResponse.json(
          {
            error:
              "Analytics generation is taking longer than expected. Please try again later.",
          },
          { status: 500 }
        );
      }

      console.log("Cache is pending for:", owner, repo);
      return NextResponse.json(
        {
          error: "Analytics are being generated. Please try again in a moment.",
          status: "pending",
        },
        { status: 202 }
      );
    }

    // Fetch repository info to validate it exists and is public
    let repository;
    try {
      console.log("Fetching repository info for:", owner, repo);
      repository = await fetchRepositoryInfo(owner, repo);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === "Repository not found") {
          return NextResponse.json(
            { error: "Repository not found" },
            { status: 404 }
          );
        }
        if (error.message === "Repository is private") {
          return NextResponse.json(
            { error: "Repository is private" },
            { status: 404 }
          );
        }
        if (error.message === "Repository access denied") {
          return NextResponse.json(
            { error: "Repository access denied" },
            { status: 403 }
          );
        }
      }
      throw error;
    }

    // Set status to pending before fetching
    await setCachedAnalytics(
      owner,
      repo,
      { "1week": null, "1month": null, "3months": null },
      "pending"
    );

    // Fetch all data in parallel (3 months worth)
    console.log("Fetching issues and PRs for:", owner, repo);
    const [issuesData, prsData] = await Promise.all([
      fetchIssuesWithDetails(owner, repo),
      fetchPullRequestsWithDetails(owner, repo),
    ]);
    console.log("Issues and PRs fetched:", issuesData.length, prsData.length);

    // Calculate metrics for all time ranges
    const timeRanges: TimeRange[] = ["1week", "1month", "3months"];
    const responses: Record<TimeRange, AnalyticsResponse> = {} as Record<
      TimeRange,
      AnalyticsResponse
    >;

    for (const range of timeRanges) {
      const rangeStartDate = getStartDate(range);
      const endDate = new Date();

      // Filter data for this time range by created_at
      const filteredIssuesData = issuesData.filter(
        ({ issue }) => new Date(issue.created_at) >= rangeStartDate
      );
      const filteredPRsData = prsData.filter(
        ({ pr }) => new Date(pr.created_at) >= rangeStartDate
      );

      // Calculate metrics for this time range
      const issueLifecycle = calculateIssueLifecycleMetrics(
        filteredIssuesData,
        range
      );
      const reviewerInsights =
        calculateReviewerInsightsMetrics(filteredPRsData);
      const contributorFriction = calculateContributorFrictionMetrics(
        filteredPRsData,
        filteredIssuesData
      );

      // Get open issues and PRs for backlog health (all open, not filtered by time range)
      const openIssues = issuesData
        .filter(({ issue }) => issue.state === "open")
        .map(({ issue }) => issue);
      const openPRs = prsData
        .filter(({ pr }) => pr.state === "open")
        .map(({ pr }) => pr);
      const backlogHealth = calculateBacklogHealthMetrics(
        openIssues,
        openPRs,
        prsData
      );

      // Build response for this time range
      responses[range] = {
        repository: {
          owner: repository.owner.login,
          repo: repository.name,
          fullName: repository.full_name,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          url: repository.html_url,
        },
        timeRange: {
          value: range,
          startDate: rangeStartDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        issueLifecycle,
        reviewerInsights,
        contributorFriction,
        backlogHealth,
        cached: false,
      };
    }

    // Cache all time ranges together
    await setCachedAnalytics(owner, repo, responses, "complete");

    // Return the requested time range
    return NextResponse.json(responses[timeRange]);
  } catch (error: unknown) {
    console.error("Error fetching analytics:", error);

    // Handle rate limiting
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 403) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
