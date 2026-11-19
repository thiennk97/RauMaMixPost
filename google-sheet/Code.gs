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

function getMasterSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getTargetSpreadsheet(spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  const ss = id ? SpreadsheetApp.openById(id) : getMasterSpreadsheet();
  return ensureStoreSeeded(ss);
}

function ensureStoreSheet(ss) {
  const sh = getOrCreateSheet(ss, 'Stores', STORE_HEADERS);
  ensureSheetHeaders(sh, STORE_HEADERS);
  if (sh.getLastRow() < 2) {
    sh.appendRow([
      'default',
      'Nguyễn Chánh',
      ss.getId(),
      true,
      new Date().toISOString()
    ]);
  }
  return sh;
}

function appendRowByHeaders(sh, defaultHeaders, rowObj) {
  ensureSheetHeaders(sh, defaultHeaders);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(headers.map(h => (rowObj[h] !== undefined ? rowObj[h] : '')));
}

function ensureStoreAdminSheet(ss) {
  const sh = getOrCreateSheet(ss, 'Admins', STORE_ADMIN_HEADERS);
  ensureSheetHeaders(sh, STORE_ADMIN_HEADERS);
  return sh;
}

function ensureAdminSheet(ss) {
  const sh = getOrCreateSheet(ss, 'Admins', ADMIN_HEADERS);
  ensureSheetHeaders(sh, ADMIN_HEADERS);
  if (sh.getLastRow() < 2) {
    const now = new Date().toISOString();
    DEFAULT_USERS.forEach(u => {
      appendRowByHeaders(sh, ADMIN_HEADERS, {
        username: u.username,
        password: u.password,
        role: u.role,
        storeId: u.storeId,
        active: u.active !== false,
        createdAt: now
      });
    });
  }
  return sh;
}

function copyMenuFromDefaultStore(masterSs, targetSs) {
  if (targetSs.getId() === masterSs.getId()) {
    ensureStoreSeeded(targetSs);
    return;
  }
  const stores = getStoresList(masterSs);
  const defaultStore = stores.find(s => s.id === 'default') || stores[0];
  let sourceSs = masterSs;
  if (defaultStore && defaultStore.spreadsheetId && defaultStore.spreadsheetId !== masterSs.getId()) {
    try {
      sourceSs = SpreadsheetApp.openById(defaultStore.spreadsheetId);
    } catch (_err) {
      sourceSs = masterSs;
    }
  }
  ensureStoreSeeded(sourceSs);

  const menuSheets = ['Categories', 'Sizes', 'Products', 'Toppings'];
  menuSheets.forEach(sheetName => {
    const srcSh = sourceSs.getSheetByName(sheetName);
    if (!srcSh || srcSh.getLastRow() === 0) return;
    const vals = srcSh.getDataRange().getValues();
    let dstSh = targetSs.getSheetByName(sheetName);
    if (!dstSh) {
      dstSh = targetSs.insertSheet(sheetName);
    } else if (dstSh.getLastRow() > 0) {
      return; // Không ghi đè nếu sheet đích đã có dữ liệu
    }
    dstSh.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
  });

  // Xoá sheet mặc định trống ("Sheet1" / "Trang tính1") nếu có
  const defaultEmpty = targetSs.getSheets().find(s =>
    (s.getName() === 'Sheet1' || s.getName() === 'Trang tính1') && s.getLastRow() === 0
  );
  if (defaultEmpty && targetSs.getSheets().length > 1) {
    targetSs.deleteSheet(defaultEmpty);
  }
}

function ensureStoreSeeded(ss) {
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

function ensureSeeded() {
  const ss = getMasterSpreadsheet();
  ensureStoreSeeded(ss);
  ensureStoreSheet(ss);
  ensureAdminSheet(ss);
  return ss;
}

function formatDateKey(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  }
  return String(val || '').slice(0, 10);
}

function getOrderSheetName(dateKey) {
  return 'Orders_' + formatDateKey(dateKey).slice(0, 7).replace('-', '_');
}

const ORDER_HEADERS = [
  'id', 'orderCode', 'createdAt', 'dateKey', 'orderType', 'paymentMethod',
  'total', 'status', 'itemsJSON', 'note', 'shiftId'
];

const SHIFT_HEADERS = [
  'id', 'dateKey', 'shiftName', 'openedBy', 'openedAt', 'openingCash',
  'closedBy', 'closedAt', 'actualCash', 'expectedCash', 'cashDiff',
  'totalOrders', 'cancelledOrders', 'totalRevenue', 'byPaymentJSON',
  'byOrderTypeJSON', 'note', 'status'
];

const STORE_HEADERS = ['id', 'name', 'spreadsheetId', 'active', 'createdAt'];
const STORE_ADMIN_HEADERS = ['username', 'password', 'role', 'active', 'createdAt'];
const ADMIN_HEADERS = ['username', 'password', 'role', 'storeId', 'active', 'createdAt'];
const DEFAULT_USERS = [
  {
    username: 'admin',
    password: '0912Thien',
    role: 'superadmin',
    storeId: '*',
    active: true
  },
  {
    username: 'member',
    password: '1234JQK@#$',
    role: 'staff',
    storeId: 'default',
    active: true
  }
];

function ensureSheetHeaders(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    return;
  }
  const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  headers.forEach(h => {
    if (existing.indexOf(h) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
      existing.push(h);
    }
  });
}

function appendOrderRow(ss, o) {
  const sh = getOrCreateSheet(ss, getOrderSheetName(o.dateKey), ORDER_HEADERS);
  ensureSheetHeaders(sh, ORDER_HEADERS);
  sh.appendRow([
    o.id, o.orderCode, o.createdAt, o.dateKey, o.orderType, o.paymentMethod,
    o.total, o.status, JSON.stringify(o.items), o.note || '', o.shiftId || ''
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

function serializeShift(r) {
  return {
    id: String(r.id),
    dateKey: formatDateKey(r.dateKey),
    shiftName: String(r.shiftName || ''),
    openedBy: String(r.openedBy || ''),
    openedAt: String(r.openedAt || ''),
    openingCash: Number(r.openingCash) || 0,
    closedBy: String(r.closedBy || ''),
    closedAt: String(r.closedAt || ''),
    actualCash: r.actualCash === '' || r.actualCash === undefined ? null : Number(r.actualCash),
    expectedCash: Number(r.expectedCash) || 0,
    cashDiff: Number(r.cashDiff) || 0,
    totalOrders: Number(r.totalOrders) || 0,
    cancelledOrders: Number(r.cancelledOrders) || 0,
    totalRevenue: Number(r.totalRevenue) || 0,
    byPaymentMethod: r.byPaymentJSON ? JSON.parse(r.byPaymentJSON) : {},
    byOrderType: r.byOrderTypeJSON ? JSON.parse(r.byOrderTypeJSON) : {},
    note: String(r.note || ''),
    status: String(r.status || 'open')
  };
}

function computeShiftStats(ss, shift) {
  const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const from = shift.dateKey || today;
  const to = today >= from ? today : from;
  const sheetNames = getMonthSheetNamesBetween(from, to);
  let totalOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;
  const byPaymentMethod = {};
  const byOrderType = {};

  sheetNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    readSheetObjects(sh).forEach(r => {
      if (String(r.shiftId || '') !== shift.id) return;
      if (String(r.status || 'completed') === 'cancelled') {
        cancelledOrders++;
        return;
      }
      const total = Number(r.total) || 0;
      const pm = String(r.paymentMethod || 'Tiền mặt');
      const ot = String(r.orderType || 'Mang về');
      totalOrders++;
      totalRevenue += total;
      byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + total;
      byOrderType[ot] = (byOrderType[ot] || 0) + total;
    });
  });

  const cashSales = byPaymentMethod['Tiền mặt'] || 0;
  const expectedCash = (Number(shift.openingCash) || 0) + cashSales;
  return {
    ...shift,
    totalOrders,
    cancelledOrders,
    totalRevenue,
    byPaymentMethod,
    byOrderType,
    expectedCash
  };
}

function getCurrentShift(ss) {
  const sh = getOrCreateSheet(ss, 'Shifts', SHIFT_HEADERS);
  ensureSheetHeaders(sh, SHIFT_HEADERS);
  const rows = readSheetObjects(sh).map(serializeShift);
  const openShift = rows.find(s => s.status === 'open');
  return openShift ? computeShiftStats(ss, openShift) : null;
}

function getShiftsInRange(ss, from, to) {
  const sh = getOrCreateSheet(ss, 'Shifts', SHIFT_HEADERS);
  ensureSheetHeaders(sh, SHIFT_HEADERS);
  return readSheetObjects(sh)
    .map(serializeShift)
    .filter(s => s.dateKey >= from && s.dateKey <= to)
    .map(s => (s.status === 'open' ? computeShiftStats(ss, s) : s))
    .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
}

function getRevenuePayload(ss, from, to, shiftId) {
  const sheetNames = getMonthSheetNamesBetween(from, to);
  let rangeOrders = [];
  sheetNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    readSheetObjects(sh).forEach(r => {
      const dk = formatDateKey(r.dateKey);
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
          note: String(r.note || ''),
          shiftId: String(r.shiftId || '')
        });
      }
    });
  });

  if (shiftId) {
    rangeOrders = rangeOrders.filter(o => o.shiftId === shiftId);
  }

  const completed = rangeOrders.filter(o => o.status !== 'cancelled');
  let totalRevenue = 0, totalCups = 0;
  const byPaymentMethod = {}, byOrderType = {}, prodMap = {}, dailyMap = {}, hourlyMap = {};
  completed.forEach(o => {
    totalRevenue += o.total;
    byPaymentMethod[o.paymentMethod] = (byPaymentMethod[o.paymentMethod] || 0) + o.total;
    byOrderType[o.orderType] = (byOrderType[o.orderType] || 0) + o.total;
    if (!dailyMap[o.dateKey]) dailyMap[o.dateKey] = { date: o.dateKey, revenue: 0, orders: 0, cups: 0 };
    dailyMap[o.dateKey].revenue += o.total;
    dailyMap[o.dateKey].orders += 1;

    let hourKey = null;
    if (o.createdAt) {
      const dt = new Date(o.createdAt);
      if (!isNaN(dt.getTime())) {
        hourKey = Number(Utilities.formatDate(dt, 'Asia/Ho_Chi_Minh', 'H'));
      }
    }
    if (hourKey !== null) {
      if (!hourlyMap[hourKey]) hourlyMap[hourKey] = { hour: hourKey, revenue: 0, orders: 0 };
      hourlyMap[hourKey].revenue += o.total;
      hourlyMap[hourKey].orders += 1;
    }

    o.items.forEach(it => {
      const q = Number(it.quantity) || 1;
      totalCups += q;
      dailyMap[o.dateKey].cups += q;
      if (!prodMap[it.productName]) prodMap[it.productName] = { name: it.productName, quantity: 0, revenue: 0 };
      prodMap[it.productName].quantity += q;
      prodMap[it.productName].revenue += (Number(it.unitPrice) || 0) * q;
    });
  });
  const topProducts = Object.values(prodMap).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  const dailySeries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  const hourlySeries = Object.values(hourlyMap).sort((a, b) => a.hour - b.hour);
  rangeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    from, to, shiftId: shiftId || '', totalRevenue,
    orderCount: completed.length,
    cancelledCount: rangeOrders.length - completed.length,
    totalCups,
    avgOrderValue: completed.length ? Math.round(totalRevenue / completed.length) : 0,
    byPaymentMethod, byOrderType, topProducts, dailySeries, hourlySeries, orders: rangeOrders,
    shifts: getShiftsInRange(ss, from, to)
  };
}

// Đặt khóa API_SECRET trong Apps Script: Project Settings -> Script Properties -> API_SECRET
function verifyApiSecret(providedSecret) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_SECRET') || '';
  if (!expected) return true;
  return String(providedSecret || '') === String(expected);
}

function isRowActive(val) {
  return val === true || val === 'TRUE' || val === 'true' || val === '';
}

function getStoresList(masterSs) {
  const sh = ensureStoreSheet(masterSs);
  return readSheetObjects(sh).map(s => ({
    id: String(s.id || '').trim(),
    name: String(s.name || '').trim(),
    spreadsheetId: String(s.spreadsheetId || '').trim(),
    active: isRowActive(s.active),
    createdAt: String(s.createdAt || '')
  })).filter(s => s.id);
}

function getUsersList(masterSs) {
  const result = [];
  const masterId = masterSs.getId();
  const masterSh = ensureAdminSheet(masterSs);
  readSheetObjects(masterSh).forEach(u => {
    const username = String(u.username || '').trim();
    if (!username) return;
    const rawRole = String(u.role || 'admin').trim();
    const rawStoreId = String(u.storeId || '').trim();
    const role = (rawRole === 'admin' && (!rawStoreId || rawStoreId === '*')) ? 'superadmin' : rawRole;
    result.push({
      username,
      role,
      storeId: role === 'superadmin' ? '*' : (rawStoreId || 'default'),
      active: isRowActive(u.active),
      createdAt: String(u.createdAt || '')
    });
  });

  const stores = getStoresList(masterSs);
  stores.forEach(st => {
    if (!st.spreadsheetId || st.spreadsheetId === masterId) return;
    try {
      const storeSs = SpreadsheetApp.openById(st.spreadsheetId);
      const stAdminSh = storeSs.getSheetByName('Admins');
      if (!stAdminSh || stAdminSh.getLastRow() < 2) return;
      readSheetObjects(stAdminSh).forEach(u => {
        const username = String(u.username || '').trim();
        if (!username) return;
        result.push({
          username,
          role: String(u.role || 'staff').trim(),
          storeId: st.id,
          active: isRowActive(u.active),
          createdAt: String(u.createdAt || '')
        });
      });
    } catch (_err) {
      // Bỏ qua nếu không mở được sheet quán
    }
  });

  return result;
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!verifyApiSecret(params.secret)) {
    return jsonOut({ error: 'Unauthorized' });
  }
  const masterSs = ensureSeeded();
  const action = params.action || 'menu';
  if (action === 'stores') return jsonOut({ stores: getStoresList(masterSs) });
  if (action === 'users') return jsonOut({ users: getUsersList(masterSs) });

  const ss = getTargetSpreadsheet(params.spreadsheetId);
  if (action === 'menu') return jsonOut(getMenuPayload(ss));
  if (action === 'currentShift') return jsonOut({ shift: getCurrentShift(ss) });
  if (action === 'shifts') {
    const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    return jsonOut({ shifts: getShiftsInRange(ss, params.from || today, params.to || today) });
  }
  if (action === 'revenue') {
    const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    return jsonOut(getRevenuePayload(ss, params.from || today, params.to || today, params.shiftId || ''));
  }
  return jsonOut({ ok: true });
}

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (!verifyApiSecret(body.secret)) {
    return jsonOut({ error: 'Unauthorized' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const masterSs = ensureSeeded();
    const action = body.action;

    if (action === 'adminLogin') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!username || !password) {
        return jsonOut({ error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' });
      }
      const stores = getStoresList(masterSs);
      const masterId = masterSs.getId();

      // 1. Kiểm tra trên Sheet tổng (superadmin & các tài khoản của quán mặc định)
      const masterSh = ensureAdminSheet(masterSs);
      const masterFound = readSheetObjects(masterSh).find(a =>
        String(a.username || '').trim() === username &&
        String(a.password || '') === password &&
        isRowActive(a.active)
      );
      if (masterFound) {
        const rawRole = String(masterFound.role || 'admin').trim();
        const rawStoreId = String(masterFound.storeId || '').trim();
        const role = (rawRole === 'admin' && (!rawStoreId || rawStoreId === '*')) ? 'superadmin' : rawRole;

        if (role === 'superadmin') {
          const firstActive = stores.find(s => s.active) || stores[0];
          return jsonOut({
            ok: true,
            user: {
              username: String(masterFound.username).trim(),
              role: 'superadmin',
              storeId: '*',
              storeName: 'Tất cả quán',
              spreadsheetId: firstActive ? firstActive.spreadsheetId : masterId
            }
          });
        }

        const targetStoreId = rawStoreId || 'default';
        const store = stores.find(s => s.id === targetStoreId);
        if (!store || !store.active) {
          return jsonOut({ error: 'Quán của tài khoản này đang tạm ngưng hoặc chưa được cấu hình' });
        }
        return jsonOut({
          ok: true,
          user: {
            username: String(masterFound.username).trim(),
            role,
            storeId: store.id,
            storeName: store.name,
            spreadsheetId: store.spreadsheetId
          }
        });
      }

      // 2. Kiểm tra trong tab Admins của từng Sheet quán
      for (let i = 0; i < stores.length; i++) {
        const st = stores[i];
        if (!st.spreadsheetId || st.spreadsheetId === masterId) continue;
        try {
          const storeSs = SpreadsheetApp.openById(st.spreadsheetId);
          const stAdminSh = storeSs.getSheetByName('Admins');
          if (!stAdminSh || stAdminSh.getLastRow() < 2) continue;
          const storeFound = readSheetObjects(stAdminSh).find(a =>
            String(a.username || '').trim() === username &&
            String(a.password || '') === password &&
            isRowActive(a.active)
          );
          if (storeFound) {
            if (!st.active) {
              return jsonOut({ error: 'Quán của tài khoản này đang tạm ngưng hoặc chưa được cấu hình' });
            }
            return jsonOut({
              ok: true,
              user: {
                username: String(storeFound.username).trim(),
                role: String(storeFound.role || 'staff').trim(),
                storeId: st.id,
                storeName: st.name,
                spreadsheetId: st.spreadsheetId
              }
            });
          }
        } catch (_err) {
          // Bỏ qua nếu không đọc được sheet quán
        }
      }

      return jsonOut({ error: 'Sai tài khoản hoặc mật khẩu' });
    }

    if (action === 'createStore') {
      const name = String(body.name || '').trim();
      if (!name) return jsonOut({ error: 'Vui lòng nhập tên quán' });

      const sh = ensureStoreSheet(masterSs);
      const stores = getStoresList(masterSs);
      const id = String(body.id || ('store-' + Utilities.getUuid().slice(0, 6))).trim();
      if (stores.some(s => s.id === id)) {
        return jsonOut({ error: 'Mã quán đã tồn tại' });
      }

      const staffUsername = String(body.staffUsername || '').trim();
      const staffPassword = String(body.staffPassword || '');
      const adminUsername = String(body.adminUsername || '').trim();
      const adminPassword = String(body.adminPassword || '');

      if (!staffUsername || staffPassword.length < 4) {
        return jsonOut({ error: 'Vui lòng nhập tài khoản nhân viên và mật khẩu (>= 4 ký tự)' });
      }
      if (!adminUsername || adminPassword.length < 4) {
        return jsonOut({ error: 'Vui lòng nhập tài khoản admin quán và mật khẩu (>= 4 ký tự)' });
      }
      if (staffUsername === adminUsername) {
        return jsonOut({ error: 'Tài khoản nhân viên và tài khoản admin không được trùng nhau' });
      }

      const adminSh = ensureAdminSheet(masterSs);
      const existingUsers = getUsersList(masterSs);
      if (existingUsers.some(u => u.username === staffUsername)) {
        return jsonOut({ error: 'Tài khoản nhân viên "' + staffUsername + '" đã tồn tại' });
      }
      if (existingUsers.some(u => u.username === adminUsername)) {
        return jsonOut({ error: 'Tài khoản admin "' + adminUsername + '" đã tồn tại' });
      }

      let spreadsheetId = String(body.spreadsheetId || '').trim();
      let targetSs;
      if (!spreadsheetId) {
        targetSs = SpreadsheetApp.create('Rau Má Mix - ' + name);
        copyMenuFromDefaultStore(masterSs, targetSs);
        spreadsheetId = targetSs.getId();
        try {
          const masterParents = DriveApp.getFileById(masterSs.getId()).getParents();
          if (masterParents.hasNext()) {
            DriveApp.getFileById(spreadsheetId).moveTo(masterParents.next());
          }
        } catch (_err) {
          // Bỏ qua nếu chưa cấp quyền DriveApp, file vẫn nằm ở My Drive
        }
      } else {
        targetSs = SpreadsheetApp.openById(spreadsheetId);
        copyMenuFromDefaultStore(masterSs, targetSs);
      }

      const now = new Date().toISOString();
      appendRowByHeaders(sh, STORE_HEADERS, { id, name, spreadsheetId, active: true, createdAt: now });

      const storeAdminSh = targetSs.getId() === masterSs.getId()
        ? adminSh
        : ensureStoreAdminSheet(targetSs);
      const rowHeaders = targetSs.getId() === masterSs.getId() ? ADMIN_HEADERS : STORE_ADMIN_HEADERS;
      appendRowByHeaders(storeAdminSh, rowHeaders, {
        username: staffUsername,
        password: staffPassword,
        role: 'staff',
        storeId: id,
        active: true,
        createdAt: now
      });
      appendRowByHeaders(storeAdminSh, rowHeaders, {
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
        storeId: id,
        active: true,
        createdAt: now
      });

      return jsonOut({
        store: { id, name, spreadsheetId, active: true, createdAt: now },
        users: [
          { username: staffUsername, role: 'staff', storeId: id, active: true, createdAt: now },
          { username: adminUsername, role: 'admin', storeId: id, active: true, createdAt: now }
        ]
      });
    }

    if (action === 'updateStore') {
      const id = String(body.id || '').trim();
      if (!id) return jsonOut({ error: 'Thiếu mã quán' });
      const sh = ensureStoreSheet(masterSs);
      const vals = sh.getDataRange().getValues();
      const headers = vals[0].map(String);
      const idCol = headers.indexOf('id');
      for (let r = 1; r < vals.length; r++) {
        if (String(vals[r][idCol]).trim() === id) {
          if (body.name !== undefined) sh.getRange(r + 1, headers.indexOf('name') + 1).setValue(String(body.name).trim());
          if (body.spreadsheetId !== undefined) sh.getRange(r + 1, headers.indexOf('spreadsheetId') + 1).setValue(String(body.spreadsheetId).trim());
          if (body.active !== undefined) sh.getRange(r + 1, headers.indexOf('active') + 1).setValue(Boolean(body.active));
          return jsonOut({ ok: true });
        }
      }
      return jsonOut({ error: 'Không tìm thấy quán' });
    }

    if (action === 'deleteStore') {
      const id = String(body.id || '').trim();
      if (!id) return jsonOut({ error: 'Thiếu mã quán' });
      if (id === 'default') {
        return jsonOut({ error: 'Không thể xóa quán mặc định' });
      }
      const sh = ensureStoreSheet(masterSs);
      const vals = sh.getDataRange().getValues();
      const headers = vals[0].map(String);
      const idCol = headers.indexOf('id');
      const ssIdCol = headers.indexOf('spreadsheetId');
      let targetSpreadsheetId = '';
      let foundRow = -1;
      for (let r = 1; r < vals.length; r++) {
        if (String(vals[r][idCol]).trim() === id) {
          foundRow = r + 1;
          targetSpreadsheetId = ssIdCol !== -1 ? String(vals[r][ssIdCol] || '').trim() : '';
          break;
        }
      }
      if (foundRow === -1) {
        return jsonOut({ error: 'Không tìm thấy quán' });
      }
      if (targetSpreadsheetId && targetSpreadsheetId === masterSs.getId()) {
        return jsonOut({ error: 'Không thể xóa quán đang dùng chung Sheet tổng' });
      }

      // Xóa dòng quán trong tab Stores
      sh.deleteRow(foundRow);

      // Xóa các tài khoản cũ còn sót trên Sheet tổng gắn với storeId này (nếu có)
      const masterAdminSh = ensureAdminSheet(masterSs);
      const adminVals = masterAdminSh.getDataRange().getValues();
      const adminHeaders = adminVals[0].map(String);
      const storeCol = adminHeaders.indexOf('storeId');
      if (storeCol !== -1) {
        for (let r = adminVals.length - 1; r >= 1; r--) {
          if (String(adminVals[r][storeCol] || '').trim() === id) {
            masterAdminSh.deleteRow(r + 1);
          }
        }
      }

      // Chuyển file Google Sheet của quán vào thùng rác
      if (targetSpreadsheetId) {
        try {
          DriveApp.getFileById(targetSpreadsheetId).setTrashed(true);
        } catch (_err) {
          // Bỏ qua nếu file đã bị xóa trước đó
        }
      }

      return jsonOut({ ok: true });
    }

    if (action === 'createUser') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const role = String(body.role || 'staff').trim();
      const storeId = role === 'superadmin' ? '*' : String(body.storeId || '').trim();
      if (!username || password.length < 4) {
        return jsonOut({ error: 'Tài khoản không được trống và mật khẩu tối thiểu 4 ký tự' });
      }
      if (role !== 'superadmin' && !storeId) {
        return jsonOut({ error: 'Vui lòng chọn quán cho tài khoản này' });
      }
      const users = getUsersList(masterSs);
      if (users.some(u => u.username === username)) {
        return jsonOut({ error: 'Tên đăng nhập đã tồn tại' });
      }
      const now = new Date().toISOString();
      if (role === 'superadmin') {
        const sh = ensureAdminSheet(masterSs);
        appendRowByHeaders(sh, ADMIN_HEADERS, { username, password, role, storeId: '*', active: true, createdAt: now });
        return jsonOut({ user: { username, role, storeId: '*', active: true, createdAt: now } });
      }

      const stores = getStoresList(masterSs);
      const store = stores.find(s => s.id === storeId);
      if (!store) {
        return jsonOut({ error: 'Không tìm thấy quán' });
      }
      const targetSs = store.spreadsheetId && store.spreadsheetId !== masterSs.getId()
        ? SpreadsheetApp.openById(store.spreadsheetId)
        : masterSs;
      const isMaster = targetSs.getId() === masterSs.getId();
      const sh = isMaster ? ensureAdminSheet(masterSs) : ensureStoreAdminSheet(targetSs);
      appendRowByHeaders(sh, isMaster ? ADMIN_HEADERS : STORE_ADMIN_HEADERS, {
        username,
        password,
        role,
        storeId,
        active: true,
        createdAt: now
      });
      return jsonOut({ user: { username, role, storeId, active: true, createdAt: now } });
    }

    if (action === 'updateUser') {
      const username = String(body.username || '').trim();
      if (!username) return jsonOut({ error: 'Thiếu tên đăng nhập' });
      const adminSheets = [ensureAdminSheet(masterSs)];
      const masterId = masterSs.getId();
      getStoresList(masterSs).forEach(st => {
        if (!st.spreadsheetId || st.spreadsheetId === masterId) return;
        try {
          const stSh = SpreadsheetApp.openById(st.spreadsheetId).getSheetByName('Admins');
          if (stSh && stSh.getLastRow() >= 2) adminSheets.push(stSh);
        } catch (_err) {}
      });

      for (let i = 0; i < adminSheets.length; i++) {
        const sh = adminSheets[i];
        const vals = sh.getDataRange().getValues();
        const headers = vals[0].map(String);
        const userCol = headers.indexOf('username');
        for (let r = 1; r < vals.length; r++) {
          if (String(vals[r][userCol]).trim() === username) {
            if (body.password && String(body.password).length >= 4 && headers.indexOf('password') !== -1) {
              sh.getRange(r + 1, headers.indexOf('password') + 1).setValue(String(body.password));
            }
            if (body.role !== undefined && headers.indexOf('role') !== -1) {
              const nextRole = String(body.role).trim();
              sh.getRange(r + 1, headers.indexOf('role') + 1).setValue(nextRole);
              if (nextRole === 'superadmin' && headers.indexOf('storeId') !== -1) {
                sh.getRange(r + 1, headers.indexOf('storeId') + 1).setValue('*');
              }
            }
            if (body.storeId !== undefined && body.role !== 'superadmin' && headers.indexOf('storeId') !== -1) {
              sh.getRange(r + 1, headers.indexOf('storeId') + 1).setValue(String(body.storeId).trim());
            }
            if (body.active !== undefined && headers.indexOf('active') !== -1) {
              sh.getRange(r + 1, headers.indexOf('active') + 1).setValue(Boolean(body.active));
            }
            return jsonOut({ ok: true });
          }
        }
      }
      return jsonOut({ error: 'Không tìm thấy tài khoản' });
    }

    if (action === 'adminChangePassword') {
      const username = String(body.username || '').trim();
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (!username || !currentPassword || newPassword.length < 4) {
        return jsonOut({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
      }
      const adminSheets = [ensureAdminSheet(masterSs)];
      const masterId = masterSs.getId();
      getStoresList(masterSs).forEach(st => {
        if (!st.spreadsheetId || st.spreadsheetId === masterId) return;
        try {
          const stSh = SpreadsheetApp.openById(st.spreadsheetId).getSheetByName('Admins');
          if (stSh && stSh.getLastRow() >= 2) adminSheets.push(stSh);
        } catch (_err) {}
      });

      for (let i = 0; i < adminSheets.length; i++) {
        const sh = adminSheets[i];
        const vals = sh.getDataRange().getValues();
        const headers = vals[0].map(String);
        const userCol = headers.indexOf('username');
        const passCol = headers.indexOf('password');
        for (let r = 1; r < vals.length; r++) {
          if (String(vals[r][userCol]).trim() === username && String(vals[r][passCol]) === currentPassword) {
            sh.getRange(r + 1, passCol + 1).setValue(newPassword);
            return jsonOut({ ok: true });
          }
        }
      }
      return jsonOut({ error: 'Mật khẩu hiện tại không đúng' });
    }

    const ss = getTargetSpreadsheet(body.spreadsheetId);

    if (action === 'openShift') {
      const existing = getCurrentShift(ss);
      if (existing) {
        return jsonOut({ error: `Đang có ca "${existing.shiftName}" chưa đóng. Vui lòng chốt ca trước khi mở ca mới.` });
      }
      const now = new Date();
      const dateKey = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      const sh = getOrCreateSheet(ss, 'Shifts', SHIFT_HEADERS);
      ensureSheetHeaders(sh, SHIFT_HEADERS);
      const todayShifts = readSheetObjects(sh).filter(r => formatDateKey(r.dateKey) === dateKey).length;
      const shift = {
        id: 'SH-' + dateKey.replace(/-/g, '') + '-' + String(todayShifts + 1).padStart(2, '0'),
        dateKey,
        shiftName: String(body.shiftName || 'Ca sáng').trim(),
        openedBy: String(body.openedBy || '').trim(),
        openedAt: now.toISOString(),
        openingCash: Number(body.openingCash) || 0,
        closedBy: '',
        closedAt: '',
        actualCash: null,
        expectedCash: Number(body.openingCash) || 0,
        cashDiff: 0,
        totalOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        byPaymentMethod: {},
        byOrderType: {},
        note: '',
        status: 'open'
      };
      sh.appendRow([
        shift.id, shift.dateKey, shift.shiftName, shift.openedBy, shift.openedAt, shift.openingCash,
        '', '', '', shift.expectedCash, 0,
        0, 0, 0, '{}', '{}', '', 'open'
      ]);
      return jsonOut({ shift });
    }

    if (action === 'closeShift') {
      if (body.actualCash === '' || body.actualCash === undefined || body.actualCash === null || isNaN(Number(body.actualCash)) || Number(body.actualCash) < 0) {
        return jsonOut({ error: 'Vui lòng nhập số tiền mặt thực tế đếm được trong két' });
      }
      const sh = getOrCreateSheet(ss, 'Shifts', SHIFT_HEADERS);
      ensureSheetHeaders(sh, SHIFT_HEADERS);
      const vals = sh.getDataRange().getValues();
      const headers = vals[0].map(String);
      const idCol = headers.indexOf('id');
      const statusCol = headers.indexOf('status');

      let targetRow = -1;
      let targetObj = null;
      for (let r = 1; r < vals.length; r++) {
        const matchesId = body.id ? String(vals[r][idCol]) === String(body.id) : true;
        if (matchesId && String(vals[r][statusCol]) === 'open') {
          targetRow = r + 1;
          const obj = {};
          headers.forEach((h, i) => obj[h] = vals[r][i]);
          targetObj = serializeShift(obj);
          break;
        }
      }
      if (!targetObj) {
        return jsonOut({ error: 'Không tìm thấy ca đang mở để chốt.' });
      }

      const stats = computeShiftStats(ss, targetObj);
      const now = new Date();
      const actualCash = body.actualCash === '' || body.actualCash === undefined || body.actualCash === null
        ? stats.expectedCash
        : Number(body.actualCash);
      const cashDiff = actualCash - stats.expectedCash;
      const closedShift = {
        ...stats,
        closedBy: String(body.closedBy || '').trim(),
        closedAt: now.toISOString(),
        actualCash,
        cashDiff,
        note: String(body.note || '').trim(),
        status: 'closed'
      };

      const setCol = (colName, value) => {
        const idx = headers.indexOf(colName);
        if (idx !== -1) sh.getRange(targetRow, idx + 1).setValue(value);
      };
      setCol('closedBy', closedShift.closedBy);
      setCol('closedAt', closedShift.closedAt);
      setCol('actualCash', closedShift.actualCash);
      setCol('expectedCash', closedShift.expectedCash);
      setCol('cashDiff', closedShift.cashDiff);
      setCol('totalOrders', closedShift.totalOrders);
      setCol('cancelledOrders', closedShift.cancelledOrders);
      setCol('totalRevenue', closedShift.totalRevenue);
      setCol('byPaymentJSON', JSON.stringify(closedShift.byPaymentMethod));
      setCol('byOrderTypeJSON', JSON.stringify(closedShift.byOrderType));
      setCol('note', closedShift.note);
      setCol('status', 'closed');

      return jsonOut({ shift: closedShift });
    }

    if (action === 'createOrder') {
      const currentShift = getCurrentShift(ss);
      if (!currentShift) {
        return jsonOut({ error: 'Chưa mở ca làm việc. Vui lòng bấm "Mở ca" trước khi tạo đơn!' });
      }
      const parsedTime = body.createdAt ? new Date(body.createdAt) : new Date();
      const now = isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
      const dateKey = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      const sh = getOrCreateSheet(ss, getOrderSheetName(dateKey), ORDER_HEADERS);
      ensureSheetHeaders(sh, ORDER_HEADERS);
      const rows = readSheetObjects(sh);
      const clientId = body.id ? String(body.id) : '';
      if (clientId) {
        const dup = rows.find(r => String(r.id) === clientId);
        if (dup) {
          return jsonOut({
            id: String(dup.id),
            orderCode: String(dup.orderCode),
            createdAt: String(dup.createdAt),
            dateKey: formatDateKey(dup.dateKey),
            orderType: String(dup.orderType),
            paymentMethod: String(dup.paymentMethod),
            items: JSON.parse(dup.itemsJSON || '[]'),
            total: Number(dup.total) || 0,
            note: String(dup.note || ''),
            status: String(dup.status || 'completed'),
            shiftId: String(dup.shiftId || '')
          });
        }
      }
      const todayCount = rows.filter(r => formatDateKey(r.dateKey) === dateKey).length;
      const items = body.items || [];
      const subtotal = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.quantity), 0);
      const order = {
        id: clientId || Utilities.getUuid(),
        orderCode: body.orderCode ? String(body.orderCode) : '#' + String(todayCount + 1).padStart(3, '0'),
        createdAt: now.toISOString(),
        dateKey,
        orderType: body.orderType || 'Mang về',
        paymentMethod: body.paymentMethod || 'Tiền mặt',
        items,
        total: subtotal,
        note: body.note || '',
        status: 'completed',
        shiftId: currentShift.id
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
