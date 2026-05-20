# RO 裝備製作模擬器：AI 查價材料清單

請協助查詢下列材料的露天或市價，並只修改 JSON 中 `prices` 的數值。請保留英文材料 key，不要改欄位名稱。

## 查價 JSON 範本

```json
{
  "version": 1,
  "updatedAt": "YYYY-MM-DD",
  "currency": "Zeny",
  "prices": {
    "etherStardust": 0,
    "blessedEtherStardust": 0,
    "oridecon": 0,
    "etherOridecon": 0,
    "concentratedOrideconBox": 0,
    "concentratedEtherOridecon": 0,
    "etherBradium": 0,
    "highConcentratedOrideconBox": 0,
    "highConcentratedEtherOridecon": 0,
    "highDensityEtherBradium": 0,
    "elunium": 0,
    "etherElunium": 0,
    "concentratedEluniumBox": 0,
    "concentratedEtherElunium": 0,
    "etherCarnium": 0,
    "highConcentratedEluniumBox": 0,
    "highConcentratedEtherElunium": 0,
    "highDensityEtherCarnium": 0,
    "blessing": 0,
    "etherStone": 0,
    "azureGem": 0,
    "yellowGem": 0,
    "purpleGem": 0,
    "amberGem": 0,
    "npcAzureGem": 4560,
    "npcYellowGem": 4560,
    "npcPurpleGem": 4560,
    "npcAmberGem": 3420
  }
}
```

## 查價項目

| key | 中文材料名 | 填寫方式 |
| --- | --- | --- |
| `etherStardust` | 乙太星塵 | 單個價格 |
| `blessedEtherStardust` | 庇佑乙太星塵 | 單個價格 |
| `oridecon` | 神之金屬 | 單個價格 |
| `etherOridecon` | 乙太神之金屬 | 單個價格；也可留 0 讓系統用神之金屬 + 乙太星塵換算 |
| `concentratedOrideconBox` | 濃縮神之金屬箱子 | 整箱價格；系統會自動除以 10 換算單個濃縮神之金屬 |
| `concentratedEtherOridecon` | 濃縮乙太神之金屬 | 直接買單個價格；也可留 0 讓系統用配方換算 |
| `etherBradium` | 乙太鈽鐳礦石 | 單個價格 |
| `highConcentratedOrideconBox` | 高濃縮神之金屬5入箱子 | 整箱價格；系統會自動除以 5 換算單個高濃縮神之金屬 |
| `highConcentratedEtherOridecon` | 高濃縮乙太神之金屬 | 直接買單個價格；也可留 0 讓系統用配方換算 |
| `highDensityEtherBradium` | 高密度乙太鈽鐳礦石 | 單個價格 |
| `elunium` | 鋁 | 單個價格 |
| `etherElunium` | 乙太鋁 | 單個價格；也可留 0 讓系統用鋁 + 乙太星塵換算 |
| `concentratedEluniumBox` | 濃縮鋁箱子 | 整箱價格；系統會自動除以 10 換算單個濃縮鋁 |
| `concentratedEtherElunium` | 濃縮乙太鋁 | 直接買單個價格；也可留 0 讓系統用配方換算 |
| `etherCarnium` | 乙太鈣礦石 | 單個價格 |
| `highConcentratedEluniumBox` | 高濃縮鋁5入箱子 | 整箱價格；系統會自動除以 5 換算單個高濃縮鋁 |
| `highConcentratedEtherElunium` | 高濃縮乙太鋁 | 直接買單個價格；也可留 0 讓系統用配方換算 |
| `highDensityEtherCarnium` | 高密度乙太鈣礦石 | 單個價格 |
| `blessing` | 鐵匠的祝福 | 單個價格 |
| `etherStone` | 乙太魔石 | 單個價格；也可留 0 讓系統用乙太星塵 + Zeny 換算 |
| `azureGem` | 乙太天藍寶石 | 單個價格 |
| `yellowGem` | 乙太黃寶石 | 單個價格 |
| `purpleGem` | 乙太紫寶石 | 單個價格 |
| `amberGem` | 乙太琥珀 | 單個價格 |
| `npcAzureGem` | 天藍寶石 | NPC 價格或市場單價 |
| `npcYellowGem` | 黃寶石 | NPC 價格或市場單價 |
| `npcPurpleGem` | 紫寶石 | NPC 價格或市場單價 |
| `npcAmberGem` | 琥珀 | NPC 價格或市場單價 |

## 系統自動換算規則

- 濃縮神之金屬 = 濃縮神之金屬箱子 / 10
- 高濃縮神之金屬 = 高濃縮神之金屬5入箱子 / 5
- 濃縮鋁 = 濃縮鋁箱子 / 10
- 高濃縮鋁 = 高濃縮鋁5入箱子 / 5
- 濃縮乙太系列 = 2 個乙太星塵 + 1 個濃縮鋁/神之金屬 + 20,000 Zeny
- 高濃縮乙太系列 = 3 個乙太星塵 + 1 個高濃縮鋁/神之金屬 + 50,000 Zeny
