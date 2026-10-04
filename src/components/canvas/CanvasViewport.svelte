<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { ImagePlus, Move, MousePointer2 } from '@lucide/svelte';
  import { assets, documentStore, constrainViewport, viewportStore, viewAction, tool, reportError, importFiles, selectedLayerId, updateLayer, effectErrors, errorMessage, gpuState, status, historyState, finishEdit } from '../../lib/editor/store';
  import { DocumentRenderEngine } from '../../lib/render/DocumentRenderEngine';
  import { setExporter } from '../../lib/project/export';
  import { documentPoint, fitViewport, zoomAt } from '../../lib/render/viewport';
  import type { Point } from '../../lib/document/types';
  import { findLayer, layerLocked, layerVisible, localDragDelta } from '../../lib/document/layers';
  let { onimport }: { onimport: () => void } = $props();
  let host: HTMLDivElement;
  let ready = $state(false);
  let draggingFile = $state(false);
  let pointer = $state<Point | null>(null);
  let draggingPan = $state(false);
  let space = $state(false);
  let drag: { id: number; start: Point; mode: 'pan' | 'layer'; x: number; y: number; layerId?: string } | null = null;

  onMount(() => {
    let disposed = false;
    let frame = 0;
    const engine = new DocumentRenderEngine(assets, reportError, errors => effectErrors.set(errors), lost => { gpuState.set(lost ? 'lost' : 'ready'); status.set(lost ? 'Čekám na obnovu WebGL…' : 'WebGL kontext obnoven'); if (!lost && get(errorMessage).includes('WebGL kontext byl ztracen')) errorMessage.set(''); });
    const unsubscribers: (() => void)[] = [];
    const listeners = new AbortController();
    const schedule = () => {
      if (get(constrainViewport)) { const view = get(viewportStore), model = get(documentStore), margin = 48; const x = Math.min(host.clientWidth - margin, Math.max(margin - model.width * view.zoom, view.x)), y = Math.min(host.clientHeight - margin, Math.max(margin - model.height * view.zoom, view.y)); if (x !== view.x || y !== view.y) { viewportStore.set({ ...view, x, y }); return; } }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!disposed) engine.render(get(documentStore), get(viewportStore)); });
    };
    const fit = () => {
      const document = get(documentStore);
      viewportStore.set(fitViewport(host.clientWidth, host.clientHeight, document.width, document.height));
    };
    const point = (event: MouseEvent): Point => { const rect = host.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    const options = { signal: listeners.signal };
    host.addEventListener('wheel', event => {
      event.preventDefault();
      stop();
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { viewportStore.update(view => ({ ...view, x: view.x - (event.deltaX || event.deltaY), y: view.y - (event.deltaX ? event.deltaY : 0) })); return; }
      viewportStore.update(view => zoomAt(view, view.zoom * Math.exp(-event.deltaY * 0.0015), point(event)));
    }, { ...options, passive: false });
    host.addEventListener('pointerdown', event => {
      if ((event.target as HTMLElement).closest('button')) return;
      if (drag || ![0, 1].includes(event.button)) return;
      const view = get(viewportStore);
      if (space || get(tool) === 'pan' || event.button === 1) {
        drag = { id: event.pointerId, start: point(event), mode: 'pan', x: view.x, y: view.y };
      } else {
        const layer = findLayer(get(documentStore).layers, get(selectedLayerId));
        if (layer && !layerLocked(get(documentStore).layers, layer.id) && layerVisible(get(documentStore).layers, layer.id)) drag = { id: event.pointerId, start: point(event), mode: 'layer', x: layer.position.x, y: layer.position.y, layerId: layer.id };
      }
      if (drag) { draggingPan = drag.mode === 'pan'; event.preventDefault(); host.setPointerCapture(event.pointerId); host.classList.add('dragging'); }
    }, options);
    host.addEventListener('pointermove', event => {
      const p = point(event);
      pointer = documentPoint(get(viewportStore), p);
      if (!drag || drag.id !== event.pointerId) return;
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;
      if (drag.mode === 'pan') viewportStore.update(view => ({ ...view, x: drag!.x + dx, y: drag!.y + dy }));
      else if (drag.layerId) { const delta = localDragDelta(get(documentStore).layers, drag.layerId, dx / get(viewportStore).zoom, dy / get(viewportStore).zoom); updateLayer(drag.layerId, { position: { x: drag.x + delta.x, y: drag.y + delta.y } }); }
    }, options);
    const stop = (event?: PointerEvent) => { if (event && drag && event.pointerId !== drag.id) return; const id = drag?.id; if (drag) finishEdit(); drag = null; draggingPan = false; if (id !== undefined && host.hasPointerCapture(id)) host.releasePointerCapture(id); host.classList.remove('dragging'); };
    host.addEventListener('pointerup', stop, options);
    const interrupt = (event: PointerEvent) => { const active = drag?.id === event.pointerId; stop(event); if (active) space = false; };
    host.addEventListener('pointercancel', interrupt, options);
    host.addEventListener('lostpointercapture', interrupt, options);
    host.addEventListener('pointerleave', () => { pointer = null; }, options);
    window.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).closest('input,textarea,select,[contenteditable],dialog,button:not(.tool-button)')) return;
      if (event.code === 'Space') { event.preventDefault(); space = true; }
    }, options);
    window.addEventListener('keyup', event => { if (event.code === 'Space') { space = false; } }, options);
    window.addEventListener('focusin', event => { if ((event.target as HTMLElement).closest('dialog')) { space = false; stop(); } }, options);
    window.addEventListener('blur', () => { space = false; stop(); }, options);
    let dragDepth = 0;
    host.addEventListener('dragenter', event => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); dragDepth++; draggingFile = true; } }, options);
    host.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }, options);
    host.addEventListener('dragleave', () => { dragDepth--; if (dragDepth <= 0) draggingFile = false; }, options);
    host.addEventListener('drop', event => {
      event.preventDefault(); dragDepth = 0; draggingFile = false;
      if (event.dataTransfer?.files) void importFiles(event.dataTransfer.files);
    }, options);
    const observer = new ResizeObserver(() => {
      if (!ready) return;
      engine.resize(host.clientWidth, host.clientHeight); schedule();
    });
    observer.observe(host);
    void engine.init(host).then(() => {
      if (disposed) { engine.destroy(); return; }
      ready = true; gpuState.set('ready'); fit(); setExporter((document, format, quality, control) => engine.export(document, format, quality, control));
      unsubscribers.push(constrainViewport.subscribe(schedule), documentStore.subscribe(schedule), viewportStore.subscribe(schedule), viewAction.subscribe(action => {
        if (action.type === 'fit') fit();
        else { const doc = get(documentStore); viewportStore.set({ zoom: 1, x: (host.clientWidth - doc.width) / 2, y: (host.clientHeight - doc.height) / 2 }); }
      }));
    }).catch(error => { if (!disposed) { gpuState.set('unavailable'); reportError(error); } });
    return () => { disposed = true; setExporter(null); cancelAnimationFrame(frame); observer.disconnect(); listeners.abort(); unsubscribers.forEach(unsubscribe => unsubscribe()); engine.destroy(); };
  });
</script>

<section class="workspace" aria-label="Pracovní plocha">
  <div class="document-tab"><span class="tab-dot"></span><span>{$documentStore.name}.json{$historyState.dirty ? ' *' : ''}</span><span class="document-size">{$documentStore.width} × {$documentStore.height}</span><span class="workspace-label">DOKUMENT</span></div>
  <div bind:this={host} class="canvas-host" class:pan-cursor={$tool === 'pan' || space || draggingPan}>
    {#if ready && $documentStore.layers.length === 0}
      <div class="canvas-empty"><span class="canvas-empty-icon"><ImagePlus size={29} strokeWidth={1.3}/></span><strong>Prostor pro váš další experiment</strong><p>Přetáhněte sem obrázek nebo začněte importem.</p><button class="small-button" onclick={onimport}><ImagePlus size={15}/> Importovat obrázek</button></div>
    {/if}
    {#if !ready}<div class="canvas-loading">Inicializuji WebGL…</div>{/if}
    {#if draggingFile}<div class="drop-overlay"><ImagePlus size={36}/><strong>Pusťte obrázky do dokumentu</strong><span>PNG · JPEG · WebP</span></div>{/if}
    <div class="canvas-hint">{#if $tool === 'pan'}<Move size={12}/> Táhnutím posunete pohled{:else}<MousePointer2 size={12}/> Táhnutím posunete vybranou vrstvu{/if}<span>·</span> Kolečko: zoom · Shift+kolečko / vodorovný touchpad: posun <span>·</span> Mezerník: pan</div>
  </div>
  <div class="workspace-bottom"><span class="coordinate">{pointer ? `x: ${Math.round(pointer.x)}   y: ${Math.round(pointer.y)}` : 'x: —   y: —'}</span><span>NEDESTRUKTIVNÍ PRACOVNÍ PLOCHA</span><span class="render-label">WebGL / PixiJS 8</span></div>
</section>
