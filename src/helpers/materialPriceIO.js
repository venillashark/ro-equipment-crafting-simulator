function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDateParts(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return {
    compact: `${year}${month}${day}`,
    dashed: `${year}-${month}-${day}`,
  };
}

export function buildPriceExportPayload(prices, date = new Date()) {
  return {
    version: 1,
    updatedAt: formatDateParts(date).dashed,
    currency: "Zeny",
    prices: { ...prices },
  };
}

export function downloadPriceJson(prices) {
  const dateParts = formatDateParts();
  const payload = buildPriceExportPayload(prices);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ro-material-prices-${dateParts.compact}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseImportSource(source) {
  if (typeof source === "string") {
    return JSON.parse(source);
  }
  return source;
}

function normalizePriceValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function validatePriceImport(source, knownKeys) {
  let payload;
  try {
    payload = parseImportSource(source);
  } catch (_error) {
    return {
      ok: false,
      error: "JSON 格式錯誤，請確認檔案內容是有效 JSON。",
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      error: "匯入檔案必須是 JSON 物件。",
    };
  }

  if (!payload.prices || typeof payload.prices !== "object" || Array.isArray(payload.prices)) {
    return {
      ok: false,
      error: "匯入檔案需要包含 prices 物件。",
    };
  }

  const knownKeySet = new Set(knownKeys);
  const updates = {};
  const unknownKeys = [];
  const invalidPrices = [];

  for (const [key, value] of Object.entries(payload.prices)) {
    if (!knownKeySet.has(key)) {
      unknownKeys.push(key);
      continue;
    }

    const price = normalizePriceValue(value);
    if (price === null) {
      invalidPrices.push(key);
      continue;
    }

    updates[key] = price;
  }

  return {
    ok: true,
    updates,
    validCount: Object.keys(updates).length,
    unknownKeys,
    invalidPrices,
    unknownCount: unknownKeys.length,
    invalidCount: invalidPrices.length,
  };
}
