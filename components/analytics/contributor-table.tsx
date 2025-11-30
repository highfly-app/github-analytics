"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Contributor {
  username: string;
  commits: number;
  additions: number;
  deletions: number;
  netLines: number;
}

interface ContributorTableProps {
  contributors: Contributor[];
  title?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function ContributorTable({
  contributors,
  title = "Top Contributors",
}: ContributorTableProps) {
  if (contributors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No contributors found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contributor</TableHead>
              <TableHead className="text-right">Commits</TableHead>
              <TableHead className="text-right">Lines Added</TableHead>
              <TableHead className="text-right">Lines Removed</TableHead>
              <TableHead className="text-right">Net Lines</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contributors.map((contributor) => (
              <TableRow key={contributor.username}>
                <TableCell className="font-medium">
                  {contributor.username}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(contributor.commits)}
                </TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">
                  +{formatNumber(contributor.additions)}
                </TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400">
                  -{formatNumber(contributor.deletions)}
                </TableCell>
                <TableCell className="text-right">
                  {contributor.netLines >= 0 ? (
                    <span className="text-green-600 dark:text-green-400">
                      +{formatNumber(contributor.netLines)}
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      {formatNumber(contributor.netLines)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
