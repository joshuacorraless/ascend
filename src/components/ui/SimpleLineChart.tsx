import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartLine {
  key: string;
  name: string;
  color: string;
  /** Línea punteada (p. ej. para medias). */
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

const AXIS_TICK = { fontSize: 11, fill: '#9ca3af' };

export function SimpleLineChart({
  data,
  xKey,
  lines,
  height = 220,
  xFormatter,
  unit,
}: SimpleLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.18} vertical={false} />
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
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #3f3f46',
            background: '#18181b',
            color: '#fafafa',
            fontSize: 12,
          }}
          labelFormatter={(v) => (xFormatter ? xFormatter(String(v)) : String(v))}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={l.width ?? 2}
            strokeDasharray={l.dashed ? '5 4' : undefined}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
