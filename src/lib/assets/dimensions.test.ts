import { expect, it } from 'vitest';
import { imageDimensions } from './dimensions';
it('reads PNG and JPEG dimensions without decoding bitmap pixels', async () => {
  const png = new Uint8Array(24), view = new DataView(png.buffer); view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(12, 0x49484452); view.setUint32(16, 9000); view.setUint32(20, 40);
  expect(await imageDimensions(new Blob([png], { type: 'image/png' }))).toEqual({ width: 9000, height: 40 });
  const jpeg = new Uint8Array([255, 216, 255, 224, 0, 4, 0, 0, 255, 194, 0, 8, 8, 0, 40, 0, 64, 0]);
  expect(await imageDimensions(new Blob([jpeg], { type: 'image/jpeg' }))).toEqual({ width: 64, height: 40 });
  await expect(imageDimensions(new Blob(['invalid'], { type: 'image/png' }))).rejects.toThrow();
});
