<script lang="ts">
  import { CircleHelp, X, Circle } from '@lucide/svelte';
  import Toolbar from './components/common/Toolbar.svelte';
  import AssetsPanel from './components/assets/AssetsPanel.svelte';
  import CanvasViewport from './components/canvas/CanvasViewport.svelte';
  import LayersPanel from './components/layers/LayersPanel.svelte';
  import NewDocumentDialog from './components/common/NewDocumentDialog.svelte';
  import ExportDialog from './components/common/ExportDialog.svelte';
  import { onMount } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { documentStore, errorMessage, status, viewportStore, tool, requestView, importFiles, reportError, historyState, busy, undo, redo, saveCurrentProject, openNativeProject, loadProjectJson } from './lib/editor/store';
  import { demoFile } from './lib/generators/demo';
  import { startRecovery, recoverableProject, recoveryStatus, restoreRecovery, discardRecovery } from './lib/editor/store';
  let fileInput: HTMLInputElement;
  let projectInput: HTMLInputElement;
  let showNew = $state(false);
  let showHelp = $state(false);
  let demoBusy = $state(false);
  let showExport = $state(false);
  const openImport = () => fileInput.click();
  function openProject(): void {
    if ($busy) return;
    if ($historyState.dirty && !confirm('Otevření projektu nahradí neuložené změny. Pokračovat?')) return;
    if (isTauri()) void openNativeProject(); else projectInput.click();
  }
  onMount(() => {
    const stopRecovery = startRecovery();
    let dispose: (() => void) | undefined;
    let mounted = true;
    if (isTauri()) void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const unlisten = await getCurrentWindow().onCloseRequested(async event => {
        if ($busy) { event.preventDefault(); return; }
        if ($historyState.dirty) { event.preventDefault(); if (confirm('Zavřít RasterLab a zahodit neuložené změny?')) { try { await discardRecovery(); await getCurrentWindow().destroy(); } catch (error) { reportError(error); } } }
      });
      if (mounted) dispose = unlisten; else unlisten();
    });
    return () => { mounted = false; dispose?.(); stopRecovery(); };
  });
  function beforeUnload(event: BeforeUnloadEvent): void { if ($historyState.dirty && !isTauri()) { event.preventDefault(); event.returnValue = ''; } }
  async function demo(): Promise<void> {
    demoBusy = true;
    try { await importFiles([await demoFile()]); } catch (error) { reportError(error); }
    finally { demoBusy = false; }
  }
  function shortcut(event: KeyboardEvent): void {
    if (showNew || showExport || $busy || (event.target as HTMLElement).closest('dialog')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveCurrentProject(event.shiftKey); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') { event.preventDefault(); showExport = true; }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openProject(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') { event.preventDefault(); openImport(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); showNew = true; }
    else if (!event.ctrlKey && !event.metaKey && !event.altKey && !(event.target as HTMLElement).closest('input,textarea,select')) {
      if (event.key.toLowerCase() === 'h') tool.set('pan');
      if (event.key.toLowerCase() === 'v') tool.set('select');
      if (event.key.toLowerCase() === 'f') requestView('fit');
      if (event.key === '1') requestView('actual');
      if (event.key === 'Escape') showHelp = false;
    }
  }
</script>

<svelte:window onkeydown={shortcut} onbeforeunload={beforeUnload}/>
<input class="hidden-file-input" bind:this={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onchange={async event => { const files = event.currentTarget.files; if (files) await importFiles(files); fileInput.value = ''; }}/>
<input class="hidden-file-input" bind:this={projectInput} type="file" accept=".json,application/json" onchange={async event => { const file = event.currentTarget.files?.[0]; if (file) { busy.set(true); try { await loadProjectJson(await file.text()); } catch (error) { reportError(error); } finally { busy.set(false); } } projectInput.value = ''; }}/>
<div class="editor-shell">
  {#if $recoverableProject}<div class="recovery-banner" role="status"><span>Rozpracovaný projekt: <strong>{$recoverableProject.project.document.name}</strong> · {new Date($recoverableProject.writtenAt).toLocaleString()}</span><button class="small-button" disabled={$busy} onclick={() => { if (!$historyState.dirty || confirm('Obnova nahradí aktuální neuložené změny. Pokračovat?')) void restoreRecovery(); }}>Obnovit projekt</button><button class="small-button" disabled={$busy} onclick={() => { if (confirm('Odstranit zotavovací kopii?')) void discardRecovery().catch(reportError); }}>Zahodit kopii</button></div>{/if}
  <Toolbar onimport={openImport} onnew={() => showNew = true} onopen={openProject} onexport={() => showExport = true} ondemo={demo} {demoBusy}/>
  <main class="editor-layout"><AssetsPanel onimport={openImport}/><CanvasViewport onimport={openImport}/><LayersPanel/></main>
  <footer class="statusbar"><span class="status-size">{$documentStore.width} × {$documentStore.height} px</span><span>Zoom: {Math.round($viewportStore.zoom * 100)}%</span><span class="status-message" aria-live="polite">{$status}</span><span class="gpu-status"><Circle size={8} fill="currentColor"/> WebGL</span><span class="preview-mode">Preview</span><button class="help-button" title="Klávesové zkratky" aria-label="Klávesové zkratky" onclick={() => showHelp = !showHelp}><CircleHelp size={16}/></button></footer>
  {#if $errorMessage}<div class="error-toast" role="alert"><span>{$errorMessage}</span><button aria-label="Zavřít chybu" onclick={() => errorMessage.set('')}><X size={16}/></button></div>{/if}
  {#if showHelp}<div class="shortcut-popover"><strong>Klávesové zkratky</strong><div><span>Import / otevřít projekt</span><kbd>Ctrl I / O</kbd></div><div><span>Uložit / uložit jako</span><kbd>Ctrl S / Shift S</kbd></div><div><span>Zpět / znovu</span><kbd>Ctrl Z / Shift Z</kbd></div><div><span>Export</span><kbd>Ctrl E</kbd></div><div><span>Nový dokument</span><kbd>Ctrl N</kbd></div><div><span>Výběr / posun</span><kbd>V / H</kbd></div><div><span>Přizpůsobit / 100 %</span><kbd>F / 1</kbd></div><div><span>Dočasný posun</span><kbd>Space</kbd></div></div>{/if}
</div>
{#if showNew}<NewDocumentDialog onclose={() => showNew = false}/>{/if}
{#if showExport}<ExportDialog onclose={() => showExport = false}/>{/if}
{#if $recoveryStatus}<div class="recovery-status" role="status">{$recoveryStatus}</div>{/if}
