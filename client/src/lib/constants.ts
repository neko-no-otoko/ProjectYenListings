export const PREFECTURES = [
  { value: "hokkaido", label: "Hokkaido", island: "Hokkaido" },
  { value: "aomori", label: "Aomori", island: "Honshu" },
  { value: "iwate", label: "Iwate", island: "Honshu" },
  { value: "miyagi", label: "Miyagi", island: "Honshu" },
  { value: "akita", label: "Akita", island: "Honshu" },
  { value: "yamagata", label: "Yamagata", island: "Honshu" },
  { value: "fukushima", label: "Fukushima", island: "Honshu" },
  { value: "ibaraki", label: "Ibaraki", island: "Honshu" },
  { value: "tochigi", label: "Tochigi", island: "Honshu" },
  { value: "gunma", label: "Gunma", island: "Honshu" },
  { value: "saitama", label: "Saitama", island: "Honshu" },
  { value: "chiba", label: "Chiba", island: "Honshu" },
  { value: "tokyo", label: "Tokyo", island: "Honshu" },
  { value: "kanagawa", label: "Kanagawa", island: "Honshu" },
  { value: "niigata", label: "Niigata", island: "Honshu" },
  { value: "toyama", label: "Toyama", island: "Honshu" },
  { value: "ishikawa", label: "Ishikawa", island: "Honshu" },
  { value: "fukui", label: "Fukui", island: "Honshu" },
  { value: "yamanashi", label: "Yamanashi", island: "Honshu" },
  { value: "nagano", label: "Nagano", island: "Honshu" },
  { value: "gifu", label: "Gifu", island: "Honshu" },
  { value: "shizuoka", label: "Shizuoka", island: "Honshu" },
  { value: "aichi", label: "Aichi", island: "Honshu" },
  { value: "mie", label: "Mie", island: "Honshu" },
  { value: "shiga", label: "Shiga", island: "Honshu" },
  { value: "kyoto", label: "Kyoto", island: "Honshu" },
  { value: "osaka", label: "Osaka", island: "Honshu" },
  { value: "hyogo", label: "Hyogo", island: "Honshu" },
  { value: "nara", label: "Nara", island: "Honshu" },
  { value: "wakayama", label: "Wakayama", island: "Honshu" },
  { value: "tottori", label: "Tottori", island: "Honshu" },
  { value: "shimane", label: "Shimane", island: "Honshu" },
  { value: "okayama", label: "Okayama", island: "Honshu" },
  { value: "hiroshima", label: "Hiroshima", island: "Honshu" },
  { value: "yamaguchi", label: "Yamaguchi", island: "Honshu" },
  { value: "tokushima", label: "Tokushima", island: "Shikoku" },
  { value: "kagawa", label: "Kagawa", island: "Shikoku" },
  { value: "ehime", label: "Ehime", island: "Shikoku" },
  { value: "kochi", label: "Kochi", island: "Shikoku" },
  { value: "fukuoka", label: "Fukuoka", island: "Kyushu" },
  { value: "saga", label: "Saga", island: "Kyushu" },
  { value: "nagasaki", label: "Nagasaki", island: "Kyushu" },
  { value: "kumamoto", label: "Kumamoto", island: "Kyushu" },
  { value: "oita", label: "Oita", island: "Kyushu" },
  { value: "miyazaki", label: "Miyazaki", island: "Kyushu" },
  { value: "kagoshima", label: "Kagoshima", island: "Kyushu" },
  { value: "okinawa", label: "Okinawa", island: "Okinawa" },
];

export const ISLANDS = [
  { value: "Hokkaido", label: "Hokkaido" },
  { value: "Honshu", label: "Honshu (Main Island)" },
  { value: "Shikoku", label: "Shikoku" },
  { value: "Kyushu", label: "Kyushu" },
  { value: "Okinawa", label: "Okinawa" },
];

export const SORT_OPTIONS = [
  { value: "price_asc", label: "Price: Low to High" },
  { value: "newest", label: "Newest First" },
  { value: "land_desc", label: "Land Size: Largest" },
  { value: "house_desc", label: "House Size: Largest" },
  { value: "condition_desc", label: "Best Condition" },
];

export const CONDITION_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: "Excellent", color: "bg-emerald-500" },
  4: { label: "Good", color: "bg-green-500" },
  3: { label: "Fair", color: "bg-yellow-500" },
  2: { label: "Needs Work", color: "bg-orange-500" },
  1: { label: "Poor", color: "bg-red-500" },
};

export function formatPrice(priceJpy: number): string {
  if (priceJpy === 0) return "¥0 (Free Transfer)";
  return `¥${priceJpy.toLocaleString()}`;
}

export function formatArea(sqm: number | null | undefined): string {
  if (!sqm) return "—";
  return `${sqm.toLocaleString()} m²`;
}
