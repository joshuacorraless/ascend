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
  data: Array<Record<string, string | number>>;
  xKey: string;
  lines: ChartLine[];
  height?: number;
  xFormatter?: (value: string) => string;
  unit?: string;
}

const AXIS_TICK = { fontSize: 11, fill: '#B5B5B5' };

export function SimpleLineChart({
  data,
  xKey,
  lines,
  height = 220,
  xFormatter,
  unit,
}: SimpleLineChartProps) {
  const primary = lines[0];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          {primary && (
            <linearGradient id={`area-${primary.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity={0.35} />
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
          unit={unit}
        />
        <Tooltip
          cursor={{ stroke: '#FFFFFF', strokeOpacity: 0.2 }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #565656',
            background: '#474747',
            color: '#F5F5F5',
            fontSize: 12,
            boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)',
          }}
          labelStyle={{ color: '#B5B5B5' }}
          labelFormatter={(v) => (xFormatter ? xFormatter(String(v)) : String(v))}
        />
        {primary && (
          <Area
            type="monotone"
            dataKey={primary.key}
            stroke="none"
            fill={`url(#area-${primary.key})`}
            isAnimationActive={false}
            connectNulls
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
            dot={false}
            activeDot={{ r: 4, fill: l.color, stroke: '#3C3C3C', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
