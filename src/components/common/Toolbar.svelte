<script lang="ts">
  import { FilePlus2, ImagePlus, Hand, MousePointer2, Scan, Maximize, Minus, Plus, FlaskConical } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';
  import { tool, viewportStore, requestView } from '../../lib/editor/store';
  import { zoomAt } from '../../lib/render/viewport';
  let { onimport, onnew, ondemo, demoBusy }: { onimport: () => void; onnew: () => void; ondemo: () => void; demoBusy: boolean } = $props();
  function zoom(factor: number): void {
    const host = document.querySelector('.canvas-host');
    if (!host) return;
    viewportStore.update(view => zoomAt(view, view.zoom * factor, { x: host.clientWidth / 2, y: host.clientHeight / 2 }));
  }
</script>

<header class="titlebar">
  <div class="brand"><span class="brand-mark">R</span><strong>RasterLab</strong><span class="version">0.1</span></div>
  <div class="titlebar-note">EXPERIMENTAL RASTER STUDIO</div>
  <span class="phase-badge">Foundation</span>
</header>
<nav class="toolbar" aria-label="Nástroje editoru">
  <IconButton label="Nový dokument (Ctrl+N)" onclick={onnew}><FilePlus2 size={19}/></IconButton>
  <IconButton label="Importovat obrázky (Ctrl+O)" onclick={onimport}><ImagePlus size={19}/></IconButton>
  <span class="divider"></span>
  <IconButton label="Výběr (V)" active={$tool === 'select'} onclick={() => tool.set('select')}><MousePointer2 size={18}/></IconButton>
  <IconButton label="Posun pohledu (H / mezerník)" active={$tool === 'pan'} onclick={() => tool.set('pan')}><Hand size={18}/></IconButton>
  <span class="divider"></span>
  <IconButton label="Oddálit" onclick={() => zoom(1 / 1.25)}><Minus size={16}/></IconButton>
  <span class="zoom-readout">{Math.round($viewportStore.zoom * 100)}<span>%</span></span>
  <IconButton label="Přiblížit" onclick={() => zoom(1.25)}><Plus size={16}/></IconButton>
  <button class="small-button" onclick={() => requestView('fit')} aria-label="Přizpůsobit dokument pracovní ploše (F)" title="Přizpůsobit dokument pracovní ploše (F)"><Scan size={15}/> Fit</button>
  <button class="small-button" onclick={() => requestView('actual')} aria-label="Skutečná velikost dokumentu (1)" title="Skutečná velikost dokumentu (1)"><Maximize size={14}/> 1:1</button>
  <div class="toolbar-spacer"></div>
  <button class="small-button demo-button" onclick={ondemo} disabled={demoBusy}><FlaskConical size={16}/> {demoBusy ? 'Vytvářím…' : 'Demo experiment'}</button>
</nav>
