// Google Apps Script cho Rau Má Mix POS (tự tách tab Orders_YYYY_MM)
const SEED_DATA = {
  "categories": [
    {
      "id": "cat-1",
      "name": "Rau má đậu xanh sữa dừa"
    },
    {
      "id": "cat-2",
      "name": "Rau má sầu riêng"
    },
    {
      "id": "cat-3",
      "name": "Rau má khoai môn sữa dừa"
    },
    {
      "id": "cat-4",
      "name": "Combo"
    },
    {
      "id": "cat-5",
      "name": "Rau má nước dừa xiêm"
    },
    {
      "id": "cat-6",
      "name": "Rau má nguyên chất"
    },
    {
      "id": "cat-7",
      "name": "Nước dừa xiêm"
    },
    {
      "id": "cat-8",
      "name": "TRÀ TRÁI CÂY"
    },
    {
      "id": "cat-9",
      "name": "Trà bí đao"
    }
  ],
  "sizes": [
    {
      "id": "sz-m",
      "name": "Size M",
      "shortName": "M",
      "extraPrice": 0
    },
    {
      "id": "sz-l",
      "name": "Size L",
      "shortName": "L",
      "extraPrice": 5000
    }
  ],
  "products": [
    {
      "id": "ITEM-PZC3",
      "name": "Rau má đậu xanh sữa dừa",
      "category": "Rau má đậu xanh sữa dừa",
      "price": 25000,
      "active": true,
      "channelPrices": {
        "Mang về": 25000,
        "Shopee": 30000,
        "Grab": 30000,
        "Be": 30000,
        "Xanh": 30000
      }
    },
    {
      "id": "ITEM-64TC",
      "name": "Rau má đậu xanh sữa dừa thạch lá dứa",
      "category": "Rau má đậu xanh sữa dừa",
      "price": 30000,
      "active": true,
      "channelPrices": {
        "Mang về": 30000,
        "Shopee": 35000,
        "Grab": 35000,
        "Be": 35000,
        "Xanh": 35000
      }
    },
    {
      "id": "ITEM-PILV",
      "name": "Rau má đậu xanh sữa dừa nha đam",
      "category": "Rau má đậu xanh sữa dừa",
      "price": 30000,
      "active": true,
      "channelPrices": {
        "Mang về": 30000,
        "Shopee": 36000,
        "Grab": 36000,
        "Be": 36000,
        "Xanh": 36000
      }
    },
    {
      "id": "ITEM-EKW7",
      "name": "Rau má sầu riêng sữa dừa tươi",
      "category": "Rau má sầu riêng",
      "price": 33000,
      "active": true,
      "channelPrices": {
        "Mang về": 33000,
        "Shopee": 35000,
        "Grab": 35000,
        "Be": 35000,
        "Xanh": 35000
      }
    },
    {
      "id": "ITEM-85QV",
      "name": "Rau má khoai môn sầu riêng sữa dừa tươi",
      "category": "Rau má sầu riêng",
      "price": 35000,
      "active": true,
      "channelPrices": {
        "Mang về": 35000,
        "Shopee": 40000,
        "Grab": 40000,
        "Be": 40000,
        "Xanh": 40000
      }
    },
    {
      "id": "ITEM-CXQ6",
      "name": "Rau má đậu xanh sầu riêng",
      "category": "Rau má sầu riêng",
      "price": 35000,
      "active": true,
      "channelPrices": {
        "Mang về": 35000,
        "Shopee": 40000,
        "Grab": 40000,
        "Be": 40000,
        "Xanh": 40000
      }
    },
    {
      "id": "ITEM-5F7W",
      "name": "Rau má khoai môn sữa dừa",
      "category": "Rau má khoai môn sữa dừa",
      "price": 28000,
      "active": true,
      "channelPrices": {
        "Mang về": 28000,
        "Shopee": 33000,
        "Grab": 33000,
        "Be": 33000,
        "Xanh": 33000
      }
    },
    {
      "id": "ITEM-X7PK",
      "name": "Rau má khoai môn sữa dừa nha đam",
      "category": "Rau má khoai môn sữa dừa",
      "price": 33000,
      "active": true,
      "channelPrices": {
        "Mang về": 33000,
        "Shopee": 39000,
        "Grab": 39000,
        "Be": 39000,
        "Xanh": 39000
      }
    },
    {
      "id": "ITEM-FK9Q",
      "name": "Rau má khoai môn sữa dừa thạch lá dứa",
      "category": "Rau má khoai môn sữa dừa",
      "price": 33000,
      "active": true,
      "channelPrices": {
        "Mang về": 33000,
        "Shopee": 38000,
        "Grab": 38000,
        "Be": 38000,
        "Xanh": 38000
      }
    },
    {
      "id": "ITEM-YDZ2",
      "name": "Combo 1 rau má đậu xanh sữa dừa nha đam đậu đỏ trân châu",
      "category": "Combo",
      "price": 38000,
      "active": true,
      "channelPrices": {
        "Mang về": 38000,
        "Shopee": 43000,
        "Grab": 43000,
        "Be": 43000,
        "Xanh": 43000
      }
    },
    {
      "id": "ITEM-4800",
      "name": "Combo 2 rau má khoai môn sữa dừa nha đam trân châu thạch lá dứa",
      "category": "Combo",
      "price": 40000,
      "active": true,
      "channelPrices": {
        "Mang về": 40000,
        "Shopee": 43000,
        "Grab": 43000,
        "Be": 43000,
        "Xanh": 43000
      }
    },
    {
      "id": "ITEM-OY8P",
      "name": "Rau má dừa xiêm",
      "category": "Rau má nước dừa xiêm",
      "price": 30000,
      "active": true,
      "channelPrices": {
        "Mang về": 30000,
        "Shopee": 37000,
        "Grab": 37000,
        "Be": 37000,
        "Xanh": 37000
      }
    },
    {
      "id": "ITEM-TR85",
      "name": "Rau má dừa xiêm Nha đam",
      "category": "Rau má nước dừa xiêm",
      "price": 35000,
      "active": true,
      "channelPrices": {
        "Mang về": 35000,
        "Shopee": 43000,
        "Grab": 43000,
        "Be": 43000,
        "Xanh": 43000
      }
    },
    {
      "id": "ITEM-GRSD",
      "name": "Rau má nguyên chất nha đam",
      "category": "Rau má nguyên chất",
      "price": 25000,
      "active": true,
      "channelPrices": {
        "Mang về": 25000,
        "Shopee": 30000,
        "Grab": 30000,
        "Be": 30000,
        "Xanh": 30000
      }
    },
    {
      "id": "ITEM-4WBH",
      "name": "Rau má sữa dừa",
      "category": "Rau má nguyên chất",
      "price": 25000,
      "active": true,
      "channelPrices": {
        "Mang về": 25000,
        "Shopee": 28000,
        "Grab": 28000,
        "Be": 28000,
        "Xanh": 28000
      }
    },
    {
      "id": "ITEM-GWDD",
      "name": "Rau má nguyên chất",
      "category": "Rau má nguyên chất",
      "price": 18000,
      "active": true,
      "channelPrices": {
        "Mang về": 18000,
        "Shopee": 20000,
        "Grab": 20000,
        "Be": 20000,
        "Xanh": 20000
      }
    },
    {
      "id": "ITEM-MOGW",
      "name": "Nước dừa xiêm hạt chia (L)",
      "category": "Nước dừa xiêm",
      "price": 50000,
      "active": true,
      "channelPrices": {
        "Mang về": 50000,
        "Shopee": 55000,
        "Grab": 55000,
        "Be": 55000,
        "Xanh": 55000
      }
    },
    {
      "id": "ITEM-P6ZL",
      "name": "Nước dừa xiêm hạt đác hạt chia (L)",
      "category": "Nước dừa xiêm",
      "price": 58000,
      "active": true,
      "channelPrices": {
        "Mang về": 58000,
        "Shopee": 65000,
        "Grab": 65000,
        "Be": 65000,
        "Xanh": 65000
      }
    },
    {
      "id": "ITEM-RBST",
      "name": "Nước dừa xiêm thạch dừa (L)",
      "category": "Nước dừa xiêm",
      "price": 55000,
      "active": true,
      "channelPrices": {
        "Mang về": 55000,
        "Shopee": 63000,
        "Grab": 63000,
        "Be": 63000,
        "Xanh": 63000
      }
    },
    {
      "id": "ITEM-YN8A",
      "name": "Nước dừa xiêm nha đam (L)",
      "category": "Nước dừa xiêm",
      "price": 53000,
      "active": true,
      "channelPrices": {
        "Mang về": 53000,
        "Shopee": 63000,
        "Grab": 63000,
        "Be": 63000,
        "Xanh": 63000
      }
    },
    {
      "id": "ITEM-13N3",
      "name": "Nước dừa xiêm nha đam hạt chia (L)",
      "category": "Nước dừa xiêm",
      "price": 50000,
      "active": true,
      "channelPrices": {
        "Mang về": 50000,
        "Shopee": 63000,
        "Grab": 63000,
        "Be": 63000,
        "Xanh": 63000
      }
    },
    {
      "id": "ITEM-6LF3",
      "name": "Nước dừa xiêm trân châu (L)",
      "category": "Nước dừa xiêm",
      "price": 55000,
      "active": true,
      "channelPrices": {
        "Mang về": 55000,
        "Shopee": 60000,
        "Grab": 60000,
        "Be": 60000,
        "Xanh": 60000
      }
    },
    {
      "id": "ITEM-P51Y",
      "name": "Nước dừa xiêm hạt sen (L)",
      "category": "Nước dừa xiêm",
      "price": 65000,
      "active": true,
      "channelPrices": {
        "Mang về": 65000,
        "Shopee": 68000,
        "Grab": 68000,
        "Be": 68000,
        "Xanh": 68000
      }
    },
    {
      "id": "ITEM-V0UU",
      "name": "Trà mãng cầu tươi (M)",
      "category": "TRÀ TRÁI CÂY",
      "price": 35000,
      "active": true,
      "channelPrices": {
        "Mang về": 35000,
        "Shopee": 40000,
        "Grab": 40000,
        "Be": 40000,
        "Xanh": 40000
      }
    },
    {
      "id": "ITEM-SIQ4",
      "name": "Trà mãng cầu tươi (L)",
      "category": "TRÀ TRÁI CÂY",
      "price": 40000,
      "active": true,
      "channelPrices": {
        "Mang về": 40000,
        "Shopee": 40000,
        "Grab": 40000,
        "Be": 40000,
        "Xanh": 40000
      }
    },
    {
      "id": "ITEM-SCHB",
      "name": "Trà trái cây nhiệt đới (M)",
      "category": "TRÀ TRÁI CÂY",
      "price": 33000,
      "active": true,
      "channelPrices": {
        "Mang về": 33000,
        "Shopee": 40000,
        "Grab": 40000,
        "Be": 40000,
        "Xanh": 40000
      }
    },
    {
      "id": "ITEM-KAH5",
      "name": "Trà trái cây nhiệt đới (L)",
      "category": "TRÀ TRÁI CÂY",
      "price": 38000,
      "active": true,
      "channelPrices": {
        "Mang về": 38000,
        "Shopee": 40000,
        "Grab": 40000,
        "Be": 40000,
        "Xanh": 40000
      }
    },
    {
      "id": "ITEM-Y8IP",
      "name": "Trà bí đao sương sáo hạt chia",
      "category": "Trà bí đao",
      "price": 25000,
      "active": true,
      "channelPrices": {
        "Mang về": 25000,
        "Shopee": 30000,
        "Grab": 30000,
        "Be": 30000,
        "Xanh": 30000
      }
    },
    {
      "id": "ITEM-X6DU",
      "name": "Trà bí đao sương sáo yến mạch",
      "category": "Trà bí đao",
      "price": 35000,
      "active": true,
      "channelPrices": {
        "Mang về": 35000,
        "Shopee": 35000,
        "Grab": 35000,
        "Be": 35000,
        "Xanh": 35000
      }
    },
    {
      "id": "ITEM-SR8Q",
      "name": "Trà đào",
      "category": "Trà bí đao",
      "price": 30000,
      "active": true
    },
    {
      "id": "ITEM-0O9X",
      "name": "Trà bí đao sữa sương sáo hạt chia",
      "category": "Trà bí đao",
      "price": 33000,
      "active": true,
      "channelPrices": {
        "Mang về": 33000,
        "Shopee": 35000,
        "Grab": 35000,
        "Be": 35000,
        "Xanh": 35000
      }
    },
    {
      "id": "ITEM-VK47",
      "name": "Trà sâm thảo dược (L)",
      "category": "Trà bí đao",
      "price": 33000,
      "active": true
    },
    {
      "id": "ITEM-AU8C",
      "name": "Trà sâm thảo dược (M)",
      "category": "Trà bí đao",
      "price": 25000,
      "active": true
    }
  ],
  "toppings": [
    {
      "id": "ITEM-YYIE",
      "name": "Thạch Dừa",
      "price": 8000,
      "active": true
    },
    {
      "id": "ITEM-UT0A",
      "name": "Thạch Lá Dứa",
      "price": 8000,
      "active": true
    },
    {
      "id": "ITEM-LPJ9",
      "name": "Trân Châu Trắng",
      "price": 8000,
      "active": true
    },
    {
      "id": "ITEM-HEE4",
      "name": "Thạch Củ Năng",
      "price": 6000,
      "active": true
    },
    {
      "id": "ITEM-EXMV",
      "name": "Nha Đam Tươi",
      "price": 8000,
      "active": true
    },
    {
      "id": "ITEM-0NYC",
      "name": "Đậu đỏ",
      "price": 8000,
      "active": true
    },
    {
      "id": "ITEM-VJ3C",
      "name": "Thạch Khoai Môn",
      "price": 10000,
      "active": true
    },
    {
      "id": "ITEM-0NP3",
      "name": "Đậu Xanh",
      "price": 10000,
      "active": true
    },
    {
      "id": "ITEM-PUS5",
      "name": "Hạt đác",
      "price": 12000,
      "active": true
    },
    {
      "id": "ITEM-XOYQ",
      "name": "Yến mạch",
      "price": 10000,
      "active": true
    },
    {
      "id": "ITEM-Q2XY",
      "name": "Sương sáo",
      "price": 8000,
      "active": true
    },
    {
      "id": "ITEM-QJ4Z",
      "name": "Trân châu củ năng",
      "price": 12000,
      "active": true
    },
    {
      "id": "ITEM-NKYK",
      "name": "Trân châu dừa non",
      "price": 12000,
      "active": true
    },
    {
      "id": "ITEM-LJF5",
      "name": "Hạt sen",
      "price": 12000,
      "active": true
    },
    {
      "id": "ITEM-JZUN",
      "name": "Khúc bạch khoai môn sữa",
      "price": 10000,
      "active": true
    }
  ],
  "orders": [
    {
      "id": "7adf1af0-1877-461f-ad83-7a3a3cd152a0",
      "orderCode": "#004",
      "createdAt": "2026-11-18T04:08:01.317Z",
      "dateKey": "2026-11-18",
      "orderType": "Shopee",
      "paymentMethod": "Tiền mặt",
      "items": [
        {
          "key": "ITEM-YN8A|L|100%|100%||",
          "productId": "ITEM-YN8A",
          "productName": "Nước dừa xiêm nha đam (L)",
          "size": "L",
          "sizeExtra": 5000,
          "sugar": "100%",
          "ice": "100%",
          "toppings": [],
          "note": "",
          "unitPrice": 58000,
          "quantity": 2
        }
      ],
      "subtotal": 116000,
      "discount": 0,
      "total": 116000,
      "cashReceived": 116000,
      "changeAmount": 0,
      "note": "",
      "status": "completed"
    }
  ]
};

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) sh.appendRow(headers);
  }
  return sh;
}

function ensureSeeded() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('Products')) {
    const catSh = getOrCreateSheet(ss, 'Categories', ['id', 'name']);
    SEED_DATA.categories.forEach(c => catSh.appendRow([c.id, c.name]));

    const szSh = getOrCreateSheet(ss, 'Sizes', ['id', 'name', 'shortName', 'extraPrice']);
    SEED_DATA.sizes.forEach(s => szSh.appendRow([s.id, s.name, s.shortName, s.extraPrice]));

    const pSh = getOrCreateSheet(ss, 'Products', ['id', 'name', 'category', 'price', 'channelPrices', 'active']);
    SEED_DATA.products.forEach(p => pSh.appendRow([
      p.id, p.name, p.category, p.price, p.channelPrices ? JSON.stringify(p.channelPrices) : '', p.active !== false
    ]));

    const tpSh = getOrCreateSheet(ss, 'Toppings', ['id', 'name', 'price', 'active']);
    SEED_DATA.toppings.forEach(t => tpSh.appendRow([t.id, t.name, t.price, t.active !== false]));

    SEED_DATA.orders.forEach(o => appendOrderRow(ss, o));
  }
  return ss;
}

function getOrderSheetName(dateKey) {
  return 'Orders_' + String(dateKey).slice(0, 7).replace('-', '_');
}

function appendOrderRow(ss, o) {
  const sh = getOrCreateSheet(ss, getOrderSheetName(o.dateKey), [
    'id', 'orderCode', 'createdAt', 'dateKey', 'orderType', 'paymentMethod',
    'total', 'status', 'itemsJSON', 'note'
  ]);
  sh.appendRow([
    o.id, o.orderCode, o.createdAt, o.dateKey, o.orderType, o.paymentMethod,
    o.total, o.status, JSON.stringify(o.items), o.note || ''
  ]);
}

function readSheetObjects(sh) {
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function getMenuPayload(ss) {
  const categories = readSheetObjects(ss.getSheetByName('Categories')).map(c => ({ id: String(c.id), name: String(c.name) }));
  const sizes = readSheetObjects(ss.getSheetByName('Sizes')).map(s => ({
    id: String(s.id), name: String(s.name), shortName: String(s.shortName), extraPrice: Number(s.extraPrice) || 0
  }));
  const products = readSheetObjects(ss.getSheetByName('Products')).map(p => ({
    id: String(p.id),
    name: String(p.name),
    category: String(p.category),
    price: Number(p.price) || 0,
    ...(p.channelPrices ? { channelPrices: JSON.parse(p.channelPrices) } : {}),
    active: p.active === true || p.active === 'TRUE' || p.active === 'true'
  }));
  const toppings = readSheetObjects(ss.getSheetByName('Toppings')).map(t => ({
    id: String(t.id), name: String(t.name), price: Number(t.price) || 0,
    active: t.active === true || t.active === 'TRUE' || t.active === 'true'
  }));
  return { categories, sizes, products, toppings };
}

function getMonthSheetNamesBetween(from, to) {
  const names = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const [ey, em] = to.slice(0, 7).split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    names.push('Orders_' + y + '_' + String(m).padStart(2, '0'));
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return names;
}

function getRevenuePayload(ss, from, to) {
  const sheetNames = getMonthSheetNamesBetween(from, to);
  let rangeOrders = [];
  sheetNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    readSheetObjects(sh).forEach(r => {
      const dk = String(r.dateKey).slice(0, 10);
      if (dk >= from && dk <= to) {
        rangeOrders.push({
          id: String(r.id),
          orderCode: String(r.orderCode),
          createdAt: String(r.createdAt),
          dateKey: dk,
          orderType: String(r.orderType),
          paymentMethod: String(r.paymentMethod),
          total: Number(r.total) || 0,
          status: String(r.status || 'completed'),
          items: JSON.parse(r.itemsJSON || '[]'),
          note: String(r.note || '')
        });
      }
    });
  });

  const completed = rangeOrders.filter(o => o.status !== 'cancelled');
  let totalRevenue = 0, totalCups = 0;
  const byPaymentMethod = {}, byOrderType = {}, prodMap = {};
  completed.forEach(o => {
    totalRevenue += o.total;
    byPaymentMethod[o.paymentMethod] = (byPaymentMethod[o.paymentMethod] || 0) + o.total;
    byOrderType[o.orderType] = (byOrderType[o.orderType] || 0) + o.total;
    o.items.forEach(it => {
      const q = Number(it.quantity) || 1;
      totalCups += q;
      if (!prodMap[it.productName]) prodMap[it.productName] = { name: it.productName, quantity: 0, revenue: 0 };
      prodMap[it.productName].quantity += q;
      prodMap[it.productName].revenue += (Number(it.unitPrice) || 0) * q;
    });
  });
  const topProducts = Object.values(prodMap).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  rangeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    from, to, totalRevenue,
    orderCount: completed.length,
    cancelledCount: rangeOrders.length - completed.length,
    totalCups,
    avgOrderValue: completed.length ? Math.round(totalRevenue / completed.length) : 0,
    byPaymentMethod, byOrderType, topProducts, orders: rangeOrders
  };
}

function doGet(e) {
  const ss = ensureSeeded();
  const action = (e && e.parameter && e.parameter.action) || 'menu';
  if (action === 'menu') return jsonOut(getMenuPayload(ss));
  if (action === 'revenue') {
    const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    return jsonOut(getRevenuePayload(ss, e.parameter.from || today, e.parameter.to || today));
  }
  return jsonOut({ ok: true });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = ensureSeeded();
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'createOrder') {
      const now = new Date();
      const dateKey = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      const sh = getOrCreateSheet(ss, getOrderSheetName(dateKey), [
        'id', 'orderCode', 'createdAt', 'dateKey', 'orderType', 'paymentMethod',
        'total', 'status', 'itemsJSON', 'note'
      ]);
      const rows = readSheetObjects(sh);
      const todayCount = rows.filter(r => String(r.dateKey).slice(0, 10) === dateKey).length;
      const items = body.items || [];
      const subtotal = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.quantity), 0);
      const order = {
        id: Utilities.getUuid(),
        orderCode: '#' + String(todayCount + 1).padStart(3, '0'),
        createdAt: now.toISOString(),
        dateKey,
        orderType: body.orderType || 'Mang về',
        paymentMethod: body.paymentMethod || 'Tiền mặt',
        items,
        total: subtotal,
        note: body.note || '',
        status: 'completed'
      };
      appendOrderRow(ss, order);
      return jsonOut(order);
    }

    if (action === 'cancelOrder') {
      const sheets = ss.getSheets().filter(s => s.getName().startsWith('Orders_'));
      for (const sh of sheets) {
        const vals = sh.getDataRange().getValues();
        const statusCol = vals[0].indexOf('status') + 1;
        for (let r = 1; r < vals.length; r++) {
          if (String(vals[r][0]) === String(body.id)) {
            sh.getRange(r + 1, statusCol).setValue('cancelled');
            return jsonOut({ ok: true });
          }
        }
      }
      return jsonOut({ error: 'Không tìm thấy đơn' });
    }

    if (action === 'createProduct') {
      const pSh = ss.getSheetByName('Products');
      const p = {
        id: 'p-' + Utilities.getUuid().slice(0, 6),
        name: String(body.name || '').trim(),
        category: String(body.category || 'Rau má đậu xanh sữa dừa').trim(),
        price: Number(body.price) || 0,
        active: true
      };
      pSh.appendRow([p.id, p.name, p.category, p.price, '', true]);
      return jsonOut(p);
    }

    if (action === 'updateProduct') {
      const pSh = ss.getSheetByName('Products');
      const vals = pSh.getDataRange().getValues();
      const headers = vals[0];
      for (let r = 1; r < vals.length; r++) {
        if (String(vals[r][0]) === String(body.id)) {
          if (body.active !== undefined) pSh.getRange(r + 1, headers.indexOf('active') + 1).setValue(Boolean(body.active));
          if (body.price !== undefined) pSh.getRange(r + 1, headers.indexOf('price') + 1).setValue(Number(body.price));
          return jsonOut({ ok: true });
        }
      }
      return jsonOut({ error: 'Không tìm thấy món' });
    }

    if (action === 'deleteProduct') {
      const pSh = ss.getSheetByName('Products');
      const vals = pSh.getDataRange().getValues();
      for (let r = 1; r < vals.length; r++) {
        if (String(vals[r][0]) === String(body.id)) {
          pSh.deleteRow(r + 1);
          return jsonOut({ ok: true });
        }
      }
      return jsonOut({ ok: true });
    }

    if (action === 'createCategory') {
      const cSh = ss.getSheetByName('Categories');
      const c = { id: 'cat-' + Utilities.getUuid().slice(0, 5), name: String(body.name || '').trim() };
      cSh.appendRow([c.id, c.name]);
      return jsonOut(c);
    }

    if (action === 'deleteCategory') {
      const cSh = ss.getSheetByName('Categories');
      const vals = cSh.getDataRange().getValues();
      for (let r = 1; r < vals.length; r++) {
        if (String(vals[r][0]) === String(body.id)) {
          cSh.deleteRow(r + 1);
          return jsonOut({ ok: true });
        }
      }
      return jsonOut({ ok: true });
    }

    return jsonOut({ error: 'Unknown action' });
  } finally {
    lock.releaseLock();
  }
}
