// lib/region.ts
export type Region = 'uk' | 'us';

export const getRegionFromHost = (host?: string | null): Region => {
  if (!host) return 'uk';

  const lower = host.toLowerCase();

  if (lower.includes('auriclejewelry.com')) return 'us';
  if (lower.includes('auricle.co.uk')) return 'uk';

  // default
  return 'uk';
};
