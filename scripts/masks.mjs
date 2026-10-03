import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { effectHarness } from './effect-harness.mjs';
const h = await effectHarness(), { page } = h;
page.on('dialog', dialog => dialog.accept());
const pixel = (image, x, y) => image.pixels.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
const select = async name => { await page.getByRole('button', { name: /^Layers \d+$/ }).click(); await page.getByRole('button', { name: `${name} Generator layer`, exact: true }).click(); };
const rename = async name => { await page.getByRole('textbox', { name: 'Název vrstvy' }).fill(name); await page.getByRole('textbox', { name: 'Název vrstvy' }).press('Tab'); };
try {
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click(); await page.getByLabel('Šířka / px').fill('128'); await page.getByLabel('Výška / px').fill('96'); await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click();
  await page.getByRole('button', { name: 'Generators', exact: true }).click(); await page.getByRole('button', { name: 'Přidat generátor Checker', exact: true }).click(); await rename('Mask source');
  const sourceId = JSON.parse(await h.save()).document.layers[0].id; await page.getByRole('button', { name: 'Skrýt Mask source', exact: true }).click();
  await page.getByRole('button', { name: 'Přidat generátor Checker', exact: true }).click(); await rename('Paper'); await h.set('Background gray hodnota', 1);
  const plain = await h.exported(); assert.deepEqual(pixel(await h.decoded(plain), 4, 4), [255,255,255,255]);
  await page.getByRole('combobox', { name: 'Zdroj masky', exact: true }).selectOption(sourceId); const masked = await h.exported(); let image = await h.decoded(masked);
  assert.deepEqual(pixel(image, 4, 4), [0,0,0,0]); assert.deepEqual(pixel(image, 40, 4), [255,255,255,255]);
  await page.getByRole('checkbox', { name: 'Invertovat masku', exact: true }).check(); image = await h.decoded(await h.exported()); assert.equal(pixel(image, 4, 4)[3], 255); assert.equal(pixel(image, 40, 4)[3], 0); await page.keyboard.press('Control+z'); assert(masked.equals(await h.exported()));
  await page.getByRole('combobox', { name: 'Režim masky', exact: true }).selectOption('alpha'); assert(plain.equals(await h.exported())); await page.keyboard.press('Control+z');
  await page.getByRole('slider', { name: 'Síla masky', exact: true }).fill('0.5'); await page.getByRole('slider', { name: 'Síla masky', exact: true }).press('Tab'); image = await h.decoded(await h.exported()); assert(Math.abs(pixel(image, 4, 4)[3]-128)<=1); assert.equal(pixel(image, 40, 4)[3], 255); await page.keyboard.press('Control+z');
  await h.set('Změkčení masky / px', 8); const softened = await h.exported(); image = await h.decoded(softened); assert(pixel(image, 31, 16)[3] > 0 && pixel(image, 31, 16)[3] < 255); assert.equal(pixel(image, 16, 16)[3], 0); assert.equal(pixel(image, 48, 16)[3], 255); assert(softened.equals(await h.exported()));
  await page.getByRole('checkbox', { name: 'Maska aktivní', exact: true }).uncheck(); assert(plain.equals(await h.exported())); await page.keyboard.press('Control+z'); assert(softened.equals(await h.exported()));
  const saved = await h.save(); assert.equal(JSON.parse(saved).version, 3); await h.load(saved); assert(softened.equals(await h.exported()));
  await select('Mask source'); const targetId = JSON.parse(saved).document.layers[0].id; assert.equal(await page.getByRole('combobox', { name: 'Zdroj masky', exact: true }).locator(`option[value="${targetId}"]`).count(), 0, 'cyclic candidate is unavailable');
  await h.set('Cell size / px hodnota', 8); assert(!softened.equals(await h.exported())); await page.keyboard.press('Control+z'); assert(softened.equals(await h.exported()));
  await page.getByRole('button', { name: 'Odstranit vybranou vrstvu', exact: true }).click(); assert.equal(JSON.parse(await h.save()).document.layers[0].mask, undefined); assert(plain.equals(await h.exported())); await page.keyboard.press('Control+z'); assert(softened.equals(await h.exported()));
  // Alpha and luminance both respect transparent source coverage.
  await select('Mask source'); await h.set('Pozice X', 16); await select('Paper'); await page.getByRole('combobox', { name: 'Režim masky', exact: true }).selectOption('alpha'); await h.set('Změkčení masky / px', 0); image = await h.decoded(await h.exported()); assert.equal(pixel(image, 4, 40)[3], 0); assert.equal(pixel(image, 40, 40)[3], 255);
  await h.load(saved); await select('Paper'); await page.getByRole('button', { name: 'Seskupit vybranou vrstvu', exact: true }).click(); assert(softened.equals(await h.exported()));
  await select('Mask source'); const groupId = JSON.parse(await h.save()).document.layers[0].id; await page.getByRole('combobox', { name: 'Nadřazená skupina', exact: true }).selectOption(groupId);
  await page.getByRole('button', { name: 'Group Group layer', exact: true }).click(); await rename('Masked group'); const groupOutput = await h.exported();
  await page.getByRole('button', { name: 'Duplikovat vybranou vrstvu nebo skupinu', exact: true }).click(); let model = JSON.parse(await h.save()); const copy = model.document.layers[0]; assert.notEqual(copy.id, groupId); assert.equal(copy.children[1].mask.sourceId, copy.children[0].id); assert.notEqual(copy.children[0].id, sourceId);
  const duplicated = await h.exported(); await page.keyboard.press('Control+z'); assert(groupOutput.equals(await h.exported())); await page.keyboard.press('Control+Shift+z'); assert(duplicated.equals(await h.exported()));
  await page.getByRole('button', { name: 'Skrýt Masked group', exact: true }).click(); assert(groupOutput.equals(await h.exported()), 'copy is independently reproducible'); const final = await h.save(); await h.load(final); assert(groupOutput.equals(await h.exported()));
  for (const [format,mime] of [['jpeg','image/jpeg'],['webp','image/webp']]) { image = await h.decoded(await h.exported(format), mime); assert.equal(image.width,128); assert.equal(image.height,96); }
  await page.getByRole('button', { name: 'Masked group copy Group layer', exact: true }).click();
  await page.getByRole('combobox', { name: 'Zdroj masky', exact: true }).selectOption(copy.children[0].id); await page.getByRole('combobox', { name: 'Režim masky', exact: true }).selectOption('alpha'); assert(groupOutput.equals(await h.exported()), 'group supports its own mask');
  await page.getByRole('checkbox', { name: 'Invertovat masku', exact: true }).check(); image = await h.decoded(await h.exported()); assert(image.pixels.every((value,index) => index % 4 !== 3 || value === 0)); await page.keyboard.press('Control+z'); assert(groupOutput.equals(await h.exported()));
  const groupMasked = await h.save(); await h.load(groupMasked); assert(groupOutput.equals(await h.exported()));
  await page.getByRole('button', { name: 'Masked group copy Group layer', exact: true }).click(); await rename('Recovered mask group');
  await page.getByRole('status').filter({ hasText: 'Kopie obnovy:' }).waitFor({ timeout: 25000 });
  await page.reload(); await page.getByRole('button', { name: 'Obnovit projekt', exact: true }).click(); await page.getByRole('button', { name: 'Recovered mask group Group layer', exact: true }).waitFor(); assert(groupOutput.equals(await h.exported()), 'IndexedDB recovery restores nested masks and generators'); const example = await h.save(); await mkdir('examples', { recursive: true }); await writeFile('examples/masked-generators.json', example);
  await page.screenshot({ path: 'test-results/masks-groups.png' }); await page.getByRole('combobox', { name: 'Zdroj masky', exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: 'test-results/masks-controls.png' }); assert.deepEqual(h.errors, []);
  console.log('Masks passed: exact alpha/luminance pixels, invert/strength/feather/bypass, source invalidation, cycle exclusion, removal/undo, v3 roundtrip, group duplication with remapped references, real IndexedDB recovery and all exports.');
} catch (error) { console.error('Browser errors:', h.errors); await page.screenshot({ path: 'test-results/masks-failure.png' }); throw error; }
finally { await h.browser.close(); }
