import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
export async function effectHarness() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const csp = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8')).app.security.csp;
  await page.route('**/*', async route => {
    if (!route.request().isNavigationRequest()) return route.continue();
    const response = await route.fetch(); await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
  });
  await page.goto(process.env.RASTERLAB_TEST_URL || 'http://127.0.0.1:4173'); await page.locator('.canvas-host canvas').waitFor();
  const exported = async (format = 'png') => {
    await page.getByRole('button', { name: 'Export…', exact: true }).click();
    await page.getByRole('combobox', { name: 'Formát exportu' }).selectOption(format);
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportovat', exact: true }).click();
    return readFile(await (await pending).path());
  };
  const save = async () => { const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Uložit projekt (Ctrl+S)' }).click(); return readFile(await (await pending).path()); };
  return {
    browser, page, errors, exported, save,
    async add(id) { await page.getByRole('combobox', { name: 'Typ nového efektu' }).selectOption(id); await page.getByRole('button', { name: 'Přidat efekt', exact: true }).click(); },
    async set(label, value) { const input = page.getByRole('spinbutton', { name: label, exact: true }); await input.fill(String(value)); await input.press('Tab'); },
    async load(file) { await page.locator('input[accept^=".json,"]').setInputFiles({ name: 'test.json', mimeType: 'application/json', buffer: file }); await page.getByRole('button', { name: 'Uložit projekt (Ctrl+S)' }).click({ trial: true }); },
    async decoded(buffer, mime = 'image/png') { return page.evaluate(async ({ base64, mime }) => {
      const image = new Image(); image.src = `data:${mime};base64,${base64}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, pixels: [...ctx.getImageData(0, 0, canvas.width, canvas.height).data] };
    }, { base64: buffer.toString('base64'), mime }); },
  };
}
