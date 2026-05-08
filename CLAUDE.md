# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

No build step. Open `index.html` directly in a browser to run the app.

```bash
# Clone and open
git clone https://github.com/DBEALE/Tradingsimulator.git
start Tradingsimulator/index.html   # Windows
open Tradingsimulator/index.html    # macOS/Linux
```

Validate changes by loading `index.html` in a browser and exercising the affected UI flow. There is no automated test or lint setup.

The live deployment is at https://dbeale.github.io/Tradingsimulator/ — GitHub Actions auto-increments the patch version on every push (unless the commit message contains `[skip ci]`).

## Architecture

The entire application is a single file: `index.html` (~4,300 lines of HTML, CSS, and JavaScript). There is no build tooling, no framework, no npm — intentionally. Do not introduce build tools, frameworks, or external dependencies unless explicitly asked.

**Preserve existing simulator behaviour:** play/pause/step controls, trading actions, bot execution, charts, and theme toggling. If behaviour or usage changes, update `README.md` in the same PR.

### Key sections in `index.html`

| Concern | What it does |
|---|---|
| CSS custom properties (top of `<style>`) | Theme colours for dark (`:root`) and light (`[data-theme="light"]`) modes |
| `STOCK_TEMPLATES`, `REAL_STOCKS_US/UK` | Stock definitions; `buildStockPool(n)` generates pools of 3–100 stocks |
| `generatePriceSeries()` | Geometric Brownian Motion price generation; `getMarketParams()` sets drift/volatility per market condition |
| `lookupHistoricalPrices(stooq, year)` | Returns `{ dates, prices }` from `window.HISTORICAL_PRICES` (loaded from `data/prices.js`) |
| `tick()` / `stepForward()` / `finishSimulation()` | Simulation engine — advances days, runs bot, updates UI |
| `renderChart()` / `renderBotPnlChart()` | Canvas-based charts; high-DPI aware (`devicePixelRatio`); theme-colour-aware |
| `BOT_SCRIPTS` / `runTradingScript()` | 6 preset strategies + custom JS executed via `new Function()` (not `eval`); bot API: `prices`, `holdings`, `cash`, `day`, `totalDays`, `buy()`, `sell()`, `priceHistory()` |
| `simulateBotStrategy()` / `iterationResults` | Multi-iteration support (1–1000 runs); aggregates bot P&L across iterations |
| Theme toggle | Persisted in `localStorage`; initialised via IIFE at bottom of `<script>` |

### Refreshing historical price data

Historical prices are pre-bundled in `data/prices.js` (committed to the repo). To regenerate it:

1. Get a free stooq.com API key: open `https://stooq.com/q/d/?s=aapl.us&get_apikey`, solve the captcha, copy the key from the download link.
2. `$env:STOOQ_API_KEY = "your_key"` (PowerShell) or `export STOOQ_API_KEY=your_key` (bash)
3. `node scripts/fetch-prices.js`
4. Commit the updated `data/prices.js`.

Re-run only when adding new years or stocks to `REAL_STOCKS_US/UK`.

### Data flow

1. User configures simulation (stocks, capital, period, market condition, price mode).
2. App generates full price arrays via GBM **or** looks up pre-bundled data from `window.HISTORICAL_PRICES`.
3. Simulation ticks forward: bot executes → transactions occur → chart/portfolio re-render.
4. Multi-iteration: repeat steps 1–3 N times, aggregate results, display comparison summary.

### Notable conventions

- **Global state** at the top of the `<script>` block is intentional — single entry point, no module system.
- Bot scripts receive a **snapshot** of `holdings` (not a live reference) to prevent mutation during multi-iteration runs.
- `finishSimulation()` chunks work in 50-day batches via `requestAnimationFrame` to keep the UI responsive.
- Bot log is capped at 50 lines; sparkline thumbnails update every 5 simulation days — both are deliberate performance limits.
- `escapeHtml()` is used wherever user-supplied text is injected into the DOM.
- Real Historical mode limits iterations to 1 (historical data doesn't repeat meaningfully).
