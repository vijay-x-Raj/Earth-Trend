/* ── NASA Data Preprocessor ──
 *
 * Run this script ONCE to fetch real NASA POWER data for all 103 countries
 * and save it as a static JSON file that the frontend loads instantly.
 *
 * Usage: npx tsx scripts/fetch-nasa-data.ts
 *
 * Output: public/data/nasa-climate.json
 *
 * This takes ~2-3 minutes (103 countries × 200ms delay per request).
 * The resulting JSON is ~150KB and contains 24 years of real NASA data.
 */

const NASA_POWER_BASE = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
const START_YEAR = 2000;
const END_YEAR = 2023;

interface CountryCentroid {
  iso: string;
  name: string;
  lat: number;
  lon: number;
}

const COUNTRIES: CountryCentroid[] = [
  { iso: 'AFG', name: 'Afghanistan', lat: 33.93, lon: 67.71 },
  { iso: 'ALB', name: 'Albania', lat: 41.15, lon: 20.17 },
  { iso: 'DZA', name: 'Algeria', lat: 28.03, lon: 1.66 },
  { iso: 'AGO', name: 'Angola', lat: -11.20, lon: 17.87 },
  { iso: 'ARG', name: 'Argentina', lat: -38.42, lon: -63.62 },
  { iso: 'AUS', name: 'Australia', lat: -25.27, lon: 133.78 },
  { iso: 'AUT', name: 'Austria', lat: 47.52, lon: 14.55 },
  { iso: 'BGD', name: 'Bangladesh', lat: 23.68, lon: 90.36 },
  { iso: 'BLR', name: 'Belarus', lat: 53.71, lon: 27.95 },
  { iso: 'BEL', name: 'Belgium', lat: 50.50, lon: 4.47 },
  { iso: 'BOL', name: 'Bolivia', lat: -16.29, lon: -63.59 },
  { iso: 'BWA', name: 'Botswana', lat: -22.33, lon: 24.68 },
  { iso: 'BRA', name: 'Brazil', lat: -14.24, lon: -51.93 },
  { iso: 'BGR', name: 'Bulgaria', lat: 42.73, lon: 25.49 },
  { iso: 'KHM', name: 'Cambodia', lat: 12.57, lon: 104.99 },
  { iso: 'CMR', name: 'Cameroon', lat: 7.37, lon: 12.35 },
  { iso: 'CAN', name: 'Canada', lat: 56.13, lon: -106.35 },
  { iso: 'TCD', name: 'Chad', lat: 15.45, lon: 18.73 },
  { iso: 'CHL', name: 'Chile', lat: -35.68, lon: -71.54 },
  { iso: 'CHN', name: 'China', lat: 35.86, lon: 104.20 },
  { iso: 'COL', name: 'Colombia', lat: 4.57, lon: -74.30 },
  { iso: 'COD', name: 'Dem. Rep. Congo', lat: -4.04, lon: 21.76 },
  { iso: 'CRI', name: 'Costa Rica', lat: 9.75, lon: -83.75 },
  { iso: 'HRV', name: 'Croatia', lat: 45.10, lon: 15.20 },
  { iso: 'CUB', name: 'Cuba', lat: 21.52, lon: -77.78 },
  { iso: 'CZE', name: 'Czech Republic', lat: 49.82, lon: 15.47 },
  { iso: 'DNK', name: 'Denmark', lat: 56.26, lon: 9.50 },
  { iso: 'ECU', name: 'Ecuador', lat: -1.83, lon: -78.18 },
  { iso: 'EGY', name: 'Egypt', lat: 26.82, lon: 30.80 },
  { iso: 'ETH', name: 'Ethiopia', lat: 9.15, lon: 40.49 },
  { iso: 'FIN', name: 'Finland', lat: 61.92, lon: 25.75 },
  { iso: 'FRA', name: 'France', lat: 46.23, lon: 2.21 },
  { iso: 'DEU', name: 'Germany', lat: 51.17, lon: 10.45 },
  { iso: 'GHA', name: 'Ghana', lat: 7.95, lon: -1.02 },
  { iso: 'GRC', name: 'Greece', lat: 39.07, lon: 21.82 },
  { iso: 'GTM', name: 'Guatemala', lat: 15.78, lon: -90.23 },
  { iso: 'HUN', name: 'Hungary', lat: 47.16, lon: 19.50 },
  { iso: 'IND', name: 'India', lat: 20.59, lon: 78.96 },
  { iso: 'IDN', name: 'Indonesia', lat: -0.79, lon: 113.92 },
  { iso: 'IRN', name: 'Iran', lat: 32.43, lon: 53.69 },
  { iso: 'IRQ', name: 'Iraq', lat: 33.22, lon: 43.68 },
  { iso: 'IRL', name: 'Ireland', lat: 53.41, lon: -8.24 },
  { iso: 'ISR', name: 'Israel', lat: 31.05, lon: 34.85 },
  { iso: 'ITA', name: 'Italy', lat: 41.87, lon: 12.57 },
  { iso: 'JPN', name: 'Japan', lat: 36.20, lon: 138.25 },
  { iso: 'JOR', name: 'Jordan', lat: 30.59, lon: 36.24 },
  { iso: 'KAZ', name: 'Kazakhstan', lat: 48.02, lon: 66.92 },
  { iso: 'KEN', name: 'Kenya', lat: -0.02, lon: 37.91 },
  { iso: 'LAO', name: 'Laos', lat: 19.86, lon: 102.50 },
  { iso: 'LBY', name: 'Libya', lat: 26.34, lon: 17.23 },
  { iso: 'MDG', name: 'Madagascar', lat: -18.77, lon: 46.87 },
  { iso: 'MYS', name: 'Malaysia', lat: 4.21, lon: 101.98 },
  { iso: 'MLI', name: 'Mali', lat: 17.57, lon: -4.00 },
  { iso: 'MEX', name: 'Mexico', lat: 23.63, lon: -102.55 },
  { iso: 'MNG', name: 'Mongolia', lat: 46.86, lon: 103.85 },
  { iso: 'MAR', name: 'Morocco', lat: 31.79, lon: -7.09 },
  { iso: 'MOZ', name: 'Mozambique', lat: -18.67, lon: 35.53 },
  { iso: 'MMR', name: 'Myanmar', lat: 21.91, lon: 95.96 },
  { iso: 'NAM', name: 'Namibia', lat: -22.96, lon: 18.49 },
  { iso: 'NPL', name: 'Nepal', lat: 28.39, lon: 84.12 },
  { iso: 'NLD', name: 'Netherlands', lat: 52.13, lon: 5.29 },
  { iso: 'NZL', name: 'New Zealand', lat: -40.90, lon: 174.89 },
  { iso: 'NER', name: 'Niger', lat: 17.61, lon: 8.08 },
  { iso: 'NGA', name: 'Nigeria', lat: 9.08, lon: 8.68 },
  { iso: 'NOR', name: 'Norway', lat: 60.47, lon: 8.47 },
  { iso: 'OMN', name: 'Oman', lat: 21.47, lon: 55.98 },
  { iso: 'PAK', name: 'Pakistan', lat: 30.38, lon: 69.35 },
  { iso: 'PAN', name: 'Panama', lat: 8.54, lon: -80.78 },
  { iso: 'PNG', name: 'Papua New Guinea', lat: -6.31, lon: 143.96 },
  { iso: 'PRY', name: 'Paraguay', lat: -23.44, lon: -58.44 },
  { iso: 'PER', name: 'Peru', lat: -9.19, lon: -75.02 },
  { iso: 'PHL', name: 'Philippines', lat: 12.88, lon: 121.77 },
  { iso: 'POL', name: 'Poland', lat: 51.92, lon: 19.15 },
  { iso: 'PRT', name: 'Portugal', lat: 39.40, lon: -8.22 },
  { iso: 'ROU', name: 'Romania', lat: 45.94, lon: 24.97 },
  { iso: 'RUS', name: 'Russia', lat: 61.52, lon: 105.32 },
  { iso: 'SAU', name: 'Saudi Arabia', lat: 23.89, lon: 45.08 },
  { iso: 'SEN', name: 'Senegal', lat: 14.50, lon: -14.45 },
  { iso: 'SOM', name: 'Somalia', lat: 5.15, lon: 46.20 },
  { iso: 'ZAF', name: 'South Africa', lat: -30.56, lon: 22.94 },
  { iso: 'KOR', name: 'South Korea', lat: 35.91, lon: 127.77 },
  { iso: 'ESP', name: 'Spain', lat: 40.46, lon: -3.75 },
  { iso: 'LKA', name: 'Sri Lanka', lat: 7.87, lon: 80.77 },
  { iso: 'SDN', name: 'Sudan', lat: 12.86, lon: 30.22 },
  { iso: 'SWE', name: 'Sweden', lat: 60.13, lon: 18.64 },
  { iso: 'CHE', name: 'Switzerland', lat: 46.82, lon: 8.23 },
  { iso: 'SYR', name: 'Syria', lat: 34.80, lon: 39.00 },
  { iso: 'TZA', name: 'Tanzania', lat: -6.37, lon: 34.89 },
  { iso: 'THA', name: 'Thailand', lat: 15.87, lon: 100.99 },
  { iso: 'TUN', name: 'Tunisia', lat: 33.89, lon: 9.54 },
  { iso: 'TUR', name: 'Turkey', lat: 38.96, lon: 35.24 },
  { iso: 'TKM', name: 'Turkmenistan', lat: 38.97, lon: 59.56 },
  { iso: 'UGA', name: 'Uganda', lat: 1.37, lon: 32.29 },
  { iso: 'UKR', name: 'Ukraine', lat: 48.38, lon: 31.17 },
  { iso: 'ARE', name: 'United Arab Emirates', lat: 23.42, lon: 53.85 },
  { iso: 'GBR', name: 'United Kingdom', lat: 55.38, lon: -3.44 },
  { iso: 'USA', name: 'United States of America', lat: 37.09, lon: -95.71 },
  { iso: 'URY', name: 'Uruguay', lat: -32.52, lon: -55.77 },
  { iso: 'UZB', name: 'Uzbekistan', lat: 41.38, lon: 64.59 },
  { iso: 'VEN', name: 'Venezuela', lat: 6.42, lon: -66.59 },
  { iso: 'VNM', name: 'Vietnam', lat: 14.06, lon: 108.28 },
  { iso: 'YEM', name: 'Yemen', lat: 15.55, lon: 48.52 },
  { iso: 'ZMB', name: 'Zambia', lat: -13.13, lon: 27.85 },
  { iso: 'ZWE', name: 'Zimbabwe', lat: -19.02, lon: 29.15 },
];

async function fetchOne(lat: number, lon: number) {
  const url = `${NASA_POWER_BASE}?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&start=${START_YEAR}&end=${END_YEAR}&format=JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`\n  NASA POWER Data Fetcher`);
  console.log(`  Fetching real climate data for ${COUNTRIES.length} countries...`);
  console.log(`  Period: ${START_YEAR}–${END_YEAR}\n`);

  const results: any[] = [];
  let failures = 0;

  for (let i = 0; i < COUNTRIES.length; i++) {
    const c = COUNTRIES[i];
    const pct = Math.round(((i + 1) / COUNTRIES.length) * 100);
    process.stdout.write(`  [${pct.toString().padStart(3)}%] ${c.name.padEnd(30)} `);

    try {
      const data = await fetchOne(c.lat, c.lon);
      const params = data.properties?.parameter ?? data.parameters ?? {};
      const t2m = params.T2M ?? {};
      const prec = params.PRECTOTCORR ?? {};

      // Aggregate monthly to annual
      const tempByYear: Record<number, { sum: number; count: number }> = {};
      const precByYear: Record<number, number> = {};

      for (const [ym, v] of Object.entries(t2m)) {
        // ym is format YYYYMM, e.g. "200001"
        // skip annual summaries like "200013" if they exist
        const year = parseInt(ym.substring(0, 4));
        const month = parseInt(ym.substring(4, 6));
        const val = v as number;

        if (!isNaN(year) && month >= 1 && month <= 12 && val !== -999 && year >= START_YEAR && year <= END_YEAR) {
          if (!tempByYear[year]) tempByYear[year] = { sum: 0, count: 0 };
          tempByYear[year].sum += val;
          tempByYear[year].count += 1;
        }
      }

      for (const [ym, v] of Object.entries(prec)) {
        const year = parseInt(ym.substring(0, 4));
        const month = parseInt(ym.substring(4, 6));
        const val = v as number;

        if (!isNaN(year) && month >= 1 && month <= 12 && val !== -999 && year >= START_YEAR && year <= END_YEAR) {
          if (!precByYear[year]) precByYear[year] = 0;
          // PRECTOTCORR is in mm/day. A rough approximation for monthly total is val * 30.4
          precByYear[year] += val * 30.4375; 
        }
      }

      const temperature: { year: number; value: number }[] = [];
      for (const [yStr, stats] of Object.entries(tempByYear)) {
        const year = parseInt(yStr);
        if (stats.count === 12) { // Only include complete years
          temperature.push({ year, value: Math.round((stats.sum / 12) * 100) / 100 });
        }
      }

      const precipitation: { year: number; value: number }[] = [];
      for (const [yStr, total] of Object.entries(precByYear)) {
         precipitation.push({ year: parseInt(yStr), value: Math.round(total * 100) / 100 });
      }

      temperature.sort((a, b) => a.year - b.year);
      precipitation.sort((a, b) => a.year - b.year);

      results.push({
        iso: c.iso,
        name: c.name,
        lat: c.lat,
        lon: c.lon,
        temperature,
        precipitation,
      });

      console.log(`✓ (${temperature.length} years)`);
    } catch (err: any) {
      console.log(`✗ ${err.message}`);
      failures++;
    }

    // Rate-limit: 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  // Write output
  const fs = await import('fs');
  const path = await import('path');
  const outDir = path.join(process.cwd(), 'public', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'nasa-climate.json');

  const output = {
    meta: {
      source: 'NASA POWER API (Prediction of Worldwide Energy Resources)',
      url: 'https://power.larc.nasa.gov/',
      parameters: {
        T2M: 'Temperature at 2 meters (°C) — annual mean from MERRA-2 reanalysis',
        PRECTOTCORR: 'Precipitation corrected (mm/year) — annual total from satellite + reanalysis',
      },
      spatial: 'Point query at country geographic centroid',
      temporal: `${START_YEAR}–${END_YEAR} annual`,
      fetchedAt: new Date().toISOString(),
      countries: results.length,
    },
    countries: results,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n  ✓ Saved ${results.length} countries to ${outPath}`);
  console.log(`  ✗ ${failures} failures`);
  console.log(`  File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB\n`);
}

main().catch(console.error);
