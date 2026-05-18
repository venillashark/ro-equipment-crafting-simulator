import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./core.js";
import "./styles.css";

const core = window.ROSimulator;
const {
  DEFAULT_CONFIG,
  GRADES,
  MATERIALS,
  resolveMaterialCost,
  findBestRoute,
  simulateMonteCarlo,
  quoteCommission,
} = core;

const STORAGE_KEY = "ro-crafting-simulator-v2";

const PRICE_SECTIONS = [
  {
    title: "升階與製作材料",
    keys: [
      "etherStardust",
      "blessedEtherStardust",
      "etherStone",
      "azureGem",
      "yellowGem",
      "purpleGem",
      "amberGem",
      "npcAzureGem",
      "npcYellowGem",
      "npcPurpleGem",
      "npcAmberGem",
    ],
  },
  {
    title: "五級武器精煉",
    keys: [
      "oridecon",
      "etherOridecon",
      "concentratedEtherOridecon",
      "etherBradium",
      "highConcentratedEtherOridecon",
      "highDensityEtherBradium",
    ],
  },
  {
    title: "二級防具精煉",
    keys: [
      "elunium",
      "etherElunium",
      "concentratedEtherElunium",
      "etherCarnium",
      "highConcentratedEtherElunium",
      "highDensityEtherCarnium",
    ],
  },
  { title: "保護材料", keys: ["blessing"] },
];

const defaultTarget = {
  equipmentType: "weapon5",
  equipmentPrice: 10000000,
  ownedEquipment: true,
  startGrade: "none",
  startRefine: 0,
  targetGrade: "A",
  targetRefine: 12,
  refineMaterialPolicy: "auto",
  protectionPolicy: "auto",
};

const defaultCommission = {
  profitRate: 15,
  riskBufferRate: 10,
  minimumFee: 1000000,
  quoteBasis: "p95",
};

const demoPrices = {
  ...DEFAULT_CONFIG.materials,
  oridecon: 42900,
  etherOridecon: 89999,
  concentratedEtherOridecon: 665000,
  highConcentratedEtherOridecon: 426996,
  blessing: 3304990,
};

function loadInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      prices: { ...demoPrices, ...(saved.prices || saved.materials || {}) },
      target: { ...defaultTarget, ...(saved.target || {}) },
      commission: { ...defaultCommission, ...(saved.commission || saved.commissionSettings || {}) },
      simulationSettings: {
        runs: saved.simulationSettings?.runs || 10000,
        seed: saved.simulationSettings?.seed || "auto-20260518",
      },
    };
  } catch (_error) {
    return {
      prices: demoPrices,
      target: defaultTarget,
      commission: defaultCommission,
      simulationSettings: { runs: 10000, seed: "auto-20260518" },
    };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatZeny(value) {
  if (!Number.isFinite(value)) return "無法計算";
  return `${Math.round(value).toLocaleString("zh-TW")} Z`;
}

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("zh-TW", { maximumFractionDigits: digits });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
}

function numberValue(value) {
  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function App() {
  const [state, setState] = useState(loadInitialState);
  const [activeTab, setActiveTab] = useState("refine");
  const [simulation, setSimulation] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const route = useMemo(
    () => findBestRoute(state.target, {}, state.prices),
    [state.target, state.prices],
  );

  const materialCosts = useMemo(() => resolveMaterialCost(state.prices), [state.prices]);
  const quote = useMemo(() => quoteCommission(route, state.commission), [route, state.commission]);

  function updateState(next) {
    setState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      saveState(resolved);
      return resolved;
    });
  }

  function updateTarget(key, value) {
    updateState((current) => ({
      ...current,
      target: { ...current.target, [key]: value },
    }));
  }

  function updatePrice(key, value) {
    updateState((current) => ({
      ...current,
      prices: { ...current.prices, [key]: numberValue(value) },
    }));
  }

  function updateCommission(key, value) {
    updateState((current) => ({
      ...current,
      commission: { ...current.commission, [key]: value },
    }));
  }

  function updateSimulationSetting(key, value) {
    updateState((current) => ({
      ...current,
      simulationSettings: { ...current.simulationSettings, [key]: value },
    }));
  }

  function resetDefaults() {
    const next = {
      prices: demoPrices,
      target: defaultTarget,
      commission: defaultCommission,
      simulationSettings: { runs: 10000, seed: "auto-20260518" },
    };
    saveState(next);
    setState(next);
    setSimulation(null);
  }

  function runSimulation() {
    setIsSimulating(true);
    window.setTimeout(() => {
      const result = simulateMonteCarlo(state.target, {}, state.prices, state.simulationSettings);
      setSimulation(result);
      setIsSimulating(false);
    }, 20);
  }

  function scrollToPrices() {
    document.getElementById("price-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const displaySimulation = simulation?.ok ? simulation : null;

  return (
    <div className="shell">
      <header className="app-nav">
        <div className="brand">
          <div className="mark">RO</div>
          <div>
            <p className="eyebrow">React + Vite V2</p>
            <h1>裝備製作成本與代衝報價模擬器</h1>
          </div>
        </div>
        <div className="actions">
          <button className="btn secondary" type="button" onClick={scrollToPrices}>材料價格</button>
          <button className="btn secondary" type="button" onClick={resetDefaults}>還原預設</button>
          <button className="btn" type="button" onClick={runSimulation}>
            {isSimulating ? "模擬中..." : "執行模擬"}
          </button>
        </div>
      </header>

      <main className="dashboard">
        <aside className="sidebar">
          <TargetPanel target={state.target} updateTarget={updateTarget} />
          <StrategyPanel target={state.target} updateTarget={updateTarget} />
          <CommissionPanel commission={state.commission} simulationSettings={state.simulationSettings} updateCommission={updateCommission} updateSimulationSetting={updateSimulationSetting} />
        </aside>

        <section className="main">
          <section className="hero-grid">
            <OverviewPanel route={route} simulation={displaySimulation} />
            <QuotePanel quote={quote} simulation={displaySimulation} route={route} quoteBasis={state.commission.quoteBasis} />
          </section>

          <section className="analysis-grid">
            <MonteCarloPanel route={route} simulation={simulation} settings={state.simulationSettings} updateSimulationSetting={updateSimulationSetting} runSimulation={runSimulation} isSimulating={isSimulating} />
            <RoutePanel route={route} />
          </section>

          <section id="price-panel" className="card price-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Market Prices</p>
                <h2>材料價格</h2>
              </div>
              <span className="pill">會自動保存</span>
            </div>
            <PriceEditor prices={state.prices} updatePrice={updatePrice} />
          </section>

          <section className="card table-card">
            <div className="tabs">
              <button className={`tab ${activeTab === "refine" ? "active" : ""}`} type="button" onClick={() => setActiveTab("refine")}>精煉比較</button>
              <button className={`tab ${activeTab === "materials" ? "active" : ""}`} type="button" onClick={() => setActiveTab("materials")}>材料成本</button>
              <button className={`tab ${activeTab === "samples" ? "active" : ""}`} type="button" onClick={() => setActiveTab("samples")}>模擬摘要</button>
            </div>
            {activeTab === "refine" && <RefineComparisonTable route={route} />}
            {activeTab === "materials" && <MaterialTable materialCosts={materialCosts} />}
            {activeTab === "samples" && <SimulationSummary simulation={simulation} />}
          </section>
        </section>
      </main>
    </div>
  );
}

function TargetPanel({ target, updateTarget }) {
  return (
    <section className="card pad">
      <div className="card-head">
        <div>
          <p className="eyebrow">Build Target</p>
          <h2>養成目標</h2>
        </div>
        <span className="pill">已自動保存</span>
      </div>
      <div className="form-grid one">
        <label>裝備類型
          <select value={target.equipmentType} onChange={(event) => updateTarget("equipmentType", event.target.value)}>
            <option value="weapon5">五級武器</option>
            <option value="armor2">二級防具</option>
          </select>
        </label>
        <label>裝備基礎價格
          <input value={target.equipmentPrice} onChange={(event) => updateTarget("equipmentPrice", numberValue(event.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={target.ownedEquipment} onChange={(event) => updateTarget("ownedEquipment", event.target.checked)} />
          已持有第一件裝備
        </label>
      </div>
      <div className="form-grid top-gap">
        <label>起始階級
          <select value={target.startGrade} onChange={(event) => updateTarget("startGrade", event.target.value)}>
            {GRADES.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
          </select>
        </label>
        <label>起始精煉
          <input type="number" min="0" max="20" value={target.startRefine} onChange={(event) => updateTarget("startRefine", numberValue(event.target.value))} />
        </label>
        <label>目標階級
          <select value={target.targetGrade} onChange={(event) => updateTarget("targetGrade", event.target.value)}>
            {GRADES.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
          </select>
        </label>
        <label>目標精煉
          <input type="number" min="0" max="20" value={target.targetRefine} onChange={(event) => updateTarget("targetRefine", numberValue(event.target.value))} />
        </label>
      </div>
    </section>
  );
}

function StrategyPanel({ target, updateTarget }) {
  return (
    <section className="card pad">
      <div className="card-head">
        <div>
          <p className="eyebrow">Strategy</p>
          <h2>路線策略</h2>
        </div>
      </div>
      <div className="form-grid one">
        <label>精煉材料
          <select value={target.refineMaterialPolicy} onChange={(event) => updateTarget("refineMaterialPolicy", event.target.value)}>
            <option value="auto">自動比較最省</option>
            <option value="normalOnly">只用一般乙太材料</option>
            <option value="advancedOnly">能用濃縮/高階就只用它</option>
          </select>
        </label>
        <label>祝福保護
          <select value={target.protectionPolicy} onChange={(event) => updateTarget("protectionPolicy", event.target.value)}>
            <option value="auto">自動比較</option>
            <option value="never">不使用祝福</option>
            <option value="always">可用時一定使用</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function CommissionPanel({ commission, simulationSettings, updateCommission, updateSimulationSetting }) {
  return (
    <section className="card pad">
      <div className="card-head">
        <div>
          <p className="eyebrow">Pricing</p>
          <h2>代衝參數</h2>
        </div>
      </div>
      <div className="form-grid">
        <label>利潤率 %
          <input type="number" value={commission.profitRate} onChange={(event) => updateCommission("profitRate", numberValue(event.target.value))} />
        </label>
        <label>風險緩衝 %
          <input type="number" value={commission.riskBufferRate} onChange={(event) => updateCommission("riskBufferRate", numberValue(event.target.value))} />
        </label>
        <label>最低工資
          <input value={commission.minimumFee} onChange={(event) => updateCommission("minimumFee", numberValue(event.target.value))} />
        </label>
        <label>報價基準
          <select value={commission.quoteBasis} onChange={(event) => updateCommission("quoteBasis", event.target.value)}>
            <option value="expected">理論期望</option>
            <option value="p90">P90</option>
            <option value="p95">P95</option>
          </select>
        </label>
        <label>模擬次數
          <select value={simulationSettings.runs} onChange={(event) => updateSimulationSetting("runs", numberValue(event.target.value))}>
            <option value="1000">1,000</option>
            <option value="10000">10,000</option>
            <option value="100000">100,000</option>
          </select>
        </label>
        <label>隨機種子
          <input value={simulationSettings.seed} onChange={(event) => updateSimulationSetting("seed", event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function OverviewPanel({ route, simulation }) {
  return (
    <section className="card hero-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>理論期望與模擬分布</h2>
        </div>
        <span className="pill">{simulation ? `${formatNumber(simulation.runs)} runs` : "尚未模擬"}</span>
      </div>
      <div className="metrics">
        <Metric label="理論期望成本" value={route.ok ? formatZeny(route.expectedCost) : "無法計算"} />
        <Metric label="模擬平均成本" value={simulation ? formatZeny(simulation.average) : "等待模擬"} tone="good" />
        <Metric label="P95 成本" value={simulation ? formatZeny(simulation.p95) : "等待模擬"} tone="warn" />
        <Metric label="最慘成本" value={simulation ? formatZeny(simulation.worst) : "等待模擬"} tone="bad" />
      </div>
      {!route.ok && <div className="notice">{route.error}</div>}
    </section>
  );
}

function QuotePanel({ quote, simulation, route, quoteBasis }) {
  const basis = quoteBasis === "p95" ? simulation?.p95 : quoteBasis === "p90" ? simulation?.p90 : quote?.base;
  const riskQuote = Number.isFinite(basis) ? basis : quote?.conservative;
  return (
    <section className="card quote-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Commission</p>
          <h2>代衝報價</h2>
        </div>
      </div>
      {quote.ok ? (
        <>
          <div className="quote-list">
            <QuoteRow label="低標" value={formatZeny(quote.low)} />
            <QuoteRow label="建議收費" value={formatZeny(quote.suggested)} tone="good" />
            <QuoteRow label={`${quoteBasis.toUpperCase()} 風險報價`} value={formatZeny(riskQuote)} tone="warn" />
          </div>
          {route?.risk?.hasBreakRisk && <div className="notice">此路線有爆裝風險；接代衝建議同時看 P90/P95，不要只看期望值。</div>}
        </>
      ) : (
        <div className="notice">{quote.error}</div>
      )}
    </section>
  );
}

function MonteCarloPanel({ route, simulation, settings, updateSimulationSetting, runSimulation, isSimulating }) {
  return (
    <section className="card sim-panel">
      <div className="card-head">
        <div>
          <p className="eyebrow">Monte Carlo</p>
          <h2>蒙地卡羅模擬</h2>
        </div>
        <span className="pill">{simulation?.ok ? "已完成" : "可重跑"}</span>
      </div>
      <div className="dist-card">
        <div className="sim-toolbar">
          <label>模擬次數
            <select value={settings.runs} onChange={(event) => updateSimulationSetting("runs", numberValue(event.target.value))}>
              <option value="1000">1,000</option>
              <option value="10000">10,000</option>
              <option value="100000">100,000</option>
            </select>
          </label>
          <label>隨機種子
            <input value={settings.seed} onChange={(event) => updateSimulationSetting("seed", event.target.value)} />
          </label>
          <button className="btn" type="button" disabled={!route.ok || isSimulating} onClick={runSimulation}>
            {isSimulating ? "模擬中..." : "執行模擬"}
          </button>
        </div>
        {simulation?.ok ? (
          <>
            <div className="metrics">
              <Metric label="平均" value={formatZeny(simulation.average)} />
              <Metric label="中位數" value={formatZeny(simulation.median)} />
              <Metric label="P90" value={formatZeny(simulation.p90)} tone="warn" />
              <Metric label="P95" value={formatZeny(simulation.p95)} tone="warn" />
            </div>
            <Histogram buckets={simulation.histogram} />
            <div className="sim-detail">
              平均嘗試 {formatNumber(simulation.averageAttempts, 1)} 次，平均爆裝 {formatNumber(simulation.averageBreaks, 2)} 次，P95 爆裝 {formatNumber(simulation.p95Breaks)} 次。
              {simulation.truncated > 0 && ` 有 ${simulation.truncated} 筆達到安全上限，請提高上限或檢查價格。`}
            </div>
          </>
        ) : (
          <div className="empty-state">按下「執行模擬」後，這裡會顯示平均、中位數、P90、P95、最慘成本與分布圖。</div>
        )}
      </div>
    </section>
  );
}

function Histogram({ buckets }) {
  return (
    <>
      <div className="chart">
        <div className="axis"><span>多</span><span>次數</span><span>少</span></div>
        <div className="histogram">
          {buckets.map((bucket, index) => (
            <div
              key={`${bucket.min}-${index}`}
              className={`bar ${index > buckets.length * 0.9 ? "p95" : index > buckets.length * 0.75 ? "p90" : ""}`}
              style={{ height: `${Math.max(4, bucket.ratio * 100)}%` }}
              title={`${formatZeny(bucket.min)} - ${formatZeny(bucket.max)}：${bucket.count}`}
            />
          ))}
        </div>
      </div>
      <div className="legend">
        <span><i className="dot" />主要分布</span>
        <span><i className="dot gold" />高成本尾端</span>
        <span><i className="dot red" />極端成本尾端</span>
      </div>
    </>
  );
}

function RoutePanel({ route }) {
  return (
    <section className="card route-panel">
      <div className="card-head">
        <div>
          <p className="eyebrow">Route</p>
          <h2>推薦成功路徑</h2>
        </div>
        <span className="pill">{route.ok ? `${route.steps.length} 步` : "無路線"}</span>
      </div>
      {route.ok ? (
        <div className="route-list">
          {route.steps.map((step) => (
            <article className="route-step" key={`${step.index}-${step.label}`}>
              <div className="step-no">{step.index}</div>
              <div>
                <h3>{step.label}</h3>
                <p>{formatPercent(step.rate)}，單次 {formatZeny(step.cost)}。{step.failText}</p>
              </div>
              <span className="tag">{step.type === "grade" ? "升階" : step.protected ? "保護" : step.materialKind === "advanced" ? "濃縮" : "一般"}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="notice">{route.error}</div>
      )}
    </section>
  );
}

function RefineComparisonTable({ route }) {
  if (!route.ok) return <div className="notice">{route.error}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>階段</th>
            <th>選項</th>
            <th className="number">成功率</th>
            <th className="number">單次成本</th>
            <th className="number">剩餘期望</th>
            <th>判斷</th>
          </tr>
        </thead>
        <tbody>
          {route.refineComparisons.map((row, index) => (
            <tr key={`${row.state}-${row.option}-${index}`} className={row.chosen ? "chosen" : ""}>
              <td>{row.state} → {row.to}</td>
              <td>{row.option}</td>
              <td className="number">{formatPercent(row.rate)}</td>
              <td className="number">{formatZeny(row.cost)}</td>
              <td className="number">{formatZeny(row.expected)}</td>
              <td>{row.chosen ? <strong>採用</strong> : "比較"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialTable({ materialCosts }) {
  const rows = ["etherOridecon", "etherElunium", "etherStone", "azureGem", "yellowGem", "purpleGem", "amberGem"];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>材料</th>
            <th>公式</th>
            <th className="number">直接買</th>
            <th className="number">製作</th>
            <th>建議</th>
            <th className="number">採用成本</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((key) => {
            const cost = materialCosts[key];
            return (
              <tr key={key}>
                <td>{cost.label}</td>
                <td>{cost.recipeLabel || "無配方"}</td>
                <td className="number">{formatZeny(cost.direct)}</td>
                <td className="number">{formatZeny(cost.crafted)}</td>
                <td>{cost.method}</td>
                <td className="number"><strong>{formatZeny(cost.best)}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PriceEditor({ prices, updatePrice }) {
  return (
    <div className="price-sections">
      {PRICE_SECTIONS.map((section) => (
        <section className="price-section" key={section.title}>
          <h3>{section.title}</h3>
          <div className="price-grid">
            {section.keys.map((key) => (
              <label key={key}>{MATERIALS[key] || key}
                <input value={prices[key] || ""} onChange={(event) => updatePrice(key, event.target.value)} placeholder="0" />
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SimulationSummary({ simulation }) {
  if (!simulation?.ok) return <div className="empty-state">尚未執行蒙地卡羅模擬。</div>;
  return (
    <div className="metrics table-metrics">
      <Metric label="最佳樣本" value={formatZeny(simulation.best)} />
      <Metric label="平均成本" value={formatZeny(simulation.average)} />
      <Metric label="中位數" value={formatZeny(simulation.median)} />
      <Metric label="最慘成本" value={formatZeny(simulation.worst)} tone="bad" />
      <Metric label="平均嘗試" value={`${formatNumber(simulation.averageAttempts, 1)} 次`} />
      <Metric label="平均爆裝" value={`${formatNumber(simulation.averageBreaks, 2)} 次`} />
    </div>
  );
}

function Metric({ label, value, tone = "" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QuoteRow({ label, value, tone = "" }) {
  return (
    <div className="quote-row">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
