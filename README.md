# Stock Market Simulator

A browser-based stock market simulator that lets you practise trading strategies without risking real money. Configure a virtual market, watch prices move in real time, and automate strategies with the built-in JavaScript trading bot.

## Features

- **Realistic price generation** – Stock prices are modelled using Geometric Brownian Motion (GBM), the same stochastic process used in the Black–Scholes model.
- **Multiple market conditions** – Choose between a normal market, a bull market (upward drift), a bear market (downward drift), or a high-volatility market.
- **Configurable simulation** – Set the number of stocks (3, 5, or 8), starting capital, trading cost (flat fee per order), and simulation period (30 days to 5 years).
- **Interactive chart** – Canvas-based price chart with per-stock colour-coding, hover tooltips showing exact prices, and buy/sell trade markers (▲/▼).
- **Bot trade overlays** – Toggle buy/sell markers for each selected comparison bot directly on the main price chart.
- **Bot P&L chart** – Dedicated chart showing daily P&L lines for each selected bot.
- **Multi-stock chart overlay** – Toggle individual stock tabs to show or hide their price lines on the same chart.
- **Manual trading** – Buy and sell shares using the trade form at any point during the simulation.
- **Play / Pause / Step** – Run the simulation continuously at an adjustable speed (1× – 10×) or step through one day at a time.
- **Portfolio dashboard** – Live summary showing portfolio value, total return, cash balance, and a holdings table.
- **Transaction log** – Full history of every buy and sell order.
- **Market overview table** – At-a-glance view of current price, daily change (%), and 7-day trend for every stock.
- **Auto-Trading Bot** – Write custom JavaScript that executes each simulated day. Built-in strategy presets include:
  - **Momentum** – Buys top-performing stocks over 20 days; sells the worst performers.
  - **Buy & Hold** – Invests equally across all stocks on day 1 and never sells.
  - **Mean Reversion** – Buys when a stock falls 5%+ below its 30-day average; sells on an 8%+ recovery.
  - Select multiple presets to compare each bot's final P&L, portfolio summary, and transaction history in the completion summary.
- **Bot API** – Bot scripts have access to `prices`, `holdings`, `cash`, `day`, `totalDays`, `buy(symbol, shares)`, `sell(symbol, shares)`, and `priceHistory(symbol, n)`.
- **Email notifications** – Optional portfolio updates delivered via [EmailJS](https://www.emailjs.com) (no backend required). Configure notification frequency (every 30, 60, or 90 simulation days) or receive only a final summary.
- **Dark / Light theme** – Toggle between dark and light themes; preference is saved in `localStorage`.
- **Mobile-optimised layout** – On screens ≤ 600 px the UI adapts automatically: a stock search/filter box appears above the tab strip when more than 10 stocks are loaded (critical for 25 or 100 stocks), the Market Overview table is height-constrained so it doesn't dominate the page, the price chart responds to tap and swipe gestures for the tooltip, and the active tab is always scrolled into view.
- **Build version label** – A version tag is always visible at the top-right of the screen and is auto-incremented (patch version) by GitHub Actions on each push/build.
- **Fully client-side** – A single `index.html` file with no build step, no server, and no dependencies beyond EmailJS (loaded from CDN, optional).

## Getting Started

No installation is required. Open `index.html` directly in any modern web browser.

```bash
# Clone the repository
git clone https://github.com/DBEALE/Tradingsimulator.git

# Open the simulator
open Tradingsimulator/index.html
```

Or simply double-click `index.html` in your file manager.

## Usage

1. **Configure** – Set your starting capital, number of stocks, simulation period, trading cost, and market condition in the settings panel.
2. **Start** – Click **▶ Play** to run the simulation continuously, or **Step →** to advance one day at a time.
3. **Trade** – Use the trade form to buy or sell shares manually at any time.
4. **Automate** – In the **Simulation Setup** screen, enable the Auto-Trading Bot, select one or more preset strategies (multi-select) or write your own JavaScript, and let it trade for you.
5. **Monitor** – Watch the portfolio dashboard and chart update as each day passes.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close the documentation modal |

### Auto-Trading Bot API

The following variables and functions are available inside bot scripts:

| Name | Type | Description |
|------|------|-------------|
| `prices` | Object | `{ symbol: currentPrice }` for all stocks |
| `holdings` | Object | `{ symbol: shares }` owned |
| `cash` | Number | Available cash at the start of each day |
| `day` | Number | Current simulation day (1-based) |
| `totalDays` | Number | Total number of days in the simulation |
| `buy(symbol, shares)` | Function | Place a buy order |
| `sell(symbol, shares)` | Function | Place a sell order |
| `priceHistory(symbol, n)` | Function | Last `n` closing prices for a stock |

## Email Notifications (optional)

Email delivery is powered by [EmailJS](https://www.emailjs.com) (free tier available, no backend required):

1. Create a free EmailJS account and connect an email service.
2. Create a template that uses the variables `to_email`, `subject`, and `message`.
3. In the simulator, expand **⚙ Configure Email Service** and enter your Service ID, Template ID, and Public Key.
4. Enter your notification email address and choose a notification frequency.

Configuration is saved in `localStorage` and never sent to any server other than EmailJS.

## Project Structure

```
Tradingsimulator/
├── index.html   # Complete simulator (HTML, CSS, and JavaScript in one file)
└── README.md
```

## License

This project does not currently specify a license. All rights reserved by the author unless otherwise stated.
