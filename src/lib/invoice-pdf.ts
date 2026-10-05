import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { PDFDocument, PDFFont, PDFImage, PDFPage, RGB, StandardFonts, rgb } from "pdf-lib";
import { amountInWords } from "./amount-in-words";
import { env } from "./env";

/**
 * Branded A4 tax invoice (pdf-lib, vector). Black logo band, the logo's red slash as an accent,
 * itemised GST table, tax summary, amount in words, QR link to the online copy and a signature block.
 * Paginates when there are many items.
 */

const W = 595.28;
const H = 841.89;
const M = 40; // page margin
const BOTTOM_RESERVED = 150; // QR + signature + footer

const C = {
  black: rgb(0, 0, 0),
  ink: rgb(0.043, 0.043, 0.051),
  red: rgb(0.843, 0.078, 0.102),
  redDeep: rgb(0.56, 0.027, 0.047),
  text: rgb(0.1, 0.1, 0.12),
  muted: rgb(0.42, 0.42, 0.47),
  faint: rgb(0.71, 0.71, 0.75),
  line: rgb(0.89, 0.89, 0.92),
  zebra: rgb(0.966, 0.966, 0.976),
  white: rgb(1, 1, 1),
  green: rgb(0.02, 0.49, 0.38),
  greenSoft: rgb(0.9, 0.965, 0.945),
  amber: rgb(0.7, 0.33, 0.04),
  amberSoft: rgb(1, 0.965, 0.9),
};

const PAYMENT_LABEL: Record<string, string> = { UPI: "UPI", COD: "Cash on Delivery", CASH: "Cash", CARD: "Card" };
const WALK_IN_EMAIL = "walk-in@instore.invalid";

/** Standard PDF fonts only encode WinAnsi: keep Latin-1 plus common typographic marks, drop the rest */
const safe = (v: unknown) =>
  String(v ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF–—•…€™]/g, "")
    .trim();

const money = (n: number) =>
  `Rs. ${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      // a single over-long word: hard-cut it
      let rest = w;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  logo: PDFImage | null;
  invoice: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const text = (c: Ctx, t: string, x: number, y: number, size: number, font: PDFFont, color: RGB = C.text) =>
  c.page.drawText(safe(t), { x, y, size, font, color });

const textRight = (c: Ctx, t: string, right: number, y: number, size: number, font: PDFFont, color: RGB = C.text) => {
  const s = safe(t);
  c.page.drawText(s, { x: right - font.widthOfTextAtSize(s, size), y, size, font, color });
};

/** The logo's red slash */
const slash = (c: Ctx, x: number, topY: number, height: number, width: number, opacity = 1) =>
  c.page.drawSvgPath(`M ${height * 0.36} 0 L ${height * 0.36 + width} 0 L ${width} ${height} L 0 ${height} Z`, {
    x,
    y: topY,
    color: C.red,
    opacity,
  });

const label = (c: Ctx, t: string, x: number, y: number) => {
  text(c, t.toUpperCase(), x, y, 7, c.bold, C.red);
  c.page.drawRectangle({ x, y: y - 4, width: 16, height: 1.2, color: C.red });
};

function drawHeader(c: Ctx, first: boolean) {
  const inv = c.invoice;
  const bandH = first ? 112 : 46;
  c.page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: C.black });
  c.page.drawRectangle({ x: 0, y: H - bandH - 3, width: W, height: 3, color: C.red });

  if (first) {
    if (c.logo) c.page.drawImage(c.logo, { x: M - 10, y: H - 100, width: 132, height: 88 });
    else text(c, "FIGURE WORLD", M, H - 62, 20, c.bold, C.white);
    slash(c, 268, H, 112, 16, 0.95);
    slash(c, 296, H, 112, 6, 0.55);

    textRight(c, "TAX INVOICE", W - M, H - 44, 20, c.bold, C.white);
    const rows: Array<[string, string]> = [
      ["Invoice No.", inv.invoiceNumber],
      ["Invoice Date", new Date(inv.issuedAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
      ["Order No.", inv.orderNumber],
    ];
    rows.forEach(([k, v], i) => {
      const y = H - 66 - i * 13;
      text(c, k, W - M - 205, y, 7.5, c.regular, C.faint);
      textRight(c, v, W - M, y, 8.5, c.bold, C.white);
    });
  } else {
    text(c, "TAX INVOICE", M, H - 28, 11, c.bold, C.white);
    slash(c, M + 92, H - 8, 30, 6, 0.95);
    textRight(c, `${inv.invoiceNumber}  ·  Order ${inv.orderNumber}`, W - M, H - 28, 8.5, c.bold, C.white);
  }
}

const TABLE = {
  num: M + 8,
  item: M + 26,
  itemWidth: 162,
  hsn: M + 200,
  qtyR: M + 272,
  rateR: M + 338,
  taxableR: M + 404,
  gstR: M + 452,
  amountR: W - M - 6,
};

function drawTableHeader(c: Ctx, y: number) {
  c.page.drawRectangle({ x: M, y: y - 20, width: W - 2 * M, height: 22, color: C.ink });
  const ty = y - 13;
  const h = (t: string) => t.toUpperCase();
  text(c, "#", TABLE.num, ty, 7, c.bold, C.white);
  text(c, h("Item"), TABLE.item, ty, 7, c.bold, C.white);
  text(c, h("HSN"), TABLE.hsn, ty, 7, c.bold, C.white);
  textRight(c, h("Qty"), TABLE.qtyR, ty, 7, c.bold, C.white);
  textRight(c, h("Rate"), TABLE.rateR, ty, 7, c.bold, C.white);
  textRight(c, h("Taxable"), TABLE.taxableR, ty, 7, c.bold, C.white);
  textRight(c, h("GST 18%"), TABLE.gstR, ty, 7, c.bold, C.white);
  textRight(c, h("Amount"), TABLE.amountR, ty, 7, c.bold, C.white);
  return y - 22;
}

function newPage(c: Ctx) {
  c.page = c.doc.addPage([W, H]);
  drawHeader(c, false);
  return H - 70;
}

function infoColumn(c: Ctx, x: number, y: number, width: number, heading: string, lines: Array<{ t: string; bold?: boolean; size?: number; color?: RGB }>) {
  label(c, heading, x, y);
  let cy = y - 18;
  for (const l of lines) {
    const font = l.bold ? c.bold : c.regular;
    const size = l.size ?? 8.2;
    for (const w of wrap(l.t, font, size, width)) {
      text(c, w, x, cy, size, font, l.color ?? C.text);
      cy -= size + 3.4;
    }
  }
  return cy;
}

export async function renderInvoicePdf(invoice: any): Promise<Uint8Array> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const doc = await PDFDocument.create();
  doc.setTitle(`Tax Invoice ${invoice.invoiceNumber}`);
  doc.setAuthor(invoice.storeDetails?.name || "FiguresWorld Anime Store");
  doc.setSubject(`Order ${invoice.orderNumber}`);

  let logo: PDFImage | null = null;
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
    // the file is a JPEG despite its name; accept either
    logo = bytes[0] === 0xff && bytes[1] === 0xd8 ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  } catch {
    logo = null;
  }

  const c: Ctx = {
    doc,
    page: doc.addPage([W, H]),
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    logo,
    invoice,
  };

  const store = invoice.storeDetails || {};
  const cust = invoice.customerDetails || {};
  const addr = cust.shippingAddress || {};
  const gst = invoice.gstDetails || {};
  const pricing = invoice.pricing || {};
  const inStore = String(invoice.orderNumber || "").startsWith("FW-POS-");
  const status = String(invoice.paymentStatus || "").toUpperCase();
  const paid = status === "PAID";

  drawHeader(c, true);

  // Payment status stamp
  const stampText = paid ? "PAID" : status === "REFUNDED" ? "REFUNDED" : "PAYMENT PENDING";
  const stampColor = paid ? C.green : status === "REFUNDED" ? C.muted : C.amber;
  const stampFill = paid ? C.greenSoft : status === "REFUNDED" ? C.zebra : C.amberSoft;
  const stampW = c.bold.widthOfTextAtSize(stampText, 9) + 22;
  c.page.drawRectangle({ x: W - M - stampW, y: H - 146, width: stampW, height: 20, color: stampFill, borderColor: stampColor, borderWidth: 1.2 });
  textRight(c, stampText, W - M - 11, H - 139.5, 9, c.bold, stampColor);
  text(c, inStore ? "Purchased in store at Figure World, Bandra West" : "Thank you for shopping with Figure World", M, H - 139.5, 8.5, c.bold, C.text);

  // Sold by / Billed to / Payment & supply
  const colW = (W - 2 * M - 24) / 3;
  const top = H - 172;
  const showEmail = cust.email && cust.email !== WALK_IN_EMAIL;
  const showPhone = cust.phone && cust.phone !== "Not provided";
  const yA = infoColumn(c, M, top, colW, "Sold by", [
    { t: store.name || "FiguresWorld Anime Store", bold: true, size: 9.2 },
    { t: store.address || "" },
    { t: `GSTIN: ${store.gstin || ""}` },
    { t: `PAN: ${store.pan || ""}` },
    { t: store.email || "", color: C.muted, size: 7.6 },
    { t: store.phone || "", color: C.muted, size: 7.6 },
  ]);
  const yB = infoColumn(c, M + colW + 12, top, colW, inStore ? "Billed to" : "Billed & shipped to", [
    { t: cust.name || "Customer", bold: true, size: 9.2 },
    ...(inStore
      ? [{ t: "Walk-in purchase at the store counter", color: C.muted }]
      : [{ t: `${addr.street || ""}${addr.landmark ? `, ${addr.landmark}` : ""}` }, { t: `${addr.city || ""}, ${addr.state || ""} - ${addr.pinCode || ""}` }]),
    ...(showPhone ? [{ t: `Phone: ${cust.phone}` }] : []),
    ...(showEmail ? [{ t: `Email: ${cust.email}` }] : []),
  ]);
  const yC = infoColumn(c, M + 2 * (colW + 12), top, colW, "Payment & supply", [
    { t: `Method: ${PAYMENT_LABEL[invoice.paymentMethod] || invoice.paymentMethod}`, bold: true },
    { t: `Status: ${paid ? "Paid" : status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}` },
    ...(invoice.paymentRef ? [{ t: `Ref: ${invoice.paymentRef}` }] : []),
    { t: `Place of supply: ${addr.state || gst.state || "Maharashtra"}` },
    { t: gst.igstRate > 0 ? "Inter-state supply (IGST)" : "Intra-state supply (CGST + SGST)", color: C.muted },
  ]);

  // Items
  let y = Math.min(yA, yB, yC) - 14;
  y = drawTableHeader(c, y);
  const items: any[] = invoice.items || []; // eslint-disable-line @typescript-eslint/no-explicit-any
  items.forEach((it, idx) => {
    const titleLines = wrap(it.productTitle || "Item", c.bold, 8.2, TABLE.itemWidth).slice(0, 2);
    const rowH = Math.max(28, titleLines.length * 10.5 + 16);
    if (y - rowH < BOTTOM_RESERVED + 20) {
      y = newPage(c);
      y = drawTableHeader(c, y);
    }
    if (idx % 2 === 1) c.page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: C.zebra });
    const baseline = y - 12;
    text(c, String(idx + 1), TABLE.num, baseline, 8, c.regular, C.muted);
    titleLines.forEach((l, i) => text(c, l, TABLE.item, baseline - i * 10.5, 8.2, c.bold, C.text));
    text(c, `SKU ${it.productSku || "-"}`, TABLE.item, baseline - titleLines.length * 10.5, 6.8, c.regular, C.muted);
    text(c, it.hsn || gst.hsnCode || "95030090", TABLE.hsn, baseline, 7.6, c.regular, C.muted);
    textRight(c, String(it.quantity), TABLE.qtyR, baseline, 8.2, c.bold);
    textRight(c, money(it.unitPrice), TABLE.rateR, baseline, 7.8, c.regular);
    textRight(c, money(it.taxableAmount), TABLE.taxableR, baseline, 7.8, c.regular, C.muted);
    textRight(c, money(it.taxAmount), TABLE.gstR, baseline, 7.8, c.regular, C.muted);
    textRight(c, money(it.total), TABLE.amountR, baseline, 8.2, c.bold);
    y -= rowH;
    c.page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: C.line });
  });

  // Tax summary + totals (keep together)
  const blockH = 150;
  if (y - blockH < BOTTOM_RESERVED) y = newPage(c);
  y -= 18;

  const leftW = 285;
  const taxable = (pricing.subtotal || 0) - (gst.totalTax || 0);
  c.page.drawRectangle({ x: M, y: y - 120, width: leftW, height: 120, color: C.zebra, borderColor: C.line, borderWidth: 0.6 });
  label(c, "Tax summary", M + 12, y - 16);
  const taxRows: Array<[string, number]> =
    gst.igstRate > 0
      ? [["Taxable value", taxable], [`IGST @ ${gst.igstRate}%`, gst.igstAmount]]
      : [["Taxable value", taxable], [`CGST @ ${gst.cgstRate}%`, gst.cgstAmount], [`SGST @ ${gst.sgstRate}%`, gst.sgstAmount]];
  taxRows.forEach(([k, v], i) => {
    const ry = y - 34 - i * 12;
    text(c, k, M + 12, ry, 8, c.regular, C.muted);
    textRight(c, money(v), M + leftW - 12, ry, 8, c.regular, C.text);
  });
  const totalTaxY = y - 34 - taxRows.length * 12 - 2;
  c.page.drawLine({ start: { x: M + 12, y: totalTaxY + 8 }, end: { x: M + leftW - 12, y: totalTaxY + 8 }, thickness: 0.5, color: C.line });
  text(c, "Total tax (included in prices)", M + 12, totalTaxY - 2, 8, c.bold);
  textRight(c, money(gst.totalTax), M + leftW - 12, totalTaxY - 2, 8, c.bold);
  text(c, "AMOUNT IN WORDS", M + 12, totalTaxY - 20, 6.6, c.bold, C.muted);
  wrap(amountInWords(pricing.grandTotal || 0), c.bold, 7.8, leftW - 24)
    .slice(0, 2)
    .forEach((l, i) => text(c, l, M + 12, totalTaxY - 31 - i * 10, 7.8, c.bold, C.text));

  const rx = M + leftW + 18;
  const rRight = W - M;
  const lines: Array<[string, string, RGB?]> = [["Subtotal (incl. GST)", money(pricing.subtotal)]];
  if ((pricing.discountTotal || 0) > 0) lines.push(["Discount", `- ${money(pricing.discountTotal)}`, C.green]);
  if (!inStore || (pricing.shippingFee || 0) > 0) lines.push(["Shipping & handling", money(pricing.shippingFee || 0)]);
  lines.forEach(([k, v, col], i) => {
    const ry = y - 14 - i * 15;
    text(c, k, rx, ry, 8.6, c.regular, C.muted);
    textRight(c, v, rRight, ry, 8.6, c.bold, col ?? C.text);
  });
  const gtTop = y - 14 - lines.length * 15 - 6;
  c.page.drawRectangle({ x: rx - 4, y: gtTop - 34, width: rRight - rx + 4, height: 38, color: C.red });
  slash(c, rRight - 70, gtTop + 4, 38, 10, 0.35);
  text(c, "GRAND TOTAL", rx + 8, gtTop - 19, 8.6, c.bold, C.white);
  textRight(c, money(pricing.grandTotal), rRight - 10, gtTop - 21, 14, c.bold, C.white);
  textRight(c, "Inclusive of all taxes  ·  INR", rRight, gtTop - 48, 7, c.regular, C.muted);

  // QR + signature + footer at the bottom of the last page
  const onlineUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/invoices/${encodeURIComponent(invoice.invoiceNumber)}`;
  try {
    const qr = await QRCode.toBuffer(onlineUrl, { margin: 1, width: 220, color: { dark: "#0b0b0d", light: "#ffffff" } });
    const qrImg = await doc.embedPng(qr);
    c.page.drawImage(qrImg, { x: M, y: 74, width: 62, height: 62 });
    text(c, "Scan to view this invoice online", M + 72, 118, 7.6, c.bold);
    wrap(onlineUrl, c.regular, 6.8, 190).slice(0, 2).forEach((l, i) => text(c, l, M + 72, 106 - i * 9, 6.8, c.regular, C.muted));
  } catch {
    /* QR is a convenience; skip it if it can't be generated */
  }
  textRight(c, `For ${store.name || "FiguresWorld Anime Store"}`, W - M, 122, 8.4, c.bold);
  c.page.drawLine({ start: { x: W - M - 150, y: 92 }, end: { x: W - M, y: 92 }, thickness: 0.7, color: C.faint });
  textRight(c, "Authorised Signatory", W - M, 82, 7.4, c.regular, C.muted);

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const pc = { ...c, page: p };
    p.drawLine({ start: { x: M, y: 58 }, end: { x: W - M, y: 58 }, thickness: 0.6, color: C.line });
    text(pc, "Thank you for collecting with Figure World.", M, 44, 8.4, c.bold, C.text);
    textRight(pc, "COLLECT  ×  DISPLAY  ×  BEYOND", W - M, 44, 7.4, c.bold, C.red);
    text(pc, "This is a computer-generated tax invoice and requires no physical signature. Prices include GST.", M, 32, 6.8, c.regular, C.muted);
    textRight(pc, `${store.website || "www.figuresworld.com"}  ·  Page ${i + 1} of ${pages.length}`, W - M, 32, 6.8, c.regular, C.muted);
  });

  return doc.save();
}
