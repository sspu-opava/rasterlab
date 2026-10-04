import { MAX_PROJECT_BYTES } from './limits';
/** Portable ZIP/STORE: no decompression, filesystem writes, or unbounded expansion. */
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => { for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0); return value >>> 0; });
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
export function packArchive(entries: Map<string, Uint8Array>): Uint8Array {
  const encoder = new TextEncoder(), locals: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0, centralSize = 0;
  for (const [name, data] of entries) {
    const path = encoder.encode(name), header = new Uint8Array(30 + path.length), view = new DataView(header.buffer), crc = crc32(data);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
    view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, path.length, true); header.set(path, 30);
    const directory = new Uint8Array(46 + path.length), dv = new DataView(directory.buffer);
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true); dv.setUint16(8, 0x800, true);
    dv.setUint32(16, crc, true); dv.setUint32(20, data.length, true); dv.setUint32(24, data.length, true); dv.setUint16(28, path.length, true); dv.setUint32(42, offset, true); directory.set(path, 46);
    locals.push(header, data); central.push(directory); offset += header.length + data.length; centralSize += directory.length;
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.size, true); ev.setUint16(10, entries.size, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  const size = offset + centralSize + 22;
  if (entries.size > 101 || size > MAX_PROJECT_BYTES) throw new Error('Archiv překračuje limit projektu.');
  const result = new Uint8Array(size); let cursor = 0;
  for (const block of [...locals, ...central, end]) { result.set(block, cursor); cursor += block.length; }
  return result;
}
export function unpackArchive(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.length > MAX_PROJECT_BYTES || bytes.length < 22) throw new Error('Neplatný archiv.');
  const entries = new Map<string, Uint8Array>(), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), decoder = new TextDecoder('utf-8', { fatal: true });
  const end = bytes.length - 22;
  if (view.getUint32(end, true) !== 0x06054b50 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 20, true)) throw new Error('Nepodporovaný archiv.');
  const count = view.getUint16(end + 10, true), central = view.getUint32(end + 16, true);
  if (count > 101 || view.getUint16(end + 8, true) !== count || central + view.getUint32(end + 12, true) !== end) throw new Error('Poškozený archiv.');
  let cursor = 0, directory = central;
  for (let index = 0; index < count; index++) {
    if (cursor + 30 > central || view.getUint32(cursor, true) !== 0x04034b50 || view.getUint16(cursor + 6, true) !== 0x800 || view.getUint16(cursor + 8, true) !== 0) throw new Error('Archiv musí používat RasterLab ZIP/STORE.');
    const size = view.getUint32(cursor + 18, true), nameLength = view.getUint16(cursor + 26, true), extra = view.getUint16(cursor + 28, true), start = cursor + 30 + nameLength + extra;
    if (size !== view.getUint32(cursor + 22, true) || start + size > central || extra) throw new Error('Poškozená položka archivu.');
    const name = decoder.decode(bytes.subarray(cursor + 30, start));
    if (entries.has(name) || !(name === 'project.json' || /^assets\/[a-zA-Z0-9-]{1,80}\.(png|jpg|webp)$/.test(name))) throw new Error('Neplatná cesta v archivu.');
    const data = bytes.subarray(start, start + size), crc = crc32(data);
    if (crc !== view.getUint32(cursor + 14, true) || directory + 46 + nameLength > end || view.getUint32(directory, true) !== 0x02014b50 || view.getUint32(directory + 42, true) !== cursor || view.getUint32(directory + 16, true) !== crc || view.getUint32(directory + 20, true) !== size || view.getUint32(directory + 24, true) !== size || view.getUint16(directory + 28, true) !== nameLength || view.getUint16(directory + 30, true) || view.getUint16(directory + 32, true) || decoder.decode(bytes.subarray(directory + 46, directory + 46 + nameLength)) !== name) throw new Error('Kontrolní součet nebo adresář archivu nesouhlasí.');
    entries.set(name, data); cursor = start + size; directory += 46 + nameLength;
  }
  if (cursor !== central || directory !== end || !entries.has('project.json')) throw new Error('Chybí manifest archivu.');
  return entries;
}
