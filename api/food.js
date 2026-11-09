// Food search for the Nutrition tab: GET /api/food?q=chicken%20breast
// Runs on Vercel as a serverless function, so any API key stays private.
// Sources:
//   - USDA FoodData Central (everyday foods, restaurant and branded items)
//     Free key: https://fdc.nal.usda.gov/api-key-signup  → add it in Vercel as USDA_API_KEY
//     Without a key it uses the shared DEMO_KEY, which runs out quickly.
//   - Open Food Facts (packaged and branded products, no key needed)
// All values come back per 100 g, plus a typical serving when the source has one.

const UA = 'BallFitClub/1.0 (personal fitness tracker)';

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const r1 = n => (n == null ? null : Math.round(n * 10) / 10);
const titleCase = s => String(s || '').toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).trim();
const tidy = s => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t === t.toUpperCase() ? titleCase(t) : t;
};

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

// ---------- USDA ----------
function usdaEnergy(list) {
  const kcal = (list || []).filter(n => /^energy/i.test(n.nutrientName || '') && /kcal/i.test(n.unitName || ''));
  const pick = kcal.find(n => String(n.nutrientNumber) === '208') || kcal.find(n => String(n.nutrientNumber) === '958') || kcal[0];
  return pick ? num(pick.value) : null;
}
function usdaNutr(list, number, namePrefix) {
  const hit = (list || []).find(n => String(n.nutrientNumber) === number)
    || (list || []).find(n => (n.nutrientName || '').toLowerCase().startsWith(namePrefix));
  return hit ? num(hit.value) : null;
}
async function searchUsda(q) {
  const key = process.env.USDA_API_KEY || 'DEMO_KEY';
  const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?' + new URLSearchParams({
    api_key: key, query: q, pageSize: '25',
    dataType: 'Survey (FNDDS),Foundation,SR Legacy,Branded'
  });
  const t = withTimeout(7000);
  try {
    const r = await fetch(url, { signal: t.signal, headers: { 'User-Agent': UA } });
    if (r.status === 429) throw new Error('USDA search limit reached. Add a free USDA_API_KEY in Vercel.');
    if (!r.ok) throw new Error(`USDA search failed (${r.status})`);
    const j = await r.json();
    return (j.foods || []).map(f => {
      const n = f.foodNutrients || [];
      const cal = usdaEnergy(n);
      if (cal == null) return null;
      let serving = null;
      const unit = String(f.servingSizeUnit || '').toLowerCase();
      if (f.servingSize && /^(g|grm|ml|mlt)$/.test(unit)) {
        const grams = r1(num(f.servingSize));
        const house = f.householdServingFullText ? tidy(f.householdServingFullText) : '';
        serving = { grams, label: house ? `${house} (${grams} g)` : `${grams} g` };
      } else if (Array.isArray(f.foodMeasures) && f.foodMeasures.length) {
        const m = f.foodMeasures.find(m => m.gramWeight && !/quantity not specified/i.test(m.disseminationText || '')) || f.foodMeasures.find(m => m.gramWeight);
        if (m) serving = { grams: r1(num(m.gramWeight)), label: `${m.disseminationText} (${r1(num(m.gramWeight))} g)` };
      }
      return {
        name: tidy(f.description),
        brand: tidy(f.brandName || f.brandOwner || ''),
        source: 'USDA',
        per100: { cal: r1(cal), p: r1(usdaNutr(n, '203', 'protein')), c: r1(usdaNutr(n, '205', 'carbohydrate')), f: r1(usdaNutr(n, '204', 'total lipid')) },
        serving
      };
    }).filter(Boolean);
  } finally { t.done(); }
}

// ---------- Open Food Facts ----------
async function searchOff(q) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?' + new URLSearchParams({
    search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '15',
    fields: 'product_name,brands,nutriments,serving_size,serving_quantity'
  });
  const t = withTimeout(7000);
  try {
    const r = await fetch(url, { signal: t.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Open Food Facts search failed (${r.status})`);
    const j = await r.json();
    return (j.products || []).map(p => {
      const n = p.nutriments || {};
      let cal = num(n['energy-kcal_100g']);
      if (cal == null && num(n.energy_100g) != null) cal = num(n.energy_100g) / 4.184;
      if (cal == null || !p.product_name) return null;
      const grams = num(p.serving_quantity);
      return {
        name: tidy(p.product_name),
        brand: tidy(String(p.brands || '').split(',')[0]),
        source: 'Open Food Facts',
        per100: { cal: r1(cal), p: r1(num(n.proteins_100g)), c: r1(num(n.carbohydrates_100g)), f: r1(num(n.fat_100g)) },
        serving: grams ? { grams: r1(grams), label: p.serving_size ? `${tidy(p.serving_size)}` : `${r1(grams)} g` } : null
      };
    }).filter(Boolean);
  } finally { t.done(); }
}

module.exports = async (req, res) => {
  const q = String((req.query && req.query.q) || '').trim().slice(0, 100);
  res.setHeader('Content-Type', 'application/json');
  if (q.length < 2) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Type at least 2 letters to search.' })); }

  const [usda, off] = await Promise.allSettled([searchUsda(q), searchOff(q)]);
  const notes = [];
  if (usda.status === 'rejected') notes.push(usda.reason && usda.reason.name === 'AbortError' ? 'USDA was slow to answer.' : String(usda.reason && usda.reason.message || usda.reason));
  if (off.status === 'rejected') notes.push(off.reason && off.reason.name === 'AbortError' ? 'Open Food Facts was slow to answer.' : String(off.reason && off.reason.message || off.reason));

  // USDA first (best for everyday foods), then branded products; drop duplicates.
  const seen = new Set();
  const results = [...(usda.value || []), ...(off.value || [])].filter(r => {
    const k = (r.name + '|' + r.brand).toLowerCase();
    if (seen.has(k)) return false; seen.add(k); return true;
  }).slice(0, 25);

  if (!results.length && notes.length === 2) { res.statusCode = 502; return res.end(JSON.stringify({ error: 'The food databases didn’t answer. Try again in a minute.', notes })); }
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.end(JSON.stringify({ results, notes }));
};
