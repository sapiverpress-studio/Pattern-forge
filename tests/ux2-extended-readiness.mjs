import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const BASE=process.env.UX2_AUDIT_BASE_URL||'http://127.0.0.1:4173';
const OUT=process.env.UX2_AUDIT_OUTPUT||'ux2-extended-results';
const FILTER=process.env.UX2_AUDIT_FILTER||'';
await fs.mkdir(OUT,{recursive:true});
const results=[];
const browser=await chromium.launch({headless:true});
let sample;
async function check(name,fn){
  if(FILTER&&!name.includes(FILTER))return;
  console.log('RUN',name);
  const start=performance.now();
  try{const detail=await fn();results.push({name,status:'PASS',ms:Math.round(performance.now()-start),detail});console.log('PASS',name,JSON.stringify(detail??''));}
  catch(e){results.push({name,status:'FAIL',ms:Math.round(performance.now()-start),error:e.stack});console.log('FAIL',name,e.message);}
  await fs.writeFile(`${OUT}/results.json`,JSON.stringify(results,null,2));
}
async function fresh(legacy=true,options={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,...options});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  await page.goto(BASE+'/app/'+(legacy?'?legacy=1':''),{waitUntil:'networkidle'});
  return {context,page};
}
async function create(page,type='pattern',repeat='straight'){
  await page.locator('#projectTypeInput').selectOption(type);
  await page.locator('#projectTitleInput').fill('Readiness '+type+' '+repeat);
  await page.locator('#projectRepeatStyle').selectOption(repeat);
  await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
}
async function exported(page,id='saveProject'){
  const [d]=await Promise.all([page.waitForEvent('download',{timeout:60000}),page.locator('#'+id).click()]).catch(async e=>{throw Error(`${id}: ${e.message}; status: ${await page.locator('#status').textContent()}`)});
  const buffer=await fs.readFile(await d.path());
  // Chromium throttles bursts of ten downloads; pace this synthetic export loop.
  await page.waitForTimeout(150);
  return {buffer,name:d.suggestedFilename()};
}
async function saved(page){return JSON.parse((await exported(page)).buffer);}
function stable(data){const d=structuredClone(data);if(d.project){delete d.project.id;delete d.project.createdAt;delete d.project.updatedAt;}return d;}
async function importFile(page,buffer,name='fixture.json'){
  await page.locator('#projectFile').setInputFiles({name,mimeType:name.endsWith('.zip')?'application/zip':'application/json',buffer:Buffer.isBuffer(buffer)?buffer:Buffer.from(JSON.stringify(buffer))});
  await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
}
async function draw(page){
  await page.locator('[data-tool="brush"]').first().evaluate(el=>el.click());
  const b=await page.locator('#editorCanvas').boundingBox();
  await page.mouse.move(b.x+b.width*.45,b.y+b.height*.43);await page.mouse.down();
  await page.mouse.move(b.x+b.width*.56,b.y+b.height*.57,{steps:16});await page.mouse.up();
}
async function autosave(page){
  return page.evaluate(async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('pattern-forge-local',2);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return new Promise((res,rej)=>{const s=db.transaction('projects').objectStore('projects'),r=s.get('current');r.onsuccess=()=>{const q=s.get(r.result);q.onsuccess=()=>res(JSON.parse(q.result));q.onerror=()=>rej(q.error)};r.onerror=()=>rej(r.error)});});
}
async function fixture(page,type='pattern',repeat='straight'){
  await create(page,type,repeat);
  await page.locator('#layerAdd').evaluate(el=>el.click());
  await page.locator('#layerName').fill('Ink details');await page.locator('#layerName').press('Tab');
  await page.locator('#symmetry').selectOption('vertical');await page.locator('#gridCount').selectOption('20');
  await draw(page);
  const red=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=96;c.height=72;const x=c.getContext('2d');x.fillStyle='#ce5544';x.fillRect(5,5,75,55);return c.toDataURL().split(',')[1]});
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="100"><circle cx="75" cy="50" r="40" fill="#33aa66"/></svg>');
  await page.locator('#files').setInputFiles([{name:'red.png',mimeType:'image/png',buffer:Buffer.from(red,'base64')},{name:'duplicate.png',mimeType:'image/png',buffer:Buffer.from(red,'base64')},{name:'green.svg',mimeType:'image/svg+xml',buffer:svg},{name:'waiting.svg',mimeType:'image/svg+xml',buffer:svg}]);
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===4);
  for(const name of ['duplicate.png','green.svg'])await page.getByRole('button',{name:'Add '+name,exact:true}).click();
  // Import a transformed copy of the real editor's data, retaining the unused asset.
  await page.waitForTimeout(1200);const full=await autosave(page);
  full.items[0].rotation=.37;full.items[0].scale*=.75;full.items[0].opacity=.65;
  await importFile(page,full);await page.waitForTimeout(100);
  return full;
}

try{
  // Build a real editor fixture even when a category is run on its own.
  {const {context,page}=await fresh();sample=await fixture(page);await context.close();}
  for(const [type,repeat] of [['pattern','straight'],['pattern','half-drop'],['pattern','brick'],['doodle','straight']]){
    await check(`roundtrip ${type} ${repeat}`,async()=>{
      const {context,page}=await fresh();try{
        const full=structuredClone(sample);full.project.projectType=type;full.project.repeatStyle=repeat;full.transparent=type==='doodle';
        await importFile(page,full);await page.waitForTimeout(1200);
        assert.equal((await autosave(page)).assets.length,4,'autosave must retain unused library assets');
        const original=await saved(page);assert.equal(original.assets.length,2,'portable file compacts duplicate and unused assets');
        assert.equal(original.items.length,3);assert.equal(original.layers.length,3);assert(original.marks.length>0);
        const png=await exported(page,'exportPng'),svg=await exported(page,'exportSvg'),zip=await exported(page,'exportZip');
        const dimensions=[png.buffer.readUInt32BE(16),png.buffer.readUInt32BE(20)];
        assert.deepEqual(dimensions,repeat==='straight'?[4000,4000]:repeat==='half-drop'?[4000,8000]:[8000,4000]);
        for(const input of [{buffer:Buffer.from(JSON.stringify(original)),name:'roundtrip.json'},zip]){
          const oldId=(await saved(page)).project.id;await importFile(page,input.buffer,input.name);
          const opened=await saved(page);assert.notEqual(opened.project.id,oldId,'import should open a separate copy');
          assert.deepEqual(stable(opened),stable(original),'editable content changed after import');
          assert.deepEqual((await exported(page,'exportPng')).buffer,png.buffer,'PNG pixels/metadata changed after reopening');
          assert.equal((await exported(page,'exportSvg')).buffer.toString(),svg.buffer.toString(),'SVG changed after reopening');
        }
        return {dimensions,pngBytes:png.buffer.length,zipBytes:zip.buffer.length,assetsAutosave:4,assetsPortable:2};
      }finally{await context.close();}
    });
  }
  await check('legacy v4 project without advanced fields still opens and exports',async()=>{
    const {context,page}=await fresh();try{
      const legacy=structuredClone(sample);
      legacy.format='pattern-forge-v4';
      delete legacy.variations;
      for(const key of ['pressureWidth','pressureMin','pressureSensitivity','strokeStabilisation','bucketTolerance','bucketSampleVisible','scatterSpacing','scatterOverlap','scatterPreserveManual','productScaleCm'])delete legacy.settings?.[key];
      for(const layer of legacy.layers||[]){delete layer.clipToBelow;delete layer.alphaLock;}
      for(const item of legacy.items||[]){delete item.groupId;delete item.flipX;delete item.flipY;delete item.scatterGenerated;}
      for(const mark of legacy.marks||[]){
        delete mark.groupId;delete mark.transformFlipX;delete mark.transformFlipY;delete mark.pressureWidth;delete mark.alphaLocked;
        for(const point of mark.points||[])delete point.p;
      }
      await importFile(page,legacy,'historical-v4.json');await page.waitForTimeout(150);
      const opened=await saved(page);
      assert.equal(opened.format,'pattern-forge-v4','legacy v4 format changed on open');
      assert.equal(opened.items.length,legacy.items.length,'legacy items did not survive open');
      assert.equal(opened.marks.length,legacy.marks.length,'legacy marks did not survive open');
      assert.equal(opened.layers.length,legacy.layers.length,'legacy layers did not survive open');
      const png=await exported(page,'exportPng'),svg=await exported(page,'exportSvg');
      assert(png.buffer.length>1000,'legacy v4 PNG export was empty');
      assert(svg.buffer.toString().includes('<svg'),'legacy v4 SVG export was invalid');
      return {items:opened.items.length,marks:opened.marks.length,layers:opened.layers.length,pngBytes:png.buffer.length,svgBytes:svg.buffer.length};
    }finally{await context.close();}
  });

  const corruptions={
    'invalid JSON':()=>Buffer.from('{broken'),
    'wrong format':d=>({...d,format:'unrelated'}),
    'invalid layer':d=>({...d,activeLayerId:'missing'}),
    'missing image reference':d=>({...d,items:[{...d.items[0],assetId:'missing'}]}),
    'null stroke point':d=>({...d,marks:[{...d.marks[0],points:[null]}]}),
    'invalid stroke coordinate':d=>({...d,marks:[{...d.marks[0],points:[{x:'bad',y:20}]}]}),
    'duplicate image ID':d=>({...d,assets:[...d.assets,{...d.assets[0]}]}),
    'broken image':d=>({...d,assets:d.assets.map((a,i)=>i===0?{...a,src:'data:image/png;base64,broken'}:a)}),
    'too many layers':d=>({...d,layers:Array.from({length:101},(_,i)=>({...d.layers[0],id:'layer-'+i}))})
  };
  for(const [label,damage] of Object.entries(corruptions))await check('recovery rejects '+label,async()=>{
    const {context,page}=await fresh();try{
      await importFile(page,sample);const before=await saved(page);
      await page.evaluate(()=>{window.__pfRejectedProject=false;const status=document.querySelector('#status');const inspect=()=>{if(status?.textContent?.includes('unchanged'))window.__pfRejectedProject=true;};inspect();new MutationObserver(inspect).observe(status,{childList:true,characterData:true,subtree:true});});
      await importFile(page,damage(structuredClone(before)));
      assert(await page.evaluate(()=>window.__pfRejectedProject),'damaged file did not report rejection');
      assert.deepEqual(stable(await saved(page)),stable(before),'failed import modified artwork');
    }finally{await context.close();}
  });
  await check('recovery truncated ZIP and cancelled reset',async()=>{
    const {context,page}=await fresh();try{await importFile(page,sample);const before=await saved(page),zip=await exported(page,'exportZip');await importFile(page,zip.buffer.subarray(0,50),'broken.zip');
      assert((await page.locator('#status').textContent()).includes('unchanged'));assert.deepEqual(stable(await saved(page)),stable(before));
      page.once('dialog',d=>d.dismiss());await page.locator('#startAgain').evaluate(el=>el.click());assert.deepEqual(stable(await saved(page)),stable(before));
      await page.locator('#projectFile').setInputFiles([]);assert.deepEqual(stable(await saved(page)),stable(before));
    }finally{await context.close();}
  });
  await check('recovery reload retains unplaced images',async()=>{
    const {context,page}=await fresh();try{await importFile(page,sample);await page.waitForTimeout(1200);const before=await autosave(page);await page.reload({waitUntil:'networkidle'});await page.locator('#continuePrevious').click();
      await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===4);await page.waitForTimeout(100);assert.deepEqual(stable(await autosave(page)),stable(before));
    }finally{await context.close();}
  });
  await check('recovery cancelled ZIP share preserves artwork',async()=>{
    const {context,page}=await fresh();try{await importFile(page,sample);const before=await saved(page);let downloads=0;page.on('download',()=>downloads++);
      await page.evaluate(()=>{window.shareCancellationObserved=false;new MutationObserver(()=>{if(document.querySelector('#status').textContent.includes('Sharing cancelled'))window.shareCancellationObserved=true;}).observe(document.querySelector('#status'),{childList:true,characterData:true,subtree:true});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('User cancelled','AbortError')}});});
      await page.locator('#exportZip').click();await page.waitForFunction(()=>window.shareCancellationObserved,{},{timeout:60000});
      assert.equal(downloads,0,'cancelled share unexpectedly downloaded a file');assert.deepEqual(stable(await saved(page)),stable(before));
    }finally{await context.close();}
  });
  await check('recovery aborted autosave falls back and reopens latest work',async()=>{
    const {context,page}=await fresh();try{await importFile(page,sample);await page.waitForTimeout(1200);
      await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){const tx=original.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});
      await page.locator('#gridCount').selectOption('40');await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      await page.waitForTimeout(1600);
      const fallback=await page.evaluate(()=>localStorage.getItem('patternForgeAutosave'));
      assert(fallback,'aborted transaction never triggered fallback');assert.equal(JSON.parse(fallback).settings.gridCount,'40');
      await page.reload({waitUntil:'networkidle'});await page.locator('#continuePrevious').click();await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});assert.equal(await page.locator('#gridCount').inputValue(),'40','reload selected stale IndexedDB data instead of latest fallback');
    }finally{await context.close();}
  });
  await check('recovery unavailable storage warns and allows manual export',async()=>{
    const {context,page}=await fresh();try{await importFile(page,sample);await page.waitForTimeout(1200);
      await page.evaluate(()=>{IDBDatabase.prototype.transaction=function(){throw new DOMException('test quota','QuotaExceededError')};Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError')};});
      await page.locator('#gridCount').selectOption('40');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Automatic device save is unavailable'));
      const json=await saved(page);assert.equal(json.settings.gridCount,'40');assert.equal(json.items.length,3);
    }finally{await context.close();}
  });
  await check('favourites reload, workspace switch and empty selection',async()=>{
    const context=await browser.newContext({viewport:{width:844,height:390}});const page=await context.newPage();page.setDefaultTimeout(10000);try{
      await page.goto(BASE+'/app/?workspace=doodle',{waitUntil:'networkidle'});
      await page.locator('#ux2ToolMenuTrigger').click();await page.getByRole('checkbox',{name:'Show Shape in quick tools',exact:true}).check();await page.getByRole('checkbox',{name:'Show Erase in quick tools',exact:true}).uncheck();
      const expected=['brush','pan','rect'];assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('patternForgeUx2FavouriteTools')))).sort(),expected.sort());
      await page.reload({waitUntil:'networkidle'});assert(await page.locator('.ux2-tools [data-ux2-tool="rect"]').isVisible());assert(await page.locator('.ux2-tools [data-ux2-tool="eraser"]').isHidden());
      await page.goto(BASE+'/app/?workspace=pattern',{waitUntil:'networkidle'});await page.locator('#createProject').click();
      assert(await page.locator('#ux2ToolMenuTrigger').isVisible(),'Pattern Tools chooser missing after workspace switch');
      assert(await page.locator('.ux2-tools [data-ux2-tool="rect"]').isVisible(),'Pattern quick rail did not retain Shape favourite');
      assert(await page.locator('.ux2-tools [data-ux2-tool="eraser"]').isHidden(),'Pattern quick rail did not retain Erase removal');
      await page.locator('#ux2ToolMenuTrigger').click();
      assert(await page.getByRole('checkbox',{name:'Show Shape in quick tools',exact:true}).isChecked());assert(!(await page.getByRole('checkbox',{name:'Show Erase in quick tools',exact:true}).isChecked()));
      await page.goto(BASE+'/app/?workspace=doodle',{waitUntil:'networkidle'});await page.locator('#ux2ToolMenuTrigger').click();
      for(const name of ['Brush','Pan','Shape'])await page.getByRole('checkbox',{name:`Show ${name} in quick tools`,exact:true}).uncheck();
      await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.ux2-tool-item:visible').count(),0);assert(await page.locator('#ux2ToolMenuTrigger').isVisible());
      await page.locator('#ux2ToolMenuTrigger').click();await page.getByRole('button',{name:'Brush',exact:true}).click();assert(await page.locator('.layout [data-tool="brush"]').first().evaluate(el=>el.classList.contains('active')));
    }finally{await context.close();}
  });
  for(const type of ['pattern','doodle'])for(const [width,height] of [[568,320],[640,360],[844,390],[1024,768],[360,800]])await check(`layout ${type} ${width}x${height}`,async()=>{
    const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();page.setDefaultTimeout(10000);try{
      await page.goto(BASE+`/app/?workspace=${type}`,{waitUntil:'networkidle'});
      if(type==='doodle'&&width<height){assert(await page.getByRole('heading',{name:'Rotate to landscape'}).isVisible());await page.setViewportSize({width:height,height:width});}
      if(type==='pattern')await page.locator('#createProject').click();
      const problems=[];
      async function accessible(selector,label,minimumTap=0){
        const el=page.locator(selector);await el.scrollIntoViewIfNeeded();const data=await el.evaluate(e=>{const b=e.getBoundingClientRect(),t=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,view:[innerWidth,innerHeight],hit:!!t&&(t===e||e.contains(t))};});
        if(data.x<0||data.y<0||data.right>data.view[0]+1||data.bottom>data.view[1]+1||!data.hit||(minimumTap&&Math.min(data.w,data.h)<minimumTap))problems.push({label,minimumTap,...data});
      }
      for(const full of [false,true]){
        if(full)await page.locator('#ux2Fullscreen').click();
        for(const selector of ['#ux2Fullscreen','#ux2Export','[data-ux2-panel="colour"]','[data-ux2-panel="layers"]','[data-ux2-panel="pattern"]'])await accessible(selector,`${full?'full':'normal'} ${selector}`,32);
        if(type==='doodle'){
          await page.locator('#ux2ToolMenuTrigger').click();
          for(const checkbox of await page.locator('#ux2ToolMenu input').all())await checkbox.check();
          await page.locator('#ux2ToolMenuTrigger').click();
        }
        for(const el of await page.locator('.ux2-tools .ux2-tool:visible').all()){const id=await el.getAttribute('aria-label');await accessible(`[aria-label="${id}"].ux2-tool`,`${full?'full':'normal'} tool ${id}`,32);}
        if(type==='doodle'){
          for(let i=1;i<=4;i++)await accessible(`#ux2QuickPalette button:nth-child(${i})`,`${full?'full':'normal'} quick colour ${i}`,32);
          const rail=await page.locator('.ux2-tools').evaluate(el=>({overflow:getComputedStyle(el).overflowY,height:el.clientHeight,content:el.scrollHeight}));
          if(rail.content>rail.height+1&&!['auto','scroll'].includes(rail.overflow))problems.push({label:'quick tools cannot be scrolled by the user',...rail});
        }
        await page.locator('[data-ux2-tool="brush"]').click();
        await accessible('#ux2BrushLibrary',`${full?'full':'normal'} brush library`,32);
        await page.locator('[data-ux2-panel="pattern"]').click();await accessible('#ux2Symmetry',`${full?'full':'normal'} mirror`,32);await page.locator('#ux2PaletteClose').click();
        if(full&&type==='doodle'){
          const stage=await page.locator('#stageWrap').boundingBox();
          for(const selector of ['.ux2-tools','.ux2-context','.ux2-zoom-controls']){
            const b=await page.locator(selector).boundingBox();
            if(b&&stage&&b.x<stage.x+stage.width&&b.x+b.width>stage.x&&b.y<stage.y+stage.height&&b.y+b.height>stage.y)problems.push({label:'canvas overlap '+selector,...b});
          }
          await accessible('#ux2Size','fullscreen size slider');await accessible('#ux2Opacity','fullscreen opacity slider');
        }
        await page.screenshot({path:`${OUT}/${type}-${width}x${height}-${full?'full':'normal'}.png`});
      }
      assert.deepEqual(problems,[],'unreachable or clipped controls');return {orientationsChecked:width<height?2:1};
    }finally{await context.close();}
  });
  await check('load large design and rectangular PNG export',async()=>{
    const {context,page}=await fresh();page.setDefaultTimeout(60000);try{
      const data=structuredClone(sample);data.project.repeatStyle='brick';data.settings.symmetry='off';
      data.layers=Array.from({length:24},(_,i)=>({...data.layers[0],id:'load-'+i,name:'Load '+i}));data.activeLayerId='load-0';
      const sources=await page.evaluate(()=>Array.from({length:8},(_,n)=>{const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');for(let i=0;i<80;i++){x.fillStyle=`hsl(${i*17+n*31} 65% 50%)`;x.fillRect(i*23,i*19,180,190)}return c.toDataURL();}));
      data.assets=Array.from({length:8},(_,i)=>({...data.assets[0],id:'large-'+i,src:sources[i],w:2048,h:2048,name:'large-'+i+'.png'}));
      data.items=Array.from({length:80},(_,i)=>({...data.items[0],id:i+1,assetId:'large-'+i%8,layerId:'load-'+i%24,x:40+(i*83)%850,y:30+(i*59)%850,scale:.045}));
      data.marks=Array.from({length:600},(_,i)=>({...data.marks[0],id:100+i,layerId:'load-'+i%24,points:Array.from({length:40},(_,j)=>({x:(i*13+j*3)%900,y:(i*23+j*2)%900}))}));data.nextId=1000;
      const t=performance.now();await importFile(page,data);const importMs=Math.round(performance.now()-t);const client=await context.newCDPSession(page);await client.send('Performance.enable');
      const start=performance.now(),png=await exported(page,'exportPng');const exportMs=Math.round(performance.now()-start);assert.equal(png.buffer.readUInt32BE(16),8000);assert.equal(png.buffer.readUInt32BE(20),4000);
      const before=performance.now();await page.locator('[data-tool="pan"]').first().click();const controlMs=Math.round(performance.now()-before);assert(await page.locator('[data-tool="pan"]').first().evaluate(el=>el.classList.contains('active')));
      const metrics=await client.send('Performance.getMetrics');const heap=metrics.metrics.find(x=>x.name==='JSHeapUsedSize')?.value;
      return {layers:24,marks:600,points:24000,images:8,placements:80,imagePixelsEach:2048*2048,importMs,exportMs,controlMs,pngBytes:png.buffer.length,jsHeapMiB:heap?Math.round(heap/1048576):null,note:'Desktop Chromium measurement; JS heap excludes native canvas/image memory and does not establish Android limits.'};
    }finally{await context.close();}
  });
}finally{await browser.close();}
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
