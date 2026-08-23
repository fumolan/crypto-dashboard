// Crypto Dashboard - 全模块联动仪表盘
// 全局币种选择器驱动: 价格/成交/市值/大单/盘口/信号/计算器

// ==================== 配置 ====================
const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com", "https://api1.binance.com"];
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "TRXUSDT"];
const META = {
  BTCUSDT: { sym: "BTC", name: "比特币" }, ETHUSDT: { sym: "ETH", name: "以太坊" },
  BNBUSDT: { sym: "BNB", name: "" }, SOLUSDT: { sym: "SOL", name: "" },
  XRPUSDT: { sym: "XRP", name: "瑞波币" }, DOGEUSDT: { sym: "DOGE", name: "狗狗币" },
  ADAUSDT: { sym: "ADA", name: "艾达币" }, TRXUSDT: { sym: "TRX", name: "波场" }
};
const MC_WEIGHTS = { BTCUSDT: 0.584, ETHUSDT: 0.12, BNBUSDT: 0.035, SOLUSDT: 0.03,
                     XRPUSDT: 0.025, DOGEUSDT: 0.012, ADAUSDT: 0.008, TRXUSDT: 0.007 };

const $ = (id) => document.getElementById(id);
const fmtP = (p) => p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p >= 0.01 ? p.toFixed(4) : p.toPrecision(4);
const fmtQ = (q) => q >= 1e6 ? (q / 1e6).toFixed(1) + "M" : q >= 1e3 ? (q / 1e3).toFixed(1) + "K" : q.toFixed(2);
const fmtU = (v) => v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(0) + "K" : "$" + v.toFixed(0);
const fmtT = (v) => v >= 1e12 ? "$" + (v / 1e12).toFixed(3) + "T" : fmtU(v);
const fmtClock = (d) => d.toLocaleTimeString("zh-CN", { hour12: false });

// ==================== 状态 ====================
let coin = "BTCUSDT";
let price = 0;
let klines5m = [];      // 4H 5分钟线(图表用)
let klines1h = {};      // 各币1小时线(趋势/信号用)
let trades = [];        // 大单
let depth = null;       // 盘口
let globalMC = 0;       // 总市值
let wallHistory = new Map();
let lastWhaleBuyQ = 0, lastWhaleSellQ = 0;
let refreshTimer = null;

// ==================== API ====================
async function apiGet(path) {
  let lastErr;
  for (const h of HOSTS) {
    try {
      const r = await fetch(h + path, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("API不可达");
}

// ==================== 数据获取 ====================
async function fetchAll() {
  $("statusDot").className = "dot";
  try {
    const [k5, tickers, all1h, tr, dep] = await Promise.all([
      apiGet(`/api/v3/klines?symbol=${coin}&interval=5m&limit=49`),
      apiGet(`/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(SYMBOLS))}`),
      Promise.all(SYMBOLS.map(s => apiGet(`/api/v3/klines?symbol=${s}&interval=1h&limit=25`).catch(() => null))),
      apiGet(`/api/v3/aggTrades?symbol=${coin}&limit=1000`).catch(() => []),
      apiGet(`/api/v3/depth?symbol=${coin}&limit=100`).catch(() => null),
    ]);

    klines5m = k5;
    const tickerMap = {};
    tickers.forEach(t => tickerMap[t.symbol] = t);
    price = tickerMap[coin] ? parseFloat(tickerMap[coin].lastPrice) : 0;
    SYMBOLS.forEach((s, i) => { if (all1h[i]) klines1h[s] = all1h[i]; });
    trades = tr;
    depth = dep;

    // 计算大单方向
    const minQ = getMinTradeQty(coin);
    const large = tr.filter(t => parseFloat(t.q) >= minQ);
    lastWhaleBuyQ = large.filter(t => t.m === false).reduce((s, t) => s + parseFloat(t.q), 0);
    lastWhaleSellQ = large.filter(t => t.m === true).reduce((s, t) => s + parseFloat(t.q), 0);

    // CoinGecko总市值(不阻塞)
    fetch("https://api.coingecko.com/api/v3/global")
      .then(r => r.json())
      .then(j => { globalMC = j.data.total_market_cap.usd; renderMCChart(); })
      .catch(() => {});

    $("statusDot").className = "dot ok";
    $("lastUpdate").textContent = fmtClock(new Date());
    renderAll(tickerMap);
  } catch (e) {
    $("statusDot").className = "dot err";
    console.error("fetchAll:", e);
  }
}

function getMinTradeQty(sym) {
  const map = { BTCUSDT: 0.5, ETHUSDT: 10, BNBUSDT: 10, SOLUSDT: 50,
                XRPUSDT: 10000, DOGEUSDT: 50000, ADAUSDT: 5000, TRXUSDT: 50000 };
  return map[sym] || 1;
}

// ==================== 渲染调度 ====================
function renderAll(tickerMap) {
  renderPriceChart();
  renderVolumeChart();
  renderMCChart();
  renderSignals(tickerMap);
  renderTrends();
  renderTrades();
  renderWalls();
  updateCalc();
}

// ==================== 价格图表 ====================
function renderPriceChart() {
  if (!klines5m.length) return;
  const done = klines5m.slice(0, -1);
  const closes = done.map(k => +k[4]);
  const W = 400, H = 150, PL = 55, PR = 8, PT = 8, PB = 18;
  const cw = W - PL - PR;
  const minP = Math.min(...closes), maxP = Math.max(...closes);
  const range = maxP - minP || 1;
  const x = i => PL + (i / (closes.length - 1)) * cw;
  const y = p => PT + (1 - (p - minP) / range) * (H - PT - PB);
  const chg = (closes[closes.length - 1] / closes[0] - 1) * 100;
  const color = chg >= 0 ? "#e54545" : "#24b28c";
  const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const t0 = new Date(+done[0][0]), t1 = new Date(+done[done.length - 1][0]);
  const ft = d => d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

  $("priceChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}">
    <polygon points="${PL},${H-PB} ${pts} ${x(closes.length-1)},${H-PB}" fill="${color}" opacity="0.08"/>
    <line x1="${PL}" y1="${y(maxP)}" x2="${W-PR}" y2="${y(maxP)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
    <line x1="${PL}" y1="${y(minP)}" x2="${W-PR}" y2="${y(minP)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
    <text x="${PL-4}" y="${y(maxP)+3}" text-anchor="end" font-size="9" fill="#7a8299">${fmtP(maxP)}</text>
    <text x="${PL-4}" y="${y(minP)+3}" text-anchor="end" font-size="9" fill="#7a8299">${fmtP(minP)}</text>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="${x(closes.length-1)}" cy="${y(closes[closes.length-1])}" r="3" fill="${color}"/>
    <text x="${W-PR}" y="14" text-anchor="end" font-size="11" fill="${color}" font-weight="700">${chg>=0?"+":""}${chg.toFixed(2)}%</text>
    <text x="${PL}" y="${H-4}" font-size="8" fill="#7a8299">${ft(t0)}</text>
    <text x="${W-PR}" y="${H-4}" text-anchor="end" font-size="8" fill="#7a8299">${ft(t1)}</text>
  </svg>`;
  $("priceInfo").textContent = `现价 ${fmtP(price)} USDT | 4H区间 ${fmtP(minP)} ~ ${fmtP(maxP)}`;
}

// ==================== 成交量图表 ====================
function renderVolumeChart() {
  if (!klines5m.length) return;
  const done = klines5m.slice(0, -1);
  const W = 400, H = 150, PL = 55, PR = 8, PT = 8, PB = 18;
  const cw = W - PL - PR;
  const vols = done.map(k => +k[7]);
  const maxV = Math.max(...vols) || 1;
  const bw = Math.max(1, cw / done.length - 0.5);
  const bars = done.map((k, i) => {
    const up = +k[4] >= +k[1];
    const h = Math.max(0.5, (+k[7] / maxV) * (H - PT - PB - 20));
    return `<rect x="${(PL + (i / done.length) * cw).toFixed(1)}" y="${(H - PB - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${up ? "#e54545" : "#24b28c"}" opacity="0.6"/>`;
  }).join("");
  const ratios = done.map(k => +k[7] > 0 ? +k[10] / +k[7] : 0.5);
  const yR = r => PT + (1 - r) * (H - PT - PB - 20) + 10;
  const rPts = ratios.map((r, i) => `${(PL + (i / done.length) * cw + bw / 2).toFixed(1)},${yR(r).toFixed(1)}`).join(" ");

  $("volChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}">
    <line x1="${PL}" y1="${yR(0.5)}" x2="${W-PR}" y2="${yR(0.5)}" stroke="#7a8299" stroke-dasharray="3,3" stroke-width="0.6" opacity="0.5"/>
    <text x="${PL-4}" y="${yR(0.5)+3}" text-anchor="end" font-size="8" fill="#7a8299">50%</text>
    ${bars}
    <polyline points="${rPts}" fill="none" stroke="#a855f7" stroke-width="1.2" opacity="0.85"/>
    <text x="${W-PR}" y="14" text-anchor="end" font-size="9" fill="#a855f7">紫线=买占比</text>
  </svg>`;

  const totalVol = vols.reduce((s, v) => s + v, 0);
  const totalBuy = done.reduce((s, k) => s + +k[10], 0);
  const buyPct = totalVol > 0 ? (totalBuy / totalVol * 100).toFixed(1) : 0;
  $("volInfo").textContent = `4H总量 ${fmtU(totalVol * price)} | 主动买占比 ${buyPct}%`;
}

// ==================== 总市值图表 ====================
let mcCurveCache = null;
async function renderMCChart() {
  if (!globalMC) return;
  try {
    const arr = await Promise.all(SYMBOLS.map(s =>
      apiGet(`/api/v3/klines?symbol=${s}&interval=5m&limit=49`).catch(() => null)));
    const valid = SYMBOLS.filter((_, i) => arr[i] && arr[i].length >= 48);
    if (valid.length < 3) return;
    const n = 48;
    const wSum = valid.reduce((s, c) => s + MC_WEIGHTS[c], 0);
    const curve = [];
    for (let i = 0; i < n; i++) {
      let idx = 0;
      valid.forEach(c => {
        const j = SYMBOLS.indexOf(c);
        const p = +arr[j][i][4], lp = +arr[j][n - 1][4];
        idx += (p / lp) * MC_WEIGHTS[c];
      });
      curve.push((idx / wSum) * globalMC);
    }
    mcCurveCache = curve;
    drawMCCurve(curve, arr[0]);
  } catch (e) { /* ignore */ }
}

function drawMCCurve(curve, ref) {
  const W = 400, H = 150, PL = 60, PR = 8, PT = 8, PB = 18;
  const cw = W - PL - PR;
  const minV = Math.min(...curve), maxV = Math.max(...curve);
  const range = maxV - minV || 1;
  const x = i => PL + (i / (curve.length - 1)) * cw;
  const y = v => PT + (1 - (v - minV) / range) * (H - PT - PB);
  const chg = (curve[curve.length - 1] / curve[0] - 1) * 100;
  const color = chg >= 0 ? "#e54545" : "#24b28c";
  const pts = curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  $("mcChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}">
    <polygon points="${PL},${H-PB} ${pts} ${x(curve.length-1)},${H-PB}" fill="${color}" opacity="0.08"/>
    <line x1="${PL}" y1="${y(maxV)}" x2="${W-PR}" y2="${y(maxV)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
    <line x1="${PL}" y1="${y(minV)}" x2="${W-PR}" y2="${y(minV)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
    <text x="${PL-4}" y="${y(maxV)+3}" text-anchor="end" font-size="8" fill="#7a8299">${fmtT(maxV)}</text>
    <text x="${PL-4}" y="${y(minV)+3}" text-anchor="end" font-size="8" fill="#7a8299">${fmtT(minV)}</text>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="${x(curve.length-1)}" cy="${y(curve[curve.length-1])}" r="3" fill="${color}"/>
    <text x="${W-PR}" y="14" text-anchor="end" font-size="11" fill="${color}" font-weight="700">${chg>=0?"+":""}${chg.toFixed(3)}%</text>
  </svg>`;
  $("mcInfo").textContent = `当前 ${fmtT(globalMC)} | 4H变化 ${chg >= 0 ? "+" : ""}${chg.toFixed(3)}%`;
}

// ==================== 信号共振 ====================
function renderSignals(tickerMap) {
  const signals = [];

  // ① 主动买占比
  const kl = klines1h[coin];
  let takerOK = false, takerDetail = "无数据";
  if (kl && kl.length >= 24) {
    const done = kl.slice(0, -1);
    let buy = 0, total = 0;
    done.forEach(k => { buy += +k[10]; total += +k[7]; });
    const ratio = total > 0 ? buy / total : 0.5;
    takerOK = ratio > 0.55;
    takerDetail = `${(ratio * 100).toFixed(1)}% ${ratio > 0.55 ? "买方主导" : ratio < 0.45 ? "卖方主导" : "均衡"}`;
  }
  signals.push({ name: "买盘主导", ok: takerOK, detail: takerDetail, pts: 25 });

  // ② 鲸鱼方向
  const whaleOK = lastWhaleBuyQ > lastWhaleSellQ * 1.2 && lastWhaleBuyQ > 0;
  signals.push({ name: "鲸鱼方向", ok: whaleOK,
    detail: lastWhaleBuyQ > 0 || lastWhaleSellQ > 0
      ? `买${fmtQ(lastWhaleBuyQ)} vs 卖${fmtQ(lastWhaleSellQ)} ${META[coin].sym}` : "无大单", pts: 25 });

  // ③ 量能确认
  let volOK = false, volDetail = "无数据";
  if (kl && kl.length >= 24) {
    const t = calcTrend(kl.slice(0, -1));
    if (t) { volOK = t.direction === "up" && t.volume !== "light"; volDetail = trendText(t); }
  }
  signals.push({ name: "量能确认", ok: volOK, detail: volDetail, pts: 25 });

  // ④ 近支撑
  let supportOK = false, supportDetail = "无数据";
  if (kl && kl.length >= 24 && price > 0) {
    const lows = kl.slice(0, -1).map(k => +k[3]);
    const minLow = Math.min(...lows);
    const dist = (price / minLow - 1) * 100;
    supportOK = dist < 2;
    supportDetail = `距24h低点${dist.toFixed(1)}%`;
  }
  signals.push({ name: "近支撑", ok: supportOK, detail: supportDetail, pts: 25 });

  const total = signals.reduce((s, sig) => s + (sig.ok ? sig.pts : 0), 0);
  const scoreEl = $("signalScore");
  scoreEl.textContent = total + "/100";
  scoreEl.className = "score " + (total >= 75 ? "high" : total >= 50 ? "mid" : "low");

  $("signalList").innerHTML = signals.map(sig =>
    `<div class="sig-row">
      <span class="sig-icon">${sig.ok ? "🟢" : "⚪"}</span>
      <span class="sig-name">${sig.name}</span>
      <span class="sig-detail">${sig.detail}</span>
      <span class="sig-pts ${sig.ok ? "on" : "off"}">${sig.ok ? "+" + sig.pts : 0}</span>
    </div>`).join("");

  const v = $("signalVerdict");
  if (total >= 75) { v.textContent = "🟢 可交易 | 信号共振"; v.className = "verdict go"; }
  else if (total >= 50) { v.textContent = `🟡 观望 | 需${75 - total}分`; v.className = "verdict wait"; }
  else { v.textContent = "🔴 不交易"; v.className = "verdict no"; }
}

// ==================== 趋势解读 ====================
function calcTrend(bars) {
  if (!bars || bars.length < 12) return null;
  const klines = bars.map(k => Array.isArray(k) ? { c: +k[4], q: +k[7], tb: +k[10], up: +k[4] >= +k[1] } : k);
  const recent = klines.slice(-6), earlier = klines.slice(0, -6);
  const rAvg = recent.reduce((s, b) => s + b.c, 0) / recent.length;
  const eAvg = earlier.reduce((s, b) => s + b.c, 0) / earlier.length;
  const pct = (rAvg / eAvg - 1) * 100;
  const direction = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "side";
  const rVol = recent.reduce((s, b) => s + b.q, 0);
  const avgVol = klines.reduce((s, b) => s + b.q, 0) / (klines.length / 6);
  const volume = rVol / avgVol > 1.3 ? "heavy" : rVol / avgVol < 0.7 ? "light" : "normal";
  const rBuy = recent.reduce((s, b) => s + (b.tb || 0), 0);
  const buyRatio = rVol > 0 ? rBuy / rVol : 0.5;
  const flow = buyRatio > 0.52 ? "buy" : buyRatio < 0.48 ? "sell" : "neutral";
  return { direction, volume, flow, pct };
}

function trendText(t) {
  const { direction: d, volume: v, flow: f } = t;
  if (d === "up") {
    if (v === "heavy" && f === "buy") return "放量上涨·买盘主导→涨势健康";
    if (v === "light") return "缩量上涨→上涨乏力";
    return "上涨·量能正常";
  }
  if (d === "down") {
    if (v === "heavy" && f === "sell") return "放量下跌·恐慌抛售/爆仓";
    if (v === "heavy" && f === "buy") return "放量下跌·有人接盘→可能筑底";
    if (v === "light") return "缩量阴跌→卖压衰竭";
    return "下跌·量能正常";
  }
  if (v === "heavy") return "横盘放量→变盘前夜";
  return "缩量横盘→观望";
}

function renderTrends() {
  const rows = SYMBOLS.filter(s => klines1h[s] && klines1h[s].length >= 24).map(s => {
    const t = calcTrend(klines1h[s].slice(0, -1));
    if (!t) return "";
    const cls = t.direction === "up" ? "bull" : t.direction === "down" ? "bear" : t.volume === "heavy" ? "warn" : "neutral";
    const arrow = t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→";
    return `<div class="trend-row">
      <span class="tr-sym">${META[s].sym} ${arrow}</span>
      <span class="tr-verdict ${cls}">${trendText(t)}</span>
    </div>`;
  }).join("");
  $("trendList").innerHTML = rows || "<span class='loading'>无数据</span>";
}

// ==================== 大单成交 ====================
function renderTrades() {
  if (!trades.length) { $("tradesArea").innerHTML = "<span class='loading'>无成交数据</span>"; return; }
  const minQ = getMinTradeQty(coin);
  const seen = new Set();
  const large = [];
  trades.forEach(t => {
    if (seen.has(t.a)) return;
    seen.add(t.a);
    const q = parseFloat(t.q);
    if (q >= minQ) large.push({ p: +t.p, q, usd: +t.p * q, ts: +t.T, buy: t.m === false });
  });
  large.sort((a, b) => b.ts - a.ts);

  const buys = large.filter(t => t.buy).slice(0, 10);
  const sells = large.filter(t => !t.buy).slice(0, 10);
  const totalBuyU = large.filter(t => t.buy).reduce((s, t) => s + t.usd, 0);
  const totalSellU = large.filter(t => !t.buy).reduce((s, t) => s + t.usd, 0);

  const row = t => {
    const hm = new Date(t.ts).toLocaleTimeString("zh-CN", { hour12: false });
    return `<div class="trade-row">
      <span class="t-time">${hm}</span>
      <span class="t-side ${t.buy ? "buy" : "sell"}">${t.buy ? "买入" : "卖出"}</span>
      <span class="t-price">${fmtP(t.p)}</span>
      <span class="t-qty">${fmtQ(t.q)} ${META[coin].sym}</span>
      <span class="t-usd">${fmtU(t.usd)}</span>
    </div>`;
  };

  let html = `<div class="trade-summary-bar">
    <span style="color:var(--up)">买入 ${fmtU(totalBuyU)}</span>
    <span style="color:var(--down)">卖出 ${fmtU(totalSellU)}</span>
    <span>${totalBuyU >= totalSellU ? "🔴 买方主导" : "🟢 卖方主导"}</span>
    <span class="sub">${large.length}笔大单</span>
  </div>`;

  if (buys.length) {
    html += `<div class="trade-section-title buy">📈 买入 (${buys.length}笔)</div>`;
    html += buys.map(row).join("");
  }
  if (sells.length) {
    html += `<div class="trade-section-title sell">📉 卖出 (${sells.length}笔)</div>`;
    html += sells.map(row).join("");
  }
  if (!large.length) html = `<span class='loading'>近千笔无≥${fmtQ(minQ)} ${META[coin].sym}的大单</span>`;
  $("tradesArea").innerHTML = html;
  $("tradeSummary").textContent = `${large.length}笔 | 买${fmtU(totalBuyU)} 卖${fmtU(totalSellU)}`;
}

// ==================== 盘口大墙 ====================
function renderWalls() {
  if (!depth) { $("wallsArea").innerHTML = "<span class='loading'>无盘口数据</span>"; return; }
  const bids = depth.bids.map(x => [+x[0], +x[1]]);
  const asks = depth.asks.map(x => [+x[0], +x[1]]);
  const mid = (bids[0][0] + asks[0][0]) / 2;
  const minQ = getMinTradeQty(coin);
  const now = Date.now();

  // 更新追踪
  const activeKeys = new Set();
  const track = (orders, isBuy) => orders.forEach(([p, q]) => {
    if (q < minQ) return;
    const key = p.toFixed(8);
    activeKeys.add(key);
    if (!wallHistory.has(key)) {
      wallHistory.set(key, { price: p, isBuy, firstSeen: now, maxSize: q, minSize: q, status: "active" });
    } else {
      const w = wallHistory.get(key);
      w.maxSize = Math.max(w.maxSize, q);
      w.minSize = Math.min(w.minSize, q);
    }
  });
  track(bids, true);
  track(asks, false);
  wallHistory.forEach((w, key) => {
    if (w.status === "active" && !activeKeys.has(key)) {
      const reached = w.isBuy ? bids[0][0] <= w.price : asks[0][0] >= w.price;
      w.status = reached ? "eaten" : "pulled";
      w.disappearedAt = now;
    }
  });

  const bigAsks = asks.filter(([p, q]) => q >= minQ).sort((a, b) => b[1] - a[1]).slice(0, 5).sort((a, b) => a[0] - b[0]);
  const bigBids = bids.filter(([p, q]) => q >= minQ).sort((a, b) => b[1] - a[1]).slice(0, 5).sort((a, b) => b[0] - a[0]);
  const maxQ = Math.max(...bigAsks.map(x => x[1]), ...bigBids.map(x => x[1]), 1);

  const wallRow = ([p, q], isBuy) => {
    const w = Math.max(3, q / maxQ * 100);
    const dist = ((p / mid - 1) * 100).toFixed(2);
    const key = p.toFixed(8);
    const tracked = wallHistory.get(key);
    let age = "", cred = "";
    if (tracked) {
      const a = Math.round((now - tracked.firstSeen) / 1000);
      age = a > 60 ? `${Math.floor(a / 60)}分` : `${a}秒`;
      const ageScore = a > 300 ? 40 : a > 60 ? 25 : a > 30 ? 15 : 5;
      const varScore = tracked.maxSize > 0 && (tracked.maxSize - tracked.minSize) / tracked.maxSize < 0.2 ? 20 : 10;
      const score = ageScore + varScore;
      cred = score >= 70 ? '<span class="w-cred cred-high">🟢真实</span>'
           : score >= 45 ? '<span class="w-cred cred-mid">🟡可能</span>'
           : '<span class="w-cred cred-low">🟠存疑</span>';
    }
    return `<div class="w-row">
      <span class="w-price">${fmtP(p)}</span>
      <span class="w-bar"><span class="w-fill ${isBuy ? "buy" : "sell"}" style="width:${w}%"></span></span>
      <span class="w-qty">${fmtQ(q)}</span>
      <span class="w-dist">${dist >= 0 ? "+" : ""}${dist}%</span>
      <span class="w-age">${age}</span>
      ${cred || '<span class="w-cred" style="color:var(--muted)">--</span>'}
    </div>`;
  };

  let html = "";
  if (bigAsks.length) {
    html += `<div class="wall-h sell">卖墙 · 阻力位</div>`;
    html += bigAsks.map(x => wallRow(x, false)).join("");
  }
  if (bigBids.length) {
    html += `<div class="wall-h buy">买墙 · 支撑位</div>`;
    html += bigBids.map(x => wallRow(x, true)).join("");
  }

  let eaten = 0, pulled = 0;
  wallHistory.forEach(w => { if (w.status === "eaten") eaten++; else if (w.status === "pulled") pulled++; });
  if (wallHistory.size > 0) {
    html += `<div class="wall-stats">
      <span>追踪${wallHistory.size}墙</span>
      <span style="color:var(--down)">被吃${eaten}←真实</span>
      <span style="color:var(--up)">被撤${pulled}←疑似假</span>
    </div>`;
  }
  $("wallsArea").innerHTML = html || "<span class='loading'>无大额挂单</span>";
  $("wallTime").textContent = fmtClock(new Date());
}

// ==================== 计算器 ====================
function updateCalc() {
  const lev = Math.min(125, Math.max(1, +$("lev").value || 10));
  const mmr = +$("mmr").value || 0.005;
  const margin = +$("margin").value || 0;
  const entry = +$("entry").value || price;
  if (entry <= 0) return;
  const exitP = +$("exitP").value || entry;
  const imr = 1 / lev;
  const lpL = entry * (1 - imr + mmr);
  const lpS = entry * (1 + imr - mmr);
  $("liqLong").textContent = fmtP(lpL);
  $("liqShort").textContent = fmtP(lpS);
  if (margin > 0) {
    const qty = margin * lev / entry;
    const pnlL = qty * (exitP - entry);
    const pnlS = qty * (entry - exitP);
    $("pnlLong").textContent = `${pnlL >= 0 ? "+" : ""}${pnlL.toFixed(2)}U`;
    $("pnlLong").style.color = pnlL >= 0 ? "var(--up)" : "var(--down)";
    $("pnlShort").textContent = `${pnlS >= 0 ? "+" : ""}${pnlS.toFixed(2)}U`;
    $("pnlShort").style.color = pnlS >= 0 ? "var(--up)" : "var(--down)";
    $("posSize").textContent = `${fmtU(margin * lev)} (${qty < 1 ? qty.toFixed(4) : fmtQ(qty)} ${META[coin].sym})`;
  }
}

// ==================== 回测 ====================
async function runBacktest(dir) {
  const isLong = dir === "long";
  const btn = $(isLong ? "btLong" : "btShort");
  const el = $("btResult");
  btn.disabled = true;
  el.classList.remove("hidden");
  el.innerHTML = "<span class='loading'>回测中…</span>";
  try {
    const kl = await apiGet(`/api/v3/klines?symbol=${coin}&interval=1h&limit=500`);
    const TP = 0.02, SL = 0.01, MAX = 24;
    let trades = 0, wins = 0, losses = 0, totalPL = 0;
    let open = null;
    for (let i = 50; i < kl.length; i++) {
      const close = +kl[i][4];
      if (open) {
        const h = +kl[i][2], l = +kl[i][3];
        if (isLong) {
          if (h >= open.e * (1 + TP)) { totalPL += TP; trades++; wins++; open = null; }
          else if (l <= open.e * (1 - SL)) { totalPL -= SL; trades++; losses++; open = null; }
        } else {
          if (l <= open.e * (1 - TP)) { totalPL += TP; trades++; wins++; open = null; }
          else if (h >= open.e * (1 + SL)) { totalPL -= SL; trades++; losses++; open = null; }
        }
        if (open && i - open.b >= MAX) {
          const pl = isLong ? close / open.e - 1 : 1 - close / open.e;
          totalPL += pl; trades++; if (pl >= 0) wins++; else losses++;
          open = null;
        }
        continue;
      }
      const hist = kl.slice(i - 24, i + 1), r6 = hist.slice(-6);
      let bs = 0, vs = 0;
      r6.forEach(k => { bs += +k[10]; vs += +k[7]; });
      const tr = vs > 0 ? bs / vs : 0.5;
      const ml = Math.min(...hist.map(k => +k[3]));
      const mh = Math.max(...hist.map(k => +k[2]));
      const pv = hist.slice(0, -6).reduce((s, k) => s + +k[7], 0) / 18;
      const vol = (vs / 6) > pv * 1.2;
      const g = r6.filter(k => +k[4] >= +k[1]).length;
      const score = isLong
        ? (tr > 0.55 ? 1 : 0) + (close <= ml * 1.015 ? 1 : 0) + (vol ? 1 : 0) + (g >= 4 ? 1 : 0)
        : (tr < 0.45 ? 1 : 0) + (close >= mh * 0.985 ? 1 : 0) + (vol ? 1 : 0) + (g <= 2 ? 1 : 0);
      if (score >= 3) open = { e: close, b: i };
    }
    const wr = trades > 0 ? (wins / trades * 100).toFixed(1) : 0;
    el.innerHTML = `
      <div class="r"><span>${isLong ? "📈做多" : "📉做空"} ${META[coin].sym}</span><b>${trades}笔</b></div>
      <div class="r"><span>胜率</span><b class="${wr >= 50 ? "good" : "bad"}">${wr}% (${wins}W/${losses}L)</b></div>
      <div class="r"><span>累计</span><b class="${totalPL >= 0 ? "good" : "bad"}">${totalPL >= 0 ? "+" : ""}${(totalPL * 100).toFixed(1)}%</b></div>`;
  } catch (e) {
    el.innerHTML = `<span style="color:var(--up)">失败: ${e.message}</span>`;
  } finally {
    btn.disabled = false;
  }
}

// ==================== 事件 & 初始化 ====================
$("coinSel").addEventListener("change", (e) => {
  coin = e.target.value;
  wallHistory.clear();
  $("entry").value = "";
  fetchAll();
});
$("intervalSel").addEventListener("change", (e) => {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchAll, +e.target.value * 1000);
});
$("refreshBtn").addEventListener("click", fetchAll);
$("btLong").addEventListener("click", () => runBacktest("long"));
$("btShort").addEventListener("click", () => runBacktest("short"));
["lev", "margin", "entry", "exitP", "mmr"].forEach(id =>
  $(id).addEventListener("input", updateCalc));

// 启动
fetchAll();
refreshTimer = setInterval(fetchAll, 30000);
