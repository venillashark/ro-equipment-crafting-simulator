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
    id: "craft",
    title: "升階與製作材料",
    badge: "常用",
    defaultOpen: true,
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
    id: "weapon",
    title: "五級武器精煉",
    badge: "武器",
    defaultOpen: true,
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
    id: "armor",
    title: "二級防具精煉",
    badge: "防具",
    defaultOpen: false,
    keys: [
      "elunium",
      "etherElunium",
      "concentratedEtherElunium",
      "etherCarnium",
      "highConcentratedEtherElunium",
      "highDensityEtherCarnium",
    ],
  },
  {
    id: "protect",
    title: "保護材料",
    badge: "風險",
    defaultOpen: true,
    keys: ["blessing"],
  },
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
      mode: saved.mode === "commission" ? "commission" : "self",
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
      mode: "self",
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

function gradeIndex(gradeId) {
  return GRADES.findIndex((grade) => grade.id === gradeId);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function createSimulationSignature(state) {
  return stableStringify({
    commission: state.commission,
    prices: state.prices,
    simulationSettings: state.simulationSettings,
    target: state.target,
  });
}

// Risk rules: break outcomes are high risk; then low success rates are high (<40%)
// or medium (<70%); protected/high-success steps are treated as low risk.
function getStepRiskLevel(step) {
  if (step.breaks) return { level: "high", label: "高風險", hint: "失敗會爆裝" };
  if (step.rate < 0.4) return { level: "high", label: "高風險", hint: "成功率偏低" };
  if (step.rate < 0.7) return { level: "medium", label: "中風險", hint: "需要留意波動" };
  return { level: "low", label: "低風險", hint: step.protected ? "有保護" : "成功率穩定" };
}

function simulationMetric(simulation, status, key, formatter = formatZeny) {
  if (status === "stale") return "需重新模擬";
  if (!simulation) return "尚未模擬";
  return formatter(simulation[key]);
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
  const simulationSignature = useMemo(() => createSimulationSignature(state), [state]);
  const simulationIsFresh = simulation?.ok && simulation.signature === simulationSignature;
  const simulationStatus = simulation?.ok ? (simulationIsFresh ? "fresh" : "stale") : "empty";
  const displaySimulation = simulationIsFresh ? simulation : null;

  function updateState(next) {
    setState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      saveState(resolved);
      return resolved;
    });
  }

  function updateMode(mode) {
    updateState((current) => ({ ...current, mode }));
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
      mode: "self",
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
    const signature = createSimulationSignature(state);
    setIsSimulating(true);
    window.setTimeout(() => {
      const result = simulateMonteCarlo(state.target, {}, state.prices, state.simulationSettings);
      setSimulation({ ...result, signature });
      setIsSimulating(false);
    }, 20);
  }

  function scrollToPrices() {
    document.getElementById("price-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={`shell mode-${state.mode}`}>
      <header className="app-nav">
        <div className="brand">
          <div className="mark">RO</div>
          <div>
            <p className="eyebrow">Cost Lab</p>
            <h1>裝備製作模擬器</h1>
            <p className="subtitle">成本試算 / 風險分析 / 代衝報價</p>
          </div>
        </div>

        <div className="nav-tools">
          <ModeSwitch mode={state.mode} updateMode={updateMode} />
          <div className="actions">
            <button className="btn secondary" type="button" onClick={scrollToPrices}>材料價格</button>
            <button className="btn secondary" type="button" onClick={resetDefaults}>還原預設</button>
            <button className="btn" type="button" disabled={!route.ok || isSimulating} onClick={runSimulation}>
              {isSimulating ? "模擬中..." : "執行模擬"}
            </button>
          </div>
        </div>
      </header>

      <KpiStrip
        mode={state.mode}
        quote={quote}
        route={route}
        simulation={displaySimulation}
        simulationStatus={simulationStatus}
      />

      <main className="dashboard">
        <aside className="sidebar">
          <TargetPanel target={state.target} updateTarget={updateTarget} />
          <StrategyPanel target={state.target} updateTarget={updateTarget} />
          <CommissionPanel
            commission={state.commission}
            simulationSettings={state.simulationSettings}
            updateCommission={updateCommission}
            updateSimulationSetting={updateSimulationSetting}
          />
          <section id="price-panel" className="card panel price-card">
            <PanelHeader eyebrow="Market" title="材料價格" meta="自動保存" />
            <PriceEditor prices={state.prices} updatePrice={updatePrice} />
          </section>
        </aside>

        <section className="main">
          <ModeInsight
            mode={state.mode}
            quote={quote}
            quoteBasis={state.commission.quoteBasis}
            route={route}
            simulation={displaySimulation}
            simulationStatus={simulationStatus}
          />

          <section className="analysis-grid">
            <MonteCarloPanel
              route={route}
              simulation={displaySimulation}
              simulationStatus={simulationStatus}
              settings={state.simulationSettings}
              updateSimulationSetting={updateSimulationSetting}
              runSimulation={runSimulation}
              isSimulating={isSimulating}
            />
            <RoutePanel route={route} />
          </section>

          <section className="analysis-grid lower">
            <CostSummary mode={state.mode} quote={quote} route={route} />
            <AnalysisTabs
              activeTab={activeTab}
              materialCosts={materialCosts}
              route={route}
              setActiveTab={setActiveTab}
              simulation={displaySimulation}
              simulationStatus={simulationStatus}
            />
          </section>
        </section>
      </main>
    </div>
  );
}

function ModeSwitch({ mode, updateMode }) {
  return (
    <div className="mode-switch" aria-label="模式切換">
      <button
        className={mode === "self" ? "active" : ""}
        type="button"
        aria-pressed={mode === "self"}
        onClick={() => updateMode("self")}
      >
        自用成本模式
      </button>
      <button
        className={mode === "commission" ? "active" : ""}
        type="button"
        aria-pressed={mode === "commission"}
        onClick={() => updateMode("commission")}
      >
        代衝報價模式
      </button>
    </div>
  );
}

function PanelHeader({ eyebrow, title, meta }) {
  return (
    <div className="card-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {meta && <span className="pill">{meta}</span>}
    </div>
  );
}

function KpiStrip({ mode, quote, route, simulation, simulationStatus }) {
  const riskValue = route.ok
    ? route.risk.hasBreakRisk
      ? formatPercent(route.risk.singlePassBreakRisk)
      : "低"
    : "無法計算";
  const riskSub = route.ok ? `期望爆裝 ${formatNumber(route.risk.expectedBreaks, 2)} 次` : route.error;

  return (
    <section className="kpi-strip" aria-label="重要指標">
      <KpiCard
        id="expected"
        featured={mode === "self"}
        label="理論期望成本"
        marker="EV"
        value={route.ok ? formatZeny(route.expectedCost) : "無法計算"}
        sub={route.ok ? `${route.steps.length} 個成功路徑階段` : route.error}
      />
      <KpiCard
        id="sim-average"
        featured={mode === "self"}
        label="模擬平均成本"
        marker="MC"
        tone={simulationStatus === "stale" ? "stale" : "blue"}
        value={simulationMetric(simulation, simulationStatus, "average")}
        sub={simulation ? `${formatNumber(simulation.runs)} 次模擬` : "Monte Carlo"}
      />
      <KpiCard
        id="p90"
        featured={mode === "commission"}
        label="P90"
        marker="P90"
        tone={simulationStatus === "stale" ? "stale" : "gold"}
        value={simulationMetric(simulation, simulationStatus, "p90")}
        sub="高成本分位"
      />
      <KpiCard
        id="p95"
        featured={mode === "commission"}
        label="P95"
        marker="P95"
        tone={simulationStatus === "stale" ? "stale" : "gold"}
        value={simulationMetric(simulation, simulationStatus, "p95")}
        sub="保守成本分位"
      />
      <KpiCard
        id="quote"
        featured={mode === "commission"}
        label="建議報價"
        marker="Z"
        tone="gold"
        value={quote.ok ? formatZeny(quote.suggested) : "無法計算"}
        sub={quote.ok ? `低標 ${formatZeny(quote.low)}` : quote.error}
      />
      <KpiCard
        id="risk"
        featured={mode === "self"}
        label="爆裝風險"
        marker="%"
        tone={route.ok && route.risk.hasBreakRisk ? "red" : "green"}
        value={riskValue}
        sub={riskSub}
      />
    </section>
  );
}

function KpiCard({ featured = false, label, marker, sub, tone = "", value }) {
  return (
    <article className={`kpi-card ${tone} ${featured ? "featured" : ""}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <i>{marker}</i>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}

function TargetPanel({ target, updateTarget }) {
  return (
    <section className="card panel">
      <PanelHeader eyebrow="Target" title="目標設定" meta="已保存" />
      <div className="form-grid one">
        <label>裝備類型
          <select value={target.equipmentType} onChange={(event) => updateTarget("equipmentType", event.target.value)}>
            <option value="weapon5">五級武器</option>
            <option value="armor2">二級防具</option>
          </select>
        </label>
        <label>裝備基礎價格
          <input inputMode="numeric" value={target.equipmentPrice} onChange={(event) => updateTarget("equipmentPrice", numberValue(event.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={target.ownedEquipment} onChange={(event) => updateTarget("ownedEquipment", event.target.checked)} />
          <span>已持有第一件裝備</span>
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
    <section className="card panel">
      <PanelHeader eyebrow="Strategy" title="路線策略" />
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
    <section className="card panel">
      <PanelHeader eyebrow="Pricing" title="代衝參數" />
      <div className="form-grid">
        <label>利潤率 %
          <input type="number" value={commission.profitRate} onChange={(event) => updateCommission("profitRate", numberValue(event.target.value))} />
        </label>
        <label>風險緩衝 %
          <input type="number" value={commission.riskBufferRate} onChange={(event) => updateCommission("riskBufferRate", numberValue(event.target.value))} />
        </label>
        <label>最低工資
          <input inputMode="numeric" value={commission.minimumFee} onChange={(event) => updateCommission("minimumFee", numberValue(event.target.value))} />
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

function ModeInsight({ mode, quote, quoteBasis, route, simulation, simulationStatus }) {
  const basisValue =
    quoteBasis === "p95"
      ? simulationMetric(simulation, simulationStatus, "p95")
      : quoteBasis === "p90"
        ? simulationMetric(simulation, simulationStatus, "p90")
        : quote.ok
          ? formatZeny(quote.base)
          : "無法計算";

  return (
    <section className="card mode-panel">
      <div className="mode-copy">
        <p className="eyebrow">{mode === "commission" ? "Commission View" : "Owner View"}</p>
        <h2>{mode === "commission" ? "代衝報價視角" : "自用成本視角"}</h2>
        <strong>{mode === "commission" ? (quote.ok ? formatZeny(quote.suggested) : "無法計算") : (route.ok ? formatZeny(route.expectedCost) : "無法計算")}</strong>
      </div>
      <div className="mode-facts">
        <InfoTile label="報價基準" value={basisValue} />
        <InfoTile label="保守報價" value={quote.ok ? formatZeny(quote.conservative) : "無法計算"} />
        <InfoTile label="單輪爆裝風險" value={route.ok ? formatPercent(route.risk.singlePassBreakRisk) : "-"} />
      </div>
    </section>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="info-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MonteCarloPanel({ route, simulation, simulationStatus, settings, updateSimulationSetting, runSimulation, isSimulating }) {
  return (
    <section className="card panel sim-panel">
      <PanelHeader
        eyebrow="Monte Carlo"
        title="蒙地卡羅模擬"
        meta={simulationStatus === "fresh" ? "已同步" : simulationStatus === "stale" ? "需重新模擬" : "尚未模擬"}
      />
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

      {simulation ? (
        <>
          <div className="stat-grid">
            <Metric label="平均" value={formatZeny(simulation.average)} tone="blue" />
            <Metric label="中位數" value={formatZeny(simulation.median)} />
            <Metric label="P90" value={formatZeny(simulation.p90)} tone="warn" />
            <Metric label="P95" value={formatZeny(simulation.p95)} tone="warn" />
            <Metric label="最佳" value={formatZeny(simulation.best)} tone="good" />
            <Metric label="最差" value={formatZeny(simulation.worst)} tone="bad" />
            <Metric label="平均嘗試" value={`${formatNumber(simulation.averageAttempts, 1)} 次`} />
            <Metric label="平均爆裝" value={`${formatNumber(simulation.averageBreaks, 2)} 次`} tone={simulation.averageBreaks > 0 ? "bad" : "good"} />
            <Metric label="P95 爆裝" value={`${formatNumber(simulation.p95Breaks)} 次`} tone={simulation.p95Breaks > 0 ? "bad" : "good"} />
          </div>
          <Histogram buckets={simulation.histogram} />
          {simulation.truncated > 0 && <div className="notice warn">{simulation.truncated} 筆模擬達到安全上限。</div>}
        </>
      ) : (
        <div className={`empty-state ${simulationStatus === "stale" ? "stale" : ""}`}>
          {simulationStatus === "stale" ? "輸入參數已變更，需重新模擬。" : "尚未執行蒙地卡羅模擬。"}
        </div>
      )}
    </section>
  );
}

function Histogram({ buckets = [] }) {
  if (!buckets.length) return null;

  return (
    <div className="chart-block">
      <div className="chart-head">
        <span>成本分布</span>
        <small>{formatZeny(buckets[0].min)} - {formatZeny(buckets[buckets.length - 1].max)}</small>
      </div>
      <div className="histogram" aria-label="蒙地卡羅成本分布圖">
        {buckets.map((bucket, index) => (
          <div
            key={`${bucket.min}-${bucket.max}-${index}`}
            className={`bar ${index > buckets.length * 0.9 ? "p95" : index > buckets.length * 0.75 ? "p90" : ""}`}
            style={{ height: `${Math.max(5, bucket.ratio * 100)}%` }}
            title={`${formatZeny(bucket.min)} - ${formatZeny(bucket.max)}: ${bucket.count}`}
          />
        ))}
      </div>
      <div className="legend">
        <span><i className="dot" />主要分布</span>
        <span><i className="dot gold" />高成本尾端</span>
        <span><i className="dot red" />極端尾端</span>
      </div>
    </div>
  );
}

function RoutePanel({ route }) {
  const warnings = route.ok ? routeWarnings(route) : [];

  return (
    <section className="card panel route-panel">
      <PanelHeader eyebrow="Route" title="推薦成功路線" meta={route.ok ? `${route.steps.length} 步` : "無路線"} />
      {!route.ok && <div className="notice warn">{route.error}</div>}
      {warnings.map((warning) => <div className="notice warn" key={warning}>{warning}</div>)}
      {route.ok && route.steps.length === 0 && <div className="empty-state">目前狀態已達成目標。</div>}
      {route.ok && route.steps.length > 0 && (
        <div className="timeline">
          {route.steps.map((step) => {
            const risk = getStepRiskLevel(step);
            return (
              <article className={`timeline-step risk-${risk.level}`} key={`${step.index}-${step.label}`}>
                <div className="timeline-index">{step.index}</div>
                <div className="timeline-body">
                  <div className="step-title">
                    <h3>{step.label}</h3>
                    <span className={`risk-badge ${risk.level}`}>{risk.label}</span>
                  </div>
                  <div className="step-stats">
                    <InfoTile label="成功率" value={formatPercent(step.rate)} />
                    <InfoTile label="單次成本" value={formatZeny(step.cost)} />
                    <InfoTile label="剩餘期望" value={formatZeny(step.remainingExpectedCost)} />
                  </div>
                  <p className="step-fail">{step.failText}</p>
                  <p className="step-materials">
                    {(step.materials?.length ? step.materials.join("、") : "無材料")} / 手續費 {formatZeny(step.zenyFee)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function routeWarnings(route) {
  const warnings = [];
  if (route.risk.hasBreakRisk && route.replacementCost <= 0) {
    warnings.push("裝備基礎價格目前是 0；有爆裝風險的路線會低估重新取得裝備成本。");
  }
  if (gradeIndex(route.target.grade) > gradeIndex(route.start.grade) && !Number.isFinite(route.materialCosts.blessedEtherStardust?.best)) {
    warnings.push("庇佑乙太星塵未填價格；升階加成不會納入比較。");
  }
  return warnings;
}

function CostSummary({ mode, quote, route }) {
  if (!route.ok || !quote.ok) return <section className="card panel"><PanelHeader eyebrow="Cost" title="成本摘要" /><div className="notice warn">{route.error || quote.error}</div></section>;

  const rows = mode === "commission"
    ? [
      { label: "理論期望基礎", value: quote.base, tone: "blue" },
      { label: "利潤", value: quote.profit, tone: "green" },
      { label: "風險緩衝", value: quote.riskBuffer, tone: "gold" },
      { label: "最低工資", value: quote.minimumFee, tone: "gold" },
      { label: "建議報價", value: quote.suggested, tone: "strong" },
    ]
    : [
      { label: "裝備本體", value: route.initialEquipmentCost, tone: "muted" },
      { label: "養成路線期望", value: route.routeExpectedCost, tone: "blue" },
      { label: "總期望成本", value: route.expectedCost, tone: "strong" },
      { label: "保守報價參考", value: quote.conservative, tone: "gold" },
    ];
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <section className="card panel summary-panel">
      <PanelHeader eyebrow="Cost" title={mode === "commission" ? "報價組成" : "成本摘要"} meta="可追溯欄位" />
      <div className="summary-list">
        {rows.map((row) => (
          <div className={`summary-row ${row.tone}`} key={row.label}>
            <div>
              <span>{row.label}</span>
              <strong>{formatZeny(row.value)}</strong>
            </div>
            <div className="summary-track">
              <i style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalysisTabs({ activeTab, materialCosts, route, setActiveTab, simulation, simulationStatus }) {
  return (
    <section className="card panel table-card">
      <div className="tabs">
        <button className={`tab ${activeTab === "refine" ? "active" : ""}`} type="button" onClick={() => setActiveTab("refine")}>精煉比較</button>
        <button className={`tab ${activeTab === "materials" ? "active" : ""}`} type="button" onClick={() => setActiveTab("materials")}>材料成本</button>
        <button className={`tab ${activeTab === "samples" ? "active" : ""}`} type="button" onClick={() => setActiveTab("samples")}>模擬摘要</button>
      </div>
      {activeTab === "refine" && <RefineComparisonTable route={route} />}
      {activeTab === "materials" && <MaterialTable materialCosts={materialCosts} />}
      {activeTab === "samples" && <SimulationSummary simulation={simulation} simulationStatus={simulationStatus} />}
    </section>
  );
}

function RefineComparisonTable({ route }) {
  if (!route.ok) return <div className="notice warn">{route.error}</div>;
  if (!route.refineComparisons.length) return <div className="empty-state">此路線沒有可比較的精煉選項。</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>階段</th>
            <th>選項</th>
            <th className="number">成功率</th>
            <th className="number">單次成本</th>
            <th>失敗結果</th>
            <th className="number">剩餘期望</th>
            <th>判斷</th>
          </tr>
        </thead>
        <tbody>
          {route.refineComparisons.map((row, index) => (
            <tr key={`${row.state}-${row.option}-${index}`} className={row.chosen ? "chosen" : ""}>
              <td>{row.state} {"->"} {row.to}</td>
              <td>{row.option}</td>
              <td className="number">{formatPercent(row.rate)}</td>
              <td className="number">{formatZeny(row.cost)}</td>
              <td>{row.failText}</td>
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
                <td><span className="method-pill">{cost.method}</span></td>
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
    <div className="price-accordion">
      {PRICE_SECTIONS.map((section) => (
        <details className="price-group" key={section.id} defaultOpen={section.defaultOpen}>
          <summary>
            <span>{section.title}</span>
            <em>{section.badge}</em>
          </summary>
          <div className="price-grid">
            {section.keys.map((key) => (
              <label key={key}>{MATERIALS[key] || key}
                <input inputMode="numeric" value={prices[key] || ""} onChange={(event) => updatePrice(key, event.target.value)} placeholder="0" />
              </label>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function SimulationSummary({ simulation, simulationStatus }) {
  if (!simulation) {
    return <div className={`empty-state ${simulationStatus === "stale" ? "stale" : ""}`}>{simulationStatus === "stale" ? "輸入參數已變更，需重新模擬。" : "尚未執行蒙地卡羅模擬。"}</div>;
  }

  return (
    <div className="stat-grid compact">
      <Metric label="最佳樣本" value={formatZeny(simulation.best)} tone="good" />
      <Metric label="平均成本" value={formatZeny(simulation.average)} tone="blue" />
      <Metric label="中位數" value={formatZeny(simulation.median)} />
      <Metric label="P90" value={formatZeny(simulation.p90)} tone="warn" />
      <Metric label="P95" value={formatZeny(simulation.p95)} tone="warn" />
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

createRoot(document.getElementById("root")).render(<App />);
