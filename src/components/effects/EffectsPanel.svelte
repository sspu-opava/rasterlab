<script lang="ts">
  import { layerEntries } from '../../lib/document/layers';
  import { Plus, Power, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, RotateCcw, AlertTriangle, Star, Copy, ClipboardPaste, Save } from '@lucide/svelte';
  import type { LayerNode } from '../../lib/document/types';
  import { effectRegistry } from '../../lib/effects';
  import { selectedEffectId, effectErrors, addEffect, deleteEffect, setEffectEnabled, moveEffect, resetEffect, documentStore, duplicateEffect, capturePreset, reportError, busy } from '../../lib/editor/store';
  import { favoriteEffects, toggleFavorite, stackClipboard, libraryError } from '../../lib/presets/library';
  import ApplyPresetDialog from './ApplyPresetDialog.svelte';
  import SavePresetDialog from './SavePresetDialog.svelte';
  import EffectParameters from './EffectParameters.svelte';
  let { layer }: { layer: LayerNode | undefined } = $props();
  let choice = $state(effectRegistry.list()[0]?.id ?? '');
  let draggedId: string | null = null;
  let query = $state('');
  let favoritesOnly = $state(false);
  let saving = $state<'stack' | 'effect' | null>(null);
  let pasting = $state(false);
  const matching = $derived(effectRegistry.list().filter(effect => `${effect.name} ${effect.category} ${effect.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!favoritesOnly || $favoriteEffects.includes(effect.id))));
  $effect(() => { if (!matching.some(effect => effect.id === choice)) choice = matching[0]?.id ?? ''; });
  let selected = $derived(layer?.effects.find(effect => effect.id === $selectedEffectId) ?? layer?.effects[0]);
  let definition = $derived(selected ? effectRegistry.get(selected.effectId) : undefined);
  function move(direction: number): void {
    const index = layer?.effects.findIndex(effect => effect.id === selected?.id) ?? -1; const target = layer?.effects[index + direction];
    if (layer && selected && target) moveEffect(layer.id, selected.id, target.id);
  }
  function copyStack(): void { if (!layer) return; try { stackClipboard.set(capturePreset(layer.id, `Stack: ${layer.name}`.slice(0, 80))); } catch (error) { reportError(error); } }
</script>
<div class="effects-content">
  {#if layer}
    <div class="effect-search"><input aria-label="Hledat efekty" placeholder="Hledat efekty…" bind:value={query}/><button class="icon-button" class:active={favoritesOnly} aria-label="Pouze oblíbené efekty" aria-pressed={favoritesOnly} title="Pouze oblíbené" onclick={() => favoritesOnly = !favoritesOnly}><Star size={15}/></button></div>
    <div class="effect-add"><select aria-label="Typ nového efektu" bind:value={choice} disabled={layer.locked || !matching.length}>{#each [...new Set(matching.map(effect => effect.category))] as category}<optgroup label={category}>{#each matching.filter(effect => effect.category === category) as effect}<option value={effect.id}>{effect.name}</option>{/each}</optgroup>{/each}</select><button class="icon-button" aria-label="Přidat efekt" title="Přidat efekt" disabled={layer.locked || !choice || $busy} onclick={() => addEffect(layer.id, choice)}><Plus size={18}/></button><button class="icon-button" class:active={$favoriteEffects.includes(choice)} aria-label="Oblíbený vybraný efekt" aria-pressed={$favoriteEffects.includes(choice)} title="Přidat/odebrat oblíbený" disabled={!choice} onclick={() => toggleFavorite(choice)}><Star size={15}/></button></div>
    {#if !matching.length}<p class="search-empty">Žádné odpovídající efekty.</p>{/if}
    {#if $libraryError}<p role="alert" class="effect-error">{$libraryError}</p>{/if}
    <div class="stack-tools"><button class="icon-button" aria-label="Kopírovat stack" title="Kopírovat stack" disabled={!layer.effects.length} onclick={copyStack}><Copy size={15}/></button><button class="icon-button" aria-label="Vložit stack" title="Vložit stack" disabled={!$stackClipboard || layer.locked || $busy} onclick={() => pasting = true}><ClipboardPaste size={15}/></button><button class="small-button" disabled={!layer.effects.length || layer.locked || $busy} onclick={() => saving = 'stack'}><Save size={13}/>Uložit stack</button></div>
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
      <div class="stack-tools"><button class="small-button" disabled={layer.locked || $busy} onclick={() => duplicateEffect(layer.id, selected.id)}><Copy size={13}/>Duplikovat efekt</button><button class="icon-button" aria-label="Uložit vybraný efekt jako preset" title="Uložit efekt jako preset" disabled={layer.locked || $busy} onclick={() => saving = 'effect'}><Save size={15}/></button></div>
      {#if $effectErrors.has(selected.id)}<p class="effect-error" role="status"><AlertTriangle size={14}/> {$effectErrors.get(selected.id)} V náhledu se použije vstupní obraz.</p>{/if}
      {#if definition}<p class="effect-description">{definition.description}</p><EffectParameters {definition} instance={selected} {layer} layers={layerEntries($documentStore.layers).map(entry => entry.layer)}/>{/if}
    {/if}
  {:else}<div class="effects-empty"><SlidersHorizontal size={28}/><strong>Vyberte vrstvu</strong><p>Každá vrstva má vlastní nedestruktivní effect stack.</p></div>{/if}
</div>
{#if pasting && layer && $stackClipboard}<ApplyPresetDialog preset={$stackClipboard} layerId={layer.id} onclose={() => pasting = false}/>{/if}
{#if saving && layer}<SavePresetDialog layerId={layer.id} effectId={saving === 'effect' ? selected?.id : undefined} onclose={() => saving = null}/>{/if}
