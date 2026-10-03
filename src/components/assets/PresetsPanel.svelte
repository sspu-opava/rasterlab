<script lang="ts">
  import { findLayer, layerLocked } from '../../lib/document/layers';
  import { Download, Trash2, Upload, Plus } from '@lucide/svelte';
  import { builtinPresets } from '../../lib/presets/builtins';
  import { userPresets, libraryError, storePreset, removePreset } from '../../lib/presets/library';
  import { parsePreset, type EffectPreset } from '../../lib/presets/presets';
  import { documentStore, selectedLayerId, busy } from '../../lib/editor/store';
  import { exportPresetFile } from '../../lib/presets/files';
  import ApplyPresetDialog from '../effects/ApplyPresetDialog.svelte';
  import SavePresetDialog from '../effects/SavePresetDialog.svelte';
  let query = $state('');
  let applying = $state<EffectPreset | null>(null);
  let saving = $state(false);
  let error = $state('');
  let fileInput: HTMLInputElement;
  const layer = $derived(findLayer($documentStore.layers, $selectedLayerId));
  const matching = $derived([...$userPresets, ...builtinPresets].filter(preset => preset.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  async function importFile(event: Event): Promise<void> {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    try { if (file) { if (file.size > 1024 * 1024) throw new Error('Preset přesahuje 1 MB.'); const preset = parsePreset(await file.text()); preset.id = crypto.randomUUID(); if (storePreset(preset)) error = ''; } }
    catch (reason) { error = reason instanceof Error ? reason.message : 'Preset nelze importovat.'; }
    finally { fileInput.value = ''; }
  }
  function exportPreset(preset: EffectPreset): void { void exportPresetFile(preset).catch(reason => { error = reason instanceof Error ? reason.message : String(reason); }); }
</script>
<div class="presets-content">
  <input class="hidden-file-input" bind:this={fileInput} type="file" accept=".preset.json,application/json" onchange={importFile}/>
  <label class="search-box"><input bind:value={query} aria-label="Hledat presety" placeholder="Hledat presety…"/></label>
  <div class="preset-tools"><button class="small-button" disabled={!layer?.effects.length || layer?.locked || $busy} onclick={() => saving = true}><Plus size={14}/>Uložit stack</button><button class="icon-button" aria-label="Importovat preset" title="Importovat preset" onclick={() => fileInput.click()}><Upload size={16}/></button></div>
  {#if error || $libraryError}<p role="alert" class="effect-error">{error || $libraryError}</p>{/if}
  {#if !layer}<p class="effect-description">Vyberte vrstvu, na kterou chcete preset použít.</p>{/if}
  {#each matching as preset (preset.id)}<div class="preset-card"><strong>{preset.name}</strong><small>{preset.effects.length} efektů · {preset.id.startsWith('builtin-') ? 'Ukázkový' : 'Vlastní'}{preset.roles.length ? ` · ${preset.roles.length} zdrojů` : ''}</small><div><button class="small-button" disabled={!layer || layerLocked($documentStore.layers, layer.id) || $busy} onclick={() => applying = preset}>Použít</button><button class="icon-button" aria-label={`Exportovat preset ${preset.name}`} title="Exportovat preset" onclick={() => exportPreset(preset)}><Download size={14}/></button>{#if !preset.id.startsWith('builtin-')}<button class="icon-button" aria-label={`Odstranit preset ${preset.name}`} title="Odstranit preset" onclick={() => { if (confirm(`Odstranit preset „${preset.name}“ z knihovny?`)) removePreset(preset.id); }}><Trash2 size={14}/></button>{/if}</div></div>{/each}
  {#if !matching.length}<p class="search-empty">Žádné odpovídající presety.</p>{/if}
</div>
{#if applying && layer}<ApplyPresetDialog preset={applying} layerId={layer.id} onclose={() => applying = null}/>{/if}
{#if saving && layer}<SavePresetDialog layerId={layer.id} onclose={() => saving = false}/>{/if}
