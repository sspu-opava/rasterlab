import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173');await page.locator('.canvas-host canvas').waitFor();
 const data=await page.evaluate(async()=>{
  const {DocumentRenderEngine}=await import('/src/lib/render/DocumentRenderEngine.ts'),{AssetManager}=await import('/src/lib/assets/AssetManager.ts'),{createDocument,layerDefaults}=await import('/src/lib/document/factory.ts'),{effectRegistry}=await import('/src/lib/effects/index.ts'),{generatorRegistry}=await import('/src/lib/generators/index.ts'),{validateParameters}=await import('/src/lib/effects/core/parameters.ts');
  const host=document.createElement('div');host.style.cssText='position:fixed;width:256px;height:256px;left:0;top:0';document.body.appendChild(host);
  const errors=[],engine=new DocumentRenderEngine(new AssetManager(),error=>errors.push(error));await engine.init(host);
  const gl=engine.app.renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info'),environment={renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),devicePixelRatio};
  const timings=[];
  for(const [size,id,params] of [[512,'threshold',{}],[1024,'threshold',{}],[512,'morphology',{radius:8}],[1024,'morphology',{radius:8}],[512,'reaction-diffusion',{iterations:32}]]){
   const doc=createDocument(size,size),definition=effectRegistry.get(id);doc.layers=[{...layerDefaults('Bench'),type:'generated',generatorId:'noise',parameters:validateParameters(generatorRegistry.get('noise'),{}),effects:[{id:crypto.randomUUID(),effectId:id,enabled:true,inputs:{},parameters:validateParameters(definition,params)}]}];
   const started=performance.now();let taskLag;const task=new Promise(resolve=>setTimeout(()=>{taskLag=performance.now()-started;resolve();},0));engine.render(doc,{zoom:1,x:0,y:0});await task;const previewMs=performance.now()-started;
   const exported=performance.now();let exportTaskLag=0,last=exported;const heartbeat=setInterval(()=>{const now=performance.now();exportTaskLag=Math.max(exportTaskLag,now-last-10);last=now;},10);try{await engine.export(doc,'png',1);await new Promise(resolve=>setTimeout(resolve,20));}finally{clearInterval(heartbeat);}const coldExportMs=performance.now()-exported;timings.push({size,effect:id,parameters:params,previewMs:Math.round(previewMs),taskLagMs:Math.round(taskLag),coldExportMs:Math.round(coldExportMs),exportTaskLagMs:Math.round(exportTaskLag)});
  }engine.destroy();host.remove();return {environment,timings,errors};
 });await writeFile('test-results/review/performance.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
}finally{await browser.close();}
