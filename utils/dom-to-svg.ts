/**
 * Chuyển vùng cây gia phả (DOM đã render) thành SVG vector THẬT — hình chữ
 * nhật, đường nối, chữ đều là phần tử SVG gốc, không dùng `<foreignObject>`.
 *
 * Vì sao không dùng `html-to-image.toSvg`: hàm đó bọc HTML trong
 * `<foreignObject>`, trình duyệt xem được nhưng CorelDRAW/Illustrator/rsvg
 * render ra trang trắng — vô dụng khi đưa cho tiệm in.
 *
 * Cách làm: duyệt từng phần tử, đọc `getBoundingClientRect` + `getComputedStyle`
 * rồi phát ra `<rect>`/`<line>`/`<text>`. Đường nối của cây là pseudo-element
 * (`li::before`, `ul ul::before`...) nên đọc thêm computed style của
 * `::before`/`::after` và dựng lại các cạnh viền thành đường thẳng.
 *
 * Hạn chế đã biết:
 * - Gradient nền (avatar) quy về `linearGradient` 2 chặng theo hướng chéo.
 * - Bo góc của đường nối (border-radius 12px) vẽ thành góc vuông.
 * - Chữ giữ dạng text nên máy in cần có font tương ứng; muốn nhúng font sẵn
 *   thì dùng "PDF vector để in" (PDF nhúng font, SVG thì không).
 */

interface Ctx {
  originX: number;
  originY: number;
  body: string[];
  defs: string[];
  gradientSeq: number;
}



function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

const paintCache = new Map<string, { color: string; opacity: number }>();
let paintCanvas: CanvasRenderingContext2D | null = null;

/**
 * Quy mọi màu CSS về sRGB + opacity riêng.
 *
 * Bắt buộc vì SVG 1.1 chỉ hiểu `rgb()`/hex: Tailwind trả về `oklab(... / 0.7)`
 * cho `bg-white/70` và `rgba()` cho màu có alpha — CorelDRAW/rsvg gặp cả hai
 * đều đổ về ĐEN ĐẶC (đã kiểm chứng: 201 thẻ đen kịt). Vẽ 1 pixel ra canvas rồi
 * đọc lại là cách để chính trình duyệt làm việc quy đổi.
 */
function paint(color: string): { color: string; opacity: number } {
  const hit = paintCache.get(color);
  if (hit) return hit;

  if (!paintCanvas) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    paintCanvas = canvas.getContext("2d", { willReadFrequently: true });
  }

  let result = { color, opacity: 1 };
  if (paintCanvas) {
    paintCanvas.clearRect(0, 0, 1, 1);
    paintCanvas.fillStyle = color;
    paintCanvas.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = paintCanvas.getImageData(0, 0, 1, 1).data;
    result = { color: `rgb(${r}, ${g}, ${b})`, opacity: round(a / 255) };
  }

  paintCache.set(color, result);
  return result;
}

function isVisible(cs: CSSStyleDeclaration): boolean {
  return (
    cs.display !== "none" &&
    cs.visibility !== "hidden" &&
    parseFloat(cs.opacity || "1") > 0.05
  );
}

/**
 * Lấy các màu trong `linear-gradient(...)` để dựng lại gradient SVG.
 * Chrome trả về màu ở nhiều hệ khác nhau — Tailwind v4 cho ra `lab()`/`oklab()`
 * chứ không phải `rgb()` — nên phải bắt đủ các hàm màu, nếu sót thì avatar mất
 * màu nền.
 */
function gradientStops(backgroundImage: string): string[] {
  if (!backgroundImage.includes("gradient")) return [];
  return (
    backgroundImage.match(
      /(?:rgba?|hsla?|lab|lch|oklab|oklch|color)\([^)]*\)|#[0-9a-f]{3,8}/gi,
    ) ?? []
  );
}

/** Nền phần tử: màu đặc hoặc gradient (quy về gradient chéo 2 chặng). */
function emitBackground(
  ctx: Ctx,
  cs: CSSStyleDeclaration,
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
) {
  // Tailwind đặt sẵn `bg-linear-to-*` cả khi chưa có màu -> gradient toàn chặng
  // trong suốt. Bỏ các chặng đó, nếu không cả thẻ bị tô đè.
  const stops = gradientStops(cs.backgroundImage)
    .map(paint)
    .filter((s) => s.opacity > 0.01);

  let fill: string | null = null;
  let fillOpacity = 1;

  if (stops.length >= 2) {
    const id = `grad${ctx.gradientSeq++}`;
    const inner = stops
      .map(
        (s, i) =>
          `<stop offset="${round((i / (stops.length - 1)) * 100)}%" stop-color="${s.color}" stop-opacity="${round(s.opacity)}"/>`,
      )
      .join("");
    ctx.defs.push(
      `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">${inner}</linearGradient>`,
    );
    fill = `url(#${id})`;
  } else {
    const p = paint(cs.backgroundColor);
    if (p.opacity > 0.01) {
      fill = p.color;
      fillOpacity = p.opacity;
    }
  }

  if (!fill) return;
  ctx.body.push(
    `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(rx)}" fill="${fill}" fill-opacity="${round(fillOpacity)}"/>`,
  );
}

/** Viền phần tử: vẽ từng cạnh để xử lý được cả viền không đều. */
function emitBorders(
  ctx: Ctx,
  cs: CSSStyleDeclaration,
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
) {
  const sides = [
    ["Top", cs.borderTopWidth, cs.borderTopColor, cs.borderTopStyle],
    ["Right", cs.borderRightWidth, cs.borderRightColor, cs.borderRightStyle],
    ["Bottom", cs.borderBottomWidth, cs.borderBottomColor, cs.borderBottomStyle],
    ["Left", cs.borderLeftWidth, cs.borderLeftColor, cs.borderLeftStyle],
  ] as const;

  const widths = sides.map(([, wd]) => parseFloat(wd) || 0);
  const visible = sides.filter(
    ([, wd, color, style]) =>
      (parseFloat(wd) || 0) > 0 &&
      style !== "none" &&
      paint(color).opacity > 0.01,
  );
  if (!visible.length) return;

  // 4 cạnh giống nhau -> 1 rect có stroke, giữ được bo góc
  const uniform =
    visible.length === 4 &&
    widths.every((v) => Math.abs(v - widths[0]) < 0.01) &&
    sides.every(([, , color]) => color === cs.borderTopColor);

  if (uniform) {
    const bw = widths[0];
    const p = paint(cs.borderTopColor);
    ctx.body.push(
      `<rect x="${round(x + bw / 2)}" y="${round(y + bw / 2)}" width="${round(w - bw)}" height="${round(h - bw)}" rx="${round(Math.max(rx - bw / 2, 0))}" fill="none" stroke="${p.color}" stroke-opacity="${round(p.opacity)}" stroke-width="${round(bw)}"/>`,
    );
    return;
  }

  for (const [side, wd, color, style] of visible) {
    if (style === "none") continue;
    const bw = parseFloat(wd);
    const half = bw / 2;
    let x1 = x,
      y1 = y,
      x2 = x,
      y2 = y;
    if (side === "Top") {
      x1 = x;
      x2 = x + w;
      y1 = y2 = y + half;
    } else if (side === "Bottom") {
      x1 = x;
      x2 = x + w;
      y1 = y2 = y + h - half;
    } else if (side === "Left") {
      y1 = y;
      y2 = y + h;
      x1 = x2 = x + half;
    } else {
      y1 = y;
      y2 = y + h;
      x1 = x2 = x + w - half;
    }
    const p = paint(color);
    ctx.body.push(
      `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${p.color}" stroke-opacity="${round(p.opacity)}" stroke-width="${round(bw)}"/>`,
    );
  }
}

/**
 * Pseudo-element `::before` / `::after` — đây chính là các đường nối của cây.
 * Chrome trả computed style nhưng không trả vị trí, nên tự giải phần trăm
 * theo khối chứa (phần tử cha có `position: relative`).
 */
function emitPseudo(
  ctx: Ctx,
  el: Element,
  pseudo: "::before" | "::after",
  hostX: number,
  hostY: number,
  hostW: number,
  hostH: number,
) {
  const cs = getComputedStyle(el, pseudo);
  if (!cs || cs.content === "none" || cs.display === "none") return;
  if (cs.position !== "absolute" && cs.position !== "relative") return;

  const val = (raw: string, base: number): number | null => {
    if (!raw || raw === "auto") return null;
    if (raw.endsWith("%")) return (parseFloat(raw) / 100) * base;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  };

  const w = val(cs.width, hostW) ?? 0;
  const h = val(cs.height, hostH) ?? 0;
  const left = val(cs.left, hostW);
  const right = val(cs.right, hostW);
  const top = val(cs.top, hostH) ?? 0;

  const x =
    left !== null ? hostX + left : right !== null ? hostX + hostW - right - w : hostX;
  const y = hostY + top;

  emitBorders(ctx, cs, x, y, w, h, 0);
}

/**
 * Chữ: dùng Range để lấy hình chữ nhật của TỪNG DÒNG đã xuống hàng, rồi cắt
 * nội dung theo đúng dòng đó — nếu chỉ lấy cả khối thì tên bị xuống dòng sẽ
 * đè lên nhau.
 */
function emitText(ctx: Ctx, node: Text, cs: CSSStyleDeclaration) {
  const raw = node.textContent ?? "";
  if (!raw.trim()) return;

  const range = document.createRange();
  range.selectNodeContents(node);
  const lineRects = Array.from(range.getClientRects()).filter(
    (r) => r.width > 0 && r.height > 0,
  );
  if (!lineRects.length) return;

  const fontSize = parseFloat(cs.fontSize) || 12;
  const anchor =
    cs.textAlign === "center" ? "middle" : cs.textAlign === "right" ? "end" : "start";

  // cắt text theo số dòng: dò vị trí ký tự làm đổi số hình chữ nhật
  const lines: string[] = [];
  if (lineRects.length === 1) {
    lines.push(raw);
  } else {
    let start = 0;
    let seen = 1;
    for (let i = 1; i <= raw.length; i++) {
      range.setStart(node, 0);
      range.setEnd(node, i);
      const count = Array.from(range.getClientRects()).filter(
        (r) => r.width > 0,
      ).length;
      if (count > seen) {
        lines.push(raw.slice(start, i - 1));
        start = i - 1;
        seen = count;
      }
    }
    lines.push(raw.slice(start));
  }

  lineRects.forEach((r, i) => {
    const content = (lines[i] ?? "").trim();
    if (!content) return;
    const x =
      anchor === "middle"
        ? r.left + r.width / 2
        : anchor === "end"
          ? r.right
          : r.left;
    // baseline ≈ giữa dòng + ~0.3 cỡ chữ (xấp xỉ ascent/descent)
    const y = r.top + r.height / 2 + fontSize * 0.32;
    const p = paint(cs.color);
    ctx.body.push(
      `<text x="${round(x - ctx.originX)}" y="${round(y - ctx.originY)}" font-family="${escapeXml(cs.fontFamily)}" font-size="${round(fontSize)}" font-weight="${cs.fontWeight}" font-style="${cs.fontStyle}" fill="${p.color}" fill-opacity="${round(p.opacity)}" text-anchor="${anchor}" xml:space="preserve">${escapeXml(content)}</text>`,
    );
  });
}

/** Icon `<svg>` sẵn có trong DOM: giữ nguyên, chỉ đặt lại vị trí/kích thước. */
function emitInlineSvg(ctx: Ctx, el: SVGSVGElement, x: number, y: number, w: number, h: number) {
  const clone = el.cloneNode(true) as SVGSVGElement;
  const color = paint(getComputedStyle(el).color).color;

  clone.querySelectorAll("[fill], [stroke]").forEach((n) => {
    if (n.getAttribute("fill") === "currentColor") n.setAttribute("fill", color);
    if (n.getAttribute("stroke") === "currentColor")
      n.setAttribute("stroke", color);
  });

  // Màu đặt trên thẻ <svg> lồng nhau KHÔNG được một số bộ render (librsvg,
  // và nhiều bộ import vector) kế thừa xuống hình con -> icon ra đen.
  // Ghi thẳng màu lên từng hình con chưa có màu riêng.
  const rootFill =
    clone.getAttribute("fill") === "currentColor"
      ? color
      : clone.getAttribute("fill");
  const rootStroke =
    clone.getAttribute("stroke") === "currentColor"
      ? color
      : clone.getAttribute("stroke");

  clone
    .querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line")
    .forEach((shape) => {
      if (rootFill && !shape.getAttribute("fill"))
        shape.setAttribute("fill", rootFill);
      if (rootStroke && !shape.getAttribute("stroke"))
        shape.setAttribute("stroke", rootStroke);
    });

  if (rootFill) clone.setAttribute("fill", rootFill);
  if (rootStroke) clone.setAttribute("stroke", rootStroke);
  clone.setAttribute("width", String(round(w)));
  clone.setAttribute("height", String(round(h)));
  clone.removeAttribute("class");
  ctx.body.push(
    `<g transform="translate(${round(x)},${round(y)})">${clone.outerHTML}</g>`,
  );
}

/**
 * Dựng SVG từ một phần tử đã render.
 *
 * Lưu ý: bên gọi phải tạm bỏ `transform: scale()` (zoom fit-to-screen) trước
 * khi gọi, nếu không toạ độ đo được sẽ theo tỉ lệ đang thu nhỏ.
 */
export function elementToSvg(root: HTMLElement): string {
  const rootRect = root.getBoundingClientRect();
  const width = root.scrollWidth;
  const height = root.scrollHeight;

  const ctx: Ctx = {
    originX: rootRect.left,
    originY: rootRect.top,
    body: [],
    defs: [],
    gradientSeq: 0,
  };

  // Nền trắng để in: nền thật của vùng cây có thể trong suốt.
  const rootBg = paint(getComputedStyle(root).backgroundColor);
  const bg = rootBg.opacity > 0.01 ? rootBg.color : "#ffffff";
  ctx.body.push(
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>`,
  );

  const walk = (el: Element) => {
    const cs = getComputedStyle(el);
    if (!isVisible(cs)) return;

    const rect = el.getBoundingClientRect();
    const x = rect.left - ctx.originX;
    const y = rect.top - ctx.originY;

    if (el instanceof SVGSVGElement) {
      emitInlineSvg(ctx, el, x, y, rect.width, rect.height);
      return; // con của <svg> đã nằm trong bản sao
    }

    if (rect.width > 0 && rect.height > 0) {
      const rx = parseFloat(cs.borderTopLeftRadius) || 0;
      emitBackground(ctx, cs, x, y, rect.width, rect.height, rx);
      emitBorders(ctx, cs, x, y, rect.width, rect.height, rx);
    }

    emitPseudo(ctx, el, "::before", x, y, rect.width, rect.height);
    emitPseudo(ctx, el, "::after", x, y, rect.width, rect.height);

    if (el instanceof HTMLImageElement && el.src) {
      ctx.body.push(
        `<image href="${escapeXml(el.src)}" x="${round(x)}" y="${round(y)}" width="${round(rect.width)}" height="${round(rect.height)}" preserveAspectRatio="xMidYMid slice"/>`,
      );
    }

    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        emitText(ctx, child as Text, cs);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child as Element);
      }
    }
  };

  walk(root);

  const defs = ctx.defs.length ? `<defs>${ctx.defs.join("")}</defs>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${ctx.body.join("")}</svg>`;
}
