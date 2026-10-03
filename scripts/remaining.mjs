import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { effectHarness } from './effect-harness.mjs';
const h = await effectHarness(), { page } = h;
const effects = [['channel-algebra', 'Channel Algebra'], ['recursive-collage', 'Recursive Collage'], ['echo-frames', 'Echo Frames'], ['cellular-growth', 'Cellular Growth'], ['databend', 'Databend'], ['signal-collapse', 'Signal Collapse']];
const gallery = [];
const rgba = (image, x, y) => image.pixels.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
const text = async (label, value) => { const input = page.getByRole('textbox', { name: label, exact: true }); await input.fill(value); await input.press('Enter'); };
await mkdir('test-results', { recursive: true });
try {
  await page.getByRole('button', { name: 'Nový dokument (Ctrl+N)' }).click();
  await page.getByLabel('Šířka / px').fill('128'); await page.getByLabel('Výška / px').fill('96');
  await page.getByRole('button', { name: 'Vytvořit dokument', exact: true }).click();
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96; const ctx = canvas.getContext('2d');
    return [1, 0].map(source => {
      const data = ctx.createImageData(128, 96);
      for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) { const i = (y * 128 + x) * 4; data.data.set([(x * 17 + y * 3 + source * 99) % 256, (y * 13 + x * 5 + source * 47) % 256, ((x >> 3) % 2 ? 220 : 50) + source * 9, source ? 255 : x < 4 ? 0 : y > 88 ? 128 : 255], i); }
      ctx.putImageData(data, 0, 0); return canvas.toDataURL().split(',')[1];
    });
  });
  await page.locator('input[accept^="image/"]').setInputFiles(images.map((base64, index) => ({ name: index ? 'primary.png' : 'secondary.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })));
  await page.getByRole('button', { name: 'Layers 2', exact: true }).waitFor(); await page.getByRole('button', { name: 'Skrýt secondary', exact: true }).click();
  const original = await h.exported(), originalPixels = await h.decoded(original);
  await page.getByRole('button', { name: 'Effects', exact: true }).click();
  for (const [id, name] of effects) {
    await h.add(id); const changed = await h.exported(); assert(!changed.equals(original), `${name} must change pixels`);
    assert(changed.equals(await h.exported()), `${name} repeated evaluation`); gallery.push({ name, base64: changed.toString('base64') });
    await page.getByRole('button', { name: `Vypnout efekt ${name}`, exact: true }).click(); assert(original.equals(await h.exported()), `${name} bypass`);
    await page.getByRole('button', { name: `Zapnout efekt ${name}`, exact: true }).click();
    if (['cellular-growth', 'databend', 'signal-collapse'].includes(id)) { await h.set('Seed', 54321); assert(!changed.equals(await h.exported()), `${name} seed`); await page.keyboard.press('Control+z'); assert(changed.equals(await h.exported()), `${name} seed undo`); }
    if (id === 'channel-algebra') {
      const result = await h.decoded(changed), a = rgba(originalPixels, 40, 30), b = [(40 * 17 + 30 * 3 + 99) % 256, (30 * 13 + 40 * 5 + 47) % 256, 229];
      const expected = [Math.round((a[0] + b[0]) / 2), Math.abs(a[1] - b[1]), Math.max(a[2], b[2]), 255];
      rgba(result, 40, 30).forEach((value, index) => assert(Math.abs(value - expected[index]) <= 1, 'Channel arithmetic reference'));
      for (const [label, expression] of [['Red expression', 'ar'], ['Green expression', 'ag'], ['Blue expression', 'ab']]) await text(label, expression);
      assert(original.equals(await h.exported()), 'Identity expressions preserve the complete source including alpha');
      await text('Red expression', 'ar / 0'); assert.equal(rgba(await h.decoded(await h.exported()), 40, 30)[0], 0, 'Safe division avoids NaN');
      await text('Red expression', 'ar');
      await text('Red expression', 'ar +'); await page.locator('.effect-error').waitFor();
      assert((await page.locator('.effect-error').innerText()).includes('operand'));
      const expectedErrors = h.errors.filter(message => message.includes('[EFFECT]') && message.includes('operand')); assert(expectedErrors.length >= 1);
      for (const message of expectedErrors) h.errors.splice(h.errors.indexOf(message), 1);
      await page.keyboard.press('Control+z'); await page.locator('.effect-error').waitFor({ state: 'hidden' }); assert(original.equals(await h.exported()), 'Undo recovers from invalid expression');
      const field = page.getByRole('textbox', { name: 'Red expression', exact: true }); await field.fill('br');
      const save = page.waitForEvent('download'); await field.press('Control+s');
      const saved = JSON.parse(await readFile(await (await save).path())); assert.equal(saved.document.layers[0].effects[0].parameters.red, 'br', 'Ctrl+S commits the focused expression');
    }
    if (id === 'recursive-collage') { await h.set('Recursion depth hodnota', 1); assert(!changed.equals(await h.exported()), 'Recursive depth changes nesting'); await h.set('Recursion depth hodnota', 0); assert(original.equals(await h.exported()), 'Zero recursion is identity'); }
    if (id === 'echo-frames') { await h.set('Copies hodnota', 1); assert(original.equals(await h.exported()), 'A single echo frame is the original'); }
    if (id === 'cellular-growth') {
      await h.set('Growth iterations hodnota', 0); const start = await h.decoded(await h.exported());
      await h.set('Growth iterations hodnota', 4); const grown = await h.decoded(await h.exported());
      const count = image => image.pixels.filter((value, index) => index % 4 === 0 && value > 250).length;
      assert(count(grown) > count(start), 'Cells must grow into their neighbors');
      start.pixels.forEach((value, index) => { if (index % 4 === 0 && value > 250) assert(grown.pixels[index] > 250, 'Growth must preserve living cells'); });
      await h.set('Seed density hodnota', 0); assert.deepEqual(rgba(await h.decoded(await h.exported()), 40, 30), [0, 0, 0, 255], 'No seed means no growth');
      await h.set('Amount hodnota', 0); assert(original.equals(await h.exported()), 'Growth amount zero restores source alpha and pixels');
    }
    if (id === 'databend') {
      await h.set('Stream shift / pixels hodnota', 0); await h.set('Repetition hodnota', 1); assert(original.equals(await h.exported()), 'Unmodified stream is identity');
      await h.set('Repetition hodnota', 2); const repeat = await h.decoded(await h.exported()); assert.deepEqual(rgba(repeat, 50, 30), rgba(originalPixels, 18, 30), 'Pixel stream repeats its first half-block');
    }
    if (id === 'signal-collapse') { await h.set('Intensity hodnota', 0); assert(original.equals(await h.exported()), 'Intensity zero bypasses all collapse operations'); }
    await page.getByRole('button', { name: `Odstranit efekt ${name}`, exact: true }).click(); console.log(`GPU verified: ${name}`);
  }
  for (const [id] of effects) await h.add(id);
  await page.getByRole('button', { name: 'Channel Algebra', exact: true }).click(); await text('Red expression', 'mix(ar, br, .3)');
  await page.getByRole('button', { name: 'Cellular Growth', exact: true }).click(); await h.set('Growth iterations hodnota', 8); await h.set('Amount hodnota', 0.6);
  const combined = await h.exported(), saved = await h.save(), model = JSON.parse(saved); assert.equal(model.document.layers[0].effects.length, 6);
  await h.load(saved); await page.getByRole('button', { name: 'Vypnout efekt Signal Collapse', exact: true }).waitFor(); assert(combined.equals(await h.exported()), 'Six-effect project reload must reproduce the same pixels');
  assert.deepEqual(JSON.parse(await h.save()).document.layers[0].effects, model.document.layers[0].effects);
  await page.getByRole('button', { name: 'Skutečná velikost dokumentu (1)' }).click(); assert(combined.equals(await h.exported()), 'Final export ignores viewport');
  for (const [format, mime] of [['jpeg', 'image/jpeg'], ['webp', 'image/webp']]) { const image = await h.decoded(await h.exported(format), mime); assert.equal(image.width, 128); assert.equal(image.height, 96); }
  await page.screenshot({ path: 'test-results/remaining-stack.png' }); assert.deepEqual(h.errors, []);
  const sheet = await page.evaluate(async items => { const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 520; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#171b20'; ctx.fillRect(0, 0, 900, 520); for (let i = 0; i < items.length; i++) { const image = new Image(); image.src = `data:image/png;base64,${items[i].base64}`; await image.decode(); const x = i % 3 * 300, y = Math.floor(i / 3) * 260; ctx.fillStyle = '#333840'; ctx.fillRect(x + 6, y + 6, 288, 216); ctx.drawImage(image, x + 6, y + 6, 288, 216); ctx.fillStyle = '#eceff3'; ctx.font = '16px sans-serif'; ctx.fillText(items[i].name, x + 8, y + 248); } return canvas.toDataURL().split(',')[1]; }, gallery);
  await writeFile('test-results/remaining-sheet.png', Buffer.from(sheet, 'base64'));
  console.log('Remaining passed: six GPU effects, arithmetic expressions/error recovery/Ctrl+S, true recursion and growth, exact stream repetition, seed/undo/bypass, alpha identities, project roundtrip and all exports.');
} catch (error) { console.error('Browser errors:', h.errors); await page.screenshot({ path: 'test-results/remaining-failure.png' }); throw error; }
finally { await h.browser.close(); }
