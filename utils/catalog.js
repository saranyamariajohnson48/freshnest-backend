// Backend catalog normalization: keeps category/brand consistent
// NOTE: Keep this aligned with frontend src/utils/catalog.js
const CATALOG = [
  { category: 'Biscuits Pack', icon: '🍪', brands: ['Britannia', 'Sunfeast', 'Parle'], synonyms: ['biscuit', 'biscuits', 'cookie', 'cookies'] },
  { category: 'Noodles Pack', icon: '🍜', brands: ['Maggi', 'Top Ramen', 'Yippee!'], synonyms: ['noodle', 'noodles', 'instant'] },
  { category: 'Chips Pack', icon: '🍟', brands: ['Lays', 'Bingo!', 'Haldiram’s'], synonyms: ['chips', 'namkeen', 'snack'] },
  { category: 'Chocolate / Candy Pack', icon: '🍫', brands: ['Nestlé (KitKat, Munch)', 'Cadbury', 'Amul'], synonyms: ['chocolate', 'candy', 'sweet', 'confectionery', 'kitkat', 'munch', 'nestle', 'nestlé'] },
  { category: 'Juice / Tetra Pack', icon: '🧃', brands: ['Real', 'Tropicana', 'Frooti / Appy'], synonyms: ['juice', 'tetra', 'box', 'frooti', 'appy'] },
];

function normalizeCategory(raw) {
  if (!raw) return '';
  const t = String(raw).trim();
  const lower = t.toLowerCase();
  // exact match first
  const exact = CATALOG.find(c => c.category.toLowerCase() === lower);
  if (exact) return exact.category;
  // synonym match
  for (const c of CATALOG) {
    if (c.synonyms.some(s => lower.includes(s))) return c.category;
  }
  return t; // fallback: keep as given
}

function normalizeBrandForCategory(category, brand) {
  if (!brand) return '';
  const t = String(brand).trim();
  const entry = CATALOG.find(c => c.category === normalizeCategory(category));
  if (!entry) return t;
  // prefer case-insensitive match to one of allowed brands
  const found = entry.brands.find(b => b.toLowerCase() === t.toLowerCase());
  return found || t;
}

module.exports = { CATALOG, normalizeCategory, normalizeBrandForCategory };