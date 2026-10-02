import type { Point } from '../document/types';
export interface Viewport { zoom: number; x: number; y: number }
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 16;
export function fitViewport(viewWidth: number, viewHeight: number, width: number, height: number): Viewport {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (viewWidth - 96) / width, (viewHeight - 96) / height));
  return { zoom, x: (viewWidth - width * zoom) / 2, y: (viewHeight - height * zoom) / 2 };
}
export function zoomAt(view: Viewport, zoom: number, anchor: Point): Viewport {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const ratio = zoom / view.zoom;
  return { zoom, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio };
}
export function documentPoint(view: Viewport, point: Point): Point {
  return { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom };
}
