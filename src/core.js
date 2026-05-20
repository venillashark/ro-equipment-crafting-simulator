(function initROSimulator(globalScope) {
  "use strict";

  const GRADES = [
    { id: "none", label: "無階" },
    { id: "D", label: "D" },
    { id: "C", label: "C" },
    { id: "B", label: "B" },
    { id: "A", label: "A" },
  ];

  const MATERIALS = {
    etherStardust: "乙太星塵",
    blessedEtherStardust: "庇佑乙太星塵",
    etherStone: "乙太魔石",
    blessing: "鐵匠的祝福",
    oridecon: "神之金屬",
    elunium: "鋁",
    etherOridecon: "乙太神之金屬",
    concentratedOrideconBox: "濃縮神之金屬箱子",
    highConcentratedOrideconBox: "高濃縮神之金屬5入箱子",
    concentratedOridecon: "濃縮神之金屬",
    highConcentratedOridecon: "高濃縮神之金屬",
    concentratedEtherOridecon: "濃縮乙太神之金屬",
    etherElunium: "乙太鋁",
    concentratedEluniumBox: "濃縮鋁箱子",
    highConcentratedEluniumBox: "高濃縮鋁5入箱子",
    concentratedElunium: "濃縮鋁",
    highConcentratedElunium: "高濃縮鋁",
    concentratedEtherElunium: "濃縮乙太鋁",
    etherBradium: "乙太鈽鐳礦石",
    highConcentratedEtherOridecon: "高濃縮乙太神之金屬",
    highDensityEtherBradium: "高密度乙太鈽鐳礦石",
    etherCarnium: "乙太鈣礦石",
    highConcentratedEtherElunium: "高濃縮乙太鋁",
    highDensityEtherCarnium: "高密度乙太鈣礦石",
    azureGem: "乙太天藍寶石",
    yellowGem: "乙太黃寶石",
    purpleGem: "乙太紫寶石",
    amberGem: "乙太琥珀",
    npcAzureGem: "天藍寶石",
    npcYellowGem: "黃寶石",
    npcPurpleGem: "紫寶石",
    npcAmberGem: "琥珀",
  };

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
        "concentratedOrideconBox",
        "concentratedEtherOridecon",
        "etherBradium",
        "highConcentratedOrideconBox",
        "highConcentratedEtherOridecon",
        "highDensityEtherBradium",
      ],
    },
    {
      title: "二級防具精煉",
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
      title: "保護材料",
      keys: ["blessing"],
    },
  ];

  const DEFAULT_CONFIG = {
    materials: {
      etherStardust: 26298,
      blessedEtherStardust: 0,
      etherStone: 228884,
      blessing: 3304990,
      oridecon: 0,
      elunium: 0,
      etherOridecon: 0,
      concentratedOrideconBox: 0,
      highConcentratedOrideconBox: 0,
      concentratedEtherOridecon: 0,
      etherElunium: 0,
      concentratedEluniumBox: 0,
      highConcentratedEluniumBox: 0,
      concentratedEtherElunium: 0,
      etherBradium: 0,
      highConcentratedEtherOridecon: 0,
      highDensityEtherBradium: 0,
      etherCarnium: 0,
      highConcentratedEtherElunium: 0,
      highDensityEtherCarnium: 0,
      azureGem: 788800,
      yellowGem: 1422222,
      purpleGem: 2388888,
      amberGem: 3950000,
      npcAzureGem: 4560,
      npcYellowGem: 4560,
      npcPurpleGem: 4560,
      npcAmberGem: 3420,
    },
    commissionSettings: {
      profitRate: 15,
      riskBufferRate: 10,
      minimumFee: 1000000,
    },
  };

  const RECIPES = {
    etherOridecon: {
      label: "神之金屬 1 個 + 乙太星塵 1 個",
      ingredients: { oridecon: 1, etherStardust: 1 },
      fee: 0,
    },
    etherElunium: {
      label: "鋁 1 個 + 乙太星塵 1 個",
      ingredients: { elunium: 1, etherStardust: 1 },
      fee: 0,
    },
    concentratedOridecon: {
      label: "濃縮神之金屬箱子 1/10",
      ingredients: { concentratedOrideconBox: 0.1 },
      fee: 0,
    },
    highConcentratedOridecon: {
      label: "高濃縮神之金屬5入箱子 1/5",
      ingredients: { highConcentratedOrideconBox: 0.2 },
      fee: 0,
    },
    concentratedElunium: {
      label: "濃縮鋁箱子 1/10",
      ingredients: { concentratedEluniumBox: 0.1 },
      fee: 0,
    },
    highConcentratedElunium: {
      label: "高濃縮鋁5入箱子 1/5",
      ingredients: { highConcentratedEluniumBox: 0.2 },
      fee: 0,
    },
    concentratedEtherOridecon: {
      label: "乙太星塵 2 個 + 濃縮神之金屬 1 個 + 20,000 Zeny",
      ingredients: { etherStardust: 2, concentratedOridecon: 1 },
      fee: 20000,
    },
    highConcentratedEtherOridecon: {
      label: "乙太星塵 3 個 + 高濃縮神之金屬 1 個 + 50,000 Zeny",
      ingredients: { etherStardust: 3, highConcentratedOridecon: 1 },
      fee: 50000,
    },
    concentratedEtherElunium: {
      label: "乙太星塵 2 個 + 濃縮鋁 1 個 + 20,000 Zeny",
      ingredients: { etherStardust: 2, concentratedElunium: 1 },
      fee: 20000,
    },
    highConcentratedEtherElunium: {
      label: "乙太星塵 3 個 + 高濃縮鋁 1 個 + 50,000 Zeny",
      ingredients: { etherStardust: 3, highConcentratedElunium: 1 },
      fee: 50000,
    },
    etherStone: {
      label: "乙太星塵 5 個 + 100,000 Zeny",
      ingredients: { etherStardust: 5 },
      fee: 100000,
    },
    azureGem: {
      label: "乙太魔石 3 個 + 天藍寶石 1 個 + 100,000 Zeny",
      ingredients: { etherStone: 3, npcAzureGem: 1 },
      fee: 100000,
    },
    yellowGem: {
      label: "乙太魔石 6 個 + 黃寶石 1 個 + 200,000 Zeny",
      ingredients: { etherStone: 6, npcYellowGem: 1 },
      fee: 200000,
    },
    purpleGem: {
      label: "乙太魔石 10 個 + 紫寶石 1 個 + 300,000 Zeny",
      ingredients: { etherStone: 10, npcPurpleGem: 1 },
      fee: 300000,
    },
    amberGem: {
      label: "乙太魔石 15 個 + 琥珀 1 個 + 500,000 Zeny",
      ingredients: { etherStone: 15, npcAmberGem: 1 },
      fee: 500000,
    },
  };

  const GRADE_RULES = [
    {
      from: "none",
      to: "D",
      material: "azureGem",
      fee: 100000,
      protectedQty: 5,
      protectedFee: 500000,
      boostMaterial: "blessedEtherStardust",
      boostPerPercent: 1,
      attempts: [
        { refine: 9, rate: 0.1 },
        { refine: 10, rate: 0.2 },
        { refine: 11, rate: 0.7 },
      ],
    },
    {
      from: "D",
      to: "C",
      material: "yellowGem",
      fee: 125000,
      protectedQty: 5,
      protectedFee: 625000,
      boostMaterial: "blessedEtherStardust",
      boostPerPercent: 3,
      attempts: [
        { refine: 10, rate: 0.2 },
        { refine: 11, rate: 0.6 },
      ],
    },
    {
      from: "C",
      to: "B",
      material: "purpleGem",
      fee: 200000,
      protectedQty: 5,
      protectedFee: 1000000,
      boostMaterial: "blessedEtherStardust",
      boostPerPercent: 5,
      attempts: [{ refine: 11, rate: 0.5 }],
    },
    {
      from: "B",
      to: "A",
      material: "amberGem",
      fee: 500000,
      protectedQty: 10,
      protectedFee: 2500000,
      boostMaterial: "blessedEtherStardust",
      boostPerPercent: 7,
      attempts: [{ refine: 11, rate: 0.4 }],
      normalQty: 2,
    },
  ];

  const STORAGE_KEY = "ro-crafting-simulator-v1";
  const EPSILON = 0.01;

  function formatZeny(value) {
    if (!Number.isFinite(value)) return "無法計算";
    return `${Math.round(value).toLocaleString("zh-TW")} Z`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "-";
    return `${(value * 100).toFixed(value < 0.1 && value > 0 ? 1 : 0)}%`;
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function gradeIndex(gradeId) {
    return GRADES.findIndex((grade) => grade.id === gradeId);
  }

  function gradeLabel(gradeId) {
    return GRADES.find((grade) => grade.id === gradeId)?.label ?? gradeId;
  }

  function stateKey(state) {
    return `${state.grade}:${state.refine}`;
  }

  function parseState(key) {
    const [grade, refine] = key.split(":");
    return { grade, refine: Number(refine) };
  }

  function stateLabel(state) {
    return `${gradeLabel(state.grade)} +${state.refine}`;
  }

  function isAtGoal(state, target) {
    return state.grade === target.grade && state.refine >= target.refine;
  }

  function isFiniteCost(value) {
    return Number.isFinite(value) && value >= 0;
  }

  function resolveMaterialCost(prices, recipes = RECIPES) {
    const memo = {};

    function resolve(key, stack = new Set()) {
      if (memo[key]) return memo[key];
      if (stack.has(key)) {
        return { key, label: MATERIALS[key] ?? key, direct: Infinity, crafted: Infinity, best: Infinity, method: "循環配方" };
      }

      const directPrice = toNumber(prices[key], 0);
      const direct = directPrice > 0 ? directPrice : Infinity;
      const recipe = recipes[key];
      let crafted = Infinity;
      let recipeLabel = "";

      if (recipe) {
        stack.add(key);
        crafted = recipe.fee ?? 0;
        recipeLabel = recipe.label;
        for (const [ingredient, qty] of Object.entries(recipe.ingredients)) {
          const ingredientCost = resolve(ingredient, stack).best;
          crafted += ingredientCost * qty;
        }
        stack.delete(key);
      }

      const best = Math.min(direct, crafted);
      const method =
        !Number.isFinite(best)
          ? "未設定價格"
          : direct <= crafted
            ? "直接買"
            : "自行製作";

      memo[key] = {
        key,
        label: MATERIALS[key] ?? key,
        direct,
        crafted,
        best,
        method,
        recipeLabel,
      };
      return memo[key];
    }

    const keys = new Set([...Object.keys(MATERIALS), ...Object.keys(recipes)]);
    for (const key of keys) resolve(key);
    return memo;
  }

  function materialBundleCost(materialCosts, bundle) {
    let total = 0;
    const parts = [];
    const normalizedBundle = normalizeBundle(bundle);
    for (const [key, qty] of Object.entries(normalizedBundle)) {
      if (qty <= 0) continue;
      const unit = materialCosts[key]?.best;
      if (!Number.isFinite(unit)) return { total: Infinity, parts: [], bundle: normalizedBundle };
      total += unit * qty;
      parts.push(`${MATERIALS[key] ?? key} x${qty}`);
    }
    return { total, parts, bundle: normalizedBundle };
  }

  function normalizeBundle(bundle) {
    const normalized = {};
    for (const [key, qty] of Object.entries(bundle ?? {})) {
      const amount = toNumber(qty, 0);
      if (amount > 0) normalized[key] = (normalized[key] ?? 0) + amount;
    }
    return normalized;
  }

  function addBundle(target, bundle, multiplier = 1) {
    for (const [key, qty] of Object.entries(bundle ?? {})) {
      const amount = toNumber(qty, 0) * multiplier;
      if (amount === 0) continue;
      target[key] = (target[key] ?? 0) + amount;
      if (Math.abs(target[key]) < EPSILON) delete target[key];
    }
    return target;
  }

  function refineFee(equipmentType, fromRefine) {
    if (equipmentType === "weapon5") return fromRefine < 10 ? 50000 : 100000;
    return fromRefine < 10 ? 30000 : 75000;
  }

  function refineMaterials(equipmentType, fromRefine) {
    const weapon = equipmentType === "weapon5";
    if (fromRefine < 10) {
      return {
        normal: weapon ? "etherOridecon" : "etherElunium",
        advanced: weapon ? "concentratedEtherOridecon" : "concentratedEtherElunium",
      };
    }
    if (fromRefine < 15) {
      return {
        normal: weapon ? "etherBradium" : "etherCarnium",
        advanced: weapon ? "highConcentratedEtherOridecon" : "highConcentratedEtherElunium",
      };
    }
    return {
      normal: weapon ? "etherBradium" : "etherCarnium",
      advanced: weapon ? "highDensityEtherBradium" : "highDensityEtherCarnium",
    };
  }

  function refineRates(fromRefine) {
    if (fromRefine <= 2) return { normal: 1, advanced: null, fail: "none" };
    if (fromRefine === 3) return { normal: 0.6, advanced: 0.9, fail: "drop" };
    if (fromRefine === 4) return { normal: 0.6, advanced: 0.7, fail: "drop" };
    if (fromRefine === 5 || fromRefine === 6) return { normal: 0.4, advanced: 0.6, fail: "drop" };
    if (fromRefine === 7 || fromRefine === 8) return { normal: 0.2, advanced: 0.4, fail: "drop" };
    if (fromRefine === 9) return { normal: 0.09, advanced: 0.2, fail: "drop" };
    if (fromRefine >= 10 && fromRefine <= 13) return { normal: 0.08, advanced: 0.15, fail: "break" };
    if (fromRefine === 14) return { normal: 0.07, advanced: 0.1, fail: "break" };
    if (fromRefine >= 15 && fromRefine <= 17) return { normal: 0.07, advanced: 0.1, fail: "break" };
    if (fromRefine >= 18 && fromRefine <= 19) return { normal: 0.05, advanced: 0.07, fail: "break" };
    return null;
  }

  function blessingQty(fromRefine) {
    return { 7: 1, 8: 2, 9: 3, 10: 4, 11: 4, 12: 9, 13: 15 }[fromRefine] ?? 0;
  }

  function maxRefineForState(grade, target) {
    if (grade === target.grade) return target.refine;
    return 11;
  }

  function buildRefineActions(state, context) {
    const maxRefine = maxRefineForState(state.grade, context.target);
    if (state.refine >= maxRefine || state.refine >= 20) return [];

    const rates = refineRates(state.refine);
    if (!rates) return [];

    const materials = refineMaterials(context.input.equipmentType, state.refine);
    const highRefineOnly = state.refine >= 10;
    const options = [];
    if (!highRefineOnly) {
      options.push({ kind: "normal", material: materials.normal, rate: rates.normal, name: "一般乙太材料" });
    }
    if (rates.advanced) {
      options.push({ kind: "advanced", material: materials.advanced, rate: rates.advanced, name: "濃縮/高階乙太材料" });
    }

    const actions = [];
    const protectQty = blessingQty(state.refine);
    const fee = refineFee(context.input.equipmentType, state.refine);
    const materialPolicy = context.input.refineMaterialPolicy ?? "auto";
    const protectionPolicy = context.input.protectionPolicy ?? "auto";
    const filteredOptions = options.filter((option) => {
      if (highRefineOnly) return true;
      if (materialPolicy === "normalOnly") return option.kind === "normal";
      if (materialPolicy === "advancedOnly") return option.kind === "advanced" || !rates.advanced;
      return true;
    });

    for (const option of filteredOptions) {
      const base = materialBundleCost(context.materialCosts, { [option.material]: 1 });
      if (!Number.isFinite(base.total)) continue;
      const failState = refineFailState(state, rates.fail, option.kind);
      if (protectionPolicy !== "always" || protectQty === 0) {
        actions.push({
          type: "refine",
          materialKind: option.kind,
          protected: false,
          optionName: option.name,
          label: `${option.name}：${stateLabel(state)} -> ${gradeLabel(state.grade)} +${state.refine + 1}`,
          from: state,
          success: { grade: state.grade, refine: state.refine + 1 },
          fail: failState,
          rate: option.rate,
          cost: base.total + fee,
          materials: base.parts,
          materialBundle: base.bundle,
          zenyFee: fee,
          actionZenyFee: fee,
          consumption: { materials: base.bundle, zenyFee: fee },
          breaks: failState === "break",
        });
      }

      if (protectQty > 0 && protectionPolicy !== "never") {
        const protectedCost = materialBundleCost(context.materialCosts, {
          [option.material]: 1,
          blessing: protectQty,
        });
        if (!Number.isFinite(protectedCost.total)) continue;
        actions.push({
          type: "refine",
          materialKind: option.kind,
          protected: true,
          optionName: `${option.name} + 祝福`,
          label: `${option.name} + 祝福：${stateLabel(state)} -> ${gradeLabel(state.grade)} +${state.refine + 1}`,
          from: state,
          success: { grade: state.grade, refine: state.refine + 1 },
          fail: state,
          rate: option.rate,
          cost: protectedCost.total + fee,
          materials: protectedCost.parts,
          materialBundle: protectedCost.bundle,
          zenyFee: fee,
          actionZenyFee: fee,
          consumption: { materials: protectedCost.bundle, zenyFee: fee },
          breaks: false,
        });
      }
    }

    return actions;
  }

  function refineFailState(state, failType, materialKind) {
    if (failType === "none") return state;
    if (failType === "break") return "break";
    const drop = materialKind === "advanced" ? 1 : 3;
    return { grade: state.grade, refine: Math.max(0, state.refine - drop) };
  }

  function buildGradeActions(state, context) {
    const rule = GRADE_RULES.find((item) => item.from === state.grade);
    if (!rule || gradeIndex(rule.to) > gradeIndex(context.target.grade)) return [];

    const attempt = rule.attempts.find((item) => item.refine === state.refine);
    if (!attempt) return [];

    const actions = [];
    const normalQty = rule.normalQty ?? 1;
    const maxBoost = Math.max(0, Math.round((1 - attempt.rate) * 100));
    const boostSteps = Array.from({ length: maxBoost + 1 }, (_, index) => index);

    for (const isProtected of [false, true]) {
      const materialQty = isProtected ? rule.protectedQty : normalQty;
      const baseFee = isProtected ? rule.protectedFee : rule.fee;
      for (const boostPercent of boostSteps) {
        const rate = Math.min(1, attempt.rate + boostPercent / 100);
        const bundle = {
          [rule.material]: materialQty,
          [rule.boostMaterial]: boostPercent * rule.boostPerPercent,
        };
        const material = materialBundleCost(context.materialCosts, bundle);
        if (!Number.isFinite(material.total)) continue;
        const boostText = boostPercent > 0 ? `，庇佑 +${boostPercent}%` : "";
        actions.push({
          type: "grade",
          label: `${isProtected ? "保護升階" : "一般升階"}：${stateLabel(state)} -> ${gradeLabel(rule.to)} +0${boostText}`,
          from: state,
          success: { grade: rule.to, refine: 0 },
          fail: isProtected ? state : "break",
          rate,
          cost: material.total + baseFee,
          materials: material.parts,
          materialBundle: material.bundle,
          zenyFee: baseFee,
          actionZenyFee: baseFee,
          consumption: { materials: material.bundle, zenyFee: baseFee },
          breaks: !isProtected,
        });
      }
    }

    return actions;
  }

  function buildActions(state, context) {
    return [...buildRefineActions(state, context), ...buildGradeActions(state, context)];
  }

  function enumerateStates(start, target) {
    const states = [];
    for (const grade of GRADES) {
      if (gradeIndex(grade.id) < gradeIndex(start.grade) || gradeIndex(grade.id) > gradeIndex(target.grade)) continue;
      const maxRefine = grade.id === target.grade ? target.refine : 11;
      for (let refine = 0; refine <= Math.min(20, Math.max(0, maxRefine)); refine += 1) {
        states.push({ grade: grade.id, refine });
      }
    }
    return states;
  }

  function findBestRoute(input, rules = {}, prices = DEFAULT_CONFIG.materials) {
    const start = { grade: input.startGrade, refine: clampRefine(input.startRefine) };
    const target = { grade: input.targetGrade, refine: clampRefine(input.targetRefine) };
    if (gradeIndex(start.grade) < 0 || gradeIndex(target.grade) < 0) {
      return { ok: false, error: "階級設定不正確。" };
    }
    if (gradeIndex(start.grade) > gradeIndex(target.grade)) {
      return { ok: false, error: "起始階級高於目標階級，第一版不支援降階規劃。" };
    }
    if (start.grade === target.grade && start.refine > target.refine) {
      return { ok: false, error: "起始精煉高於目標精煉，已經達成或超過第一版可規劃範圍。" };
    }

    const materialCosts = resolveMaterialCost(prices, rules.recipes ?? RECIPES);
    const states = enumerateStates(start, target);
    const keys = states.map(stateKey);
    const startKey = stateKey(start);
    const targetKey = stateKey(target);
    const replacementCost = toNumber(input.equipmentPrice, 0);
    const initialEquipmentCost = input.ownedEquipment ? 0 : replacementCost;
    const context = { input, target, materialCosts };
    const actionsByKey = {};

    for (const state of states) {
      actionsByKey[stateKey(state)] = buildActions(state, context);
    }

    const solved = solveOptimalPolicy(states, target, actionsByKey, startKey, replacementCost);
    let values = solved.values;
    let policy = solved.policy;

    const expectedCost = values[startKey];
    if (!Number.isFinite(expectedCost)) {
      return {
        ok: false,
        error: "目前價格無法找到完整路線。請至少填入目標會用到的精煉材料、升階材料與保護材料價格。",
        materialCosts,
      };
    }

    const steps = extractSuccessPath(start, target, policy, values, startKey, replacementCost);
    const risk = estimatePolicyRisk(states, start, target, policy, startKey);
    const expectedConsumption = evaluatePolicyConsumption(states, target, policy, startKey, replacementCost);
    return {
      ok: true,
      start,
      target,
      expectedCost: expectedCost + initialEquipmentCost,
      routeExpectedCost: expectedCost,
      initialEquipmentCost,
      replacementCost,
      materialCosts,
      expectedConsumption,
      steps,
      refineComparisons: buildRefineComparisons(steps, actionsByKey, policy, values, startKey, replacementCost),
      risk,
      _policy: policy,
      _actionsByKey: actionsByKey,
    };
  }

  function simulateMonteCarlo(input, rules = {}, prices = DEFAULT_CONFIG.materials, options = {}) {
    const route = findBestRoute(input, rules, prices);
    if (!route.ok) return { ok: false, error: route.error, route };

    const runs = Math.max(1, Math.min(200000, Math.trunc(toNumber(options.runs, 10000))));
    const maxAttempts = Math.max(1000, Math.trunc(toNumber(options.maxAttempts, 200000)));
    const rng = createSeededRandom(options.seed ?? Date.now());
    const costs = [];
    const attempts = [];
    const breakCounts = [];
    const materialSamples = {};
    const zenyFeeSamples = [];
    const replacementCostSamples = [];
    let truncated = 0;

    for (let run = 0; run < runs; run += 1) {
      let state = { ...route.start };
      let totalCost = route.initialEquipmentCost;
      let attemptCount = 0;
      let breaks = 0;
      let runZenyFee = 0;
      let runReplacementCost = 0;
      const runMaterials = {};

      while (!isAtGoal(state, route.target) && attemptCount < maxAttempts) {
        const key = stateKey(state);
        const action = route._policy[key];
        if (!action) {
          truncated += 1;
          break;
        }
        totalCost += action.cost;
        runZenyFee += action.zenyFee ?? 0;
        addBundle(runMaterials, action.materialBundle);
        attemptCount += 1;

        if (rng() < action.rate) {
          state = { ...action.success };
        } else if (action.fail === "break") {
          totalCost += route.replacementCost;
          runReplacementCost += route.replacementCost;
          breaks += 1;
          state = { ...route.start };
        } else {
          state = { ...action.fail };
        }
      }

      if (!isAtGoal(state, route.target)) truncated += 1;
      costs.push(totalCost);
      attempts.push(attemptCount);
      breakCounts.push(breaks);
      zenyFeeSamples.push(runZenyFee);
      replacementCostSamples.push(runReplacementCost);
      recordMaterialSamples(materialSamples, runMaterials, run);
    }

    costs.sort((a, b) => a - b);
    attempts.sort((a, b) => a - b);
    breakCounts.sort((a, b) => a - b);

    return {
      ok: true,
      runs,
      seed: String(options.seed ?? "random"),
      route,
      average: average(costs),
      median: percentile(costs, 0.5),
      p90: percentile(costs, 0.9),
      p95: percentile(costs, 0.95),
      worst: costs[costs.length - 1],
      best: costs[0],
      averageAttempts: average(attempts),
      medianAttempts: percentile(attempts, 0.5),
      averageBreaks: average(breakCounts),
      p95Breaks: percentile(breakCounts, 0.95),
      materialUsage: summarizeMaterialSamples(materialSamples),
      zenyUsage: summarizeSamples(zenyFeeSamples),
      replacementUsage: summarizeSamples(replacementCostSamples),
      truncated,
      histogram: buildHistogram(costs, 22),
    };
  }

  function recordMaterialSamples(samplesByKey, runMaterials, runIndex) {
    for (const key of Object.keys(samplesByKey)) {
      samplesByKey[key].push(runMaterials[key] ?? 0);
    }
    for (const [key, qty] of Object.entries(runMaterials)) {
      if (samplesByKey[key]) continue;
      samplesByKey[key] = Array(runIndex).fill(0);
      samplesByKey[key].push(qty);
    }
  }

  function summarizeMaterialSamples(samplesByKey) {
    const usage = {};
    for (const [key, samples] of Object.entries(samplesByKey)) {
      usage[key] = summarizeSamples(samples);
    }
    return usage;
  }

  function summarizeSamples(samples) {
    if (!samples.length) return { average: 0, p90: 0, p95: 0, max: 0 };
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      average: average(sorted),
      p90: percentile(sorted, 0.9),
      p95: percentile(sorted, 0.95),
      max: sorted[sorted.length - 1],
    };
  }

  function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function percentile(values, pct) {
    if (!values.length) return 0;
    const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * pct) - 1));
    return values[index];
  }

  function buildHistogram(values, bucketCount) {
    if (!values.length) return [];
    const min = values[0];
    const max = values[values.length - 1];
    if (min === max) return [{ min, max, count: values.length, ratio: 1 }];
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const start = min + ((max - min) * index) / bucketCount;
      const end = min + ((max - min) * (index + 1)) / bucketCount;
      return { min: start, max: end, count: 0, ratio: 0 };
    });
    for (const value of values) {
      const raw = Math.floor(((value - min) / (max - min)) * bucketCount);
      const index = Math.min(bucketCount - 1, Math.max(0, raw));
      buckets[index].count += 1;
    }
    const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
    return buckets.map((bucket) => ({ ...bucket, ratio: bucket.count / maxCount }));
  }

  function createSeededRandom(seedValue) {
    let hash = 2166136261;
    const seedText = String(seedValue);
    for (let index = 0; index < seedText.length; index += 1) {
      hash ^= seedText.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return function random() {
      hash += 0x6d2b79f5;
      let value = hash;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function solveOptimalPolicy(states, target, actionsByKey, startKey, replacementCost) {
    const policy = {};
    for (const state of states) {
      const key = stateKey(state);
      if (isAtGoal(state, target)) continue;
      const actions = actionsByKey[key] ?? [];
      policy[key] = chooseInitialPolicyAction(actions);
    }

    let values = {};
    for (let iteration = 0; iteration < 80; iteration += 1) {
      values = evaluatePolicy(states, target, policy, startKey, replacementCost, "cost");
      let changed = false;
      for (const state of states) {
        if (isAtGoal(state, target)) continue;
        const key = stateKey(state);
        let bestAction = policy[key];
        let bestValue = bestAction ? actionExpectedValue(bestAction, values, key, startKey, replacementCost) : Infinity;
        for (const action of actionsByKey[key] ?? []) {
          const candidate = actionExpectedValue(action, values, key, startKey, replacementCost);
          if (candidate + EPSILON < bestValue) {
            bestValue = candidate;
            bestAction = action;
            changed = true;
          }
        }
        policy[key] = bestAction;
      }
      if (!changed) break;
    }

    values = evaluatePolicy(states, target, policy, startKey, replacementCost, "cost");
    return { values, policy };
  }

  function chooseInitialPolicyAction(actions) {
    return actions.reduce((best, action) => {
      if (!best) return action;
      if (action.breaks !== best.breaks) return action.breaks ? best : action;
      if (action.protected !== best.protected) return action.protected ? action : best;
      if (action.rate !== best.rate) return action.rate > best.rate ? action : best;
      return action.cost < best.cost ? action : best;
    }, null);
  }

  function evaluatePolicy(states, target, policy, startKey, replacementCost, metric) {
    const activeStates = states.filter((state) => !isAtGoal(state, target) && policy[stateKey(state)]);
    const indexByKey = new Map(activeStates.map((state, index) => [stateKey(state), index]));
    const size = activeStates.length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));
    const rhs = Array(size).fill(0);

    for (const state of activeStates) {
      const key = stateKey(state);
      const row = indexByKey.get(key);
      const action = policy[key];
      matrix[row][row] = 1;
      rhs[row] = metric === "breaks" ? 0 : action.cost;
      addTransition(matrix[row], indexByKey, action.success, -action.rate);
      if (action.fail === "break") {
        addTransition(matrix[row], indexByKey, parseState(startKey), -(1 - action.rate));
        rhs[row] += metric === "breaks" ? 1 - action.rate : (1 - action.rate) * replacementCost;
      } else {
        addTransition(matrix[row], indexByKey, action.fail, -(1 - action.rate));
      }
    }

    const solution = solveLinearSystem(matrix, rhs);
    const values = {};
    for (const state of states) values[stateKey(state)] = isAtGoal(state, target) ? 0 : Infinity;
    for (const [key, index] of indexByKey.entries()) values[key] = solution[index];
    return values;
  }

  function evaluatePolicyConsumption(states, target, policy, startKey, replacementCost) {
    const materialKeys = new Set();
    for (const state of states) {
      if (isAtGoal(state, target)) continue;
      const action = policy[stateKey(state)];
      for (const key of Object.keys(action?.materialBundle ?? {})) materialKeys.add(key);
    }

    const materials = {};
    for (const key of materialKeys) {
      const values = evaluatePolicyScalar(states, target, policy, startKey, (action) => action.materialBundle?.[key] ?? 0);
      const expected = values[startKey] ?? 0;
      if (Number.isFinite(expected) && Math.abs(expected) > EPSILON) materials[key] = expected;
    }

    const zenyFeeValues = evaluatePolicyScalar(states, target, policy, startKey, (action) => action.zenyFee ?? 0);
    const replacementValues = evaluatePolicyScalar(
      states,
      target,
      policy,
      startKey,
      (action) => (action.fail === "break" ? (1 - action.rate) * replacementCost : 0),
    );

    return {
      materials,
      zenyFee: zenyFeeValues[startKey] ?? 0,
      replacementCost: replacementValues[startKey] ?? 0,
    };
  }

  function evaluatePolicyScalar(states, target, policy, startKey, immediateValue) {
    const activeStates = states.filter((state) => !isAtGoal(state, target) && policy[stateKey(state)]);
    const indexByKey = new Map(activeStates.map((state, index) => [stateKey(state), index]));
    const size = activeStates.length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));
    const rhs = Array(size).fill(0);

    for (const state of activeStates) {
      const key = stateKey(state);
      const row = indexByKey.get(key);
      const action = policy[key];
      matrix[row][row] = 1;
      rhs[row] = immediateValue(action, state);
      addTransition(matrix[row], indexByKey, action.success, -action.rate);
      if (action.fail === "break") {
        addTransition(matrix[row], indexByKey, parseState(startKey), -(1 - action.rate));
      } else {
        addTransition(matrix[row], indexByKey, action.fail, -(1 - action.rate));
      }
    }

    const solution = solveLinearSystem(matrix, rhs);
    const values = {};
    for (const state of states) values[stateKey(state)] = isAtGoal(state, target) ? 0 : Infinity;
    for (const [key, index] of indexByKey.entries()) values[key] = solution[index];
    return values;
  }

  function addTransition(row, indexByKey, state, coefficient) {
    const key = stateKey(state);
    const index = indexByKey.get(key);
    if (index !== undefined) row[index] += coefficient;
  }

  function solveLinearSystem(matrix, rhs) {
    const size = rhs.length;
    const augmented = matrix.map((row, index) => [...row, rhs[index]]);

    for (let col = 0; col < size; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < size; row += 1) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
      }
      if (Math.abs(augmented[pivot][col]) < 1e-10) return Array(size).fill(Infinity);
      if (pivot !== col) [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];

      const divisor = augmented[col][col];
      for (let j = col; j <= size; j += 1) augmented[col][j] /= divisor;

      for (let row = 0; row < size; row += 1) {
        if (row === col) continue;
        const factor = augmented[row][col];
        if (Math.abs(factor) < 1e-12) continue;
        for (let j = col; j <= size; j += 1) augmented[row][j] -= factor * augmented[col][j];
      }
    }

    return augmented.map((row) => row[size]);
  }

  function actionExpectedValue(action, values, currentKey, startKey, replacementCost) {
    const successKey = stateKey(action.success);
    const successValue = values[successKey] ?? Infinity;
    if (!Number.isFinite(successValue)) return Infinity;

    const failValue = failOutcomeValue(action.fail, values, currentKey, startKey, replacementCost);
    if (!Number.isFinite(failValue)) return Infinity;

    if (action.fail !== "break" && stateKey(action.fail) === currentKey) {
      return (action.cost + action.rate * successValue) / action.rate;
    }

    return action.cost + action.rate * successValue + (1 - action.rate) * failValue;
  }

  function failOutcomeValue(fail, values, currentKey, startKey, replacementCost) {
    if (fail === "break") {
      const startValue = values[startKey];
      return Number.isFinite(startValue) ? replacementCost + startValue : Infinity;
    }
    const failKey = stateKey(fail);
    if (failKey === currentKey) return values[currentKey] ?? Infinity;
    return values[failKey] ?? Infinity;
  }

  function extractSuccessPath(start, target, policy, values, startKey, replacementCost) {
    const steps = [];
    let current = start;
    const seen = new Set();

    for (let index = 0; index < 80; index += 1) {
      if (isAtGoal(current, target)) break;
      const key = stateKey(current);
      if (seen.has(key)) break;
      seen.add(key);
      const action = policy[key];
      if (!action) break;
      steps.push({
        index: steps.length + 1,
        type: action.type,
        materialKind: action.materialKind,
        protected: action.protected,
        label: action.label,
        from: current,
        success: action.success,
        fail: action.fail,
        rate: action.rate,
        cost: action.cost,
        remainingExpectedCost: values[key],
        materials: action.materials,
        materialBundle: action.materialBundle,
        zenyFee: action.zenyFee,
        actionZenyFee: action.actionZenyFee,
        consumption: action.consumption,
        breaks: action.breaks,
        failText: failText(action.fail, current),
      });
      current = action.success;
    }
    return steps;
  }

  function buildRefineComparisons(steps, actionsByKey, policy, values, startKey, replacementCost) {
    const rows = [];
    const seen = new Set();
    for (const step of steps) {
      const key = stateKey(step.from);
      if (seen.has(key)) continue;
      seen.add(key);
      const actions = (actionsByKey[key] ?? []).filter((action) => action.type === "refine");
      if (actions.length <= 1) continue;
      const bestAction = policy[key];
      for (const action of actions) {
        const expected = actionExpectedValue(action, values, key, startKey, replacementCost);
        rows.push({
          state: stateLabel(action.from),
          to: stateLabel(action.success),
          option: action.optionName,
          rate: action.rate,
          cost: action.cost,
          expected,
          failText: failText(action.fail, action.from),
          chosen: action === bestAction,
        });
      }
    }
    return rows;
  }

  function failText(fail, current) {
    if (fail === "break") return "失敗：裝備消失，重新取得裝備後從起點再來";
    if (stateKey(fail) === stateKey(current)) return "失敗：狀態不變";
    return `失敗：退回 ${stateLabel(fail)}`;
  }

  function estimatePolicyRisk(states, start, target, policy, startKey) {
    const breakCounts = evaluatePolicy(states, target, policy, startKey, 0, "breaks");
    let passNoBreak = 1;
    let current = start;
    const seen = new Set();
    for (let index = 0; index < 80; index += 1) {
      if (isAtGoal(current, target)) break;
      const key = stateKey(current);
      if (seen.has(key) || !policy[key]) break;
      seen.add(key);
      const action = policy[key];
      if (action.breaks) passNoBreak *= action.rate;
      current = action.success;
    }

    const expectedBreaks = breakCounts[startKey] ?? 0;
    return {
      expectedBreaks,
      singlePassBreakRisk: 1 - passNoBreak,
      hasBreakRisk: expectedBreaks > 0.0001,
    };
  }

  function quoteCommission(routeResult, settings) {
    if (!routeResult?.ok) {
      return { ok: false, error: "沒有可報價的路線。" };
    }
    const base = routeResult.expectedCost;
    const profit = base * (toNumber(settings.profitRate, 0) / 100);
    const riskBuffer = base * (toNumber(settings.riskBufferRate, 0) / 100);
    const minimumFee = toNumber(settings.minimumFee, 0);
    const low = base + minimumFee;
    const suggested = base + profit + riskBuffer + minimumFee;
    const conservative = suggested + Math.max(riskBuffer, routeResult.replacementCost * Math.max(routeResult.risk.expectedBreaks, 0));
    return {
      ok: true,
      base,
      profit,
      riskBuffer,
      minimumFee,
      low,
      suggested,
      conservative,
    };
  }

  function clampRefine(value) {
    return Math.max(0, Math.min(20, Math.trunc(toNumber(value, 0))));
  }

  function loadState() {
    try {
      const raw = globalScope.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_CONFIG);
      return mergeConfig(clone(DEFAULT_CONFIG), JSON.parse(raw));
    } catch (_error) {
      return clone(DEFAULT_CONFIG);
    }
  }

  function mergeConfig(base, saved) {
    return {
      materials: { ...base.materials, ...(saved.materials ?? {}) },
      commissionSettings: { ...base.commissionSettings, ...(saved.commissionSettings ?? {}) },
      target: { ...(saved.target ?? {}) },
    };
  }

  function saveState(config) {
    globalScope.localStorage?.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function initApp() {
    const doc = globalScope.document;
    if (!doc) return;

    const config = loadState();
    fillGradeSelect(doc.getElementById("startGrade"), config.target?.startGrade ?? "none");
    fillGradeSelect(doc.getElementById("targetGrade"), config.target?.targetGrade ?? "none");
    doc.getElementById("equipmentType").value = config.target?.equipmentType ?? "weapon5";
    doc.getElementById("equipmentPrice").value = config.target?.equipmentPrice ?? 0;
    doc.getElementById("ownedEquipment").checked = config.target?.ownedEquipment ?? true;
    doc.getElementById("startRefine").value = config.target?.startRefine ?? 0;
    doc.getElementById("targetRefine").value = config.target?.targetRefine ?? 10;
    doc.getElementById("refineMaterialPolicy").value = config.target?.refineMaterialPolicy ?? "auto";
    doc.getElementById("protectionPolicy").value = config.target?.protectionPolicy ?? "auto";
    doc.getElementById("profitRate").value = config.commissionSettings.profitRate;
    doc.getElementById("riskBufferRate").value = config.commissionSettings.riskBufferRate;
    doc.getElementById("minimumFee").value = config.commissionSettings.minimumFee;
    renderPriceEditor(config);

    doc.getElementById("resetDefaults").addEventListener("click", () => {
      const reset = clone(DEFAULT_CONFIG);
      globalScope.localStorage?.removeItem(STORAGE_KEY);
      for (const [key, value] of Object.entries(reset.materials)) {
        const input = doc.querySelector(`[data-price-key="${key}"]`);
        if (input) input.value = value || "";
      }
      doc.getElementById("profitRate").value = reset.commissionSettings.profitRate;
      doc.getElementById("riskBufferRate").value = reset.commissionSettings.riskBufferRate;
      doc.getElementById("minimumFee").value = reset.commissionSettings.minimumFee;
      doc.getElementById("refineMaterialPolicy").value = "auto";
      doc.getElementById("protectionPolicy").value = "auto";
      recalculate();
    });

    doc.addEventListener("input", recalculate);
    doc.addEventListener("change", recalculate);
    recalculate();
  }

  function fillGradeSelect(select, selected) {
    select.innerHTML = GRADES.map(
      (grade) => `<option value="${grade.id}" ${grade.id === selected ? "selected" : ""}>${grade.label}</option>`,
    ).join("");
  }

  function renderPriceEditor(config) {
    const root = document.getElementById("priceEditor");
    root.innerHTML = PRICE_SECTIONS.map((section) => {
      const fields = section.keys.map((key) => {
        const value = toNumber(config.materials[key], 0);
        return `
          <label>
            ${MATERIALS[key] ?? key}
            <input data-price-key="${key}" type="number" min="0" step="1" value="${value || ""}" placeholder="0" />
          </label>
        `;
      }).join("");
      return `
        <div class="price-section">
          <h3>${section.title}</h3>
          <div class="price-grid">${fields}</div>
        </div>
      `;
    }).join("");
  }

  function collectInput() {
    const prices = {};
    document.querySelectorAll("[data-price-key]").forEach((input) => {
      prices[input.dataset.priceKey] = toNumber(input.value, 0);
    });
    const target = {
      equipmentType: document.getElementById("equipmentType").value,
      equipmentPrice: toNumber(document.getElementById("equipmentPrice").value, 0),
      ownedEquipment: document.getElementById("ownedEquipment").checked,
      startGrade: document.getElementById("startGrade").value,
      startRefine: clampRefine(document.getElementById("startRefine").value),
      targetGrade: document.getElementById("targetGrade").value,
      targetRefine: clampRefine(document.getElementById("targetRefine").value),
      refineMaterialPolicy: document.getElementById("refineMaterialPolicy").value,
      protectionPolicy: document.getElementById("protectionPolicy").value,
    };
    const commissionSettings = {
      profitRate: toNumber(document.getElementById("profitRate").value, 0),
      riskBufferRate: toNumber(document.getElementById("riskBufferRate").value, 0),
      minimumFee: toNumber(document.getElementById("minimumFee").value, 0),
    };
    return { prices, target, commissionSettings };
  }

  function recalculate() {
    const { prices, target, commissionSettings } = collectInput();
    const config = { materials: prices, target, commissionSettings };
    saveState(config);
    document.getElementById("saveState").textContent = "已自動保存";

    const route = findBestRoute(target, { recipes: RECIPES }, prices);
    renderMaterials(resolveMaterialCost(prices, RECIPES));
    renderRoute(route);
    renderQuote(quoteCommission(route, commissionSettings), route);
  }

  function renderMaterials(costs) {
    const rows = ["etherOridecon", "etherElunium", "etherStone", "azureGem", "yellowGem", "purpleGem", "amberGem"]
      .map((key) => {
        const cost = costs[key];
        return `
          <tr>
            <td>${cost.label}</td>
            <td>${cost.recipeLabel || "無配方"}</td>
            <td class="number">${formatZeny(cost.direct)}</td>
            <td class="number">${formatZeny(cost.crafted)}</td>
            <td>${cost.method}</td>
            <td class="number"><strong>${formatZeny(cost.best)}</strong></td>
          </tr>
        `;
      })
      .join("");
    document.getElementById("materialOutput").innerHTML = `
      <table>
        <thead>
          <tr>
            <th>材料</th>
            <th>製作公式</th>
            <th class="number">直接買</th>
            <th class="number">自行製作</th>
            <th>建議</th>
            <th class="number">採用成本</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderRoute(route) {
    const summary = document.getElementById("summaryOutput");
    const compareOutput = document.getElementById("refineCompareOutput");
    const routeOutput = document.getElementById("routeOutput");
    if (!route.ok) {
      summary.innerHTML = "";
      compareOutput.innerHTML = "";
      routeOutput.innerHTML = `<div class="warning-box">${route.error}</div>`;
      return;
    }

    summary.innerHTML = `
      <div class="metric"><span>計算方式</span><strong>理論期望值</strong></div>
      <div class="metric"><span>總期望成本</span><strong>${formatZeny(route.expectedCost)}</strong></div>
      <div class="metric"><span>成功路徑階段</span><strong>${route.steps.length} 步</strong></div>
      <div class="metric"><span>期望爆裝次數</span><strong>${route.risk.expectedBreaks.toFixed(2)}</strong></div>
      <div class="metric"><span>成功路徑單輪爆裝風險</span><strong>${formatPercent(route.risk.singlePassBreakRisk)}</strong></div>
    `;
    renderRefineComparisons(route.refineComparisons ?? []);

    if (route.steps.length === 0) {
      routeOutput.innerHTML = `<div class="empty-state">目前狀態已達成目標。</div>`;
      return;
    }

    const warnings = routeWarnings(route);
    routeOutput.innerHTML = `${warnings}${route.steps
      .map((step) => {
        const materialText = step.materials.length > 0 ? step.materials.join("、") : "無";
        return `
          <article class="route-step">
            <div class="step-index">${step.index}</div>
            <div>
              <h3>${step.label}</h3>
              <p>成功率：<strong>${formatPercent(step.rate)}</strong>，單次成本：<strong>${formatZeny(step.cost)}</strong></p>
              <p>材料：${materialText}；手續費：${formatZeny(step.zenyFee)}</p>
              <p class="${step.breaks ? "risk" : "ok"}">${step.failText}</p>
            </div>
            <div class="metric">
              <span>此狀態剩餘期望成本</span>
              <strong>${formatZeny(step.remainingExpectedCost)}</strong>
            </div>
          </article>
        `;
      })
      .join("")}`;
  }

  function routeWarnings(route) {
    const warnings = [];
    if (route.risk.hasBreakRisk && route.replacementCost <= 0) {
      warnings.push("裝備基礎價格目前是 0；有爆裝風險的路線會被低估，請填入重新取得一件裝備的成本。");
    }
    if (gradeIndex(route.target.grade) > gradeIndex(route.start.grade) && !Number.isFinite(route.materialCosts.blessedEtherStardust?.best)) {
      warnings.push("庇佑乙太星塵未填價格；升階加成不會被納入比較。");
    }
    return warnings.map((text) => `<div class="warning-box">${text}</div>`).join("");
  }

  function renderRefineComparisons(rows) {
    const root = document.getElementById("refineCompareOutput");
    if (!rows.length) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML = `
      <div class="compare-header">
        <div>
          <p class="section-kicker">精煉材料比較</p>
          <h3>一般 / 濃縮 / 祝福哪個比較省</h3>
        </div>
        <p class="hint">以目前價格和後續路線計算；標記為採用的是最低期望成本選項。</p>
      </div>
      <div class="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>階段</th>
              <th>選項</th>
              <th class="number">成功率</th>
              <th class="number">單次成本</th>
              <th>失敗結果</th>
              <th class="number">選此項的剩餘期望成本</th>
              <th>判斷</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr class="${row.chosen ? "chosen-row" : ""}">
                    <td>${row.state} -> ${row.to}</td>
                    <td>${row.option}</td>
                    <td class="number">${formatPercent(row.rate)}</td>
                    <td class="number">${formatZeny(row.cost)}</td>
                    <td>${row.failText}</td>
                    <td class="number">${formatZeny(row.expected)}</td>
                    <td>${row.chosen ? "<strong>採用</strong>" : "比較用"}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderQuote(quote, route) {
    const root = document.getElementById("quoteOutput");
    if (!quote.ok) {
      root.innerHTML = `<div class="warning-box">${quote.error}</div>`;
      return;
    }
    root.innerHTML = `
      <div class="metric"><span>低標</span><strong>${formatZeny(quote.low)}</strong></div>
      <div class="metric"><span>建議收費</span><strong>${formatZeny(quote.suggested)}</strong></div>
      <div class="metric"><span>保守報價</span><strong>${formatZeny(quote.conservative)}</strong></div>
    `;
    if (route?.ok && route.risk.hasBreakRisk) {
      root.insertAdjacentHTML(
        "beforeend",
        `<div class="warning-box">此路線有爆裝風險；建議報價已加入風險緩衝，但高價裝備可考慮改用更保守的保護策略人工比較。</div>`,
      );
    }
  }

  const api = {
    DEFAULT_CONFIG,
    RECIPES,
    GRADE_RULES,
    GRADES,
    MATERIALS,
    resolveMaterialCost,
    findBestRoute,
    simulateMonteCarlo,
    quoteCommission,
    __internals: {
      buildActions,
      materialBundleCost,
      evaluatePolicyConsumption,
      refineRates,
      refineFailState,
      stateKey,
      parseState,
      formatZeny,
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    globalScope.ROSimulator = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
