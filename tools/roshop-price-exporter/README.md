# RO GNJOY Material Price Exporter

這是一個給 `https://event.gnjoy.com.tw/Ro/RoShopSearch` 使用的 Chrome Manifest V3 擴充功能。你先手動登入 GNJOY 查價頁，擴充功能會在頁面右下角顯示查價面板，批次查詢材料價格並下載模擬器可匯入的 JSON。

## 安裝方式

1. 開啟 Chrome，進入 `chrome://extensions/`。
2. 打開右上角「開發人員模式」。
3. 點「載入未封裝項目」。
4. 選擇本資料夾：`tools/roshop-price-exporter/`。

## 使用方式

1. 開啟 GNJOY 查價頁：`https://event.gnjoy.com.tw/Ro/RoShopSearch`。
2. 手動登入，選擇伺服器，並完成頁面驗證。
3. 在右下角「RO 材料查價匯出」面板按「開始查價」。
4. 查詢完成後按「下載 JSON」。
5. 回到模擬器的材料價格視窗，使用「匯入價格」匯入下載的 JSON。

## 查價規則

- 固定查詢「露天商店販售」。
- 價格基準為目前露天最低販售價。
- 只接受精確品名：`itemName === 中文材料名`。
- 查不到的材料會放在 `missing`，不會寫入 `prices`，匯入時既有價格會保留。
- 箱子類輸出整箱價格：
  - `concentratedOrideconBox`：濃縮神之金屬箱子
  - `highConcentratedOrideconBox`：高濃縮神之金屬5入箱子
  - `concentratedEluniumBox`：濃縮鋁箱子
  - `highConcentratedEluniumBox`：高濃縮鋁5入箱子
- NPC 寶石使用模擬器預設值：天藍/黃/紫 `4560`，琥珀 `3420`。

## 輸出格式

下載檔名格式：

```text
ro-material-prices-YYYYMMDD-gnjoy-伺服器.json
```

主要匯入欄位：

```json
{
  "version": 1,
  "updatedAt": "YYYY-MM-DD",
  "currency": "Zeny",
  "prices": {
    "etherStardust": 25000
  }
}
```

JSON 也會包含 `source`、`server`、`pricingMethod`、`evidenceSummary`、`missing`、`errors` 供追溯；模擬器匯入器會忽略這些額外欄位。

## 隱私與限制

- 擴充功能不讀取或保存帳號、密碼、cookie。
- 擴充功能只在 GNJOY 查價頁注入面板，並使用該頁登入後可呼叫的查詢 API。
- 若 GNJOY 更新頁面腳本或 `_Action` 參數，`content.js` 內的 `SEARCH_ACTION` 可能需要更新。
