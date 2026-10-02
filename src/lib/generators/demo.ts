/** Creates an importable development asset; it never changes the document bitmap. */
export async function demoFile(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1000;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#e4dfcf'; context.fillRect(0, 0, 1000, 1000);
  context.fillStyle = '#23262a'; context.fillRect(70, 70, 500, 730);
  context.fillStyle = '#df3b31'; context.fillRect(520, 130, 330, 760);
  context.fillStyle = '#e4dfcf'; context.beginPath(); context.arc(495, 495, 245, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#23262a'; context.lineWidth = 4;
  for (let i = 0; i < 23; i++) {
    const y = 310 + i * 17;
    context.beginPath(); context.moveTo(80, y); context.lineTo(900, y - 140); context.stroke();
  }
  context.fillStyle = '#23262a'; context.font = 'bold 62px sans-serif'; context.fillText('RASTER / 001', 72, 925);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Demo se nepodařilo vytvořit.')), 'image/png'));
  return new File([blob], 'experiment-001.png', { type: 'image/png' });
}
