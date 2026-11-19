// Renders the GTA-style multi-panel cover onto any 2D canvas: panels with a photo each,
// a sunset / neon / noir colour grade, and bold outlined poster lettering. All drawing is
// pure canvas 2D, so the same code paints the live preview and the exported PNG.

/** Panel layouts as polygons in fractions of the cover (clockwise points). */
export const LAYOUTS = {
  hero: [
    [[0, 0], [0.60, 0], [0.60, 1], [0, 1]],
    [[0.60, 0], [1, 0], [1, 0.49], [0.60, 0.49]],
    [[0.60, 0.49], [1, 0.49], [1, 1], [0.60, 1]],
  ],
  grid: [
    [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]],
    [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]],
    [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]],
    [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]],
  ],
  comic: [
    [[0, 0], [0.36, 0], [0.30, 1], [0, 1]],
    [[0.36, 0], [0.68, 0], [0.62, 1], [0.30, 1]],
    [[0.68, 0], [1, 0], [1, 1], [0.62, 1]],
  ],
};

/** Fresh per-panel crop state for a layout: which library photo, zoom and pan offsets. */
export function freshPanels(layout) {
  return LAYOUTS[layout].map(() => ({ photo: null, zoom: 1, ox: 0, oy: 0 }));
}

/** Ray-casting hit test: which panel of `layout` holds point (x, y) in pixels. */
export function panelAt(layout, x, y, w, h) {
  const fx = x / w;
  const fy = y / h;
  const polys = LAYOUTS[layout];
  for (let i = polys.length - 1; i >= 0; i -= 1) {
    if (pointInPolygon(polys[i], fx, fy)) return i;
  }
  return -1;
}

function pointInPolygon(poly, x, y) {
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a, a += 1) {
    const [ax, ay] = poly[a];
    const [bx, by] = poly[b];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function centroid(poly) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) { cx += x; cy += y; }
  return [cx / poly.length, cy / poly.length];
}

/** Shrink a polygon toward its centroid by `g` pixels on a W x H canvas (the white gutter). */
function insetPolygon(poly, w, h, g) {
  const [cx, cy] = centroid(poly);
  return poly.map(([x, y]) => {
    const px = x * w;
    const py = y * h;
    const dx = px - cx * w;
    const dy = py - cy * h;
    const len = Math.hypot(dx, dy) || 1;
    return [(px - (dx / len) * g) / w, (py - (dy / len) * g) / h];
  });
}

function tracePath(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}

function polygonBox(poly, w, h) {
  const xs = poly.map(([x]) => x * w);
  const ys = poly.map(([, y]) => y * h);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
}

/** Draws one photo cover-fitting a panel box, with the panel's zoom and pan. */
function drawPanelPhoto(ctx, img, box, crop, grade) {
  const [bx, by, bw, bh] = box;
  const base = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  const scale = base * crop.zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = bx + (bw - pw) / 2 + crop.ox * bw;
  const dy = by + (bh - ph) / 2 + crop.oy * bh;
  ctx.save();
  if (grade === 'noir') ctx.filter = 'grayscale(0.85) contrast(1.18) brightness(1.04)';
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Colour grade washed over a panel box. */
function gradePanel(ctx, box, grade) {
  const [bx, by, bw, bh] = box;
  ctx.save();
  if (grade === 'sunset') {
    const warm = ctx.createLinearGradient(bx, by, bx, by + bh);
    warm.addColorStop(0, 'rgba(255, 176, 66, 0.10)');
    warm.addColorStop(0.55, 'rgba(255, 94, 58, 0.10)');
    warm.addColorStop(1, 'rgba(255, 46, 136, 0.34)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = warm;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalCompositeOperation = 'source-over';
  } else if (grade === 'neon') {
    const neon = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    neon.addColorStop(0, 'rgba(255, 46, 136, 0.42)');
    neon.addColorStop(0.55, 'rgba(124, 58, 237, 0.18)');
    neon.addColorStop(1, 'rgba(0, 229, 255, 0.40)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = neon;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    const shade = ctx.createLinearGradient(bx, by, bx, by + bh);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = shade;
    ctx.fillRect(bx, by, bw, bh);
  }
  ctx.restore();
}

function drawSun(ctx, w, h) {
  const cx = w * 0.955;
  const cy = h * 0.05;
  const r = h * 0.058;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, 'rgba(255, 140, 66, 0.55)');
  glow.addColorStop(1, 'rgba(255, 140, 66, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, '#ffe98a');
  disc.addColorStop(0.6, '#ffb347');
  disc.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx, x, y, s, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
  ctx.restore();
}

function fitFont(ctx, text, fontFamily, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `400 ${size}px ${fontFamily}, sans-serif`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `400 ${size}px ${fontFamily}, sans-serif`;
  }
  return size;
}

/**
 * Paints the whole cover.
 * `state`: { layout, grade, title, subtitle, photos, panels }
 * `opts`: { highlight } — index of the panel to outline (editor selection), or -1.
 */
export function renderCover(ctx, w, h, state, opts = {}) {
  const { layout, grade, title, subtitle, photos, panels } = state;
  const highlight = opts.highlight ?? -1;
  const gutter = Math.max(4, Math.round(w * 0.007));

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const polys = LAYOUTS[layout];
  polys.forEach((poly, i) => {
    const inset = insetPolygon(poly, w, h, gutter);
    const box = polygonBox(inset, w, h);
    const crop = panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    tracePath(ctx, inset, w, h);
    ctx.clip();
    const entry = crop.photo === null ? null : photos[crop.photo] ?? null;
    const img = entry?.img ?? null;
    if (img) {
      drawPanelPhoto(ctx, img, box, crop, grade);
      gradePanel(ctx, box, grade);
    } else {
      const fallback = ctx.createLinearGradient(box[0], box[1], box[0] + box[2], box[1] + box[3]);
      fallback.addColorStop(0, '#2b1838');
      fallback.addColorStop(1, '#120a1c');
      ctx.fillStyle = fallback;
      ctx.fillRect(box[0], box[1], box[2], box[3]);
    }
    ctx.restore();
    ctx.save();
    tracePath(ctx, inset, w, h);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = Math.max(1, w * 0.0015);
    ctx.stroke();
    ctx.restore();
    if (i === highlight) {
      ctx.save();
      tracePath(ctx, inset, w, h);
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(3, w * 0.004);
      ctx.setLineDash([Math.max(8, w * 0.012), Math.max(6, w * 0.008)]);
      ctx.stroke();
      ctx.restore();
    }
  });

  if (grade === 'sunset') drawSun(ctx, w, h);

  // Vignette + a soft scrim under the lettering so it reads on any photo.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const scrim = ctx.createLinearGradient(0, h * 0.68, 0, h);
  scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
  scrim.addColorStop(1, 'rgba(10, 4, 20, 0.55)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  const words = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (words) {
    const size = fitFont(ctx, words, 'Anton', Math.round(h * 0.115), w * 0.94);
    const y = h * 0.925;
    ctx.save();
    ctx.translate(w / 2, y);
    ctx.rotate(-0.028);
    ctx.font = `400 ${size}px Anton, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#120a1c';
    ctx.lineWidth = size * 0.16;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    ctx.strokeText(words, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(words, 0, 0);
    ctx.restore();
    drawSparkle(ctx, w * 0.06, h * 0.80, h * 0.014, '#ffe98a');
    drawSparkle(ctx, w * 0.93, h * 0.86, h * 0.011, '#ff7ad9');
    if (sub) {
      const subSize = Math.max(12, Math.round(h * 0.026));
      ctx.save();
      try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
      fitFont(ctx, sub, 'Archivo Black', subSize, w * 0.9);
      ctx.font = `400 ${subSize}px 'Archivo Black', sans-serif`;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(18, 10, 28, 0.9)';
      ctx.lineWidth = Math.max(2, subSize * 0.18);
      const subY = y - size * 1.02;
      ctx.strokeText(sub, w / 2, subY);
      ctx.fillStyle = grade === 'neon' ? '#7df9ff' : '#ffe9a8';
      ctx.fillText(sub, w / 2, subY);
      ctx.restore();
    }
  }
  ctx.restore();
}
