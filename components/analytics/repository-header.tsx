'use client';

import { SiGithub } from 'react-icons/si';
import { ExternalLink } from 'lucide-react';
import { TimeRangeSelector } from './time-range-selector';
import type { TimeRange } from '@/utils/analytics-cache';

interface RepositoryHeaderProps {
  fullName: string;
  stars: number;
  forks: number;
  url: string;
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
}

export function RepositoryHeader({
  fullName,
  stars,
  forks,
  url,
  timeRange,
  onTimeRangeChange,
}: RepositoryHeaderProps) {
  return (
    <div className="border-b pb-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <SiGithub className="size-8 text-foreground" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">{fullName}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{stars.toLocaleString()} stars</span>
              <span>{forks.toLocaleString()} forks</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View on GitHub
            <ExternalLink className="size-4" />
          </a>
          <TimeRangeSelector currentValue={timeRange} onValueChange={onTimeRangeChange} />
        </div>
      </div>
    </div>
  );
}

