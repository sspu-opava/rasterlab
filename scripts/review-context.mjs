import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173');await page.locator('.canvas-host canvas').waitFor();
 const result=await page.evaluate(async()=>{
  const {DocumentRenderEngine}=await import('/src/lib/render/DocumentRenderEngine.ts'),{AssetManager}=await import('/src/lib/assets/AssetManager.ts'),{createDocument,layerDefaults}=await import('/src/lib/document/factory.ts');
  const host=document.createElement('div');host.style.cssText='width:128px;height:128px';document.body.appendChild(host);const errors=[],engine=new DocumentRenderEngine(new AssetManager(),error=>errors.push(error));await engine.init(host);
  const doc=createDocument(64,64);doc.layers=[{...layerDefaults('Checker'),type:'generated',generatorId:'checker',parameters:{cellSize:8,foreground:1,background:0}}];const view={zoom:1,x:0,y:0};engine.render(doc,view);
  const extract=()=>{const texture=engine.graph.render(doc),canvas=engine.app.renderer.extract.canvas({target:texture});return canvas.toDataURL();};const before=extract();
  const gl=engine.app.renderer.gl,extension=gl.getExtension('WEBGL_lose_context');if(!extension){engine.destroy();host.remove();return {id:'CONTEXT-RESTORE',supported:false};}
  const restored=new Promise(resolve=>engine.app.canvas.addEventListener('webglcontextrestored',()=>resolve(true),{once:true}));extension.loseContext();await new Promise(resolve=>setTimeout(resolve,150));extension.restoreContext();const didRestore=await Promise.race([restored,new Promise(resolve=>setTimeout(()=>resolve(false),3000))]);let after,exportOK;
  if(didRestore){engine.render(doc,view);after=extract();await engine.export(doc,'png',1);exportOK=true;}engine.destroy();host.remove();return {id:'CONTEXT-RESTORE',supported:true,restored:didRestore,expected:'Náhled po obnově WebGL je totožný',previewEqual:before===after,exportOK,errors};
 });await writeFile('test-results/review/context.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2)); if (!result.supported || !result.restored || !result.previewEqual || !result.exportOK) throw new Error('Obnova kontextu selhala.');
}finally{await browser.close();}
