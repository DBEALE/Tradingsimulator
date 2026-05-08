# scripts/fetch-prices.js

Downloads historical daily closing prices from [stooq.com](https://stooq.com) and writes them to `data/prices.js`, which the simulator loads at startup.

## One-time setup — get a free API key

1. Open **https://stooq.com/q/d/?s=aapl.us&get_apikey** in a browser
2. Solve the captcha
3. Copy the `apikey=` value from the download link shown on the page

The key is tied to a daily request quota. If you hit the limit, get a new key (repeat the captcha) or wait until the next day.

## Running the script

```powershell
# PowerShell
$env:STOOQ_API_KEY = "your_key_here"
node scripts/fetch-prices.js
```

```bash
# bash
export STOOQ_API_KEY=your_key_here
node scripts/fetch-prices.js
```

### Flags

| Flag | Effect |
|------|--------|
| *(none)* | Fetch all US and UK stocks, skip anything already in `data/prices.js` |
| `--us-only` | Only process US stocks |
| `--uk-only` | Only process UK stocks |
| `--force` | Re-fetch everything, even if data already exists |

## Incremental / split runs

The script **merges** with existing data — it never overwrites a stock/year that already has prices. This means you can:

- Hit the daily quota mid-run, stop, and re-run tomorrow — it picks up where it left off
- Run `--us-only` on one machine and `--uk-only` on another with a separate key, then combine the results

To run on a second machine, copy these two files over (keeping the same folder structure):

```
scripts/fetch-prices.js
data/prices.js          ← existing data, so the script knows what to skip
```

Then run with `--uk-only` (or whichever market is missing). Copy `data/prices.js` back when done.

## Output

`data/prices.js` — loaded by `index.html` via `<script src="data/prices.js">` and exposed as `window.HISTORICAL_PRICES`.

Structure:
```js
window.HISTORICAL_PRICES = {
  "aapl.us": {
    "2023": {
      dates:  ["2023-01-03", "2023-01-04", ...],  // oldest first
      prices: [125.07, 126.36, ...]                // closing prices
    }
  },
  ...
}
```

## Coverage notes

- **US stocks** — ~250 S&P 500 components. Not all are available on stooq; missing symbols are logged as `skip` and omitted from the output.
- **UK stocks** — ~100 FTSE 100 components, using LSE tickers (e.g. `azn.uk`, `hsba.uk`).
- **Years** — 2020–2024. Stocks that didn't exist yet (e.g. post-IPO) will simply have no data for earlier years.
- **File size** — expect roughly 8–10 MB for the full dataset.

## Adding new stocks or years

1. Add entries to `STOCKS_US` or `STOCKS_UK` in `fetch-prices.js`, or add a year to the `YEARS` array
2. Re-run the script — existing data is preserved, only the new entries are fetched
3. Update `REAL_STOCKS_US` / `REAL_STOCKS_UK` in `index.html` to expose the new stocks in the simulator UI
