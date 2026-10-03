<script lang="ts">
  import { Layers, Eye, EyeOff, LockKeyhole, UnlockKeyhole, Trash2, SlidersHorizontal, Image, GripVertical, ChevronUp, ChevronDown, Info } from '@lucide/svelte';
  import IconButton from '../common/IconButton.svelte';
  import EffectsPanel from '../effects/EffectsPanel.svelte';
  import { documentStore, selectedLayerId, assetStore, updateLayer, deleteLayer, reorderLayer, groupSelectedLayer, moveLayerToGroup, setGeneratorParameter } from '../../lib/editor/store';
  import { layerEntries, findLayer } from '../../lib/document/layers';
  import { generatorRegistry } from '../../lib/generators';
  import EffectParameters from '../effects/EffectParameters.svelte';
  import MaskProperties from './MaskProperties.svelte';
  import { duplicateLayer } from '../../lib/editor/store';
  import type { BlendMode } from '../../lib/document/types';
  let tab = $state<'layers' | 'effects'>('layers');
  let draggedId = $state<string | null>(null);
  let collapsed = $state<string[]>([]);
  const entries = $derived(layerEntries($documentStore.layers));
  const selected = $derived(entries.find(entry => entry.layer.id === $selectedLayerId));
  let layer = $derived(selected ? { ...selected.layer, locked: selected.layer.locked || selected.inheritedLock } : undefined);
  const parent = $derived(selected?.parentId ? findLayer($documentStore.layers, selected.parentId) : undefined);
  const siblings = $derived(parent?.type === 'group' ? parent.children : $documentStore.layers);
  const rows = $derived.by(() => { let hiddenDepth = -1; return entries.filter(entry => { if (hiddenDepth >= 0 && entry.depth > hiddenDepth) return false; hiddenDepth = entry.layer.type === 'group' && collapsed.includes(entry.layer.id) ? entry.depth : -1; return true; }); });
  const generator = $derived(layer?.type === 'generated' ? generatorRegistry.get(layer.generatorId) : undefined);
  function move(direction: number): void {
    const index = siblings.findIndex(value => value.id === layer?.id);
    const target = siblings[index + direction];
    if (layer && target) reorderLayer(layer.id, target.id);
  }
  function numberValue(event: Event): number { return Number((event.target as HTMLInputElement).value); }
</script>

<aside class="inspector-panel" aria-label="Vrstvy a vlastnosti">
  <section class="panel layers-panel">
    <div class="panel-tabs"><button class:selected-tab={tab === 'layers'} onclick={() => tab = 'layers'}>Layers <span class="count">{entries.length}</span></button><button class:selected-tab={tab === 'effects'} onclick={() => tab = 'effects'}>Effects</button><span class="inspector-caption">STACK</span></div>
    {#if tab === 'layers'}
      <div class="layer-tools">
        <IconButton label="Posunout vrstvu nahoru" disabled={!layer || layer.locked || siblings[0]?.id === layer.id} onclick={() => move(-1)}><ChevronUp size={16}/></IconButton>
        <IconButton label="Posunout vrstvu dolů" disabled={!layer || layer.locked || siblings.at(-1)?.id === layer.id} onclick={() => move(1)}><ChevronDown size={16}/></IconButton>
        <IconButton label="Odstranit vybranou vrstvu" disabled={!layer || layer.locked} onclick={() => { if (layer) deleteLayer(layer.id); }}><Trash2 size={16}/></IconButton>
        <IconButton label="Seskupit vybranou vrstvu" disabled={!layer || layer.locked} onclick={() => { if (layer) groupSelectedLayer(layer.id); }}><Layers size={16}/></IconButton>
        <IconButton label="Duplikovat vybranou vrstvu nebo skupinu" disabled={!layer || layer.locked} onclick={() => { if (layer) duplicateLayer(layer.id); }}><Layers size={16}/><span>+</span></IconButton>
      </div>
      <div class="layer-list">
        {#if $documentStore.layers.length === 0}
          <div class="layer-empty"><Layers size={30} strokeWidth={1.2}/><strong>Zatím žádné vrstvy</strong><p>Importovaný obrázek se objeví<br/>jako samostatná rastrová vrstva.</p></div>
        {/if}
        {#each rows as entry (entry.layer.id)}
          {@const item = entry.layer}
          <div class="layer-row" class:selected={item.id === $selectedLayerId} style:margin-left={`${entry.depth * 12}px`} draggable={!item.locked && !entry.inheritedLock} role="listitem" ondragstart={() => draggedId = item.id} ondragend={() => draggedId = null} ondragover={event => event.preventDefault()} ondrop={event => { event.preventDefault(); if (draggedId) reorderLayer(draggedId, item.id); draggedId = null; }}>
            {#if item.type === 'group'}<button class="visibility-button group-toggle" aria-label={`${collapsed.includes(item.id) ? 'Rozbalit' : 'Sbalit'} skupinu ${item.name}`} aria-expanded={!collapsed.includes(item.id)} onclick={() => collapsed = collapsed.includes(item.id) ? collapsed.filter(id => id !== item.id) : [...collapsed, item.id]}><ChevronDown size={12}/></button>{/if}
            <button class="visibility-button" disabled={entry.inheritedLock} title={item.visible ? 'Skrýt vrstvu' : 'Zobrazit vrstvu'} aria-label={item.visible ? `Skrýt ${item.name}` : `Zobrazit ${item.name}`} onclick={() => updateLayer(item.id, { visible: !item.visible })}>{#if item.visible}<Eye size={15}/>{:else}<EyeOff size={15}/>{/if}</button>
            <button class="layer-select" onclick={() => selectedLayerId.set(item.id)}>
              {#if item.type === 'raster'}<img src={$assetStore.find(asset => asset.id === item.assetId)?.url} alt=""/>{:else}<Layers size={23}/>{/if}
              <span><strong>{item.name}</strong><small>{item.type === 'raster' ? 'Raster layer' : item.type === 'generated' ? 'Generator layer' : 'Group layer'}</small></span>
            </button>
            <button class="visibility-button" disabled={entry.inheritedLock} aria-label={item.locked ? `Odemknout ${item.name}` : `Zamknout ${item.name}`} title={item.locked ? 'Odemknout vrstvu' : 'Zamknout vrstvu'} onclick={() => updateLayer(item.id, { locked: !item.locked })}>{#if item.locked}<LockKeyhole size={13}/>{:else}<GripVertical size={13}/>{/if}</button>
          </div>
        {/each}
      </div>
    {:else}
      <EffectsPanel {layer}/>
    {/if}
    <div class="layer-list-footer"><span>{entries.filter(entry => entry.layer.visible).length} viditelných</span><span>Vrchní vrstva je nahoře</span></div>
  </section>
  {#if tab === 'layers'}<section class="panel properties-panel">
    <div class="section-heading"><SlidersHorizontal size={15}/><strong>Vlastnosti vrstvy</strong>{#if layer?.locked}<LockKeyhole size={14}/>{/if}</div>
    {#if layer}
      <div class="properties-content">
        <label class="property-wide"><span>Skupina</span><select aria-label="Nadřazená skupina" value={selected?.parentId ?? ''} disabled={layer.locked} onchange={event => moveLayerToGroup(layer!.id, event.currentTarget.value || null)}><option value="">Mimo skupiny</option>{#each entries.filter(entry => entry.layer.type === 'group' && entry.layer.id !== layer!.id && !(layer?.type === 'group' && layerEntries(layer.children).some(child => child.layer.id === entry.layer.id))) as entry}<option value={entry.layer.id} disabled={entry.inheritedLock || entry.layer.locked}>{entry.layer.name}</option>{/each}</select></label>
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
        {#if layer.type === 'generated' && generator}<div class="property-divider">GENERÁTOR · {generator.name}</div><EffectParameters definition={generator} instance={{ id: layer.id, effectId: layer.generatorId, enabled: true, inputs: {}, parameters: layer.parameters }} {layer} layers={entries.map(entry => entry.layer)} onparameter={(key, value) => setGeneratorParameter(layer!.id, key, value)}/>{/if}
        <MaskProperties {layer} layers={$documentStore.layers}/>
        {#if layer.locked}<p class="locked-note"><UnlockKeyhole size={13}/> Pro úpravy vrstvu nejprve odemkněte.</p>{/if}
      </div>
    {:else}
      <div class="properties-empty"><Image size={25} strokeWidth={1.2}/><p>Vyberte vrstvu pro úpravu<br/>jejích vlastností.</p></div>
    {/if}
  </section>{/if}
  <div class="inspector-note"><Info size={15}/><p>Obraz je výsledkem dokumentu.<br/>Originál se nikdy nepřepisuje.</p></div>
</aside>
