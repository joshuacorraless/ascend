import { useId } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartLine {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
  width?: number;
}

interface SimpleLineChartProps {
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  lines: ChartLine[];
  height?: number;
  xFormatter?: (value: string) => string;
  unit?: string;
  integer?: boolean;
  connectNulls?: boolean;
  showDots?: boolean;
  tooltipValueFormatter?: (
    value: string | number,
    key: string,
    point: Record<string, string | number | null>,
  ) => string;
}

const AXIS_TICK = { fontSize: 11, fill: '#B5B5B5' };

export function SimpleLineChart({
  data,
  xKey,
  lines,
  height = 220,
  xFormatter,
  unit,
  integer = false,
  connectNulls = true,
  showDots = false,
  tooltipValueFormatter,
}: SimpleLineChartProps) {
  const primary = lines[0];
  const gradientId = `chart-${useId().replace(/:/g, '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {primary && (
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={primary.color} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid
          strokeDasharray="2 5"
          stroke="#FFFFFF"
          strokeOpacity={0.08}
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickFormatter={xFormatter}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={['auto', 'auto']}
          allowDecimals={!integer}
        />
        <Tooltip
          cursor={{ stroke: '#FFFFFF', strokeOpacity: 0.2 }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #35433C',
            background: '#1B241F',
            color: '#F5F5F5',
            fontSize: 12,
            boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)',
          }}
          labelStyle={{ color: '#B5B5B5' }}
          labelFormatter={(v) => (xFormatter ? xFormatter(String(v)) : String(v))}
          formatter={
            tooltipValueFormatter
              ? (value, name, entry) => [
                  tooltipValueFormatter(
                    Array.isArray(value) ? value.join(' · ') : value,
                    String(entry.dataKey),
                    entry.payload as Record<string, string | number | null>,
                  ),
                  name,
                ]
              : undefined
          }
        />
        {primary && (
          <Area
            type="monotone"
            dataKey={primary.key}
            stroke="none"
            fill={`url(#${gradientId})`}
            tooltipType="none"
            isAnimationActive={false}
            connectNulls={connectNulls}
          />
        )}
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={l.width ?? 2.5}
            strokeDasharray={l.dashed ? '5 4' : undefined}
            dot={showDots || data.length < 2 ? { r: 3, fill: l.color } : false}
            unit={tooltipValueFormatter ? undefined : unit}
            activeDot={{ r: 4, fill: l.color, stroke: '#121A16', strokeWidth: 2 }}
            connectNulls={connectNulls}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
