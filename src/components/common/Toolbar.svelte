<script lang="ts">
  import packageInfo from '../../../package.json';
  import { FilePlus2, FolderOpen, Save, Undo2, Redo2, Download, ImagePlus, Hand, MousePointer2, Scan, Maximize, Minus, Plus, FlaskConical } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';
  import { tool, constrainViewport, viewportStore, requestView, historyState, undo, redo, busy, importing, saveCurrentProject } from '../../lib/editor/store';
  import { zoomAt } from '../../lib/render/viewport';
  let { onsettings, onimport, onnew, onopen, onexport, ondemo, demoBusy }: { onsettings: () => void; onimport: () => void; onnew: () => void; onopen: () => void; onexport: () => void; ondemo: () => void; demoBusy: boolean } = $props();
  function zoom(factor: number): void {
    const host = document.querySelector('.canvas-host');
    if (!host) return;
    viewportStore.update(view => zoomAt(view, view.zoom * factor, { x: host.clientWidth / 2, y: host.clientHeight / 2 }));
  }
</script>

<header class="titlebar">
  <div class="brand"><span class="brand-mark">R</span><strong>RasterLab</strong><span class="version">{packageInfo.version}</span></div>
  <div class="titlebar-note">EXPERIMENTÁLNÍ RASTROVÉ STUDIO</div>
  <span class="phase-badge">Verze {packageInfo.version}</span>
</header>
<nav class="toolbar" aria-label="Nástroje editoru">
  <IconButton label="Nový dokument (Ctrl+N)" disabled={$busy || $importing} onclick={onnew}><FilePlus2 size={19}/></IconButton>
  <IconButton label="Otevřít projekt (Ctrl+O)" disabled={$busy || $importing} onclick={onopen}><FolderOpen size={19}/></IconButton>
  <IconButton label="Uložit projekt (Ctrl+S)" disabled={$busy || $importing} onclick={() => { void saveCurrentProject(); }}><Save size={18}/></IconButton>
  <IconButton label="Importovat obrázky (Ctrl+I)" disabled={$busy || $importing} onclick={onimport}><ImagePlus size={19}/></IconButton>
  <span class="divider"></span>
  <IconButton label={`Zpět (Ctrl+Z)${$historyState.undoLabel ? ` · ${$historyState.undoLabel}` : ''}`} disabled={!$historyState.canUndo || $busy || $importing} onclick={undo}><Undo2 size={18}/></IconButton>
  <IconButton label={`Znovu (Ctrl+Shift+Z)${$historyState.redoLabel ? ` · ${$historyState.redoLabel}` : ''}`} disabled={!$historyState.canRedo || $busy || $importing} onclick={redo}><Redo2 size={18}/></IconButton>
  <span class="divider"></span>
  <IconButton label="Přesun vrstvy (V)" active={$tool === 'select'} onclick={() => tool.set('select')}><MousePointer2 size={18}/></IconButton>
  <IconButton label="Posun pohledu (H / mezerník)" active={$tool === 'pan'} onclick={() => tool.set('pan')}><Hand size={18}/></IconButton>
  <span class="divider"></span>
  <IconButton label="Oddálit" onclick={() => zoom(1 / 1.25)}><Minus size={16}/></IconButton>
  <span class="zoom-readout">{Math.round($viewportStore.zoom * 100)}<span>%</span></span>
  <IconButton label="Přiblížit" onclick={() => zoom(1.25)}><Plus size={16}/></IconButton>
  <button class="small-button" onclick={() => requestView('fit')} aria-label="Přizpůsobit dokument pracovní ploše (F)" title="Přizpůsobit dokument pracovní ploše (F)"><Scan size={15}/> Přizpůsobit</button>
  <button class="small-button" onclick={() => requestView('actual')} aria-label="Skutečná velikost dokumentu (1)" title="Skutečná velikost dokumentu (1)"><Maximize size={14}/> 1:1</button>
  <button class="small-button" disabled={$busy || $importing} onclick={onsettings}>Dokument…</button>
  <button class="small-button" disabled={$busy || $importing} onclick={() => { void saveCurrentProject(true, true); }}>Uložit .rlab</button>
  <label class="viewport-toggle" title="Ponechat alespoň část plátna v dosahu"><input type="checkbox" bind:checked={$constrainViewport}/> Dosah</label>
  <div class="toolbar-spacer"></div>
  <button class="small-button demo-button" onclick={ondemo} disabled={demoBusy || $busy || $importing}><FlaskConical size={16}/> {demoBusy ? 'Vytvářím…' : 'Demo experiment'}</button>
  <button class="primary-button" onclick={onexport} disabled={$busy || $importing}><Download size={16}/> Export…</button>
</nav>
