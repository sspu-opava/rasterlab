<script lang="ts">
  import { ImagePlus, Search, Image, Plus, FolderOpen } from '@lucide/svelte';
  import { assetStore, importing, addAssetLayer } from '../../lib/editor/store';
  import PresetsPanel from './PresetsPanel.svelte';
  let tab = $state<'assets' | 'presets'>('assets');
  let { onimport }: { onimport: () => void } = $props();
  let search = $state('');
  let filtered = $derived($assetStore.filter(asset => asset.name.toLowerCase().includes(search.toLowerCase())));
</script>

<aside class="assets-panel panel" aria-label="Knihovna obrázků">
  <div class="panel-tabs"><button class:selected-tab={tab === 'assets'} onclick={() => tab = 'assets'}>Assets <span class="count">{$assetStore.length}</span></button><span class="future-tab" title="Připraveno pro další fázi">Generators</span><button class:selected-tab={tab === 'presets'} onclick={() => tab = 'presets'}>Presets</button></div>
  {#if tab === 'assets'}
  <div class="assets-tools">
    <button class="primary-button import-button" onclick={onimport} disabled={$importing}><ImagePlus size={17}/> {$importing ? 'Importuji…' : 'Importovat obrázky'}</button>
    <label class="search-box"><Search size={16}/><input bind:value={search} placeholder="Hledat v assets…" aria-label="Hledat obrázky"/></label>
  </div>
  <div class="asset-scroll">
    {#if $assetStore.length === 0}
      <div class="asset-empty"><div class="empty-symbol"><FolderOpen size={30} strokeWidth={1.3}/></div><strong>Váš materiál. Vaše pravidla.</strong><p>Importujte obrázky a začněte<br/>skládat vlastní experiment.</p><span class="file-types">PNG <i>·</i> JPEG <i>·</i> WebP</span></div>
    {:else}
      <div class="asset-grid">
        {#each filtered as asset (asset.id)}
          <button class="asset-card" onclick={() => addAssetLayer(asset.id)} title={`Přidat ${asset.name} jako novou vrstvu`}>
            <div class="asset-preview"><img src={asset.url} alt={asset.name}/><span class="asset-add"><Plus size={17}/></span></div>
            <span class="asset-name">{asset.name}</span><span class="asset-dimensions">{asset.width} × {asset.height}</span>
          </button>
        {/each}
      </div>
      {#if filtered.length === 0}<p class="search-empty">Žádné odpovídající obrázky.</p>{/if}
    {/if}
  </div>
  {:else}<PresetsPanel/>{/if}
  <div class="panel-footer"><Image size={14}/><span>Originály zůstávají nedotčené</span></div>
</aside>
