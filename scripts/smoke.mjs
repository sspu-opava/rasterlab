import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const csp = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).app.security.csp;
if (process.env.RASTERLAB_TEST_URL) await page.route('**/*', async route => {
  if (!route.request().isNavigationRequest()) return route.continue();
  const response = await route.fetch();
  await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await mkdir('test-results', { recursive: true });
try {
  await page.goto(process.env.RASTERLAB_TEST_URL || 'http://127.0.0.1:5173');
  await page.locator('.canvas-host canvas').waitFor();
  await page.getByText('Prostor pro váš další experiment').waitFor();
  await page.screenshot({ path: 'test-results/foundation-empty.png' });

  // A real decoded PNG enters the pipeline, not a placeholder asset.
  await page.locator('input[accept^="image/"]').setInputFiles('src-tauri/icons/icon.png');
  await page.locator('.layer-row').waitFor();
  assert.equal(await page.locator('.layer-row').count(), 1);
  await frame();
  const canvas = page.locator('.canvas-host canvas');
  const rendered = await canvas.screenshot();
  await page.getByRole('button', { name: 'Skrýt icon', exact: true }).click();
  await frame();
  const hidden = await canvas.screenshot();
  assert(!rendered.equals(hidden), 'Visibility must alter the rendered image');
  await page.getByRole('button', { name: 'Zobrazit icon', exact: true }).click();
  await page.getByRole('slider', { name: 'Krytí vrstvy' }).fill('0');
  await frame();
  assert((await canvas.screenshot()).equals(hidden), 'Zero opacity must match hidden layer rendering');
  await page.getByRole('slider', { name: 'Krytí vrstvy' }).fill('1');

  await page.getByRole('button', { name: 'Skutečná velikost dokumentu (1)' }).click();
  assert.equal(await page.locator('.zoom-readout').innerText(), '100%');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, -200);
  await frame();
  assert.notEqual(await page.locator('.zoom-readout').innerText(), '100%');
  assert.equal(await page.locator('.status-size').innerText(), '1000 × 1000 px');

  await page.getByRole('button', { name: 'Posun pohledu (H / mezerník)' }).click();
  const beforePan = await canvas.screenshot();
  await page.mouse.move(bounds.x + 100, bounds.y + 100);
  await page.mouse.down(); await page.mouse.move(bounds.x + 170, bounds.y + 140); await page.mouse.up();
  await frame();
  assert(!beforePan.equals(await canvas.screenshot()), 'Pan must change viewport rendering');

  await page.getByRole('button', { name: 'Demo experiment', exact: true }).click();
  await page.getByRole('button', { name: 'Skrýt experiment-001', exact: true }).waitFor();
  assert.equal(await page.locator('.layer-row').count(), 2);
  for (const mode of ['multiply', 'screen', 'overlay', 'difference', 'add', 'normal']) {
    await page.getByRole('combobox', { name: 'Blend mode' }).selectOption(mode);
    await frame();
  }
  assert.equal(await page.getByRole('alert').count(), 0, 'Blend modes must render without errors');
  await page.getByRole('button', { name: 'Přizpůsobit dokument pracovní ploše (F)' }).click();
  await frame();
  await page.screenshot({ path: 'test-results/foundation-demo.png' });

  await page.getByRole('button', { name: 'Zamknout experiment-001', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Název vrstvy' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Odemknout experiment-001', exact: true }).click();
  const formats = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d'); context.fillStyle = '#e43532'; context.fillRect(0, 0, 32, 32);
    return ['image/jpeg', 'image/webp'].map(type => ({ type, data: canvas.toDataURL(type).split(',')[1] }));
  });
  await page.locator('input[accept^="image/"]').setInputFiles(formats.map((format, i) => ({ name: i === 0 ? 'test.jpg' : 'test.webp', mimeType: format.type, buffer: Buffer.from(format.data, 'base64') })));
  // Both files decode asynchronously; seeing the first layer does not finish the batch.
  await page.waitForFunction(() => document.querySelectorAll('.layer-row').length === 4);
  await page.getByRole('button', { name: 'Importovat obrázky (Ctrl+I)', exact: true }).click({ trial: true });
  assert.equal(await page.locator('.layer-row').count(), 4);
  await page.locator('input[accept^="image/"]').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('invalid bitmap') });
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.layer-row').count(), 4, 'Invalid import must preserve the document');
  await page.getByRole('button', { name: 'Zavřít chybu' }).click();
  // The failed decode is expected and logged; all other errors remain failures.
  assert.equal(errors.length, 1);
  assert(errors[0].includes('[DOCUMENT]'));
  errors.length = 0;
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click();
  await page.getByRole('button', { name: 'Zahodit změny', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Šířka / px').fill('1600');
  await dialog.getByLabel('Výška / px').fill('900');
  await dialog.getByRole('button', { name: 'Vytvořit dokument' }).click();
  await page.getByText('Prostor pro váš další experiment').waitFor();
  assert.equal(await page.locator('.status-size').innerText(), '1600 × 900 px');
  assert.equal(await page.locator('.layer-row').count(), 0);
  assert.deepEqual(errors, [], 'No browser/rendering errors');
  console.log('Browser smoke passed: WebGL, PNG/JPEG/WebP import, visibility, opacity, all blend modes, zoom, pan, demo, lock, invalid import recovery, custom document.');
} catch (error) {
  await page.screenshot({ path: 'test-results/failure.png' });
  console.error('Browser errors:', errors);
  throw error;
} finally { await browser.close(); }
