// -----------------------------------------------------------------------------
// NFT CATALOG (demo data source)
// Token metadata and the fixed NFT -> universe/planet mapping. The artwork
// files are the real collection images, used as the identity source inside the
// 3D injection chamber. Replace this module with live metadata later; the rest
// of the system reads only the shape defined here.
// -----------------------------------------------------------------------------

export const NFTS = [
  {
    tokenId: 3000,
    name: 'Dimensional Injection #3000',
    image: '../assets/nft/inj-3000.jpg',
    rarity: 'MYTHIC',
    rarityRank: 1,
    // Device palette, read from the artwork, used to build the 3D device.
    palette: { shell: 0x171520, trim: 0xd8a63a, liquid: 0xc03bff, energy: 0xff6ad5, glow: 0x8a5bff },
    destination: 'machina',
  },
  {
    tokenId: 2288,
    name: 'Dimensional Injection #2288',
    image: '../assets/nft/inj-2288.jpg',
    rarity: 'LEGENDARY',
    rarityRank: 44,
    palette: { shell: 0x14161a, trim: 0xffb45a, liquid: 0x4fe3ff, energy: 0xffc04a, glow: 0x66d8ff },
    destination: 'verdant',
  },
  {
    tokenId: 1204,
    name: 'Dimensional Injection #1204',
    image: '../assets/nft/inj-1204.jpg',
    rarity: 'EPIC',
    rarityRank: 310,
    palette: { shell: 0x1a1620, trim: 0xe8b23c, liquid: 0xff8fb8, energy: 0xff4f7a, glow: 0xffa8cf },
    destination: 'abyss',
  },
  {
    tokenId: 731,
    name: 'Dimensional Injection #0731',
    image: '../assets/nft/inj-0731.jpg',
    rarity: 'RARE',
    rarityRank: 1188,
    palette: { shell: 0x121425, trim: 0xf0c04a, liquid: 0x8a5bff, energy: 0x3fd0ff, glow: 0xb07bff },
    destination: 'glacius',
  },
  {
    tokenId: 142,
    name: 'Dimensional Injection #0142',
    image: '../assets/nft/inj-0142.jpg',
    rarity: 'UNCOMMON',
    rarityRank: 2461,
    palette: { shell: 0x181a1e, trim: 0xd8863a, liquid: 0xff4f6a, energy: 0x4fe0c8, glow: 0xff7a8f },
    destination: 'ash',
  },
];

export const getNft = (tokenId) =>
  NFTS.find((n) => String(n.tokenId) === String(tokenId)) || null;

/**
 * The destination is read from the fixed mapping above — never randomised, so
 * the same token always arrives at the same Earth.
 */
export const destinationIdFor = (tokenId) => getNft(tokenId)?.destination ?? null;

/** Reward is derived from the destination's configured range and the token's
 *  rarity rank, so it is stable per token rather than generated each visit. */
export function rewardFor(nft, destination) {
  if (!nft || !destination) return 0;
  const [min, max] = destination.rewardRange;
  const span = max - min;
  // Lower rank (rarer) sits nearer the top of the range.
  const k = 1 - Math.min(1, (nft.rarityRank - 1) / 3000);
  return Math.round(min + span * k);
}
