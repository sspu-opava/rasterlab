<script lang="ts">
  import { CircleHelp, X, Circle } from '@lucide/svelte';
  import Toolbar from './components/common/Toolbar.svelte';
  import AssetsPanel from './components/assets/AssetsPanel.svelte';
  import CanvasViewport from './components/canvas/CanvasViewport.svelte';
  import LayersPanel from './components/layers/LayersPanel.svelte';
  import NewDocumentDialog from './components/common/NewDocumentDialog.svelte';
  import { documentStore, errorMessage, status, viewportStore, tool, requestView, importFiles, reportError } from './lib/editor/store';
  import { demoFile } from './lib/generators/demo';
  let fileInput: HTMLInputElement;
  let showNew = $state(false);
  let showHelp = $state(false);
  let demoBusy = $state(false);
  const openImport = () => fileInput.click();
  async function demo(): Promise<void> {
    demoBusy = true;
    try { await importFiles([await demoFile()]); } catch (error) { reportError(error); }
    finally { demoBusy = false; }
  }
  function shortcut(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).closest('input,textarea,select') || showNew) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openImport(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); showNew = true; }
    else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key.toLowerCase() === 'h') tool.set('pan');
      if (event.key.toLowerCase() === 'v') tool.set('select');
      if (event.key.toLowerCase() === 'f') requestView('fit');
      if (event.key === '1') requestView('actual');
      if (event.key === 'Escape') showHelp = false;
    }
  }
</script>

<svelte:window onkeydown={shortcut}/>
<input class="hidden-file-input" bind:this={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onchange={async event => { const files = event.currentTarget.files; if (files) await importFiles(files); fileInput.value = ''; }}/>
<div class="editor-shell">
  <Toolbar onimport={openImport} onnew={() => showNew = true} ondemo={demo} {demoBusy}/>
  <main class="editor-layout"><AssetsPanel onimport={openImport}/><CanvasViewport onimport={openImport}/><LayersPanel/></main>
  <footer class="statusbar"><span class="status-size">{$documentStore.width} × {$documentStore.height} px</span><span>Zoom: {Math.round($viewportStore.zoom * 100)}%</span><span class="status-message" aria-live="polite">{$status}</span><span class="gpu-status"><Circle size={8} fill="currentColor"/> WebGL</span><span class="preview-mode">Preview</span><button class="help-button" title="Klávesové zkratky" aria-label="Klávesové zkratky" onclick={() => showHelp = !showHelp}><CircleHelp size={16}/></button></footer>
  {#if $errorMessage}<div class="error-toast" role="alert"><span>{$errorMessage}</span><button aria-label="Zavřít chybu" onclick={() => errorMessage.set('')}><X size={16}/></button></div>{/if}
  {#if showHelp}<div class="shortcut-popover"><strong>Klávesové zkratky</strong><div><span>Import obrázků</span><kbd>Ctrl O</kbd></div><div><span>Nový dokument</span><kbd>Ctrl N</kbd></div><div><span>Výběr / posun</span><kbd>V / H</kbd></div><div><span>Přizpůsobit / 100 %</span><kbd>F / 1</kbd></div><div><span>Dočasný posun</span><kbd>Space</kbd></div><div><span>Zoom k ukazateli</span><kbd>Kolečko</kbd></div></div>{/if}
</div>
{#if showNew}<NewDocumentDialog onclose={() => showNew = false}/>{/if}
