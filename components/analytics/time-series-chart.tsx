"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

// Helper to get CSS variable color value
function getCSSVariableColor(varName: string): string {
  if (typeof window === "undefined") {
    return "#888"; // Fallback for SSR
  }
  const root = document.documentElement;
  const fullVarName = varName.startsWith("--") ? varName : `--${varName}`;
  const value = getComputedStyle(root).getPropertyValue(fullVarName).trim();
  return value || "#888";
}

interface TimeSeriesDataPoint {
  date: string;
  medianTimeToFirstResponse: number;
  medianTimeToResolution: number;
  issuesCreated: number;
  issuesClosed: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
}

export function TimeSeriesChart({
  data,
  title = "Time Series",
}: TimeSeriesChartProps) {
  const primaryColor = useMemo(() => getCSSVariableColor("primary"), []);
  const secondaryColor = useMemo(() => getCSSVariableColor("chart-2"), []);
  const foregroundColor = useMemo(() => getCSSVariableColor("foreground"), []);
  const borderColor = useMemo(() => getCSSVariableColor("border"), []);

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

  const chartData = data.map((point) => ({
    ...point,
    dateLabel: format(parseISO(point.date), "MMM d"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={borderColor}
              opacity={0.3}
            />
            <XAxis
              dataKey="dateLabel"
              className="text-xs"
              tick={{ fill: foregroundColor, fontSize: 12 }}
              stroke={borderColor}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: foregroundColor, fontSize: 12 }}
              stroke={borderColor}
            />
            <Tooltip
              cursor={{
                stroke: "hsl(var(--primary))",
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                color: "hsl(var(--popover-foreground))",
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                padding: "0.75rem",
              }}
              labelStyle={{
                color: "hsl(var(--popover-foreground))",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
              itemStyle={{
                color: "hsl(var(--popover-foreground))",
                padding: "0.25rem 0",
              }}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
            <Line
              type="monotone"
              dataKey="medianTimeToFirstResponse"
              stroke={primaryColor}
              strokeWidth={2}
              name="Time to First Response (hrs)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="medianTimeToResolution"
              stroke={secondaryColor}
              strokeWidth={2}
              name="Time to Resolution (hrs)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
