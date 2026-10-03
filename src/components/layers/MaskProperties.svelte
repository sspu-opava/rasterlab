<script lang="ts">
  import type { LayerNode } from '../../lib/document/types';
  import { layerEntries, mapLayers, assertLayerGraph } from '../../lib/document/layers';
  import { setLayerMask, effectErrors } from '../../lib/editor/store';
  let { layer, layers }: { layer: LayerNode; layers: LayerNode[] } = $props();
  function valid(sourceId: string): boolean { try { assertLayerGraph(mapLayers(layers, item => item.id === layer.id ? { ...item, mask: { sourceId, enabled: true, mode: 'luminance', invert: false, strength: 1, feather: 0 } } : item)); return true; } catch { return false; } }
  const candidates = $derived(layerEntries(layers).map(entry => entry.layer).filter(item => item.id !== layer.id && valid(item.id)));
</script>
<div class="property-divider">MASKA Z VRSTVY</div>
<label class="property-wide"><span>Zdroj masky</span><select aria-label="Zdroj masky" disabled={layer.locked} value={layer.mask?.sourceId ?? ''} onchange={event => setLayerMask(layer.id, event.currentTarget.value ? { sourceId: event.currentTarget.value } : null)}><option value="">Bez masky</option>{#each candidates as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
{#if layer.mask}
  <label class="property-wide"><span>Režim</span><select aria-label="Režim masky" value={layer.mask.mode} disabled={layer.locked} onchange={event => setLayerMask(layer.id, { mode: event.currentTarget.value as 'alpha' | 'luminance' })}><option value="luminance">Jas × alfa</option><option value="alpha">Alfa kanál</option></select></label>
  <div class="mask-toggles"><label><input type="checkbox" aria-label="Maska aktivní" checked={layer.mask.enabled} disabled={layer.locked} onchange={event => setLayerMask(layer.id, { enabled: event.currentTarget.checked })}/> Aktivní</label><label><input type="checkbox" aria-label="Invertovat masku" checked={layer.mask.invert} disabled={layer.locked} onchange={event => setLayerMask(layer.id, { invert: event.currentTarget.checked })}/> Invertovat</label></div>
  <label class="opacity-control"><span>Síla masky</span><input type="range" aria-label="Síla masky" min="0" max="1" step="0.01" value={layer.mask.strength} disabled={layer.locked} oninput={event => setLayerMask(layer.id, { strength: Number(event.currentTarget.value) }, true)}/><output>{Math.round(layer.mask.strength * 100)}%</output></label>
  <label class="property-wide"><span>Změkčení / px</span><input type="number" aria-label="Změkčení masky / px" min="0" max="64" step="1" value={layer.mask.feather} disabled={layer.locked} onchange={event => setLayerMask(layer.id, { feather: Number(event.currentTarget.value) })}/></label>
  {#if $effectErrors.has(`${layer.id}:mask`)}<p class="locked-note">{$effectErrors.get(`${layer.id}:mask`)}</p>{/if}
{/if}
