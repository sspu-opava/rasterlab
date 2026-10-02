import { describe, expect, it } from 'vitest';
import { fitViewport, zoomAt, documentPoint, MIN_ZOOM, MAX_ZOOM } from './viewport';

describe('viewport transforms', () => {
  it('fits and centers arbitrary document dimensions', () => {
    const view = fitViewport(800, 600, 2000, 1000);
    expect(view.zoom).toBeCloseTo(704 / 2000);
    expect(view.x).toBeCloseTo(48);
    expect(view.y).toBeCloseTo(124);
  });
  it('preserves the document point beneath the pointer during zoom', () => {
    const view = { x: -70, y: 32, zoom: 0.5 };
    const anchor = { x: 250, y: 180 };
    const before = documentPoint(view, anchor);
    expect(documentPoint(zoomAt(view, 2, anchor), anchor)).toEqual(before);
  });
  it('clamps extreme wheel zooms', () => {
    const view = { x: 0, y: 0, zoom: 1 };
    expect(zoomAt(view, 100, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(view, 0, { x: 0, y: 0 }).zoom).toBe(MIN_ZOOM);
  });
});
