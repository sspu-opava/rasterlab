import { expect, it } from 'vitest';
import { packArchive, unpackArchive } from './archive';
it('roundtrips a portable ZIP with Unicode manifest and exact bitmap bytes', () => {
  const entries = new Map([['project.json', new TextEncoder().encode('{"name":"Příliš žluťoučký kůň"}')], ['assets/a.png', new Uint8Array([0, 1, 255, 128])]]);
  const archive = packArchive(entries);
  expect(unpackArchive(archive)).toEqual(entries);
  const corrupt = archive.slice(); corrupt[42] ^= 1;
  expect(() => unpackArchive(corrupt)).toThrow();
  expect(() => unpackArchive(archive.subarray(0, archive.length - 1))).toThrow();
});
it('rejects traversal, compression and duplicate paths instead of expanding them', () => {
  expect(() => unpackArchive(packArchive(new Map([['../secret', new Uint8Array()]])))).toThrow();
  const archive = packArchive(new Map([['project.json', new Uint8Array([1])]])); archive[8] = 8;
  expect(() => unpackArchive(archive)).toThrow();
});
