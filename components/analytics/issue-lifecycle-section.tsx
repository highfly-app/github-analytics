"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "./stat-tile";
import { TimeSeriesChart } from "./time-series-chart";
import { BarChart } from "./bar-chart";
import type { AnalyticsResponse } from "@/app/api/analytics/github/route";
import type { TimeRange } from "@/utils/analytics-cache";

interface IssueLifecycleSectionProps {
  data: AnalyticsResponse["issueLifecycle"];
  timeRange: TimeRange;
}

export function IssueLifecycleSection({
  data,
  timeRange,
}: IssueLifecycleSectionProps) {
  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  const getStaleVariant = (
    percentage: number
  ): "success" | "warning" | "danger" => {
    if (percentage < 20) return "success";
    if (percentage < 40) return "warning";
    return "danger";
  };

  // Prepare bar chart data for issues created vs closed
  const issuesBarData = data.timeSeries.map((point) => ({
    name: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    Created: point.issuesCreated,
    Closed: point.issuesClosed,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue Lifecycle Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              title="Time to First Response"
              value={formatHours(data.medianTimeToFirstResponse)}
              description="Median time"
            />
            <StatTile
              title="Time to Resolution"
              value={formatHours(data.medianTimeToResolution)}
              description="Median time"
            />
            <StatTile
              title="Stale Issues (30+ days)"
              value={
                timeRange === "3months"
                  ? `${data.staleIssueRate.after30Days.toFixed(1)}%`
                  : "N/A"
              }
              description="Still open"
              variant={
                timeRange === "3months"
                  ? getStaleVariant(data.staleIssueRate.after30Days)
                  : "default"
              }
            />
            <StatTile
              title="Reopened Rate"
              value={`${data.reopenedIssueRate.toFixed(1)}%`}
              description="Closed then reopened"
            />
          </div>

          {/* Time Series Chart */}
          <TimeSeriesChart
            data={data.timeSeries}
            title="Response & Resolution Times"
          />

          {/* Issues Created vs Closed */}
          <BarChart
            data={issuesBarData}
            title="Issues Created vs Closed"
            dataKeys={[
              { key: "Created", name: "Created", colorVar: "primary" },
              { key: "Closed", name: "Closed", colorVar: "chart-2" },
            ]}
            yAxisLabel="Count"
          />
        </CardContent>
      </Card>
    </div>
  );
}
