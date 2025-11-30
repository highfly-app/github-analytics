'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

interface DonutChartDataPoint {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutChartDataPoint[];
  title?: string;
  colorVar?: string;
  colors?: string[]; // Optional: explicit colors for each segment
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

export function DonutChart({ data, title, colors: providedColors }: DonutChartProps) {
  const foregroundColor = useMemo(() => getCSSVariableColor('foreground'), []);

  // Use provided colors or generate from semantic variables
  const colors = useMemo(() => {
    if (providedColors && providedColors.length > 0) {
      return providedColors.map((color) => {
        // If it's a CSS variable name, get the computed value, otherwise use as-is
        if (color.startsWith('--') || (!color.startsWith('#') && !color.startsWith('rgb'))) {
          return getCSSVariableColor(color);
        }
        return color;
      });
    }
    // Default: use semantic color variables
    const colorVars = ['primary', 'secondary', 'accent', 'destructive', 'muted'];
    return data.map((_, index) => getCSSVariableColor(colorVars[index % colorVars.length]));
  }, [data, providedColors]);

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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={80}
              innerRadius={50}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ color: foregroundColor }}
              iconType="circle"
              formatter={(value) => {
                const item = data.find((d) => d.name === value);
                return item ? `${value}: ${item.value}` : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

