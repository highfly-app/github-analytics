'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeRange } from '@/utils/analytics-cache';

const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '1week', label: '1 Week' },
  { value: '1month', label: '1 Month' },
  { value: '3months', label: '3 Months' },
];

interface TimeRangeSelectorProps {
  currentValue: TimeRange;
  onValueChange?: (value: TimeRange) => void;
}

export function TimeRangeSelector({ currentValue, onValueChange }: TimeRangeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (value: string) => {
    const timeRange = value as TimeRange;
    if (onValueChange) {
      onValueChange(timeRange);
    } else {
      // Update URL query param
      const params = new URLSearchParams(searchParams.toString());
      params.set('timeRange', timeRange);
      router.push(`?${params.toString()}`);
    }
  };

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {timeRangeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

