// Run with: node scripts/fetch-prices.js
//
// Requires a free stooq.com API key (one-time setup):
//   1. Open https://stooq.com/q/d/?s=aapl.us&get_apikey in a browser
//   2. Solve the captcha
//   3. Copy the apikey value from the download link shown on that page
//   4. Set it as an environment variable:
//        $env:STOOQ_API_KEY = "your_key_here"   (PowerShell)
//        export STOOQ_API_KEY=your_key_here      (bash)
//   5. Run: node scripts/fetch-prices.js
//
// The generated data/prices.js is committed to the repo — you only need to
// re-run this script when adding new years or stocks.
//
// Runtime estimate: 350 stocks × 5 years × 400 ms = ~12 minutes.
// The output file will be roughly 8–10 MB. If that becomes a page-load
// concern, consider splitting into per-year files and loading lazily.
//
// Ticker format:
//   US  →  <nasdaq/nyse ticker in lowercase>.us   e.g. aapl.us
//   UK  →  <lse ticker in lowercase>.uk            e.g. azn.uk
//
// Any ticker that stooq has no data for will be logged as "skip" and
// omitted from the output — the script never crashes on a missing symbol.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY = process.env.STOOQ_API_KEY;
if (!API_KEY) {
  console.error('Error: STOOQ_API_KEY environment variable is not set.');
  console.error('See the instructions at the top of this file.');
  process.exit(1);
}

// ── US stocks — S&P 500 top ~250 by market cap ───────────────────────────
// Organised by GICS sector for readability. Tickers are NYSE/NASDAQ symbols
// in lowercase. Stocks that IPO'd after 2020 will simply return no data for
// the years before their listing; the script handles that gracefully.
const STOCKS_US = [

  // Information Technology
  { stooq: 'aapl.us'  }, // Apple
  { stooq: 'msft.us'  }, // Microsoft
  { stooq: 'nvda.us'  }, // NVIDIA
  { stooq: 'avgo.us'  }, // Broadcom
  { stooq: 'orcl.us'  }, // Oracle
  { stooq: 'crm.us'   }, // Salesforce
  { stooq: 'adbe.us'  }, // Adobe
  { stooq: 'amd.us'   }, // AMD
  { stooq: 'txn.us'   }, // Texas Instruments
  { stooq: 'qcom.us'  }, // Qualcomm
  { stooq: 'intc.us'  }, // Intel
  { stooq: 'csco.us'  }, // Cisco
  { stooq: 'ibm.us'   }, // IBM
  { stooq: 'now.us'   }, // ServiceNow
  { stooq: 'anet.us'  }, // Arista Networks
  { stooq: 'klac.us'  }, // KLA Corp
  { stooq: 'lrcx.us'  }, // Lam Research
  { stooq: 'mchp.us'  }, // Microchip Technology
  { stooq: 'nxpi.us'  }, // NXP Semiconductors
  { stooq: 'mu.us'    }, // Micron Technology
  { stooq: 'mrvl.us'  }, // Marvell Technology
  { stooq: 'snps.us'  }, // Synopsys
  { stooq: 'cdns.us'  }, // Cadence Design
  { stooq: 'adi.us'   }, // Analog Devices
  { stooq: 'amat.us'  }, // Applied Materials
  { stooq: 'ftnt.us'  }, // Fortinet
  { stooq: 'panw.us'  }, // Palo Alto Networks
  { stooq: 'crwd.us'  }, // CrowdStrike
  { stooq: 'pltr.us'  }, // Palantir (IPO Sep 2020)
  { stooq: 'snow.us'  }, // Snowflake (IPO Sep 2020)
  { stooq: 'ddog.us'  }, // Datadog (IPO Sep 2019)
  { stooq: 'zs.us'    }, // Zscaler
  { stooq: 'team.us'  }, // Atlassian
  { stooq: 'hubs.us'  }, // HubSpot
  { stooq: 'smci.us'  }, // Super Micro Computer
  { stooq: 'arm.us'   }, // ARM Holdings (IPO Sep 2023)
  { stooq: 'dell.us'  }, // Dell Technologies
  { stooq: 'apo.us'   }, // Apollo Global (Tech-adj Fin)
  { stooq: 'cdw.us'   }, // CDW Corp
  { stooq: 'it.us'    }, // Gartner

  // Communication Services
  { stooq: 'googl.us' }, // Alphabet Class A
  { stooq: 'goog.us'  }, // Alphabet Class C
  { stooq: 'meta.us'  }, // Meta Platforms
  { stooq: 'nflx.us'  }, // Netflix
  { stooq: 'dis.us'   }, // Walt Disney
  { stooq: 'vz.us'    }, // Verizon
  { stooq: 't.us'     }, // AT&T
  { stooq: 'tmus.us'  }, // T-Mobile
  { stooq: 'cmcsa.us' }, // Comcast
  { stooq: 'ea.us'    }, // Electronic Arts
  { stooq: 'ttwo.us'  }, // Take-Two Interactive
  { stooq: 'wbd.us'   }, // Warner Bros. Discovery
  { stooq: 'para.us'  }, // Paramount Global
  { stooq: 'lumn.us'  }, // Lumen Technologies
  { stooq: 'foxa.us'  }, // Fox Corp A
  { stooq: 'nws.us'   }, // News Corp B
  { stooq: 'iaci.us'  }, // IAC

  // Consumer Discretionary
  { stooq: 'amzn.us'  }, // Amazon
  { stooq: 'tsla.us'  }, // Tesla
  { stooq: 'mcd.us'   }, // McDonald's
  { stooq: 'nke.us'   }, // Nike
  { stooq: 'sbux.us'  }, // Starbucks
  { stooq: 'hd.us'    }, // Home Depot
  { stooq: 'low.us'   }, // Lowe's
  { stooq: 'tgt.us'   }, // Target
  { stooq: 'tjx.us'   }, // TJX Companies
  { stooq: 'rost.us'  }, // Ross Stores
  { stooq: 'bkng.us'  }, // Booking Holdings
  { stooq: 'uber.us'  }, // Uber (IPO May 2019)
  { stooq: 'abnb.us'  }, // Airbnb (IPO Dec 2020)
  { stooq: 'lyft.us'  }, // Lyft
  { stooq: 'expe.us'  }, // Expedia
  { stooq: 'yum.us'   }, // Yum! Brands
  { stooq: 'dri.us'   }, // Darden Restaurants
  { stooq: 'f.us'     }, // Ford
  { stooq: 'gm.us'    }, // General Motors
  { stooq: 'rivn.us'  }, // Rivian (IPO Nov 2021)
  { stooq: 'dltr.us'  }, // Dollar Tree
  { stooq: 'dg.us'    }, // Dollar General
  { stooq: 'ebay.us'  }, // eBay
  { stooq: 'etsy.us'  }, // Etsy
  { stooq: 'bbwi.us'  }, // Bath & Body Works
  { stooq: 'phm.us'   }, // PulteGroup
  { stooq: 'dhi.us'   }, // D.R. Horton
  { stooq: 'len.us'   }, // Lennar
  { stooq: 'orly.us'  }, // O'Reilly Automotive
  { stooq: 'azо.us'   }, // AutoZone — stooq uses 'azo.us'
  { stooq: 'azo.us'   }, // AutoZone

  // Consumer Staples
  { stooq: 'wmt.us'   }, // Walmart
  { stooq: 'pg.us'    }, // Procter & Gamble
  { stooq: 'ko.us'    }, // Coca-Cola
  { stooq: 'pep.us'   }, // PepsiCo
  { stooq: 'cost.us'  }, // Costco
  { stooq: 'pm.us'    }, // Philip Morris
  { stooq: 'mo.us'    }, // Altria
  { stooq: 'mdlz.us'  }, // Mondelez
  { stooq: 'cl.us'    }, // Colgate-Palmolive
  { stooq: 'kr.us'    }, // Kroger
  { stooq: 'stз.us'   }, // placeholder — skip
  { stooq: 'stz.us'   }, // Constellation Brands
  { stooq: 'hsy.us'   }, // Hershey
  { stooq: 'k.us'     }, // Kellanova (was Kellogg's)
  { stooq: 'cpb.us'   }, // Campbell Soup
  { stooq: 'cag.us'   }, // ConAgra Brands
  { stooq: 'mkt.us'   }, // placeholder — skip

  // Health Care
  { stooq: 'unh.us'   }, // UnitedHealth
  { stooq: 'lly.us'   }, // Eli Lilly
  { stooq: 'jnj.us'   }, // Johnson & Johnson
  { stooq: 'abbv.us'  }, // AbbVie
  { stooq: 'mrk.us'   }, // Merck
  { stooq: 'tmo.us'   }, // Thermo Fisher
  { stooq: 'abt.us'   }, // Abbott
  { stooq: 'dhr.us'   }, // Danaher
  { stooq: 'amgn.us'  }, // Amgen
  { stooq: 'bsx.us'   }, // Boston Scientific
  { stooq: 'bmy.us'   }, // Bristol-Myers Squibb
  { stooq: 'isrg.us'  }, // Intuitive Surgical
  { stooq: 'mdt.us'   }, // Medtronic
  { stooq: 'ci.us'    }, // Cigna
  { stooq: 'hum.us'   }, // Humana
  { stooq: 'elv.us'   }, // Elevance Health
  { stooq: 'hca.us'   }, // HCA Healthcare
  { stooq: 'zts.us'   }, // Zoetis
  { stooq: 'regn.us'  }, // Regeneron
  { stooq: 'vrtx.us'  }, // Vertex Pharmaceuticals
  { stooq: 'biib.us'  }, // Biogen
  { stooq: 'mrna.us'  }, // Moderna
  { stooq: 'idxx.us'  }, // IDEXX Laboratories
  { stooq: 'iqv.us'   }, // IQVIA Holdings
  { stooq: 'pfe.us'   }, // Pfizer
  { stooq: 'cvs.us'   }, // CVS Health
  { stooq: 'syk.us'   }, // Stryker
  { stooq: 'edv.us'   }, // placeholder
  { stooq: 'ew.us'    }, // Edwards Lifesciences
  { stooq: 'pen.us'   }, // Penumbra

  // Financials
  { stooq: 'jpm.us'   }, // JPMorgan Chase
  { stooq: 'bac.us'   }, // Bank of America
  { stooq: 'wfc.us'   }, // Wells Fargo
  { stooq: 'gs.us'    }, // Goldman Sachs
  { stooq: 'ms.us'    }, // Morgan Stanley
  { stooq: 'blk.us'   }, // BlackRock
  { stooq: 'schw.us'  }, // Charles Schwab
  { stooq: 'axp.us'   }, // American Express
  { stooq: 'cof.us'   }, // Capital One
  { stooq: 'usb.us'   }, // US Bancorp
  { stooq: 'pnc.us'   }, // PNC Financial
  { stooq: 'tfc.us'   }, // Truist Financial
  { stooq: 'spgi.us'  }, // S&P Global
  { stooq: 'mmc.us'   }, // Marsh & McLennan
  { stooq: 'ice.us'   }, // Intercontinental Exchange
  { stooq: 'cme.us'   }, // CME Group
  { stooq: 'cb.us'    }, // Chubb
  { stooq: 'aon.us'   }, // Aon
  { stooq: 'bk.us'    }, // Bank of New York Mellon
  { stooq: 'aig.us'   }, // AIG
  { stooq: 'met.us'   }, // MetLife
  { stooq: 'pru.us'   }, // Prudential Financial
  { stooq: 'all.us'   }, // Allstate
  { stooq: 'trow.us'  }, // T. Rowe Price
  { stooq: 'bx.us'    }, // Blackstone
  { stooq: 'kkr.us'   }, // KKR
  { stooq: 'apo.us'   }, // Apollo Global Management
  { stooq: 'v.us'     }, // Visa
  { stooq: 'ma.us'    }, // Mastercard
  { stooq: 'pypl.us'  }, // PayPal
  { stooq: 'fi.us'    }, // Fiserv

  // Industrials
  { stooq: 'cat.us'   }, // Caterpillar
  { stooq: 'de.us'    }, // Deere & Co
  { stooq: 'ups.us'   }, // UPS
  { stooq: 'ba.us'    }, // Boeing
  { stooq: 'rtx.us'   }, // RTX (Raytheon)
  { stooq: 'lmt.us'   }, // Lockheed Martin
  { stooq: 'noc.us'   }, // Northrop Grumman
  { stooq: 'gd.us'    }, // General Dynamics
  { stooq: 'ge.us'    }, // GE Aerospace
  { stooq: 'unp.us'   }, // Union Pacific
  { stooq: 'csx.us'   }, // CSX
  { stooq: 'nsc.us'   }, // Norfolk Southern
  { stooq: 'fdx.us'   }, // FedEx
  { stooq: 'emr.us'   }, // Emerson Electric
  { stooq: 'itw.us'   }, // Illinois Tool Works
  { stooq: 'pcar.us'  }, // PACCAR
  { stooq: 'wm.us'    }, // Waste Management
  { stooq: 'rok.us'   }, // Rockwell Automation
  { stooq: 'carr.us'  }, // Carrier Global
  { stooq: 'otis.us'  }, // Otis Worldwide
  { stooq: 'hii.us'   }, // Huntington Ingalls
  { stooq: 'l3h.us'   }, // L3Harris Technologies (ticker: lhx.us)
  { stooq: 'lhx.us'   }, // L3Harris Technologies
  { stooq: 'fast.us'  }, // Fastenal
  { stooq: 'vmc.us'   }, // Vulcan Materials
  { stooq: 'mlm.us'   }, // Martin Marietta Materials
  { stooq: 'swk.us'   }, // Stanley Black & Decker
  { stooq: 'pnr.us'   }, // Pentair
  { stooq: 'xpo.us'   }, // XPO Logistics
  { stooq: 'jbht.us'  }, // J.B. Hunt Transport
  { stooq: 'ir.us'    }, // Ingersoll Rand
  { stooq: 'ph.us'    }, // Parker Hannifin
  { stooq: 'dov.us'   }, // Dover
  { stooq: 'roper.us' }, // Roper Technologies (ticker: rop.us)
  { stooq: 'rop.us'   }, // Roper Technologies

  // Energy
  { stooq: 'xom.us'   }, // ExxonMobil
  { stooq: 'cvx.us'   }, // Chevron
  { stooq: 'cop.us'   }, // ConocoPhillips
  { stooq: 'slb.us'   }, // SLB (Schlumberger)
  { stooq: 'eog.us'   }, // EOG Resources
  { stooq: 'oxy.us'   }, // Occidental Petroleum
  { stooq: 'mpc.us'   }, // Marathon Petroleum
  { stooq: 'vlo.us'   }, // Valero Energy
  { stooq: 'psx.us'   }, // Phillips 66
  { stooq: 'hal.us'   }, // Halliburton
  { stooq: 'bkr.us'   }, // Baker Hughes
  { stooq: 'dvn.us'   }, // Devon Energy
  { stooq: 'fang.us'  }, // Diamondback Energy
  { stooq: 'hes.us'   }, // Hess Corp
  { stooq: 'mro.us'   }, // Marathon Oil
  { stooq: 'apa.us'   }, // APA Corp
  { stooq: 'kmi.us'   }, // Kinder Morgan
  { stooq: 'wes.us'   }, // Western Midstream

  // Materials
  { stooq: 'lin.us'   }, // Linde
  { stooq: 'apd.us'   }, // Air Products
  { stooq: 'shw.us'   }, // Sherwin-Williams
  { stooq: 'ecl.us'   }, // Ecolab
  { stooq: 'ppg.us'   }, // PPG Industries
  { stooq: 'fcx.us'   }, // Freeport-McMoRan
  { stooq: 'nem.us'   }, // Newmont
  { stooq: 'cf.us'    }, // CF Industries
  { stooq: 'mos.us'   }, // Mosaic
  { stooq: 'pkg.us'   }, // Packaging Corp
  { stooq: 'ip.us'    }, // International Paper
  { stooq: 'amcr.us'  }, // Amcor

  // Real Estate
  { stooq: 'pld.us'   }, // Prologis
  { stooq: 'amt.us'   }, // American Tower
  { stooq: 'eqix.us'  }, // Equinix
  { stooq: 'spg.us'   }, // Simon Property Group
  { stooq: 'o.us'     }, // Realty Income
  { stooq: 'dlr.us'   }, // Digital Realty
  { stooq: 'psa.us'   }, // Public Storage
  { stooq: 'sbac.us'  }, // SBA Communications
  { stooq: 'cbre.us'  }, // CBRE Group
  { stooq: 'wpc.us'   }, // W.P. Carey

  // Utilities
  { stooq: 'nee.us'   }, // NextEra Energy
  { stooq: 'so.us'    }, // Southern Company
  { stooq: 'duk.us'   }, // Duke Energy
  { stooq: 'd.us'     }, // Dominion Energy
  { stooq: 'aee.us'   }, // Ameren
  { stooq: 'exc.us'   }, // Exelon
  { stooq: 'xel.us'   }, // Xcel Energy
  { stooq: 'es.us'    }, // Eversource Energy
  { stooq: 'awk.us'   }, // American Water Works
  { stooq: 'wec.us'   }, // WEC Energy

];

// ── UK stocks — FTSE 100 components ─────────────────────────────────────
// Tickers are LSE symbols in lowercase. Composition reflects the FTSE 100
// as it stood across most of 2020–2024; a handful of stocks entered or
// left the index during this period but are included regardless — the
// script simply skips years where a symbol has no data.
// Note: BT Group trades as BT.A on the LSE; stooq uses 'bta.uk'.
const STOCKS_UK = [

  // Energy & Mining
  { stooq: 'shel.uk' }, // Shell
  { stooq: 'bp.uk'   }, // BP
  { stooq: 'rio.uk'  }, // Rio Tinto
  { stooq: 'bhp.uk'  }, // BHP Group
  { stooq: 'glen.uk' }, // Glencore
  { stooq: 'aal.uk'  }, // Anglo American
  { stooq: 'anto.uk' }, // Antofagasta
  { stooq: 'freyr.uk'}, // placeholder — skip (Norwegian, not FTSE 100)
  { stooq: 'cnx.uk'  }, // placeholder — skip
  { stooq: 'drax.uk' }, // Drax Group

  // Financials & Insurance
  { stooq: 'hsba.uk' }, // HSBC
  { stooq: 'barc.uk' }, // Barclays
  { stooq: 'lloy.uk' }, // Lloyds Banking
  { stooq: 'nwg.uk'  }, // NatWest Group
  { stooq: 'stan.uk' }, // Standard Chartered
  { stooq: 'lgen.uk' }, // Legal & General
  { stooq: 'av.uk'   }, // Aviva
  { stooq: 'pru.uk'  }, // Prudential
  { stooq: 'mng.uk'  }, // M&G
  { stooq: 'iii.uk'  }, // 3i Group
  { stooq: 'icg.uk'  }, // Intermediate Capital Group
  { stooq: 'emg.uk'  }, // Man Group
  { stooq: 'hl.uk'   }, // Hargreaves Lansdown
  { stooq: 'sdr.uk'  }, // Schroders
  { stooq: 'stj.uk'  }, // St James's Place
  { stooq: 'aub.uk'  }, // Admiral Group (ticker: adm.uk on LSE)
  { stooq: 'adm.uk'  }, // Admiral Group
  { stooq: 'cb.uk'   }, // placeholder
  { stooq: 'blt.uk'  }, // BHP Billiton legacy — skip (same as bhp.uk)

  // Pharmaceuticals & Health
  { stooq: 'azn.uk'  }, // AstraZeneca
  { stooq: 'gsk.uk'  }, // GSK
  { stooq: 'hik.uk'  }, // Hikma Pharmaceuticals
  { stooq: 'sn.uk'   }, // Smith & Nephew
  { stooq: 'shp.uk'  }, // placeholder (Shire was acquired by Takeda)
  { stooq: 'dec.uk'  }, // Dechra Pharmaceuticals (acquired 2023)

  // Consumer Goods & Retail
  { stooq: 'ulvr.uk' }, // Unilever
  { stooq: 'dge.uk'  }, // Diageo
  { stooq: 'rkt.uk'  }, // Reckitt
  { stooq: 'bats.uk' }, // British American Tobacco
  { stooq: 'imb.uk'  }, // Imperial Brands
  { stooq: 'abf.uk'  }, // Associated British Foods
  { stooq: 'mks.uk'  }, // Marks & Spencer
  { stooq: 'nxt.uk'  }, // Next
  { stooq: 'tsco.uk' }, // Tesco
  { stooq: 'sbry.uk' }, // Sainsbury's
  { stooq: 'brby.uk' }, // Burberry
  { stooq: 'kgf.uk'  }, // Kingfisher
  { stooq: 'bme.uk'  }, // B&M European Value Retail
  { stooq: 'gaw.uk'  }, // Games Workshop

  // Industrials & Engineering
  { stooq: 'rr.uk'   }, // Rolls-Royce
  { stooq: 'ba.uk'   }, // BAE Systems
  { stooq: 'weir.uk' }, // Weir Group
  { stooq: 'imi.uk'  }, // IMI
  { stooq: 'spx.uk'  }, // Spirax-Sarco Engineering
  { stooq: 'smin.uk' }, // Smiths Group
  { stooq: 'melr.uk' }, // Melrose Industries (ticker: mro.uk on LSE)
  { stooq: 'mro.uk'  }, // Melrose Industries
  { stooq: 'itrk.uk' }, // Intertek Group
  { stooq: 'rto.uk'  }, // Rentokil Initial
  { stooq: 'cpg.uk'  }, // Compass Group
  { stooq: 'qq.uk'   }, // QinetiQ
  { stooq: 'bab.uk'  }, // Babcock International
  { stooq: 'srp.uk'  }, // Serco Group
  { stooq: 'dcc.uk'  }, // DCC plc
  { stooq: 'expn.uk' }, // Experian
  { stooq: 'hlma.uk' }, // Halma
  { stooq: 'sxs.uk'  }, // Spectris
  { stooq: 'pfc.uk'  }, // Petrofac

  // Technology & Telecoms
  { stooq: 'vod.uk'  }, // Vodafone
  { stooq: 'bta.uk'  }, // BT Group (LSE: BT.A → stooq: bta.uk)
  { stooq: 'sge.uk'  }, // Sage Group
  { stooq: 'auto.uk' }, // Auto Trader Group
  { stooq: 'rmv.uk'  }, // Rightmove
  { stooq: 'ocdo.uk' }, // Ocado Group
  { stooq: 'rel.uk'  }, // RELX
  { stooq: 'inf.uk'  }, // Informa
  { stooq: 'pson.uk' }, // Pearson
  { stooq: 'itv.uk'  }, // ITV

  // Chemicals & Specialty Materials
  { stooq: 'crda.uk' }, // Croda International
  { stooq: 'jmat.uk' }, // Johnson Matthey
  { stooq: 'mndi.uk' }, // Mondi
  { stooq: 'smds.uk' }, // DS Smith

  // Utilities
  { stooq: 'ng.uk'   }, // National Grid
  { stooq: 'sse.uk'  }, // SSE
  { stooq: 'cna.uk'  }, // Centrica
  { stooq: 'uu.uk'   }, // United Utilities
  { stooq: 'svt.uk'  }, // Severn Trent
  { stooq: 'pnn.uk'  }, // Pennon Group

  // Real Estate & Construction
  { stooq: 'sgro.uk' }, // Segro
  { stooq: 'land.uk' }, // Land Securities
  { stooq: 'blnd.uk' }, // British Land
  { stooq: 'bdev.uk' }, // Barratt Developments
  { stooq: 'psn.uk'  }, // Persimmon
  { stooq: 'tw.uk'   }, // Taylor Wimpey
  { stooq: 'bkg.uk'  }, // Berkeley Group

  // Travel, Leisure & Media
  { stooq: 'ihg.uk'  }, // InterContinental Hotels
  { stooq: 'wtb.uk'  }, // Whitbread
  { stooq: 'iag.uk'  }, // International Airlines Group
  { stooq: 'ezj.uk'  }, // easyJet
  { stooq: 'wpp.uk'  }, // WPP
  { stooq: 'fltr.uk' }, // Flutter Entertainment
  { stooq: 'entn.uk' }, // Entain

];

const YEARS = [2020, 2021, 2022, 2023, 2024];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// LSE (.uk) prices are quoted in pence (GBX); divide by 100 so UK stocks
// sit on the same scale as the USD-quoted US stocks. Without this, a share
// priced at e.g. 8473p reads as $8,473 against the sim's starting capital
// and the bots cannot afford it (they round to 0 shares).
function parseCSV(csvText, isUK) {
  const lines = csvText.trim().split('\n');
  const dates  = [];
  const prices = [];
  const scale  = isUK ? 100 : 1;
  // stooq returns newest-first; reverse to get oldest-first
  for (let i = lines.length - 1; i >= 1; i--) {
    const parts = lines[i].split(',');
    if (parts.length >= 5) {
      const date  = parts[0].trim();
      const close = parseFloat(parts[4]);
      if (date && !isNaN(close) && close > 0) {
        dates.push(date);
        prices.push(+(close / scale).toFixed(2));
      }
    }
  }
  return { dates, prices };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // ── Command-line flags ──────────────────────────────────────────────
  // --us-only   fetch only US stocks
  // --uk-only   fetch only UK stocks
  // --force     re-fetch even if data already exists in prices.js
  const args     = new Set(process.argv.slice(2));
  const usOnly   = args.has('--us-only');
  const ukOnly   = args.has('--uk-only');
  const force    = args.has('--force');

  // ── Load existing prices.js so we can merge rather than overwrite ───
  // This means re-running the script never loses previously fetched data.
  const outDir  = path.join(__dirname, '..', 'data');
  const outPath = path.join(outDir, 'prices.js');
  let result = {};
  if (fs.existsSync(outPath)) {
    try {
      const existing = fs.readFileSync(outPath, 'utf8')
        .replace(/^\/\/[^\n]*\n/gm, '')          // strip // comments
        .replace('window.HISTORICAL_PRICES = ', '')
        .replace(/;\s*$/, '');
      result = JSON.parse(existing);
      const loaded = Object.values(result).reduce(
        (n, years) => n + Object.keys(years).length, 0
      );
      console.log(`Loaded existing prices.js (${loaded} stock-year entries)\n`);
    } catch {
      console.warn('Could not parse existing prices.js — starting fresh.\n');
      result = {};
    }
  }

  // ── Build the list of stocks to process ────────────────────────────
  const pool = ukOnly ? STOCKS_UK : usOnly ? STOCKS_US : [...STOCKS_US, ...STOCKS_UK];
  const seen = new Set();
  const all  = pool.filter(s => {
    if (seen.has(s.stooq)) return false;
    seen.add(s.stooq);
    return true;
  });

  // Count how many stock/year pairs actually need fetching
  const needed = all.reduce((n, s) =>
    n + YEARS.filter(y => force || !result[s.stooq]?.[String(y)]).length, 0
  );
  console.log(`${all.length} symbols × ${YEARS.length} years — ${needed} to fetch (${all.length * YEARS.length - needed} already cached)`);
  if (needed > 0) {
    console.log(`Estimated time: ~${Math.ceil(needed * 0.4 / 60)} minutes\n`);
  }

  let ok = 0, skipped = 0, failed = 0, cached = 0;

  for (const stock of all) {
    if (!result[stock.stooq]) result[stock.stooq] = {};
    for (const year of YEARS) {
      const key = String(year);

      // Skip if we already have good data and --force wasn't passed
      if (!force && result[stock.stooq][key]) {
        const days = result[stock.stooq][key].prices.length;
        console.log(`  ${stock.stooq} ${year} ... cached (${days} days)`);
        cached++;
        continue;
      }

      const d1  = `${year}0101`;
      const d2  = `${year}1231`;
      const url = `https://stooq.com/q/d/l/?s=${stock.stooq}&d1=${d1}&d2=${d2}&i=d&apikey=${API_KEY}`;
      process.stdout.write(`  ${stock.stooq} ${year} ... `);
      try {
        const csv = await fetchUrl(url);
        if (csv.includes('apikey')) {
          console.log('FAIL: invalid or expired API key');
          failed++;
          break; // no point continuing with a bad key
        }
        const { dates, prices } = parseCSV(csv, stock.stooq.endsWith('.uk'));
        if (prices.length < 2) {
          console.log(`skip (${prices.length} rows)`);
          skipped++;
        } else {
          result[stock.stooq][key] = { dates, prices };
          console.log(`ok (${prices.length} days)`);
          ok++;
        }
      } catch (err) {
        console.log(`FAIL: ${err.message}`);
        failed++;
      }
      await sleep(400); // polite rate limiting
    }
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const js = [
    '// Auto-generated by scripts/fetch-prices.js — do not edit by hand.',
    '// To refresh: node scripts/fetch-prices.js  (requires STOOQ_API_KEY env var)',
    `window.HISTORICAL_PRICES = ${JSON.stringify(result)};`,
    '',
  ].join('\n');

  fs.writeFileSync(outPath, js, 'utf8');
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`\nDone. ok=${ok} cached=${cached} skipped=${skipped} failed=${failed}`);
  console.log(`Wrote ${outPath} (${kb} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
