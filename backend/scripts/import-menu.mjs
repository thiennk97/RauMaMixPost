import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const HTML_PATH = path.join(ROOT, 'menu.html');
const DB_PATH = path.join(ROOT, 'backend', 'data', 'db.json');

const html = fs.readFileSync(HTML_PATH, 'utf-8');
const rows = html.split('<tr ').slice(1);

const rawItems = [];
for (const r of rows) {
  if (!r.includes('tr-content')) continue;
  const tds = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  );
  if (tds.length < 15) continue;
  const price = Number(tds[3].replace(/[^\d]/g, '')) || 0;
  rawItems.push({
    code: tds[1],
    name: tds[2],
    price,
    category: tds[5],
    role: tds[9],
    active: tds[14] === 'Active'
  });
}

const isSugarOrIce = (name) => /^(Đường|Đá|Không đường|Không đá|Ít đường|Ít đá)/i.test(name);
const isTopping = (it) =>
  it.name.startsWith('TP -') || it.category === 'Topping';

// 1. Extract active toppings
const toppings = [];
const seenTopping = new Set();
for (const it of rawItems) {
  if (!it.active) continue;
  if (isSugarOrIce(it.name)) continue;
  if (!isTopping(it)) continue;
  const cleanName = it.name.replace(/^TP\s*-\s*/i, '').trim();
  if (seenTopping.has(cleanName.toLowerCase())) continue;
  seenTopping.add(cleanName.toLowerCase());
  toppings.push({
    id: it.code,
    name: cleanName,
    price: it.price,
    active: true
  });
}

// 2. Extract products (merge M / L variants into single base product with M price)
const productMap = new Map();
for (const it of rawItems) {
  if (!it.active) continue;
  if (isSugarOrIce(it.name) || isTopping(it)) continue;

  const isL = /\s+L$/i.test(it.name);
  const isM = /\s+M$/i.test(it.name);
  const baseName = it.name.replace(/\s+[ML]$/i, '').trim();
  const key = baseName.toLowerCase();
  const category = it.category === 'Uncategory' ? 'Đồ uống khác' : it.category;

  const existing = productMap.get(key);
  if (!existing) {
    productMap.set(key, {
      id: it.code,
      name: baseName,
      category,
      price: isL && it.price >= 5000 ? it.price - 5000 : it.price,
      active: true,
      _hasM: isM,
      _hasPrice: it.price > 0
    });
  } else {
    // Prefer M price or non-zero price over 0đ parent row
    if (isM && it.price > 0) {
      existing.price = it.price;
      existing.id = it.code;
      existing._hasM = true;
      existing._hasPrice = true;
    } else if (!existing._hasPrice && it.price > 0) {
      existing.price = isL && it.price >= 5000 ? it.price - 5000 : it.price;
      existing._hasPrice = true;
    }
    if (existing.category === 'Đồ uống khác' && category !== 'Đồ uống khác') {
      existing.category = category;
    }
  }
}

const DROP_CATEGORIES = new Set([
  'Đồ uống khác',
  'Rau má hoa quả',
  'Rau má bơ, chanh leo'
]);
const hasBiDo = (s) => /bí\s*đỏ/i.test(s || '');

const products = Array.from(productMap.values())
  .filter((p) => p.price > 0 && !DROP_CATEGORIES.has(p.category) && !hasBiDo(p.category) && !hasBiDo(p.name))
  .map(({ _hasM, _hasPrice, ...rest }) => rest);

const filteredToppings = toppings.filter((t) => !hasBiDo(t.name));

const catNames = Array.from(new Set(products.map((p) => p.category)));
const categories = catNames.map((name, i) => ({ id: `cat-${i + 1}`, name }));

const sizes = [
  { id: 'sz-m', name: 'Size M', shortName: 'M', extraPrice: 0 },
  { id: 'sz-l', name: 'Size L', shortName: 'L', extraPrice: 5000 }
];

let existingOrders = [];
if (fs.existsSync(DB_PATH)) {
  try {
    existingOrders = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')).orders || [];
  } catch {}
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.writeFileSync(
  DB_PATH,
  JSON.stringify({ categories, sizes, products, toppings: filteredToppings, orders: existingOrders }, null, 2),
  'utf-8'
);

console.log(`Imported ${categories.length} categories, ${products.length} products, ${filteredToppings.length} toppings.`);
console.log('Categories:', catNames.join(' | '));
