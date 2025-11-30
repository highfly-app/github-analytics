"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "./stat-tile";
import { BarChart } from "./bar-chart";
import { ReviewerTable } from "./reviewer-table";
import { ContributorTable } from "./contributor-table";
import type { AnalyticsResponse } from "@/app/api/analytics/github/route";

interface ReviewerInsightsSectionProps {
  data: AnalyticsResponse["reviewerInsights"];
}

export function ReviewerInsightsSection({
  data,
}: ReviewerInsightsSectionProps) {
  const formatHours = (hours: number) => {
    if (hours === 0) {
      return "N/A";
    }
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  // Check if we have enough review data
  const hasReviewData = data.medianTimeToFirstReview > 0;
  const prsWithReviews =
    data.totalPRs - data.prsMergedWithoutReview - data.prsClosedWithoutReview;

  // Prepare bar chart data for top reviewers
  const reviewersBarData = data.topReviewers.slice(0, 10).map((reviewer) => ({
    name: reviewer.username,
    "PRs Reviewed": reviewer.prsReviewed,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reviewer Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              title="Total PRs"
              value={data.totalPRs}
              description="In time range"
            />
            <StatTile
              title="Time to First Review"
              value={formatHours(data.medianTimeToFirstReview)}
              description={hasReviewData ? "Median time" : "Need more reviews"}
            />
            <StatTile
              title="Merged Without Review"
              value={data.prsMergedWithoutReview}
              description="No human review"
              variant={data.prsMergedWithoutReview > 0 ? "warning" : "default"}
            />
            <StatTile
              title="Closed Without Review"
              value={data.prsClosedWithoutReview}
              description="No human review"
              variant={data.prsClosedWithoutReview > 0 ? "warning" : "default"}
            />
          </div>

          {/* Show message if no review data */}
          {!hasReviewData && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Not enough review data available
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prsWithReviews === 0
                      ? "No PRs in this time range have human reviews."
                      : `Only ${prsWithReviews} of ${data.totalPRs} PRs have reviews.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Reviewers Bar Chart */}
          {reviewersBarData.length > 0 && (
            <BarChart
              data={reviewersBarData}
              title="Top Reviewers by PR Count"
              dataKeys={[
                {
                  key: "PRs Reviewed",
                  name: "PRs Reviewed",
                  colorVar: "chart-2",
                },
              ]}
              xAxisLabel="Reviewer"
              yAxisLabel="PRs Reviewed"
            />
          )}

          {/* Reviewer Table */}
          <ReviewerTable
            reviewers={data.topReviewers}
            title="Top Reviewers Details"
          />

          {/* Contributor Table */}
          {data.topContributors && data.topContributors.length > 0 && (
            <ContributorTable
              contributors={data.topContributors}
              title="Top Contributors"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
