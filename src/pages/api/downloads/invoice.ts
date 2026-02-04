// pages/api/invoice.ts
import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

export const config = {
  api: {
    responseLimit: false,
  },
};

type OrderItem = {
  title?: string;
  name?: string;
  quantity?: number;
  price?: string; // "12.34"
  amount?: string; // "12.34"
  originalPrice?: string; // optional (for strikethrough look)
  discounts?: Array<{ title: string; amount: string }>;
};

type TrackingRow = {
  date?: string; // "January 1, 2026"
  carrier?: string;
  number?: string;
  url?: string;
};

const BRAND = {
  black: "#181818",
  text: "#333333",
  muted: "#777777",
  light: "#999999",
  rule: "#dddddd",
  headerFill: "#f3f3f3",
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asNumber(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown, currency: string) {
  const n = asNumber(v);
  const symbol =
    currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  return `${symbol}${n.toFixed(2)}${symbol ? "" : ` ${currency}`}`;
}

function parseJSONParam<T>(raw: unknown, fallback: T): T {
  try {
    if (!raw) return fallback;
    if (typeof raw === "string") return JSON.parse(decodeURIComponent(raw)) as T;
    return raw as T;
  } catch {
    return fallback;
  }
}

/**
 * Draw a single-line HR like Shopify's <hr/>
 */
function hr(doc: PDFKit.PDFDocument, x: number, y: number, w: number) {
  doc.save();
  doc.lineWidth(1);
  doc.strokeColor(BRAND.rule);
  doc.moveTo(x, y).lineTo(x + w, y).stroke();
  doc.restore();
}

/**
 * PDFKit doesn't have real "HTML <br>" handling; this gives you line-broken blocks.
 */
function textBlock(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  w: number,
  opts?: Record<string, unknown>
) {
  return doc.text(text, x, y, { width: w, ...opts });
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // --- Inputs (query string) ---
    const orderId = s(req.query.orderId);
    const orderNumber = s(req.query.orderNumber || req.query.order_name || req.query.order);
    if (!orderId || !orderNumber) {
      return res.status(400).json({ error: "Missing required parameters: orderId, orderNumber" });
    }

    const currency = s(req.query.currency) || "GBP";
    const date =
      req.query.date ? s(req.query.date) :
      new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

    const poNumber = s(req.query.poNumber);

    // Addresses (pass as multi-line strings)
    const fromAddress = s(req.query.fromAddress) || [
      "AURICLE",
      "Unit 9",
      "King Street Buildings",
      "Enderby",
      "LE19 4NT",
      "United Kingdom",
      "GB478750248",
    ].join("\n");

    const billTo = s(req.query.billTo); // e.g. "Company\nStreet\nCity\nPostcode\nCountry"
    const shipTo = s(req.query.shipTo); // same
    const shipPhone = s(req.query.shipPhone);

    // Items
    const itemsArray = parseJSONParam<OrderItem[]>(req.query.items, []);

    // Totals (optional: if you want Shopify-like breakdown)
    const subtotal = s(req.query.subtotal);
    const tax = s(req.query.tax);
    const shipping = s(req.query.shipping);
    const total = s(req.query.total);

    // Credit terms / bank details (optional)
    const paymentDueDate = s(req.query.paymentDueDate); // "January 31, 2026"
    const showCreditTerms = Boolean(paymentDueDate);

    // Tracking (optional)
    const tracking = parseJSONParam<TrackingRow[]>(req.query.tracking, []);

    // Logo
    const logoUrl =
      s(req.query.logoUrl) ||
      "https://cdn.shopify.com/s/files/1/0884/8955/8341/files/ram_LOGO.png?v=1755251777";

    // --- PDF setup ---
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, left: 40, right: 40, bottom: 40 },
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${orderNumber}.pdf"`);

    doc.pipe(res);

    // Geometry
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const marginL = doc.page.margins.left;
    const marginR = doc.page.margins.right;
    const contentW = pageW - marginL - marginR;

    // Typography defaults
    doc.font("Helvetica");
    doc.fillColor(BRAND.text);
    doc.fontSize(10);

    // --- Header (logo + title left, order meta right) ---
    const headerTop = doc.y;

    // Left block
    const leftX = marginL;
    let leftY = headerTop;

    if (logoUrl) {
      const logoBuf = await fetchLogoBuffer(logoUrl);
      if (logoBuf) {
        // visually similar to Shopify: max-height ~40px
        doc.image(logoBuf, leftX, leftY, { height: 40 });
        leftY += 48;
      }
    }

    doc.fillColor(BRAND.black);
    doc.font("Helvetica-Bold").fontSize(26);
    doc.text("Invoice", leftX, leftY, { align: "left" });

    // Right meta block (top-right)
    const rightX = marginL + contentW * 0.58;
    const rightW = contentW * 0.42;

    doc.fillColor(BRAND.text);
    doc.font("Helvetica").fontSize(10);

    const metaLines = [
      `Order ${orderNumber}`,
      ...(poNumber ? [`PO Number ${poNumber}`] : []),
      date,
    ].join("\n");

    doc.text(metaLines, rightX, headerTop, { width: rightW, align: "right", lineGap: 2 });

    // Advance below header
    doc.y = Math.max(doc.y, headerTop + 70);

    // --- Addresses row (From / Bill To / Ship To) ---
    const addrTop = doc.y + 14;
    const colGap = 18;
    const colW = (contentW - colGap * 2) / 3;

    // FROM
    doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
    doc.text("From", marginL, addrTop);
    doc.fillColor(BRAND.text).font("Helvetica").fontSize(10);
    textBlock(doc, fromAddress, marginL, addrTop + 14, colW, { lineGap: 2 });

    // BILL TO
    if (billTo) {
      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
      doc.text("Bill To", marginL + (colW + colGap) * 1, addrTop);
      doc.fillColor(BRAND.text).font("Helvetica").fontSize(10);
      textBlock(doc, billTo, marginL + (colW + colGap) * 1, addrTop + 14, colW, { lineGap: 2 });
    }

    // SHIP TO
    if (shipTo) {
      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
      doc.text("Ship To", marginL + (colW + colGap) * 2, addrTop);
      doc.fillColor(BRAND.text).font("Helvetica").fontSize(10);

      const shipLines = [shipTo, shipPhone ? shipPhone : ""].filter(Boolean).join("\n");
      textBlock(doc, shipLines, marginL + (colW + colGap) * 2, addrTop + 14, colW, { lineGap: 2 });
    }

    // Move cursor to below the tallest address block
    const afterAddrY = addrTop + 14 + 92;
    doc.y = Math.max(doc.y, afterAddrY);

    // HR
    hr(doc, marginL, doc.y + 10, contentW);
    doc.y += 24;

    // --- Order details title ---
    doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(14);
    doc.text("Order details", marginL, doc.y);
    doc.y += 12;

    // --- Items table (Shopify-ish: simple header, light rules, right-aligned prices) ---
    const tableX = marginL;
    const tableW = contentW;

    const qtyW = 50;
    const unitPriceW = 100;
    const totalPriceW = 100;
    const itemW = tableW - qtyW - unitPriceW - totalPriceW;

    const headerY = doc.y + 8;

    // Header fill
    doc.save();
    doc.fillColor(BRAND.headerFill);
    doc.rect(tableX, headerY, tableW, 24).fill();
    doc.restore();

    // Header text
    doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
    doc.text("Qty", tableX + 8, headerY + 7, { width: qtyW - 16 });
    doc.text("Item", tableX + qtyW + 8, headerY + 7, { width: itemW - 16 });
    doc.text("Unit Price", tableX + qtyW + itemW + 8, headerY + 7, {
      width: unitPriceW - 16,
      align: "right",
    });
    doc.text("Total", tableX + qtyW + itemW + unitPriceW + 8, headerY + 7, {
      width: totalPriceW - 16,
      align: "right",
    });

    // Header bottom rule
    hr(doc, tableX, headerY + 24, tableW);

    let rowY = headerY + 28;
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.text);

    const ensureSpace = (needed: number) => {
      const bottom = pageH - doc.page.margins.bottom;
      if (rowY + needed > bottom) {
        doc.addPage();
        // reset rowY at new page top
        rowY = doc.page.margins.top;

        // re-draw table header on new page
        const hy = rowY;
        doc.save();
        doc.fillColor(BRAND.headerFill);
        doc.rect(tableX, hy, tableW, 24).fill();
        doc.restore();

        doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
        doc.text("Qty", tableX + 8, hy + 7, { width: qtyW - 16 });
        doc.text("Item", tableX + qtyW + 8, hy + 7, { width: itemW - 16 });
        doc.text("Unit Price", tableX + qtyW + itemW + 8, hy + 7, {
          width: unitPriceW - 16,
          align: "right",
        });
        doc.text("Total", tableX + qtyW + itemW + unitPriceW + 8, hy + 7, {
          width: totalPriceW - 16,
          align: "right",
        });
        hr(doc, tableX, hy + 24, tableW);

        doc.font("Helvetica").fontSize(10).fillColor(BRAND.text);
        rowY = hy + 28;
      }
    };

    for (const it of itemsArray) {
      const qty = (it.quantity ?? 1).toString();
      const title = it.title || it.name || "Item";
      const unitPrice = it.price ?? it.amount ?? "0.00";
      const unitPriceText = money(unitPrice, currency);
      
      // Calculate total price
      const totalPrice = (Number(unitPrice) * Number(qty)).toFixed(2);
      const totalPriceText = money(totalPrice, currency);

      // Measure item height (allow 2 lines)
      const itemHeight = doc.heightOfString(title, { width: itemW - 16 });
      const rowH = Math.max(22, Math.min(44, itemHeight + 10));

      ensureSpace(rowH + 8);

      // Row rule
      hr(doc, tableX, rowY + rowH, tableW);

      // Cells
      doc.fillColor(BRAND.text).font("Helvetica").fontSize(10);
      doc.text(qty, tableX + 8, rowY + 6, { width: qtyW - 16 });

      doc.text(title, tableX + qtyW + 8, rowY + 6, { width: itemW - 16 });

      doc.text(unitPriceText, tableX + qtyW + itemW + 8, rowY + 6, {
        width: unitPriceW - 16,
        align: "right",
      });

      doc.text(totalPriceText, tableX + qtyW + itemW + unitPriceW + 8, rowY + 6, {
        width: totalPriceW - 16,
        align: "right",
      });

      rowY += rowH;
    }

    // --- Totals block (right aligned like Shopify rows) ---
    rowY += 10;
    ensureSpace(140);

    const totalsLabelX = tableX + qtyW + itemW + unitPriceW - 10; // end of unit price col
    const totalsValueX = tableX + qtyW + itemW + unitPriceW; // start of total col
    const totalsRowH = 18;

    const totals: Array<{ label: string; value: string; strong?: boolean }> = [];

    if (subtotal) totals.push({ label: "Subtotal", value: money(subtotal, currency) });
    if (shipping) totals.push({ label: "Shipping", value: money(shipping, currency) });
    if (tax) totals.push({ label: "Tax", value: money(tax, currency) });

    totals.push({
      label: "Total",
      value: money(total || "0", currency),
      strong: true,
    });

    for (const t of totals) {
      doc.fillColor(BRAND.text);
      doc.font(t.strong ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      doc.text(t.label, tableX, rowY, { width: totalsLabelX - tableX, align: "right" });
      doc.text(t.value, totalsValueX, rowY, { width: totalPriceW, align: "right" });
      rowY += totalsRowH;
    }

    doc.y = rowY + 6;

    // --- Credit terms / bank details (like your Shopify block) ---
    if (showCreditTerms) {
      ensureSpace(120);
      hr(doc, marginL, doc.y, contentW);
      doc.y += 14;

      doc.font("Helvetica").fontSize(10).fillColor(BRAND.text);

      // CREDIT TERMS line (simulate <mark><u>...</u></mark>)
      doc.text(`CREDIT TERMS:`, marginL, doc.y);
      doc.y += 14;

      const due = paymentDueDate;
      const prefix = `To be paid no later than `;
      doc.text(prefix, marginL, doc.y, { continued: true });
      doc.fillColor(BRAND.headerFill);
      const underlineText = ` ${due} `;
      const uw = doc.widthOfString(underlineText, { font: "Helvetica", size: 10 });
      const ux = doc.x;
      const uy = doc.y - 2;
      doc.rect(ux, uy, uw, 14).fill();
      doc.fillColor(BRAND.text);
      doc.text(underlineText, { continued: false });
      // underline
      doc.save();
      doc.strokeColor(BRAND.text);
      doc.lineWidth(0.7);
      doc.moveTo(ux + 2, uy + 13).lineTo(ux + uw - 2, uy + 13).stroke();
      doc.restore();

      doc.moveDown(0.7);
      doc.text(`via Bank Transfer.`);
      doc.moveDown(0.8);

      doc.font("Helvetica-Bold").text("BANK DETAILS");
      doc.font("Helvetica").text(["AURICLE Limited", "Sort: 82-61-37", "Account: 80533262"].join("\n"), {
        lineGap: 2,
      });

      doc.moveDown(1);
      doc.fillColor(BRAND.text);
      doc.text(
        `Late payments may incur interest at 8 percentage points above the Bank of England base rate, calculated daily from the due date (${due}), plus a fixed late-payment charge in accordance with the Late Payment of Commercial Debts (Interest) Act 1998.`,
        { width: contentW, lineGap: 2 }
      );

      doc.y += 6;
    }

    // --- Tracking table (optional) ---
    if (tracking.length > 0) {
      ensureSpace(160);
      doc.y += 8;

      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(14);
      doc.text("Tracking", marginL, doc.y);
      doc.y += 10;

      const tX = marginL;
      const tW = contentW;
      const c1 = 140; // date
      const c2 = 140; // carrier
      const c3 = tW - c1 - c2; // tracking
      const tHeaderY = doc.y + 6;

      doc.save();
      doc.fillColor(BRAND.headerFill);
      doc.rect(tX, tHeaderY, tW, 24).fill();
      doc.restore();

      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
      doc.text("Date Arranged", tX + 8, tHeaderY + 7, { width: c1 - 16 });
      doc.text("Carrier", tX + c1 + 8, tHeaderY + 7, { width: c2 - 16 });
      doc.text("Tracking", tX + c1 + c2 + 8, tHeaderY + 7, { width: c3 - 16 });

      hr(doc, tX, tHeaderY + 24, tW);

      let ty = tHeaderY + 28;
      doc.font("Helvetica").fontSize(10).fillColor(BRAND.text);

      for (const row of tracking) {
        ensureSpace(30);

        hr(doc, tX, ty + 22, tW);

        doc.text(row.date || "-", tX + 8, ty + 6, { width: c1 - 16 });
        doc.text(row.carrier || "-", tX + c1 + 8, ty + 6, { width: c2 - 16 });

        const trackingText = row.number || "—";
        if (row.url) {
          // PDFKit "link" option creates a clickable link area
          doc.fillColor(BRAND.black);
          doc.text(trackingText, tX + c1 + c2 + 8, ty + 6, {
            width: c3 - 16,
            link: row.url,
            underline: true,
          });
          doc.fillColor(BRAND.text);
        } else {
          doc.text(trackingText, tX + c1 + c2 + 8, ty + 6, { width: c3 - 16 });
        }

        ty += 22;
      }

      doc.y = ty + 10;
    }

    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    // If headers already sent, we can't json() safely
    try {
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to generate invoice",
          details: (error as Error).message,
        });
      } else {
        res.end();
      }
    } catch {
      res.end();
    }
  }
}
