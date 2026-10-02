<script lang="ts">
  import { Plus, Power, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, RotateCcw, AlertTriangle } from '@lucide/svelte';
  import type { LayerNode } from '../../lib/document/types';
  import { effectRegistry } from '../../lib/effects';
  import { selectedEffectId, effectErrors, addEffect, deleteEffect, setEffectEnabled, moveEffect, resetEffect, documentStore } from '../../lib/editor/store';
  import EffectParameters from './EffectParameters.svelte';
  let { layer }: { layer: LayerNode | undefined } = $props();
  let choice = $state(effectRegistry.list()[0]?.id ?? '');
  let draggedId: string | null = null;
  let selected = $derived(layer?.effects.find(effect => effect.id === $selectedEffectId) ?? layer?.effects[0]);
  let definition = $derived(selected ? effectRegistry.get(selected.effectId) : undefined);
  function move(direction: number): void {
    const index = layer?.effects.findIndex(effect => effect.id === selected?.id) ?? -1; const target = layer?.effects[index + direction];
    if (layer && selected && target) moveEffect(layer.id, selected.id, target.id);
  }
</script>
<div class="effects-content">
  {#if layer}
    <div class="effect-add"><select aria-label="Typ nového efektu" bind:value={choice} disabled={layer.locked}>{#each [...new Set(effectRegistry.list().map(effect => effect.category))] as category}<optgroup label={category}>{#each effectRegistry.listByCategory(category) as effect}<option value={effect.id}>{effect.name}</option>{/each}</optgroup>{/each}</select><button class="icon-button" aria-label="Přidat efekt" title="Přidat efekt" disabled={layer.locked} onclick={() => addEffect(layer.id, choice)}><Plus size={18}/></button></div>
    <div class="effect-stack" role="list">
      {#each layer.effects as instance (instance.id)}
        <div class="effect-row" class:selected={selected?.id === instance.id} draggable={!layer.locked} role="listitem" ondragstart={() => draggedId = instance.id} ondragend={() => draggedId = null} ondragover={event => event.preventDefault()} ondrop={event => { event.preventDefault(); if (draggedId) moveEffect(layer.id, draggedId, instance.id); draggedId = null; }}>
          <button class="visibility-button" class:effect-enabled={instance.enabled} aria-label={`${instance.enabled ? 'Vypnout' : 'Zapnout'} efekt ${effectRegistry.get(instance.effectId)?.name ?? instance.effectId}`} disabled={layer.locked} onclick={() => setEffectEnabled(layer.id, instance.id, !instance.enabled)}><Power size={14}/></button>
          <button class="effect-select" onclick={() => selectedEffectId.set(instance.id)}>{effectRegistry.get(instance.effectId)?.name ?? instance.effectId}{#if $effectErrors.has(instance.id)}<AlertTriangle size={13}/>{/if}</button>
          <button class="visibility-button" aria-label={`Odstranit efekt ${effectRegistry.get(instance.effectId)?.name ?? instance.effectId}`} disabled={layer.locked} onclick={() => deleteEffect(layer.id, instance.id)}><Trash2 size={13}/></button>
        </div>
      {/each}
      {#if layer.effects.length === 0}<div class="effects-empty"><SlidersHorizontal size={27}/><strong>Začněte prvním efektem</strong><p>Efekty se vyhodnocují shora dolů.<br/>Originál obrázku zůstává nedotčený.</p></div>{/if}
    </div>
    {#if selected}
      <div class="effect-properties-heading"><strong>{definition?.name ?? selected.effectId}</strong><button class="icon-button" aria-label="Posunout efekt nahoru" disabled={layer.locked || layer.effects[0].id === selected.id} onclick={() => move(-1)}><ChevronUp size={14}/></button><button class="icon-button" aria-label="Posunout efekt dolů" disabled={layer.locked || layer.effects.at(-1)?.id === selected.id} onclick={() => move(1)}><ChevronDown size={14}/></button><button class="icon-button" aria-label="Resetovat parametry efektu" title="Reset" disabled={layer.locked} onclick={() => resetEffect(layer.id, selected.id)}><RotateCcw size={14}/></button></div>
      <button class="bypass-button" disabled={layer.locked} onclick={() => setEffectEnabled(layer.id, selected.id, !selected.enabled)}>{selected.enabled ? 'After · efekt aktivní' : 'Before · bypass efektu'}</button>
      {#if $effectErrors.has(selected.id)}<p class="effect-error" role="status"><AlertTriangle size={14}/> {$effectErrors.get(selected.id)} V náhledu se použije vstupní obraz.</p>{/if}
      {#if definition}<p class="effect-description">{definition.description}</p><EffectParameters {definition} instance={selected} {layer} layers={$documentStore.layers}/>{/if}
    {/if}
  {:else}<div class="effects-empty"><SlidersHorizontal size={28}/><strong>Vyberte vrstvu</strong><p>Každá vrstva má vlastní nedestruktivní effect stack.</p></div>{/if}
</div>
