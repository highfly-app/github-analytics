'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from './stat-tile';
import { DonutChart } from './donut-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnalyticsResponse } from '@/app/api/analytics/github/route';

interface ContributorFrictionSectionProps {
  data: AnalyticsResponse['contributorFriction'];
}

export function ContributorFrictionSection({ data }: ContributorFrictionSectionProps) {
  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  // Prepare donut chart data for first-time vs returning
  const prCountData = [
    { name: 'First-time', value: data.firstTimePRs },
    { name: 'Returning', value: data.returningPRs },
  ];

  // Comparison data
  const comparisonData = [
    {
      'Metric': 'Merge Rate',
      'First-time': `${data.firstTimeMergeRate.toFixed(1)}%`,
      'Returning': `${data.returningMergeRate.toFixed(1)}%`,
    },
    {
      'Metric': 'Time to Review',
      'First-time': formatHours(data.firstTimeMedianTimeToReview),
      'Returning': formatHours(data.returningMedianTimeToReview),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contributor Friction</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Measures how easy it is for new contributors to contribute to your repository.
            Lower friction means more successful first-time contributions.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              title="First-time PRs"
              value={data.firstTimePRs}
              description="PRs from new contributors"
            />
            <StatTile
              title="Returning PRs"
              value={data.returningPRs}
              description="PRs from repeat contributors"
            />
            <StatTile
              title="First-time Merge Rate"
              value={`${data.firstTimeMergeRate.toFixed(1)}%`}
              description={`vs ${data.returningMergeRate.toFixed(1)}% returning`}
              variant={
                data.firstTimeMergeRate < data.returningMergeRate ? 'warning' : 'success'
              }
            />
            <StatTile
              title="Review Cycles"
              value={data.firstTimeMedianReviewCycles.toFixed(1)}
              description="Avg rounds of review for first-timers"
            />
          </div>

          {/* PR Count Donut Chart */}
          <DonutChart
            data={prCountData}
            title="First-time vs Returning Contributors"
            colors={['primary', 'chart-2']}
          />

          {/* Explanation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What These Metrics Mean</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">
                    First-time vs Returning PRs
                  </p>
                  <p>
                    Shows the ratio of new contributors to repeat contributors. A healthy
                    project has a good mix of both.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Merge Rate</p>
                  <p>
                    Percentage of PRs that get merged. If first-time contributors have a
                    lower merge rate than returning contributors, it suggests barriers for
                    newcomers (e.g., unclear contribution guidelines, strict review
                    process).
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Time to Review</p>
                  <p>
                    How long it takes for someone to review a PR. Longer wait times for
                    first-time contributors can discourage them from contributing again.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Review Cycles</p>
                  <p>
                    Number of times a PR needs changes requested. More cycles for
                    first-timers suggests unclear contribution guidelines or communication
                    issues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>First-time vs Returning Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">First-time</TableHead>
                    <TableHead className="text-right">Returning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((row) => (
                    <TableRow key={row.Metric}>
                      <TableCell className="font-medium">{row.Metric}</TableCell>
                      <TableCell className="text-right">{row['First-time']}</TableCell>
                      <TableCell className="text-right">{row['Returning']}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">First-time Issues Without PR</p>
                <p className="text-2xl font-bold">{data.firstTimeIssuesWithoutPR}</p>
                <p className="text-xs text-muted-foreground">
                  Issues created by first-time contributors that didn&apos;t result in a
                  PR. High numbers suggest contributors are asking questions but not
                  contributing code.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

