/* ── Earth Trend Explorer – shared types ── */

export type VariableId = 'temperature' | 'precipitation' | 'vegetation';

export interface Variable {
  id: VariableId;
  label: string;
  icon: string;
  unit: string;
  colorNeg: string;
  colorNeu: string;
  colorPos: string;
  labelNeg: string;
  labelPos: string;
}

export interface TrendResult {
  trend: number;
  unit: string;
  pValue: number;
  significant: boolean;
}

export interface RegionData {
  name: string;
  iso: string;
  trend: number;
  pValue: number;
  significant: boolean;
}

export interface TimeSeriesPoint {
  year: number;
  value: number;
}

export interface SummaryMetrics {
  globalTrend: number;
  globalUnit: string;
  significantAreaPct: number;
  strongestIncrease: { name: string; value: number };
  strongestDecrease: { name: string; value: number };
}

export interface StructuredQuery {
  intent: 'trend' | 'comparison' | 'extreme' | 'minimum' | 'location' | 'relationship' | 'significance' | 'time';
  operation: string;
  variable: VariableId;
  variable2?: VariableId;
  timeStart: number;
  timeEnd: number;
  geography: {
    level: 'global' | 'continent' | 'country' | 'state' | 'region' | 'local';
    parent?: string;
    entities?: string[];
  };
}

export interface PlaygroundResult {
  query: StructuredQuery;
  headline: string;
  explanation: string;
  methodology: {
    dataset: string;
    period: string;
    method: string;
    significance: string;
  };
  regions: RegionData[];
  timeSeries: TimeSeriesPoint[];
  highlightedRegion?: string;
  mapType: 'choropleth' | 'highlight' | 'scatter';
  chartType: 'line' | 'bar' | 'scatter';
}
