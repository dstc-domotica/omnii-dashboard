import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { Heartbeat } from "@/lib/api";

interface HeartbeatChartsProps {
  heartbeats: Heartbeat[];
}

/**
 * Calculate statistics for latency data
 */
function calculateStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { mean, stdDev, min, max };
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

/**
 * AvailabilityTimeline - Shows uptime/downtime periods as a horizontal bar
 */
export function AvailabilityTimeline({ heartbeats }: HeartbeatChartsProps) {
  const segments = useMemo(() => {
    if (heartbeats.length === 0) return [];
    
    // Sort by timestamp ascending
    const sorted = [...heartbeats].sort((a, b) => a.timestamp - b.timestamp);
    
    // Expected heartbeat interval (60 seconds with some tolerance)
    const expectedInterval = 90 * 1000; // 90 seconds tolerance
    
    const result: Array<{
      start: number;
      end: number;
      status: "online" | "gap";
    }> = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      // Add online segment for this heartbeat
      const segmentEnd = next ? Math.min(current.timestamp + expectedInterval, next.timestamp) : current.timestamp + expectedInterval;
      
      result.push({
        start: current.timestamp,
        end: segmentEnd,
        status: "online",
      });
      
      // If there's a gap before the next heartbeat, add a gap segment
      if (next && next.timestamp - current.timestamp > expectedInterval) {
        result.push({
          start: segmentEnd,
          end: next.timestamp,
          status: "gap",
        });
      }
    }
    
    return result;
  }, [heartbeats]);

  if (heartbeats.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No heartbeat data available
      </div>
    );
  }

  const timeRange = segments.length > 0 
    ? { start: segments[0].start, end: segments[segments.length - 1].end }
    : { start: 0, end: 0 };
  const totalDuration = timeRange.end - timeRange.start;

  // Calculate uptime percentage
  const onlineTime = segments
    .filter(s => s.status === "online")
    .reduce((acc, s) => acc + (s.end - s.start), 0);
  const uptimePercent = totalDuration > 0 ? (onlineTime / totalDuration) * 100 : 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{formatTime(timeRange.start)}</span>
        <span className="font-medium">
          Uptime: {uptimePercent.toFixed(1)}%
        </span>
        <span>{formatTime(timeRange.end)}</span>
      </div>
      
      <div className="h-6 rounded-md overflow-hidden flex bg-muted">
        {segments.map((segment, i) => {
          const width = totalDuration > 0 
            ? ((segment.end - segment.start) / totalDuration) * 100 
            : 0;
          
          return (
            <div
              key={i}
              className={`h-full transition-colors ${
                segment.status === "online" 
                  ? "bg-green-500" 
                  : "bg-red-500/60"
              }`}
              style={{ width: `${width}%` }}
              title={`${segment.status === "online" ? "Online" : "Gap"}: ${formatTime(segment.start)} - ${formatTime(segment.end)}`}
            />
          );
        })}
      </div>
      
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-500/60" />
          <span>Gap/Offline</span>
        </div>
      </div>
    </div>
  );
}

/**
 * LatencyChart - Shows latency over time with mean line and deviation bands
 */
export function LatencyChart({ heartbeats }: HeartbeatChartsProps) {
  const { chartData, stats } = useMemo(() => {
    // Filter heartbeats with valid latency data and sort by timestamp
    const withLatency = heartbeats
      .filter(h => h.latencyMs !== null && h.latencyMs > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (withLatency.length === 0) {
      return { chartData: [], stats: { mean: 0, stdDev: 0, min: 0, max: 0 } };
    }
    
    const latencyValues = withLatency.map(h => h.latencyMs as number);
    const stats = calculateStats(latencyValues);
    
    const chartData = withLatency.map(h => ({
      timestamp: h.timestamp,
      time: formatTime(h.timestamp),
      latency: h.latencyMs,
      isAnomaly: h.latencyMs !== null && Math.abs(h.latencyMs - stats.mean) > 2 * stats.stdDev,
    }));
    
    return { chartData, stats };
  }, [heartbeats]);

  if (chartData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No latency data available yet
      </div>
    );
  }

  const normalLower = Math.max(0, stats.mean - 2 * stats.stdDev);
  const normalUpper = stats.mean + 2 * stats.stdDev;
  const anomalyCount = chartData.filter(d => d.isAnomaly).length;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>Mean: <span className="font-medium text-foreground">{stats.mean.toFixed(0)}ms</span></span>
          <span>Min: <span className="font-medium text-foreground">{stats.min}ms</span></span>
          <span>Max: <span className="font-medium text-foreground">{stats.max}ms</span></span>
        </div>
        {anomalyCount > 0 && (
          <span className="text-yellow-600 dark:text-yellow-400">
            {anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"}
          </span>
        )}
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {/* Normal range band */}
            <ReferenceArea
              y1={normalLower}
              y2={normalUpper}
              fill="var(--chart-3)"
              fillOpacity={0.1}
            />
            
            {/* Mean line */}
            <ReferenceLine
              y={stats.mean}
              stroke="var(--chart-4)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
            
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value: number, name: string) => [
                `${value}ms`,
                "Latency"
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="latency"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isAnomaly) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="var(--destructive)"
                      stroke="var(--destructive)"
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={2}
                    fill="var(--chart-1)"
                    stroke="var(--chart-1)"
                  />
                );
              }}
              activeDot={{ r: 5, fill: "var(--chart-2)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[var(--chart-1)]" />
          <span>Latency</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[var(--chart-4)] opacity-70" style={{ borderStyle: "dashed" }} />
          <span>Mean</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[var(--destructive)]" />
          <span>Anomaly (±2σ)</span>
        </div>
      </div>
    </div>
  );
}
