import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173'); await page.locator('.canvas-host canvas').waitFor();
  const result = await page.evaluate(async () => {
    const editor = await import('/src/lib/editor/state.ts'); const { get } = await import('/node_modules/svelte/src/store/index-client.js');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d'); context.fillStyle = '#e43532'; context.fillRect(0, 0, 16, 16);
    const blob = await new Promise(resolve => canvas.toBlob(resolve)); const file = new File([blob], 'soak.png', { type: 'image/png' });
    const active = new Set(), create = URL.createObjectURL, revoke = URL.revokeObjectURL;
    URL.createObjectURL = value => { const url = create.call(URL, value); active.add(url); return url; };
    URL.revokeObjectURL = url => { active.delete(url); revoke.call(URL, url); };
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let destroyedTextures = 0;
    try {
      for (let cycle = 0; cycle < 100; cycle++) {
        editor.newDocument(32, 32); await editor.importFiles([file]); await frame();
        const layer = get(editor.documentStore).layers[0]; const texture = editor.assets.texture(layer.assetId);
        editor.deleteLayer(layer.id); editor.cleanUnusedAssets();
        if (!editor.assets.getBlob(layer.assetId)) throw new Error(`Undo source missing at ${cycle}`);
        editor.undo(); await frame();
        if (get(editor.documentStore).layers[0]?.id !== layer.id) throw new Error(`Undo failed at ${cycle}`);
        editor.newDocument(32, 32); await frame();
        if (editor.assets.list().length || active.size || !texture.destroyed) throw new Error(`Resource retained at ${cycle}`);
        destroyedTextures++;
      }
      return { cycles: 100, destroyedTextures, activeObjectURLs: active.size, retainedAssets: editor.assets.list().length };
    } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
  });
  assert.deepEqual(errors, []); assert.equal(result.destroyedTextures, 100); assert.equal(result.activeObjectURLs, 0);
  await mkdir('test-results/release', { recursive: true });
  await writeFile('test-results/release/soak.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally { await browser.close(); }
