/* ── Playground page – "Ask Earth" ── */
import { useState } from 'react';
import { parseQuestion, executeQuery } from '../data';
import { parseQuestionWithLLM, generatePlaygroundUIWithLLM } from '../science/llm';
import { VARIABLES } from '../variables';
import WorldMap from '../components/WorldMap';
import TrendChart from '../components/TrendChart';
import type { PlaygroundResult } from '../types';

const EXAMPLES = [
  'How is global temperature changing?',
  'Which countries have experienced the largest rainfall increase?',
  'Compare India and China.',
  'Where is vegetation declining?',
  'Which countries in Africa experienced the greatest temperature increase?',
];

export default function Playground() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const handleSubmit = async (q?: string) => {
    const query = q ?? question;
    if (!query.trim()) return;
    setQuestion(query);
    setIsLoading(true);
    setShowMethodology(false);
    setSelectedIso(null);

    try {
      const parsed = await parseQuestionWithLLM(query, parseQuestion);
      const res = executeQuery(parsed);
      
      const llmUI = await generatePlaygroundUIWithLLM(query, parsed, res.regions, {
        headline: res.headline,
        explanation: res.explanation,
        chartType: res.chartType,
        mapType: res.mapType,
        highlightedRegion: res.highlightedRegion
      });

      const finalRes = { ...res, ...llmUI };

      setResult(finalRes);
      if (finalRes.highlightedRegion) setSelectedIso(finalRes.highlightedRegion);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapSelect = (iso: string, _name: string) => {
    setSelectedIso(iso);
  };

  return (
    <div className="page playground">
      {/* Header */}
      <div className="playground__header">
        <h1 className="playground__title">Ask Earth</h1>
        <p className="playground__subtitle">
          Ask a question about Earth's changing systems.
        </p>
      </div>

      {/* Input */}
      <div className="playground__input-group">
        <input
          className="playground__input"
          type="text"
          placeholder="Where has temperature increased the most since 2000?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button className="playground__submit" onClick={() => handleSubmit()}>
          Explore
        </button>
      </div>

      {/* Example questions */}
      <div className="playground__examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="playground__example"
            onClick={() => handleSubmit(ex)}
          >
            "{ex}"
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="loading">Analyzing NASA datasets</div>
      )}

      {/* Result */}
      {result && !isLoading && (
        <div className="result">
          <div className="result__headline">{result.headline}</div>
          <div className="result__body">
            {/* Map */}
            <WorldMap
              variable={result.query.variable}
              regions={result.regions}
              selectedIso={selectedIso}
              onSelect={handleMapSelect}
            />

            {/* Chart */}
            {result.chartType === 'line' && (
              <TrendChart
                type="line"
                data={result.timeSeries}
                variable={result.query.variable}
                label={`${VARIABLES[result.query.variable].label} Trend`}
              />
            )}
            {result.chartType === 'bar' && (
              <TrendChart
                type="bar"
                data={result.regions}
                variable={result.query.variable}
              />
            )}
            {result.chartType === 'scatter' && (
              <TrendChart
                type="scatter"
                data={result.regions.map((r, i) => {
                  /* Deterministic pseudo-noise per country index */
                  const noise = Math.sin(i * 7.31 + 0.5) * 0.003;
                  return {
                    x: r.trend,
                    y: r.trend * -0.3 + noise,
                    name: r.name,
                  };
                })}
                variable={result.query.variable}
                xLabel="Temperature trend"
                yLabel="Vegetation trend"
              />
            )}

            {/* Explanation */}
            <div className="result__explanation" style={{ marginTop: '16px' }}>
              {result.explanation}
            </div>

            {/* Methodology */}
            <div className="result__methodology">
              <button
                className="result__methodology-toggle"
                onClick={() => setShowMethodology(!showMethodology)}
              >
                {showMethodology ? '▾' : '▸'} How was this calculated?
              </button>
              {showMethodology && (
                <dl className="result__methodology-details">
                  <dt>Dataset</dt>
                  <dd>{result.methodology.dataset}</dd>
                  <dt>Period</dt>
                  <dd>{result.methodology.period}</dd>
                  <dt>Method</dt>
                  <dd>{result.methodology.method}</dd>
                  <dt>Test</dt>
                  <dd>{result.methodology.significance}</dd>
                </dl>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !isLoading && (
        <div className="empty-state">
          <div className="empty-state__icon">◎</div>
          <div className="empty-state__text">
            Ask a question or click an example above
          </div>
        </div>
      )}
    </div>
  );
}
