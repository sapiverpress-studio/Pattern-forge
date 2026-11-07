import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const page=await browser.newPage({viewport:{width:385,height:840},hasTouch:true,isMobile:true,acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4185/knit-studio/',{waitUntil:'load',timeout:45000});
const ready=()=>page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'),null,{timeout:60000});
await ready();
const before=await page.locator('#preview').evaluate(c=>c.toDataURL());
assert.equal(await page.locator('#layeredYarn').isChecked(),false,'Original rendering must remain the default.');
assert.equal(await page.locator('#directWoolTools').isHidden(),true);
await page.locator('#style').selectOption('stockinette');
await page.locator('#colour').fill('#8baa91');
await page.locator('#contrast').fill('#e9d7a4');
await page.locator('#third').fill('#a15d9a');
await page.locator('#randomStyle').selectOption('diamonds');
await page.locator('#randomiseMotif').click();
await ready();
const legacy=await page.locator('#preview').evaluate(c=>c.toDataURL());
await page.locator('#layeredYarn').check();
await page.waitForFunction(old=>document.querySelector('#preview')?.toDataURL()!==old,legacy,{timeout:60000});
await ready();
assert.equal(await page.locator('#directWoolTools').isVisible(),true);
const layered=await page.locator('#preview').evaluate(c=>c.toDataURL());
assert.notEqual(legacy,layered,'Three-layer compositor must change the rendered fabric');
const metrics=await page.locator('#preview').evaluate(el=>{
 const pixels=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
 let main=0,second=0,third=0;
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(g>r*1.05&&g>b*.95)main++;
  if(r>g*1.05&&g>b*1.1)second++;
  if(r>b*.92&&b>g*1.18)third++;
 }
 return {main,second,third};
});
assert.ok(metrics.main>20000,'Layered mode lost main wool: '+JSON.stringify(metrics));
assert.ok(metrics.third>500,'Third yarn not visible: '+JSON.stringify(metrics));
// Direct painting must affect ACTUAL edit chart, not a separate cosmetic preview.
await page.locator('#clearMotif').click();
await ready();
const blank=await page.locator('#motifCanvas').evaluate(c=>c.toDataURL());
await page.locator('[data-preview-ink="1"]').click();
await page.locator('#preview').scrollIntoViewIfNeeded();
const preview=page.locator('#preview');
await preview.click({position:{x:210,y:210}});
await page.waitForFunction(old=>document.querySelector('#motifCanvas')?.toDataURL()!==old,blank,{timeout:30000});
assert.match(await page.locator('#directWoolNotice').innerText(),/Coloured stitch/);
const painted=await page.locator('#motifCanvas').evaluate(c=>c.toDataURL());
await page.locator('#undoMotif').click();
assert.equal(await page.locator('#motifCanvas').evaluate(c=>c.toDataURL()),blank,'Undo must remove direct wool painting');
await page.locator('#redoMotif').click();
assert.equal(await page.locator('#motifCanvas').evaluate(c=>c.toDataURL()),painted,'Redo must restore direct wool painting');
await page.locator('[data-preview-ink="2"]').click();
await preview.click({position:{x:265,y:160}});
assert.equal(await page.locator('[data-preview-ink="2"]').getAttribute('aria-pressed'),'true');
await page.locator('#randomiseMotif').click();
await ready();
await page.screenshot({path:'wool-three-layer-mobile.png',fullPage:true});
await page.locator('#tileView').click();
await page.screenshot({path:'wool-three-layer-tile.png',fullPage:true});
const active=await page.locator('#preview').evaluate(c=>c.toDataURL());
await page.locator('#subtleColours').check();
await page.waitForFunction(old=>document.querySelector('#preview')?.toDataURL()!==old,active,{timeout:30000});
await page.locator('#subtleColours').uncheck();
await page.waitForFunction(orig=>document.querySelector('#preview')?.toDataURL()===orig,active,{timeout:30000});
await page.locator('#layeredYarn').uncheck();
await page.waitForFunction(old=>document.querySelector('#preview')?.toDataURL()!==old,active,{timeout:30000});
assert.equal(await page.locator('#directWoolTools').isHidden(),true);
await page.locator('#layeredYarn').check();
await page.waitForFunction(orig=>document.querySelector('#preview')?.toDataURL()===orig,active,{timeout:60000});
await ready();
// Verify image-derived ownership data is not a square grid.
const own=await page.evaluate(async()=>{
 const {buildStitchOwnership}=await import('/knit-studio/stitch-ownership.mjs');
 const img=new Image();
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='/knit/materials/stockinette.png';});
 const m=buildStitchOwnership(img,'stockinette');
 const sampleCol=(y)=>{
  const out=[];
  for(let x=0;x<m.width;x++){
   const id=m.data[(y*m.width+x)*4];
   if(x>0&&id!==m.data[(y*m.width+x-1)*4])out.push(x);
  }
  return out;
 };
 return {size:m.width,cols:m.cols,rows:m.rows,low:sampleCol(10),mid:sampleCol(105),high:sampleCol(190)};
});
assert.equal(own.size,512);assert.equal(own.cols,16);
assert.notDeepEqual(own.low,own.mid,'Stitch boundaries must follow real yarn grooves rather than rectangular columns');
// Saved JSON preserves opt-in and all coloured cells.
const downloadJson=page.waitForEvent('download');
await page.locator('#saveSettings').click();
const saved=JSON.parse(await fs.readFile(await (await downloadJson).path(),'utf8'));
assert.equal(saved.layeredYarn,true);
assert.ok(saved.chartCells.some(v=>v===1));
assert.ok(saved.chartCells.some(v=>v===2));
await page.locator('#layeredYarn').uncheck();
await page.locator('#loadSettings').setInputFiles({name:'wool.wool.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
await page.waitForFunction(()=>document.querySelector('#layeredYarn')?.checked,{timeout:15000});
assert.equal(await page.locator('#layeredYarn').isChecked(),true);
await page.locator('#repeatView').click();
await page.screenshot({path:'wool-three-layer-repeat.png',fullPage:true});
await page.locator('#tileView').click();
const big=page.waitForEvent('download',{timeout:180000});
await page.locator('#downloadPng').click();
const download=await big;
assert.match(download.suggestedFilename(),/5000px-300dpi\.png$/);
await fs.copyFile(await download.path(),'wool-three-layer-5000.png');
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Downloaded one 5000'),null,{timeout:60000});
// Cable, Rib and Seed retain the verified original renderer, not visually
// rejected colour blotches. Fair Isle can use the stockinette stitch map.
for(const material of ['rib','seed','cable']){
 await page.locator('#style').selectOption(material);
 await ready();
 assert.equal(await page.locator('#layeredYarn').isDisabled(),true,material+' must keep the old renderer');
 assert.equal(await page.locator('#layeredYarn').isChecked(),false);
 const pixels=await page.locator('#preview').evaluate(c=>{
  const {data}=c.getContext('2d').getImageData(0,0,c.width,c.height);
  let sum=0,sum2=0,n=0;
  for(let i=0;i<data.length;i+=40){sum+=data[i];sum2+=data[i]*data[i];n++;}
  return Math.sqrt(Math.max(0,sum2/n-(sum/n)**2));
 });
 assert.ok(pixels>8,material+' original texture is blank');
 await page.locator('#preview').screenshot({path:'wool-layered-'+material+'.png'});
}
await page.locator('#style').selectOption('fairisle');
assert.equal(await page.locator('#layeredYarn').isDisabled(),false);
await page.locator('#layeredYarn').check();
await ready();
await page.locator('#preview').screenshot({path:'wool-layered-fairisle.png'});
assert.equal(errors.length,0,errors.join(' | '));
await browser.close();
console.log('PASS: original default preserved, three real dyed layers, photographic stitch ownership, direct wool painting, undo/redo, saved JSON, 5000px PNG. '+JSON.stringify({metrics,own}));
