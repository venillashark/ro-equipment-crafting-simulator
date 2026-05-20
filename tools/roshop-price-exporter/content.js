(() => {
  "use strict";

  const MATERIAL_SOURCE = window.ROSHOP_PRICE_EXPORTER_MATERIALS || {};
  const MARKET_MATERIALS = MATERIAL_SOURCE.marketMaterials || [];
  const FIXED_NPC_PRICES = MATERIAL_SOURCE.fixedNpcPrices || [];
  const PANEL_ID = "roshop-price-exporter-panel";
  const STYLE_ID = "roshop-price-exporter-style";
  const API_PATH = "RoShopSearch/forAjax_shopDeal";
  const QUERY_DELAY_MS = 220;

  // This _Action value matches the site's own search button flow as observed on 2026-05-20.
  // If GNJOY changes the page script, this may need to be updated.
  const SEARCH_ACTION = "CwjJJfHX5jyx3YgilyzJddyDYyRfJ23t8y+DP9ep8jk=";

  const state = {
    running: false,
    cancelRequested: false,
    payload: null,
    progress: { done: 0, total: MARKET_MATERIALS.length },
  };

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function dateParts(date = new Date()) {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    return {
      compact: `${year}${month}${day}`,
      dashed: `${year}-${month}-${day}`,
    };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatZeny(value) {
    if (!Number.isFinite(value)) return "-";
    return `${Math.round(value).toLocaleString("zh-TW")} z`;
  }

  function getInputValue(name) {
    return document.querySelector(`input[name="${name}"]`)?.value || "";
  }

  function getPageContext() {
    const serverElement = document.querySelector("#div_svr");
    return {
      antiForgeryToken: getInputValue("__RequestVerificationToken"),
      turnstileToken: getInputValue("cf-turnstile-response"),
      serverId: serverElement?.getAttribute("_val") || "",
      serverName: serverElement?.textContent?.trim() || "",
      url: location.href,
    };
  }

  function readinessError(context) {
    if (!context.antiForgeryToken) return "找不到頁面驗證 token，請重新整理 GNJOY 查價頁後再試。";
    if (!context.turnstileToken) return "尚未取得 Turnstile 驗證，請在查價頁完成驗證後再試。";
    if (!context.serverId || context.serverId === "0") return "請先在 GNJOY 查價頁選擇伺服器。";
    return "";
  }

  function normalizeFilePart(value) {
    return String(value || "server")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-") || "server";
  }

  function isLoginMessage(message) {
    return typeof message === "string" && message.includes("請先登入");
  }

  async function queryMaterial(material, context) {
    const inputData = {
      div_svr: context.serverId,
      div_storetype: "0",
      txb_KeyWord: material.name,
      row_start: "1",
      recaptcha: context.turnstileToken,
      sort_by: "itemPrice",
      sort_desc: "",
      _Action: SEARCH_ACTION,
    };

    const response = await fetch(API_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        RequestVerificationToken: context.antiForgeryToken,
      },
      body: JSON.stringify(inputData),
      credentials: "same-origin",
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_error) {
      return {
        type: "error",
        key: material.key,
        name: material.name,
        message: `查詢回傳不是 JSON（HTTP ${response.status}）。`,
      };
    }

    if (isLoginMessage(json.Message)) {
      return {
        type: "fatal",
        message: "GNJOY 回傳請先登入，請確認目前頁面已登入後再執行。",
      };
    }

    if (json.Message) {
      return {
        type: "error",
        key: material.key,
        name: material.name,
        message: json.Message,
      };
    }

    const rows = Array.isArray(json.dt) ? json.dt : [];
    const exactMatches = rows
      .filter((row) => row.itemName === material.name)
      .filter((row) => Number(row.storetype) === 0)
      .map((row) => ({
        itemName: row.itemName,
        itemPrice: Number(row.itemPrice),
        itemCNT: Number(row.itemCNT) || 0,
        storeName: row.storeName || "",
      }))
      .filter((row) => Number.isFinite(row.itemPrice) && row.itemPrice >= 0)
      .sort((a, b) => a.itemPrice - b.itemPrice);

    if (exactMatches.length === 0) {
      return {
        type: "missing",
        key: material.key,
        name: material.name,
        returned: rows.slice(0, 5).map((row) => ({
          itemName: row.itemName,
          itemPrice: row.itemPrice,
          itemCNT: row.itemCNT,
        })),
      };
    }

    const best = exactMatches[0];
    return {
      type: "price",
      key: material.key,
      name: material.name,
      price: best.itemPrice,
      evidence: {
        name: material.name,
        itemName: best.itemName,
        price: best.itemPrice,
        quantity: best.itemCNT,
        exactMatchesOnFirstPage: exactMatches.length,
        firstPageRows: rows.length,
        note: material.note || "",
      },
    };
  }

  function buildPayload(context, prices, evidenceSummary, missing, errors) {
    const now = dateParts();
    const payload = {
      version: 1,
      updatedAt: now.dashed,
      currency: "Zeny",
      source: "https://event.gnjoy.com.tw/Ro/RoShopSearch",
      server: {
        id: context.serverId,
        name: context.serverName,
      },
      pricingMethod: "目前露天商店販售查詢，單價升冪排序，取第一頁精確品名最低單價；NPC 寶石使用模擬器預設 NPC 價格。",
      notes: [
        "濃縮神之金屬箱子、濃縮鋁箱子為整箱價格，模擬器會自動除以 10。",
        "高濃縮神之金屬5入箱子、高濃縮鋁5入箱子為整箱價格，模擬器會自動除以 5。",
        "missing 內的材料查無目前露天販售資料，因此未寫入 prices；匯入時既有價格會保留。",
      ],
      prices,
      evidenceSummary,
      missing,
      errors,
    };

    for (const item of FIXED_NPC_PRICES) {
      payload.prices[item.key] = item.price;
      payload.evidenceSummary[item.key] = {
        name: item.name,
        price: item.price,
        source: "NPC/default from simulator material list",
      };
    }

    return payload;
  }

  async function runQuery() {
    if (state.running) return;

    const context = getPageContext();
    const error = readinessError(context);
    if (error) {
      setStatus(error, "error");
      return;
    }

    state.running = true;
    state.cancelRequested = false;
    state.payload = null;
    state.progress = { done: 0, total: MARKET_MATERIALS.length };
    updateButtons();

    const prices = {};
    const evidenceSummary = {};
    const missing = [];
    const errors = [];

    setStatus(`開始查詢 ${context.serverName || context.serverId}，共 ${MARKET_MATERIALS.length} 項材料。`, "info");
    updateProgress();

    for (const material of MARKET_MATERIALS) {
      if (state.cancelRequested) {
        setStatus("查詢已取消，尚未產出 JSON。", "warning");
        state.running = false;
        updateButtons();
        updateProgress();
        return;
      }

      setStatus(`查詢中：${material.name}`, "info");
      try {
        const result = await queryMaterial(material, context);
        if (result.type === "fatal") {
          setStatus(result.message, "error");
          state.running = false;
          updateButtons();
          return;
        }
        if (result.type === "price") {
          prices[result.key] = result.price;
          evidenceSummary[result.key] = result.evidence;
        } else if (result.type === "missing") {
          missing.push(result);
        } else {
          errors.push(result);
        }
      } catch (queryError) {
        errors.push({
          key: material.key,
          name: material.name,
          message: queryError instanceof Error ? queryError.message : String(queryError),
        });
      }

      state.progress.done += 1;
      updateProgress();
      await sleep(QUERY_DELAY_MS);
    }

    state.payload = buildPayload(context, prices, evidenceSummary, missing, errors);
    state.running = false;
    setStatus(`完成：查到 ${Object.keys(prices).length + FIXED_NPC_PRICES.length} 項，缺 ${missing.length} 項，錯誤 ${errors.length} 項。下載前可先確認摘要。`, errors.length ? "warning" : "success");
    renderSummary(state.payload);
    updateButtons();
  }

  function downloadPayload() {
    if (!state.payload || state.running) return;
    const now = dateParts();
    const serverName = normalizeFilePart(state.payload.server?.name || state.payload.server?.id);
    const blob = new Blob([`${JSON.stringify(state.payload, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ro-material-prices-${now.compact}-gnjoy-${serverName}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("JSON 已下載，可回到模擬器材料價格視窗匯入。", "success");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: min(360px, calc(100vw - 32px));
        z-index: 2147483647;
        box-sizing: border-box;
        border: 1px solid rgba(230, 190, 115, 0.45);
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(13, 24, 38, 0.98), rgba(20, 31, 47, 0.98));
        color: #f7ecd1;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
        font-family: "Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif;
        overflow: hidden;
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .rxp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px 10px;
        border-bottom: 1px solid rgba(230, 190, 115, 0.2);
      }
      #${PANEL_ID} .rxp-title {
        margin: 0;
        font-size: 16px;
        line-height: 1.35;
        letter-spacing: 0;
        font-weight: 800;
      }
      #${PANEL_ID} .rxp-server {
        max-width: 96px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #8fd5ff;
        font-size: 12px;
      }
      #${PANEL_ID} .rxp-body { padding: 14px 16px 16px; }
      #${PANEL_ID} .rxp-status {
        min-height: 40px;
        margin: 0 0 12px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        color: #dce8f7;
        font-size: 13px;
        line-height: 1.45;
      }
      #${PANEL_ID} .rxp-status.success { color: #d9f99d; background: rgba(74, 222, 128, 0.12); }
      #${PANEL_ID} .rxp-status.warning { color: #fde68a; background: rgba(245, 158, 11, 0.13); }
      #${PANEL_ID} .rxp-status.error { color: #fecaca; background: rgba(239, 68, 68, 0.16); }
      #${PANEL_ID} .rxp-progress {
        height: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.11);
        overflow: hidden;
      }
      #${PANEL_ID} .rxp-progress span {
        display: block;
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #2dd4bf, #38bdf8, #f8c76a);
        transition: width 0.22s ease;
      }
      #${PANEL_ID} .rxp-meta {
        display: flex;
        justify-content: space-between;
        margin: 8px 0 12px;
        color: rgba(247, 236, 209, 0.72);
        font-size: 12px;
      }
      #${PANEL_ID} .rxp-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      #${PANEL_ID} button {
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        color: #f8fafc;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        padding: 9px 10px;
      }
      #${PANEL_ID} button.primary {
        border-color: rgba(56, 189, 248, 0.45);
        background: linear-gradient(135deg, rgba(14, 116, 204, 0.95), rgba(8, 145, 178, 0.95));
      }
      #${PANEL_ID} button:disabled {
        cursor: not-allowed;
        opacity: 0.48;
      }
      #${PANEL_ID} .rxp-summary {
        display: grid;
        gap: 7px;
        margin-top: 12px;
        color: rgba(247, 236, 209, 0.82);
        font-size: 12px;
      }
      #${PANEL_ID} .rxp-summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-top: 7px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      #${PANEL_ID} .rxp-summary-row strong { color: #f8fafc; }
      #${PANEL_ID} .rxp-small {
        margin-top: 10px;
        color: rgba(247, 236, 209, 0.58);
        font-size: 11px;
        line-height: 1.5;
      }
      @media (max-width: 520px) {
        #${PANEL_ID} {
          right: 12px;
          bottom: 12px;
          width: calc(100vw - 24px);
        }
      }
    `;
    document.head.append(style);
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;
    injectStyles();

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="rxp-header">
        <h2 class="rxp-title">RO 材料查價匯出</h2>
        <span class="rxp-server" data-rxp-server>-</span>
      </div>
      <div class="rxp-body">
        <p class="rxp-status info" data-rxp-status>登入並完成驗證後，按「開始查價」產出材料價格 JSON。</p>
        <div class="rxp-progress" aria-label="查詢進度"><span data-rxp-progress-bar></span></div>
        <div class="rxp-meta">
          <span data-rxp-progress-text>0 / ${MARKET_MATERIALS.length}</span>
          <span>目前露天最低販售價</span>
        </div>
        <div class="rxp-actions">
          <button type="button" class="primary" data-rxp-start>開始查價</button>
          <button type="button" data-rxp-download disabled>下載 JSON</button>
          <button type="button" data-rxp-cancel disabled>取消</button>
          <button type="button" data-rxp-refresh>更新狀態</button>
        </div>
        <div class="rxp-summary" data-rxp-summary></div>
        <div class="rxp-small">工具只使用本頁登入後的查詢 API，不讀取或保存帳密、cookie。箱子會輸出整箱價格，單個換算由模擬器處理。</div>
      </div>
    `;
    document.body.append(panel);

    panel.querySelector("[data-rxp-start]")?.addEventListener("click", runQuery);
    panel.querySelector("[data-rxp-download]")?.addEventListener("click", downloadPayload);
    panel.querySelector("[data-rxp-cancel]")?.addEventListener("click", () => {
      state.cancelRequested = true;
      setStatus("正在取消，會在目前這筆查詢完成後停止。", "warning");
    });
    panel.querySelector("[data-rxp-refresh]")?.addEventListener("click", () => {
      const context = getPageContext();
      const error = readinessError(context);
      setStatus(error || `目前伺服器：${context.serverName || context.serverId}，可以開始查價。`, error ? "warning" : "success");
      updateServer();
    });

    updateServer();
    updateButtons();
    updateProgress();
  }

  function panelQuery(selector) {
    return document.getElementById(PANEL_ID)?.querySelector(selector) || null;
  }

  function setStatus(message, tone = "info") {
    const status = panelQuery("[data-rxp-status]");
    if (!status) return;
    status.textContent = message;
    status.className = `rxp-status ${tone}`;
  }

  function updateServer() {
    const context = getPageContext();
    const server = panelQuery("[data-rxp-server]");
    if (server) server.textContent = context.serverName || "未選伺服器";
  }

  function updateButtons() {
    const start = panelQuery("[data-rxp-start]");
    const download = panelQuery("[data-rxp-download]");
    const cancel = panelQuery("[data-rxp-cancel]");
    if (start) start.disabled = state.running;
    if (download) download.disabled = state.running || !state.payload;
    if (cancel) cancel.disabled = !state.running;
  }

  function updateProgress() {
    const text = panelQuery("[data-rxp-progress-text]");
    const bar = panelQuery("[data-rxp-progress-bar]");
    const total = Math.max(1, state.progress.total);
    const percent = Math.min(100, Math.round((state.progress.done / total) * 100));
    if (text) text.textContent = `${state.progress.done} / ${state.progress.total}`;
    if (bar) bar.style.width = `${percent}%`;
  }

  function renderSummary(payload) {
    const root = panelQuery("[data-rxp-summary]");
    if (!root || !payload) return;
    const foundCount = Object.keys(payload.prices || {}).length;
    const marketFoundCount = foundCount - FIXED_NPC_PRICES.length;
    const cheapestRows = Object.entries(payload.evidenceSummary || {})
      .filter(([key]) => !key.startsWith("npc"))
      .slice(0, 5)
      .map(([, value]) => `<div class="rxp-summary-row"><span>${value.name}</span><strong>${formatZeny(value.price)}</strong></div>`)
      .join("");
    root.innerHTML = `
      <div class="rxp-summary-row"><span>市場價格</span><strong>${marketFoundCount} / ${MARKET_MATERIALS.length}</strong></div>
      <div class="rxp-summary-row"><span>NPC 固定價格</span><strong>${FIXED_NPC_PRICES.length}</strong></div>
      <div class="rxp-summary-row"><span>缺漏</span><strong>${payload.missing.length}</strong></div>
      <div class="rxp-summary-row"><span>錯誤</span><strong>${payload.errors.length}</strong></div>
      ${cheapestRows}
    `;
  }

  createPanel();
})();
