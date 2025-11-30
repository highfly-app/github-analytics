import {
  type GitHubIssue,
  type GitHubComment,
  type GitHubIssueEvent,
  type GitHubPullRequest,
  type GitHubReview,
} from "./github-analytics";
import { isBot } from "./bot-detection";
import {
  differenceInHours,
  differenceInDays,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { TimeRange } from "./analytics-cache";

// Types for computed metrics
export interface IssueLifecycleMetrics {
  medianTimeToFirstResponse: number; // hours
  medianTimeToFirstMeaningfulResponse: number; // hours
  medianTimeToTriage: number; // hours
  medianTimeToResolution: number; // hours
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
}

export interface ReviewerInsight {
  username: string;
  prsReviewed: number;
  avgTimeToFirstReview: number; // hours
  approvals: number;
  changesRequested: number;
  commentsOnly: number;
}

export interface ContributorMetrics {
  username: string;
  commits: number;
  additions: number;
  deletions: number;
  netLines: number; // additions - deletions
}

export interface ReviewerInsightsMetrics {
  totalPRs: number;
  medianTimeToFirstReview: number; // hours
  medianTimeFromReviewToMerge: number; // hours
  prsMergedWithoutReview: number;
  prsClosedWithoutReview: number;
  topReviewers: ReviewerInsight[];
  topContributors: ContributorMetrics[];
}

export interface ContributorFrictionMetrics {
  firstTimePRs: number;
  returningPRs: number;
  firstTimeMergeRate: number; // percentage
  returningMergeRate: number; // percentage
  firstTimeMedianTimeToReview: number; // hours
  returningMedianTimeToReview: number; // hours
  firstTimeMedianReviewCycles: number;
  firstTimeIssuesWithoutPR: number;
}

export interface BacklogHealthMetrics {
  score: number; // 0-100
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
}

/**
 * Calculate median from array of numbers
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate issue lifecycle metrics
 */
export function calculateIssueLifecycleMetrics(
  issues: Array<{
    issue: GitHubIssue;
    comments: GitHubComment[];
    events: GitHubIssueEvent[];
  }>,
  timeRange: TimeRange
): IssueLifecycleMetrics {
  const timesToFirstResponse: number[] = [];
  const timesToFirstMeaningfulResponse: number[] = [];
  const timesToTriage: number[] = [];
  const timesToResolution: number[] = [];
  const openIssues: GitHubIssue[] = [];
  const closedIssues: GitHubIssue[] = [];
  let reopenedCount = 0;

  for (const { issue, comments, events } of issues) {
    const createdAt = parseISO(issue.created_at);
    const closedAt = issue.closed_at ? parseISO(issue.closed_at) : null;

    // Time to first response (non-bot comment)
    const firstNonBotComment = comments.find((c) => c.user && !isBot(c.user));
    if (firstNonBotComment) {
      const timeToFirstResponse = differenceInHours(
        parseISO(firstNonBotComment.created_at),
        createdAt
      );
      if (timeToFirstResponse >= 0) {
        timesToFirstResponse.push(timeToFirstResponse);
      }
    }

    // Time to first meaningful response (non-bot, non-trivial comment)
    const meaningfulComments = comments.filter(
      (c) => c.user && !isBot(c.user) && c.body && c.body.trim().length > 10
    );
    if (meaningfulComments.length > 0) {
      const firstMeaningful = meaningfulComments[0];
      const timeToMeaningful = differenceInHours(
        parseISO(firstMeaningful.created_at),
        createdAt
      );
      if (timeToMeaningful >= 0) {
        timesToFirstMeaningfulResponse.push(timeToMeaningful);
      }
    }

    // Time to triage (first label OR assignee)
    const labelEvent = events.find((e) => e.event === "labeled");
    const assigneeEvent = events.find((e) => e.event === "assigned");
    if (labelEvent || assigneeEvent) {
      const triageEvent =
        labelEvent && assigneeEvent
          ? parseISO(labelEvent.created_at) < parseISO(assigneeEvent.created_at)
            ? labelEvent
            : assigneeEvent
          : labelEvent || assigneeEvent;
      if (triageEvent) {
        const timeToTriage = differenceInHours(
          parseISO(triageEvent.created_at),
          createdAt
        );
        if (timeToTriage >= 0) {
          timesToTriage.push(timeToTriage);
        }
      }
    }

    // Time to resolution
    if (closedAt) {
      const timeToResolution = differenceInHours(closedAt, createdAt);
      if (timeToResolution >= 0) {
        timesToResolution.push(timeToResolution);
      }
    }

    // Track open/closed issues
    if (issue.state === "open") {
      openIssues.push(issue);
    } else {
      closedIssues.push(issue);
    }

    // Check for reopened (closed then reopened)
    const reopenEvents = events.filter((e) => e.event === "reopened");
    if (reopenEvents.length > 0 && closedAt) {
      reopenedCount++;
    }
  }

  // Calculate stale issue rates
  const now = new Date();
  const stale30Days = openIssues.filter((issue) => {
    const age = differenceInDays(now, parseISO(issue.created_at));
    return age > 30;
  }).length;
  const stale60Days = openIssues.filter((issue) => {
    const age = differenceInDays(now, parseISO(issue.created_at));
    return age > 60;
  }).length;
  const stale90Days = openIssues.filter((issue) => {
    const age = differenceInDays(now, parseISO(issue.created_at));
    return age > 90;
  }).length;

  const totalIssues = issues.length;
  const staleIssueRate = {
    after30Days: totalIssues > 0 ? (stale30Days / totalIssues) * 100 : 0,
    after60Days: totalIssues > 0 ? (stale60Days / totalIssues) * 100 : 0,
    after90Days: totalIssues > 0 ? (stale90Days / totalIssues) * 100 : 0,
  };

  const reopenedIssueRate =
    totalIssues > 0 ? (reopenedCount / totalIssues) * 100 : 0;

  // Calculate time series
  const timeSeries = calculateTimeSeries(issues, timeRange);

  return {
    medianTimeToFirstResponse: median(timesToFirstResponse),
    medianTimeToFirstMeaningfulResponse: median(timesToFirstMeaningfulResponse),
    medianTimeToTriage: median(timesToTriage),
    medianTimeToResolution: median(timesToResolution),
    staleIssueRate,
    reopenedIssueRate,
    timeSeries,
  };
}

/**
 * Calculate time series data
 */
function calculateTimeSeries(
  issues: Array<{
    issue: GitHubIssue;
    comments: GitHubComment[];
    events: GitHubIssueEvent[];
  }>,
  timeRange: TimeRange
): IssueLifecycleMetrics["timeSeries"] {
  // Determine bucket size based on time range
  const bucketFn =
    timeRange === "1week" || timeRange === "1month" ? startOfDay : startOfWeek;

  // Group issues by bucket
  const buckets = new Map<string, typeof issues>();

  for (const item of issues) {
    const bucket = bucketFn(parseISO(item.issue.created_at)).toISOString();
    if (!buckets.has(bucket)) {
      buckets.set(bucket, []);
    }
    buckets.get(bucket)!.push(item);
  }

  // Calculate metrics per bucket
  const timeSeries: IssueLifecycleMetrics["timeSeries"] = [];

  for (const [date, bucketIssues] of buckets.entries()) {
    const timesToFirstResponse: number[] = [];
    const timesToResolution: number[] = [];
    let created = 0;
    let closed = 0;

    for (const { issue, comments } of bucketIssues) {
      created++;
      if (issue.state === "closed") {
        closed++;
      }

      const createdAt = parseISO(issue.created_at);
      const firstComment = comments.find((c) => c.user && !isBot(c.user));
      if (firstComment) {
        const time = differenceInHours(
          parseISO(firstComment.created_at),
          createdAt
        );
        if (time >= 0) {
          timesToFirstResponse.push(time);
        }
      }

      if (issue.closed_at) {
        const time = differenceInHours(parseISO(issue.closed_at), createdAt);
        if (time >= 0) {
          timesToResolution.push(time);
        }
      }
    }

    timeSeries.push({
      date,
      medianTimeToFirstResponse: median(timesToFirstResponse),
      medianTimeToResolution: median(timesToResolution),
      issuesCreated: created,
      issuesClosed: closed,
    });
  }

  // Sort by date
  timeSeries.sort((a, b) => a.date.localeCompare(b.date));

  return timeSeries;
}

/**
 * Calculate reviewer insights metrics
 */
export function calculateReviewerInsightsMetrics(
  prs: Array<{
    pr: GitHubPullRequest;
    reviews: GitHubReview[];
  }>
): ReviewerInsightsMetrics {
  const timesToFirstReview: number[] = [];
  const timesFromReviewToMerge: number[] = [];
  let prsMergedWithoutReview = 0;
  let prsClosedWithoutReview = 0;

  const reviewerMap = new Map<
    string,
    {
      prsReviewed: number;
      totalTimeToFirstReview: number;
      reviewCount: number;
      approvals: number;
      changesRequested: number;
      commentsOnly: number;
    }
  >();

  for (const { pr, reviews } of prs) {
    const createdAt = parseISO(pr.created_at);
    const humanReviews = reviews.filter((r) => r.user && !isBot(r.user));

    if (humanReviews.length === 0) {
      if (pr.merged && pr.merged_at) {
        prsMergedWithoutReview++;
      } else if (pr.state === "closed" && !pr.merged) {
        prsClosedWithoutReview++;
      }
    } else {
      // Sort reviews by submission time to get the actual first review
      const sortedReviews = [...humanReviews].sort(
        (a, b) =>
          parseISO(a.submitted_at).getTime() -
          parseISO(b.submitted_at).getTime()
      );
      const firstReview = sortedReviews[0];
      const timeToFirstReview = differenceInHours(
        parseISO(firstReview.submitted_at),
        createdAt
      );
      if (timeToFirstReview >= 0) {
        timesToFirstReview.push(timeToFirstReview);
      }

      // Time from first review to merge
      if (pr.merged && pr.merged_at) {
        const timeToMerge = differenceInHours(
          parseISO(pr.merged_at),
          parseISO(firstReview.submitted_at)
        );
        if (timeToMerge >= 0) {
          timesFromReviewToMerge.push(timeToMerge);
        }
      }

      // Track reviewer stats
      for (const review of humanReviews) {
        if (!review.user) continue;
        const username = review.user.login;

        if (!reviewerMap.has(username)) {
          reviewerMap.set(username, {
            prsReviewed: 0,
            totalTimeToFirstReview: 0,
            reviewCount: 0,
            approvals: 0,
            changesRequested: 0,
            commentsOnly: 0,
          });
        }

        const stats = reviewerMap.get(username)!;
        stats.prsReviewed++;

        // Only count first review per PR for time calculation
        if (review.id === sortedReviews[0].id) {
          stats.totalTimeToFirstReview += timeToFirstReview;
          stats.reviewCount++;
        }

        // Count review types
        if (review.state === "APPROVED") {
          stats.approvals++;
        } else if (review.state === "CHANGES_REQUESTED") {
          stats.changesRequested++;
        } else if (review.state === "COMMENTED") {
          stats.commentsOnly++;
        }
      }
    }
  }

  // Build reviewer insights
  const topReviewers: ReviewerInsight[] = Array.from(reviewerMap.entries())
    .map(([username, stats]) => ({
      username,
      prsReviewed: stats.prsReviewed,
      avgTimeToFirstReview:
        stats.reviewCount > 0
          ? stats.totalTimeToFirstReview / stats.reviewCount
          : 0,
      approvals: stats.approvals,
      changesRequested: stats.changesRequested,
      commentsOnly: stats.commentsOnly,
    }))
    .sort((a, b) => b.prsReviewed - a.prsReviewed)
    .slice(0, 10); // Top 10

  // Calculate contributor metrics (PR authors)
  const contributorMap = new Map<
    string,
    {
      commits: number;
      additions: number;
      deletions: number;
    }
  >();

  for (const { pr } of prs) {
    const author = pr.user.login;
    if (!contributorMap.has(author)) {
      contributorMap.set(author, {
        commits: 0,
        additions: 0,
        deletions: 0,
      });
    }

    const stats = contributorMap.get(author)!;
    stats.commits += pr.commits || 0;
    stats.additions += pr.additions || 0;
    stats.deletions += pr.deletions || 0;
  }

  // Build contributor metrics
  const topContributors: ContributorMetrics[] = Array.from(
    contributorMap.entries()
  )
    .map(([username, stats]) => ({
      username,
      commits: stats.commits,
      additions: stats.additions,
      deletions: stats.deletions,
      netLines: stats.additions - stats.deletions,
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10); // Top 10

  return {
    totalPRs: prs.length,
    medianTimeToFirstReview: median(timesToFirstReview),
    medianTimeFromReviewToMerge: median(timesFromReviewToMerge),
    prsMergedWithoutReview,
    prsClosedWithoutReview,
    topReviewers,
    topContributors,
  };
}

/**
 * Calculate contributor friction metrics
 */
export function calculateContributorFrictionMetrics(
  prs: Array<{
    pr: GitHubPullRequest;
    reviews: GitHubReview[];
  }>,
  issues: Array<{
    issue: GitHubIssue;
    comments: GitHubComment[];
    events: GitHubIssueEvent[];
  }>
): ContributorFrictionMetrics {
  // Track first-time vs returning contributors
  const contributorPRs = new Map<string, GitHubPullRequest[]>();
  const contributorFirstPR = new Map<string, GitHubPullRequest>();

  for (const { pr } of prs) {
    const author = pr.user.login;
    if (!contributorPRs.has(author)) {
      contributorPRs.set(author, []);
      contributorFirstPR.set(author, pr);
    }
    contributorPRs.get(author)!.push(pr);
  }

  // Sort by creation date to determine first PR
  for (const [author, authorPRs] of contributorPRs.entries()) {
    authorPRs.sort(
      (a, b) =>
        parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
    );
    contributorFirstPR.set(author, authorPRs[0]);
  }

  // For first-time detection, we need to check if this is their first PR ever
  // Since we only have data in the time range, we'll consider the first PR in our dataset as "first-time"
  const firstTimePRs: typeof prs = [];
  const returningPRs: typeof prs = [];

  for (const item of prs) {
    const author = item.pr.user.login;
    const firstPR = contributorFirstPR.get(author);
    if (firstPR && firstPR.number === item.pr.number) {
      firstTimePRs.push(item);
    } else {
      returningPRs.push(item);
    }
  }

  // Calculate merge rates
  const firstTimeMerged = firstTimePRs.filter(({ pr }) => pr.merged).length;
  const returningMerged = returningPRs.filter(({ pr }) => pr.merged).length;

  // Calculate median time to review
  const firstTimeReviewTimes: number[] = [];
  const returningReviewTimes: number[] = [];

  for (const { pr, reviews } of firstTimePRs) {
    const humanReviews = reviews.filter((r) => r.user && !isBot(r.user));
    if (humanReviews.length > 0) {
      const time = differenceInHours(
        parseISO(humanReviews[0].submitted_at),
        parseISO(pr.created_at)
      );
      if (time >= 0) {
        firstTimeReviewTimes.push(time);
      }
    }
  }

  for (const { pr, reviews } of returningPRs) {
    const humanReviews = reviews.filter((r) => r.user && !isBot(r.user));
    if (humanReviews.length > 0) {
      const time = differenceInHours(
        parseISO(humanReviews[0].submitted_at),
        parseISO(pr.created_at)
      );
      if (time >= 0) {
        returningReviewTimes.push(time);
      }
    }
  }

  // Calculate review cycles (simplified: count "changes requested" events)
  const firstTimeReviewCycles: number[] = [];
  for (const { reviews } of firstTimePRs) {
    const changesRequested = reviews.filter(
      (r) => r.state === "CHANGES_REQUESTED" && r.user && !isBot(r.user)
    ).length;
    firstTimeReviewCycles.push(changesRequested);
  }

  // Find first-time issues without PRs
  const issueAuthors = new Set(issues.map(({ issue }) => issue.user.login));
  const prAuthors = new Set(prs.map(({ pr }) => pr.user.login));
  const firstTimeIssuesWithoutPR = Array.from(issueAuthors).filter(
    (author) => !prAuthors.has(author)
  ).length;

  return {
    firstTimePRs: firstTimePRs.length,
    returningPRs: returningPRs.length,
    firstTimeMergeRate:
      firstTimePRs.length > 0
        ? (firstTimeMerged / firstTimePRs.length) * 100
        : 0,
    returningMergeRate:
      returningPRs.length > 0
        ? (returningMerged / returningPRs.length) * 100
        : 0,
    firstTimeMedianTimeToReview: median(firstTimeReviewTimes),
    returningMedianTimeToReview: median(returningReviewTimes),
    firstTimeMedianReviewCycles: median(firstTimeReviewCycles),
    firstTimeIssuesWithoutPR,
  };
}

/**
 * Calculate backlog health metrics
 */
export function calculateBacklogHealthMetrics(
  openIssues: GitHubIssue[],
  openPRs: GitHubPullRequest[],
  allPRs: Array<{
    pr: GitHubPullRequest;
    reviews: GitHubReview[];
  }>
): BacklogHealthMetrics {
  const now = new Date();

  // Issue age distribution
  const issueAges = openIssues.map((issue) =>
    differenceInDays(now, parseISO(issue.created_at))
  );
  const byAge = {
    "0-30": issueAges.filter((age) => age <= 30).length,
    "31-60": issueAges.filter((age) => age > 30 && age <= 60).length,
    "61-90": issueAges.filter((age) => age > 60 && age <= 90).length,
    "90+": issueAges.filter((age) => age > 90).length,
  };

  // Unlabeled issues
  const unlabeled = openIssues.filter(
    (issue) => issue.labels.length === 0
  ).length;
  const unlabeledPercentage =
    openIssues.length > 0 ? (unlabeled / openIssues.length) * 100 : 0;

  // Orphan issues (no assignee, no linked PR, no milestone)
  // Note: We don't have milestone data from basic issue API, so we'll check assignee and linked PR
  const orphan = openIssues.filter(
    (issue) => issue.assignees.length === 0 && !issue.pull_request
  ).length;
  const orphanPercentage =
    openIssues.length > 0 ? (orphan / openIssues.length) * 100 : 0;

  // PR age distribution
  const prAges = openPRs.map((pr) =>
    differenceInDays(now, parseISO(pr.created_at))
  );
  const prByAge = {
    "0-7": prAges.filter((age) => age <= 7).length,
    "8-14": prAges.filter((age) => age > 7 && age <= 14).length,
    "15-30": prAges.filter((age) => age > 14 && age <= 30).length,
    "30+": prAges.filter((age) => age > 30).length,
  };

  // PRs without review
  const prsWithoutReview = openPRs.filter((pr) => {
    const prData = allPRs.find(({ pr: p }) => p.number === pr.number);
    if (!prData) return true;
    const humanReviews = prData.reviews.filter((r) => r.user && !isBot(r.user));
    return humanReviews.length === 0;
  }).length;
  const withoutReviewPercentage =
    openPRs.length > 0 ? (prsWithoutReview / openPRs.length) * 100 : 0;

  // Calculate score
  const score = calculateBacklogHealthScore(
    byAge,
    unlabeledPercentage,
    orphanPercentage,
    prByAge,
    withoutReviewPercentage,
    openIssues.length,
    openPRs.length
  );

  return {
    score,
    label:
      score >= 70 ? "Healthy" : score >= 40 ? "Needs Attention" : "Overloaded",
    issues: {
      totalOpen: openIssues.length,
      byAge,
      unlabeled,
      unlabeledPercentage,
      orphan,
      orphanPercentage,
    },
    pullRequests: {
      totalOpen: openPRs.length,
      byAge: prByAge,
      withoutReview: prsWithoutReview,
      withoutReviewPercentage,
    },
  };
}

/**
 * Calculate backlog health score (0-100)
 */
function calculateBacklogHealthScore(
  issueByAge: {
    "0-30": number;
    "31-60": number;
    "61-90": number;
    "90+": number;
  },
  unlabeledPercentage: number,
  orphanPercentage: number,
  prByAge: { "0-7": number; "8-14": number; "15-30": number; "30+": number },
  withoutReviewPercentage: number,
  totalOpenIssues: number,
  totalOpenPRs: number
): number {
  let baseScore = 100;

  // Stale Issues deductions (max -30)
  if (totalOpenIssues > 0) {
    const pct90Plus = (issueByAge["90+"] / totalOpenIssues) * 100;
    const pct61_90 = (issueByAge["61-90"] / totalOpenIssues) * 100;
    const pct31_60 = (issueByAge["31-60"] / totalOpenIssues) * 100;

    baseScore -= Math.min(30, pct90Plus * 2); // -2 per 1%
    baseScore -= Math.min(30, (pct61_90 / 2) * 1); // -1 per 2%
    baseScore -= Math.min(30, (pct31_60 / 5) * 0.5); // -0.5 per 5%
  }

  // Unlabeled Issues (max -20)
  baseScore -= Math.min(20, (unlabeledPercentage / 5) * 1); // -1 per 5%

  // Orphan Issues (max -20)
  baseScore -= Math.min(20, (orphanPercentage / 5) * 1); // -1 per 5%

  // Stale PRs (max -15)
  if (totalOpenPRs > 0) {
    const pct30Plus = (prByAge["30+"] / totalOpenPRs) * 100;
    const pct15_30 = (prByAge["15-30"] / totalOpenPRs) * 100;
    const pct8_14 = (prByAge["8-14"] / totalOpenPRs) * 100;

    baseScore -= Math.min(15, pct30Plus * 2); // -2 per 1%
    baseScore -= Math.min(15, (pct15_30 / 2) * 1); // -1 per 2%
    baseScore -= Math.min(15, (pct8_14 / 5) * 0.5); // -0.5 per 5%
  }

  // PRs Without Review (max -15)
  baseScore -= Math.min(15, (withoutReviewPercentage / 5) * 1); // -1 per 5%

  return Math.max(0, Math.min(100, baseScore));
}
