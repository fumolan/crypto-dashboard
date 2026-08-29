// Crypto Dashboard - 全模块联动仪表盘
// 全局币种选择器驱动: 价格/成交/市值/大单/盘口/信号/计算器

// ==================== 配置 ====================
const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com", "https://api1.binance.com"];
// 30币池: 币安与OKX双所共上线, 按双所合计流动性排序(主流8币+双所交集22币)
const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "TRXUSDT",
  "ZECUSDT", "REUSDT", "TRUMPUSDT", "PUMPUSDT", "ENAUSDT", "PEPEUSDT", "SUIUSDT", "LINKUSDT",
  "NEARUSDT", "UNIUSDT", "AAVEUSDT", "XLMUSDT", "LTCUSDT", "WLDUSDT", "TAOUSDT", "ONDOUSDT",
  "XPLUSDT", "AVAXUSDT", "BCHUSDT", "ZROUSDT", "HBARUSDT", "POLUSDT",
];
const META = {
  BTCUSDT: { sym: "BTC", name: "比特币" }, ETHUSDT: { sym: "ETH", name: "以太坊" },
  BNBUSDT: { sym: "BNB", name: "" }, SOLUSDT: { sym: "SOL", name: "" },
  XRPUSDT: { sym: "XRP", name: "瑞波币" }, DOGEUSDT: { sym: "DOGE", name: "狗狗币" },
  ADAUSDT: { sym: "ADA", name: "艾达币" }, TRXUSDT: { sym: "TRX", name: "波场" },
  ZECUSDT: { sym: "ZEC", name: "大零币" }, REUSDT: { sym: "RE", name: "" },
  TRUMPUSDT: { sym: "TRUMP", name: "特朗普币" }, PUMPUSDT: { sym: "PUMP", name: "" },
  ENAUSDT: { sym: "ENA", name: "" }, PEPEUSDT: { sym: "PEPE", name: "佩佩蛙" },
  SUIUSDT: { sym: "SUI", name: "" }, LINKUSDT: { sym: "LINK", name: "链环" },
  NEARUSDT: { sym: "NEAR", name: "" }, UNIUSDT: { sym: "UNI", name: "" },
  AAVEUSDT: { sym: "AAVE", name: "" }, XLMUSDT: { sym: "XLM", name: "恒星币" },
  LTCUSDT: { sym: "LTC", name: "莱特币" }, WLDUSDT: { sym: "WLD", name: "" },
  TAOUSDT: { sym: "TAO", name: "" }, ONDOUSDT: { sym: "ONDO", name: "" },
  XPLUSDT: { sym: "XPL", name: "" }, AVAXUSDT: { sym: "AVAX", name: "雪崩" },
  BCHUSDT: { sym: "BCH", name: "比特现金" }, ZROUSDT: { sym: "ZRO", name: "zkSync" },
  HBARUSDT: { sym: "HBAR", name: "" }, POLUSDT: { sym: "POL", name: "Polygon" },
};
// ===== 币种性格分档: 不同档位用不同的信号权重/阈值/止盈止损 =====
// whale=鲸鱼方向权重 flow=买卖盘权重 trend=量价配合权重 sr=近支撑权重 (合计100)
// buyTh=买盘主导阈值 whaleTh=鲸鱼买卖比阈值 srDist=近支撑距离% tp/sl=止盈止损
const COIN_PROFILES = {
  major:    { label: "主流",   whale: 15, flow: 30, trend: 25, sr: 30, buyTh: 0.55, whaleTh: 1.25, srDist: 1.5, tp: 0.02,  sl: 0.01 },
  alt:      { label: "山寨",   whale: 25, flow: 25, trend: 25, sr: 25, buyTh: 0.55, whaleTh: 1.20, srDist: 2.0, tp: 0.03,  sl: 0.015 },
  volatile: { label: "高波动", whale: 40, flow: 20, trend: 15, sr: 25, buyTh: 0.52, whaleTh: 1.30, srDist: 3.0, tp: 0.05,  sl: 0.02 },
};
const COIN_CLASS = {
  BTCUSDT: "major", ETHUSDT: "major", BNBUSDT: "major",
  SOLUSDT: "alt", XRPUSDT: "alt", ADAUSDT: "alt", TRXUSDT: "alt", AVAXUSDT: "alt",
  LINKUSDT: "alt", NEARUSDT: "alt", UNIUSDT: "alt", AAVEUSDT: "alt", LTCUSDT: "alt",
  BCHUSDT: "alt", XLMUSDT: "alt", HBARUSDT: "alt", SUIUSDT: "alt",
  DOGEUSDT: "volatile", PEPEUSDT: "volatile", TRUMPUSDT: "volatile", PUMPUSDT: "volatile",
  ENAUSDT: "volatile", WLDUSDT: "volatile", TAOUSDT: "volatile", ONDOUSDT: "volatile",
  XPLUSDT: "volatile", ZROUSDT: "volatile", REUSDT: "volatile", POLUSDT: "volatile",
  ZECUSDT: "volatile",
};
const coinProfile = (s) => COIN_PROFILES[COIN_CLASS[s] || "alt"];
// 大盘指数权重(估算市值占比, 仅用于相对形态, 归一化后使用)
const MC_WEIGHTS = { BTCUSDT: 0.58, ETHUSDT: 0.12, BNBUSDT: 0.018, SOLUSDT: 0.03,
  XRPUSDT: 0.025, DOGEUSDT: 0.012, ADAUSDT: 0.008, TRXUSDT: 0.007, ZECUSDT: 0.0022,
  REUSDT: 0.0008, TRUMPUSDT: 0.0012, PUMPUSDT: 0.0015, ENAUSDT: 0.0015, PEPEUSDT: 0.004,
  SUIUSDT: 0.0045, LINKUSDT: 0.005, NEARUSDT: 0.003, UNIUSDT: 0.003, AAVEUSDT: 0.003,
  XLMUSDT: 0.0022, LTCUSDT: 0.006, WLDUSDT: 0.0015, TAOUSDT: 0.003, ONDOUSDT: 0.002,
  XPLUSDT: 0.001, AVAXUSDT: 0.004, BCHUSDT: 0.005, ZROUSDT: 0.0015, HBARUSDT: 0.0022,
  POLUSDT: 0.002 };

const $ = (id) => document.getElementById(id);
const fmtP = (p) => p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p >= 0.01 ? p.toFixed(4) : p.toPrecision(4);
const fmtQ = (q) => q >= 1e6 ? (q / 1e6).toFixed(1) + "M" : q >= 1e3 ? (q / 1e3).toFixed(1) + "K" : q.toFixed(2);
const fmtU = (v) => v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(0) + "K" : "$" + v.toFixed(0);
const fmtT = (v) => v >= 1e12 ? "$" + (v / 1e12).toFixed(3) + "T" : fmtU(v);
const fmtClock = (d) => d.toLocaleTimeString("zh-CN", { hour12: false });

// ==================== 状态 ====================
let coin = "BTCUSDT";
let dataSource = "binance";   // binance | okx
let price = 0;
let priceCoin = null;   // price属于哪个币种(防止切换币种时串价)
let klines5m = [];      // 4H 5分钟线(图表用)
let klines1h = {};      // 各币1小时线(趋势/信号用)
let trades = [];        // 大单
let depth = null;       // 盘口
let globalMC = 0;       // 总市值
let tickerCache = {};   // 24h行情缓存(主流币价格条用)
let wallHistory = new Map();
let lastWhaleBuyQ = 0, lastWhaleSellQ = 0;
let refreshTimer = null;
let longScore = 0, shortScore = 0;   // 当前做多/做空信号得分

// ==================== OKX API ====================
const OKX = "https://www.okx.com";
const okxInst = (s) => s.replace("USDT", "-USDT");

async function okxGet(path) {
  const r = await fetch(OKX + path, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error("OKX HTTP " + r.status);
  const j = await r.json();
  if (j.code !== "0") throw new Error("OKX " + (j.msg || j.code));
  return j.data || [];
}

async function fetchOKXTrades(sym) {
  const instId = okxInst(sym);
  const first = await okxGet(`/api/v5/market/trades?instId=${instId}&limit=500`);
  let all = first.map(t => ({ p: +t.px, q: +t.sz, ts: +t.ts, buy: t.side === "buy", id: t.tradeId }));
  let after = first.length ? first[first.length - 1].tradeId : null;
  for (let i = 0; i < 2 && after; i++) {
    const batch = await okxGet(`/api/v5/market/history-trades?instId=${instId}&limit=500&after=${after}`);
    if (!batch.length) break;
    all = all.concat(batch.map(t => ({ p: +t.px, q: +t.sz, ts: +t.ts, buy: t.side === "buy", id: t.tradeId })));
    after = batch[batch.length - 1].tradeId;
  }
  return all;
}

async function fetchOKXDepth(sym) {
  const d = await okxGet(`/api/v5/market/books?instId=${okxInst(sym)}&sz=400`);
  if (!d[0]) throw new Error("OKX无盘口");
  return {
    bids: d[0].bids.map(x => [x[0], x[1]]),
    asks: d[0].asks.map(x => [x[0], x[1]])
  };
}

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
let fetchGen = 0;   // 请求代数: 切换币种后, 旧币种的在途请求返回时作废, 防止覆盖新币数据
let lastHourly = 0; // 全池1hK线节流: 30币每5s拉一轮会被限速, 60s拉一次足够
async function fetchAll() {
  const gen = ++fetchGen;
  const target = coin;   // 本次请求针对的币种
  $("statusDot").className = "dot";
  try {
    // 基础数据始终从币安(K线/行情), 大单和盘口按数据源切换
    const need1h = Date.now() - lastHourly > 60000;
    const [k5, tickers, all1h] = await Promise.all([
      apiGet(`/api/v3/klines?symbol=${coin}&interval=5m&limit=49`),
      apiGet(`/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(SYMBOLS))}`),
      need1h ? Promise.all(SYMBOLS.map(s => apiGet(`/api/v3/klines?symbol=${s}&interval=1h&limit=25`).catch(() => null))) : null,
    ]);
    if (need1h) lastHourly = Date.now();

    // 大单 + 盘口按数据源
    let tr = [], dep = null;
    if (dataSource === "okx") {
      [tr, dep] = await Promise.all([
        fetchOKXTrades(coin).catch(() => []),
        fetchOKXDepth(coin).catch(() => null),
      ]);
    } else {
      [tr, dep] = await Promise.all([
        apiGet(`/api/v3/aggTrades?symbol=${coin}&limit=1000`).catch(() => []),
        apiGet(`/api/v3/depth?symbol=${coin}&limit=100`).catch(() => null),
      ]);
    }

    // 期间切换了币种/数据源 → 本响应已过期, 丢弃, 防止旧币数据混入新币页面
    if (gen !== fetchGen || target !== coin) return;

    klines5m = k5;
    const tickerMap = {};
    tickers.forEach(t => tickerMap[t.symbol] = t);
    price = tickerMap[coin] ? parseFloat(tickerMap[coin].lastPrice) : 0;
    priceCoin = coin;
    if (need1h) SYMBOLS.forEach((s, i) => { if (all1h[i]) klines1h[s] = all1h[i]; });
    trades = tr;
    depth = dep;

    // 计算大单方向(统一格式)
    const minQ = getMinTradeQty(coin, price);
    const isBuy = (t) => dataSource === "okx" ? t.buy : t.m === false;
    const qty = (t) => dataSource === "okx" ? t.q : parseFloat(t.q);
    const large = tr.filter(t => qty(t) >= minQ);
    lastWhaleBuyQ = large.filter(t => isBuy(t)).reduce((s, t) => s + qty(t), 0);
    lastWhaleSellQ = large.filter(t => !isBuy(t)).reduce((s, t) => s + qty(t), 0);

    // CoinGecko总市值(不阻塞)
    fetch("https://api.coingecko.com/api/v3/global")
      .then(r => r.json())
      .then(j => { globalMC = j.data.total_market_cap.usd; renderMCChart(); })
      .catch(() => {});

    $("statusDot").className = "dot ok";
    $("lastUpdate").textContent = fmtClock(new Date());
    renderAll(tickerMap);
  } catch (e) {
    if (gen !== fetchGen) return;   // 过期请求的报错不算数
    $("statusDot").className = "dot err";
    console.error("fetchAll:", e);
  }
}

// 大单门槛: 已配置币种用固定值, 其余按~1万U名义额动态计算
function getMinTradeQty(sym, px) {
  const map = { BTCUSDT: 0.5, ETHUSDT: 10, BNBUSDT: 10, SOLUSDT: 50,
                XRPUSDT: 10000, DOGEUSDT: 50000, ADAUSDT: 5000, TRXUSDT: 50000 };
  if (map[sym]) return map[sym];
  return px > 0 ? Math.max(1, Math.ceil(10000 / px)) : 1;
}

// 取某币种最新价: 优先当前实时价, 回退到24h行情缓存
// 防止切换币种瞬间用上一个币的价格结算(BTC仓被DOGE价平仓的事故)
function priceOf(sym) {
  if (priceCoin === sym && price > 0) return price;
  const t = tickerCache[sym];
  return t ? parseFloat(t.lastPrice) : 0;
}

// ==================== 渲染调度 ====================
function renderAll(tickerMap) {
  if (tickerMap) tickerCache = tickerMap;
  renderCoinStrip();
  renderPriceChart();
  renderVolumeChart();
  renderMCChart();
  renderSignals(tickerMap);
  renderTrends();
  renderTrades();
  renderWalls();
  updateCalc();
  checkSimTrades();
}

// ==================== 主流币价格条 ====================
function renderCoinStrip() {
  const chips = SYMBOLS.map(s => {
    const t = tickerCache[s];
    if (!t) return "";
    const p = parseFloat(t.lastPrice);
    const chg = parseFloat(t.priceChangePercent);
    const cls = chg >= 0 ? "up" : "down";
    const arrow = chg >= 0 ? "▲" : "▼";
    const active = s === coin ? " active" : "";
    return `<div class="coin-chip${active}" data-sym="${s}" title="点击切换到 ${META[s].sym}">
      <div class="cc-sym">${META[s].sym}${META[s].name ? ` <span style="color:var(--muted);font-size:10px">${META[s].name}</span>` : ""}</div>
      <div class="cc-price">${fmtP(p)}</div>
      <div class="cc-chg ${cls}">${arrow}${Math.abs(chg).toFixed(2)}%</div>
    </div>`;
  }).join("");
  $("coinStrip").innerHTML = chips || "<span class='loading'>加载中…</span>";
  // 点击切换币种
  $("coinStrip").querySelectorAll(".coin-chip").forEach(el => {
    el.addEventListener("click", () => {
      coin = el.dataset.sym;
      $("coinSel").value = coin;
      wallHistory.clear();
      $("entry").value = "";
      resetSimForm();
      fetchAll();
    });
  });
}

// ==================== 价格图表 ====================
// ==================== 1小时价格细览 ====================
// 按币价自适应小数位: 大币2-3位, 中价4位, 小价5位, 微价(PEPE级)4位有效数字
function fmtP5(p) {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 100) return p.toFixed(3);
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  return p.toPrecision(4);
}

async function showHourPanel() {
  const sym = META[coin].sym;
  $("hourSym").textContent = `${sym} · 1分钟线`;
  $("hourOverlay").classList.remove("hidden");
  $("hourStats").innerHTML = "<span class='loading'>加载中…</span>";
  $("hourChart").innerHTML = "<span class='loading'>加载中…</span>";
  $("hourRows").innerHTML = "";
  try {
    const kl = await apiGet(`/api/v3/klines?symbol=${coin}&interval=1m&limit=61`);
    if (!Array.isArray(kl) || kl.length < 2) throw new Error("无数据");
    const bars = kl.slice(0, -1);              // 已收线的分钟
    const closes = bars.map(k => +k[4]);
    const first = closes[0], last = closes[closes.length - 1];
    const chg = (last / first - 1) * 100;
    const hi = Math.max(...bars.map(k => +k[2]));
    const lo = Math.min(...bars.map(k => +k[3]));
    const amp = (hi / lo - 1) * 100;
    const color = chg >= 0 ? "var(--up)" : "var(--down)";

    const dec = last >= 1000 ? 2 : last >= 100 ? 3 : last >= 1 ? 4 : last >= 0.01 ? 5 : 4;
    $("hourStats").innerHTML = `
      <div class="hs-row"><span class="l">现价</span><b style="color:${color}">${fmtP5(last)}</b>
        <span class="l">1小时涨跌</span><b style="color:${color}">${chg >= 0 ? "+" : ""}${chg.toFixed(3)}%</b>
        <span class="l">显示精度</span><b>${dec === 4 && last < 0.01 ? "4位有效数字" : dec + "位小数"}</b></div>
      <div class="hs-row"><span class="l">最高</span><b style="color:var(--up)">${fmtP5(hi)}</b>
        <span class="l">最低</span><b style="color:var(--down)">${fmtP5(lo)}</b>
        <span class="l">振幅</span><b>${amp.toFixed(3)}%</b></div>`;

    // 分钟级曲线
    const W = 560, H = 170, PL = 96, PR = 10, PT = 10, PB = 18;
    const cw = W - PL - PR;
    const minP = Math.min(...closes), maxP = Math.max(...closes);
    const range = maxP - minP || Math.abs(minP) * 0.001 || 1;
    const x = i => PL + (i / (closes.length - 1)) * cw;
    const y = p => PT + (1 - (p - minP) / range) * (H - PT - PB);
    const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
    const ft = d => d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const lc = chg >= 0 ? "#e54545" : "#24b28c";
    $("hourChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}">
      <polygon points="${PL},${H-PB} ${pts} ${x(closes.length-1)},${H-PB}" fill="${lc}" opacity="0.08"/>
      <line x1="${PL}" y1="${y(maxP)}" x2="${W-PR}" y2="${y(maxP)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
      <line x1="${PL}" y1="${y(minP)}" x2="${W-PR}" y2="${y(minP)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
      <text x="${PL-4}" y="${y(maxP)+3}" text-anchor="end" font-size="9" fill="#7a8299">${fmtP5(maxP)}</text>
      <text x="${PL-4}" y="${y(minP)+3}" text-anchor="end" font-size="9" fill="#7a8299">${fmtP5(minP)}</text>
      <polyline points="${pts}" fill="none" stroke="${lc}" stroke-width="1.6"/>
      <circle cx="${x(closes.length-1)}" cy="${y(last)}" r="3" fill="${lc}"/>
      <text x="${W-PR}" y="14" text-anchor="end" font-size="11" fill="${lc}" font-weight="700">${fmtP5(last)}</text>
      <text x="${PL}" y="${H-5}" font-size="8.5" fill="#7a8299">${ft(new Date(+bars[0][0]))}</text>
      <text x="${W-PR}" y="${H-5}" text-anchor="end" font-size="8.5" fill="#7a8299">${ft(new Date(+bars[bars.length-1][0]))}</text>
    </svg>`;

    // 分钟明细(最新在前)
    const rev = [...bars].reverse();
    $("hourRows").innerHTML = rev.map((k, i) => {
      const p = +k[4];
      const prev = rev[i + 1] ? +rev[i + 1][4] : null;
      const d = prev ? (p / prev - 1) * 100 : 0;
      return `<div class="hr-row">
        <span class="h-time">${ft(new Date(+k[0]))}</span>
        <span class="h-price">${fmtP5(p)}</span>
        <span class="h-chg ${d >= 0 ? "up" : "down"}">${prev === null ? "--" : (d >= 0 ? "+" : "") + d.toFixed(3) + "%"}</span>
      </div>`;
    }).join("");
  } catch (e) {
    $("hourChart").innerHTML = `<span class='loading'>加载失败: ${e.message}</span>`;
  }
}

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

  const curP = price || closes[closes.length - 1];

  // 4H 统计: 平均数 / 中位数 / 众数
  const stats = calcPriceStats(closes);

  // 在图表上画统计线
  let statLines = "";
  if (stats.avg >= minP && stats.avg <= maxP) {
    statLines += `<line x1="${PL}" y1="${y(stats.avg)}" x2="${W-PR}" y2="${y(stats.avg)}" stroke="#a855f7" stroke-width="0.8" stroke-dasharray="6,3" opacity="0.7"/>
      <text x="${PL+2}" y="${y(stats.avg)-2}" font-size="7.5" fill="#a855f7">均${fmtP(stats.avg)}</text>`;
  }
  if (stats.median >= minP && stats.median <= maxP) {
    statLines += `<line x1="${PL}" y1="${y(stats.median)}" x2="${W-PR}" y2="${y(stats.median)}" stroke="#f0b90b" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="${PL+2}" y="${y(stats.median)-2}" font-size="7.5" fill="#f0b90b">中${fmtP(stats.median)}</text>`;
  }
  if (stats.mode >= minP && stats.mode <= maxP && stats.modeCount > 2) {
    statLines += `<line x1="${PL}" y1="${y(stats.mode)}" x2="${W-PR}" y2="${y(stats.mode)}" stroke="#24b28c" stroke-width="0.8" stroke-dasharray="1,3" opacity="0.6"/>
      <text x="${PL+2}" y="${y(stats.mode)-2}" font-size="7.5" fill="#24b28c">众${fmtP(stats.mode)}×${stats.modeCount}</text>`;
  }

  $("priceChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}">
    <polygon points="${PL},${H-PB} ${pts} ${x(closes.length-1)},${H-PB}" fill="${color}" opacity="0.08"/>
    <line x1="${PL}" y1="${y(maxP)}" x2="${W-PR}" y2="${y(maxP)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
    <line x1="${PL}" y1="${y(minP)}" x2="${W-PR}" y2="${y(minP)}" stroke="#2a3242" stroke-dasharray="3,3" stroke-width="0.5"/>
    <line x1="${PL}" y1="${y(curP)}" x2="${W-PR}" y2="${y(curP)}" stroke="${color}" stroke-dasharray="4,3" stroke-width="0.8" opacity="0.6"/>
    <text x="${PL-4}" y="${y(maxP)+3}" text-anchor="end" font-size="9" fill="#7a8299">${fmtP(maxP)}</text>
    <text x="${PL-4}" y="${y(minP)+3}" text-anchor="end" font-size="9" fill="#7a8299">${fmtP(minP)}</text>
    ${statLines}
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="${x(closes.length-1)}" cy="${y(closes[closes.length-1])}" r="3" fill="${color}"/>
    <text x="${W-PR}" y="14" text-anchor="end" font-size="11" fill="${color}" font-weight="700">${chg>=0?"+":""}${chg.toFixed(2)}%</text>
    <text x="${PL}" y="${H-4}" font-size="8" fill="#7a8299">${ft(t0)}</text>
    <text x="${W-PR}" y="${H-4}" text-anchor="end" font-size="8" fill="#7a8299">${ft(t1)}</text>
  </svg>`;

  const curVsAvg = ((curP / stats.avg - 1) * 100).toFixed(2);
  const avgColor = curP >= stats.avg ? "var(--up)" : "var(--down)";
  $("priceInfo").innerHTML = `
    <span style="font-size:15px;font-weight:800;color:${color}">${fmtP(curP)}</span>
    <span style="color:var(--muted)"> USDT</span>
    <span style="color:${color};font-weight:700;margin-left:6px">${chg>=0?"▲":"▼"}${Math.abs(chg).toFixed(2)}%</span>
    <span style="color:var(--muted);margin-left:8px">高${fmtP(maxP)} 低${fmtP(minP)}</span>
    <span style="margin-left:8px;color:#a855f7">均<b>${fmtP(stats.avg)}</b><small>(${curVsAvg>=0?"+":""}${curVsAvg}%)</small></span>
    <span style="margin-left:6px;color:#f0b90b">中<b>${fmtP(stats.median)}</b></span>
    <span style="margin-left:6px;color:#24b28c">众<b>${fmtP(stats.mode)}</b><small>×${stats.modeCount}</small></span>`;
}

// 4H价格统计: 平均/中位/众数
function calcPriceStats(closes) {
  const n = closes.length;
  const sorted = [...closes].sort((a, b) => a - b);
  const avg = closes.reduce((s, c) => s + c, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  // 众数: 按价格精度分桶, 找出现最多的桶
  const range = sorted[n - 1] - sorted[0];
  const bucketSize = range > 100 ? 10 : range > 1 ? 0.1 : range > 0.01 ? 0.001 : 0.0001;
  const buckets = {};
  closes.forEach(c => {
    const key = Math.round(c / bucketSize) * bucketSize;
    buckets[key] = (buckets[key] || 0) + 1;
  });
  let mode = 0, modeCount = 0;
  Object.entries(buckets).forEach(([k, v]) => {
    if (v > modeCount) { modeCount = v; mode = +k; }
  });

  return { avg, median, mode, modeCount };
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

  // 买占比统计
  const rStats = calcRatioStats(ratios);
  const avgY = yR(rStats.avg), medY = yR(rStats.median);
  const avgLabel = (rStats.avg * 100).toFixed(1);
  const medLabel = (rStats.median * 100).toFixed(1);
  const modeLabel = (rStats.mode * 100).toFixed(1);

  $("volChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}">
    <line x1="${PL}" y1="${yR(0.5)}" x2="${W-PR}" y2="${yR(0.5)}" stroke="#7a8299" stroke-dasharray="3,3" stroke-width="0.6" opacity="0.5"/>
    <text x="${PL-4}" y="${yR(0.5)+3}" text-anchor="end" font-size="8" fill="#7a8299">50%</text>
    <line x1="${PL}" y1="${avgY}" x2="${W-PR}" y2="${avgY}" stroke="#f0b90b" stroke-width="0.8" stroke-dasharray="6,3" opacity="0.7"/>
    <text x="${W-PR-4}" y="${avgY-2}" text-anchor="end" font-size="7.5" fill="#f0b90b">均${avgLabel}%</text>
    <line x1="${PL}" y1="${medY}" x2="${W-PR}" y2="${medY}" stroke="#24b28c" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6"/>
    <text x="${W-PR-4}" y="${medY-2}" text-anchor="end" font-size="7.5" fill="#24b28c">中${medLabel}%</text>
    ${bars}
    <polyline points="${rPts}" fill="none" stroke="#a855f7" stroke-width="1.2" opacity="0.85"/>
    <text x="${W-PR}" y="14" text-anchor="end" font-size="9" fill="#a855f7">紫线=买占比</text>
  </svg>`;

  const totalVol = vols.reduce((s, v) => s + v, 0);
  const totalBuy = done.reduce((s, k) => s + +k[10], 0);
  const buyPct = totalVol > 0 ? (totalBuy / totalVol * 100).toFixed(1) : 0;
  $("volInfo").innerHTML = `
    <span style="font-weight:700;color:#a855f7">买占比 ${buyPct}%</span>
    <span style="margin-left:8px;color:#f0b90b">均<b>${avgLabel}%</b></span>
    <span style="margin-left:6px;color:#24b28c">中<b>${medLabel}%</b></span>
    <span style="margin-left:6px;color:#7a8299">众<b>${modeLabel}%</b>×${rStats.modeCount}</span>
    <span style="margin-left:8px;color:var(--muted)">总量${fmtU(totalVol * price)}</span>`;
}

// 买占比统计: 平均/中位/众数(按5%分桶)
function calcRatioStats(ratios) {
  const n = ratios.length;
  const sorted = [...ratios].sort((a, b) => a - b);
  const avg = ratios.reduce((s, r) => s + r, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  const bucket = 0.05;   // 5%一个桶
  const buckets = {};
  ratios.forEach(r => {
    const key = (Math.round(r / bucket) * bucket).toFixed(2);
    buckets[key] = (buckets[key] || 0) + 1;
  });
  let mode = 0.5, modeCount = 0;
  Object.entries(buckets).forEach(([k, v]) => {
    if (v > modeCount) { modeCount = v; mode = +k; }
  });

  return { avg, median, mode, modeCount };
}

// ==================== 成交透视: 量价分布+交易者画像+共识 ====================
$("xrayBtn").addEventListener("click", () => {
  $("xrayOverlay").classList.remove("hidden");
  $("xraySym").textContent = META[coin].sym + "/USDT";
  runXray();
});
$("xrayClose").addEventListener("click", () => $("xrayOverlay").classList.add("hidden"));
$("xrayOverlay").addEventListener("click", (e) => {
  if (e.target === $("xrayOverlay")) $("xrayOverlay").classList.add("hidden");
});

function runXray() {
  if (!trades.length) return;
  // 统一格式
  const isBuy = (t) => dataSource === "okx" ? t.buy : t.m === false;
  const getP = (t) => +t.p;
  const getQ = (t) => dataSource === "okx" ? t.q : +t.q;

  // ========== ① 量价分布 ==========
  const priceVol = {};
  trades.forEach(t => {
    const p = getP(t), q = getQ(t);
    const key = p.toFixed(p >= 1000 ? 0 : p >= 1 ? 2 : 4);
    if (!priceVol[key]) priceVol[key] = { price: p, buy: 0, sell: 0, count: 0 };
    if (isBuy(t)) priceVol[key].buy += q; else priceVol[key].sell += q;
    priceVol[key].count++;
  });
  const levels = Object.values(priceVol).sort((a, b) => b.price - a.price);
  const maxVol = Math.max(...levels.map(l => l.buy + l.sell), 1);
  const poc = levels.reduce((m, l) => (l.buy + l.sell) > (m.buy + m.sell) ? l : m, levels[0]);

  // 取成交量前12个价位
  const top12 = levels.slice(0, Math.min(12, levels.length));
  $("xrayProfile").innerHTML = top12.map(l => {
    const total = l.buy + l.sell;
    const w = (total / maxVol * 100).toFixed(0);
    const buyPct = total > 0 ? (l.buy / total * 100) : 50;
    const isPOC = l === poc;
    const cls = buyPct > 60 ? "buy" : buyPct < 40 ? "sell" : "mixed";
    return `<div class="vp-row">
      <span class="vp-price ${isPOC ? "poc" : ""}">${fmtP(l.price)}${isPOC ? " ★" : ""}</span>
      <span class="vp-bar-wrap">
        <span class="vp-bar ${cls}" style="width:${w}%"></span>
      </span>
      <span class="vp-buy">${buyPct.toFixed(0)}%买</span>
      <span class="vp-sell">${l.count}笔</span>
    </div>`;
  }).join("");

  const pocTotal = poc.buy + poc.sell;
  const abovePOC = levels.filter(l => l.price > poc.price).reduce((s, l) => s + l.buy + l.sell, 0);
  const belowPOC = levels.filter(l => l.price < poc.price).reduce((s, l) => s + l.buy + l.sell, 0);
  $("xrayProfileInsight").innerHTML = `
    <b>成交最密集价位: ${fmtP(poc.price)}</b>（${poc.count}笔，占总成交${(pocTotal / trades.length * 100).toFixed(0)}%的笔数）—— 这是买卖双方<b>共识最强的"公允价格"</b>。<br>
    上方成交${abovePOC > belowPOC ? "更多" : "更少"}（${(abovePOC / (abovePOC + belowPOC) * 100).toFixed(0)}%），
    ${abovePOC > belowPOC ? "说明追高意愿强，买方愿意溢价买入" : "说明上方抛压重，卖方在高位积极出货"}。`;

  // ========== ② 交易者画像(含成交量权重) ==========
  const cats = [
    { label: "🧑 散户", max: 1000, cls: "retail", buy: 0, sell: 0, n: 0 },
    { label: "🧑‍💼 中户", max: 10000, cls: "mid", buy: 0, sell: 0, n: 0 },
    { label: "🏦 大户", max: 100000, cls: "whale", buy: 0, sell: 0, n: 0 },
    { label: "🐋 鲸鱼", max: Infinity, cls: "whale", buy: 0, sell: 0, n: 0 },
  ];
  trades.forEach(t => {
    const usd = getP(t) * getQ(t);
    const c = cats.find(c => usd < c.max) || cats[3];
    if (isBuy(t)) c.buy += usd; else c.sell += usd;
    c.n++;
  });

  // 计算总成交额和各类占比
  const totalUsd = cats.reduce((s, c) => s + c.buy + c.sell, 0) || 1;
  let weightedBuySum = 0;   // 加权买占比 = Σ(类别金额×类别买占比) / 总金额
  cats.forEach(c => {
    const vol = c.buy + c.sell;
    c.vol = vol;
    c.volPct = vol / totalUsd * 100;
    if (vol > 0) weightedBuySum += c.buy;   // 直接加总买入金额
  });
  const weightedBuyPct = (weightedBuySum / totalUsd * 100).toFixed(1);

  $("xrayTraders").innerHTML = cats.map(c => {
    if (c.vol === 0) return "";
    const buyPct = c.buy / c.vol * 100;
    const wBuy = buyPct.toFixed(0);
    const verdict = buyPct > 60 ? '<span style="color:var(--up)">净买</span>'
                  : buyPct < 40 ? '<span style="color:var(--down)">净卖</span>'
                  : '<span style="color:var(--muted)">均衡</span>';
    return `<div class="tr-row">
      <span class="tr-label ${c.cls}">${c.label}</span>
      <span class="tr-vol">${fmtU(c.vol)}<small style="color:var(--muted)">(${c.volPct.toFixed(0)}%)</small></span>
      <span class="tr-bar-wrap">
        <span class="tr-buy-bar" style="width:${wBuy}%"></span>
        <span class="tr-sell-bar" style="width:${100 - wBuy}%"></span>
      </span>
      <span class="tr-buypct">${wBuy}%</span>
      <span class="tr-sellpct">${c.n}笔</span>
      <span class="tr-verdict">${verdict}</span>
    </div>`;
  }).join("") + `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-top:4px;background:rgba(240,185,11,0.08);border-radius:5px;font-size:12px">
    <span style="color:var(--muted)">📊 成交量加权买占比</span>
    <b style="font-size:16px;color:${weightedBuyPct >= 50 ? "var(--up)" : "var(--down)"}">${weightedBuyPct}%</b>
  </div>
  <div style="font-size:10px;color:var(--muted);padding:2px 4px;margin-top:2px">
    总成交 ${fmtU(totalUsd)} · 谁的钱多谁说了算: ${(() => {
      const dominant = cats.reduce((m, c) => c.volPct > m.volPct ? c : m, cats[0]);
      return dominant.volPct > 50 ? `<b style="color:var(--accent)">${dominant.label}</b> 占${dominant.volPct.toFixed(0)}%的量, 主导方向` : "无单一类别过半";
    })()}
  </div>`;

  const whale = cats[3], retail = cats[0];
  let traderInsight = "";
  if (whale.n > 0 && retail.n > 0) {
    const wBuyPct = (whale.buy / (whale.buy + whale.sell) * 100).toFixed(0);
    const rBuyPct = (retail.buy / (retail.buy + retail.sell) * 100).toFixed(0);
    if (wBuyPct > 55 && rBuyPct < 45) {
      traderInsight = `<b>经典吸筹模式</b>：鲸鱼${wBuyPct}%在买，散户${rBuyPct}%在卖——大资金在接散户的恐慌抛售，通常是底部特征。`;
    } else if (wBuyPct < 45 && rBuyPct > 55) {
      traderInsight = `<b>经典派发模式</b>：鲸鱼在卖（${wBuyPct}%买），散户在追（${rBuyPct}%买）——大资金在高位出货给FOMO散户，通常是顶部特征。⚠️危险`;
    } else {
      traderInsight = `鲸鱼买占比${wBuyPct}%，散户买占比${rBuyPct}%——方向基本一致，暂无明显分歧。`;
    }
  }
  $("xrayTraderInsight").innerHTML = traderInsight || "样本不足，等待更多成交数据。";

  // ========== ③ 共识分析 ==========
  const ratios = trades.map(t => 0.5); // fallback
  const totalBuy = trades.filter(t => isBuy(t)).reduce((s, t) => s + getP(t) * getQ(t), 0);
  const totalSell = trades.filter(t => !isBuy(t)).reduce((s, t) => s + getP(t) * getQ(t), 0);
  const total = totalBuy + totalSell || 1;
  const overallBuyPct = totalBuy / total * 100;

  // 共识强度: 用买卖占比偏离50%的程度衡量
  const deviation = Math.abs(overallBuyPct - 50);
  const consensusLevel = deviation < 3 ? "高度分歧" : deviation < 8 ? "略有分歧" : deviation < 15 ? "方向一致" : "强烈共识";
  const consensusColor = deviation < 3 ? "var(--muted)" : deviation < 8 ? "#f0b90b" : "var(--down)";

  // 每分钟成交笔数(活跃度)
  const timeSpan = trades.length > 1 ? (+trades[trades.length-1][dataSource === "okx" ? "ts" : "T"] - +trades[0][dataSource === "okx" ? "ts" : "T"]) / 60000 : 1;
  const tradesPerMin = (trades.length / Math.max(1, timeSpan)).toFixed(0);

  $("xrayConsensus").innerHTML = `
    <div class="con-row">
      <span class="con-label">整体方向</span>
      <span class="con-bar-wrap"><span class="con-fill" style="width:${overallBuyPct}%;background:${overallBuyPct >= 50 ? "var(--up)" : "var(--down)"}"></span></span>
      <span class="con-val" style="color:${overallBuyPct >= 50 ? "var(--up)" : "var(--down)"}">${overallBuyPct >= 50 ? "买方" : "卖方"} ${overallBuyPct.toFixed(1)}%</span>
    </div>
    <div class="con-row">
      <span class="con-label">共识程度</span>
      <span class="con-bar-wrap"><span class="con-fill" style="width:${Math.min(100, deviation * 5)}%;background:${consensusColor}"></span></span>
      <span class="con-val" style="color:${consensusColor}">${consensusLevel}</span>
    </div>
    <div class="con-row">
      <span class="con-label">交易活跃度</span>
      <span class="con-bar-wrap"><span class="con-fill" style="width:${Math.min(100, tradesPerMin)}%;background:var(--purple)"></span></span>
      <span class="con-val">${tradesPerMin}笔/分钟</span>
    </div>
    <div class="con-row">
      <span class="con-label">公允价格(POC)</span>
      <span></span>
      <span class="con-val" style="color:var(--accent)">${fmtP(poc.price)}</span>
    </div>`;

  const consensusInsight = overallBuyPct > 60
    ? `<b>买方主导</b>（${overallBuyPct.toFixed(1)}%）：市场共识偏多，主动买入明显超过卖出。交易者期望价格继续上涨。`
    : overallBuyPct < 40
    ? `<b>卖方主导</b>（${(100 - overallBuyPct).toFixed(1)}%）：市场共识偏空，主动卖出占优。交易者预期价格下跌，正在积极出货。`
    : `市场接近均衡（买${overallBuyPct.toFixed(1)}%）：买卖双方对价格方向<b>没有共识</b>，处于博弈状态。此时趋势不明，建议等待突破。`;
  $("xrayConsensusInsight").innerHTML = consensusInsight;
}

// ==================== 总市值图表 ====================
let mcCurveCache = null;
async function renderMCChart() {
  if (!globalMC) return;
  try {
    // 30币全池5mK线60s拉一次, 其余轮次用缓存重绘
    if (!renderMCChart.batch || Date.now() - (renderMCChart.t || 0) > 60000) {
      renderMCChart.batch = await Promise.all(SYMBOLS.map(s =>
        apiGet(`/api/v3/klines?symbol=${s}&interval=5m&limit=49`).catch(() => null)));
      renderMCChart.t = Date.now();
    }
    const arr = renderMCChart.batch;
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
// ==================== 信号计算(纯函数, 任意币种可用, 按币种性格分档) ====================
// tr: 成交列表(币安原始或OKX归一格式皆可); 返回该币的多/空信号与得分
function computeCoinSignals(sym, tr) {
  const pf = coinProfile(sym);   // 该币的策略档位(权重/阈值/止盈止损)
  const kl = klines1h[sym];
  const px = priceOf(sym) || (kl && kl.length ? +kl[kl.length - 1][4] : 0);
  const longSigs = [], shortSigs = [];

  let ratio = 0.5, trendData = null, minLow = 0, maxHigh = 0, distLow = 99, distHigh = 99;
  if (kl && kl.length >= 24) {
    const done = kl.slice(0, -1);
    let buy = 0, totalV = 0;
    done.forEach(k => { buy += +k[10]; totalV += +k[7]; });
    ratio = totalV > 0 ? buy / totalV : 0.5;
    trendData = calcTrend(done);
    const lows = done.map(k => +k[3]);
    const highs = done.map(k => +k[2]);
    minLow = Math.min(...lows);
    maxHigh = Math.max(...highs);
    if (px > 0) {
      distLow = (px / minLow - 1) * 100;
      distHigh = (maxHigh / px - 1) * 100;
    }
  }
  // 该币自己的大单方向
  const minQ = getMinTradeQty(sym, px);
  const isBuy = (t) => t.buy !== undefined ? t.buy : t.m === false;
  const qOf = (t) => +t.q;
  const large = tr.filter(t => qOf(t) >= minQ);
  const wBuy = large.filter(t => isBuy(t)).reduce((s, t) => s + qOf(t), 0);
  const wSell = large.filter(t => !isBuy(t)).reduce((s, t) => s + qOf(t), 0);
  const hasWhale = wBuy > 0 || wSell > 0;
  const wRatio = wSell > 0 ? wBuy / wSell : (wBuy > 0 ? 99 : 0);

  // ===== 做多信号(权重/阈值取自该币档位) =====
  longSigs.push({ num: "①", name: "买盘主导", ok: ratio > pf.buyTh, val: `${(ratio*100).toFixed(1)}%`, thresh: `>${(pf.buyTh*100).toFixed(0)}%`, prog: Math.min(100, ratio/pf.buyTh*100), pts: pf.flow });
  longSigs.push({ num: "②", name: "鲸鱼做多", ok: hasWhale && wRatio > pf.whaleTh, val: hasWhale ? `买/卖=${wRatio.toFixed(2)}` : "无", thresh: `>${pf.whaleTh}`, prog: hasWhale ? Math.min(100, wRatio/pf.whaleTh*100) : 0, pts: pf.whale });
  longSigs.push({ num: "③", name: "量价配合", ok: trendData ? (trendData.direction==="up" && trendData.volume!=="light") : false, val: trendData ? trendText(trendData) : "--", thresh: "上涨+放量", prog: trendData ? (trendData.direction==="up" ? (trendData.volume!=="light"?100:50) : 20) : 0, pts: pf.trend });
  longSigs.push({ num: "④", name: "近支撑", ok: distLow < pf.srDist, val: `距低${distLow.toFixed(1)}%`, thresh: `<${pf.srDist}%`, prog: Math.max(0, 100-distLow/pf.srDist*100), pts: pf.sr });

  // ===== 做空信号 =====
  const sellTh = 1 - pf.buyTh;
  shortSigs.push({ num: "①", name: "卖盘主导", ok: ratio < sellTh, val: `${(ratio*100).toFixed(1)}%`, thresh: `<${(sellTh*100).toFixed(0)}%`, prog: Math.min(100, (1-ratio)/(1-sellTh)*100), pts: pf.flow });
  shortSigs.push({ num: "②", name: "鲸鱼做空", ok: hasWhale && wRatio < 1/pf.whaleTh, val: hasWhale ? `卖/买=${(1/wRatio).toFixed(2)}` : "无", thresh: `>${pf.whaleTh}`, prog: hasWhale ? Math.min(100, (1/wRatio)/pf.whaleTh*100) : 0, pts: pf.whale });
  shortSigs.push({ num: "③", name: "量价配合", ok: trendData ? (trendData.direction==="down" && trendData.volume!=="light") : false, val: trendData ? trendText(trendData) : "--", thresh: "下跌+放量", prog: trendData ? (trendData.direction==="down" ? (trendData.volume!=="light"?100:50) : 20) : 0, pts: pf.trend });
  shortSigs.push({ num: "④", name: "近阻力", ok: distHigh < pf.srDist, val: `距高${distHigh.toFixed(1)}%`, thresh: `<${pf.srDist}%`, prog: Math.max(0, 100-distHigh/pf.srDist*100), pts: pf.sr });

  return {
    longSigs, shortSigs, pf,
    longScore: longSigs.reduce((s, sig) => s + (sig.ok ? sig.pts : 0), 0),
    shortScore: shortSigs.reduce((s, sig) => s + (sig.ok ? sig.pts : 0), 0),
  };
}

function renderSignals(tickerMap) {
  const { longSigs, shortSigs, pf } = computeCoinSignals(coin, trades);
  longScore = longSigs.reduce((s, sig) => s + (sig.ok ? sig.pts : 0), 0);
  shortScore = shortSigs.reduce((s, sig) => s + (sig.ok ? sig.pts : 0), 0);

  // ===== 方向判定 =====
  let direction, dirColor, dirReason;
  if (longScore >= 75 && longScore > shortScore + 25) {
    direction = "📈 建议做多"; dirColor = "go";
    dirReason = `做多${longScore}分 vs 做空${shortScore}分 → 多方信号占绝对优势`;
  } else if (shortScore >= 75 && shortScore > longScore + 25) {
    direction = "📉 建议做空"; dirColor = "go";
    dirReason = `做空${shortScore}分 vs 做多${longScore}分 → 空方信号占绝对优势`;
  } else if (longScore >= 50 && longScore > shortScore + 15) {
    direction = "📈 偏多(观望)"; dirColor = "wait";
    dirReason = `做多${longScore}分但未达75, 可轻仓试多或等更多确认`;
  } else if (shortScore >= 50 && shortScore > longScore + 15) {
    direction = "📉 偏空(观望)"; dirColor = "wait";
    dirReason = `做空${shortScore}分但未达75, 可轻仓试空或等更多确认`;
  } else {
    direction = "⏸️ 方向不明"; dirColor = "no";
    dirReason = `做多${longScore} vs 做空${shortScore} → 信号矛盾或都不足, 别动`;
  }

  // ===== 渲染 =====
  const scoreEl = $("signalScore");
  scoreEl.innerHTML = `${longScore}<span style="font-size:14px;color:var(--muted)">多</span> vs ${shortScore}<span style="font-size:14px;color:var(--muted)">空</span>`;
  scoreEl.className = "sg-score " + dirColor;
  const badge = $("signalProfile");
  if (badge) badge.innerHTML = `${META[coin].sym} · <b>${pf.label}档</b> · 止盈+${(pf.tp*100).toFixed(1)}%/止损-${(pf.sl*100).toFixed(1)}% · 权重 鲸${pf.whale}/盘${pf.flow}/势${pf.trend}/撑${pf.sr}`;
  const bar = $("scoreBar");
  if (bar) {
    bar.style.width = Math.max(longScore, shortScore) + "%";
    bar.style.background = longScore > shortScore ? "var(--up)" : "var(--down)";
  }

  const renderSigs = (sigs, label, score, color) =>
    `<div class="sig-dir-header" style="color:${color};font-weight:700;font-size:12px;margin:4px 0">${label} ${score}/100</div>` +
    sigs.map(sig => {
      const progCls = sig.ok ? "pass" : sig.prog >= 60 ? "near" : "far";
      return `<div class="sig-calc ${sig.ok ? "passed" : "failed"}">
        <div class="sc-head">
          <span class="sc-num">${sig.num}</span>
          <span class="sc-name">${sig.name}</span>
          <span class="sc-pass ${sig.ok ? "on" : "off"}">${sig.ok ? "🟢" : "⚪"}</span>
          <span class="sc-pts ${sig.ok ? "on" : "off"}">${sig.ok ? sig.pts : 0}</span>
        </div>
        <div class="sc-detail">
          <span><span class="sc-val">${sig.val}</span> <span class="sc-thresh">(${sig.thresh})</span></span>
        </div>
        <div class="sc-bar"><div class="sc-bar-fill ${progCls}" style="width:${Math.min(100, sig.prog)}%"></div></div>
      </div>`;
    }).join("");

  $("signalList").innerHTML =
    renderSigs(longSigs, "📈 做多信号", longScore, "var(--up)") +
    renderSigs(shortSigs, "📉 做空信号", shortScore, "var(--down)");

  const v = $("signalVerdict");
  v.innerHTML = `${direction}<br><span style="font-size:10px;font-weight:400;color:var(--muted)">${dirReason}</span>`;
  v.className = "verdict " + dirColor;
}

// ==================== 开仓机会扫描(全池30币) ====================
let scanBusy = false;
function scanVerdict(ls, ss) {
  if (ls >= 75 && ls > ss + 25) return { tag: "📈 做多", dir: "long", color: "var(--up)", strong: true };
  if (ss >= 75 && ss > ls + 25) return { tag: "📉 做空", dir: "short", color: "var(--down)", strong: true };
  if (ls >= 50 && ls > ss + 15) return { tag: "偏多观望", dir: "long", color: "var(--accent)", strong: false };
  if (ss >= 50 && ss > ls + 15) return { tag: "偏空观望", dir: "short", color: "var(--accent)", strong: false };
  return null;
}

async function scanOpportunities() {
  if (scanBusy) return;
  scanBusy = true;
  $("scanOverlay").classList.remove("hidden");
  $("scanSummary").textContent = "";
  const listEl = $("scanList");
  const results = [];
  try {
    // 每批6个并发, 30币约3-4秒扫完; 大单逐币拉取, K线用缓存
    for (let i = 0; i < SYMBOLS.length; i += 6) {
      const batch = SYMBOLS.slice(i, i + 6);
      const rs = await Promise.all(batch.map(async s => {
        const tr = await apiGet(`/api/v3/aggTrades?symbol=${s}&limit=1000`).catch(() => []);
        return Object.assign({ s }, computeCoinSignals(s, tr));
      }));
      results.push(...rs);
      listEl.innerHTML = `<span class='loading'>⏳ 扫描中 ${results.length}/${SYMBOLS.length} …</span>`;
    }
    renderScanResults(results);
  } catch (e) {
    listEl.innerHTML = "<span class='loading'>扫描失败, 稍后再试</span>";
  }
  scanBusy = false;
}

function renderScanResults(results) {
  const rows = results.map(r => Object.assign(r, { v: scanVerdict(r.longScore, r.shortScore) }));
  const hits = rows.filter(r => r.v);
  rows.sort((a, b) => Math.max(b.longScore, b.shortScore) - Math.max(a.longScore, a.shortScore));
  $("scanSummary").innerHTML = `可开仓 <b style="color:var(--accent)">${hits.length}</b>/${SYMBOLS.length} (含观望级)`;
  $("scanList").innerHTML = rows.map(r => {
    const m = r.v;
    const t = tickerCache[r.s];
    const chg = t ? parseFloat(t.priceChangePercent) : 0;
    const px = t ? parseFloat(t.lastPrice) : 0;
    const hitTxt = m ? m.dir === "long" ? r.longSigs : r.shortSigs
      : [];
    const hits = hitTxt.filter(x => x.ok).map(x => x.name).join(" · ");
    return `<div class="scan-row${m ? (m.strong ? " hit strong" : " hit") : ""}" data-sym="${r.s}">
      <span class="sr-sym">${META[r.s].sym}</span>
      <span class="sr-tag ${coinProfile(r.s).label}">${coinProfile(r.s).label}</span>
      <span class="sr-verdict" style="color:${m ? m.color : "var(--muted)"}">${m ? m.tag : "— 不开仓"}</span>
      <span class="sr-price">${px ? fmtP(px) : "--"}</span>
      <span class="sr-score">多${r.longScore}/空${r.shortScore}</span>
      <span class="sr-hits">${hits}</span>
      <span class="sr-chg ${chg >= 0 ? "up" : "down"}">${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%</span>
    </div>`;
  }).join("");
  $("scanList").querySelectorAll(".scan-row").forEach(el => {
    el.addEventListener("click", () => {
      coin = el.dataset.sym;
      $("coinSel").value = coin;
      wallHistory.clear();
      $("entry").value = "";
      resetSimForm();
      $("scanOverlay").classList.add("hidden");
      fetchAll();
    });
  });
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
  const minQ = getMinTradeQty(coin, priceOf(coin));
  const seen = new Set();
  const isBuy = (t) => dataSource === "okx" ? t.buy : t.m === false;
  const getQ = (t) => dataSource === "okx" ? t.q : parseFloat(t.q);
  const getTs = (t) => dataSource === "okx" ? t.ts : +t.T;
  const getId = (t) => dataSource === "okx" ? t.id : t.a;
  const large = [];
  trades.forEach(t => {
    const id = getId(t);
    if (seen.has(id)) return;
    seen.add(id);
    const q = getQ(t);
    if (q >= minQ) large.push({ p: +t.p, q, usd: +t.p * q, ts: getTs(t), buy: isBuy(t) });
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

  // 被吃的墙(价格到达并消耗 = 真实成交)
  const eatenWalls = [];
  wallHistory.forEach(w => { if (w.status === "eaten") eatenWalls.push(w); });
  if (eatenWalls.length) {
    eatenWalls.sort((a, b) => b.maxSize - a.maxSize);
    html += `<div class="wall-h eaten">🍽️ 被吃的墙 <span class="sub">(价格到达并消耗 = 真实)</span></div>`;
    html += eatenWalls.slice(0, 5).map(w => {
      const age = Math.round((w.disappearedAt - w.firstSeen) / 1000);
      const ageStr = age > 60 ? `${Math.floor(age / 60)}分${age % 60}秒` : `${age}秒`;
      const hm = new Date(w.disappearedAt).toLocaleTimeString("zh-CN",
        { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return `<div class="w-row" style="background:rgba(36,178,140,0.05)">
        <span class="w-price">${fmtP(w.price)}</span>
        <span style="font-weight:700;font-size:11px;color:${w.isBuy ? "var(--up)" : "var(--down)"}">${w.isBuy ? "买墙" : "卖墙"}</span>
        <span class="w-qty">${fmtQ(w.maxSize)}</span>
        <span class="w-dist">${hm}</span>
        <span class="w-age">存活${ageStr}</span>
        <span class="w-cred cred-high">🟢真实</span>
      </div>`;
    }).join("");
  }

  let eaten = eatenWalls.length, pulled = 0;
  wallHistory.forEach(w => { if (w.status === "pulled") pulled++; });
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
  // 当前价显示
  if (price > 0) {
    $("curPrice").textContent = fmtP(price);
    // 开仓价留空时自动跟随现价
    if (!$("entry").value) $("entry").value = price;
  }
  const lev = Math.min(125, Math.max(1, +$("lev").value || 10));
  const mmr = +$("mmr").value || 0.005;
  const margin = +$("margin").value || 0;
  const entry = +$("entry").value || price;
  if (entry <= 0) return;
  const exitP = +$("exitP").value || entry;
  const imr = 1 / lev;
  const pf = coinProfile(coin);
  const TP = pf.tp, SL = pf.sl;

  // 爆仓价
  const lpL = entry * (1 - imr + mmr);
  const lpS = entry * (1 + imr - mmr);
  $("liqLong").textContent = fmtP(lpL);
  $("liqShort").textContent = fmtP(lpS);

  // 止盈止损价
  $("tpLong").textContent = fmtP(entry * (1 + TP));
  $("slLong").textContent = fmtP(entry * (1 - SL));
  $("tpShort").textContent = fmtP(entry * (1 - TP));
  $("slShort").textContent = fmtP(entry * (1 + SL));

  if (margin > 0) {
    const qty = margin * lev / entry;
    const pnlL = qty * (exitP - entry);
    const pnlS = qty * (entry - exitP);
    $("pnlLong").textContent = `${pnlL >= 0 ? "+" : ""}${pnlL.toFixed(2)}U`;
    $("pnlLong").style.color = pnlL >= 0 ? "var(--up)" : "var(--down)";
    $("pnlShort").textContent = `${pnlS >= 0 ? "+" : ""}${pnlS.toFixed(2)}U`;
    $("pnlShort").style.color = pnlS >= 0 ? "var(--up)" : "var(--down)";
    $("posSize").textContent = `${fmtU(margin * lev)} (${qty < 1 ? qty.toFixed(4) : fmtQ(qty)} ${META[coin].sym})`;
    $("tpProfit").textContent = `+$${(margin * lev * TP).toFixed(2)}`;
  }

  // 冲动开仓预览(显示即将开仓的价格信息)
  const impPreview = $("impulsePreview");
  if (impPreview && price > 0) {
    impPreview.innerHTML = `
      开仓 <b>${fmtP(entry)}</b> (现价) · <b>${pf.label}档</b><br>
      做多: 止盈 <span class="tp">${fmtP(entry * (1 + TP))}</span> / 止损 <span class="sl">${fmtP(entry * (1 - SL))}</span><br>
      做空: 止盈 <span class="tp">${fmtP(entry * (1 - TP))}</span> / 止损 <span class="sl">${fmtP(entry * (1 + SL))}</span> |
      仓位 <b>${fmtU(margin * lev)}</b> · 止盈赚 <span class="tp">+$${(margin * lev * TP).toFixed(2)}</span>`;
  }
}

// ==================== 回测 ====================
async function runBacktest(dir) {
  const isLong = dir === "long";
  const btn = $(isLong ? "btLong" : "btShort");
  const el = $("btResult");
  const tl = $("btTrades");
  btn.disabled = true;
  el.classList.remove("hidden");
  el.innerHTML = "<span class='loading'>回测中…</span>";
  try {
    const kl = await apiGet(`/api/v3/klines?symbol=${coin}&interval=1h&limit=500`);
    const pf = coinProfile(coin);
    const TP = pf.tp, SL = pf.sl, MAX = 24;
    let trades = 0, wins = 0, losses = 0, totalPL = 0;
    let open = null;
    let totalHoldBars = 0;
    const tradeLog = [];
    const t0 = +kl[0][0], t1 = +kl[kl.length - 1][0];
    const spanDays = ((t1 - t0) / 86400000).toFixed(0);
    const fmtDT = (ts) => new Date(ts).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

    for (let i = 50; i < kl.length; i++) {
      const close = +kl[i][4];
      if (open) {
        const h = +kl[i][2], l = +kl[i][3];
        let exited = false, result = "", pl = 0, exitP = close;
        if (isLong) {
          if (h >= open.e * (1 + TP)) { pl = TP; result = "TP"; exitP = open.e * (1 + TP); exited = true; }
          else if (l <= open.e * (1 - SL)) { pl = -SL; result = "SL"; exitP = open.e * (1 - SL); exited = true; }
        } else {
          if (l <= open.e * (1 - TP)) { pl = TP; result = "TP"; exitP = open.e * (1 - TP); exited = true; }
          else if (h >= open.e * (1 + SL)) { pl = -SL; result = "SL"; exitP = open.e * (1 + SL); exited = true; }
        }
        if (!exited && i - open.b >= MAX) {
          pl = isLong ? close / open.e - 1 : 1 - close / open.e;
          result = "TIME"; exited = true;
        }
        if (exited) {
          totalPL += pl; trades++;
          if (pl >= 0) wins++; else losses++;
          totalHoldBars += i - open.b;
          tradeLog.push({
            entryT: +kl[open.b][0], entryP: open.e,
            exitT: +kl[i][0], exitP: result === "TIME" ? close : exitP,
            result, pl: (pl * 100).toFixed(2)
          });
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
    const avgHold = trades > 0 ? (totalHoldBars / trades).toFixed(1) : 0;
    const avgHoldStr = avgHold >= 24 ? `${(avgHold / 24).toFixed(1)}天` : `${avgHold}小时`;

    el.innerHTML = `
      <div class="r"><span>${isLong ? "📈做多" : "📉做空"} ${META[coin].sym}</span><b>${trades}笔</b></div>
      <div class="r"><span>胜率</span><b class="${wr >= 50 ? "good" : "bad"}">${wr}% (${wins}W/${losses}L)</b></div>
      <div class="r"><span>累计</span><b class="${totalPL >= 0 ? "good" : "bad"}">${totalPL >= 0 ? "+" : ""}${(totalPL * 100).toFixed(1)}%</b></div>
      <div class="r"><span>回测周期</span><b>${spanDays}天</b></div>
      <div class="r"><span>平均持仓</span><b>${avgHoldStr}</b></div>
      <div class="bt-strategy">
        <b>📋 策略参数 (${pf.label}档)</b><br>
        币种: ${META[coin].sym}/USDT | 时间框架: 1小时 | 方向: ${isLong ? "做多" : "做空"}<br>
        入场: ≥3信号共振 ${isLong ? "(买占比>55% + 近支撑<1.5% + 放量>1.2x + ≥4阳线)" : "(卖占比>55% + 近阻力<1.5% + 放量>1.2x + ≥4阴线)"}<br>
        止盈: <b style="color:var(--down)">+${(TP*100).toFixed(1)}%</b> | 止损: <b style="color:var(--up)">-${(SL*100).toFixed(1)}%</b> | 超时平仓: 24小时
      </div>`;

    // 逐笔交易记录(最近10笔)
    if (tradeLog.length) {
      const recent = tradeLog.slice(-10).reverse();
      tl.classList.remove("hidden");
      tl.innerHTML = `<div style="font-weight:700;margin-bottom:4px;color:var(--accent)">📒 逐笔记录(最近${recent.length}笔)</div>` +
        recent.map(t => {
          const win = t.pl >= 0;
          const resLabel = t.result === "TP" ? "止盈" : t.result === "SL" ? "止损" : "超时";
          return `<div class="bt-trade-row">
            <span class="bt-t-time">${fmtDT(t.entryT)} → ${fmtDT(t.exitT)}</span>
            <span class="bt-t-entry">${fmtP(t.entryP)}</span>
            <span class="bt-t-exit">→ ${fmtP(t.exitP)}</span>
            <span class="bt-t-result ${win ? "win" : "loss"}">${resLabel}</span>
            <span class="bt-t-pl ${win ? "win" : "loss"}">${win ? "+" : ""}${t.pl}%</span>
          </div>`;
        }).join("");
    }
  } catch (e) {
    el.innerHTML = `<span style="color:var(--up)">失败: ${e.message}</span>`;
  } finally {
    btn.disabled = false;
    showSimButton(dir);
  }
}

// ==================== 模拟交易: 策略验证系统 ====================
const SIM_KEY = "crypto_sim_trades_v1";
const SIM_TP = 0.02, SIM_SL = 0.01;    // 旧交易兜底(新仓按币种档位存tpPct/slPct)

let simDirection = "long";   // 当前要验证的方向

function loadSim() {
  try { return JSON.parse(localStorage.getItem(SIM_KEY)) || []; }
  catch (e) { return []; }
}
function saveSim(list) {
  try { localStorage.setItem(SIM_KEY, JSON.stringify(list)); } catch (e) {}
}

// 设置策略方向
function showSimButton(dir) {
  simDirection = dir;
  updateSimDirButtons();
}
function updateSimDirButtons() {
  const bl = $("simDirLong"), bs = $("simDirShort");
  if (!bl || !bs) return;
  bl.style.opacity = simDirection === "long" ? 1 : 0.4;
  bs.style.opacity = simDirection === "short" ? 1 : 0.4;
  // 选中方向高亮边框, 一眼可见
  bl.classList.toggle("dir-sel", simDirection === "long");
  bs.classList.toggle("dir-sel", simDirection === "short");
}
$("simDirLong").addEventListener("click", () => { simDirection = "long"; updateSimDirButtons(); updateSimPreview(); });
$("simDirShort").addEventListener("click", () => { simDirection = "short"; updateSimDirButtons(); updateSimPreview(); });

// 切换币种时重置策略开仓表单: 方向回到默认, 表单收起
// (避免带着上一个币种选的做多/做空直接开到新币上)
function resetSimForm() {
  simDirection = "long";
  updateSimDirButtons();
  $("simForm").classList.add("hidden");
  $("simStartBtn").classList.remove("hidden");
}

// 点击"策略开仓" → 显示参数表单
$("simStartBtn").addEventListener("click", () => {
  $("simStartBtn").classList.add("hidden");
  $("simForm").classList.remove("hidden");
  updateSimDirButtons();
  updateSimPreview();
});

// 输入保证金/杠杆时实时预览
["simMargin", "simLev"].forEach(id =>
  $(id).addEventListener("input", updateSimPreview));

function updateSimPreview() {
  const m = +$("simMargin").value || 100;
  const lev = Math.min(125, Math.max(1, +$("simLev").value || 10));
  const mmr = 0.005;
  const imr = 1 / lev;
  const pos = m * lev;
  const qty = pos / (price || 1);
  const liqLong = price * (1 - imr + mmr);
  const liqShort = price * (1 + imr - mmr);
  const isLong = simDirection === "long";
  const liq = isLong ? liqLong : liqShort;
  const pf = coinProfile(coin);
  const tp = isLong ? price * (1 + pf.tp) : price * (1 - pf.tp);
  const sl = isLong ? price * (1 - pf.sl) : price * (1 + pf.sl);
  const tpProfit = pos * pf.tp;
  const slLoss = pos * pf.sl;
  $("simPreview").innerHTML = `
    <b>${isLong ? "📈 做多" : "📉 做空"} ${META[coin].sym}</b> · <b>${pf.label}档</b> | 仓位 <b>$${pos.toLocaleString()}</b> (${qty < 1 ? qty.toFixed(4) : qty.toFixed(2)} ${META[coin].sym})<br>
    止盈: <b style="color:var(--down)">${fmtP(tp)}</b> (+$${tpProfit.toFixed(2)}) |
    止损: <b style="color:var(--up)">${fmtP(sl)}</b> (-$${slLoss.toFixed(2)})<br>
    爆仓价: <b style="color:#ff4444">${fmtP(liq)}</b> (亏光保证金$${m})`;
}

// 确认开仓 → 立即以当前价格开仓(策略仓, 不再等信号)
$("simConfirm").addEventListener("click", () => {
  const m = +$("simMargin").value || 100;
  const lev = Math.min(125, Math.max(1, +$("simLev").value || 10));
  if (price <= 0 || priceCoin !== coin) return;
  const list = loadSim();
  // 防重复: 同币种+同方向+策略仓只能有一个未完结的
  const dup = list.some(t => t.coin === coin && t.direction === simDirection &&
    t.tradeType !== "impulse" && (t.status === "waiting" || t.status === "open"));
  if (dup) {
    alert(`已有 ${META[coin].sym} 的${simDirection === "long" ? "做多" : "做空"}策略仓在运行`);
    return;
  }
  const isLong = simDirection === "long";
  const imr = 1 / lev, mmr = 0.005;
  list.push({
    id: Date.now(),
    tradeType: "strategy",
    direction: simDirection,
    coin,
    sym: META[coin].sym,
    margin: m,
    leverage: lev,
    scoreAtOpen: getCurrentSignalScore(simDirection),
    status: "open",              // 立即开仓
    entryPrice: price, entryTime: Date.now(),
    tpPct: coinProfile(coin).tp, slPct: coinProfile(coin).sl,
    tpPrice: isLong ? price * (1 + coinProfile(coin).tp) : price * (1 - coinProfile(coin).tp),
    slPrice: isLong ? price * (1 - coinProfile(coin).sl) : price * (1 + coinProfile(coin).sl),
    liqPrice: isLong ? price * (1 - imr + mmr) : price * (1 + imr - mmr),
    exitPrice: null, exitTime: null,
    pnl: null, roi: null,
  });
  saveSim(list);
  $("simForm").classList.add("hidden");
  checkSimTrades();
  fetchAll();   // 开仓后立即按当前选中币种重载数据, 页面数据与新仓保持一致
});

// 每次刷新调用: 管理模拟交易生命周期
function checkSimTrades() {
  const list = loadSim();
  const impScoreEl = $("impulseScore");
  if (impScoreEl) impScoreEl.textContent = `多${longScore} / 空${shortScore}`;
  if (!list.length) { renderSimActive(null); renderSimHistory(list); return; }
  let changed = false;

  list.forEach(t => {
    // priceCoin校验: 切换币种后新数据未到时, price还是旧币种的价, 不能用
    if (t.coin !== coin || priceCoin !== coin || !price) return;

    // 等待中: 检查对应方向的信号是否触发
    if (t.status === "waiting") {
      const score = getCurrentSignalScore(t.direction);
      if (score >= 50) {
        const isLong = t.direction === "long";
        const imr = 1 / t.leverage;
        const mmr = 0.005;
        const wpf = coinProfile(t.coin);
        t.entryPrice = price;
        t.entryTime = Date.now();
        t.tpPct = wpf.tp; t.slPct = wpf.sl;
        t.tpPrice = isLong ? price * (1 + wpf.tp) : price * (1 - wpf.tp);
        t.slPrice = isLong ? price * (1 - wpf.sl) : price * (1 + wpf.sl);
        t.liqPrice = isLong ? price * (1 - imr + mmr) : price * (1 + imr - mmr);
        t.status = "open";
        changed = true;
      }
      return;
    }

    // 持仓中: 检查止盈/止损/爆仓 (止盈止损按该仓自己的比例)
    const tpP = t.tpPct ?? SIM_TP, slP = t.slPct ?? SIM_SL;
    if (t.status === "open" && klines5m.length > 1) {
      const done = klines5m.slice(0, -1);
      const isLong = t.direction === "long";
      for (const k of done) {
        if (+k[0] < t.entryTime) continue;
        const h = +k[2], l = +k[3];
        // 爆仓优先检查(最大风险)
        if (isLong && l <= t.liqPrice) {
          t.status = "liquidated"; t.exitPrice = t.liqPrice; t.pnl = -t.margin; t.roi = -100;
          t.exitTime = +k[0]; changed = true; break;
        }
        if (!isLong && h >= t.liqPrice) {
          t.status = "liquidated"; t.exitPrice = t.liqPrice; t.pnl = -t.margin; t.roi = -100;
          t.exitTime = +k[0]; changed = true; break;
        }
        // 止损
        if (isLong && l <= t.slPrice) {
          t.status = "loss"; t.exitPrice = t.slPrice;
          t.pnl = -(t.margin * t.leverage * slP); t.roi = -slP * t.leverage * 100;
          t.exitTime = +k[0]; changed = true; break;
        }
        if (!isLong && h >= t.slPrice) {
          t.status = "loss"; t.exitPrice = t.slPrice;
          t.pnl = -(t.margin * t.leverage * slP); t.roi = -slP * t.leverage * 100;
          t.exitTime = +k[0]; changed = true; break;
        }
        // 止盈
        if (isLong && h >= t.tpPrice) {
          t.status = "win"; t.exitPrice = t.tpPrice;
          t.pnl = t.margin * t.leverage * tpP; t.roi = tpP * t.leverage * 100;
          t.exitTime = +k[0]; changed = true; break;
        }
        if (!isLong && l <= t.tpPrice) {
          t.status = "win"; t.exitPrice = t.tpPrice;
          t.pnl = t.margin * t.leverage * tpP; t.roi = tpP * t.leverage * 100;
          t.exitTime = +k[0]; changed = true; break;
        }
      }
      // 超时(24小时)
      if (t.status === "open" && Date.now() - t.entryTime > 86400000) {
        const isLong2 = t.direction === "long";
        const pl = isLong2 ? (price / t.entryPrice - 1) : (1 - price / t.entryPrice);
        t.status = "timeout"; t.exitPrice = price;
        t.pnl = t.margin * t.leverage * pl; t.roi = pl * t.leverage * 100;
        t.exitTime = Date.now(); changed = true;
      }
    }
  });

  if (changed) saveSim(list);
  // 只显示当前币种的活跃交易(切换币种时自动过滤)
  const actives = list.filter(t => t.coin === coin && (t.status === "waiting" || t.status === "open"));
  renderSimActive(actives);
  renderSimHistory(list);
}

function getCurrentSignalScore(direction) {
  if (direction === "short") return shortScore;
  return longScore;
}

function renderSimActive(trades) {
  const el = $("simActive");
  if (!trades || !trades.length) {
    el.classList.add("hidden");
    el.innerHTML = "";   // 清空残留, 平仓后绝不再显示持仓内容
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = trades.map(t => renderOneActive(t)).join('<div style="border-top:1px dashed var(--border);margin:6px 0"></div>');
}

function renderOneActive(t) {
  const isLong = t.direction === "long";

  if (t.status === "waiting") {
    return `
      <div class="sa-status waiting">⏳ 等待信号触发 (得分≥50时自动开仓)</div>
      <div class="sa-row"><span class="l">类型</span><span class="v">${t.tradeType === "impulse" ? "🔥 冲动" : "📊 策略"}</span></div>
      <div class="sa-row"><span class="l">方向</span><span class="v">${isLong ? "📈 做多" : "📉 做空"} ${t.sym}</span></div>
      <div class="sa-row"><span class="l">保证金</span><span class="v">$${t.margin} × ${t.leverage}x = $${(t.margin * t.leverage).toLocaleString()}</span></div>
      <div class="sa-row"><span class="l">当前得分</span><span class="v">多${longScore} / 空${shortScore} (需${t.direction === "long" ? "多" : "空"}≥50)</span></div>
      <div class="sa-actions">
        <button class="sa-edit" onclick="editSimTrade(${t.id})">✏️ 改杠杆/保证金</button>
        <button class="sa-del" onclick="deleteSimTrade(${t.id})">🗑️ 删除</button>
      </div>`;
  }

  const typeTag = t.tradeType === "impulse" ? "🔥冲动" : "📊策略";
  const qty = t.margin * t.leverage / t.entryPrice;
  const cur = priceOf(t.coin) || t.entryPrice;
  const curPct = isLong ? (cur / t.entryPrice - 1) : (1 - cur / t.entryPrice);
  const uPnl = t.margin * t.leverage * curPct;
  const uRoi = curPct * t.leverage * 100;
  const pnlCls = uPnl >= 0 ? "pos" : "neg";
  const distTP = Math.abs((t.tpPrice / cur - 1) * 100).toFixed(2);
  const distSL = Math.abs((t.slPrice / cur - 1) * 100).toFixed(2);
  const distLiq = Math.abs((t.liqPrice / cur - 1) * 100).toFixed(2);

  return `
    <div class="sa-status open">🟢 持仓中 [${typeTag}]: ${isLong ? "做多" : "做空"} ${t.sym} ${t.leverage}x</div>
    <div class="sa-row"><span class="l">入场</span><span class="v">${fmtP(t.entryPrice)} (${new Date(t.entryTime).toLocaleTimeString("zh-CN", {hour12:false})})</span></div>
    <div class="sa-row"><span class="l">当前价</span><span class="v">${fmtP(cur)}</span></div>
    <div class="sa-pnl ${pnlCls}">${uPnl >= 0 ? "+" : ""}$${uPnl.toFixed(2)} (${uRoi >= 0 ? "+" : ""}${uRoi.toFixed(1)}%)</div>
    <div class="sa-row"><span class="l">止盈</span><span class="v" style="color:var(--down)">${fmtP(t.tpPrice)} (距${distTP}%)</span></div>
    <div class="sa-row"><span class="l">止损</span><span class="v" style="color:var(--up)">${fmtP(t.slPrice)} (距${distSL}%)</span></div>
    <div class="sa-row"><span class="l">爆仓</span><span class="v" style="color:#ff4444">${fmtP(t.liqPrice)} (距${distLiq}%)</span></div>
    <div class="sa-row"><span class="l">数量</span><span class="v">${qty < 1 ? qty.toFixed(4) : qty.toFixed(2)} ${t.sym}</span></div>
    <div class="sa-actions">
      <button class="sa-close" onclick="closeSimTrade(${t.id})">💰 平仓</button>
      <button class="sa-edit" onclick="editSimTrade(${t.id})">✏️ 改杠杆</button>
      <button class="sa-del" onclick="deleteSimTrade(${t.id})">🗑️ 删除</button>
    </div>`;
}

// 平仓: 以该币种最新价结算(不用全局price, 防跨币种串价)
function closeSimTrade(id) {
  const list = loadSim();
  const t = list.find(x => x.id === id);
  if (!t || t.status !== "open") return;
  const exitP = priceOf(t.coin);
  if (!exitP || exitP <= 0) { alert("价格未加载, 请稍后重试"); return; }
  const isLong = t.direction === "long";
  // 现实约束: 若价格已穿越爆仓价, 真实交易所早已强平, 按爆仓结算(亏损封顶=保证金)
  if (isLong ? exitP <= t.liqPrice : exitP >= t.liqPrice) {
    t.status = "liquidated";
    t.exitPrice = t.liqPrice;
    t.exitTime = Date.now();
    t.pnl = -t.margin; t.roi = -100;
  } else {
    const pl = isLong ? (exitP / t.entryPrice - 1) : (1 - exitP / t.entryPrice);
    t.status = "manual";
    t.exitPrice = exitP;
    t.exitTime = Date.now();
    t.pnl = +(t.margin * t.leverage * pl).toFixed(2);
    t.roi = +(pl * t.leverage * 100).toFixed(1);
  }
  saveSim(list);
  // 直接渲染, 不走checkSimTrades避免被覆盖
  const actives = list.filter(x => x.coin === coin && (x.status === "waiting" || x.status === "open"));
  renderSimActive(actives);
  renderSimHistory(list);
}

// 删除模拟交易
function deleteSimTrade(id) {
  let list = loadSim();
  list = list.filter(t => t.id !== id);
  saveSim(list);
  checkSimTrades();
}

// 修改杠杆/保证金
function editSimTrade(id) {
  const list = loadSim();
  const t = list.find(x => x.id === id);
  if (!t) return;
  const newM = prompt(`保证金 (当前: ${t.margin}U)`, t.margin);
  if (newM === null) return;
  const newLev = prompt(`杠杆 (当前: ${t.leverage}x)`, t.leverage);
  if (newLev === null) return;
  t.margin = Math.max(1, +newM || t.margin);
  t.leverage = Math.min(125, Math.max(1, +newLev || t.leverage));
  // 重算爆仓价(止盈止损按开仓价百分比, 不变)
  const imr = 1 / t.leverage, mmr = 0.005;
  const isLong = t.direction === "long";
  t.liqPrice = isLong ? t.entryPrice * (1 - imr + mmr) : t.entryPrice * (1 + imr - mmr);
  saveSim(list);
  checkSimTrades();
}

// ==================== 冲动开仓: 不等信号立即成交 ====================
function openImpulse(dir) {
  const m = Math.max(1, +$("margin").value || 100);
  const lev = Math.min(125, Math.max(1, +$("lev").value || 10));
  if (price <= 0 || priceCoin !== coin) return;
  const list = loadSim();
  // 防误触: 3秒内同方向不允许重复开仓
  const recent = list.some(t => t.coin === coin && t.direction === dir &&
    t.tradeType === "impulse" && Date.now() - t.id < 3000);
  if (recent) return;
  const isLong = dir === "long";
  const imr = 1 / lev, mmr = 0.005;
  const score = getCurrentSignalScore(dir);
  list.push({
    id: Date.now(),
    tradeType: "impulse",       // 冲动交易
    direction: dir,
    coin, sym: META[coin].sym,
    margin: m, leverage: lev,
    scoreAtOpen: score,          // 开仓时的信号得分
    status: "open",              // 立即开仓
    entryPrice: price, entryTime: Date.now(),
    tpPct: coinProfile(coin).tp, slPct: coinProfile(coin).sl,
    tpPrice: isLong ? price * (1 + coinProfile(coin).tp) : price * (1 - coinProfile(coin).tp),
    slPrice: isLong ? price * (1 - coinProfile(coin).sl) : price * (1 + coinProfile(coin).sl),
    liqPrice: isLong ? price * (1 - imr + mmr) : price * (1 + imr - mmr),
    exitPrice: null, exitTime: null, pnl: null, roi: null,
  });
  saveSim(list);
  checkSimTrades();
  fetchAll();   // 冲动开仓同样立即重载当前币种数据
}

$("impulseLong").addEventListener("click", () => openImpulse("long"));
$("impulseShort").addEventListener("click", () => openImpulse("short"));

function renderSimHistory(list) {
  const closed = list.filter(t => ["win", "loss", "liquidated", "timeout", "manual"].includes(t.status));
  if (!closed.length) { $("simHistory").innerHTML = "<span class='loading'>暂无已完结交易</span>"; $("simCompare").innerHTML = ""; return; }

  const fmtT = (ts) => new Date(ts).toLocaleString("zh-CN",
    { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const resMap = { win: "✅止盈", loss: "❌止损", liquidated: "💥爆仓", timeout: "⏰超时", manual: "💰手动平仓" };

  // 分类统计
  const strat = closed.filter(t => t.tradeType !== "impulse");
  const imp = closed.filter(t => t.tradeType === "impulse");
  const stat = (arr) => {
    if (!arr.length) return { n: 0, wr: "--", pnl: 0 };
    const wins = arr.filter(t => t.pnl > 0).length;
    return { n: arr.length, wr: (wins / arr.length * 100).toFixed(1), pnl: arr.reduce((s, t) => s + (t.pnl || 0), 0) };
  };
  const ss = stat(strat), si = stat(imp);

  // 对比结论
  let verdictHTML = "";
  if (ss.n > 0 && si.n > 0) {
    const diff = ss.pnl - si.pnl;
    const better = diff > 0 ? "策略" : "冲动";
    verdictHTML = `<div class="scmp-verdict" style="background:${diff > 0 ? "rgba(36,178,140,0.12);color:var(--down)" : "rgba(229,69,69,0.12);color:var(--up)"}">
      ${better}交易多赚 $${Math.abs(diff).toFixed(2)} · 冲动的代价已量化
    </div>`;
  }

  $("simCompare").innerHTML = `
    <div class="scmp-row">
      <span class="scmp-label strategy">📊 策略</span>
      <span class="scmp-detail">${ss.n}笔 · 胜率${ss.wr}%</span>
      <span class="scmp-pnl" style="color:${ss.pnl >= 0 ? "var(--down)" : "var(--up)"}">${ss.pnl >= 0 ? "+" : ""}$${ss.pnl.toFixed(2)}</span>
    </div>
    <div class="scmp-row">
      <span class="scmp-label impulse">🔥 冲动</span>
      <span class="scmp-detail">${si.n}笔 · 胜率${si.wr}%</span>
      <span class="scmp-pnl" style="color:${si.pnl >= 0 ? "var(--down)" : "var(--up)"}">${si.pnl >= 0 ? "+" : ""}$${si.pnl.toFixed(2)}</span>
    </div>
    ${verdictHTML}`;

  // 逐笔记录(只显示当前币种, 最近15笔)
  const coinClosed = closed.filter(t => t.coin === coin);
  const recent = coinClosed.slice(-15).reverse();
  $("simHistory").innerHTML = recent.length
    ? recent.map(t => renderHistRow(t)).join("")
    : `<span class="loading">${META[coin].sym} 暂无已完结交易</span>`;
}

function renderHistRow(t) {
  {
      const pos = t.pnl > 0;
      const typeTag = t.tradeType === "impulse" ? ' <span style="color:var(--up);font-size:9px">🔥</span>' : "";
      const fmtTH = (ts) => new Date(ts).toLocaleString("zh-CN",
        { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
      const resMapH = { win: "✅止盈", loss: "❌止损", liquidated: "💥爆仓", timeout: "⏰超时", manual: "💰手动平仓" };
      return `<div class="sim-h-row"${t.tradeType === "impulse" ? ' style="background:rgba(229,69,69,0.04)"' : ""}>
        <span class="sh-time">${fmtTH(t.entryTime)}</span>
        <span class="sh-sym">${t.direction === "long" ? "↑" : "↓"}${typeTag}</span>
        <span class="sh-detail">${fmtP(t.entryPrice)}→${fmtP(t.exitPrice)} ${t.margin}U×${t.leverage}x${t.scoreAtOpen !== undefined ? ` (${t.scoreAtOpen}分)` : ""}</span>
        <span class="sh-result ${pos ? "pos" : "neg"}" style="color:${pos ? "var(--down)" : "var(--up)"}">${resMapH[t.status]}</span>
        <span class="sh-pnl ${pos ? "pos" : "neg"}">${pos ? "+" : ""}$${t.pnl.toFixed(2)}</span>
        <button class="sh-detail-btn" onclick="showTradeDetail(${t.id})">📋</button>
      </div>`;
  }
}

function showTradeDetail(id) {
  const list = loadSim();
  const t = list.find(x => x.id === id);
  if (!t) return;
  const isLong = t.direction === "long";
  const pos = t.pnl > 0;
  const typeLabel = t.tradeType === "impulse" ? "🔥 冲动开仓" : "📊 策略开仓";
  const resMap = { win: "✅ 止盈出场", loss: "❌ 止损出场", liquidated: "💥 爆仓（保证金归零）", timeout: "⏰ 超时平仓", manual: "💰 手动平仓" };
  const fmtDT = (ts) => ts ? new Date(ts).toLocaleString("zh-CN",
    { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--";
  const holdMin = t.entryTime && t.exitTime ? Math.round((t.exitTime - t.entryTime) / 60000) : 0;
  const holdStr = holdMin > 60 ? `${Math.floor(holdMin / 60)}小时${holdMin % 60}分` : `${holdMin}分钟`;
  const qty = t.margin * t.leverage / t.entryPrice;
  const priceChg = isLong ? (t.exitPrice / t.entryPrice - 1) : (1 - t.exitPrice / t.entryPrice);

  $("tdTitle").textContent = `${t.sym} ${isLong ? "做多" : "做空"} 详情`;
  $("tdBody").innerHTML = `
    <div style="text-align:center;padding:12px;border-radius:8px;margin-bottom:10px;background:${pos ? "rgba(36,178,140,0.1)" : "rgba(229,69,69,0.1)"}">
      <div style="font-size:13px;color:var(--muted)">${resMap[t.status]}</div>
      <div style="font-size:28px;font-weight:800;color:${pos ? "var(--down)" : "var(--up)"}">${pos ? "+" : ""}$${t.pnl.toFixed(2)}</div>
      <div style="font-size:12px;color:${pos ? "var(--down)" : "var(--up)"}">${t.roi >= 0 ? "+" : ""}${t.roi.toFixed(1)}% ROI</div>
    </div>
    <div class="con-row"><span class="con-label">交易类型</span><span class="con-val" style="color:${t.tradeType === "impulse" ? "var(--up)" : "var(--accent)"}">${typeLabel}</span></div>
    <div class="con-row"><span class="con-label">开仓时信号得分</span><span class="con-val">${t.scoreAtOpen !== undefined ? t.scoreAtOpen + "/100" : "--"}</span></div>
    <div style="border-top:1px dashed var(--border);margin:6px 0"></div>
    <div class="con-row"><span class="con-label">入场时间</span><span class="con-val">${fmtDT(t.entryTime)}</span></div>
    <div class="con-row"><span class="con-label">入场价格</span><span class="con-val">${fmtP(t.entryPrice)}</span></div>
    <div class="con-row"><span class="con-label">出场时间</span><span class="con-val">${fmtDT(t.exitTime)}</span></div>
    <div class="con-row"><span class="con-label">出场价格</span><span class="con-val">${fmtP(t.exitPrice)}</span></div>
    <div class="con-row"><span class="con-label">持仓时长</span><span class="con-val">${holdStr}</span></div>
    <div style="border-top:1px dashed var(--border);margin:6px 0"></div>
    <div class="con-row"><span class="con-label">止盈价</span><span class="con-val" style="color:var(--down)">${fmtP(t.tpPrice)}</span></div>
    <div class="con-row"><span class="con-label">止损价</span><span class="con-val" style="color:var(--up)">${fmtP(t.slPrice)}</span></div>
    <div class="con-row"><span class="con-label">爆仓价</span><span class="con-val" style="color:#ff4444">${fmtP(t.liqPrice)} ${t.status === "liquidated" ? "💀" : ""}</span></div>
    <div style="border-top:1px dashed var(--border);margin:6px 0"></div>
    <div class="con-row"><span class="con-label">保证金</span><span class="con-val">$${t.margin}</span></div>
    <div class="con-row"><span class="con-label">杠杆</span><span class="con-val">${t.leverage}x</span></div>
    <div class="con-row"><span class="con-label">仓位</span><span class="con-val">$${(t.margin * t.leverage).toLocaleString()} (${qty < 1 ? qty.toFixed(4) : qty.toFixed(2)} ${t.sym})</span></div>
    <div class="con-row"><span class="con-label">价格变动</span><span class="con-val" style="color:${priceChg >= 0 ? "var(--down)" : "var(--up)"}">${(priceChg * 100).toFixed(2)}%</span></div>
    ${t.tradeType === "impulse" && t.scoreAtOpen !== undefined && t.scoreAtOpen < 50 && t.pnl < 0 ? `
    <div class="xray-insight" style="margin-top:10px">
      ⚠️ <b>冲动的代价</b>：开仓时信号得分仅 ${t.scoreAtOpen} 分（低于50分阈值）。如果等信号达标再开仓，可能避免这笔 $${Math.abs(t.pnl).toFixed(2)} 的亏损。
    </div>` : ""}`;
  $("tradeDetailOverlay").classList.remove("hidden");
}

// ==================== 查看完整报告(界面内显示) ====================
$("viewReportBtn").addEventListener("click", () => {
  const list = loadSim();
  if (!list.length) { alert("暂无交易记录"); return; }
  const fmtDT = (ts) => ts ? new Date(ts).toLocaleString("zh-CN",
    { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--";

  const closed = list.filter(t => ["win", "loss", "liquidated", "timeout", "manual"].includes(t.status));
  const strat = closed.filter(t => t.tradeType !== "impulse");
  const imp = closed.filter(t => t.tradeType === "impulse");
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = closed.filter(t => t.pnl > 0).length;
  const resMap = { win: "✅止盈", loss: "❌止损", liquidated: "💥爆仓", timeout: "⏰超时", manual: "💰平仓", open: "🟢持仓中" };

  let html = `<div style="text-align:center;padding:10px;border-radius:8px;margin-bottom:10px;background:var(--bg)">
    <div style="font-size:11px;color:var(--muted)">总交易 ${closed.length}笔 · 胜率${closed.length ? (wins / closed.length * 100).toFixed(1) : 0}%</div>
    <div style="font-size:24px;font-weight:800;color:${totalPnl >= 0 ? "var(--down)" : "var(--up)"}">${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}</div>
  </div>`;

  const statRow = (label, arr, color) => {
    if (!arr.length) return "";
    const w = arr.filter(t => t.pnl > 0).length;
    const pnl = arr.reduce((s, t) => s + (t.pnl || 0), 0);
    return `<div class="con-row">
      <span class="con-label" style="color:${color};font-weight:700">${label}</span>
      <span class="con-val">${arr.length}笔 · 胜率${(w / arr.length * 100).toFixed(0)}%</span>
      <span class="con-val" style="color:${pnl >= 0 ? "var(--down)" : "var(--up)"}">${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}</span>
    </div>`;
  };
  html += statRow("📊 策略", strat, "var(--accent)");
  html += statRow("🔥 冲动", imp, "var(--up)");

  if (strat.length && imp.length) {
    const diff = strat.reduce((s, t) => s + t.pnl, 0) - imp.reduce((s, t) => s + t.pnl, 0);
    html += `<div class="xray-insight" style="margin-top:6px">
      💡 <b>${diff > 0 ? "策略" : "冲动"}交易多赚 $${Math.abs(diff).toFixed(2)}</b> — 冲动的代价已量化
    </div>`;
  }

  html += `<div style="border-top:1px dashed var(--border);margin:10px 0"></div><div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">📒 逐笔记录(按币种分组, 最新在前)</div>`;

  // 按币种分组, 组内按时间倒序
  const byCoin = {};
  list.forEach(t => {
    if (!byCoin[t.coin]) byCoin[t.coin] = [];
    byCoin[t.coin].push(t);
  });
  Object.values(byCoin).forEach(trades => trades.sort((a, b) => (b.entryTime || b.id) - (a.entryTime || a.id)));

  Object.entries(byCoin).forEach(([sym, trades]) => {
    html += `<div style="font-size:11px;font-weight:700;color:var(--muted);padding:4px 0 2px">${trades[0].sym}</div>`;
    trades.forEach((t) => {
    const pos = (t.pnl || 0) > 0;
    const isLong = t.direction === "long";
    const holdMin = t.entryTime && t.exitTime ? Math.round((t.exitTime - t.entryTime) / 60000) : 0;
    const holdStr = holdMin > 60 ? `${Math.floor(holdMin / 60)}h${holdMin % 60}m` : `${holdMin}m`;
    const typeTag = t.tradeType === "impulse" ? "🔥冲动" : "📊策略";
    html += `<div style="padding:6px 8px;background:var(--bg);border-radius:6px;margin-bottom:5px;border-left:3px solid ${pos ? "var(--down)" : "var(--up)"}">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
        <span><b>${t.sym}</b> ${isLong ? "↑做多" : "↓做空"} <span style="color:var(--muted);font-size:10px">[${typeTag}${t.scoreAtOpen !== undefined ? ` ${t.scoreAtOpen}分` : ""}]</span></span>
        <span style="font-weight:800;color:${pos ? "var(--down)" : "var(--up)"}">${t.pnl !== null ? `${pos ? "+" : ""}$${t.pnl.toFixed(2)}` : resMap[t.status]}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:2px">
        <span>${fmtDT(t.entryTime)} @ ${t.entryPrice ? t.entryPrice.toLocaleString() : "--"}</span>
        <span>${t.exitTime ? `→ ${fmtDT(t.exitTime)} @ ${t.exitPrice ? t.exitPrice.toLocaleString() : "--"} (${holdStr})` : resMap[t.status] || ""}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9.5px;color:var(--muted);margin-top:1px">
        <span>${t.margin}U×${t.leverage}x</span>
        <span>TP:${t.tpPrice ? t.tpPrice.toFixed(2) : "--"} SL:${t.slPrice ? t.slPrice.toFixed(2) : "--"} 爆:${t.liqPrice ? t.liqPrice.toFixed(2) : "--"}</span>
      </div>
    </div>`;
    });
  });

  $("reportBody").innerHTML = html;
  $("reportOverlay").classList.remove("hidden");
});

// ==================== 导出交易记录到文件(按币种分文件, 最新在前) ====================
// 优先通过本地server.py写入index.html所在文件夹; 未运行服务时回退浏览器下载
async function saveMdFile(filename, content) {
  try {
    const r = await fetch("/save-md", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content }),
    });
    return r.ok;
  } catch (e) { return false; }
}

$("exportBtn").addEventListener("click", async () => {
  const list = loadSim();
  if (!list.length) { alert("暂无交易记录"); return; }
  const now = new Date();
  const fmtDT = (ts) => new Date(ts).toLocaleString("zh-CN",
    { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  // 按币种分组
  const byCoin = {};
  list.forEach(t => {
    if (!byCoin[t.coin]) byCoin[t.coin] = [];
    byCoin[t.coin].push(t);
  });

  // 每个币种导出一个文件
  const outcomes = [];
  await Promise.all(Object.entries(byCoin).map(async ([sym, trades]) => {
    // 最新在前
    trades.sort((a, b) => (b.entryTime || b.id) - (a.entryTime || a.id));
    const closed = trades.filter(t => ["win", "loss", "liquidated", "timeout", "manual"].includes(t.status));
    const strat = closed.filter(t => t.tradeType !== "impulse");
    const imp = closed.filter(t => t.tradeType === "impulse");
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = closed.filter(t => t.pnl > 0).length;
    const resMap = { win: "✅止盈", loss: "❌止损", liquidated: "💥爆仓", timeout: "⏰超时", manual: "💰平仓", open: "🟢持仓中", waiting: "⏳等待中" };

    let md = `# ${trades[0].sym} 模拟交易记录\n\n`;
    md += `> 导出时间: ${fmtDT(now.getTime())}\n`;
    md += `> 座右铭: **赢时赚多 · 输时亏少**\n\n`;
    md += `## 汇总\n\n`;
    md += `- 交易: ${closed.length}笔 | 胜率: ${closed.length ? (wins / closed.length * 100).toFixed(1) : 0}% | 盈亏: ${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}\n`;
    if (strat.length) md += `- 📊策略: ${strat.length}笔 胜率${(strat.filter(t => t.pnl > 0).length / strat.length * 100).toFixed(0)}% ${strat.reduce((s, t) => s + t.pnl, 0) >= 0 ? "+" : ""}$${strat.reduce((s, t) => s + t.pnl, 0).toFixed(2)}\n`;
    if (imp.length) md += `- 🔥冲动: ${imp.length}笔 胜率${(imp.filter(t => t.pnl > 0).length / imp.length * 100).toFixed(0)}% ${imp.reduce((s, t) => s + t.pnl, 0) >= 0 ? "+" : ""}$${imp.reduce((s, t) => s + t.pnl, 0).toFixed(2)}\n`;
    md += `\n---\n\n## 逐笔记录(最新在前)\n\n`;

    trades.forEach((t, i) => {
      const isLong = t.direction === "long";
      const holdMin = t.entryTime && t.exitTime ? Math.round((t.exitTime - t.entryTime) / 60000) : 0;
      const holdStr = holdMin > 60 ? `${Math.floor(holdMin / 60)}h${holdMin % 60}m` : `${holdMin}m`;
      md += `### #${i + 1} ${isLong ? "做多" : "做空"} ${resMap[t.status] || t.status}\n\n`;
      md += `| 项目 | 内容 |\n|------|------|\n`;
      md += `| 类型 | ${t.tradeType === "impulse" ? "🔥冲动" : "📊策略"} |\n`;
      if (t.scoreAtOpen !== undefined) md += `| 开仓时得分 | ${t.scoreAtOpen}/100 |\n`;
      md += `| 入场 | ${fmtDT(t.entryTime)} @ ${t.entryPrice ? t.entryPrice.toLocaleString() : "--"} |\n`;
      if (t.exitTime) md += `| 出场 | ${fmtDT(t.exitTime)} @ ${t.exitPrice ? t.exitPrice.toLocaleString() : "--"} |\n`;
      if (t.entryTime && t.exitTime) md += `| 持仓时长 | ${holdStr} |\n`;
      if (t.tpPrice) md += `| 止盈/止损/爆仓 | ${t.tpPrice.toLocaleString()} / ${t.slPrice.toLocaleString()} / ${t.liqPrice.toLocaleString()} |\n`;
      md += `| 保证金×杠杆 | $${t.margin} × ${t.leverage}x = $${(t.margin * t.leverage).toLocaleString()} |\n`;
      if (t.pnl !== null) md += `| **盈亏** | **${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)} (${t.roi >= 0 ? "+" : ""}${t.roi.toFixed(1)}%)** |\n`;
      md += `\n`;
    });

    const fname = `${trades[0].sym}_交易记录.md`;
    const saved = await saveMdFile(fname, md);
    outcomes.push({ fname, saved, md });
    if (!saved) {
      // 本地服务未运行 → 回退浏览器下载(存到浏览器下载文件夹)
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }));
  // 按钮反馈: 写入文件夹 or 提示启动server.py
  const wrote = outcomes.filter(o => o.saved).length;
  const btn = $("exportBtn");
  const old = btn.textContent;
  btn.textContent = wrote
    ? `✅ ${wrote}个md已写入文件夹`
    : "⬇️ 已下载(运行python3 server.py可直接写文件夹)";
  setTimeout(() => { btn.textContent = old; }, 3500);
});

// ==================== 事件 & 初始化 ====================
// 币种下拉从SYMBOLS自动生成(30币双所币池)
$("coinSel").innerHTML = SYMBOLS.map(s =>
  `<option value="${s}">${META[s].sym}${META[s].name ? " " + META[s].name : ""}</option>`).join("");
$("coinSel").value = coin;
$("coinSel").addEventListener("change", (e) => {
  coin = e.target.value;
  wallHistory.clear();
  $("entry").value = "";
  resetSimForm();
  fetchAll();
});
$("intervalSel").addEventListener("change", (e) => {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchAll, +e.target.value * 1000);
});
$("refreshBtn").addEventListener("click", fetchAll);
$("srcBn").addEventListener("click", () => {
  dataSource = "binance";
  $("srcBn").classList.add("active");
  $("srcOkx").classList.remove("active");
  wallHistory.clear();
  fetchAll();
});
$("srcOkx").addEventListener("click", () => {
  dataSource = "okx";
  $("srcOkx").classList.add("active");
  $("srcBn").classList.remove("active");
  wallHistory.clear();
  fetchAll();
});
$("btLong").addEventListener("click", () => runBacktest("long"));
$("btShort").addEventListener("click", () => runBacktest("short"));
["lev", "margin", "entry", "exitP", "mmr"].forEach(id =>
  $(id).addEventListener("input", updateCalc));

// ===== 开仓扫描: 按钮S快捷键 + 弹窗关闭 =====
$("hourBtn").addEventListener("click", showHourPanel);
$("hourClose").addEventListener("click", () => $("hourOverlay").classList.add("hidden"));
$("hourOverlay").addEventListener("click", (e) => {
  if (e.target.id === "hourOverlay") $("hourOverlay").classList.add("hidden");
});
$("scanBtn").addEventListener("click", scanOpportunities);
$("scanClose").addEventListener("click", () => $("scanOverlay").classList.add("hidden"));
$("scanOverlay").addEventListener("click", (e) => {
  if (e.target.id === "scanOverlay") $("scanOverlay").classList.add("hidden");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("scanOverlay").classList.add("hidden");
    $("hourOverlay").classList.add("hidden");
    return;
  }
  if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    e.preventDefault();
    scanOpportunities();
  }
});

// 启动
fetchAll();
refreshTimer = setInterval(fetchAll, 5000);
