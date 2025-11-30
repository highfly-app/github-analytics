'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HorizontalBarChart } from './horizontal-bar-chart';
import { cn } from '@/lib/utils';
import type { AnalyticsResponse } from '@/app/api/analytics/github/route';

interface BacklogHealthSectionProps {
  data: AnalyticsResponse['backlogHealth'];
}

export function BacklogHealthSection({ data }: BacklogHealthSectionProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[hsl(var(--secondary))]';
    if (score >= 40) return 'text-[hsl(var(--accent))]';
    return 'text-[hsl(var(--destructive))]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-[hsl(var(--secondary))]/10 border-[hsl(var(--secondary))]/20';
    if (score >= 40) return 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]/20';
    return 'bg-[hsl(var(--destructive))]/10 border-[hsl(var(--destructive))]/20';
  };

  // Issues by age
  const issuesByAgeData = [
    { name: '0-30 days', Count: data.issues.byAge['0-30'] },
    { name: '31-60 days', Count: data.issues.byAge['31-60'] },
    { name: '61-90 days', Count: data.issues.byAge['61-90'] },
    { name: '90+ days', Count: data.issues.byAge['90+'] },
  ];

  // PRs by age
  const prsByAgeData = [
    { name: '0-7 days', Count: data.pullRequests.byAge['0-7'] },
    { name: '8-14 days', Count: data.pullRequests.byAge['8-14'] },
    { name: '15-30 days', Count: data.pullRequests.byAge['15-30'] },
    { name: '30+ days', Count: data.pullRequests.byAge['30+'] },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backlog Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <Card className={cn(getScoreBgColor(data.score))}>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                <p className={cn('text-6xl font-bold', getScoreColor(data.score))}>
                  {Math.round(data.score)}
                </p>
                <p className="text-lg font-semibold">{data.label}</p>
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                    Measures backlog quality based on stale issues, unlabeled issues,
                    orphan issues (no assignee/PR), stale PRs, and PRs without reviews.
                    <span className="block mt-1.5 space-x-2">
                      <span className="font-semibold">0-39 = Overloaded</span> •{' '}
                      <span className="font-semibold">40-69 = Needs Attention</span> •{' '}
                      <span className="font-semibold">70-100 = Healthy</span>
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues Breakdown */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Open Issues</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.issues.totalOpen}</p>
                  <p className="text-xs text-muted-foreground">Total Open</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.issues.unlabeled}</p>
                  <p className="text-xs text-muted-foreground">
                    Unlabeled ({data.issues.unlabeledPercentage.toFixed(1)}%)
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.issues.orphan}</p>
                  <p className="text-xs text-muted-foreground">
                    Orphan ({data.issues.orphanPercentage.toFixed(1)}%)
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.issues.byAge['90+']}</p>
                  <p className="text-xs text-muted-foreground">90+ days old</p>
                </div>
              </div>
              <HorizontalBarChart
                data={issuesByAgeData}
                title="Issues by Age"
                dataKeys={[{ key: 'Count', name: 'Issues', colorVar: 'chart-2' }]}
                xAxisLabel="Number of Issues"
              />
            </div>
          </div>

          {/* PRs Breakdown */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Open Pull Requests</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.pullRequests.totalOpen}</p>
                  <p className="text-xs text-muted-foreground">Total Open</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.pullRequests.withoutReview}</p>
                  <p className="text-xs text-muted-foreground">
                    Without Review ({data.pullRequests.withoutReviewPercentage.toFixed(1)}
                    %)
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.pullRequests.byAge['30+']}</p>
                  <p className="text-xs text-muted-foreground">30+ days old</p>
                </div>
              </div>
              <HorizontalBarChart
                data={prsByAgeData}
                title="PRs by Age"
                dataKeys={[{ key: 'Count', name: 'PRs', colorVar: 'chart-2' }]}
                xAxisLabel="Number of PRs"
                yAxisLabel="Age Range"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

