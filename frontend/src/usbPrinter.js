// WebUSB + TSPL Bitmap driver for Xprinter XP-420B (203 DPI = 8 dots/mm)

const DOTS_PER_MM = 8;

let activeDevice = null;
let outEndpoint = null;
let claimedInterface = null;

export function isWebUsbSupported() {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

function findOutEndpoint(device) {
  const config = device.configuration || device.configurations?.[0];
  if (!config) return null;
  for (const iface of config.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find((e) => e.direction === 'out');
      if (ep) {
        return { interfaceNumber: iface.interfaceNumber, endpointNumber: ep.endpointNumber };
      }
    }
  }
  return null;
}

async function openDevice(device) {
  if (!device.opened) {
    await device.open();
  }
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }
  const found = findOutEndpoint(device);
  if (!found) {
    throw new Error('Không tìm thấy cổng xuất dữ liệu (OUT endpoint) trên máy in USB.');
  }
  await device.claimInterface(found.interfaceNumber);
  activeDevice = device;
  claimedInterface = found.interfaceNumber;
  outEndpoint = found.endpointNumber;
  return device;
}

export async function connectUsbPrinter() {
  if (!isWebUsbSupported()) {
    throw new Error('Trình duyệt này không hỗ trợ WebUSB. Vui lòng dùng Chrome trên Android/Desktop qua HTTPS.');
  }
  const device = await navigator.usb.requestDevice({ filters: [] });
  return openDevice(device);
}

export async function autoReconnectUsbPrinter() {
  if (!isWebUsbSupported()) return null;
  try {
    const devices = await navigator.usb.getDevices();
    if (!devices.length) return null;
    // Prefer previously paired printer-class device (class 7) or first paired device
    const preferred = devices.find((d) =>
      d.configurations?.some((c) =>
        c.interfaces?.some((i) => i.alternates?.some((a) => a.interfaceClass === 7))
      )
    ) || devices[0];
    return await openDevice(preferred);
  } catch {
    return null;
  }
}

export function getConnectedPrinterName() {
  if (!activeDevice || !activeDevice.opened) return '';
  return activeDevice.productName || 'Máy in USB';
}

export async function disconnectUsbPrinter() {
  if (activeDevice && activeDevice.opened) {
    try {
      if (claimedInterface !== null) {
        await activeDevice.releaseInterface(claimedInterface);
      }
      await activeDevice.close();
    } catch {}
  }
  activeDevice = null;
  outEndpoint = null;
  claimedInterface = null;
}

async function sendBytes(bytes) {
  if (!activeDevice || !activeDevice.opened || outEndpoint === null) {
    throw new Error('Chưa kết nối máy in USB.');
  }
  const CHUNK_SIZE = 2048;
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const slice = bytes.slice(offset, offset + CHUNK_SIZE);
    await activeDevice.transferOut(outEndpoint, slice);
    if (offset + CHUNK_SIZE < bytes.length) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderStickerCanvas(
  sticker,
  order,
  indexText,
  labelSize,
  { rotate180 = false, flipY = false, offsetMm = 0, drawBorder = false } = {},
  targetWidth = null,
  targetHeight = null
) {
  const widthMm = labelSize === '40x30' ? 40 : 50;
  const heightMm = 30;
  const labelW = targetWidth || widthMm * DOTS_PER_MM;   // 320 or 384
  const height = targetHeight || heightMm * DOTS_PER_MM; // 200
  const offsetPx = Math.max(0, Math.round(offsetMm * DOTS_PER_MM));
  const width = labelW + offsetPx;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  ctx.save();
  ctx.translate(offsetPx, 0);
  if (rotate180) {
    ctx.translate(labelW, height);
    ctx.rotate(Math.PI);
  } else if (labelW <= 320) {
    // Shift slightly right (~2mm) when not rotated 180°
    ctx.translate(16, 0);
  }
  if (flipY) {
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }

  if (drawBorder) {
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, labelW - 2, height - 2);
  }

  const pad = labelW <= 320 ? 10 : 12;
  const rightPad = labelW <= 320 && !rotate180 ? 22 : pad;
  const maxW = labelW - pad - rightPad;
  let y = 6;

  // Header
  ctx.font = labelW <= 320 ? 'bold 20px Arial, sans-serif' : 'bold 22px Arial, sans-serif';
  ctx.fillText('RAU MÁ MIX', pad, y);
  const codeText = `${order.orderCode} (${indexText})`;
  const codeW = ctx.measureText(codeText).width;
  ctx.fillText(codeText, labelW - rightPad - codeW, y);
  y += labelW <= 320 ? 23 : 26;

  ctx.fillRect(pad, y, maxW, 2);
  y += 5;

  // Drink Name + Size
  ctx.font = labelW <= 320 ? 'bold 23px Arial, sans-serif' : 'bold 26px Arial, sans-serif';
  const titleLines = wrapLines(ctx, `${sticker.productName} (${sticker.size})`, maxW).slice(0, 2);
  for (const ln of titleLines) {
    ctx.fillText(ln, pad, y);
    y += labelW <= 320 ? 26 : 28;
  }

  // Sugar / Ice
  ctx.font = labelW <= 320 ? 'bold 19px Arial, sans-serif' : 'bold 21px Arial, sans-serif';
  ctx.fillText(`${sticker.sugar} đường · ${sticker.ice} đá`, pad, y);
  y += labelW <= 320 ? 22 : 24;

  // Toppings
  if (sticker.toppings?.length) {
    const tpStr = `+ ${sticker.toppings.map((t) => t.name).join(', ')}`;
    const tpLines = wrapLines(ctx, tpStr, maxW).slice(0, 2);
    for (const ln of tpLines) {
      ctx.fillText(ln, pad, y);
      y += labelW <= 320 ? 21 : 23;
    }
  }

  // Note
  if (sticker.note && y < height - 30) {
    ctx.font = labelW <= 320 ? 'bold italic 17px Arial, sans-serif' : 'bold italic 19px Arial, sans-serif';
    ctx.fillText(`* ${sticker.note}`, pad, y);
  }

  // Footer
  const footY = height - 26;
  ctx.fillRect(pad, footY - 4, maxW, 1);
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillText(order.orderType || 'Mang về', pad, footY);
  const timeStr = new Date(order.createdAt || Date.now()).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const timeW = ctx.measureText(timeStr).width;
  ctx.fillText(timeStr, labelW - rightPad - timeW, footY);
  ctx.restore();

  return { canvas, widthMm, heightMm };
}

const LUM_THRESHOLD = 210;

function canvasToTsplCommand(canvas, widthMm, heightMm) {
  const width = canvas.width;
  const height = canvas.height;
  const widthBytes = Math.ceil(width / 8);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, width, height).data;

  const bitmap = new Uint8Array(widthBytes * height);
  bitmap.fill(0xff); // 1 = white in TSPL

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
      if (lum < LUM_THRESHOLD) {
        const byteIdx = y * widthBytes + (x >> 3);
        bitmap[byteIdx] &= ~(0x80 >> (x & 7));
      }
    }
  }

  const encoder = new TextEncoder();
  const header = encoder.encode(
    `SIZE ${widthMm} mm,${heightMm} mm\r\nGAP 2 mm,0 mm\r\nSPEED 3\r\nDENSITY 12\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,${widthBytes},${height},0,`
  );
  const footer = encoder.encode(`\r\nPRINT 1,1\r\n`);

  const full = new Uint8Array(header.length + bitmap.length + footer.length);
  full.set(header, 0);
  full.set(bitmap, header.length);
  full.set(footer, header.length + bitmap.length);
  return full;
}

function canvasToEscPosCommand(canvas, bandHeight = 48) {
  const width = canvas.width;
  const height = canvas.height;
  const widthBytes = Math.ceil(width / 8);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, width, height).data;

  // Do NOT send ESC @ (0x1B 0x40) — on ITP3300 it resets Label Mode back to Receipt Mode!
  const chunks = [new Uint8Array([0x1b, 0x61, 0x00, 0x1d, 0x4c, 0x00, 0x00])];
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;

  // Send in small GS v 0 bands (48px tall = ~2.3KB) so printer buffer never overflows
  for (let startY = 0; startY < height; startY += bandHeight) {
    const h = Math.min(bandHeight, height - startY);
    const band = new Uint8Array(widthBytes * h);
    for (let y = 0; y < h; y++) {
      const srcY = startY + y;
      for (let x = 0; x < width; x++) {
        const lum = (imgData[srcY * width * 4 + x * 4] + imgData[srcY * width * 4 + x * 4 + 1] + imgData[srcY * width * 4 + x * 4 + 2]) / 3;
        if (lum < LUM_THRESHOLD) {
          band[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    const yL = h & 0xff;
    const yH = (h >> 8) & 0xff;
    chunks.push(new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]), band);
  }

  // Form Feed (0x0C) advances to the next label gap in Label Mode
  chunks.push(new Uint8Array([0x0c]));

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const full = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    full.set(c, offset);
    offset += c.length;
  }
  return full;
}

export async function printOrderViaUsb(order, labelSize = '40x30', protocol = 'escpos', opts = {}) {
  const stickers = [];
  for (const item of order.items || []) {
    const qty = Number(item.quantity) || 1;
    for (let i = 0; i < qty; i++) {
      stickers.push({
        productName: item.productName,
        size: item.size,
        sugar: item.sugar,
        ice: item.ice,
        toppings: item.toppings || [],
        note: item.note || ''
      });
    }
  }

  const total = stickers.length;
  for (let i = 0; i < total; i++) {
    const targetW = labelSize === '40x30' ? 296 : 384;
    const { canvas, widthMm, heightMm } = renderStickerCanvas(
      stickers[i],
      order,
      `${i + 1}/${total}`,
      labelSize,
      opts,
      targetW,
      176
    );
    const cmd = protocol === 'tspl'
      ? canvasToTsplCommand(canvas, widthMm, heightMm)
      : canvasToEscPosCommand(canvas, 40);
    await sendBytes(cmd);
  }
}

export async function printTestLabelUsb(labelSize = '40x30', protocol = 'escpos', opts = {}) {
  const sampleOrder = {
    orderCode: '#TEST4',
    createdAt: new Date().toISOString(),
    orderType: 'Mang về',
    items: [
      {
        productName: 'Rau má đậu xanh sữa dừa',
        size: 'L',
        sugar: '70%',
        ice: '30%',
        toppings: [{ name: 'Trân Châu Trắng' }],
        note: 'Test ITP3300',
        quantity: 1
      }
    ]
  };
  await printOrderViaUsb(sampleOrder, labelSize, protocol, { ...opts, drawBorder: true });
}

function uint8ToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function buildOrderEscPosBytes(order, labelSize = '40x30', opts = {}) {
  const stickers = [];
  for (const item of order.items || []) {
    const qty = Number(item.quantity) || 1;
    for (let i = 0; i < qty; i++) {
      stickers.push({
        productName: item.productName,
        size: item.size,
        sugar: item.sugar,
        ice: item.ice,
        toppings: item.toppings || [],
        note: item.note || ''
      });
    }
  }
  const chunks = [];
  let totalLen = 0;
  const total = stickers.length;
  for (let i = 0; i < total; i++) {
    const targetW = labelSize === '40x30' ? 296 : 384;
    const { canvas } = renderStickerCanvas(stickers[i], order, `${i + 1}/${total}`, labelSize, opts, targetW, 176);
    const cmd = canvasToEscPosCommand(canvas, 40);
    chunks.push(cmd);
    totalLen += cmd.length;
  }
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged;
}

export function buildOrderTsplBytes(order, labelSize = '40x30', opts = {}) {
  const stickers = [];
  for (const item of order.items || []) {
    const qty = Number(item.quantity) || 1;
    for (let i = 0; i < qty; i++) {
      stickers.push({
        productName: item.productName,
        size: item.size,
        sugar: item.sugar,
        ice: item.ice,
        toppings: item.toppings || [],
        note: item.note || ''
      });
    }
  }
  const chunks = [];
  let totalLen = 0;
  const total = stickers.length;
  for (let i = 0; i < total; i++) {
    const targetW = labelSize === '40x30' ? 320 : 400;
    const { canvas, widthMm, heightMm } = renderStickerCanvas(
      stickers[i],
      order,
      `${i + 1}/${total}`,
      labelSize,
      { ...opts, offsetMm: 0 },
      targetW,
      240
    );
    const cmd = canvasToTsplCommand(canvas, widthMm, heightMm);
    chunks.push(cmd);
    totalLen += cmd.length;
  }
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged;
}

export async function printOrderViaBridge(order, labelSize = '40x30', opts = {}, protocol = 'escpos') {
  const bytes = protocol === 'tspl'
    ? buildOrderTsplBytes(order, labelSize, opts)
    : buildOrderEscPosBytes(order, labelSize, opts);
  const res = await fetch('http://127.0.0.1:9191/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Bridge APK lỗi (${res.status})`);
  }
}

export async function printTestLabelBridge(labelSize = '40x30', opts = {}, protocol = 'escpos') {
  const sampleOrder = {
    orderCode: '#TEST5',
    createdAt: new Date().toISOString(),
    orderType: 'Mang về',
    items: [
      {
        productName: 'Rau má đậu xanh sữa dừa',
        size: 'L',
        sugar: '70%',
        ice: '30%',
        toppings: [{ name: 'Trân Châu Trắng' }],
        note: 'Test APK Bridge',
        quantity: 1
      }
    ]
  };
  await printOrderViaBridge(sampleOrder, labelSize, { ...opts, drawBorder: false }, protocol);
}
export function printOrderViaRawBt(order, labelSize = '40x30', opts = {}) {
  const bytes = buildOrderEscPosBytes(order, labelSize, opts);
  const b64 = uint8ToBase64(bytes);
  window.location.href = `rawbt:base64,${b64}`;
}

export function printTestLabelRawBt(labelSize = '40x30', opts = {}) {
  const sampleOrder = {
    orderCode: '#TEST4',
    createdAt: new Date().toISOString(),
    orderType: 'Mang về',
    items: [
      {
        productName: 'Rau má đậu xanh sữa dừa',
        size: 'L',
        sugar: '70%',
        ice: '30%',
        toppings: [{ name: 'Trân Châu Trắng' }],
        note: 'Test ITP3300',
        quantity: 1
      }
    ]
  };
  printOrderViaRawBt(sampleOrder, labelSize, { ...opts, drawBorder: true });
}
