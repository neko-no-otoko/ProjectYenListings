const JPY_TO_USD_RATE = 0.0067;
const SQM_TO_SQFT = 10.7639;
const KM_TO_MILES = 0.621371;

export function jpyToUsd(jpy: number | null | undefined): number | null {
  if (jpy === null || jpy === undefined) return null;
  return Math.round(jpy * JPY_TO_USD_RATE);
}

export function sqmToSqft(sqm: number | null | undefined): number | null {
  if (sqm === null || sqm === undefined) return null;
  return Math.round(sqm * SQM_TO_SQFT);
}

export function kmToMiles(km: number | null | undefined): number | null {
  if (km === null || km === undefined) return null;
  return Math.round(km * KM_TO_MILES * 10) / 10;
}

export function formatUsd(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return "N/A";
  if (usd === 0) return "Free";
  return `$${usd.toLocaleString()}`;
}

export function formatSqft(sqft: number | null | undefined): string {
  if (sqft === null || sqft === undefined) return "N/A";
  return `${sqft.toLocaleString()} sq ft`;
}

export function formatMiles(miles: number | null | undefined): string {
  if (miles === null || miles === undefined) return "N/A";
  return `${miles} mi`;
}

export function formatPriceUsd(jpy: number | null | undefined): string {
  return formatUsd(jpyToUsd(jpy));
}

export function formatHouseSqft(sqm: number | null | undefined): string {
  return formatSqft(sqmToSqft(sqm));
}

export function formatLandSqft(sqm: number | null | undefined): string {
  return formatSqft(sqmToSqft(sqm));
}

export function formatDistanceMiles(km: number | null | undefined): string {
  return formatMiles(kmToMiles(km));
}

export const MAX_PRICE_JPY = 100000000;
export const PRICE_STEPS = [
  { jpy: 0, usd: 0, label: "$0" },
  { jpy: 50000, usd: 335, label: "$335" },
  { jpy: 100000, usd: 670, label: "$670" },
  { jpy: 150000, usd: 1005, label: "$1K" },
  { jpy: 500000, usd: 3350, label: "$3.4K" },
  { jpy: 1000000, usd: 6700, label: "$6.7K" },
  { jpy: 5000000, usd: 33500, label: "$34K" },
  { jpy: 10000000, usd: 67000, label: "$67K" },
  { jpy: 50000000, usd: 335000, label: "$335K" },
  { jpy: 100000000, usd: 670000, label: "Any" },
];

export function jpyToSliderValue(jpy: number | null | undefined): number {
  if (jpy === undefined || jpy === null || jpy >= MAX_PRICE_JPY) return PRICE_STEPS.length - 1;
  for (let i = PRICE_STEPS.length - 1; i >= 0; i--) {
    if (jpy >= PRICE_STEPS[i].jpy) return i;
  }
  return 0;
}

export function sliderValueToJpy(value: number): number | undefined {
  if (value >= PRICE_STEPS.length - 1) return undefined;
  return PRICE_STEPS[value].jpy;
}

export function getPriceLabel(value: number): string {
  return PRICE_STEPS[value]?.label || "Any";
}
