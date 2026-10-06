/* ── TrendChart – Recharts time series ── */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import type { TimeSeriesPoint, RegionData } from '../types';
import type { VariableId } from '../types';
import { VARIABLES } from '../variables';

interface LineProps {
  type: 'line';
  data: TimeSeriesPoint[];
  variable: VariableId;
  label?: string;
}

interface BarProps {
  type: 'bar';
  data: RegionData[];
  variable: VariableId;
}

interface ScatterProps {
  type: 'scatter';
  data: { x: number; y: number; name: string }[];
  variable: VariableId;
  xLabel?: string;
  yLabel?: string;
}

type Props = LineProps | BarProps | ScatterProps;

const CustomTooltipStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '0.7rem',
  background: '#1a1a1a',
  color: '#f5f3ef',
  padding: '6px 10px',
  border: 'none',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export default function TrendChart(props: Props) {
  const varConfig = VARIABLES[props.variable];

  if (props.type === 'line') {
    const { data, label } = props;
    /* Compute a tight Y domain so the trend is actually visible */
    const values = data.map((d) => d.value);
    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const padding = Math.max((yMax - yMin) * 0.15, 0.01);
    return (
      <div className="chart-container">
        <div className="card__title">{label ?? 'Time Series'}</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={[
                Math.floor((yMin - padding) * 100) / 100,
                Math.ceil((yMax + padding) * 100) / 100,
              ]}
              label={{
                value: varConfig.unit,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: '#6b6b6b', fontFamily: "'Space Mono', monospace" },
              }}
            />
            <Tooltip
              contentStyle={CustomTooltipStyle}
              formatter={(value: any) => [Number(value).toFixed(4), varConfig.label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={varConfig.colorPos}
              strokeWidth={2}
              dot={{ r: 2, fill: varConfig.colorPos }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (props.type === 'bar') {
    const { data } = props;
    const sorted = [...data].sort((a, b) => b.trend - a.trend).slice(0, 15);
    return (
      <div className="chart-container">
        <div className="card__title">Comparison</div>
        <ResponsiveContainer width="100%" height={Math.max(240, sorted.length * 28)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 5, right: 20, bottom: 5, left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10 }}
              width={95}
            />
            <Tooltip
              contentStyle={CustomTooltipStyle}
              formatter={(value: any) => [Number(value).toFixed(4), 'Trend']}
            />
            <Bar dataKey="trend" barSize={16}>
              {sorted.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.trend > 0 ? varConfig.colorPos : varConfig.colorNeg}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (props.type === 'scatter') {
    const { data, xLabel, yLabel } = props;
    return (
      <div className="chart-container">
        <div className="card__title">Relationship</div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel ?? 'X'}
              tick={{ fontSize: 11 }}
              label={{ value: xLabel ?? 'X', position: 'bottom', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel ?? 'Y'}
              tick={{ fontSize: 11 }}
              label={{ value: yLabel ?? 'Y', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={CustomTooltipStyle}
              formatter={(value: any) => Number(value).toFixed(4)}
            />
            <Scatter data={data} fill={varConfig.colorPos}>
              {data.map((_entry, index) => (
                <Cell key={index} fill={varConfig.colorPos} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
