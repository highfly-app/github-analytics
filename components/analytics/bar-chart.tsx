'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

interface BarChartDataPoint {
  name: string;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  title?: string;
  dataKeys: Array<{ key: string; name: string; colorVar?: string }>;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

// Helper to get CSS variable color value
function getCSSVariableColor(varName: string): string {
  if (typeof window === 'undefined') {
    return '#888'; // Fallback for SSR
  }
  const root = document.documentElement;
  const fullVarName = varName.startsWith('--') ? varName : `--${varName}`;
  const value = getComputedStyle(root).getPropertyValue(fullVarName).trim();
  return value || '#888';
}

export function BarChart({ data, title, dataKeys, xAxisLabel, yAxisLabel }: BarChartProps) {
  // Map chart variable names to actual colors using semantic variables
  const colors = useMemo(() => {
    const semanticColors = ['primary', 'secondary', 'accent', 'destructive', 'muted'];
    return dataKeys.map((dataKey, index) => {
      const varName = dataKey.colorVar || semanticColors[index % semanticColors.length];
      return getCSSVariableColor(varName);
    });
  }, [dataKeys]);

  // Get foreground color for axis labels
  const foregroundColor = useMemo(() => getCSSVariableColor('foreground'), []);
  const borderColor = useMemo(() => getCSSVariableColor('border'), []);
  const mutedColor = useMemo(() => getCSSVariableColor('muted'), []);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">No data available</p>
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
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={borderColor} opacity={0.3} />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fill: foregroundColor, fontSize: 12 }}
              stroke={borderColor}
              label={
                xAxisLabel
                  ? {
                       value: xAxisLabel,
                       position: 'insideTop',
                       offset: 30,
                       fill: foregroundColor,
                    }
                  : undefined
              }
              height={xAxisLabel && dataKeys.length > 1 ? 50 : 40}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: foregroundColor, fontSize: 12 }}
              stroke={borderColor}
              label={
                yAxisLabel
                  ? {
                       value: yAxisLabel,
                       angle: -90,
                       position: 'insideLeft',
                       fill: foregroundColor,
                    }
                  : undefined
              }
            />
            <Tooltip
              cursor={{ fill: mutedColor }}
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                color: 'hsl(var(--popover-foreground))',
                boxShadow:
                  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                padding: '0.75rem',
              }}
              labelStyle={{
                color: 'hsl(var(--popover-foreground))',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
              itemStyle={{
                color: 'hsl(var(--popover-foreground))',
                padding: '0.25rem 0',
              }}
            />
            {dataKeys.length > 1 && (
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            )}
            {dataKeys.map(({ key, name }, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={name}
                fill={colors[index]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

