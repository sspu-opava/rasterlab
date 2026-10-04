/** Read container dimensions before browser bitmap decoding can allocate pixels. */
export async function imageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer()), view = new DataView(bytes.buffer);
  if (file.type === 'image/png' && bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && view.getUint32(12) === 0x49484452) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (file.type === 'image/webp' && bytes.length >= 25 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
    const type = view.getUint32(12);
    if (type === 0x56503858 && bytes.length >= 30) return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (type === 0x5650384c && bytes[20] === 0x2f) return { width: 1 + bytes[21] + ((bytes[22] & 63) << 8), height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10) };
    if (type === 0x56503820 && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) return { width: view.getUint16(26, true) & 16383, height: view.getUint16(28, true) & 16383 };
  }
  if (file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    for (let count = 0; count < 65536 && offset + 4 <= file.size; count++) {
      const header = new Uint8Array(await file.slice(offset, offset + 9).arrayBuffer());
      if (header[0] !== 255) break;
      const marker = header[1];
      if (marker === 255) { offset++; continue; }
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd8) { offset += 2; continue; }
      const length = (header[2] << 8) + header[3]; if (length < 2 || offset + length + 2 > file.size) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && header.length >= 9) return { width: (header[7] << 8) + header[8], height: (header[5] << 8) + header[6] };
      offset += length + 2;
    }
  }
  throw new Error('Obrázek má neplatnou nebo nepodporovanou hlavičku.');
}
