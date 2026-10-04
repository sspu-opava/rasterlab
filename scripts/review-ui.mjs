import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { effectHarness } from './effect-harness.mjs';
const h = await effectHarness(), { page } = h;
const results = [];
page.on('dialog', dialog => dialog.accept());
const position = async () => JSON.parse(await h.save()).document.layers[0].position;
const drag = async (dx=80,dy=40) => { const b=await page.locator('.canvas-host').boundingBox(); const x=b.x+b.width/2,y=b.y+b.height/2; await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up(); };
const record = (id, expected, observed, passed) => results.push({id,expected,observed,passed});
try {
  await mkdir('test-results/review',{recursive:true});
  await page.getByRole('button',{name:'Nový dokument (Ctrl+N)'}).click();await page.getByLabel('Šířka / px').fill('128');await page.getByLabel('Výška / px').fill('96');await page.getByRole('button',{name:'Vytvořit dokument',exact:true}).click();
  await page.getByRole('button',{name:'Generátory',exact:true}).click();await page.getByRole('button',{name:'Přidat generátor Checker',exact:true}).click();
  const before=await position();const output=await h.exported();
  await page.getByRole('button',{name:'Posun pohledu (H / mezerník)',exact:true}).click();await drag();const after=await position();
  record('PAN-BASE','Pan nemění vrstvu ani export',{before,after,exportEqual:output.equals(await h.exported())},JSON.stringify(before)===JSON.stringify(after)&&output.equals(await h.exported()));
  await page.getByRole('button',{name:'Přesun vrstvy (V)',exact:true}).click();
  const focus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));
  await page.keyboard.down('Space');await drag();await page.keyboard.up('Space');const spaceAfter=await position();
  record('PAN-FOCUS','Mezerník po kliknutí na Výběr posouvá pohled, ne vrstvu',{focus,before:after,after:spaceAfter},JSON.stringify(after)===JSON.stringify(spaceAfter));
  await page.screenshot({path:'test-results/review/pan-space-focus.png'});
  await page.getByRole('button',{name:'Posun pohledu (H / mezerník)',exact:true}).click();
  const cursorBefore=await page.locator('.canvas-host').evaluate(el=>getComputedStyle(el).cursor);
  await page.keyboard.press('Space');
  const cursorAfter=await page.locator('.canvas-host').evaluate(el=>({cursor:getComputedStyle(el).cursor,panClass:el.classList.contains('pan-cursor')}));
  record('PAN-CURSOR','Aktivní Pan zachová kurzor grab po uvolnění mezerníku',{cursorBefore,cursorAfter},cursorAfter.panClass&&cursorAfter.cursor==='grab');
  // Native pointer capture should keep ordinary panning functional outside the host.
  const b=await page.locator('.canvas-host').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x-50,b.y+30,{steps:8});await page.mouse.up();
  record('PAN-CAPTURE','Po ukončení dragu zmizí dragging',{dragging:await page.locator('.canvas-host').evaluate(el=>el.classList.contains('dragging'))},!await page.locator('.canvas-host').evaluate(el=>el.classList.contains('dragging')));
  await page.getByRole('button',{name:'Přesun vrstvy (V)',exact:true}).click();await page.getByRole('button',{name:'Vrstvy 1',exact:true}).click();await page.getByRole('button',{name:'Seskupit vybranou vrstvu',exact:true}).click();
  await page.getByRole('button',{name:'Skrýt Group',exact:true}).click();await page.getByRole('button',{name:'Checker Generátor',exact:true}).click();
  let model=JSON.parse(await h.save());const hiddenBefore=model.document.layers[0].children[0].position;await drag();model=JSON.parse(await h.save());const hiddenAfter=model.document.layers[0].children[0].position;
  record('HIDDEN-DRAG','Drag plátna neposouvá dítě skryté skupiny',{before:hiddenBefore,after:hiddenAfter},JSON.stringify(hiddenBefore)===JSON.stringify(hiddenAfter));
  // A global Undo while typing should not change a different layer property.
  await page.getByRole('textbox',{name:'Název vrstvy'}).fill('Draft name');await page.keyboard.press('Control+z');model=JSON.parse(await h.save());
  record('UNDO-TEXT','Ctrl+Z při rozpracovaném textu nepřesune vrstvu zpět',{name:model.document.layers[0].children[0].name,position:model.document.layers[0].children[0].position,priorPosition:hiddenAfter},JSON.stringify(model.document.layers[0].children[0].position)===JSON.stringify(hiddenAfter));
  await page.getByRole('textbox',{name:'Název vrstvy'}).fill('Must be saved');const download=page.waitForEvent('download');await page.keyboard.press('Control+s');const saved=JSON.parse(await readFile(await (await download).path(),'utf8'));
  record('SAVE-DRAFT','Ctrl+S uloží rozpracovaný název bez nutnosti Tab',{savedName:saved.document.layers[0].children[0].name,typedName:'Must be saved',dirty:await page.locator('.document-tab').innerText()},saved.document.layers[0].children[0].name==='Must be saved');
  assert.deepEqual(h.errors,[]);await writeFile('test-results/review/ui.json',JSON.stringify({results,browserErrors:h.errors},null,2));console.log(JSON.stringify(results,null,2)); if (results.some(result=>!result.passed)) throw new Error('Revizní kontrola selhala.');
}finally{await h.browser.close();}
