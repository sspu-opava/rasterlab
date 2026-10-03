import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const url = process.env.RASTERLAB_TEST_URL || 'http://127.0.0.1:5173';
if (process.env.RASTERLAB_TEST_URL) {
  const csp = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).app.security.csp;
  await page.route('**/*', async route => { if (!route.request().isNavigationRequest()) return route.continue(); const response = await route.fetch(); await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } }); });
}
const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const addEffect = async id => { await page.getByRole('combobox', { name: 'Typ nového efektu' }).selectOption(id); await page.getByRole('button', { name: 'Přidat efekt', exact: true }).click(); await frame(); };
async function exported(format = 'png') {
  await page.getByRole('button', { name: 'Export…', exact: true }).click();
  await page.getByRole('combobox', { name: 'Formát exportu' }).selectOption(format);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportovat', exact: true }).click();
  const download = await pending; return await readFile(await download.path());
}
async function imageData(buffer, mime = 'image/png') {
  return await page.evaluate(async ({ base64, mime }) => {
    const image = new Image(); image.src = `data:${mime};base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, pixel: Array.from(context.getImageData(Math.min(800, image.width - 1), Math.min(800, image.height - 1), 1, 1).data) };
  }, { base64: buffer.toString('base64'), mime });
}
await mkdir('test-results', { recursive: true });
try {
  await page.goto(url); await page.locator('.canvas-host canvas').waitFor();
  await page.getByRole('button', { name: 'Demo experiment', exact: true }).click(); await page.locator('.layer-row').waitFor();
  const original = await exported();
  const originalInfo = await imageData(original); assert.equal(originalInfo.width, 1000); assert.equal(originalInfo.height, 1000); assert(originalInfo.pixel[0] > originalInfo.pixel[1]);
  await page.getByRole('button', { name: 'Effects', exact: true }).click();
  await addEffect('grayscale');
  const gray = await exported(); const grayInfo = await imageData(gray);
  assert.equal(grayInfo.pixel[0], grayInfo.pixel[1]); assert.equal(grayInfo.pixel[1], grayInfo.pixel[2]); assert(!gray.equals(original));
  await page.getByRole('button', { name: 'Vypnout efekt Grayscale', exact: true }).click();
  assert((await exported()).equals(original), 'Effect bypass must restore the original image');
  await page.getByRole('button', { name: 'Zapnout efekt Grayscale', exact: true }).click();
  await addEffect('threshold');
  await page.getByRole('slider', { name: 'Threshold', exact: true }).fill('0.9'); await frame();
  assert.equal(await page.getByRole('spinbutton', { name: 'Threshold hodnota' }).inputValue(), '0.9');
  await page.keyboard.press('Control+z');
  assert.equal(await page.getByRole('spinbutton', { name: 'Threshold hodnota' }).inputValue(), '0.5');
  await page.keyboard.press('Control+Shift+z');
  assert.equal(await page.getByRole('spinbutton', { name: 'Threshold hodnota' }).inputValue(), '0.9');
  await page.getByRole('button', { name: 'Resetovat parametry efektu', exact: true }).click();
  assert.equal(await page.getByRole('spinbutton', { name: 'Threshold hodnota' }).inputValue(), '0.5');
  await page.getByRole('button', { name: 'Odstranit efekt Threshold', exact: true }).click();
  for (const id of ['posterize', 'rgb-shift', 'wave', 'noise']) { await addEffect(id); await exported(); }
  const seed = await page.getByRole('spinbutton', { name: 'Seed', exact: true }).inputValue();
  const deterministic = await exported();
  await page.getByRole('button', { name: 'Posunout efekt nahoru', exact: true }).click();
  assert(!(await exported()).equals(deterministic), 'Effect order must change the rendered result');
  await page.keyboard.press('Control+z');
  assert((await exported()).equals(deterministic));
  await page.locator('.effect-row').first().dragTo(page.locator('.effect-row').last());
  assert.equal(await page.locator('.effect-select').first().innerText(), 'Posterize', 'Drag and drop must reorder the stack');
  await page.keyboard.press('Control+z');
  assert.equal(await page.locator('.effect-select').first().innerText(), 'Grayscale');
  await page.getByRole('button', { name: 'Skutečná velikost dokumentu (1)' }).click();
  const host = await page.locator('.canvas-host').boundingBox(); await page.mouse.move(host.x + 150, host.y + 150); await page.mouse.wheel(0, -500); await frame();
  await page.getByRole('button', { name: 'Posun pohledu (H / mezerník)' }).click();
  await page.mouse.move(host.x + 180, host.y + 180); await page.mouse.down(); await page.mouse.move(host.x + 260, host.y + 260); await page.mouse.up(); await frame();
  assert((await exported()).equals(deterministic), 'Export must ignore editor zoom and pan');
  await page.getByRole('button', { name: 'Randomize seed' }).click();
  assert(!deterministic.equals(await exported()), 'Randomize must change the effect');
  await page.getByRole('spinbutton', { name: 'Seed', exact: true }).fill(seed); await page.getByRole('spinbutton', { name: 'Seed', exact: true }).press('Tab');
  assert((await exported()).equals(deterministic), 'The same seed must reproduce the same pixels');
  const jpg = await imageData(await exported('jpeg'), 'image/jpeg'); assert.equal(jpg.width, 1000);
  const webp = await imageData(await exported('webp'), 'image/webp'); assert.equal(webp.height, 1000);

  const pendingSave = page.waitForEvent('download'); await page.getByRole('button', { name: 'Uložit projekt (Ctrl+S)' }).click();
  const projectDownload = await pendingSave; const saved = await readFile(await projectDownload.path()); const project = JSON.parse(saved);
  assert.equal(project.format, 'rasterlab'); assert.equal(project.version, 2); assert.equal(project.document.layers[0].effects.length, 5); assert(project.assets[0].dataUrl.startsWith('data:image/png;base64,'));
  assert(!project.document.layers[0].texture && project.document.layers[0].assetId === project.assets[0].id);
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click(); await page.getByRole('dialog').getByRole('checkbox').check(); await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click();
  await page.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: saved });
  await page.getByRole('button', { name: 'Vypnout efekt Noise', exact: true }).waitFor();
  assert((await exported()).equals(deterministic), 'Project reload must restore the exact rendered image');
  assert.equal(await page.getByRole('button', { name: /^Zpět \(Ctrl\+Z\)/ }).isDisabled(), true, 'Opening a project resets history');
  const invalid = { ...project, version: 999 }; const errorCount = errors.length;
  await page.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('button', { name: 'Layers 1', exact: true }).count(), 1);
  assert.equal(errors.length, errorCount + 1); assert(errors.at(-1).includes('[DOCUMENT]')); errors.pop(); await page.getByRole('button', { name: 'Zavřít chybu' }).click();
  await page.getByRole('button', { name: 'Přizpůsobit dokument pracovní ploše (F)' }).click();
  await page.screenshot({ path: 'test-results/effects-projects.png' });

  // Known byte colors test actual secondary-texture and bit-operation output.
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click();
  await page.getByRole('dialog').getByLabel('Šířka / px').fill('64'); await page.getByRole('dialog').getByLabel('Výška / px').fill('32');
  await page.getByRole('dialog').getByRole('checkbox').check(); await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click();
  const colors = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32; const context = canvas.getContext('2d');
    return ['#aacc55', '#ff0000'].map(color => { context.fillStyle = color; context.fillRect(0, 0, 64, 32); return canvas.toDataURL('image/png').split(',')[1]; });
  });
  await page.locator('input[accept^="image/"]').setInputFiles(colors.map((base64, index) => ({ name: `color-${index}.png`, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })));
  await page.getByRole('button', { name: 'Layers 2', exact: true }).waitFor();
  const expected = { xor: [85, 204, 85, 255], and: [170, 0, 0, 255], or: [255, 204, 85, 255], nand: [85, 255, 255, 255] };
  for (const id of ['xor', 'and', 'or', 'nand']) {
    await addEffect(id); assert.deepEqual((await imageData(await exported())).pixel, expected[id], `${id} must apply byte operations on the GPU`);
    await page.getByRole('combobox', { name: 'Mode', exact: true }).selectOption('binary');
    const binary = id === 'and' ? 0 : 255; assert.deepEqual((await imageData(await exported())).pixel, [binary, binary, binary, 255]);
    await page.getByRole('button', { name: `Odstranit efekt ${id.toUpperCase()}`, exact: true }).click();
  }
  assert.deepEqual(errors, [], 'No unexpected browser or shader errors');
  console.log('Features passed: 10 GPU effects, bypass/reset/parameters, seeded noise, undo/redo, versioned project roundtrip, failed load recovery, PNG/JPEG/WebP export independent of viewport.');
} catch (error) { await page.screenshot({ path: 'test-results/features-failure.png' }); console.error('Browser errors:', errors); throw error; }
finally { await browser.close(); }
