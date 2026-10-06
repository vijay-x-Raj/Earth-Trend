/* ── Dashboard page ── */
import { useState, useMemo, useCallback } from 'react';
import type { VariableId } from '../types';
import { VARIABLES } from '../variables';
import {
  allCountryTrends,
  summaryMetrics,
  timeSeries,
  countryTrend,
} from '../data';
import WorldMap from '../components/WorldMap';
import TrendChart from '../components/TrendChart';

const YEARS = Array.from({ length: 24 }, (_, i) => 2000 + i);

export default function Dashboard() {
  const [variable, setVariable] = useState<VariableId>('temperature');
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear] = useState(2023);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const varConfig = VARIABLES[variable];
  const regions = useMemo(
    () => allCountryTrends(variable, startYear, endYear),
    [variable, startYear, endYear],
  );
  const metrics = useMemo(
    () => summaryMetrics(variable, startYear, endYear),
    [variable, startYear, endYear],
  );
  const ts = useMemo(
    () => timeSeries(selectedIso, variable, startYear, endYear),
    [selectedIso, variable, startYear, endYear],
  );
  const selectedRegion = useMemo(() => {
    if (!selectedIso) return null;
    return countryTrend(selectedIso, variable, startYear, endYear);
  }, [selectedIso, variable, startYear, endYear]);

  const handleSelect = useCallback((iso: string, name: string) => {
    setSelectedIso(iso);
    setSelectedName(name);
  }, []);

  return (
    <div className="page">
      {/* Variable selector */}
      <div className="var-selector">
        {(Object.keys(VARIABLES) as VariableId[]).map((v) => (
          <button
            key={v}
            className={`var-btn${v === variable ? ' var-btn--active' : ''}`}
            onClick={() => { setVariable(v); setSelectedIso(null); setSelectedName(null); }}
          >
            <span>{VARIABLES[v].icon}</span>
            <span>{VARIABLES[v].label}</span>
          </button>
        ))}
      </div>

      {/* Time range */}
      <div className="time-range">
        <label>Period</label>
        <select
          value={startYear}
          onChange={(e) => setStartYear(Number(e.target.value))}
        >
          {YEARS.filter((y) => y < endYear).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="time-range__divider">—</span>
        <select
          value={endYear}
          onChange={(e) => setEndYear(Number(e.target.value))}
        >
          {YEARS.filter((y) => y > startYear).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary metrics */}
      <div className="metrics">
        <div className="metric">
          <div className={`metric__value ${metrics.globalTrend > 0 ? 'metric__value--positive' : 'metric__value--negative'}`}>
            {metrics.globalTrend > 0 ? '+' : ''}{metrics.globalTrend} {varConfig.unit}
          </div>
          <div className="metric__label">Global {varConfig.label} Trend</div>
        </div>
        <div className="metric">
          <div className="metric__value">{metrics.significantAreaPct}%</div>
          <div className="metric__label">Areas With Significant Change</div>
        </div>
        <div className="metric">
          <div className="metric__value metric__value--positive">
            {metrics.strongestIncrease.name}
          </div>
          <div className="metric__label">
            Strongest Increase ({metrics.strongestIncrease.value > 0 ? '+' : ''}
            {metrics.strongestIncrease.value})
          </div>
        </div>
        <div className="metric">
          <div className="metric__value metric__value--negative">
            {metrics.strongestDecrease.name}
          </div>
          <div className="metric__label">
            Strongest Decrease ({metrics.strongestDecrease.value})
          </div>
        </div>
      </div>

      {/* Main grid: map + sidebar */}
      <div className="dashboard-grid">
        <div className="dashboard-grid__main">
          <WorldMap
            variable={variable}
            regions={regions}
            selectedIso={selectedIso}
            onSelect={handleSelect}
          />
          <TrendChart
            type="line"
            data={ts}
            variable={variable}
            label={
              selectedName
                ? `${selectedName} — ${varConfig.label} Time Series`
                : `Global ${varConfig.label} Time Series`
            }
          />
        </div>

        <div className="dashboard-grid__side">
          {selectedRegion ? (
            <div className="region-info">
              <div className="region-info__name">{selectedRegion.name}</div>
              <div className="region-info__row">
                <span className="region-info__label">Variable</span>
                <span className="region-info__value">{varConfig.label}</span>
              </div>
              <div className="region-info__row">
                <span className="region-info__label">Trend</span>
                <span className="region-info__value">
                  {selectedRegion.trend > 0 ? '+' : ''}{selectedRegion.trend} {varConfig.unit}
                </span>
              </div>
              <div className="region-info__row">
                <span className="region-info__label">p-value</span>
                <span className="region-info__value">{selectedRegion.pValue}</span>
              </div>
              <div className="region-info__row">
                <span className="region-info__label">Period</span>
                <span className="region-info__value">{startYear}–{endYear}</span>
              </div>
              <span
                className={`region-info__sig ${
                  selectedRegion.significant
                    ? 'region-info__sig--yes'
                    : 'region-info__sig--no'
                }`}
              >
                {selectedRegion.significant
                  ? 'Statistically Significant ✓'
                  : 'Not Significant'}
              </span>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">↖</div>
              <div className="empty-state__text">
                Click a country on the map to view its trend data
              </div>
            </div>
          )}

          <div className="card">
            <div className="card__title">Dataset</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
              {variable === 'temperature' && 'NASA POWER T2M — MERRA-2 Reanalysis (2m air temperature)'}
              {variable === 'precipitation' && 'NASA POWER PRECTOTCORR — Satellite + Reanalysis'}
              {variable === 'vegetation' && 'NASA POWER T2M (NDVI proxy — dedicated MODIS integration planned)'}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '8px' }}>
              Method: Sen's slope estimator<br />
              Significance: Mann-Kendall test
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
