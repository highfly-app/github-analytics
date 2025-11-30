import { Octokit } from "octokit";
import { subDays, subMonths } from "date-fns";
import { getApp } from "./github-app";
import type { TimeRange } from "./analytics-cache";

// Cache for test repo installation to avoid repeated API calls
let cachedTestRepoInstallation: { octokit: Octokit; expiresAt: Date } | null =
  null;

// GitHub API types (simplified)
export interface GitHubUser {
  login: string;
  type: string;
  avatar_url?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: GitHubUser;
  labels: Array<{ name: string }>;
  assignees: GitHubUser[];
  comments: number;
  pull_request?: {
    url: string;
  };
}

export interface GitHubComment {
  id: number;
  user: GitHubUser | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubIssueEvent {
  id: number;
  event: string;
  created_at: string;
  actor: GitHubUser | null;
  label?: { name: string };
  assignee?: GitHubUser;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: GitHubUser;
  merged: boolean;
  commits?: number;
  additions?: number;
  deletions?: number;
}

export interface GitHubReview {
  id: number;
  user: GitHubUser | null;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED";
  submitted_at: string;
  body: string | null;
}

export interface GitHubRepository {
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  html_url: string;
}

/**
 * Get start date based on time range
 */
export function getStartDate(timeRange: TimeRange): Date {
  const now = new Date();
  switch (timeRange) {
    case "1week":
      return subDays(now, 7);
    case "1month":
      return subMonths(now, 1);
    case "3months":
      return subMonths(now, 3);
    case "6months":
      return subMonths(now, 6);
    default:
      return subMonths(now, 1);
  }
}

/**
 * Get GitHub App installation for a repository
 */
export async function getInstallationForRepo(owner: string, repo: string) {
  const app = getApp();
  try {
    const installationResp = await app.octokit.request(
      "GET /repos/{owner}/{repo}/installation",
      {
        owner,
        repo,
      }
    );
    return installationResp.data;
  } catch (error: unknown) {
    // Handle secondary rate limits gracefully
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 403 || error.status === 429) {
        // Secondary rate limit - don't log as error, just return null
        console.warn(`Rate limited checking installation for ${owner}/${repo}`);
        return null;
      }
    }
    console.error(
      `❌ Error fetching installation for ${owner}/${repo}:`,
      error
    );
    return null;
  }
}

/**
 * Get authenticated Octokit instance for an installation
 */
export async function getInstallationOctokit(installationId: number) {
  const app = getApp();
  return await app.getInstallationOctokit(installationId);
}

/**
 * Get Octokit instance for public repository access
 * Uses GitHub App authentication with secrets for better rate limits
 * - First tries to get installation octokit (if app is installed on repo)
 * - Falls back to app.octokit (JWT auth) for public repos without installation
 */
async function getPublicRepoOctokit(): Promise<Octokit> {
  // Use cached test repo installation if available and not expired
  if (
    cachedTestRepoInstallation &&
    cachedTestRepoInstallation.expiresAt > new Date()
  ) {
    return cachedTestRepoInstallation.octokit;
  }

  const githubAppRepoOwner = process.env.GITHUB_APP_REPO_OWNER;
  const githubAppRepoName = process.env.GITHUB_APP_REPO_NAME;
  if (!githubAppRepoOwner || !githubAppRepoName) {
    throw new Error("GITHUB_APP_REPO_OWNER or GITHUB_APP_REPO_NAME is not set");
  }

  try {
    // This provides better rate limits than app.octokit for public repos
    const installation = await getInstallationForRepo(
      githubAppRepoOwner,
      githubAppRepoName
    );
    if (installation && installation.id) {
      try {
        const octokit = await getInstallationOctokit(installation.id);
        // Cache for 1 hour to avoid repeated installation checks
        cachedTestRepoInstallation = {
          octokit,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        };
        return octokit;
      } catch (installError) {
        // If getting installation octokit fails (e.g., OpenSSL errors, auth issues),
        // log and fall back to app.octokit
        console.warn(
          "Failed to get installation octokit, using app.octokit fallback:",
          installError instanceof Error ? installError.message : installError
        );
      }
    }
  } catch (error) {
    // Handle secondary rate limits and other errors gracefully
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 403 || error.status === 429) {
        console.warn(
          "Rate limited on installation check, using app.octokit fallback"
        );
      }
    } else {
      // Log other errors (like OpenSSL decoder errors) but continue to fallback
      console.warn(
        "Error checking installation, using app.octokit fallback:",
        error instanceof Error ? error.message : error
      );
    }
    // Ignore errors, continue to final fallback
  }

  // Final fallback to app.octokit (JWT auth, works for public repos)
  // Rate limit: 5,000 req/hour for app authentication
  const app = getApp();
  return app.octokit;
}

/**
 * Fetch repository information
 */
export async function fetchRepositoryInfo(
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  const octokit = await getPublicRepoOctokit();

  try {
    const response = await octokit.rest.repos.get({
      owner,
      repo,
    });
    if (response.data.private) {
      throw new Error("Repository is private");
    }

    return {
      full_name: response.data.full_name,
      name: response.data.name,
      owner: {
        login: response.data.owner.login,
      },
      stargazers_count: response.data.stargazers_count,
      forks_count: response.data.forks_count,
      private: response.data.private,
      html_url: response.data.html_url,
    };
  } catch (error: unknown) {
    console.error("Error fetching repository info:", error);
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 404) {
        throw new Error("Repository not found");
      }
      if (error.status === 403) {
        throw new Error("Repository access denied");
      }
      console.error("Repository info error:", error);
    }
    throw error;
  }
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return error.status === 403 || error.status === 429;
  }
  if (error instanceof Error) {
    return (
      error.message.includes("rate limit") ||
      error.message.includes("quota exhausted")
    );
  }
  return false;
}

/**
 * Fetch all issues with pagination
 * Uses octokit.paginate() which handles cursor-based pagination automatically
 */
export async function fetchIssues(
  owner: string,
  repo: string,
  startDate: Date
): Promise<GitHubIssue[]> {
  const octokit = await getPublicRepoOctokit();
  const since = startDate.toISOString();

  try {
    // Use paginate which automatically handles cursor-based pagination for large datasets
    // Note: 'since' parameter filters by updated_at, not created_at, so we'll filter manually
    const allIssues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: "all",
      since,
      sort: "created",
      direction: "desc",
      per_page: 100,
    });

    // Filter out PRs and filter by created_at (since 'since' parameter uses updated_at)
    return allIssues.filter((issue) => {
      // Filter out PRs
      if (issue.pull_request) return false;
      // Filter by created_at date
      const createdAt = new Date(issue.created_at);
      return createdAt >= startDate;
    }) as GitHubIssue[];
  } catch (error: unknown) {
    console.error("Error fetching issues:", error);
    throw error;
  }
}

/**
 * Fetch comments for an issue
 * Uses octokit.paginate() for automatic pagination
 */
export async function fetchIssueComments(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubComment[]> {
  const octokit = await getPublicRepoOctokit();

  try {
    // Use paginate which automatically handles pagination
    return (await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    })) as GitHubComment[];
  } catch (error: unknown) {
    if (isRateLimitError(error)) {
      console.warn(
        `Rate limit hit while fetching comments for issue ${issueNumber}`
      );
      throw error; // Re-throw rate limit errors so they can be handled upstream
    }
    console.error(`Error fetching comments for issue ${issueNumber}:`, error);
    // Return empty array on other errors
    return [];
  }
}

/**
 * Fetch events for an issue (labels, assignees, etc.)
 * Uses octokit.paginate() for automatic pagination
 */
export async function fetchIssueEvents(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssueEvent[]> {
  const octokit = await getPublicRepoOctokit();

  try {
    // Use paginate which automatically handles pagination
    return (await octokit.paginate(octokit.rest.issues.listEvents, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    })) as GitHubIssueEvent[];
  } catch (error: unknown) {
    if (isRateLimitError(error)) {
      console.warn(
        `Rate limit hit while fetching events for issue ${issueNumber}`
      );
      throw error; // Re-throw rate limit errors so they can be handled upstream
    }
    console.error(`Error fetching events for issue ${issueNumber}:`, error);
    // Return empty array on other errors
    return [];
  }
}

/**
 * Fetch all pull requests with pagination
 * Uses octokit.paginate() which handles cursor-based pagination automatically
 */
export async function fetchPullRequests(
  owner: string,
  repo: string,
  startDate: Date
): Promise<GitHubPullRequest[]> {
  const octokit = await getPublicRepoOctokit();

  try {
    // iterator to stop early once we've passed startDate
    // Since we sort by 'created' desc (newest first), we can stop when we hit older PRs
    const prs: GitHubPullRequest[] = [];

    for await (const response of octokit.paginate.iterator(
      octokit.rest.pulls.list,
      {
        owner,
        repo,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: 100,
      }
    )) {
      let foundOlderPR = false;

      for (const pr of response.data) {
        const createdAt = new Date(pr.created_at);

        // If PR is older than startDate, stop processing (since sorted desc)
        if (createdAt < startDate) {
          foundOlderPR = true;
          break;
        }

        prs.push({
          number: pr.number,
          title: pr.title,
          state: pr.state as "open" | "closed",
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          closed_at: pr.closed_at,
          merged_at: pr.merged_at || null,
          user: {
            login: pr.user?.login || "",
            type: pr.user?.type || "User",
            avatar_url: pr.user?.avatar_url,
          },
          merged: !!pr.merged_at,
        });
      }

      // Stop fetching more pages if we found PRs older than startDate
      if (foundOlderPR) {
        break;
      }
    }

    return prs;
  } catch (error: unknown) {
    console.error("Error fetching pull requests:", error);
    throw error;
  }
}

/**
 * Fetch PR details (commits, additions, deletions)
 */
export async function fetchPRDetails(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<{ commits: number; additions: number; deletions: number } | null> {
  const octokit = await getPublicRepoOctokit();

  try {
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return {
      commits: data.commits || 0,
      additions: data.additions || 0,
      deletions: data.deletions || 0,
    };
  } catch (error: unknown) {
    if (isRateLimitError(error)) {
      console.warn(
        `Rate limit hit while fetching details for PR ${pullNumber}`
      );
      throw error;
    }
    console.error(`Error fetching details for PR ${pullNumber}:`, error);
    return null;
  }
}

/**
 * Fetch reviews for a pull request
 * Uses octokit.paginate() for automatic pagination
 */
export async function fetchPRReviews(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubReview[]> {
  const octokit = await getPublicRepoOctokit();

  try {
    // Use paginate which automatically handles pagination
    return (await octokit.paginate(octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    })) as GitHubReview[];
  } catch (error: unknown) {
    if (isRateLimitError(error)) {
      console.warn(
        `Rate limit hit while fetching reviews for PR ${pullNumber}`
      );
      throw error; // Re-throw rate limit errors so they can be handled upstream
    }
    console.error(`Error fetching reviews for PR ${pullNumber}:`, error);
    // Return empty array on other errors
    return [];
  }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all issues with their comments and events (always fetches last 3 months)
 * Uses batching to avoid rate limit exhaustion
 */
export async function fetchIssuesWithDetails(
  owner: string,
  repo: string
): Promise<
  Array<{
    issue: GitHubIssue;
    comments: GitHubComment[];
    events: GitHubIssueEvent[];
  }>
> {
  // Always fetch last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const issues = await fetchIssues(owner, repo, threeMonthsAgo);

  // Process in batches of 5 issues at a time with 200ms delay between batches
  // This prevents rate limit exhaustion while still being reasonably fast
  // If we hit rate limit, we'll stop processing and return what we have
  const results: Array<{
    issue: GitHubIssue;
    comments: GitHubComment[];
    events: GitHubIssueEvent[];
  }> = [];

  for (let i = 0; i < issues.length; i += 5) {
    const batch = issues.slice(i, i + 5);

    try {
      const batchResults = await Promise.all(
        batch.map(async (issue) => {
          try {
            const [comments, events] = await Promise.all([
              fetchIssueComments(owner, repo, issue.number),
              fetchIssueEvents(owner, repo, issue.number),
            ]);

            return {
              issue,
              comments,
              events,
            };
          } catch (error: unknown) {
            // If rate limited, skip this issue's details
            if (isRateLimitError(error)) {
              console.warn(
                `Rate limit hit, skipping details for issue ${issue.number}`
              );
              throw error; // Re-throw to stop processing
            }
            // For other errors, return issue with empty details
            console.error(
              `Error fetching details for issue ${issue.number}:`,
              error
            );
            return {
              issue,
              comments: [],
              events: [],
            };
          }
        })
      );

      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + 5 < issues.length) {
        await sleep(200); // Increased delay to 200ms
      }
    } catch (error: unknown) {
      // If rate limited in batch, stop processing and return what we have
      if (isRateLimitError(error)) {
        console.warn(
          `Rate limit exhausted. Processed ${results.length} of ${issues.length} issues.`
        );
        // Add remaining issues with empty details
        const remainingIssues = issues.slice(i).map((issue) => ({
          issue,
          comments: [] as GitHubComment[],
          events: [] as GitHubIssueEvent[],
        }));
        results.push(...remainingIssues);
        break;
      }
      throw error;
    }
  }

  return results;
}

/**
 * Fetch all pull requests with their reviews (always fetches last 3 months)
 * Uses batching to avoid rate limit exhaustion
 */
export async function fetchPullRequestsWithDetails(
  owner: string,
  repo: string
): Promise<
  Array<{
    pr: GitHubPullRequest;
    reviews: GitHubReview[];
  }>
> {
  // Always fetch last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const prs = await fetchPullRequests(owner, repo, threeMonthsAgo);

  // Process in batches of 10 PRs at a time with 200ms delay between batches
  // If we hit rate limit, we'll stop processing and return what we have
  const results: Array<{
    pr: GitHubPullRequest;
    reviews: GitHubReview[];
  }> = [];

  for (let i = 0; i < prs.length; i += 10) {
    const batch = prs.slice(i, i + 10);

    try {
      const batchResults = await Promise.all(
        batch.map(async (pr) => {
          try {
            const [reviews, details] = await Promise.all([
              fetchPRReviews(owner, repo, pr.number),
              fetchPRDetails(owner, repo, pr.number),
            ]);

            // Update PR with details if available
            const prWithDetails: GitHubPullRequest = {
              ...pr,
              commits: details?.commits,
              additions: details?.additions,
              deletions: details?.deletions,
            };

            return {
              pr: prWithDetails,
              reviews,
            };
          } catch (error: unknown) {
            // If rate limited, skip this PR's reviews
            if (isRateLimitError(error)) {
              console.warn(
                `Rate limit hit, skipping reviews for PR ${pr.number}`
              );
              throw error; // Re-throw to stop processing
            }
            // For other errors, return PR with empty reviews
            console.error(`Error fetching reviews for PR ${pr.number}:`, error);
            return {
              pr,
              reviews: [],
            };
          }
        })
      );

      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + 10 < prs.length) {
        await sleep(200); // Increased delay to 200ms
      }
    } catch (error: unknown) {
      // If rate limited in batch, stop processing and return what we have
      if (isRateLimitError(error)) {
        console.warn(
          `Rate limit exhausted. Processed ${results.length} of ${prs.length} PRs.`
        );
        // Add remaining PRs with empty reviews
        const remainingPRs = prs.slice(i).map((pr) => ({
          pr,
          reviews: [] as GitHubReview[],
        }));
        results.push(...remainingPRs);
        break;
      }
      throw error;
    }
  }

  return results;
}
