export const PREFECTURE_COORDS: Record<string, { lat: number; lon: number }> = {
  "北海道": { lat: 43.0642, lon: 141.3469 },
  "青森県": { lat: 40.8244, lon: 140.7400 },
  "岩手県": { lat: 39.7036, lon: 141.1527 },
  "宮城県": { lat: 38.2688, lon: 140.8721 },
  "秋田県": { lat: 39.7186, lon: 140.1024 },
  "山形県": { lat: 38.2404, lon: 140.3633 },
  "福島県": { lat: 37.7503, lon: 140.4676 },
  "茨城県": { lat: 36.3418, lon: 140.4468 },
  "栃木県": { lat: 36.5657, lon: 139.8836 },
  "群馬県": { lat: 36.3911, lon: 139.0608 },
  "埼玉県": { lat: 35.8569, lon: 139.6489 },
  "千葉県": { lat: 35.6050, lon: 140.1233 },
  "東京都": { lat: 35.6895, lon: 139.6917 },
  "神奈川県": { lat: 35.4478, lon: 139.6425 },
  "新潟県": { lat: 37.9026, lon: 139.0236 },
  "富山県": { lat: 36.6953, lon: 137.2114 },
  "石川県": { lat: 36.5947, lon: 136.6256 },
  "福井県": { lat: 36.0652, lon: 136.2216 },
  "山梨県": { lat: 35.6642, lon: 138.5684 },
  "長野県": { lat: 36.6513, lon: 138.1810 },
  "岐阜県": { lat: 35.3912, lon: 136.7223 },
  "静岡県": { lat: 34.9769, lon: 138.3831 },
  "愛知県": { lat: 35.1802, lon: 136.9066 },
  "三重県": { lat: 34.7303, lon: 136.5086 },
  "滋賀県": { lat: 35.0045, lon: 135.8686 },
  "京都府": { lat: 35.0116, lon: 135.7681 },
  "大阪府": { lat: 34.6863, lon: 135.5200 },
  "兵庫県": { lat: 34.6913, lon: 135.1830 },
  "奈良県": { lat: 34.6851, lon: 135.8328 },
  "和歌山県": { lat: 34.2260, lon: 135.1675 },
  "鳥取県": { lat: 35.5039, lon: 134.2378 },
  "島根県": { lat: 35.4723, lon: 133.0505 },
  "岡山県": { lat: 34.6618, lon: 133.9344 },
  "広島県": { lat: 34.3966, lon: 132.4596 },
  "山口県": { lat: 34.1860, lon: 131.4706 },
  "徳島県": { lat: 34.0658, lon: 134.5593 },
  "香川県": { lat: 34.3401, lon: 134.0434 },
  "愛媛県": { lat: 33.8416, lon: 132.7657 },
  "高知県": { lat: 33.5597, lon: 133.5311 },
  "福岡県": { lat: 33.6064, lon: 130.4183 },
  "佐賀県": { lat: 33.2494, lon: 130.2988 },
  "長崎県": { lat: 32.7503, lon: 129.8777 },
  "熊本県": { lat: 32.7898, lon: 130.7417 },
  "大分県": { lat: 33.2382, lon: 131.6126 },
  "宮崎県": { lat: 31.9111, lon: 131.4239 },
  "鹿児島県": { lat: 31.5602, lon: 130.5581 },
  "沖縄県": { lat: 26.2124, lon: 127.6809 },
};

export function getPrefectureCoords(prefecture: string | null): { lat: number; lon: number } | null {
  if (!prefecture) return null;
  
  const normalized = prefecture.trim();
  if (PREFECTURE_COORDS[normalized]) {
    return PREFECTURE_COORDS[normalized];
  }
  
  for (const [key, coords] of Object.entries(PREFECTURE_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  
  return null;
}
