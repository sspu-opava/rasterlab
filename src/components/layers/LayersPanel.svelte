<script lang="ts">
  import { Layers, Eye, EyeOff, LockKeyhole, UnlockKeyhole, Trash2, SlidersHorizontal, Image, GripVertical, ChevronUp, ChevronDown, Info } from '@lucide/svelte';
  import IconButton from '../common/IconButton.svelte';
  import EffectsPanel from '../effects/EffectsPanel.svelte';
  import { documentStore, selectedLayerId, assetStore, updateLayer, deleteLayer, reorderLayer } from '../../lib/editor/store';
  import type { BlendMode } from '../../lib/document/types';
  let tab = $state<'layers' | 'effects'>('layers');
  let draggedId = $state<string | null>(null);
  let layer = $derived($documentStore.layers.find(layer => layer.id === $selectedLayerId));
  function move(direction: number): void {
    const index = $documentStore.layers.findIndex(value => value.id === layer?.id);
    const target = $documentStore.layers[index + direction];
    if (layer && target) reorderLayer(layer.id, target.id);
  }
  function numberValue(event: Event): number { return Number((event.target as HTMLInputElement).value); }
</script>

<aside class="inspector-panel" aria-label="Vrstvy a vlastnosti">
  <section class="panel layers-panel">
    <div class="panel-tabs"><button class:selected-tab={tab === 'layers'} onclick={() => tab = 'layers'}>Layers <span class="count">{$documentStore.layers.length}</span></button><button class:selected-tab={tab === 'effects'} onclick={() => tab = 'effects'}>Effects</button><span class="inspector-caption">STACK</span></div>
    {#if tab === 'layers'}
      <div class="layer-tools">
        <IconButton label="Posunout vrstvu nahoru" disabled={!layer || layer.locked || $documentStore.layers[0]?.id === layer.id} onclick={() => move(-1)}><ChevronUp size={16}/></IconButton>
        <IconButton label="Posunout vrstvu dolů" disabled={!layer || layer.locked || $documentStore.layers.at(-1)?.id === layer.id} onclick={() => move(1)}><ChevronDown size={16}/></IconButton>
        <IconButton label="Odstranit vybranou vrstvu" disabled={!layer || layer.locked} onclick={() => { if (layer) deleteLayer(layer.id); }}><Trash2 size={16}/></IconButton>
        <span class="divider"></span><span class="layer-tool-label">Pořadí vrstev</span>
      </div>
      <div class="layer-list">
        {#if $documentStore.layers.length === 0}
          <div class="layer-empty"><Layers size={30} strokeWidth={1.2}/><strong>Zatím žádné vrstvy</strong><p>Importovaný obrázek se objeví<br/>jako samostatná rastrová vrstva.</p></div>
        {/if}
        {#each $documentStore.layers as item (item.id)}
          <div class="layer-row" class:selected={item.id === $selectedLayerId} draggable={!item.locked} role="listitem" ondragstart={() => draggedId = item.id} ondragend={() => draggedId = null} ondragover={event => event.preventDefault()} ondrop={event => { event.preventDefault(); if (draggedId) reorderLayer(draggedId, item.id); draggedId = null; }}>
            <button class="visibility-button" title={item.visible ? 'Skrýt vrstvu' : 'Zobrazit vrstvu'} aria-label={item.visible ? `Skrýt ${item.name}` : `Zobrazit ${item.name}`} onclick={() => updateLayer(item.id, { visible: !item.visible })}>{#if item.visible}<Eye size={15}/>{:else}<EyeOff size={15}/>{/if}</button>
            <button class="layer-select" onclick={() => selectedLayerId.set(item.id)}>
              {#if item.type === 'raster'}<img src={$assetStore.find(asset => asset.id === item.assetId)?.url} alt=""/>{:else}<Layers size={23}/>{/if}
              <span><strong>{item.name}</strong><small>{item.type === 'raster' ? 'Raster layer' : item.type}</small></span>
            </button>
            <button class="visibility-button" aria-label={item.locked ? `Odemknout ${item.name}` : `Zamknout ${item.name}`} title={item.locked ? 'Odemknout vrstvu' : 'Zamknout vrstvu'} onclick={() => updateLayer(item.id, { locked: !item.locked })}>{#if item.locked}<LockKeyhole size={13}/>{:else}<GripVertical size={13}/>{/if}</button>
          </div>
        {/each}
      </div>
    {:else}
      <EffectsPanel {layer}/>
    {/if}
    <div class="layer-list-footer"><span>{$documentStore.layers.filter(layer => layer.visible).length} viditelných</span><span>Vrchní vrstva je nahoře</span></div>
  </section>
  {#if tab === 'layers'}<section class="panel properties-panel">
    <div class="section-heading"><SlidersHorizontal size={15}/><strong>Vlastnosti vrstvy</strong>{#if layer?.locked}<LockKeyhole size={14}/>{/if}</div>
    {#if layer}
      <div class="properties-content">
        <label class="property-wide"><span>Název</span><input aria-label="Název vrstvy" value={layer.name} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { name: event.currentTarget.value || 'Layer' })}/></label>
        <label class="property-wide"><span>Blend mode</span><select aria-label="Blend mode" value={layer.blendMode} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { blendMode: event.currentTarget.value as BlendMode })}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="difference">Difference</option><option value="add">Add</option></select></label>
        <label class="opacity-control"><span>Opacity</span><input type="range" aria-label="Krytí vrstvy" min="0" max="1" step="0.01" value={layer.opacity} disabled={layer.locked} oninput={event => updateLayer(layer!.id, { opacity: numberValue(event) })}/><output>{Math.round(layer.opacity * 100)}%</output></label>
        <div class="property-divider">TRANSFORMACE <span>px / °</span></div>
        <div class="property-grid">
          <label><span>Pozice X</span><input type="number" aria-label="Pozice X" value={Math.round(layer.position.x)} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { position: { ...layer!.position, x: numberValue(event) } })}/></label>
          <label><span>Pozice Y</span><input type="number" aria-label="Pozice Y" value={Math.round(layer.position.y)} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { position: { ...layer!.position, y: numberValue(event) } })}/></label>
          <label><span>Měřítko X</span><input type="number" aria-label="Měřítko X" min="0.01" max="100" step="0.01" value={layer.scale.x} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { scale: { ...layer!.scale, x: Math.max(0.01, numberValue(event)) } })}/></label>
          <label><span>Měřítko Y</span><input type="number" aria-label="Měřítko Y" min="0.01" max="100" step="0.01" value={layer.scale.y} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { scale: { ...layer!.scale, y: Math.max(0.01, numberValue(event)) } })}/></label>
          <label><span>Rotace</span><input type="number" aria-label="Rotace" step="1" value={layer.rotation} disabled={layer.locked} onchange={event => updateLayer(layer!.id, { rotation: numberValue(event) })}/></label>
          <button class="small-button reset-transform" disabled={layer.locked} onclick={() => updateLayer(layer!.id, { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 })}>Reset</button>
        </div>
        {#if layer.locked}<p class="locked-note"><UnlockKeyhole size={13}/> Pro úpravy vrstvu nejprve odemkněte.</p>{/if}
      </div>
    {:else}
      <div class="properties-empty"><Image size={25} strokeWidth={1.2}/><p>Vyberte vrstvu pro úpravu<br/>jejích vlastností.</p></div>
    {/if}
  </section>{/if}
  <div class="inspector-note"><Info size={15}/><p>Obraz je výsledkem dokumentu.<br/>Originál se nikdy nepřepisuje.</p></div>
</aside>
