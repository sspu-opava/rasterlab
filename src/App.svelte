<script lang="ts">
  import { CircleHelp, X, Circle } from '@lucide/svelte';
  import { estimateRenderBytes } from './lib/render/capacity';
  import { recentProjects, refreshRecent, rememberProject, readRecent } from './lib/project/recent';
  import DocumentSettings from './components/common/DocumentSettings.svelte';
  import { readProjectFile } from './lib/project/files';
  import UnsavedDialog from './components/common/UnsavedDialog.svelte';
  import { commitActiveEdit, isEditing } from './lib/editor/editing';
  import { importing } from './lib/editor/store';
  import Toolbar from './components/common/Toolbar.svelte';
  import AssetsPanel from './components/assets/AssetsPanel.svelte';
  import CanvasViewport from './components/canvas/CanvasViewport.svelte';
  import LayersPanel from './components/layers/LayersPanel.svelte';
  import NewDocumentDialog from './components/common/NewDocumentDialog.svelte';
  import ExportDialog from './components/common/ExportDialog.svelte';
  import { onMount } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { documentStore, gpuState, errorMessage, status, viewportStore, tool, requestView, importFiles, reportError, historyState, busy, undo, redo, saveCurrentProject, openNativeProject, loadProjectJson } from './lib/editor/store';
  import { demoFile } from './lib/generators/demo';
  import { startRecovery, recoverableProject, recoveryStatus, restoreRecovery, discardRecovery, waitForRecovery, clearRecoveryForClose } from './lib/editor/store';
  let fileInput: HTMLInputElement;
  let projectInput: HTMLInputElement;
  let showSettings = $state(false);
  let showNew = $state(false);
  let showHelp = $state(false);
  let demoBusy = $state(false);
  let showExport = $state(false);
  const openImport = () => fileInput.click();
  let pendingAction = $state<(() => void | Promise<void>) | null>(null);
  async function requestAction(action: () => void | Promise<void>): Promise<void> {
    if ($busy || $importing || pendingAction) return;
    try { commitActiveEdit(); } catch (error) { reportError(error); return; }
    if ($historyState.dirty) pendingAction = action; else try { await action(); } catch (error) { reportError(error); }
  }
  async function decide(decision: 'save' | 'discard' | 'cancel'): Promise<void> {
    const action = pendingAction;
    if (decision === 'cancel') { pendingAction = null; return; }
    if (decision === 'save' && !await saveCurrentProject()) return;
    pendingAction = null;
    try { await action?.(); } catch (error) { reportError(error); }
  }
  function openProject(): void { void requestAction(() => { if (isTauri()) return openNativeProject(); projectInput.click(); }); }
  function openRecent(key: string): void {
    void requestAction(async () => {
      busy.set(true);
      try {
        const record = await readRecent(key); if (!record) return;
        if (record.path) { busy.set(false); await openNativeProject(record.path); }
        else if (record.file) { const loaded = await readProjectFile(new File([record.file], record.name)); await loadProjectJson(loaded.json, null, [], loaded.blobs, true); }
      } finally { busy.set(false); }
    });
  }
  function openNew(): void { void requestAction(() => { showNew = true; }); }
  onMount(() => {
    void refreshRecent().catch(() => {});
    let stopRecovery = startRecovery();
    let dispose: (() => void) | undefined;
    let mounted = true;
    if (isTauri()) void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const unlisten = await getCurrentWindow().onCloseRequested(async event => {
        if ($busy || $importing) { event.preventDefault(); return; }
        event.preventDefault(); await requestAction(async () => { await waitForRecovery(); stopRecovery(); try { await clearRecoveryForClose(); await getCurrentWindow().destroy(); } catch (error) { stopRecovery = startRecovery(); throw error; } });
      });
      if (mounted) dispose = unlisten; else unlisten();
    });
    return () => { mounted = false; dispose?.(); stopRecovery(); };
  });
  function beforeUnload(event: BeforeUnloadEvent): void { try { commitActiveEdit(); } catch { event.preventDefault(); event.returnValue = ''; return; } if ($historyState.dirty && !isTauri()) { event.preventDefault(); event.returnValue = ''; } }
  async function demo(): Promise<void> {
    if ($busy || $importing) return; demoBusy = true; busy.set(true);
    try { const file = await demoFile(); busy.set(false); await importFiles([file]); } catch (error) { reportError(error); }
    finally { demoBusy = false; busy.set(false); }
  }
  function shortcut(event: KeyboardEvent): void {
    if (showNew || showExport || pendingAction || $busy || $importing || (event.target as HTMLElement).closest('dialog')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveCurrentProject(event.shiftKey); }
    else if (!isEditing(event.target) && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
    else if (!isEditing(event.target) && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') { event.preventDefault(); showExport = true; }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openProject(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') { event.preventDefault(); openImport(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); openNew(); }
    else if (!event.ctrlKey && !event.metaKey && !event.altKey && !(event.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) {
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
<input class="hidden-file-input" bind:this={projectInput} type="file" accept=".json,.rlab,application/json" onchange={async event => { const file = event.currentTarget.files?.[0]; if (file && !$busy && !$importing) { busy.set(true); try { const loaded = await readProjectFile(file); await loadProjectJson(loaded.json, null, [], loaded.blobs, true); await rememberProject(file.name, undefined, file).catch(() => {}); } catch (error) { reportError(error); } finally { busy.set(false); } } projectInput.value = ''; }}/>
<div class="editor-shell">
  {#if $recoverableProject}<div class="recovery-banner" role="status"><span>Rozpracovaný projekt: <strong>{$recoverableProject.project.document.name}</strong> · {new Date($recoverableProject.writtenAt).toLocaleString()}</span><button class="small-button" disabled={$busy || $importing} onclick={() => { void requestAction(restoreRecovery); }}>Obnovit projekt</button><button class="small-button" disabled={$busy || $importing} onclick={() => { if (confirm('Odstranit zotavovací kopii?')) void discardRecovery().catch(reportError); }}>Zahodit kopii</button></div>{/if}
  <Toolbar onsettings={() => { try { commitActiveEdit(); showSettings = true; } catch (error) { reportError(error); } }} onimport={openImport} onnew={openNew} onopen={openProject} onexport={() => showExport = true} ondemo={demo} {demoBusy}/>
  {#if $recentProjects.length}<div class="recent-projects" aria-label="Poslední projekty"><span>Poslední projekty:</span>{#each $recentProjects as recent}<button class="small-button" disabled={$busy || $importing} title={recent.path ?? recent.name} onclick={() => openRecent(recent.key)}>{recent.name}</button>{/each}</div>{/if}
  <main class="editor-layout"><AssetsPanel onimport={openImport}/><CanvasViewport onimport={openImport}/><LayersPanel/></main>
  <footer class="statusbar"><span class="status-size">{$documentStore.width} × {$documentStore.height} px</span><span>Zoom: {Math.round($viewportStore.zoom * 100)}%</span><span class="status-message" aria-live="polite">{$status}</span><span class="gpu-status" aria-live="polite"><Circle size={8} fill="currentColor"/> {$gpuState === 'ready' ? 'WebGL' : $gpuState === 'lost' ? 'Obnovuji WebGL' : $gpuState === 'unavailable' ? 'WebGL nedostupný' : 'Inicializuji WebGL'}</span><span class="preview-mode" title="Konzervativní odhad renderovacích textur; zdrojové bitmapy se započítávají při preflightu">GPU ~{Math.ceil(estimateRenderBytes($documentStore) / 1048576)} / 512 MiB</span><button class="help-button" title="Klávesové zkratky" aria-label="Klávesové zkratky" onclick={() => showHelp = !showHelp}><CircleHelp size={16}/></button></footer>
  {#if $errorMessage}<div class="error-toast" role="alert"><span>{$errorMessage}</span><button aria-label="Zavřít chybu" onclick={() => errorMessage.set('')}><X size={16}/></button></div>{/if}
  {#if showHelp}<div class="shortcut-popover"><strong>Klávesové zkratky</strong><div><span>Import / otevřít projekt</span><kbd>Ctrl I / O</kbd></div><div><span>Uložit / uložit jako</span><kbd>Ctrl S / Shift S</kbd></div><div><span>Zpět / znovu</span><kbd>Ctrl Z / Shift Z</kbd></div><div><span>Export</span><kbd>Ctrl E</kbd></div><div><span>Nový dokument</span><kbd>Ctrl N</kbd></div><div><span>Přesun vrstvy / pohledu</span><kbd>V / H</kbd></div><div><span>Přizpůsobit / 100 %</span><kbd>F / 1</kbd></div><div><span>Dočasný posun</span><kbd>Space</kbd></div></div>{/if}
</div>
{#if showNew}<NewDocumentDialog onclose={() => showNew = false}/>{/if}
{#if showExport}<ExportDialog onclose={() => showExport = false}/>{/if}
{#if $recoveryStatus}<div class="recovery-status" role="status">{$recoveryStatus}</div>{/if}

{#if pendingAction}<UnsavedDialog ondecision={decision => { void decide(decision); }}/>{/if}

{#if showSettings}<DocumentSettings onclose={() => showSettings = false}/>{/if}
