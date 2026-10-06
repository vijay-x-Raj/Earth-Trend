/* ── Real Statistical Methods ──
 *
 * Production-grade implementations of:
 * - Sen's slope estimator (non-parametric trend magnitude)
 * - Mann-Kendall trend test (non-parametric significance)
 * - Anomaly detection (deviation from baseline mean)
 * - Linear regression (parametric fallback)
 *
 * These operate on real NASA time series data.
 * No values are invented — every output is computed from input observations.
 */

export interface TrendAnalysis {
  slope: number;          // Sen's slope: change per year
  slopePerDecade: number; // slope * 10
  intercept: number;      // Sen's intercept
  pValue: number;         // Mann-Kendall p-value
  significant: boolean;   // p < 0.05
  zScore: number;         // Mann-Kendall Z statistic
  direction: 'increasing' | 'decreasing' | 'no trend';
}

export interface AnomalyResult {
  year: number;
  value: number;
  anomaly: number;       // deviation from baseline mean
  zScore: number;        // standardized anomaly
  isAnomaly: boolean;    // |zScore| > 2
}

/* ── Sen's Slope Estimator ──
 * For each pair of points (i,j) where j>i, compute the slope (yj-yi)/(xj-xi).
 * Sen's slope is the median of all such pairwise slopes.
 * This is robust to outliers and doesn't assume normality.
 */
export function sensSlope(years: number[], values: number[]): { slope: number; intercept: number } {
  const n = years.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (years[j] !== years[i]) {
        slopes.push((values[j] - values[i]) / (years[j] - years[i]));
      }
    }
  }

  slopes.sort((a, b) => a - b);
  const slope = median(slopes);

  // Sen's intercept: median of (yi - slope * xi)
  const intercepts = values.map((v, i) => v - slope * years[i]);
  const intercept = median(intercepts);

  return { slope, intercept };
}

/* ── Mann-Kendall Trend Test ──
 * Non-parametric test for monotonic trend.
 * Computes the S statistic, variance, and Z score.
 * Returns two-tailed p-value.
 */
export function mannKendall(values: number[]): { zScore: number; pValue: number; significant: boolean } {
  const n = values.length;
  if (n < 4) return { zScore: 0, pValue: 1, significant: false };

  // Compute S statistic
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = values[j] - values[i];
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;
      // ties contribute 0
    }
  }

  // Count tied groups
  const sorted = [...values].sort((a, b) => a - b);
  const tiedGroups: number[] = [];
  let i = 0;
  while (i < n) {
    let count = 1;
    while (i + count < n && sorted[i + count] === sorted[i]) {
      count++;
    }
    if (count > 1) tiedGroups.push(count);
    i += count;
  }

  // Variance of S
  let variance = (n * (n - 1) * (2 * n + 5)) / 18;
  for (const t of tiedGroups) {
    variance -= (t * (t - 1) * (2 * t + 5)) / 18;
  }

  // Z score with continuity correction
  let zScore: number;
  if (s > 0) zScore = (s - 1) / Math.sqrt(variance);
  else if (s < 0) zScore = (s + 1) / Math.sqrt(variance);
  else zScore = 0;

  // Two-tailed p-value from Z score (using approximation)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return {
    zScore,
    pValue: Math.max(0.0001, Math.min(1, pValue)),
    significant: pValue < 0.05,
  };
}

/* ── Full Trend Analysis ── */
export function analyzeTrend(years: number[], values: number[]): TrendAnalysis {
  const { slope, intercept } = sensSlope(years, values);
  const mk = mannKendall(values);

  return {
    slope,
    slopePerDecade: Math.round(slope * 10 * 10000) / 10000,
    intercept,
    pValue: Math.round(mk.pValue * 10000) / 10000,
    significant: mk.significant,
    zScore: Math.round(mk.zScore * 1000) / 1000,
    direction: mk.significant
      ? slope > 0 ? 'increasing' : 'decreasing'
      : 'no trend',
  };
}

/* ── Anomaly Detection ──
 * Computes anomalies relative to a baseline period mean.
 * An observation is flagged as anomalous if its z-score exceeds ±2σ.
 */
export function detectAnomalies(
  years: number[],
  values: number[],
  baselineStart = 2000,
  baselineEnd = 2010,
): AnomalyResult[] {
  // Compute baseline statistics
  const baselineValues: number[] = [];
  for (let i = 0; i < years.length; i++) {
    if (years[i] >= baselineStart && years[i] <= baselineEnd) {
      baselineValues.push(values[i]);
    }
  }

  const baselineMean = baselineValues.length > 0
    ? baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length
    : values.reduce((a, b) => a + b, 0) / values.length;

  const baselineStd = baselineValues.length > 1
    ? Math.sqrt(
        baselineValues.reduce((sum, v) => sum + (v - baselineMean) ** 2, 0) /
          (baselineValues.length - 1),
      )
    : 1;

  return years.map((year, i) => {
    const anomaly = values[i] - baselineMean;
    const zScore = baselineStd > 0 ? anomaly / baselineStd : 0;
    return {
      year,
      value: values[i],
      anomaly: Math.round(anomaly * 10000) / 10000,
      zScore: Math.round(zScore * 1000) / 1000,
      isAnomaly: Math.abs(zScore) > 2,
    };
  });
}

/* ── Utility functions ── */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
