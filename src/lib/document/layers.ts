import type { LayerNode } from './types';
export interface LayerEntry { layer: LayerNode; parentId: string | null; depth: number; inheritedLock: boolean }
export function layerEntries(layers: LayerNode[], parentId: string | null = null, depth = 0, inheritedLock = false): LayerEntry[] {
  return layers.flatMap(layer => [{ layer, parentId, depth, inheritedLock }, ...(layer.type === 'group' ? layerEntries(layer.children, layer.id, depth + 1, inheritedLock || layer.locked) : [])]);
}
export function findLayer(layers: LayerNode[], id: string | null): LayerNode | undefined { return layerEntries(layers).find(entry => entry.layer.id === id)?.layer; }
export function localDragDelta(layers: LayerNode[], id: string, x: number, y: number): { x: number; y: number } {
  const entries = layerEntries(layers), ancestors: LayerNode[] = [];
  let entry = entries.find(entry => entry.layer.id === id);
  while (entry?.parentId) { entry = entries.find(item => item.layer.id === entry!.parentId); if (entry) ancestors.unshift(entry.layer); }
  for (const layer of ancestors) { const angle = -layer.rotation * Math.PI / 180, rotatedX = Math.cos(angle) * x - Math.sin(angle) * y, rotatedY = Math.sin(angle) * x + Math.cos(angle) * y; x = rotatedX / layer.scale.x; y = rotatedY / layer.scale.y; }
  return { x, y };
}
export function layerLocked(layers: LayerNode[], id: string): boolean { const entry = layerEntries(layers).find(entry => entry.layer.id === id); return !entry || entry.inheritedLock || entry.layer.locked; }
export function layerVisible(layers: LayerNode[], id: string): boolean {
  const entries = layerEntries(layers); let entry = entries.find(entry => entry.layer.id === id);
  if (!entry) return false;
  while (entry) { if (!entry.layer.visible) return false; entry = entries.find(item => item.layer.id === entry!.parentId); }
  return true;
}
export function layerPath(layers: LayerNode[], id: string): string {
  const entries = layerEntries(layers), names: string[] = []; let entry = entries.find(entry => entry.layer.id === id);
  while (entry) { names.unshift(entry.layer.name); entry = entries.find(item => item.layer.id === entry!.parentId); }
  return names.join(' / ');
}
export function mapLayers(layers: LayerNode[], transform: (layer: LayerNode) => LayerNode): LayerNode[] { return layers.map(layer => transform(layer.type === 'group' ? { ...layer, children: mapLayers(layer.children, transform) } : layer)); }
export function removeLayer(layers: LayerNode[], id: string): LayerNode[] { return layers.filter(layer => layer.id !== id).map(layer => layer.type === 'group' ? { ...layer, children: removeLayer(layer.children, id) } : layer); }
export function assertLayerGraph(layers: LayerNode[]): void {
  const entries = layerEntries(layers);
  if (entries.length > 100 || entries.some(entry => entry.depth > 12)) throw new Error('Maximum je 100 vrstev a 12 úrovní vnoření.');
  const edges = new Map(entries.map(({ layer }) => [layer.id, [...layer.effects.flatMap(effect => Object.values(effect.inputs)), ...(layer.mask ? [layer.mask.sourceId] : []), ...(layer.type === 'group' ? layer.children.map(child => child.id) : [])]]));
  const active = new Set<string>(), done = new Set<string>();
  const visit = (id: string): void => { if (active.has(id)) throw new Error('Tato operace by vytvořila cyklus vrstev.'); if (done.has(id)) return; if (!edges.has(id)) throw new Error('Chybí vstupní vrstva.'); active.add(id); for (const next of edges.get(id)!) visit(next); active.delete(id); done.add(id); };
  for (const id of edges.keys()) visit(id);
}
export function reparentLayer(layers: LayerNode[], id: string, parentId: string | null): LayerNode[] {
  const layer = findLayer(layers, id), parent = parentId ? findLayer(layers, parentId) : null;
  if (!layer || layerLocked(layers, id) || (parentId && (parent?.type !== 'group' || layerLocked(layers, parentId)))) throw new Error('Vrstva nebo cílová skupina je zamčená či nedostupná.');
  if (parentId === id || (layer.type === 'group' && layerEntries(layer.children).some(entry => entry.layer.id === parentId))) throw new Error('Skupinu nelze přesunout do vlastního potomka.');
  if (layerEntries(layers).find(entry => entry.layer.id === id)?.parentId === parentId) return layers;
  const remaining = removeLayer(layers, id);
  const result = parentId ? mapLayers(remaining, item => item.id === parentId && item.type === 'group' ? { ...item, children: [layer, ...item.children] } : item) : [layer, ...remaining];
  assertLayerGraph(result); return result;
}
