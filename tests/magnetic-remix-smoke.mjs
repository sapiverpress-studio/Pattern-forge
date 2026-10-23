import { chromium } from 'playwright';
import { deflateSync } from 'node:zlib';
import fs from 'node:fs/promises';

function assert(ok,message){if(!ok)throw Error(message);}
function near(a,b,tolerance=.001){return Math.abs(a-b)<=tolerance;}
function crc32(bytes){let c=0xffffffff;for(const v of bytes){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(tag,data){
  const t=Buffer.from(tag),header=Buffer.alloc(4),crc=Buffer.alloc(4);
  header.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));
  return Buffer.concat([header,t,data,crc]);
}
function png(n,index){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(n,0);ihdr.writeUInt32BE(n,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc(n*(1+n*4));
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const at=y*(1+n*4)+1+x*4;
    raw[at]=(index*29+20)%255;raw[at+1]=(index*47+60)%255;raw[at+2]=(index*77+90)%255;raw[at+3]=255;
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const svg=i=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="44" fill="hsl('+i*35+' 60% 55%)"/></svg>');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1380,height:960},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
async function saved(){
  const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProject').evaluate(el=>el.click())]);
  const p=await d.path();assert(p,'No JSON download');return JSON.parse(await fs.readFile(p,'utf8'));
}
try{
  await page.goto('http://127.0.0.1:4173/app/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Original 10 Motifs');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('#objectSnapOn').isChecked(),'Object magnets not enabled by default');
  assert(await page.locator('#spacingSnapOn').isChecked(),'Equal-spacing guides not enabled by default');
  const sourceFiles=Array.from({length:10},(_,i)=>({
    name:'original-'+String(i+1).padStart(2,'0')+'.svg',mimeType:'image/svg+xml',buffer:svg(i)
  }));
  await page.locator('#files').setInputFiles(sourceFiles);
  await page.waitForFunction(()=>window.PatternForgeImageLibrary?.list().length===10,{timeout:15000});
  const list=await page.evaluate(()=>window.PatternForgeImageLibrary.list());
  await page.evaluate(ids=>{for(const id of ids.slice(1))window.PatternForgeImageLibrary.place(id);window.PatternForgeImageLibrary.place(ids[0]);},list.map(a=>a.id));
  await page.waitForTimeout(200);
  await page.evaluate(()=>{
    const st=window.PatternForgeEtsyBridge.state;
    st.items.forEach((item,i)=>{item.x=110+(i%10)*68;item.y=200+Math.floor(i/10)*240;item.rotation=i*.05;});
    document.getElementById('gridOn').dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert(await page.evaluate(()=>window.PatternForgeSelection.selectAll()===undefined),'Selection API changed unexpectedly');
  assert(await page.evaluate(()=>window.PatternForgeSelection.align('centreY')),'Centre align failed');
  let project=await saved();
  assert(project.items.length===11,'Expected ten types and one duplicated placement');
  assert(project.items.every(i=>near(i.y,project.items[0].y)),'Centre Y alignment failed');
  assert(await page.evaluate(()=>window.PatternForgeSelection.align('distributeX')),'Distribute X failed');
  project=await saved();
  const xs=project.items.map(i=>i.x).sort((a,b)=>a-b);
  const gaps=xs.slice(1).map((v,i)=>v-xs[i]);
  assert(gaps.every(g=>near(g,gaps[0],.01)),'Even X centres are not equally spaced');

  const original=project;
  await page.locator('#motifSwapOpen').evaluate(el=>el.click());
  await page.locator('#motifSwapDialog').waitFor({state:'visible'});
  const files=Array.from({length:10},(_,i)=>({
    name:'replacement-'+String(i+1).padStart(2,'0')+'.png',mimeType:'image/png',buffer:png(32,i+1)
  }));
  await page.locator('#motifSwapMode').selectOption('upload');
  await page.locator('#motifSwapFiles').setInputFiles(files);
  await page.waitForFunction(()=>document.querySelectorAll('#motifSwapMapping .motifSwapRow').length===10);
  const selectors=page.locator('#motifSwapMapping .motifSwapRow select');
  let values=await selectors.evaluateAll(els=>els.map(el=>el.value));
  assert(new Set(values).size===10,'Default mapping did not select ten different motif types');
  await selectors.nth(1).selectOption(values[0]);
  await page.locator('#motifSwapApply').click();
  assert((await page.locator('#motifSwapError').textContent()).includes('same original'),'Duplicate mapping was not rejected');
  await selectors.nth(1).selectOption(values[1]);
  await page.locator('#motifSwapApply').click();
  await page.locator('#motifSwapDialog').waitFor({state:'hidden',timeout:30000});
  const copied=await saved();
  assert(copied.project.id!==original.project.id,'Copied project reused original ID');
  assert(copied.project.title.includes('Motif Remix'),'Copied project name missing');
  assert(copied.items.length===original.items.length,'Motif replacements changed number of placements');
  assert(new Set(copied.items.map(i=>String(i.assetId))).size===10,'Expected ten swapped motif types');
  const assetMap=new Map(copied.assets.map(a=>[String(a.id),a]));
  assert(copied.items.every(i=>assetMap.get(String(i.assetId))?.name.startsWith('replacement-')),'Some original motifs survived replacement');
  copied.items.forEach((item,i)=>{
    const before=original.items[i];
    for(const key of ['id','x','y','rotation','opacity','layerId']){
      assert(item[key]===before[key],key+' changed during replacement at placement '+i);
    }
    assert(near(item.scale,before.scale*100/32,.0001),'Source-size fit not preserved at '+i);
  });
  const sourceStored=await page.evaluate(async id=>{
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('pattern-forge-local',2);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const row=await new Promise((resolve,reject)=>{
      const req=db.transaction('projects','readonly').objectStore('projects').get(id);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    db.close();return row?JSON.parse(row):null;
  },original.project.id);
  assert(sourceStored?.project.id===original.project.id,'Original project not separately saved');
  assert(sourceStored.items.every(i=>original.items.some(old=>old.id===i.id&&old.assetId===i.assetId)),'Original motif mapping was changed');

  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continuePrevious').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  const reopened=await saved();
  assert(reopened.project.id===copied.project.id,'Copied design did not reopen from autosave');
  assert(reopened.items.length===11,'Copied design lost motif placements on reload');
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('PASS: selected alignment, distribute, 10-motif type swap, invalid-map rejection, original safety, fresh project ID, autosave/reopen.');
}finally{await browser.close();}
