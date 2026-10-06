# 🌍 Earth Trend Explorer

> **Visualize how Earth's climate systems are changing — powered by real NASA satellite data.**

An interactive web application that analyzes and visualizes 24 years (2000–2023) of climate trend data for **104 countries** using NASA POWER satellite/reanalysis observations. Features an AI-powered natural language interface ("Ask Earth") that lets users query climate trends conversationally.

Built for the **NASA Space Apps Challenge 2026** 🚀

---

## ✨ Features

### 📊 Interactive Dashboard
- **Choropleth World Map** — Pan, zoom, hover, and click on any of 104 countries to explore trends. Diverging color scale highlights warming vs. cooling (or increasing vs. decreasing precipitation).
- **Time Series Charts** — Line charts showing year-by-year observations for any country or the global average. Auto-scaled Y-axis for visible trend clarity.
- **Summary Metrics Panel** — At-a-glance stats: global trend magnitude, percentage of countries with statistically significant change, strongest increase, strongest decrease.
- **Variable Switcher** — Toggle between Temperature (🌡), Precipitation (🌧), and Vegetation (🌱) to explore different Earth systems.
- **Adjustable Time Range** — Filter analysis to any sub-period between 2000–2023.
- **Country Detail Panel** — Click any country to see its per-decade trend, p-value, and statistical significance.

### 🤖 "Ask Earth" Playground (AI-Powered)
- **Natural Language Queries** — Ask questions like:
  - *"Which countries have experienced the largest rainfall increase?"*
  - *"Compare India and China."*
  - *"Where is vegetation declining?"*
  - *"Which countries in Africa experienced the greatest temperature increase?"*
- **Gemini LLM Integration** — Uses Google Gemini 1.5 Flash with structured JSON output schemas for intent parsing and response generation. Falls back to a rule-based NLP parser if no API key is configured.
- **Adaptive Visualizations** — Automatically selects the best chart type (line, bar, scatter) and map type based on the question intent.
- **Transparent Methodology** — Every result shows the dataset, statistical method, and significance test used.

### 🔬 Scientific Rigor
- **Sen's Slope Estimator** — Non-parametric, outlier-robust trend magnitude calculation (median of all pairwise slopes).
- **Mann-Kendall Trend Test** — Non-parametric significance test with tied-group correction. Reports Z-score and two-tailed p-value.
- **Anomaly Detection** — Baseline-relative anomaly computation with z-score flagging (|z| > 2).
- **Real Data** — Every number comes from NASA POWER satellite observations and MERRA-2 reanalysis models. No synthetic or mock data.

---

## 🛰️ Data Source

| Property | Details |
|---|---|
| **Source** | [NASA POWER API](https://power.larc.nasa.gov/) (Prediction of Worldwide Energy Resources) |
| **Origin** | MERRA-2 reanalysis + CERES satellite observations |
| **Parameters** | `T2M` (2m air temperature, °C), `PRECTOTCORR` (corrected precipitation, mm/year) |
| **Spatial** | Point queries at country geographic centroids (104 countries) |
| **Temporal** | 2000–2023 (24 years, monthly → aggregated to annual) |
| **License** | Public domain (U.S. Government work) |
| **Auth** | None required |

Data is pre-fetched using [`scripts/fetch-nasa-data.ts`](scripts/fetch-nasa-data.ts) and bundled as a static JSON file (~150 KB) for instant frontend loading.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript 6 |
| **Build Tool** | Vite 8 |
| **Mapping** | D3.js (SVG choropleth with Natural Earth projection, pan/zoom via d3-zoom) |
| **Charts** | Recharts (line, bar, scatter) |
| **Geospatial** | TopoJSON (world-atlas 110m countries) |
| **AI/LLM** | Google Gemini 1.5 Flash (`@google/generative-ai` SDK) |
| **Statistics** | Custom TypeScript implementations (Sen's slope, Mann-Kendall, anomaly detection) |
| **Linting** | oxlint |

---

## 📁 Project Structure

```
earth-trend-explorer/
├── scripts/
│   └── fetch-nasa-data.ts      # NASA POWER bulk data fetcher (run once)
├── src/
│   ├── science/
│   │   ├── statistics.ts        # Sen's slope, Mann-Kendall, anomaly detection
│   │   ├── nasaPower.ts         # NASA POWER API client + country centroids
│   │   └── llm.ts               # Gemini LLM integration (parsing + generation)
│   ├── components/
│   │   ├── WorldMap.tsx          # D3 interactive choropleth map
│   │   └── TrendChart.tsx        # Recharts visualizations (line/bar/scatter)
│   ├── pages/
│   │   ├── Dashboard.tsx         # Main dashboard with map + metrics + time series
│   │   └── Playground.tsx        # "Ask Earth" natural language query interface
│   ├── data.ts                   # Data engine: trend computation, query execution
│   ├── types.ts                  # TypeScript type definitions
│   ├── variables.ts              # Climate variable catalog (temp, precip, vegetation)
│   ├── data/
│   │   └── nasa-climate.json     # Pre-fetched NASA POWER data (104 countries × 24 years)
│   ├── App.tsx                   # Root component with tab navigation
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Styles
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example                  # Environment variables template
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- (Optional) A [Google Gemini API key](https://aistudio.google.com/app/apikey) for AI-powered queries

### Installation

```bash
# Clone the repository
git clone https://github.com/vijay-x-Raj/Earth-Trend.git
cd Earth-Trend

# Install dependencies
npm install

# (Optional) Set up Gemini API key for AI features
cp .env.example .env.local
# Edit .env.local and add your VITE_GEMINI_API_KEY
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

### Refresh NASA Data (Optional)

The pre-fetched data is already included. To re-fetch from the NASA POWER API:

```bash
npx tsx scripts/fetch-nasa-data.ts
```

This takes ~2–3 minutes (103 sequential API calls with rate limiting).

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GEMINI_API_KEY` | No | Google Gemini API key for AI-powered "Ask Earth" queries. Without it, the Playground falls back to a rule-based NLP parser. Get one free at [Google AI Studio](https://aistudio.google.com/app/apikey). |

---

## 🧪 Statistical Methodology

### Sen's Slope Estimator
For each pair of data points *(i, j)* where *j > i*, the slope is computed as *(y_j − y_i) / (x_j − x_i)*. Sen's slope is the **median** of all such pairwise slopes — making it robust to outliers and non-normal distributions.

### Mann-Kendall Trend Test
A non-parametric test for monotonic trend in time series data. Computes the S statistic (concordant vs. discordant pairs), adjusts variance for tied groups, applies continuity correction, and derives a two-tailed p-value from the Z-score using the Abramowitz & Stegun normal CDF approximation.

- **Significant**: p < 0.05
- **Direction**: Classified as *increasing*, *decreasing*, or *no trend*

### Anomaly Detection
Deviations from a baseline period mean (default: 2000–2010). Observations with |z-score| > 2 are flagged as anomalous.

---

## 📸 Screenshots

*Coming soon — screenshots of the Dashboard and Ask Earth Playground.*

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source. NASA POWER data is public domain (U.S. Government work).

---

## 🙏 Acknowledgements

- **[NASA POWER Project](https://power.larc.nasa.gov/)** — Providing free, open-access satellite and reanalysis climate data
- **[NASA Space Apps Challenge](https://www.spaceappschallenge.org/)** — For inspiring this project
- **[Google Gemini](https://ai.google.dev/)** — Powering the natural language query interface
- **[D3.js](https://d3js.org/)** — Interactive geospatial visualizations
- **[Recharts](https://recharts.org/)** — Chart components for React

---

<p align="center">
  Built with ❤️ for NASA Space Apps Challenge 2026
</p>
