import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { effectHarness } from './effect-harness.mjs';
import { expect } from '@playwright/test';
const h = await effectHarness(), { page } = h;
page.on('dialog', dialog => dialog.accept());
const json = async () => JSON.parse(await h.save());
const effects = () => page.getByRole('button', { name: 'Efekty', exact: true });
const selectTarget = async () => { await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).click(); await page.getByRole('button', { name: /target Rastrová vrstva/ }).click(); await effects().click(); };
const dialog = () => page.getByRole('dialog');
const savePreset = async name => { await page.getByRole('button', { name: 'Uložit stack', exact: true }).click(); await page.getByRole('textbox', { name: 'Název presetu' }).fill(name); await dialog().getByRole('button', { name: 'Uložit preset', exact: true }).click(); };
const apply = async (replace = false, role) => { if (role) await dialog().getByRole('combobox', { name: /^Zdroj presetu:/ }).selectOption(role); if (replace) await dialog().getByRole('combobox', { name: 'Umístění presetu' }).selectOption({ label: 'Nahradit celý stack' }); await dialog().getByRole('button', { name: 'Použít preset', exact: true }).click(); };
await mkdir('test-results', { recursive: true });
try {
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click();
  await page.getByLabel('Šířka / px').fill('128'); await page.getByLabel('Výška / px').fill('96'); await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click();
  const base64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const ctx = c.getContext('2d'), image = ctx.createImageData(128, 96); for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) image.data.set([(x * 13 + y * 7) % 256, (y * 9) % 256, (x * 3) % 256, x < 4 ? 0 : 255], (y * 128 + x) * 4); ctx.putImageData(image, 0, 0); return c.toDataURL().split(',')[1]; });
  await page.locator('input[accept^="image/"]').setInputFiles(['reference.png', 'target.png'].map(name => ({ name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })));
  await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).waitFor(); await page.getByRole('button', { name: 'Skrýt reference', exact: true }).click(); await effects().click();
  const original = await h.exported();
  const search = page.getByRole('textbox', { name: 'Hledat efekty' }), selector = page.getByRole('combobox', { name: 'Typ nového efektu' });
  await search.fill('xyz-no-match'); assert.equal(await selector.locator('option').count(), 0); assert(await page.getByRole('button', { name: 'Přidat efekt', exact: true }).isDisabled());
  await search.fill('noise'); assert((await selector.locator('option').allTextContents()).includes('FBM Noise'));
  await selector.selectOption('noise'); await page.getByRole('button', { name: 'Oblíbený vybraný efekt' }).click(); await page.getByRole('button', { name: 'Pouze oblíbené efekty' }).click(); assert.equal(await selector.locator('option').count(), 1);
  await search.fill(''); await h.add('noise'); await h.set('Seed', 123); await h.set('Amount hodnota', .2);
  const single = await h.exported(); await page.getByRole('button', { name: 'Duplikovat efekt', exact: true }).click();
  let model = await json(); assert.equal(model.document.layers[0].effects.length, 2); assert.notEqual(model.document.layers[0].effects[0].id, model.document.layers[0].effects[1].id); assert.deepEqual(model.document.layers[0].effects[0].parameters, model.document.layers[0].effects[1].parameters);
  await h.set('Amount hodnota', .8); await page.locator('.document-tab').click(); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); assert(single.equals(await h.exported()), 'Duplicate undo restores source effect');
  await page.getByRole('button', { name: 'Pouze oblíbené efekty' }).click();
  await h.add('xor'); await page.getByRole('button', { name: 'Vypnout efekt XOR', exact: true }).click();
  const stackPixels = await h.exported(), baseline = await h.save(), baselineModel = JSON.parse(baseline);
  const [targetId, referenceId] = baselineModel.document.layers.map(layer => layer.id);
  await savePreset('Můj experiment');
  await page.getByRole('button', { name: 'Presety', exact: true }).click();
  const card = page.locator('.preset-card').filter({ has: page.getByText('Můj experiment', { exact: true }) });
  const pending = page.waitForEvent('download'); await card.getByRole('button', { name: 'Exportovat preset Můj experiment' }).click(); const presetBytes = await readFile(await (await pending).path()), preset = JSON.parse(presetBytes);
  assert.equal(preset.format, 'rasterlab-preset'); assert.equal(preset.effects.length, 2); assert.equal(preset.roles.length, 1); assert(!presetBytes.toString().includes(referenceId)); assert.equal(preset.effects[0].parameters.seed, 123); assert.equal(preset.effects[1].enabled, false);
  // Verify native bridge routing independently from the filesystem Rust roundtrip.
  await page.evaluate(() => { window.isTauri = true; window.presetCalls = []; window.presetCancel = true; window.__TAURI_INTERNALS__ = { invoke: async (command, args) => { window.presetCalls.push({ command, args }); if (command === 'plugin:dialog|save') return window.presetCancel ? null : 'E:\\exports\\experiment.preset.json'; if (command === 'write_preset') return; throw new Error(`Unexpected native command ${command}`); } }; });
  await card.getByRole('button', { name: 'Exportovat preset Můj experiment' }).click(); await expect.poll(() => page.evaluate(() => window.presetCalls.length)).toBe(1);
  await page.evaluate(() => { window.presetCancel = false; window.presetCalls = []; }); await card.getByRole('button', { name: 'Exportovat preset Můj experiment' }).click(); await expect.poll(() => page.evaluate(() => window.presetCalls.length)).toBe(2);
  const calls = await page.evaluate(() => window.presetCalls); assert.equal(calls[0].command, 'plugin:dialog|save'); assert.equal(calls[1].command, 'write_preset'); assert.deepEqual(JSON.parse(calls[1].args.presetJson), preset); assert.equal(calls[1].args.path, 'E:\\exports\\experiment.preset.json');
  await page.evaluate(() => { window.isTauri = false; delete window.__TAURI_INTERNALS__; });
  // Clipboard survives switching layers; every source is explicitly rebound.
  await page.getByRole('button', { name: 'Kopírovat stack' }).click();
  // Remove the original reverse edge before binding a copy back to the source layer.
  await page.getByRole('combobox', { name: 'Druhá vrstva', exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).click(); await page.getByRole('button', { name: /reference Rastrová vrstva/ }).click(); await effects().click();
  await page.getByRole('button', { name: 'Vložit stack' }).click(); await apply(false, targetId);
  model = await json(); assert.equal(model.document.layers[1].effects.length, 2); assert.equal(model.document.layers[1].effects[1].inputs.secondary, targetId);
  assert.notEqual(model.document.layers[1].effects[0].id, model.document.layers[0].effects[0].id);
  await page.keyboard.press('Control+z'); model = await json(); assert.equal(model.document.layers[1].effects.length, 0, 'One undo removes complete pasted stack'); await page.keyboard.press('Control+Shift+z'); assert.equal((await json()).document.layers[1].effects.length, 2);
  await h.load(baseline); await selectTarget();
  await card.getByRole('button', { name: 'Použít', exact: true }).click(); await apply(true, referenceId); assert(stackPixels.equals(await h.exported()), 'Preset replacement reproduces exact stack pixels');
  const replaced = await h.save(); assert.notEqual(JSON.parse(replaced).document.layers[0].effects[0].id, baselineModel.document.layers[0].effects[0].id);
  await page.keyboard.press('Control+z'); assert.deepEqual((await json()).document.layers[0].effects, baselineModel.document.layers[0].effects);
  // Single-effect presets and import/export retain disabled state and parameters.
  await page.getByRole('button', { name: 'Noise', exact: true }).click(); await page.getByRole('button', { name: 'Uložit vybraný efekt jako preset' }).click(); await page.getByRole('textbox', { name: 'Název presetu' }).fill('Samotný šum'); await dialog().getByRole('button', { name: 'Uložit preset', exact: true }).click();
  assert.equal(await page.locator('.preset-card').count(), 12);
  await page.locator('input[accept=".preset.json,application/json"]').setInputFiles({ name: 'import.preset.json', mimeType: 'application/json', buffer: presetBytes }); await expect(page.locator('.preset-card')).toHaveCount(13);
  await page.locator('input[accept=".preset.json,application/json"]').setInputFiles({ name: 'bad.preset.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"wrong"}') }); await page.getByRole('alert').filter({ hasText: 'Nepodporovaný' }).waitFor(); assert.equal(await page.locator('.preset-card').count(), 13);
  await page.getByRole('button', { name: 'Odstranit preset Samotný šum' }).click(); await expect(page.locator('.preset-card')).toHaveCount(12);
  // A candidate cycle is rejected without a partial history commit.
  const cycle = structuredClone(baselineModel); cycle.document.layers[0].effects = []; cycle.document.layers[1].effects = [{ ...baselineModel.document.layers[0].effects[1], id: 'cycle-ref', enabled: true, inputs: { secondary: targetId } }];
  await h.load(Buffer.from(JSON.stringify(cycle))); await selectTarget(); await card.first().getByRole('button', { name: 'Použít', exact: true }).click(); await apply(false, referenceId); await dialog().getByRole('alert').filter({ hasText: 'cyklus' }).waitFor(); await dialog().getByRole('button', { name: 'Zrušit', exact: true }).click(); assert.equal((await json()).document.layers[0].effects.length, 0);
  // Append enforces 32 effects; replacement is a single undoable operation.
  const limit = structuredClone(baselineModel); limit.document.layers[0].effects = Array.from({ length: 31 }, (_, index) => ({ ...baselineModel.document.layers[0].effects[0], id: `limit-${index}`, enabled: false }));
  await h.load(Buffer.from(JSON.stringify(limit))); await selectTarget(); await card.first().getByRole('button', { name: 'Použít', exact: true }).click(); await apply(false, referenceId); await dialog().getByRole('alert').filter({ hasText: '32 efektů' }).waitFor(); await dialog().getByRole('button', { name: 'Zrušit', exact: true }).click(); assert.equal((await json()).document.layers[0].effects.length, 31);
  await card.first().getByRole('button', { name: 'Použít', exact: true }).click(); await apply(true, referenceId); assert.equal((await json()).document.layers[0].effects.length, 2); await page.keyboard.press('Control+z'); assert.equal((await json()).document.layers[0].effects.length, 31);
  // Real IndexedDB autosave includes original Blobs and never marks a document saved.
  await h.load(baseline); await effects().click(); await page.getByRole('button', { name: 'Noise', exact: true }).click(); await h.set('Amount hodnota', .4);
  const recoveredPixels = await h.exported();
  await page.getByRole('status').filter({ hasText: 'Kopie obnovy:' }).waitFor({ timeout: 25000 });
  assert((await page.locator('.document-tab').innerText()).includes('*'));
  const recovery = await page.evaluate(async () => { const db = await new Promise((resolve, reject) => { const request = indexedDB.open('rasterlab-recovery', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); return new Promise((resolve, reject) => { const tx = db.transaction('snapshots'), request = tx.objectStore('snapshots').get('workspace'); request.onsuccess = () => { const record = request.result; resolve({ effects: record.project.document.layers[0].effects, blobs: Object.values(record.blobs).map(blob => ({ size: blob.size, type: blob.type })) }); db.close(); }; request.onerror = () => reject(request.error); }); });
  assert.equal(recovery.effects[0].parameters.amount, .4); assert.equal(recovery.blobs.length, 2); assert(recovery.blobs.every(blob => blob.size > 0 && blob.type === 'image/png'));
  await page.reload(); await page.getByRole('button', { name: 'Obnovit projekt', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Presety', exact: true }).click(); assert.equal(await page.locator('.preset-card').count(), 12, 'Presets persist across app reload');
  await page.getByRole('button', { name: 'Obnovit projekt', exact: true }).click(); await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).waitFor(); assert((await page.locator('.document-tab').innerText()).includes('*')); assert(recoveredPixels.equals(await h.exported()), 'Recovered project reproduces GPU pixels');
  await effects().click(); await page.getByRole('button', { name: 'Pouze oblíbené efekty' }).click(); assert.equal(await selector.locator('option').count(), 1, 'Favorites persist across reload');
  await page.screenshot({ path: 'test-results/workflow-presets.png' });
  await h.save(); await page.reload(); await page.locator('.canvas-host canvas').waitFor(); await page.waitForTimeout(400); assert.equal(await page.getByRole('button', { name: 'Obnovit projekt', exact: true }).count(), 0, 'Manual save clears stale recovery');
  assert.deepEqual(h.errors, []);
  console.log('Workflow passed: search/favorites, independent duplication, single/stack presets, import/export/persistence, explicit input rebinding, atomic cycle/limit rejection, undo/redo, exact GPU roundtrip and real IndexedDB recovery with original assets.');
} catch (error) { console.error('Browser errors:', h.errors); await page.screenshot({ path: 'test-results/workflow-failure.png' }); throw error; }
finally { await h.browser.close(); }
