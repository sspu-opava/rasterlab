import { effectHarness } from './effect-harness.mjs';
import { writeFile } from 'node:fs/promises';
const h=await effectHarness(),{page}=h;
page.on('dialog',dialog=>dialog.accept());
try{
 await page.getByRole('button',{name:'Nový dokument (Ctrl+N)'}).click();await page.getByLabel('Šířka / px').fill('64');await page.getByLabel('Výška / px').fill('64');await page.getByRole('button',{name:'Vytvořit dokument',exact:true}).click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=8;c.getContext('2d').fillRect(0,0,8,8);return c.toDataURL().split(',')[1];});
 await page.evaluate(()=>{const original=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=async function(){await original.call(this);await new Promise(resolve=>setTimeout(resolve,2500));};});
 await page.locator('input[accept^="image/"]').setInputFiles({name:'slow-import.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByRole('button',{name:'Importuji…',exact:true}).waitFor(); const newEnabled=await page.getByRole('button',{name:'Nový dokument (Ctrl+N)'}).isEnabled();
 await page.keyboard.press('Control+n'); if (await page.getByRole('dialog').count()) throw new Error('Ctrl+N otevřel dialog během importu.'); await page.getByRole('button',{name:'slow-import Rastrová vrstva',exact:true}).waitFor();
 const model=JSON.parse(await h.save());const result={id:'IMPORT-RACE',expected:'Nový dokument během importu je blokován nebo pozdní import patří původnímu dokumentu',observed:{newEnabled,width:model.document.width,layers:model.document.layers.map(layer=>layer.name)},passed:!newEnabled&&model.document.width===64&&model.document.layers.length===1};
 await writeFile('test-results/review/import-race.json',JSON.stringify(result,null,2));await page.screenshot({path:'test-results/review/import-race.png'});console.log(JSON.stringify(result,null,2)); if (!result.passed) throw new Error('IMPORT-RACE regrese');
}finally{await h.browser.close();}
