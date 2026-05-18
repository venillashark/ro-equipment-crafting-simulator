const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_CONFIG,
  resolveMaterialCost,
  findBestRoute,
  simulateMonteCarlo,
  quoteCommission,
  __internals,
} = require("../src/core.cjs");

test("升階材料成本重現既有 Markdown 比較結果", () => {
  const costs = resolveMaterialCost(DEFAULT_CONFIG.materials);

  assert.equal(costs.etherStone.best, 228884);
  assert.equal(costs.azureGem.best, 788800);
  assert.equal(costs.yellowGem.best, 1422222);
  assert.equal(costs.purpleGem.best, 2388888);
  assert.equal(costs.amberGem.best, 3936680);
  assert.equal(costs.amberGem.method, "自行製作");
});

test("神之金屬與鋁會自動換算乙太精煉材料成本", () => {
  const costs = resolveMaterialCost({
    ...DEFAULT_CONFIG.materials,
    oridecon: 10000,
    elunium: 20000,
    etherOridecon: 0,
    etherElunium: 0,
  });

  assert.equal(costs.etherOridecon.best, 36298);
  assert.equal(costs.etherOridecon.method, "自行製作");
  assert.equal(costs.etherElunium.best, 46298);
  assert.equal(costs.etherElunium.method, "自行製作");
});

test("+10 前五級武器濃縮精煉失敗退 1，一般精煉退 3", () => {
  const state = { grade: "none", refine: 7 };

  assert.deepEqual(__internals.refineFailState(state, "drop", "advanced"), { grade: "none", refine: 6 });
  assert.deepEqual(__internals.refineFailState(state, "drop", "normal"), { grade: "none", refine: 4 });
});

test("+10 後爆裝會把重新取得裝備成本計入期望值", () => {
  const prices = {
    ...DEFAULT_CONFIG.materials,
    etherBradium: 1000,
    highConcentratedEtherOridecon: 0,
    blessing: 0,
  };
  const result = findBestRoute(
    {
      equipmentType: "weapon5",
      equipmentPrice: 1000000,
      ownedEquipment: true,
      startGrade: "none",
      startRefine: 10,
      targetGrade: "none",
      targetRefine: 11,
    },
    {},
    prices,
  );

  assert.equal(result.ok, true);
  assert.equal(result.steps[0].breaks, true);
  assert.equal(Math.round(result.routeExpectedCost), Math.round((101000 + 0.92 * 1000000) / 0.08));
});

test("升階成功後階級提升且精煉值歸零", () => {
  const prices = {
    ...DEFAULT_CONFIG.materials,
    blessedEtherStardust: 0,
  };
  const result = findBestRoute(
    {
      equipmentType: "weapon5",
      equipmentPrice: 5000000,
      ownedEquipment: true,
      startGrade: "none",
      startRefine: 11,
      targetGrade: "D",
      targetRefine: 0,
    },
    {},
    prices,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.steps[0].success, { grade: "D", refine: 0 });
});

test("升階加成使用庇佑乙太星塵，不會吃一般乙太星塵價格", () => {
  const withoutBlessed = findBestRoute(
    {
      equipmentType: "weapon5",
      equipmentPrice: 0,
      ownedEquipment: true,
      startGrade: "none",
      startRefine: 9,
      targetGrade: "D",
      targetRefine: 0,
    },
    {},
    { ...DEFAULT_CONFIG.materials, etherStardust: 1, blessedEtherStardust: 0 },
  );
  const withBlessed = findBestRoute(
    {
      equipmentType: "weapon5",
      equipmentPrice: 0,
      ownedEquipment: true,
      startGrade: "none",
      startRefine: 9,
      targetGrade: "D",
      targetRefine: 0,
    },
    {},
    { ...DEFAULT_CONFIG.materials, etherStardust: 1, blessedEtherStardust: 1 },
  );

  assert.equal(withoutBlessed.ok, true);
  assert.equal(withBlessed.ok, true);
  assert.equal(withoutBlessed.steps.some((step) => step.label.includes("庇佑")), false);
  assert.equal(withBlessed.steps.some((step) => step.label.includes("庇佑")), true);
});

test("精煉材料策略可以排除濃縮乙太材料", () => {
  const prices = {
    ...DEFAULT_CONFIG.materials,
    etherOridecon: 1000,
    concentratedEtherOridecon: 1000,
  };
  const result = findBestRoute(
    {
      equipmentType: "weapon5",
      equipmentPrice: 0,
      ownedEquipment: true,
      startGrade: "none",
      startRefine: 3,
      targetGrade: "none",
      targetRefine: 4,
      refineMaterialPolicy: "normalOnly",
      protectionPolicy: "auto",
    },
    {},
    prices,
  );

  assert.equal(result.ok, true);
  assert.equal(result.steps[0].materialKind, "normal");
  assert.equal(result.refineComparisons.every((row) => !row.option.includes("濃縮")), true);
});

test("代衝報價會依利潤、風險緩衝與最低工資更新", () => {
  const route = {
    ok: true,
    expectedCost: 10000000,
    replacementCost: 2000000,
    risk: { expectedBreaks: 0.5 },
  };
  const quote = quoteCommission(route, {
    profitRate: 15,
    riskBufferRate: 10,
    minimumFee: 1000000,
  });

  assert.equal(quote.low, 11000000);
  assert.equal(quote.suggested, 13500000);
  assert.equal(quote.conservative, 14500000);
});

test("蒙地卡羅模擬會輸出平均、中位數、P90、P95、最慘成本", () => {
  const result = simulateMonteCarlo(
    {
      equipmentType: "weapon5",
      equipmentPrice: 0,
      ownedEquipment: true,
      startGrade: "none",
      startRefine: 0,
      targetGrade: "none",
      targetRefine: 3,
      refineMaterialPolicy: "normalOnly",
      protectionPolicy: "never",
    },
    {},
    {
      ...DEFAULT_CONFIG.materials,
      etherOridecon: 1000,
    },
    { runs: 100, seed: "test" },
  );

  assert.equal(result.ok, true);
  assert.equal(result.runs, 100);
  assert.equal(result.average, 153000);
  assert.equal(result.median, 153000);
  assert.equal(result.p90, 153000);
  assert.equal(result.p95, 153000);
  assert.equal(result.worst, 153000);
});
