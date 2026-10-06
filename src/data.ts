/* ── Real NASA POWER Data Engine ──
 *
 * This module loads pre-fetched NASA POWER satellite/reanalysis data
 * (T2M temperature, PRECTOTCORR precipitation) for 104 countries and
 * computes real statistical trends using Sen's slope and Mann-Kendall.
 *
 * Data source: NASA POWER API — Monthly endpoint, aggregated to annual
 * Origin:      MERRA-2 reanalysis + CERES satellite observations
 * Period:      2000–2023 (24 years per country)
 * Fetched by:  scripts/fetch-nasa-data.ts
 */

import { analyzeTrend, detectAnomalies } from './science/statistics';
import type {
  VariableId,
  RegionData,
  TimeSeriesPoint,
  SummaryMetrics,
  StructuredQuery,
  PlaygroundResult,
} from './types';

/* ── Load real NASA data (bundled by Vite as static JSON) ── */
import rawNasaData from './data/nasa-climate.json';

interface NasaCountry {
  iso: string;
  name: string;
  lat: number;
  lon: number;
  temperature: { year: number; value: number }[];
  precipitation: { year: number; value: number }[];
}

const nasaData = rawNasaData as { countries: NasaCountry[] };

/* ── ISO → continent mapping for geographic filtering ── */
const CONTINENT_MAP: Record<string, string> = {
  AFG: 'Asia', ALB: 'Europe', DZA: 'Africa', AGO: 'Africa',
  ARG: 'South America', AUS: 'Oceania', AUT: 'Europe', BGD: 'Asia',
  BLR: 'Europe', BEL: 'Europe', BOL: 'South America', BWA: 'Africa',
  BRA: 'South America', BGR: 'Europe', KHM: 'Asia', CMR: 'Africa',
  CAN: 'North America', TCD: 'Africa', CHL: 'South America', CHN: 'Asia',
  COL: 'South America', COD: 'Africa', CRI: 'North America', HRV: 'Europe',
  CUB: 'North America', CZE: 'Europe', DNK: 'Europe', ECU: 'South America',
  EGY: 'Africa', ETH: 'Africa', FIN: 'Europe', FRA: 'Europe',
  DEU: 'Europe', GHA: 'Africa', GRC: 'Europe', GTM: 'North America',
  HUN: 'Europe', IND: 'Asia', IDN: 'Asia', IRN: 'Asia',
  IRQ: 'Asia', IRL: 'Europe', ISR: 'Asia', ITA: 'Europe',
  JPN: 'Asia', JOR: 'Asia', KAZ: 'Asia', KEN: 'Africa',
  LAO: 'Asia', LBY: 'Africa', MDG: 'Africa', MYS: 'Asia',
  MLI: 'Africa', MEX: 'North America', MNG: 'Asia', MAR: 'Africa',
  MOZ: 'Africa', MMR: 'Asia', NAM: 'Africa', NPL: 'Asia',
  NLD: 'Europe', NZL: 'Oceania', NER: 'Africa', NGA: 'Africa',
  NOR: 'Europe', OMN: 'Asia', PAK: 'Asia', PAN: 'North America',
  PNG: 'Oceania', PRY: 'South America', PER: 'South America', PHL: 'Asia',
  POL: 'Europe', PRT: 'Europe', ROU: 'Europe', RUS: 'Europe',
  SAU: 'Asia', SEN: 'Africa', SOM: 'Africa', ZAF: 'Africa',
  KOR: 'Asia', ESP: 'Europe', LKA: 'Asia', SDN: 'Africa',
  SWE: 'Europe', CHE: 'Europe', SYR: 'Asia', TZA: 'Africa',
  THA: 'Asia', TUN: 'Africa', TUR: 'Asia', TKM: 'Asia',
  UGA: 'Africa', UKR: 'Europe', ARE: 'Asia', GBR: 'Europe',
  USA: 'North America', URY: 'South America', UZB: 'Asia',
  VEN: 'South America', VNM: 'Asia', YEM: 'Asia', ZMB: 'Africa',
  ZWE: 'Africa',
};

export interface CountryEntry {
  name: string;
  iso: string;
  continent: string;
}

export const COUNTRIES: CountryEntry[] = nasaData.countries.map(c => ({
  iso: c.iso,
  name: c.name,
  continent: CONTINENT_MAP[c.iso] ?? 'Global',
}));

/* ── get raw time series for a country ── */
function getRawSeries(iso: string, variable: VariableId): { year: number; value: number }[] {
  const c = nasaData.countries.find(x => x.iso === iso);
  if (!c) return [];
  // Vegetation falls back to temperature since we don't have NDVI yet
  return variable === 'precipitation' ? c.precipitation : c.temperature;
}

/* ── compute global average time series (mean across all countries) ── */
function getGlobalSeries(variable: VariableId, startYear: number, endYear: number) {
  const yearMap: Record<number, { sum: number; count: number }> = {};

  nasaData.countries.forEach(c => {
    const series = variable === 'precipitation' ? c.precipitation : c.temperature;
    series.forEach(pt => {
      if (pt.year >= startYear && pt.year <= endYear) {
        if (!yearMap[pt.year]) yearMap[pt.year] = { sum: 0, count: 0 };
        yearMap[pt.year].sum += pt.value;
        yearMap[pt.year].count += 1;
      }
    });
  });

  const points: { year: number; value: number }[] = [];
  for (const [y, stats] of Object.entries(yearMap)) {
    if (stats.count > 0) {
      points.push({ year: parseInt(y), value: Math.round((stats.sum / stats.count) * 100) / 100 });
    }
  }
  points.sort((a, b) => a.year - b.year);
  return points;
}

/* ── compute real trend for a single country ── */
export function countryTrend(
  iso: string,
  variable: VariableId,
  startYear: number,
  endYear: number,
): RegionData {
  const series = getRawSeries(iso, variable).filter(p => p.year >= startYear && p.year <= endYear);
  const years = series.map(p => p.year);
  const values = series.map(p => p.value);
  const trend = analyzeTrend(years, values);
  const country = COUNTRIES.find(c => c.iso === iso);

  return {
    name: country?.name ?? iso,
    iso,
    trend: trend.slopePerDecade,
    pValue: trend.pValue,
    significant: trend.significant,
  };
}

/* ── compute trends for all countries ── */
export function allCountryTrends(
  variable: VariableId,
  startYear: number,
  endYear: number,
  continent?: string,
): RegionData[] {
  let list = COUNTRIES;
  if (continent) {
    list = list.filter(c => c.continent.toLowerCase() === continent.toLowerCase());
  }
  return list.map(c => countryTrend(c.iso, variable, startYear, endYear));
}

/* ── get time series (country or global) ── */
export function timeSeries(
  iso: string | null,
  variable: VariableId,
  startYear: number,
  endYear: number,
): TimeSeriesPoint[] {
  if (!iso) {
    return getGlobalSeries(variable, startYear, endYear);
  }
  const series = getRawSeries(iso, variable).filter(p => p.year >= startYear && p.year <= endYear);
  return series.map(p => ({ year: p.year, value: Math.round(p.value * 100) / 100 }));
}

/* ── get anomalies for a country ── */
export function countryAnomalies(
  iso: string,
  variable: VariableId,
  startYear: number,
  endYear: number,
) {
  const series = getRawSeries(iso, variable).filter(p => p.year >= startYear && p.year <= endYear);
  return detectAnomalies(
    series.map(p => p.year),
    series.map(p => p.value),
    startYear,
    Math.min(startYear + 10, endYear),
  );
}

/* ── summary metrics ── */
export function summaryMetrics(
  variable: VariableId,
  startYear: number,
  endYear: number,
): SummaryMetrics {
  const all = allCountryTrends(variable, startYear, endYear);
  const sorted = [...all].sort((a, b) => b.trend - a.trend);
  const sigCount = all.filter(r => r.significant).length;

  const global = getGlobalSeries(variable, startYear, endYear);
  const globalTrend = analyzeTrend(global.map(g => g.year), global.map(g => g.value));

  return {
    globalTrend: globalTrend.slopePerDecade,
    globalUnit: variable === 'precipitation' ? 'mm/yr per decade' : '°C per decade',
    significantAreaPct: Math.round((sigCount / all.length) * 100),
    strongestIncrease: { name: sorted[0]?.name ?? '', value: sorted[0]?.trend ?? 0 },
    strongestDecrease: {
      name: sorted[sorted.length - 1]?.name ?? '',
      value: sorted[sorted.length - 1]?.trend ?? 0,
    },
  };
}

/* ── dataset names ── */
const DATASET_NAMES: Record<VariableId, string> = {
  temperature: 'NASA POWER T2M (MERRA-2 Reanalysis)',
  precipitation: 'NASA POWER PRECTOTCORR (Satellite + Reanalysis)',
  vegetation: 'NASA POWER T2M (NDVI not yet integrated)',
};

/* ── NLP query parser ── */
export function parseQuestion(question: string): StructuredQuery {
  const q = question.toLowerCase();

  let variable: VariableId = 'temperature';
  if (q.includes('rain') || q.includes('precip')) variable = 'precipitation';
  if (q.includes('veget') || q.includes('green') || q.includes('ndvi')) variable = 'vegetation';

  let variable2: VariableId | undefined;
  if (q.includes('temperature') && (q.includes('vegetation') || q.includes('green'))) {
    variable = 'temperature';
    variable2 = 'vegetation';
  }

  const yearMatches = q.match(/\b(200\d|201\d|202[0-3])\b/g);
  let timeStart = 2000;
  let timeEnd = 2023;
  if (yearMatches && yearMatches.length >= 2) {
    timeStart = parseInt(yearMatches[0]);
    timeEnd = parseInt(yearMatches[1]);
  } else if (yearMatches && yearMatches.length === 1) {
    timeStart = parseInt(yearMatches[0]);
  }

  let intent: StructuredQuery['intent'] = 'trend';
  let operation = 'trend';
  if (q.includes('compar')) { intent = 'comparison'; operation = 'comparison'; }
  if (q.includes('most') || q.includes('largest') || q.includes('greatest') || q.includes('fastest') || q.includes('highest')) {
    intent = 'extreme'; operation = 'maximum_trend';
  }
  if (q.includes('least') || q.includes('lowest') || q.includes('smallest')) {
    intent = 'minimum'; operation = 'minimum_trend';
  }
  if (q.includes('relat') || q.includes('correlat') || q.includes('while')) {
    intent = 'relationship'; operation = 'correlation';
  }
  if (q.includes('signific')) { intent = 'significance'; operation = 'significance_test'; }
  if (q.includes('anomal')) { intent = 'trend'; operation = 'anomaly_detection'; }

  let level: StructuredQuery['geography']['level'] = 'global';
  let parent: string | undefined;
  const entities: string[] = [];

  const continents = ['africa', 'asia', 'europe', 'north america', 'south america', 'oceania'];
  for (const c of continents) {
    if (q.includes(c)) {
      parent = c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      level = 'country';
    }
  }

  for (const country of COUNTRIES) {
    if (q.includes(country.name.toLowerCase())) {
      entities.push(country.name);
      level = 'country';
    }
  }

  if (entities.length >= 2) intent = 'comparison';
  if (entities.length === 1 && intent === 'trend') intent = 'location';
  if (q.includes('countr')) level = 'country';

  return {
    intent,
    operation,
    variable,
    variable2,
    timeStart,
    timeEnd,
    geography: { level, parent, entities: entities.length > 0 ? entities : undefined },
  };
}

/* ── execute a structured query ── */
export function executeQuery(query: StructuredQuery): PlaygroundResult {
  const { variable, timeStart, timeEnd, geography, intent } = query;
  const datasetName = DATASET_NAMES[variable];

  let regions = allCountryTrends(variable, timeStart, timeEnd, geography.parent);

  if (geography.entities && geography.entities.length > 0) {
    regions = regions.filter(r =>
      geography.entities!.some(e => r.name.toLowerCase() === e.toLowerCase()),
    );
  }

  const sorted = [...regions].sort((a, b) => b.trend - a.trend);
  let highlighted: string | undefined;
  let headline = '';
  let chartType: PlaygroundResult['chartType'] = 'line';

  const unitStr = variable === 'precipitation' ? 'mm/yr/decade' : '°C/decade';

  switch (intent) {
    case 'extreme':
      highlighted = sorted[0]?.iso;
      headline = `${variable === 'temperature' ? 'Temperature' : 'Precipitation'} increased most strongly in ${sorted[0]?.name}.`;
      break;
    case 'minimum':
      highlighted = sorted[sorted.length - 1]?.iso;
      headline = `${variable === 'temperature' ? 'Temperature' : 'Precipitation'} decreased most in ${sorted[sorted.length - 1]?.name}.`;
      break;
    case 'comparison':
      headline = `Comparing ${regions.map(r => r.name).join(' and ')}.`;
      chartType = 'bar';
      break;
    case 'relationship':
      headline = `Analyzing relationship between ${variable} and ${query.variable2 ?? 'selected variables'}.`;
      chartType = 'scatter';
      break;
    case 'location':
      highlighted = regions[0]?.iso;
      headline = `${regions[0]?.name}: ${regions[0]?.trend > 0 ? '+' : ''}${regions[0]?.trend} ${unitStr}.`;
      break;
    case 'significance':
      headline = `Significance analysis for the selected region and period.`;
      break;
    default: {
      const glob = summaryMetrics(variable, timeStart, timeEnd);
      headline = `Global ${variable} trend: ${glob.globalTrend > 0 ? '+' : ''}${glob.globalTrend} ${unitStr}.`;
    }
  }

  const ts =
    highlighted || (geography.entities && geography.entities.length === 1)
      ? timeSeries(
          highlighted ?? COUNTRIES.find(c => c.name === geography.entities?.[0])?.iso ?? null,
          variable,
          timeStart,
          timeEnd,
        )
      : timeSeries(null, variable, timeStart, timeEnd);

  const explanation = generateExplanation(query, regions, sorted);

  return {
    query,
    headline,
    explanation,
    methodology: {
      dataset: datasetName,
      period: `${timeStart}–${timeEnd}`,
      method: "Sen's slope estimator",
      significance: 'Mann-Kendall test (α = 0.05)',
    },
    regions: sorted,
    timeSeries: ts,
    highlightedRegion: highlighted,
    mapType: intent === 'relationship' ? 'scatter' : 'choropleth',
    chartType,
  };
}

function generateExplanation(
  query: StructuredQuery,
  regions: RegionData[],
  sorted: RegionData[],
): string {
  const varLabel = query.variable.charAt(0).toUpperCase() + query.variable.slice(1);

  switch (query.intent) {
    case 'extreme':
      return `The ${DATASET_NAMES[query.variable]} dataset shows ${sorted[0]?.name} experienced the strongest positive trend at ${sorted[0]?.trend > 0 ? '+' : ''}${sorted[0]?.trend} per decade over ${query.timeStart}–${query.timeEnd}. This trend is ${sorted[0]?.significant ? 'statistically significant (p < 0.05)' : 'not statistically significant'} based on the Mann-Kendall test.`;
    case 'minimum':
      return `${sorted[sorted.length - 1]?.name} showed the strongest negative trend at ${sorted[sorted.length - 1]?.trend} per decade. ${sorted[sorted.length - 1]?.significant ? 'This change is statistically significant.' : 'This change is not statistically significant.'}`;
    case 'comparison':
      return regions.map(r => `${r.name}: ${r.trend > 0 ? '+' : ''}${r.trend} per decade${r.significant ? ' (significant)' : ''}`).join('. ') + '.';
    case 'location':
      return `${varLabel} in ${regions[0]?.name} changed by ${regions[0]?.trend > 0 ? '+' : ''}${regions[0]?.trend} per decade over ${query.timeStart}–${query.timeEnd}. ${regions[0]?.significant ? 'This trend is statistically significant (p < 0.05).' : 'This trend is not statistically significant.'}`;
    case 'relationship':
      return `Correlation analysis between the selected variables. Note: correlation does not imply causation.`;
    default:
      return `Global analysis computed from real NASA POWER satellite/reanalysis data over ${query.timeStart}–${query.timeEnd}.`;
  }
}
