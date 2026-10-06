/* ── NASA POWER API Client ──
 *
 * Fetches real climate data from NASA's POWER (Prediction of Worldwide
 * Energy Resources) API. This is the same data used by agricultural
 * scientists, renewable energy researchers, and climate analysts worldwide.
 *
 * Source: https://power.larc.nasa.gov/
 * Data origin: NASA satellites + reanalysis models (MERRA-2, GEOS, CERES)
 * License: Public domain (US Government work)
 * Auth: None required
 * Rate limit: Generous (no key needed)
 *
 * Parameters used:
 * - T2M:          Temperature at 2 meters (°C) — annual mean
 * - T2M_MAX:      Maximum temperature at 2m (°C)
 * - T2M_MIN:      Minimum temperature at 2m (°C)
 * - PRECTOTCORR:  Precipitation corrected (mm/day) — annual mean
 */

const NASA_POWER_BASE = 'https://power.larc.nasa.gov/api/temporal/monthly/point';

export interface NasaPowerResponse {
  parameters: {
    [key: string]: {
      [year: string]: number;
    };
  };
  header: {
    title: string;
    api: { version: string };
  };
}

export interface CountryClimateData {
  iso: string;
  name: string;
  lat: number;
  lon: number;
  temperature: { year: number; value: number }[];
  precipitation: { year: number; value: number }[];
}

/* ── Country centroids (approximate geographic center) ── */
export const COUNTRY_CENTROIDS: { iso: string; name: string; lat: number; lon: number }[] = [
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

/* ── Fetch single country data from NASA POWER ── */
export async function fetchCountryData(
  lat: number,
  lon: number,
  startYear = 2000,
  endYear = 2023,
): Promise<{ temperature: { year: number; value: number }[]; precipitation: { year: number; value: number }[] }> {
  const url = `${NASA_POWER_BASE}?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&start=${startYear}&end=${endYear}&format=JSON`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`NASA POWER API error: ${response.status}`);

  const data = await response.json();
  const params = data.properties?.parameter ?? data.parameters;

  if (!params) throw new Error('No parameters in NASA POWER response');

  const temperature: { year: number; value: number }[] = [];
  const precipitation: { year: number; value: number }[] = [];

  const t2m = params.T2M;
  const prec = params.PRECTOTCORR;

  if (t2m) {
    for (const [yearStr, val] of Object.entries(t2m)) {
      const year = parseInt(yearStr);
      const v = val as number;
      if (!isNaN(year) && v !== -999 && year >= startYear && year <= endYear) {
        temperature.push({ year, value: Math.round(v * 100) / 100 });
      }
    }
  }

  if (prec) {
    for (const [yearStr, val] of Object.entries(prec)) {
      const year = parseInt(yearStr);
      const v = val as number;
      if (!isNaN(year) && v !== -999 && year >= startYear && year <= endYear) {
        // Convert mm/day → mm/year for annual total
        precipitation.push({ year, value: Math.round(v * 365.25 * 100) / 100 });
      }
    }
  }

  temperature.sort((a, b) => a.year - b.year);
  precipitation.sort((a, b) => a.year - b.year);

  return { temperature, precipitation };
}

/* ── Fetch all countries (with progress callback) ── */
export async function fetchAllCountries(
  onProgress?: (done: number, total: number, name: string) => void,
  startYear = 2000,
  endYear = 2023,
): Promise<CountryClimateData[]> {
  const results: CountryClimateData[] = [];
  const total = COUNTRY_CENTROIDS.length;

  for (let i = 0; i < total; i++) {
    const country = COUNTRY_CENTROIDS[i];
    try {
      onProgress?.(i + 1, total, country.name);
      const data = await fetchCountryData(country.lat, country.lon, startYear, endYear);
      results.push({
        iso: country.iso,
        name: country.name,
        lat: country.lat,
        lon: country.lon,
        ...data,
      });
      // Small delay to be respectful to NASA's servers
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.warn(`Failed to fetch ${country.name}:`, err);
    }
  }

  return results;
}
