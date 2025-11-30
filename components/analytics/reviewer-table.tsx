'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Reviewer {
  username: string;
  prsReviewed: number;
  avgTimeToFirstReview: number;
  approvals: number;
  changesRequested: number;
  commentsOnly: number;
}

interface ReviewerTableProps {
  reviewers: Reviewer[];
  title?: string;
}

export function ReviewerTable({ reviewers, title = 'Top Reviewers' }: ReviewerTableProps) {
  if (reviewers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No reviewers found</p>
        </CardContent>
      </Card>
    );
  }

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead className="text-right">PRs Reviewed</TableHead>
              <TableHead className="text-right">Avg Time</TableHead>
              <TableHead className="text-right">Approvals</TableHead>
              <TableHead className="text-right">Changes Requested</TableHead>
              <TableHead className="text-right">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviewers.map((reviewer) => (
              <TableRow key={reviewer.username}>
                <TableCell className="font-medium">{reviewer.username}</TableCell>
                <TableCell className="text-right">{reviewer.prsReviewed}</TableCell>
                <TableCell className="text-right">
                  {formatHours(reviewer.avgTimeToFirstReview)}
                </TableCell>
                <TableCell className="text-right">{reviewer.approvals}</TableCell>
                <TableCell className="text-right">{reviewer.changesRequested}</TableCell>
                <TableCell className="text-right">{reviewer.commentsOnly}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

