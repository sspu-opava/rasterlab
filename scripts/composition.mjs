import assert from 'node:assert/strict';
import { effectHarness } from './effect-harness.mjs';
import { mkdir } from 'node:fs/promises';
const h = await effectHarness(), { page } = h;
page.on('dialog', dialog => dialog.accept());
const generators = [['noise', 'Noise'], ['checker', 'Checker'], ['lines', 'Lines'], ['dots', 'Dots'], ['fbm', 'FBM Noise'], ['voronoi', 'Voronoi'], ['interference', 'Interference'], ['radial', 'Radial Field']];
const layersTab = () => page.getByRole('button', { name: /^Layers \d+$/ });
const select = async name => { await layersTab().click(); await page.getByRole('button', { name: `${name} Generator layer`, exact: true }).click(); };
const pixels = (image, x, y) => image.pixels.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
const create = async () => { await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click(); await page.getByLabel('Šířka / px').fill('128'); await page.getByLabel('Výška / px').fill('96'); const replace = page.getByRole('checkbox', { name: /Nahradit aktuální/ }); if (await replace.count()) await replace.check(); await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click(); };
await mkdir('test-results', { recursive: true });
try {
  await create(); await page.getByRole('button', { name: 'Generators', exact: true }).click();
  const gallery = [];
  for (const [id, name] of generators) {
    await page.getByRole('button', { name: `Přidat generátor ${name}`, exact: true }).click();
    const output = await h.exported(), decoded = await h.decoded(output); assert.equal(decoded.width, 128); assert.equal(decoded.height, 96); assert(decoded.pixels.every((value, index) => index % 4 !== 3 || value === 255), `${name} must fill the document`); assert(new Set(decoded.pixels.filter((_, index) => index % 4 === 0)).size > 1, `${name} must generate structure`); assert(output.equals(await h.exported()), `${name} is deterministic`); gallery.push({ name, base64: output.toString('base64') });
    if (id === 'checker') { assert.deepEqual(pixels(decoded, 4, 4), [0, 0, 0, 255]); assert.deepEqual(pixels(decoded, 40, 4), [255, 255, 255, 255]); await h.set('Cell size / px hodnota', 8); assert(!output.equals(await h.exported())); await page.keyboard.press('Control+z'); assert(output.equals(await h.exported())); }
    if (['noise', 'fbm', 'voronoi'].includes(id)) { await h.set('Seed', 54321); assert(!output.equals(await h.exported()), `${name} changed seed`); await page.keyboard.press('Control+z'); assert(output.equals(await h.exported()), `${name} seed undo`); }
    const saved = await h.save(), model = JSON.parse(saved); assert.equal(model.version, 3); assert.equal(model.assets.length, 0); assert.equal(model.document.layers[0].type, 'generated'); assert.equal(model.document.layers[0].generatorId, id);
    await h.load(saved); assert(output.equals(await h.exported()), `${name} project roundtrip`);
    await page.getByRole('button', { name: 'Skutečná velikost dokumentu (1)' }).click(); assert(output.equals(await h.exported()), `${name} final ignores viewport`);
    await page.getByRole('button', { name: 'Odstranit vybranou vrstvu', exact: true }).click(); console.log(`Generator verified: ${name}`);
  }
  // Group identity preserves pixels; children remain independently editable.
  await page.getByRole('button', { name: 'Přidat generátor Checker', exact: true }).click(); const checker = await h.exported();
  await page.getByRole('button', { name: 'Seskupit vybranou vrstvu', exact: true }).click(); assert(checker.equals(await h.exported()));
  let model = JSON.parse(await h.save()), groupId = model.document.layers[0].id, checkerId = model.document.layers[0].children[0].id;
  await page.getByRole('button', { name: 'Sbalit skupinu Group' }).click(); assert.equal(await page.getByRole('button', { name: 'Checker Generator layer', exact: true }).count(), 0); assert(checker.equals(await h.exported())); await page.getByRole('button', { name: 'Rozbalit skupinu Group' }).click();
  await select('Checker'); await h.set('Cell size / px hodnota', 8); const smallChecker = await h.exported(); assert(!smallChecker.equals(checker)); await page.keyboard.press('Control+z'); assert(checker.equals(await h.exported())); await page.keyboard.press('Control+Shift+z'); assert(smallChecker.equals(await h.exported()));
  await page.getByRole('button', { name: 'Přidat generátor Noise', exact: true }).click(); await page.getByRole('combobox', { name: 'Nadřazená skupina' }).selectOption(groupId);
  model = JSON.parse(await h.save()); assert.equal(model.document.layers.length, 1); assert.equal(model.document.layers[0].children.length, 2); const noiseId = model.document.layers[0].children[0].id;
  await page.getByRole('button', { name: 'Skrýt Noise', exact: true }).click(); assert(smallChecker.equals(await h.exported()));
  await page.getByRole('button', { name: 'Group Group layer', exact: true }).click(); await h.set('Pozice X', 10); let decoded = await h.decoded(await h.exported()); assert.equal(pixels(decoded, 4, 40)[3], 0); await page.keyboard.press('Control+z'); assert(smallChecker.equals(await h.exported()));
  await page.getByRole('slider', { name: 'Krytí vrstvy' }).fill('0.5'); await page.getByRole('slider', { name: 'Krytí vrstvy' }).press('Tab'); decoded = await h.decoded(await h.exported()); assert(Math.abs(pixels(decoded, 40, 30)[3] - 128) <= 1); await page.keyboard.press('Control+z');
  await page.getByRole('button', { name: 'Zamknout Group', exact: true }).click(); await select('Checker'); assert(await page.getByRole('spinbutton', { name: 'Cell size / px hodnota' }).isDisabled()); assert(await page.getByRole('button', { name: 'Odstranit vybranou vrstvu', exact: true }).isDisabled()); await page.getByRole('button', { name: 'Odemknout Group', exact: true }).click();
  // Hidden siblings can feed effects, but ancestors cannot feed their descendants.
  await page.getByRole('button', { name: 'Effects', exact: true }).click(); await h.add('xor'); await page.getByRole('combobox', { name: 'Druhá vrstva', exact: true }).selectOption(noiseId); const combined = await h.exported(); assert(!combined.equals(smallChecker));
  await page.getByRole('button', { name: 'Uložit stack', exact: true }).click(); await page.getByRole('textbox', { name: 'Název presetu' }).fill('Vnořený XOR'); await page.getByRole('dialog').getByRole('button', { name: 'Uložit preset', exact: true }).click();
  const saved = await h.save(); await h.load(saved); assert(combined.equals(await h.exported())); model = JSON.parse(await h.save()); assert.equal(model.document.layers[0].children[1].effects[0].inputs.secondary, noiseId);
  await layersTab().click(); await page.getByRole('button', { name: 'Group Group layer', exact: true }).click(); await page.getByRole('button', { name: 'Effects', exact: true }).click(); await h.add('posterize'); const groupEffect = await h.exported(); assert(!combined.equals(groupEffect)); await page.keyboard.press('Control+z'); assert(combined.equals(await h.exported()));
  // Reparenting, sibling order, child deletion and reference cleanup all roundtrip.
  await select('Checker'); await page.getByRole('combobox', { name: 'Nadřazená skupina' }).selectOption(''); assert.equal(JSON.parse(await h.save()).document.layers[0].id, checkerId); await page.keyboard.press('Control+z'); assert.equal(JSON.parse(await h.save()).document.layers[0].children[1].id, checkerId); assert(combined.equals(await h.exported()));
  await select('Noise'); await page.getByRole('button', { name: 'Posunout vrstvu dolů', exact: true }).click(); assert.equal(JSON.parse(await h.save()).document.layers[0].children[1].id, noiseId); await page.keyboard.press('Control+z');
  await page.getByRole('button', { name: 'Odstranit vybranou vrstvu', exact: true }).click(); model = JSON.parse(await h.save()); assert.deepEqual(model.document.layers[0].children[0].effects[0].inputs, {}); await page.keyboard.press('Control+z'); assert(combined.equals(await h.exported()));
  // A v1 asset-free legacy document migrates and the current composition reloads unchanged.
  const current = await h.save(); const legacy = JSON.parse(current); legacy.version = 1; legacy.document.layers = []; await h.load(Buffer.from(JSON.stringify(legacy))); assert.equal(JSON.parse(await h.save()).version, 3); await h.load(current); assert(combined.equals(await h.exported()));
  for (const [format, mime] of [['jpeg', 'image/jpeg'], ['webp', 'image/webp']]) { const image = await h.decoded(await h.exported(format), mime); assert.equal(image.width, 128); assert.equal(image.height, 96); }
  await select('Checker'); await page.getByRole('button', { name: 'Seskupit vybranou vrstvu', exact: true }).click(); await page.getByRole('textbox', { name: 'Název vrstvy' }).fill('Detail'); await page.getByRole('textbox', { name: 'Název vrstvy' }).press('Tab'); assert(combined.equals(await h.exported()), 'Nested identity group preserves output');
  const nested = await h.save(); await h.load(nested); assert(combined.equals(await h.exported())); assert.equal(JSON.parse(await h.save()).document.layers[0].children[1].children[0].id, checkerId);
  await layersTab().click(); await page.screenshot({ path: 'test-results/composition-groups.png' });
  const expectedMissing = h.errors.filter(message => message.includes('[EFFECT]') && message.includes('Vyberte druhou vstupní vrstvu')); for (const message of expectedMissing) h.errors.splice(h.errors.indexOf(message), 1); assert.deepEqual(h.errors, []);
  const sheet = await page.evaluate(async items => { const c = document.createElement('canvas'); c.width = 960; c.height = 430; const ctx = c.getContext('2d'); ctx.fillStyle = '#171b20'; ctx.fillRect(0, 0, c.width, c.height); for (let i = 0; i < items.length; i++) { const image = new Image(); image.src = `data:image/png;base64,${items[i].base64}`; await image.decode(); const x = i % 4 * 240, y = Math.floor(i / 4) * 215; ctx.drawImage(image, x + 5, y + 5, 230, 173); ctx.fillStyle = '#e1e9f5'; ctx.font = '14px sans-serif'; ctx.fillText(items[i].name, x + 7, y + 198); } return c.toDataURL().split(',')[1]; }, gallery);
  await (await import('node:fs/promises')).writeFile('test-results/composition-generators.png', Buffer.from(sheet, 'base64'));
  console.log('Composition passed: eight real GPU generators without assets, deterministic seeds, exact checker pixels, groups/transforms/opacity/locks/nested effect inputs, history, presets, v1 migration/v3 roundtrips and all exports.');
} catch (error) { console.error('Browser errors:', h.errors); await page.screenshot({ path: 'test-results/composition-failure.png' }); throw error; }
finally { await h.browser.close(); }

