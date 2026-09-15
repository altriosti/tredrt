// -----------------------------------------------------------------------------
// DESTINATION REGISTRY
//
// The CSV in /data is the authoritative destination database: 3,000 rows, one
// per TokenID, each naming exactly one Universe and one Planet. Those names are
// read verbatim. Nothing here invents, renames, randomises or overrides them,
// and the file itself is never modified.
//
// The world ARCHETYPE (terrain, sky, climate) is separate placeholder
// configuration used until the real planet-generation dataset arrives. It is
// chosen deterministically from the TokenID, so a token always loads the same
// environment as well as the same names.
// -----------------------------------------------------------------------------

import { ARCHETYPES, ARCHETYPE_ORDER } from './destinations.js';

const CSV_URL = '../data/Dimensional_Injection_3000_Universe_Planet_Names.csv';

let table = null;      // Map<tokenId, { universe, planet }>
let loading = null;

function parseCsv(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Names may legitimately contain spaces; the file uses three plain fields.
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const tokenId = parts[0].trim();
    const universe = parts[1].trim();
    const planet = parts.slice(2).join(',').trim();
    if (!tokenId) continue;
    map.set(tokenId, { universe, planet });
  }
  return map;
}

export async function loadDestinations() {
  if (table) return table;
  if (!loading) {
    loading = fetch(CSV_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`destination CSV ${r.status}`);
        return r.text();
      })
      .then((text) => {
        table = parseCsv(text);
        if (table.size !== 3000) {
          console.warn(`[destinations] expected 3000 rows, parsed ${table.size}`);
        }
        return table;
      });
  }
  return loading;
}

/** Stable archetype pick — same token, same world, every time. */
function archetypeIdFor(tokenId) {
  // A fixed avalanche hash, not a random draw: same token, same result, always.
  let h = (Number(tokenId) || 0) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return ARCHETYPE_ORDER[h % ARCHETYPE_ORDER.length];
}

/**
 * @returns {null | {
 *   tokenId, universe, planet, archetypeId, world, year, status, summary, rewardRange
 * }}
 */
export function resolveDestination(tokenId) {
  if (!table) return null;
  const row = table.get(String(tokenId));
  if (!row) return null;
  const archetypeId = archetypeIdFor(tokenId);
  const archetype = ARCHETYPES[archetypeId];
  return {
    tokenId: String(tokenId),
    universe: row.universe,   // exactly as supplied
    planet: row.planet,       // exactly as supplied
    archetypeId,
    // World definition handed to the 3D engine, carrying the CSV planet name.
    world: { ...archetype.world, id: `${archetypeId}-${tokenId}`, name: row.planet },
    year: archetype.year,
    status: archetype.status,
    summary: archetype.summary,
    rewardRange: archetype.rewardRange,
  };
}

export const isLoaded = () => !!table;
