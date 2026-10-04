import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { effectHarness } from './effect-harness.mjs';
const h = await effectHarness(), { page } = h;
page.on('dialog', dialog => dialog.accept());
const effects = [['displacement-map', 'Displacement Map'], ['halftone', 'Halftone'], ['dither', 'Dither'], ['morphology', 'Morphology'], ['palette-remap', 'Palette Remap']];
const rgba = (image,x,y) => image.pixels.slice((y*image.width+x)*4,(y*image.width+x)*4+4);
const gallery=[];
try {
  await mkdir('test-results',{recursive:true});
  await page.getByRole('button',{name:'Nový dokument (Ctrl+N)'}).click(); await page.getByLabel('Šířka / px').fill('128'); await page.getByLabel('Výška / px').fill('96'); await page.getByRole('button',{name:'Vytvořit dokument',exact:true}).click();
  const fixture = async (kind) => page.evaluate(kind => {
    const c=document.createElement('canvas');c.width=128;c.height=96; const ctx=c.getContext('2d'),data=ctx.createImageData(128,96);
    for(let y=0;y<96;y++)for(let x=0;x<128;x++){
      let p;
      if(kind==='map') p=[255,0,128,255];
      else if(kind==='transparent-map') p=[255,0,128,0];
      else if(kind==='gray') p=[128,128,128,255];
      else if(kind==='ramp') p=[x*2,20,40,255];
      else if(kind==='dot') p=x===64&&y===48?[255,255,255,255]:[0,0,0,0];
      else if(kind==='black') p=[0,0,0,255];
      else if(kind==='white') p=[255,255,255,255];
      else p=[Math.round(x/127*255),Math.round(y/95*255),((x>>3)+(y>>3))%2?220:30,x<4?0:y>88?128:255];
      data.data.set(p,(y*128+x)*4);
    }ctx.putImageData(data,0,0);return c.toDataURL();
  },kind);
  await page.locator('input[accept^="image/"]').setInputFiles([{name:'map.png',mimeType:'image/png',buffer:Buffer.from((await fixture('map')).split(',')[1],'base64')},{name:'primary.png',mimeType:'image/png',buffer:Buffer.from((await fixture('art')).split(',')[1],'base64')}]);
  await page.getByRole('button',{name:'Vrstvy 2',exact:true}).waitFor();await page.getByRole('button',{name:'Skrýt map',exact:true}).click();
  const original=await h.exported(), originalPixels=await h.decoded(original), baseline=JSON.parse(await h.save());
  const loadFixture = async (kind,map='map') => {const model=structuredClone(baseline);model.assets.find(asset=>asset.id===model.document.layers[0].assetId).dataUrl=await fixture(kind);model.assets.find(asset=>asset.id===model.document.layers[1].assetId).dataUrl=await fixture(map);await h.load(Buffer.from(JSON.stringify(model)));await page.getByRole('button',{name:'Efekty',exact:true}).click();};
  await page.getByRole('button',{name:'Efekty',exact:true}).click();
  for(const [id,name] of effects){
    await h.add(id);const output=await h.exported();assert(!output.equals(original),`${name} changes pixels`);assert(output.equals(await h.exported()),`${name} determinism`);gallery.push({name,base64:output.toString('base64')});
    await page.getByRole('button',{name:`Vypnout efekt ${name}`,exact:true}).click();assert(original.equals(await h.exported()),`${name} bypass`);await page.getByRole('button',{name:`Zapnout efekt ${name}`,exact:true}).click();
    if(id==='displacement-map'){await h.set('Horizontal / px hodnota',0);await h.set('Vertical / px hodnota',0);assert(original.equals(await h.exported()),'zero displacement identity');}
    else { const pixels=await h.decoded(output); if(id!=='morphology')assert(pixels.pixels.every((v,i)=>i%4!==3||v===originalPixels.pixels[i]),`${name} preserves alpha`);await h.set('Amount hodnota',0);assert(original.equals(await h.exported()),`${name} amount zero identity`);}
    await page.getByRole('button',{name:`Odstranit efekt ${name}`,exact:true}).click(); console.log(`Creative GPU verified: ${name}`);
  }
  await loadFixture('ramp'); await h.add('displacement-map');await h.set('Horizontal / px hodnota',4);await h.set('Vertical / px hodnota',0);let pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,20,30),[48,20,40,255]);assert.equal(rgba(pixels,127,30)[3],0);
  await page.getByRole('combobox',{name:'Edge handling',exact:true}).selectOption('wrap');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,127,30),[6,20,40,255]);
  await page.getByRole('combobox',{name:'Edge handling',exact:true}).selectOption('clamp');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,127,30),[254,20,40,255]);
  await loadFixture('ramp','transparent-map');const neutral=await h.exported();await h.add('displacement-map');assert(neutral.equals(await h.exported()),'transparent map is neutral');
  await loadFixture('gray');await h.add('halftone');await h.set('Screen angle hodnota',0);pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,4,4),[0,0,0,255]);assert.deepEqual(rgba(pixels,0,0),[255,255,255,255]);
  for(const [kind,value] of [['black',0],['white',255]]){await loadFixture(kind);await h.add('halftone');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,40,40),[value,value,value,255]);}
  await loadFixture('gray');await h.add('dither');pixels=await h.decoded(await h.exported());let white=0;for(let y=16;y<20;y++)for(let x=16;x<20;x++){const p=rgba(pixels,x,y);assert([0,255].includes(p[0]));assert.equal(p[0],p[1]);if(p[0]===255)white++;}assert.equal(white,8,'Bayer balances 50% gray');
  await page.getByRole('combobox',{name:'Dither pattern',exact:true}).selectOption('noise');const seed=await h.exported();await h.set('Seed',999);assert(!seed.equals(await h.exported()));await page.keyboard.press('Control+z');assert(seed.equals(await h.exported()));
  await loadFixture('dot');await h.add('morphology');await page.getByRole('combobox',{name:'Morphology channel',exact:true}).selectOption('alpha');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,63,47),[255,255,255,255]);assert.equal(rgba(pixels,62,48)[3],0);
  await h.set('Radius / px hodnota',8);pixels=await h.decoded(await h.exported());assert.equal(rgba(pixels,56,40)[3],255);assert.equal(rgba(pixels,55,40)[3],0);await h.set('Radius / px hodnota',1);
  await page.getByRole('combobox',{name:'Neighborhood shape',exact:true}).selectOption('cross');pixels=await h.decoded(await h.exported());assert.equal(rgba(pixels,63,47)[3],0);assert.equal(rgba(pixels,63,48)[3],255);
  await page.getByRole('combobox',{name:'Morphology operation',exact:true}).selectOption('erode');pixels=await h.decoded(await h.exported());assert.equal(rgba(pixels,64,48)[3],0);await h.set('Radius / px hodnota',0);pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,64,48),[255,255,255,255]);
  for(const [kind,expected] of [['black',[20,33,61,255]],['white',[255,232,163,255]]]){await loadFixture(kind);await h.add('palette-remap');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,40,40),expected);}
  await page.getByLabel('Highlight color',{exact:true}).fill('#00ff00');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,40,40),[0,255,0,255]);await page.keyboard.press('Control+z');pixels=await h.decoded(await h.exported());assert.deepEqual(rgba(pixels,40,40),[255,232,163,255]);
  await h.load(Buffer.from(JSON.stringify(baseline)));await page.getByRole('button',{name:'Efekty',exact:true}).click();for(const [id] of effects)await h.add(id);await page.getByLabel("Shadow color",{exact:true}).fill("#220044");const combined=await h.exported(),saved=await h.save();assert.equal(JSON.parse(saved).document.layers[0].effects[4].parameters.shadows,"#220044");await h.load(saved);assert(combined.equals(await h.exported()),'five-effect stack roundtrip');assert.equal(JSON.parse(await h.save()).document.layers[0].effects.length,5);
  await page.getByRole('button',{name:'Skutečná velikost dokumentu (1)'}).click();assert(combined.equals(await h.exported()));for(const [format,mime]of [['jpeg','image/jpeg'],['webp','image/webp']]){pixels=await h.decoded(await h.exported(format),mime);assert.equal(pixels.width,128);assert.equal(pixels.height,96);}
  await page.screenshot({path:'test-results/creative-stack.png'});assert.deepEqual(h.errors,[]);
  const sheet=await page.evaluate(async items=>{const c=document.createElement('canvas');c.width=900;c.height=520;const ctx=c.getContext('2d');ctx.fillStyle='#171b20';ctx.fillRect(0,0,900,520);for(let i=0;i<items.length;i++){const image=new Image();image.src=`data:image/png;base64,${items[i].base64}`;await image.decode();const x=i%3*300,y=Math.floor(i/3)*260;ctx.drawImage(image,x+6,y+6,288,216);ctx.fillStyle='#eceff3';ctx.font='16px sans-serif';ctx.fillText(items[i].name,x+8,y+248);}return c.toDataURL().split(',')[1];},gallery);await writeFile('test-results/creative-sheet.png',Buffer.from(sheet,'base64'));
  console.log('Creative passed: five GPU effects, exact displacement/wrap/clamp, Bayer coverage, seed undo, morphology alpha/shape, palette colors, identities, alpha, project roundtrip and exports.');
}catch(error){console.error('Browser errors:',h.errors);await page.screenshot({path:'test-results/creative-failure.png'});throw error;}finally{await h.browser.close();}
