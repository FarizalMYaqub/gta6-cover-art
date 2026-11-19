// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone at viewport size. Query knobs: layout, grade,
// photos, caption, subtitle, assign (panel -> photo index), filter (per-panel filter),
// outline (dark|pink|cyan), shadow (1|0), spacing (title letter-spacing in px) and size.
// window.__shotReady is set once painted.
export async function runShot(query, api) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  const names = (query.get('photos') || 'pier,boulevard').split(',').map((s) => s.trim()).filter(Boolean);
  api.state.photos = [];
  for (const name of names) {
    try {
      const img = await api.loadImage(`samples/${name}.jpg`);
      api.state.photos.push({ img, name: `${name}.jpg`, url: `samples/${name}.jpg` });
    } catch { /* a missing sample just leaves the library shorter */ }
  }

  api.applyLayout(query.get('layout') || 'hero');
  api.applyGrade(query.get('grade') || 'sunset');

  const assign = query.get('assign');
  if (assign) {
    assign.split(',').forEach((v, i) => {
      if (api.state.panels[i] && v !== '') api.state.panels[i].photo = Number(v);
    });
  }

  const filter = query.get('filter');
  if (filter) {
    filter.split(',').forEach((v, i) => {
      if (api.state.panels[i] && v) api.state.panels[i].filter = v;
    });
  }

  const caption = {};
  if (query.get('outline')) caption.outline = query.get('outline');
  if (query.get('shadow') !== null) caption.shadow = query.get('shadow') !== '0';
  if (query.get('spacing') !== null) caption.spacing = Number(query.get('spacing'));
  if (Object.keys(caption).length > 0) api.setCaption(caption);

  api.state.title = query.get('caption') || 'Sunset Heist';
  api.state.subtitle = query.get('subtitle') || 'ONE LAST SCORE IN THE CITY OF NEON';
  document.getElementById('title').value = api.state.title;
  document.getElementById('subtitle').value = api.state.subtitle;

  api.setExportSize(query.get('size') || '1080x1080');
  if (shot === 'cover') {
    api.canvas.width = window.innerWidth;
    api.canvas.height = window.innerHeight;
  } else {
    api.sizePreview();
  }
  api.renderLibrary();
  api.renderPanels();

  try {
    await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('40px "Archivo Black"')]);
  } catch { /* fall back to system fonts */ }
  await document.fonts.ready;
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
