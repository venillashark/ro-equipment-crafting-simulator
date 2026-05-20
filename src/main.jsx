import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { downloadPriceJson, validatePriceImport } from "./helpers/materialPriceIO.js";
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
      "concentratedOrideconBox",
      "concentratedEtherOridecon",
      "etherBradium",
      "highConcentratedOrideconBox",
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
      "concentratedEluniumBox",
      "concentratedEtherElunium",
      "etherCarnium",
      "highConcentratedEluniumBox",
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
      theme: saved.theme === "light" ? "light" : "dark",
      exchangeRateZenyPerTwd: saved.exchangeRateZenyPerTwd || "",
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
      theme: "dark",
      exchangeRateZenyPerTwd: "",
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

function formatCompactZeny(value) {
  if (!Number.isFinite(value)) return "無法計算";
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${formatNumber(value / 100000000, 1)} 億 Z`;
  if (abs >= 10000) return `${formatNumber(value / 10000, abs >= 1000000 ? 0 : 1)} 萬 Z`;
  return formatZeny(value);
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

function validExchangeRate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatTwdFromZeny(value, exchangeRate) {
  if (!Number.isFinite(value) || !exchangeRate) return "";
  const twd = value / exchangeRate;
  return `約 NT$${twd.toLocaleString("zh-TW", {
    maximumFractionDigits: twd >= 100 ? 0 : 1,
  })}`;
}

function zenyWithTwd(value, exchangeRate) {
  return {
    zeny: formatZeny(value),
    twd: formatTwdFromZeny(value, exchangeRate),
  };
}

function App() {
  const [state, setState] = useState(loadInitialState);
  const [activeDialog, setActiveDialog] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
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
  const exchangeRate = validExchangeRate(state.exchangeRateZenyPerTwd);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.colorScheme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    if (!activeDialog) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setActiveDialog(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("modal-open");
    };
  }, [activeDialog]);

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

  function updateTheme(theme) {
    updateState((current) => ({ ...current, theme }));
  }

  function updateExchangeRate(value) {
    updateState((current) => ({
      ...current,
      exchangeRateZenyPerTwd: value,
    }));
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
      theme: "dark",
      exchangeRateZenyPerTwd: "",
      prices: demoPrices,
      target: defaultTarget,
      commission: defaultCommission,
      simulationSettings: { runs: 10000, seed: "auto-20260518" },
    };
    saveState(next);
    setState(next);
    setSimulation(null);
    setImportPreview(null);
    setImportError("");
    setImportSuccess("");
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

  function openMaterialsDialog() {
    setImportPreview(null);
    setImportError("");
    setImportSuccess("");
    setActiveDialog("materials");
  }

  function closeDialog() {
    setActiveDialog(null);
  }

  function exportPrices() {
    downloadPriceJson(state.prices);
  }

  async function importPrices(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setImportPreview(null);
    setImportError("");
    setImportSuccess("");
    if (!file) return;

    try {
      const text = await file.text();
      const preview = validatePriceImport(text, Object.keys(MATERIALS));
      if (!preview.ok) {
        setImportError(preview.error);
        return;
      }
      setImportPreview(preview);
    } catch (_error) {
      setImportError("讀取檔案失敗，請重新選擇 JSON 檔。");
    }
  }

  function confirmPriceImport() {
    if (!importPreview?.ok) return;
    const count = importPreview.validCount;
    updateState((current) => ({
      ...current,
      prices: { ...current.prices, ...importPreview.updates },
    }));
    setImportPreview(null);
    setImportError("");
    setImportSuccess(`匯入完成，已更新 ${count} 個材料價格。`);
  }

  return (
    <div className={`shell mode-${state.mode} theme-${state.theme}`}>
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
          <div className="top-group mode-group">
            <span className="top-label">模式</span>
            <ModeSwitch mode={state.mode} updateMode={updateMode} />
          </div>
          <div className="top-group theme-group">
            <span className="top-label">外觀</span>
            <ThemeSwitch theme={state.theme} updateTheme={updateTheme} />
          </div>
          <div className="top-group exchange-group">
            <span className="top-label">匯率</span>
            <ExchangeRateControl
              exchangeRate={state.exchangeRateZenyPerTwd}
              updateExchangeRate={updateExchangeRate}
            />
          </div>
          <div className="top-group tools-group">
            <span className="top-label">工具</span>
            <div className="actions top-actions">
              <button className="btn secondary" type="button" onClick={openMaterialsDialog}>材料價格</button>
              <button className="btn secondary" type="button" onClick={resetDefaults}>還原預設</button>
              <button className="btn" type="button" disabled={!route.ok || isSimulating} onClick={runSimulation}>
                {isSimulating ? "模擬中..." : "執行模擬"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <KpiStrip
        mode={state.mode}
        quote={quote}
        route={route}
        simulation={displaySimulation}
        simulationStatus={simulationStatus}
        exchangeRate={exchangeRate}
      />

      <main className="dashboard">
        <aside className="sidebar">
          <TargetPanel target={state.target} updateTarget={updateTarget} />
          <StrategyPanel target={state.target} updateTarget={updateTarget} />
          {state.mode === "commission" && (
            <CommissionPanel
              commission={state.commission}
              simulationSettings={state.simulationSettings}
              updateCommission={updateCommission}
              updateSimulationSetting={updateSimulationSetting}
            />
          )}
        </aside>

        <section className="main">
          <ModeInsight
            mode={state.mode}
            quote={quote}
            quoteBasis={state.commission.quoteBasis}
            route={route}
            simulation={displaySimulation}
            simulationStatus={simulationStatus}
            exchangeRate={exchangeRate}
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
              exchangeRate={exchangeRate}
            />
            <RoutePanel route={route} openRefineCompare={() => setActiveDialog("refineCompare")} />
          </section>

          <section className="analysis-grid lower">
            <CostSummary mode={state.mode} quote={quote} route={route} exchangeRate={exchangeRate} />
          </section>
        </section>
      </main>

      {activeDialog === "materials" && (
        <MaterialPriceDialog
          importError={importError}
          importPreview={importPreview}
          importPrices={importPrices}
          importSuccess={importSuccess}
          materialCosts={materialCosts}
          onClose={closeDialog}
          onConfirmImport={confirmPriceImport}
          onExport={exportPrices}
          onResetImport={() => {
            setImportPreview(null);
            setImportError("");
            setImportSuccess("");
          }}
          prices={state.prices}
          updatePrice={updatePrice}
        />
      )}

      {activeDialog === "refineCompare" && (
        <RefineCompareDialog onClose={closeDialog} route={route} />
      )}
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

function ThemeSwitch({ theme, updateTheme }) {
  return (
    <div className="theme-switch" aria-label="主題切換">
      <button
        className={theme === "dark" ? "active" : ""}
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => updateTheme("dark")}
      >
        深色主題
      </button>
      <button
        className={theme === "light" ? "active" : ""}
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => updateTheme("light")}
      >
        明亮主題
      </button>
    </div>
  );
}

function ExchangeRateControl({ exchangeRate, updateExchangeRate }) {
  const validRate = validExchangeRate(exchangeRate);

  return (
    <div className="exchange-control" role="group" aria-label="台幣匯率設定">
      <div className="exchange-row">
        <span>1 台幣 =</span>
        <input
          inputMode="numeric"
          aria-label="1 台幣可換 Zeny"
          placeholder="160000"
          value={exchangeRate}
          onChange={(event) => updateExchangeRate(event.target.value)}
        />
        <span>Zeny</span>
      </div>
      <small>{validRate ? `依自訂匯率估算` : "未設定時不顯示 NT$"}</small>
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

function KpiStrip({ mode, quote, route, simulation, simulationStatus, exchangeRate }) {
  const riskValue = route.ok
    ? route.risk.hasBreakRisk
      ? formatPercent(route.risk.singlePassBreakRisk)
      : "低"
    : "無法計算";
  const riskSub = route.ok ? `期望爆裝 ${formatNumber(route.risk.expectedBreaks, 2)} 次` : route.error;

  return (
    <section className="kpi-area" aria-label="重要指標">
      <div className="kpi-strip">
        <KpiCard
          id="expected"
          featured={mode === "self"}
          label="理論期望成本"
          marker="EV"
          value={route.ok ? formatZeny(route.expectedCost) : "無法計算"}
          convertedValue={route.ok ? formatTwdFromZeny(route.expectedCost, exchangeRate) : ""}
          sub={route.ok ? `${route.steps.length} 個成功路徑階段` : route.error}
        />
        <KpiCard
          id="sim-average"
          featured={mode === "self"}
          label="模擬平均成本"
          marker="MC"
          tone={simulationStatus === "stale" ? "stale" : "blue"}
          value={simulationMetric(simulation, simulationStatus, "average")}
          convertedValue={simulation ? formatTwdFromZeny(simulation.average, exchangeRate) : ""}
          sub={simulation ? `${formatNumber(simulation.runs)} 次模擬` : "Monte Carlo"}
        />
        <KpiCard
          id="p90"
          featured={mode === "commission"}
          label="P90"
          marker="P90"
          tone={simulationStatus === "stale" ? "stale" : "gold"}
          value={simulationMetric(simulation, simulationStatus, "p90")}
          convertedValue={simulation ? formatTwdFromZeny(simulation.p90, exchangeRate) : ""}
          sub="高成本分位"
        />
        <KpiCard
          id="p95"
          featured={mode === "commission"}
          label="P95"
          marker="P95"
          tone={simulationStatus === "stale" ? "stale" : "gold"}
          value={simulationMetric(simulation, simulationStatus, "p95")}
          convertedValue={simulation ? formatTwdFromZeny(simulation.p95, exchangeRate) : ""}
          sub="保守成本分位"
        />
        <KpiCard
          id="quote"
          featured={mode === "commission"}
          label="建議報價"
          marker="Z"
          tone="gold"
          value={quote.ok ? formatZeny(quote.suggested) : "無法計算"}
          convertedValue={quote.ok ? formatTwdFromZeny(quote.suggested, exchangeRate) : ""}
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
      </div>
      {exchangeRate && <p className="exchange-hint">依自訂匯率估算：1 台幣 = {formatNumber(exchangeRate)} Zeny</p>}
    </section>
  );
}

function KpiCard({ convertedValue = "", featured = false, label, marker, sub, tone = "", value }) {
  return (
    <article className={`kpi-card ${tone} ${featured ? "featured" : ""}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <i>{marker}</i>
      </div>
      <strong>{value}</strong>
      {convertedValue && <em>{convertedValue}</em>}
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

function ModeInsight({ mode, quote, quoteBasis, route, simulation, simulationStatus, exchangeRate }) {
  const basisValue =
    quoteBasis === "p95"
      ? simulationMetric(simulation, simulationStatus, "p95")
      : quoteBasis === "p90"
        ? simulationMetric(simulation, simulationStatus, "p90")
        : quote.ok
          ? formatZeny(quote.base)
          : "無法計算";
  const primaryValue = mode === "commission" ? quote?.suggested : route?.expectedCost;
  const primaryText = mode === "commission" ? (quote.ok ? formatZeny(quote.suggested) : "無法計算") : (route.ok ? formatZeny(route.expectedCost) : "無法計算");
  const primaryTwd = formatTwdFromZeny(primaryValue, exchangeRate);

  return (
    <section className="card mode-panel">
      <div className="mode-copy">
        <p className="eyebrow">{mode === "commission" ? "Commission View" : "Owner View"}</p>
        <h2>{mode === "commission" ? "代衝報價視角" : "自用成本視角"}</h2>
        <strong>{primaryText}</strong>
        {primaryTwd && <small>{primaryTwd}</small>}
      </div>
      <div className="mode-facts">
        <InfoTile label="報價基準" value={basisValue} />
        <InfoTile label="保守報價" value={quote.ok ? formatZeny(quote.conservative) : "無法計算"} />
        <InfoTile label="單輪爆裝風險" value={route.ok ? formatPercent(route.risk.singlePassBreakRisk) : "-"} />
      </div>
    </section>
  );
}

function InfoTile({ label, value, title }) {
  return (
    <div className="info-tile">
      <span>{label}</span>
      <strong title={title}>{value}</strong>
    </div>
  );
}

function MonteCarloPanel({ route, simulation, simulationStatus, settings, updateSimulationSetting, runSimulation, isSimulating, exchangeRate }) {
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
            <Metric label="平均" value={formatZeny(simulation.average)} sub={formatTwdFromZeny(simulation.average, exchangeRate)} tone="blue" />
            <Metric label="中位數" value={formatZeny(simulation.median)} sub={formatTwdFromZeny(simulation.median, exchangeRate)} />
            <Metric label="P90" value={formatZeny(simulation.p90)} sub={formatTwdFromZeny(simulation.p90, exchangeRate)} tone="warn" />
            <Metric label="P95" value={formatZeny(simulation.p95)} sub={formatTwdFromZeny(simulation.p95, exchangeRate)} tone="warn" />
            <Metric label="最佳" value={formatZeny(simulation.best)} sub={formatTwdFromZeny(simulation.best, exchangeRate)} tone="good" />
            <Metric label="最差" value={formatZeny(simulation.worst)} sub={formatTwdFromZeny(simulation.worst, exchangeRate)} tone="bad" />
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

function RoutePanel({ route, openRefineCompare }) {
  const warnings = route.ok ? routeWarnings(route) : [];

  return (
    <section className="card panel route-panel">
      <div className="card-head">
        <div>
          <p className="eyebrow">Route</p>
          <h2>推薦成功路線</h2>
        </div>
        <div className="card-actions">
          <span className="pill">{route.ok ? `${route.steps.length} 步` : "無路線"}</span>
          <button className="btn secondary small" type="button" onClick={openRefineCompare}>查看精煉比較</button>
        </div>
      </div>
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
                    <InfoTile label="單次成本" value={formatCompactZeny(step.cost)} title={`完整單次成本：${formatZeny(step.cost)}`} />
                  </div>
                  <div className="step-meta-row">
                    <span title={`完整剩餘期望：${formatZeny(step.remainingExpectedCost)}`}>
                      剩餘期望 <strong>{formatCompactZeny(step.remainingExpectedCost)}</strong>
                    </span>
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

function CostSummary({ mode, quote, route, exchangeRate }) {
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
              {formatTwdFromZeny(row.value, exchangeRate) && <small>{formatTwdFromZeny(row.value, exchangeRate)}</small>}
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

function ModalFrame({ children, className = "", onClose, title, eyebrow, meta }) {
  return (
    <div
      className={`modal-backdrop ${className}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <div className="card-actions">
            {meta && <span className="pill">{meta}</span>}
            <button className="btn secondary small" type="button" onClick={onClose}>關閉</button>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function MaterialPriceDialog({
  importError,
  importPreview,
  importPrices,
  importSuccess,
  materialCosts,
  onClose,
  onConfirmImport,
  onExport,
  onResetImport,
  prices,
  updatePrice,
}) {
  return (
    <ModalFrame className="drawer" eyebrow="Market" title="材料價格與成本" meta="自動保存" onClose={onClose}>
      <div className="modal-content">
        <section className="drawer-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Prices</p>
              <h3>材料價格</h3>
            </div>
            <span className="pill">合併更新</span>
          </div>
          <PriceEditor prices={prices} updatePrice={updatePrice} />
        </section>

        <section className="drawer-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Costs</p>
              <h3>材料成本摘要</h3>
            </div>
          </div>
          <MaterialTable materialCosts={materialCosts} />
        </section>

        <section className="drawer-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Import / Export</p>
              <h3>匯入 / 匯出</h3>
            </div>
          </div>
          <div className="notice">
            匯入前建議先匯出目前價格作為備份。可將匯出的 JSON 交給 AI 協助整理價格，再匯入更新；請保留材料 key，不要改欄位名稱。
          </div>
          <div className="import-actions">
            <button className="btn" type="button" onClick={onExport}>匯出價格</button>
            <label className="file-button">
              匯入價格 JSON
              <input accept="application/json,.json" type="file" onChange={importPrices} />
            </label>
            {(importPreview || importError || importSuccess) && (
              <button className="btn secondary" type="button" onClick={onResetImport}>清除訊息</button>
            )}
          </div>

          {importError && <div className="notice error">{importError}</div>}
          {importSuccess && <div className="notice success">{importSuccess}</div>}
          {importPreview?.ok && (
            <div className="import-preview">
              <h4>匯入預覽</h4>
              <div className="preview-grid">
                <InfoTile label="將更新" value={`${importPreview.validCount} 個材料`} />
                <InfoTile label="未知 key" value={`${importPreview.unknownCount} 個`} />
                <InfoTile label="無效價格" value={`${importPreview.invalidCount} 個`} />
              </div>
              {importPreview.unknownKeys.length > 0 && <p>未知 key：{importPreview.unknownKeys.slice(0, 8).join("、")}{importPreview.unknownKeys.length > 8 ? "..." : ""}</p>}
              {importPreview.invalidPrices.length > 0 && <p>無效價格：{importPreview.invalidPrices.slice(0, 8).join("、")}{importPreview.invalidPrices.length > 8 ? "..." : ""}</p>}
              <div className="import-confirm">
                <button className="btn" type="button" disabled={importPreview.validCount === 0} onClick={onConfirmImport}>確認匯入有效價格</button>
                <button className="btn secondary" type="button" onClick={onResetImport}>取消</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </ModalFrame>
  );
}

function RefineCompareDialog({ onClose, route }) {
  return (
    <ModalFrame className="compact-modal" eyebrow="Compare" title="精煉比較" meta={route.ok ? `${route.refineComparisons.length} 筆` : "無資料"} onClose={onClose}>
      <div className="modal-content">
        <RefineComparisonTable route={route} />
      </div>
    </ModalFrame>
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
  const rows = [
    "etherOridecon",
    "etherElunium",
    "concentratedOridecon",
    "concentratedElunium",
    "highConcentratedOridecon",
    "highConcentratedElunium",
    "concentratedEtherOridecon",
    "concentratedEtherElunium",
    "highConcentratedEtherOridecon",
    "highConcentratedEtherElunium",
    "etherStone",
    "azureGem",
    "yellowGem",
    "purpleGem",
    "amberGem",
  ];
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

function Metric({ label, value, sub = "", tone = "" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
