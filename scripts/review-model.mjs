import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173');await page.locator('.canvas-host canvas').waitFor();
 const results=await page.evaluate(async()=>{
  const state=await import('/src/lib/editor/state.ts'),{get}=await import('/node_modules/.vite/deps/svelte_store.js'),{findLayer,layerEntries}=await import('/src/lib/document/layers.ts'),{RenderGraph}=await import('/src/lib/render/RenderGraph.ts'),{ProjectSerializer}=await import('/src/lib/project/ProjectSerializer.ts'),{ProjectDeserializer}=await import('/src/lib/project/ProjectDeserializer.ts');
  const results=[],record=(id,expected,observed,passed)=>results.push({id,expected,observed,passed});
  state.newDocument(128,96);state.addGenerator('checker');const id=get(state.selectedLayerId);state.addEffect(id,'threshold');const graph=new RenderGraph();graph.update(get(state.documentStore));graph.markClean();state.updateLayer(id,{opacity:0.5});graph.update(get(state.documentStore));
  record('CACHE-OPACITY','Změna krytí invaliduje složení, nikoli source a efekty',{dirty:[...graph.dirty]},!graph.dirty.has(`${id}:source`));
  const file=ProjectSerializer.create(get(state.documentStore),state.assets);file.document=structuredClone(file.document);file.document.layers[0].scale.x=0;let accepted;try{ProjectDeserializer.parse(JSON.stringify(file));accepted=true;}catch{accepted=false;}
  record('LOAD-SCALE','Projekt odmítne nulové měřítko nedostupné v UI',{accepted},!accepted);
  const bytes=new Blob([new Uint8Array([0])],{type:'image/png'});const c=document.createElement('canvas');c.width=c.height=4;const ctx=c.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,4,4);const blob=await new Promise(resolve=>c.toBlob(resolve));await state.importFiles([new File([blob],'old.png',{type:'image/png'})]);const assetsBefore=state.assets.list().length; const bitmapId=get(state.selectedLayerId); state.deleteLayer(bitmapId); state.cleanUnusedAssets(); const retained=state.assets.list().length===1; state.undo(); const restored=findLayer(get(state.documentStore).layers,bitmapId)?.assetId; record('ASSET-HISTORY','Čištění zachová originál pro undo/redo',{retained,restored},retained&&Boolean(restored&&state.assets.get(restored))); state.newDocument(64,64);
  record('NEW-ASSETS','Nový dokument uvolní assety, které už nemůže vrátit historie',{before:assetsBefore,after:state.assets.list().length,layers:get(state.documentStore).layers.length},state.assets.list().length===0);
  // Model mutation during an import is currently possible; fake importing models the guard.
  state.addGenerator('checker');const before=get(state.documentStore);state.importing.set(true);state.newDocument(32,32);state.importing.set(false);
  record('BUSY-NEW','Nový dokument je během importu zablokován',{before:before.width,after:get(state.documentStore).width},get(state.documentStore)===before);
  state.newDocument(64,64);state.addGenerator('checker');const child=get(state.selectedLayerId);state.groupSelectedLayer(child);const group=get(state.selectedLayerId);state.updateLayer(group,{locked:true});state.updateLayer(group,{locked:false});state.moveLayerToGroup(child,null);
  record('MOVE-IDENTITY','Přesun ze skupiny zachová UUID',{id:child,actual:get(state.documentStore).layers[0].id},get(state.documentStore).layers[0].id===child);
  const stable=ProjectSerializer.stringify(ProjectSerializer.create(get(state.documentStore),state.assets)); const concurrent=await Promise.allSettled([state.loadProjectJson(stable),state.loadProjectJson(stable)]); record('LOAD-LOCK','Souběžný loader provede jen jednu výměnu',{statuses:concurrent.map(item=>item.status)},concurrent[0].status==='fulfilled'&&concurrent[1].status==='rejected');
  return results;
 });await mkdir('test-results/review',{recursive:true});await writeFile('test-results/review/model.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2)); if (results.some(result=>!result.passed)) throw new Error('Revizní kontrola selhala.');
}finally{await browser.close();}
