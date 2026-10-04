import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const csp = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8')).app.security.csp;
await page.route('**/*', async route => {
  if (!route.request().isNavigationRequest()) return route.continue();
  const response = await route.fetch();
  await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
});
async function exported() {
  await page.getByRole('button', { name: 'Export…', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportovat', exact: true }).click();
  return readFile(await (await pending).path());
}
async function set(label, value) {
  const input = page.getByRole('spinbutton', { name: label, exact: true });
  await input.fill(String(value)); await input.press('Tab');
}
async function add(id) {
  await page.getByRole('combobox', { name: 'Typ nového efektu' }).selectOption(id);
  await page.getByRole('button', { name: 'Přidat efekt', exact: true }).click();
}
async function readPixel(buffer, x = 0, y = 0) {
  return page.evaluate(async ({ base64, x, y }) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(x, y, 1, 1).data];
  }, { base64: buffer.toString('base64'), x, y });
}
const effects = [ ['strips', 'Strips'], ['random-tiles', 'Random Tiles'], ['crumple', 'Crumple'], ['photocopy', 'Photocopy'], ['interference', 'Interference'], ['bit-plane-extractor', 'Bit Plane Extractor'] ];
effects.push(['voronoi-collage', 'Voronoi Collage'], ['ink-bleed', 'Ink Bleed'], ['surface-relief', 'Surface Relief'], ['contour-atlas', 'Contour Atlas'], ['scanline-displace', 'Scanline Displace']);
const seeded = new Set(['strips', 'random-tiles', 'crumple', 'photocopy', 'voronoi-collage', 'ink-bleed', 'scanline-displace']);
await mkdir('test-results', { recursive: true });
try {
  await page.goto(process.env.RASTERLAB_TEST_URL || 'http://127.0.0.1:4173');
  await page.locator('.canvas-host canvas').waitFor();
  await page.getByRole('button', { name: 'Demo experiment', exact: true }).click();
  await page.locator('.layer-row').waitFor();
  const original = await exported();
  await page.getByRole('button', { name: 'Efekty', exact: true }).click();
  for (const [id, name] of effects) {
    await add(id);
    const changed = await exported(); assert(!changed.equals(original), `${name} must change image pixels`);
    assert(changed.equals(await exported()), `${name} must reproduce identical pixels`);
    await page.getByRole('button', { name: `Vypnout efekt ${name}`, exact: true }).click();
    assert(original.equals(await exported()), `${name} bypass`);
    await page.getByRole('button', { name: `Zapnout efekt ${name}`, exact: true }).click();
    if (seeded.has(id)) {
      await set('Seed', 54321);
      assert(!changed.equals(await exported()), `${name} seed must change pixels`);
      await page.keyboard.press('Control+z'); assert(changed.equals(await exported()), `${name} seed undo`);
    }
    if (id === 'strips') {
      assert.equal((await readPixel(changed))[3], 0, 'Strip gaps must export as transparency');
      await page.getByLabel('Shuffle', { exact: true }).uncheck(); await set('Gap hodnota', 0);
      assert(original.equals(await exported()), 'Untransformed strips must reproduce the entire source');
      await page.getByLabel('Direction', { exact: true }).selectOption('vertical');
      assert(original.equals(await exported()), 'Vertical strip identity');
    }
    if (id === 'random-tiles') {
      await page.getByLabel('Shuffle', { exact: true }).uncheck();
      for (const label of ['Rotation variation', 'Scale variation', 'Offset variation']) await set(`${label} hodnota`, 0);
      assert(original.equals(await exported()), 'Untransformed tiles must reproduce the entire source');
      await set('Columns hodnota', 8); await set('Rows hodnota', 8);
      assert(original.equals(await exported()), '64-cell uniform array and identity');
    }
    if (id === 'crumple') { await set('Strength hodnota', 0); assert(original.equals(await exported()), 'Zero strength must disable displacement and lighting'); }
    if (id === 'interference') { await set('Amount hodnota', 0); assert(original.equals(await exported()), 'Zero interference amount'); }
    if (id === 'voronoi-collage') {
      await set('Edge width / px hodnota', 0); await set('Displacement / px hodnota', 0);
      await set('Cells hodnota', 32);
      assert(original.equals(await exported()), '32 Voronoi cells with zero edge width and displacement must preserve source');
      await set('Cells hodnota', 1); await set('Edge width / px hodnota', 32);
      assert(original.equals(await exported()), 'A single Voronoi cell has no internal borders');
    }
    if (id === 'ink-bleed') { await set('Radius / px hodnota', 0); assert(original.equals(await exported()), 'Zero ink radius'); }
    if (id === 'surface-relief') { await set('Relief depth hodnota', 0); assert(original.equals(await exported()), 'Zero relief depth'); }
    if (id === 'scanline-displace') { await set('Amplitude / px hodnota', 0); assert(original.equals(await exported()), 'Zero scanline amplitude'); }
    await page.getByRole('button', { name: `Odstranit efekt ${name}`, exact: true }).click();
  }
  // Save a mixed stack, including custom GPU data maps, then reproduce it after reload.
  for (const [id] of effects.slice(6)) await add(id);
  const mixed = await exported();
  const save = page.waitForEvent('download'); await page.getByRole('button', { name: 'Uložit projekt (Ctrl+S)' }).click();
  const saved = await readFile(await (await save).path());
  await page.locator('input[accept^=".json,"]').setInputFiles({ name: 'catalog.json', mimeType: 'application/json', buffer: saved });
  await page.getByRole('button', { name: 'Vypnout efekt Scanline Displace', exact: true }).waitFor();
  assert(mixed.equals(await exported()), 'Procedural stack project roundtrip');
  await page.screenshot({ path: 'test-results/catalog-effects.png' });
  // A known 8-bit channel checks bit order on the GPU, including inverted output.
  const project = JSON.parse(saved); project.document.width = 64; project.document.height = 32;
  const layer = project.document.layers[0]; layer.position = { x: 0, y: 0 }; layer.scale = { x: 1, y: 1 }; layer.rotation = 0;
  layer.effects = [{ id: 'bit-test', effectId: 'bit-plane-extractor', enabled: true, inputs: {}, parameters: { bit: 0, channel: 'red', invert: false } }];
  const dataUrl = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#aa0055'; ctx.fillRect(0, 0, 64, 32); return canvas.toDataURL(); });
  project.assets[0].dataUrl = dataUrl;
  project.assets[0].width = 64; project.assets[0].height = 32;
  await page.locator('input[accept^=".json,"]').setInputFiles({ name: 'bits.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByRole('button', { name: 'Vypnout efekt Bit Plane Extractor', exact: true }).waitFor();
  async function pixel() { return readPixel(await exported(), 16, 16); }
  assert.deepEqual(await pixel(), [0, 0, 0, 255]);
  await set('Bit hodnota', 1); assert.deepEqual(await pixel(), [255, 255, 255, 255]);
  await page.getByLabel('Invert', { exact: true }).check(); assert.deepEqual(await pixel(), [0, 0, 0, 255]);
  await page.getByRole('button', { name: 'Odstranit efekt Bit Plane Extractor', exact: true }).click();
  const second = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 64, 32); return canvas.toDataURL().split(',')[1]; });
  await page.locator('input[accept^="image/"]').setInputFiles({ name: 'secondary.png', mimeType: 'image/png', buffer: Buffer.from(second, 'base64') });
  await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).waitFor();
  await add('modulo-mix'); await set('Divisor hodnota', 0.7); await set('Gain hodnota', 0.8);
  const expected = [188, 52, 171].map(value => Math.round(((value / 255) % 0.7) / 0.7 * 0.8 * 255));
  const actual = await pixel();
  expected.forEach((value, index) => assert(Math.abs(value - actual[index]) <= 1, 'Modulo GPU output must match normalized channel arithmetic'));
  assert.equal(actual[3], 255);
  await page.getByLabel('Channel mode', { exact: true }).selectOption('luminance');
  const luminance = await pixel(); assert.equal(luminance[0], luminance[1]); assert.equal(luminance[1], luminance[2]);
  const moduloImage = await exported();
  const moduloSave = page.waitForEvent('download'); await page.getByRole('button', { name: 'Uložit projekt (Ctrl+S)' }).click();
  const moduloFile = await readFile(await (await moduloSave).path());
  await page.locator('input[accept^=".json,"]').setInputFiles({ name: 'modulo.json', mimeType: 'application/json', buffer: moduloFile });
  await page.getByRole('button', { name: 'Vypnout efekt Modulo Mix', exact: true }).waitFor();
  assert(moduloImage.equals(await exported()), 'Modulo two-input project roundtrip');
  assert.deepEqual(errors, []);
  console.log('Catalog passed: 12 GPU effects, seed/bypass/undo, zero-strength identities, 64 tiles, 32 Voronoi cells, procedural and two-input project roundtrips, bit-plane and modulo pixel values under Tauri CSP.');
} catch (error) { await page.screenshot({ path: 'test-results/catalog-failure.png' }); console.error(errors); throw error; }
finally { await browser.close(); }
