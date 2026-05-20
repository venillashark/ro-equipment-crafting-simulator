(() => {
  "use strict";

  const marketMaterials = [
    { key: "etherStardust", name: "乙太星塵", category: "升階與製作材料" },
    { key: "blessedEtherStardust", name: "庇佑乙太星塵", category: "升階與製作材料" },
    { key: "etherStone", name: "乙太魔石", category: "升階與製作材料" },
    { key: "azureGem", name: "乙太天藍寶石", category: "升階與製作材料" },
    { key: "yellowGem", name: "乙太黃寶石", category: "升階與製作材料" },
    { key: "purpleGem", name: "乙太紫寶石", category: "升階與製作材料" },
    { key: "amberGem", name: "乙太琥珀", category: "升階與製作材料" },
    { key: "oridecon", name: "神之金屬", category: "五級武器精煉" },
    { key: "etherOridecon", name: "乙太神之金屬", category: "五級武器精煉" },
    { key: "concentratedOrideconBox", name: "濃縮神之金屬箱子", category: "五級武器精煉", note: "整箱價格，模擬器會除以 10" },
    { key: "concentratedEtherOridecon", name: "濃縮乙太神之金屬", category: "五級武器精煉" },
    { key: "etherBradium", name: "乙太鈽鐳礦石", category: "五級武器精煉" },
    { key: "highConcentratedOrideconBox", name: "高濃縮神之金屬5入箱子", category: "五級武器精煉", note: "整箱價格，模擬器會除以 5" },
    { key: "highConcentratedEtherOridecon", name: "高濃縮乙太神之金屬", category: "五級武器精煉" },
    { key: "highDensityEtherBradium", name: "高密度乙太鈽鐳礦石", category: "五級武器精煉" },
    { key: "elunium", name: "鋁", category: "二級防具精煉" },
    { key: "etherElunium", name: "乙太鋁", category: "二級防具精煉" },
    { key: "concentratedEluniumBox", name: "濃縮鋁箱子", category: "二級防具精煉", note: "整箱價格，模擬器會除以 10" },
    { key: "concentratedEtherElunium", name: "濃縮乙太鋁", category: "二級防具精煉" },
    { key: "etherCarnium", name: "乙太鈣礦石", category: "二級防具精煉" },
    { key: "highConcentratedEluniumBox", name: "高濃縮鋁5入箱子", category: "二級防具精煉", note: "整箱價格，模擬器會除以 5" },
    { key: "highConcentratedEtherElunium", name: "高濃縮乙太鋁", category: "二級防具精煉" },
    { key: "highDensityEtherCarnium", name: "高密度乙太鈣礦石", category: "二級防具精煉" },
    { key: "blessing", name: "鐵匠的祝福", category: "保護材料" },
  ];

  const fixedNpcPrices = [
    { key: "npcAzureGem", name: "天藍寶石", price: 4560 },
    { key: "npcYellowGem", name: "黃寶石", price: 4560 },
    { key: "npcPurpleGem", name: "紫寶石", price: 4560 },
    { key: "npcAmberGem", name: "琥珀", price: 3420 },
  ];

  window.ROSHOP_PRICE_EXPORTER_MATERIALS = {
    marketMaterials,
    fixedNpcPrices,
  };
})();
