import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { effectHarness } from './effect-harness.mjs';
const h = await effectHarness(), { page } = h;
const effects = [
  ['logic-matrix', 'Logic Matrix'], ['difference-fold', 'Difference Fold'], ['bit-plane-mixer', 'Bit Plane Mixer'], ['quantized-difference', 'Quantized Difference'],
  ['cross-strips', 'Cross Strips'], ['fragment-scatter', 'Fragment Scatter'], ['cut-up', 'Cut-Up'], ['multi-source-mosaic', 'Multi-Source Mosaic'],
  ['fold-map', 'Fold Map'], ['paper-warp', 'Paper Warp'], ['torn-paper', 'Torn Paper'], ['print-misregistration', 'Print Misregistration'],
  ['fbm-noise', 'FBM Noise'], ['voronoi-field', 'Voronoi Field'], ['flow-field', 'Flow Field'], ['radial-field', 'Radial Field'],
  ['block-corruption', 'Block Corruption'], ['pixel-sort', 'Pixel Sort'], ['feedback', 'Feedback'], ['reaction-diffusion', 'Reaction Diffusion'],
];
const seeded = new Set(['cross-strips', 'fragment-scatter', 'cut-up', 'multi-source-mosaic', 'fold-map', 'paper-warp', 'torn-paper', 'fbm-noise', 'voronoi-field', 'flow-field', 'block-corruption', 'reaction-diffusion']);
const singleZero = { 'fold-map': 'Fold depth', 'paper-warp': 'Amplitude / px', 'fbm-noise': 'Amount', 'voronoi-field': 'Amount', 'flow-field': 'Flow strength / px', 'radial-field': 'Amount', 'block-corruption': 'Corruption rate', 'pixel-sort': 'Sort threshold', 'feedback': 'Iterations', 'reaction-diffusion': 'Amount', 'cut-up': 'Randomness' };
const gallery = [];
await mkdir('test-results', { recursive: true });
try {
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click();
  await page.getByLabel('Šířka / px').fill('128'); await page.getByLabel('Výška / px').fill('96');
  await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click();
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96; const ctx = canvas.getContext('2d');
    return [1, 0].map(source => {
      const data = ctx.createImageData(128, 96);
      for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
        const index = (y * 128 + x) * 4;
        data.data[index] = (x * 17 + y * 3 + source * 99) % 256;
        data.data[index + 1] = (y * 13 + x * 5 + source * 47) % 256;
        data.data[index + 2] = ((x >> 3) % 2 ? 220 : 50) + source * 9;
        data.data[index + 3] = source ? 255 : x < 4 ? 0 : y > 88 ? 128 : 255;
      }
      ctx.putImageData(data, 0, 0); return canvas.toDataURL().split(',')[1];
    });
  });
  await page.locator('input[accept^="image/"]').setInputFiles(images.map((base64, index) => ({ name: index ? 'primary.png' : 'secondary.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })));
  await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Skrýt secondary', exact: true }).click();
  const original = await h.exported(), originalPixels = await h.decoded(original), fixture = await h.save();
  await page.getByRole('button', { name: 'Efekty', exact: true }).click();
  for (const [id, name] of effects) {
    await h.add(id);
    const changed = await h.exported(); assert(!changed.equals(original), `${name} must affect the image`);
    assert(changed.equals(await h.exported()), `${name} must be repeatable`);
    const info = await h.decoded(changed); assert.equal(info.width, 128); assert.equal(info.height, 96);
    gallery.push({ name, base64: changed.toString('base64') });
    await page.getByRole('button', { name: `Vypnout efekt ${name}`, exact: true }).click();
    assert(original.equals(await h.exported()), `${name} bypass must preserve the original pixels`);
    await page.getByRole('button', { name: `Zapnout efekt ${name}`, exact: true }).click();
    if (seeded.has(id)) {
      await h.set('Seed', 54321); assert(!changed.equals(await h.exported()), `${name} seed must change pixels`);
      await page.keyboard.press('Control+z'); assert(changed.equals(await h.exported()), `${name} undo must restore seed and pixels`);
    }
    if (singleZero[id]) {
      await h.set(`${singleZero[id]} hodnota`, id === 'pixel-sort' ? 1 : 0);
      assert(original.equals(await h.exported()), `${name} neutral parameter must preserve the original including alpha`);
    }
    if (id === 'fragment-scatter') {
      await h.set('Scatter radius / px hodnota', 0); await h.set('Rotation variation hodnota', 0); await h.set('Fragment scale hodnota', 1);
      assert(original.equals(await h.exported()), 'Untransformed irregular fragments must reconstruct the entire source');
    }
    if (id === 'cross-strips') {
      await h.set('Columns hodnota', 1); await h.set('Rows hodnota', 1); await h.set('Jitter / px hodnota', 0);
      assert(original.equals(await h.exported()), 'Single cross-strip cell is identity');
    }
    if (id === 'multi-source-mosaic') {
      await h.set('Secondary weight hodnota', 0); assert(original.equals(await h.exported()), 'Zero secondary weight must use only the primary input');
      await h.set('Secondary weight hodnota', 1);
      const selected = await h.decoded(await h.exported()), index = (30 * 128 + 40) * 4;
      assert.deepEqual(selected.pixels.slice(index, index + 4), [(40 * 17 + 30 * 3 + 99) % 256, (30 * 13 + 40 * 5 + 47) % 256, 229, 255], 'Weight one must use the hidden secondary source');
    }
    if (id === 'torn-paper') {
      await h.set('Tear gap / px hodnota', 0); await h.set('Shadow hodnota', 0); assert(original.equals(await h.exported()), 'Zero tear gap and shadow');
    }
    if (id === 'print-misregistration') {
      for (const channel of ['cyan', 'magenta', 'yellow', 'black']) for (const axis of ['X', 'Y']) await h.set(`${channel} ${axis} / px hodnota`, 0);
      await h.set('Separation rotation hodnota', 0); await h.set('Print blur / px hodnota', 0);
      await page.getByLabel('Print mode', { exact: true }).selectOption('rgb');
      assert(original.equals(await h.exported()), 'Untransformed RGB print separations preserve alpha and color');
      await page.getByLabel('Print mode', { exact: true }).selectOption('cmyk');
      const cmyk = await h.decoded(await h.exported());
      cmyk.pixels.forEach((value, index) => assert(Math.abs(value - originalPixels.pixels[index]) <= 2, 'CMYK reconstruction differs by at most quantization')); 
    }
    if (id === 'feedback') {
      await h.set('Feedback scale hodnota', 1); await h.set('Feedback rotation hodnota', 0);
      await h.set('Offset X / px hodnota', 8); await h.set('Offset Y / px hodnota', 0); await h.set('Decay hodnota', 1);
      for (const iterations of [2, 3]) {
        await h.set('Iterations hodnota', iterations); const echo = await h.decoded(await h.exported());
        const index = (30 * 128 + 40) * 4, sourceIndex = (30 * 128 + 40 - iterations * 8) * 4;
        assert.deepEqual(echo.pixels.slice(index, index + 4), originalPixels.pixels.slice(sourceIndex, sourceIndex + 4), 'Feedback must accumulate the transform once per iteration');
        assert.equal(echo.pixels[(30 * 128 + 4) * 4 + 3], 0, 'Feedback displaced edge remains transparent');
      }
    }
    if (id === 'reaction-diffusion') {
      await h.set('Amount hodnota', 1); await h.set('Iterations hodnota', 1);
      assert(!changed.equals(await h.exported()), 'Gray–Scott iteration count must change the chemical field');
    }
    await page.getByRole('button', { name: `Odstranit efekt ${name}`, exact: true }).click();
    console.log(`GPU verified: ${name}`);
  }
  // All 20 modules, including multiple iterative runtimes, serialize together.
  for (const [id] of effects) await h.add(id);
  await h.set('Iterations hodnota', 12); await h.set('Amount hodnota', 0.5);
  const combined = await h.exported(), saved = await h.save(), model = JSON.parse(saved);
  assert.equal(model.document.layers[0].effects.length, 20);
  await h.load(saved); await page.getByRole('button', { name: 'Vypnout efekt Reaction Diffusion', exact: true }).waitFor();
  assert(combined.equals(await h.exported()), '20-effect project roundtrip must reproduce identical pixels');
  const reloaded = JSON.parse(await h.save()); assert.deepEqual(reloaded.document.layers[0].effects, model.document.layers[0].effects);
  await page.getByRole('button', { name: 'Skutečná velikost dokumentu (1)' }).click();
  assert(combined.equals(await h.exported()), 'Multipass export must ignore viewport zoom');
  for (const [format, mime] of [['jpeg', 'image/jpeg'], ['webp', 'image/webp']]) {
    const result = await h.decoded(await h.exported(format), mime); assert.equal(result.width, 128); assert.equal(result.height, 96);
  }
  await page.screenshot({ path: 'test-results/expansion-stack.png' });
  // Known-color reference tests for logic and per-bit input selection.
  const solid = JSON.parse(fixture);
  const solidImages = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96; const ctx = canvas.getContext('2d'); return ['#aacc55', '#ff0000'].map(color => { ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 96); return canvas.toDataURL(); }); });
  solid.assets.forEach(asset => { asset.dataUrl = solidImages[asset.id === solid.document.layers[0].assetId ? 1 : 0]; });
  await h.load(Buffer.from(JSON.stringify(solid))); await page.getByRole('button', { name: 'Vrstvy 2', exact: true }).waitFor();
  await h.add('logic-matrix');
  const expected = { and: [170, 0, 0], or: [255, 204, 85], nand: [85, 255, 255], nor: [0, 51, 170], xnor: [170, 51, 170] };
  for (const [operation, rgb] of Object.entries(expected)) {
    await page.getByLabel('Operation', { exact: true }).selectOption(operation);
    assert.deepEqual((await h.decoded(await h.exported())).pixels.slice(0, 4), [...rgb, 255], operation);
  }
  await page.getByRole('button', { name: 'Odstranit efekt Logic Matrix', exact: true }).click(); await h.add('bit-plane-mixer');
  assert.deepEqual((await h.decoded(await h.exported())).pixels.slice(0, 4), [250, 12, 5, 255]);
  await page.getByRole('button', { name: 'Odstranit efekt Bit Plane Mixer', exact: true }).click();
  // Exact sorting order, barriers and stable zero-diffusion state.
  const sorting = JSON.parse(fixture);
  const shuffled = [192, 32, 224, 64, 160, 96, 128, 0];
  sorting.assets.find(asset => asset.id === sorting.document.layers[0].assetId).dataUrl = await page.evaluate(values => { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96; const ctx = canvas.getContext('2d'); for (let x = 0; x < 128; x++) { const v = values[x % 8]; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x, 0, 1, 96); } return canvas.toDataURL(); }, shuffled);
  await h.load(Buffer.from(JSON.stringify(sorting))); const sortingOriginal = await h.exported();
  await h.add('pixel-sort'); await h.set('Sort interval / px hodnota', 8); await h.set('Sort threshold hodnota', 0);
  const sorted = await h.decoded(await h.exported());
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => sorted.pixels[index * 4]), [0, 32, 64, 96, 128, 160, 192, 224]);
  await page.getByLabel('Sort order', { exact: true }).selectOption('descending');
  const descending = await h.decoded(await h.exported()); assert.deepEqual(Array.from({ length: 8 }, (_, index) => descending.pixels[index * 4]), [224, 192, 160, 128, 96, 64, 32, 0]);
  await page.getByLabel('Sort order', { exact: true }).selectOption('ascending'); await h.set('Sort threshold hodnota', 0.2);
  const barriers = await h.decoded(await h.exported()); assert.deepEqual(Array.from({ length: 8 }, (_, index) => barriers.pixels[index * 4]), [192, 32, 64, 96, 128, 160, 224, 0], 'Threshold barriers partition sortable runs');
  await page.getByLabel('Sort direction', { exact: true }).selectOption('vertical'); await h.set('Sort threshold hodnota', 0);
  assert(sortingOriginal.equals(await h.exported()), 'Constant vertical columns must preserve the source');
  await page.getByRole('button', { name: 'Odstranit efekt Pixel Sort', exact: true }).click();
  await h.add('reaction-diffusion'); await h.set('Seed density hodnota', 0);
  assert.deepEqual((await h.decoded(await h.exported())).pixels.slice(0, 4), [0, 0, 0, 255], 'Gray–Scott with U=1, V=0 remains stationary');
  assert.deepEqual(h.errors, []);
  // Contact sheet of actual exports for visual review.
  const sheet = await page.evaluate(async items => { const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 688; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#171b20'; ctx.fillRect(0, 0, canvas.width, canvas.height); for (let i = 0; i < items.length; i++) { const image = new Image(); image.src = `data:image/png;base64,${items[i].base64}`; await image.decode(); const x = i % 5 * 200, y = Math.floor(i / 5) * 172; ctx.fillStyle = '#333840'; ctx.fillRect(x + 6, y + 6, 188, 141); ctx.drawImage(image, x + 6, y + 6, 188, 141); ctx.fillStyle = '#eceff3'; ctx.font = '12px sans-serif'; ctx.fillText(items[i].name, x + 8, y + 164); } return canvas.toDataURL().split(',')[1]; }, gallery);
  await writeFile('test-results/expansion-sheet.png', Buffer.from(sheet, 'base64'));
  console.log('Expansion passed: 20 GPU effects, alpha identities, seed/undo, exact logic/bit mixing/sorting, Gray–Scott steady state, 20-effect project roundtrip and all exports under desktop CSP.');
} catch (error) { console.error('Browser errors:', h.errors); await page.screenshot({ path: 'test-results/expansion-failure.png' }); throw error; }
finally { await h.browser.close(); }
