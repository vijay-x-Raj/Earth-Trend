/* ── WorldMap – Pure D3 Interactive Choropleth ──
 *
 * Why D3 and not MapLibre:
 * MapLibre GL JS requires WebGL workers that have compatibility issues
 * with Vite 8 + React 19 bundling. D3 renders to SVG which is
 * universally compatible, debuggable, and perfectly sufficient for
 * country-level choropleth visualizations.
 *
 * Features:
 * - Pan & zoom via d3-zoom (mouse drag + scroll wheel)
 * - Country hover tooltips with trend data
 * - Country click selection with highlight
 * - Diverging color scale per variable
 * - Responsive SVG with Natural Earth projection
 * - ISO-3166 Alpha-3 matching via ADM0_A3 property
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { VariableId, RegionData } from '../types';
import { VARIABLES } from '../variables';

/* Natural Earth 110m countries TopoJSON from CDN */
const WORLD_TOPO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/* UN M49 numeric ID → ISO Alpha-3 mapping for the 110m dataset.
 * The world-atlas package uses numeric IDs from the UN standard.
 * We need this to join our trend data (keyed by ISO Alpha-3) to
 * the geographic features. */
const NUM_TO_ISO: Record<string, string> = {
  '004': 'AFG', '008': 'ALB', '012': 'DZA', '024': 'AGO', '032': 'ARG',
  '036': 'AUS', '040': 'AUT', '050': 'BGD', '112': 'BLR', '056': 'BEL',
  '068': 'BOL', '072': 'BWA', '076': 'BRA', '100': 'BGR', '116': 'KHM',
  '120': 'CMR', '124': 'CAN', '148': 'TCD', '152': 'CHL', '156': 'CHN',
  '170': 'COL', '178': 'COG', '180': 'COD', '188': 'CRI', '191': 'HRV',
  '192': 'CUB', '203': 'CZE', '208': 'DNK', '218': 'ECU', '818': 'EGY',
  '231': 'ETH', '246': 'FIN', '250': 'FRA', '276': 'DEU', '288': 'GHA',
  '300': 'GRC', '320': 'GTM', '348': 'HUN', '356': 'IND', '360': 'IDN',
  '364': 'IRN', '368': 'IRQ', '372': 'IRL', '376': 'ISR', '380': 'ITA',
  '392': 'JPN', '400': 'JOR', '398': 'KAZ', '404': 'KEN', '418': 'LAO',
  '434': 'LBY', '450': 'MDG', '458': 'MYS', '466': 'MLI', '484': 'MEX',
  '496': 'MNG', '504': 'MAR', '508': 'MOZ', '104': 'MMR', '516': 'NAM',
  '524': 'NPL', '528': 'NLD', '554': 'NZL', '562': 'NER', '566': 'NGA',
  '578': 'NOR', '512': 'OMN', '586': 'PAK', '591': 'PAN', '598': 'PNG',
  '600': 'PRY', '604': 'PER', '608': 'PHL', '616': 'POL', '620': 'PRT',
  '642': 'ROU', '643': 'RUS', '682': 'SAU', '686': 'SEN', '706': 'SOM',
  '710': 'ZAF', '410': 'KOR', '724': 'ESP', '144': 'LKA', '729': 'SDN',
  '752': 'SWE', '756': 'CHE', '760': 'SYR', '834': 'TZA', '764': 'THA',
  '788': 'TUN', '792': 'TUR', '795': 'TKM', '800': 'UGA', '804': 'UKR',
  '784': 'ARE', '826': 'GBR', '840': 'USA', '858': 'URY', '860': 'UZB',
  '862': 'VEN', '704': 'VNM', '887': 'YEM', '894': 'ZMB', '716': 'ZWE',
};

interface Props {
  variable: VariableId;
  regions: RegionData[];
  selectedIso: string | null;
  onSelect: (iso: string, name: string) => void;
}

export default function WorldMap({ variable, regions, selectedIso, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [containerWidth, setContainerWidth] = useState(960);

  /* ── load topojson once ── */
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .then(setWorldData)
      .catch(console.error);
  }, []);

  /* ── responsive width ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── build fast ISO → RegionData lookup ── */
  const regionLookup = useMemo(() => {
    const m = new globalThis.Map<string, RegionData>();
    for (const r of regions) {
      m.set(r.iso, r);
    }
    return m;
  }, [regions]);

  /* ── color scale ── */
  const varConfig = VARIABLES[variable];
  const maxAbs = useMemo(() => {
    const vals = regions.map((r) => Math.abs(r.trend));
    return Math.max(d3.max(vals) ?? 0.01, 0.01);
  }, [regions]);

  const colorScale = useMemo(
    () =>
      d3
        .scaleLinear<string>()
        .domain([-maxAbs, 0, maxAbs])
        .range([varConfig.colorNeg, varConfig.colorNeu, varConfig.colorPos])
        .clamp(true),
    [maxAbs, varConfig],
  );

  /* ── resolve feature → ISO ── */
  const featureIso = useCallback((feature: any): string | undefined => {
    const id = feature.id?.toString().padStart(3, '0');
    return id ? NUM_TO_ISO[id] : undefined;
  }, []);

  /* ── render map ── */
  useEffect(() => {
    if (!worldData || !svgRef.current) return;

    const width = containerWidth;
    const height = Math.round(width * 0.52);
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const projection = d3.geoNaturalEarth1().fitSize([width - 16, height - 16], {
      type: 'Sphere',
    } as any).translate([width / 2, height / 2]);

    const path = d3.geoPath(projection);

    /* Main group for zoom/pan transforms */
    const g = svg.append('g');

    /* Zoom behavior */
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    /* Ocean background */
    g.append('path')
      .datum({ type: 'Sphere' } as any)
      .attr('d', path as any)
      .attr('fill', '#fafaf7')
      .attr('stroke', '#d4d0c8')
      .attr('stroke-width', 0.5);

    /* Graticule */
    g.append('path')
      .datum(d3.geoGraticule10())
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#eae8e3')
      .attr('stroke-width', 0.3);

    /* Countries */
    const countries = topojson.feature(worldData, worldData.objects.countries) as any;

    g.selectAll('path.country')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const iso = featureIso(d);
        if (!iso) return '#e8e5de';
        const region = regionLookup.get(iso);
        return region ? colorScale(region.trend) : '#e8e5de';
      })
      .attr('stroke', (d: any) => {
        const iso = featureIso(d);
        return iso === selectedIso ? '#1a1a1a' : '#999';
      })
      .attr('stroke-width', (d: any) => {
        const iso = featureIso(d);
        return iso === selectedIso ? 2 : 0.4;
      })
      .style('cursor', 'pointer')
      .on('mouseover', function (_event: MouseEvent, d: any) {
        const iso = featureIso(d);
        if (!iso || !tooltipRef.current) return;
        const region = regionLookup.get(iso);

        d3.select(this).attr('stroke', '#1a1a1a').attr('stroke-width', 1.5);

        const tip = tooltipRef.current;
        tip.style.display = 'block';
        tip.innerHTML = region
          ? `<div class="tooltip__name">${region.name}</div>
             <div class="tooltip__row"><span>Trend</span><span>${region.trend > 0 ? '+' : ''}${region.trend}</span></div>
             <div class="tooltip__row"><span>p-value</span><span>${region.pValue}</span></div>
             <div class="tooltip__row"><span>Significant</span><span>${region.significant ? 'Yes ✓' : 'No'}</span></div>`
          : `<div class="tooltip__name">No data</div>`;
      })
      .on('mousemove', function (event: MouseEvent) {
        if (!tooltipRef.current) return;
        tooltipRef.current.style.left = event.clientX + 14 + 'px';
        tooltipRef.current.style.top = event.clientY - 12 + 'px';
      })
      .on('mouseout', function (_event: MouseEvent, d: any) {
        const iso = featureIso(d);
        d3.select(this)
          .attr('stroke', iso === selectedIso ? '#1a1a1a' : '#999')
          .attr('stroke-width', iso === selectedIso ? 2 : 0.4);
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      })
      .on('click', function (_event: MouseEvent, d: any) {
        const iso = featureIso(d);
        if (!iso) return;
        const region = regionLookup.get(iso);
        if (region) onSelect(region.iso, region.name);
      });

    /* Country borders from topojson mesh (cleaner than per-feature strokes) */
    const borders = topojson.mesh(worldData, worldData.objects.countries, (a: any, b: any) => a !== b);
    g.append('path')
      .datum(borders)
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#bbb')
      .attr('stroke-width', 0.3)
      .style('pointer-events', 'none');

  }, [worldData, regions, variable, selectedIso, containerWidth, colorScale, featureIso, regionLookup, onSelect]);

  return (
    <div className="map-container" ref={containerRef}>
      {!worldData && <div className="loading">Loading map data</div>}
      <svg
        ref={svgRef}
        style={{
          display: worldData ? 'block' : 'none',
          width: '100%',
          height: 'auto',
          cursor: 'grab',
        }}
      />
      {/* Legend */}
      <div className="legend">
        <span>{varConfig.labelNeg}</span>
        <div
          className="legend__bar"
          style={{
            background: `linear-gradient(to right, ${varConfig.colorNeg}, ${varConfig.colorNeu}, ${varConfig.colorPos})`,
          }}
        />
        <span>{varConfig.labelPos}</span>
      </div>
      {/* Tooltip */}
      <div ref={tooltipRef} className="tooltip" style={{ display: 'none' }} />
    </div>
  );
}
