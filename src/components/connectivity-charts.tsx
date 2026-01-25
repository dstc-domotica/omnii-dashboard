import { useMemo } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import type { ConnectivityCheck } from "@/lib/api";

interface ConnectivitySummaryProps {
	checks: ConnectivityCheck[];
}

interface ConnectivityLatencyChartProps {
	checks: ConnectivityCheck[];
	target: string;
	label: string;
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatStatus(status: string): string {
	switch (status) {
		case "reachable":
			return "Reachable";
		case "timeout":
			return "Timeout";
		case "unreachable":
			return "Unreachable";
		default:
			return status;
	}
}

export function ConnectivitySummary({ checks }: ConnectivitySummaryProps) {
	const { latestByTarget, latestWithIp } = useMemo(() => {
		if (checks.length === 0) {
			return { latestByTarget: [], latestWithIp: null };
		}

		const sorted = [...checks].sort((a, b) => b.timestamp - a.timestamp);
		const map = new Map<string, ConnectivityCheck>();
		for (const check of sorted) {
			if (!map.has(check.target)) {
				map.set(check.target, check);
			}
		}

		const latestIp = sorted.find((check) => check.publicIp);

		return {
			latestByTarget: Array.from(map.values()),
			latestWithIp: latestIp ?? null,
		};
	}, [checks]);

	if (checks.length === 0) {
		return (
			<div className="text-sm text-muted-foreground text-center py-4">
				No connectivity data available
			</div>
		);
	}

	return (
		<div className="space-y-3 text-sm">
			{latestWithIp && (
				<div className="grid gap-2 sm:grid-cols-2">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Public IP:</span>
						<span>{latestWithIp.publicIp}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">ISP/ASN:</span>
						<span>
							{latestWithIp.ipIsp || "Unknown"}
							{latestWithIp.ipAsn ? ` (${latestWithIp.ipAsn})` : ""}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Location:</span>
						<span>
							{latestWithIp.ipCountry || "Unknown"}
							{latestWithIp.ipRegion ? `, ${latestWithIp.ipRegion}` : ""}
						</span>
					</div>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Last updated:</span>
						<span>{formatTime(latestWithIp.timestamp)}</span>
					</div>
				</div>
			)}

			<div className="space-y-2">
				{latestByTarget.map((check) => (
					<div key={check.target} className="flex justify-between">
						<span className="text-muted-foreground">{check.target}:</span>
						<span>
							{formatStatus(check.status)}
							{check.latencyMs ? ` (${check.latencyMs}ms)` : ""}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function ConnectivityLatencyChart({
	checks,
	target,
	label,
}: ConnectivityLatencyChartProps) {
	const chartData = useMemo(() => {
		return checks
			.filter((check) => check.target === target && check.latencyMs)
			.sort((a, b) => a.timestamp - b.timestamp)
			.map((check) => ({
				time: formatTime(check.timestamp),
				latency: check.latencyMs,
			}));
	}, [checks, target]);

	if (chartData.length === 0) {
		return (
			<div className="text-sm text-muted-foreground text-center py-4">
				No latency data for {label}
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="h-40 min-w-0">
				<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
					<LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
							formatter={(value: number) => [`${value}ms`, "Latency"]}
							labelFormatter={(labelValue) => `Time: ${labelValue}`}
						/>
						<Line
							type="monotone"
							dataKey="latency"
							stroke="var(--chart-2)"
							strokeWidth={2}
							dot={{ r: 2 }}
							activeDot={{ r: 4 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
