// Wires the page: the photo library, panel list, layout and grade pickers, caption style
// controls, per-panel filters, drag-to-crop on the preview, shuffle, and PNG export in the
// three common post sizes. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js).
import { FILTERS, GRADES, LAYOUTS, freshPanels, panelAt, renderCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const libraryEl = document.getElementById('library');
const panelListEl = document.getElementById('panelList');
const shadowEl = document.getElementById('shadow');
const spacingEl = document.getElementById('spacing');
const spacingValEl = document.getElementById('spacingVal');

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: titleEl.value,
  subtitle: subtitleEl.value,
  caption: { outline: 'dark', shadow: true, spacing: 2 },
  photos: [], // { img, name, url }
  panels: freshPanels('hero'),
  selected: 0,
  exportSize: '1080x1080',
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function panelBox(i) {
  const poly = LAYOUTS[state.layout][i];
  const xs = poly.map(([x]) => x * canvas.width);
  const ys = poly.map(([, y]) => y * canvas.height);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
}

function clampPan(i) {
  const crop = state.panels[i];
  const img = crop.photo === null ? null : state.photos[crop.photo]?.img;
  if (!img) { crop.ox = 0; crop.oy = 0; return; }
  const [, , bw, bh] = panelBox(i);
  const base = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  const pw = img.naturalWidth * base * crop.zoom;
  const ph = img.naturalHeight * base * crop.zoom;
  crop.ox = clamp(crop.ox, -Math.max(0, (pw - bw) / 2 / bw), Math.max(0, (pw - bw) / 2 / bw));
  crop.oy = clamp(crop.oy, -Math.max(0, (ph - bh) / 2 / bh), Math.max(0, (ph - bh) / 2 / bh));
}

function sizePreview() {
  const [w, h] = EXPORT_SIZES[state.exportSize];
  const scale = Math.min(1, 900 / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
}

function redraw() {
  // A cover shot shows the exported art as it is: never the editor's selection outline.
  const highlight = document.body.classList.contains('shot-cover') ? -1 : state.selected;
  renderCover(ctx, canvas.width, canvas.height, state, { highlight });
}

function renderLibrary() {
  libraryEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const li = document.createElement('li');
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.alt = '';
    const name = document.createElement('span');
    name.textContent = photo.name;
    const fill = document.createElement('button');
    fill.type = 'button';
    fill.textContent = 'All panels';
    fill.addEventListener('click', () => {
      state.panels.forEach((p) => { p.photo = i; p.zoom = 1; p.ox = 0; p.oy = 0; });
      renderPanels();
      redraw();
    });
    li.append(thumb, name, fill);
    libraryEl.append(li);
  });
}

function filterLabel(filter) {
  return filter === 'none' ? 'No filter' : filter[0].toUpperCase() + filter.slice(1);
}

function renderPanels() {
  panelListEl.innerHTML = '';
  state.panels.forEach((crop, i) => {
    const li = document.createElement('li');
    if (i === state.selected) li.classList.add('selected');
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('strong');
    label.textContent = `Panel ${i + 1}`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Empty';
    select.append(empty);
    state.photos.forEach((photo, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = photo.name;
      select.append(opt);
    });
    select.value = crop.photo === null ? '' : String(crop.photo);
    select.addEventListener('change', () => {
      crop.photo = select.value === '' ? null : Number(select.value);
      crop.zoom = 1; crop.ox = 0; crop.oy = 0;
      redraw();
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset crop';
    reset.addEventListener('click', () => {
      crop.zoom = 1; crop.ox = 0; crop.oy = 0;
      renderPanels();
      redraw();
    });
    row.append(label, select, reset);
    li.append(row);
    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '4';
    zoom.step = '0.05';
    zoom.value = String(crop.zoom);
    zoom.setAttribute('aria-label', `Zoom for panel ${i + 1}`);
    zoom.addEventListener('input', () => {
      crop.zoom = Number(zoom.value);
      clampPan(i);
      redraw();
    });
    zoomLabel.append(zoom);
    li.append(zoomLabel);
    const filterLabelEl = document.createElement('label');
    filterLabelEl.textContent = 'Filter';
    const filter = document.createElement('select');
    filter.setAttribute('aria-label', `Filter for panel ${i + 1}`);
    FILTERS.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = filterLabel(f);
      filter.append(opt);
    });
    filter.value = crop.filter || 'none';
    filter.addEventListener('change', () => {
      crop.filter = filter.value;
      redraw();
    });
    filterLabelEl.append(filter);
    li.append(filterLabelEl);
    li.addEventListener('click', (e) => {
      if (e.target === select || e.target === zoom || e.target === filter || e.target === reset) return;
      state.selected = i;
      renderPanels();
      redraw();
    });
    panelListEl.append(li);
  });
}

function applyLayout(layout) {
  state.layout = layout;
  state.panels = freshPanels(layout);
  // Keep the first library photos as the default fill, so the cover is never empty.
  if (state.photos.length > 0) {
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  }
  state.selected = 0;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === layout);
  });
  renderPanels();
  redraw();
}

function applyGrade(grade) {
  state.grade = grade;
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === grade);
  });
  redraw();
}

function applyOutline(outline) {
  state.caption.outline = outline;
  document.querySelectorAll('#outlines button').forEach((b) => {
    b.classList.toggle('active', b.dataset.outline === outline);
  });
  redraw();
}

/** One click, one fresh cover: random layout, grade, panel photos and title outline. */
function shuffleCover() {
  const layout = pick(Object.keys(LAYOUTS));
  const grade = pick(GRADES);
  state.caption.outline = pick(['dark', 'pink', 'cyan']);
  applyLayout(layout);
  applyGrade(grade);
  applyOutline(state.caption.outline);
  if (state.photos.length > 0) {
    state.panels.forEach((p) => {
      p.photo = Math.floor(Math.random() * state.photos.length);
      p.filter = pick(FILTERS);
    });
  }
  renderPanels();
  redraw();
  statusEl.textContent = `Shuffled: ${layout} layout, ${grade} grade.`;
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ img, name: file.name, url });
      added += 1;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (added > 0) {
    if (state.panels.every((p) => p.photo === null)) {
      state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
    }
    renderLibrary();
    renderPanels();
    redraw();
    statusEl.textContent = `Added ${added} photo${added === 1 ? '' : 's'}.`;
  }
}

/** Renders the cover at full export size and resolves to its PNG blob. */
export function exportCover(sizeKey) {
  const [w, h] = EXPORT_SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'), w, h, state, { highlight: -1 });
  return new Promise((resolve, reject) => {
    off.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
  });
}

async function exportAndDownload(sizeKey) {
  try {
    const blob = await exportCover(sizeKey);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${sizeKey}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    statusEl.textContent = `Saved cover-${sizeKey}.png`;
  } catch {
    statusEl.textContent = 'Export failed — try another photo.';
  }
}

document.getElementById('photos').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});
document.querySelectorAll('#layouts button').forEach((b) => {
  b.addEventListener('click', () => applyLayout(b.dataset.layout));
});
document.getElementById('shuffle').addEventListener('click', shuffleCover);
document.querySelectorAll('#grades button').forEach((b) => {
  b.addEventListener('click', () => applyGrade(b.dataset.grade));
});
document.querySelectorAll('#outlines button').forEach((b) => {
  b.addEventListener('click', () => applyOutline(b.dataset.outline));
});
shadowEl.addEventListener('change', () => {
  state.caption.shadow = shadowEl.checked;
  redraw();
});
spacingEl.addEventListener('input', () => {
  state.caption.spacing = Number(spacingEl.value);
  spacingValEl.textContent = `${spacingEl.value} px`;
  redraw();
});
titleEl.addEventListener('input', () => { state.title = titleEl.value; redraw(); });
subtitleEl.addEventListener('input', () => { state.subtitle = subtitleEl.value; redraw(); });
document.querySelectorAll('.exports button').forEach((b) => {
  b.addEventListener('click', () => {
    state.exportSize = b.dataset.size;
    sizePreview();
    redraw();
    exportAndDownload(b.dataset.size);
  });
});

let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return [
    ((e.clientX - rect.left) / rect.width) * canvas.width,
    ((e.clientY - rect.top) / rect.height) * canvas.height,
  ];
}
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const hit = panelAt(state.layout, x, y, canvas.width, canvas.height);
  if (hit < 0) return;
  state.selected = hit;
  renderPanels();
  redraw();
  drag = { x, y, panel: hit };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = canvasPoint(e);
  const crop = state.panels[drag.panel];
  const [, , bw, bh] = panelBox(drag.panel);
  crop.ox += (x - drag.x) / bw;
  crop.oy += (y - drag.y) / bh;
  clampPan(drag.panel);
  drag.x = x;
  drag.y = y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [x, y] = canvasPoint(e);
  const hit = panelAt(state.layout, x, y, canvas.width, canvas.height);
  if (hit < 0) return;
  const crop = state.panels[hit];
  crop.zoom = clamp(crop.zoom * Math.exp(-e.deltaY * 0.0012), 1, 4);
  clampPan(hit);
  state.selected = hit;
  renderPanels();
  redraw();
}, { passive: false });

// Test hook for the headless checks: state plus a full-size export.
window.__vice = { state, exportCover, shuffleCover };

async function loadSamples() {
  for (const name of ['boulevard', 'pier']) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push({ img, name: `${name}.jpg`, url: `samples/${name}.jpg` });
    } catch { /* a missing sample just leaves the library shorter */ }
  }
  state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  renderLibrary();
  renderPanels();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(new URLSearchParams(location.search), {
    state,
    applyLayout,
    applyGrade,
    applyOutline,
    loadImage,
    sizePreview,
    redraw,
    renderLibrary,
    renderPanels,
    canvas,
    setExportSize(sizeKey) { state.exportSize = sizeKey; },
    setCaption(caption) {
      Object.assign(state.caption, caption);
      if (caption.outline) applyOutline(caption.outline);
      if (typeof caption.shadow === 'boolean') shadowEl.checked = caption.shadow;
      if (typeof caption.spacing === 'number') {
        spacingEl.value = String(caption.spacing);
        spacingValEl.textContent = `${caption.spacing} px`;
      }
    },
  });
} else {
  sizePreview();
  await loadSamples();
  try {
    await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('40px "Archivo Black"')]);
  } catch { /* fall back to system fonts */ }
  redraw();
}
