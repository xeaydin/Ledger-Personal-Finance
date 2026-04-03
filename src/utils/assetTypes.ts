export const ASSET_TYPES = ['Funds', 'Stocks', 'Crypto', 'Gold'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export function normalizeAssetType(t: string): AssetType {
  const x = String(t).toLowerCase();
  if (x === 'fund' || x === 'funds') return 'Funds';
  if (x === 'stock' || x === 'stocks') return 'Stocks';
  if (x === 'crypto') return 'Crypto';
  if (x === 'gold') return 'Gold';
  return 'Funds';
}

export function mergeAssetPosition(
  existingUnits: number,
  existingPricePerUnit: number,
  addUnits: number,
  addPricePerUnit: number
): { units: number; value: number } {
  const u = existingUnits + addUnits;
  if (u <= 0) return { units: 0, value: 0 };
  const weighted =
    (existingUnits * existingPricePerUnit + addUnits * addPricePerUnit) / u;
  return { units: u, value: Math.round(weighted * 10000) / 10000 };
}
