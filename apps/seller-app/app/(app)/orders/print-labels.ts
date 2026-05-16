import type { Order } from "@/src/types/order";

// Rough characters-per-line for the address paragraph at our print font
// size. Used only to pick 3-up vs 4-up per A4 sheet — not exact layout.
const ADDR_CHARS_PER_LINE = 36;

// Two-column 2x2 grid (4 per page) fits the typical address comfortably.
// If a label looks like it will need more than ~5 lines of address text
// we drop to 3-up (one full-width on top, two below) so nothing gets
// clipped at the page break. Anything bigger than that and we let the
// browser paginate one-per-page — at that point combining isn't saving
// paper anyway.
function estimateLines(addr: string): number {
  if (!addr) return 1;
  const explicit = addr.split(/\r?\n/);
  return explicit.reduce(
    (n, line) => n + Math.max(1, Math.ceil(line.length / ADDR_CHARS_PER_LINE)),
    0
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
      ? "&lt;"
      : c === ">"
      ? "&gt;"
      : c === '"'
      ? "&quot;"
      : "&#39;"
  );
}

type Eligible = {
  orderNo: string;
  name: string;
  addr: string;
  phone: string;
  lines: number;
};

/** Drop orders without enough recipient info to be useful as a label. */
function pickEligible(orders: readonly Order[]): Eligible[] {
  const out: Eligible[] = [];
  for (const o of orders) {
    const name = (o.customerName ?? "").trim();
    const addr = (o.address ?? "").trim();
    if (name.length < 2 || addr.length < 5) continue;
    out.push({
      orderNo: o.orderNo ?? "",
      name,
      addr,
      phone: (o.phoneNumber ?? "").trim(),
      lines: estimateLines(addr),
    });
  }
  return out;
}

/**
 * Pack labels onto pages. Per-page capacity is chosen by the longest
 * address in the page — short ones fit 4-up, medium 3-up, long 1-up.
 * Greedy fill so we use as little paper as possible.
 */
function packPages(items: Eligible[]): Eligible[][] {
  const pages: Eligible[][] = [];
  let i = 0;
  while (i < items.length) {
    // Look ahead to decide per-page capacity from the bunch we're about
    // to pack. Take the worst-case (longest-addr) of the next 4 — if any
    // is too long, we drop to a smaller per-page count up front rather
    // than mixing tile sizes within a page.
    const window = items.slice(i, i + 4);
    const maxLines = window.reduce((m, x) => Math.max(m, x.lines), 0);
    const capacity = maxLines > 8 ? 1 : maxLines > 5 ? 3 : 4;
    const page = items.slice(i, i + capacity);
    pages.push(page);
    i += page.length;
  }
  return pages;
}

function renderTile(item: Eligible): string {
  return `
    <div class="tile">
      ${item.orderNo ? `<div class="order-no">Order ${escapeHtml(item.orderNo)}</div>` : ""}
      <div class="to">To</div>
      <div class="name">${escapeHtml(item.name)}</div>
      <div class="addr">${escapeHtml(item.addr)}</div>
      ${item.phone ? `<div class="phone">Phone: ${escapeHtml(item.phone)}</div>` : ""}
    </div>
  `;
}

function renderPage(page: Eligible[]): string {
  const n = page.length;
  const cols = n === 1 ? 1 : 2;
  const tiles = page.map(renderTile).join("");
  return `<section class="sheet" data-count="${n}" style="--cols:${cols};">${tiles}</section>`;
}

export function printOrderLabels(orders: readonly Order[]): {
  ok: boolean;
  reason?: string;
} {
  const eligible = pickEligible(orders);
  if (eligible.length === 0) {
    return { ok: false, reason: "No orders with a printable name and address" };
  }
  const pages = packPages(eligible);
  const body = pages.map(renderPage).join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shipping labels — ${eligible.length}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #000;
      background: #f4f4f4;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .toolbar {
      position: sticky;
      top: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 12px;
      background: #f4f4f4;
      border-bottom: 1px solid #ddd;
      z-index: 10;
    }
    .toolbar button {
      padding: 10px 16px;
      font-size: 15px;
      cursor: pointer;
      border: 1px solid #888;
      background: #fff;
      border-radius: 6px;
      min-height: 40px;
    }
    .toolbar .hint {
      color: #555;
      font-size: 12px;
      align-self: center;
      flex-basis: 100%;
    }
    @media (min-width: 600px) {
      .toolbar .hint {
        font-size: 13px;
        flex-basis: auto;
        margin-left: 8px;
      }
    }
    .sheet {
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      max-width: 100%;
      margin: 12px auto;
      padding: 8mm;
      display: grid;
      grid-template-columns: repeat(var(--cols, 2), 1fr);
      gap: 0;
      page-break-after: always;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }
    .sheet:last-of-type { page-break-after: auto; }
    /* On narrow screens (phones) the 210mm A4 preview is wider than
       the viewport. Drop it to viewport width so the preview is readable
       without horizontal scroll; the @page rule above still drives the
       actual printed layout, so output stays correct A4. */
    @media (max-width: 760px) {
      .sheet {
        width: 100%;
        min-height: auto;
        padding: 4mm;
        margin: 8px 0;
        border-radius: 0;
      }
    }
    /* 3-up layout: the third tile spans both columns. */
    .sheet[data-count="3"] .tile:nth-child(3) { grid-column: 1 / -1; }
    .tile {
      border: 1px dashed #888;
      padding: 8mm 9mm;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 4mm;
    }
    /* Cut marks: paired tiles share an edge — collapse the duplicate
       border so it stays a single dashed line the seller can cut along.
       The wide 3-up tile (child 3) spans both columns and sits on the
       outer edges, so it keeps its full border. */
    .sheet[data-count="4"] .tile:nth-child(odd),
    .sheet[data-count="3"] .tile:nth-child(1) {
      border-right: none;
    }
    .sheet[data-count="4"] .tile:nth-child(-n+2),
    .sheet[data-count="3"] .tile:nth-child(-n+2) {
      border-bottom: none;
    }
    .order-no {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #444;
    }
    .to {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #777;
      margin-bottom: -2mm;
    }
    .name {
      font-size: 16pt;
      font-weight: 700;
      line-height: 1.15;
    }
    .addr {
      font-size: 12pt;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .phone {
      font-size: 11pt;
      font-weight: 500;
    }
    @media print {
      html, body { background: #fff; }
      .toolbar { display: none; }
      .sheet {
        margin: 0;
        box-shadow: none;
        width: auto;
        min-height: auto;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print</button>
    <button onclick="window.close()">Close</button>
    <span class="hint">${eligible.length} label${eligible.length === 1 ? "" : "s"} • ${pages.length} A4 sheet${pages.length === 1 ? "" : "s"} • cut along the dashed lines</span>
  </div>
  ${body}
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 150);
    });
  </script>
</body>
</html>`;

  // No fixed window size — mobile browsers ignore it and open as a
  // tab, desktop browsers pick a sensible default. Lets the @media
  // rules above adapt the preview to whatever container we land in.
  const w = window.open("", "_blank");
  if (!w) {
    return { ok: false, reason: "Allow pop-ups to print labels" };
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  return { ok: true };
}
