import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
function makePng(name,n=1,opaque=false,size=64){
  const png=new PNG({width:size,height:size});
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const p=(y*size+x)*4;
    const visible=opaque||(x>=size/4&&x<size*3/4&&y>=size/4&&y<size*3/4);
    png.data[p]=25+n%150;png.data[p+1]=100;png.data[p+2]=150;png.data[p+3]=visible?255:0;
  }
  return {name,mimeType:'image/png',buffer:PNG.sync.write(png)};
}
function crc32(buffer){
  let crc=~0;for(const b of buffer){crc^=b;for(let j=0;j<8;j++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}return (~crc)>>>0;
}
function u16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n,0);return b;}
function u32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0,0);return b;}
function zip(files,deflate=true){
  const locals=[],central=[];let offset=0;
  for(const {name,buffer} of files){
    const path=Buffer.from(name),packed=deflate?deflateRawSync(buffer):buffer,method=deflate?8:0,crc=crc32(buffer);
    const local=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(method),u16(0),u16(0),u32(crc),u32(packed.length),u32(buffer.length),u16(path.length),u16(0),path,packed]);
    const record=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(method),u16(0),u16(0),u32(crc),u32(packed.length),u32(buffer.length),u16(path.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),path]);
    locals.push(local);central.push(record);offset+=local.length;
  }
  const dir=Buffer.concat(central);
  return Buffer.concat([...locals,dir,u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(dir.length),u32(offset),u16(0)]);
}
const browser=await chromium.launch({headless:true});
let tests=0;
async function pageFor(mobile=false){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1400,height:900},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Motif Library QA');
  await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('[data-ux2-panel="motifs"]').evaluate(el=>el.click());
  return {page,context,errors};
}
async function downloadJson(page,selector){
  const d=page.waitForEvent('download');
  await page.locator(selector).evaluate(el=>el.click());
  const file=await d;return JSON.parse((await fs.readFile(await file.path())).toString());
}
try{
  {
    const {page,context,errors}=await pageFor();
    try{
      const files=Array.from({length:100},(_,i)=>makePng('leaf-'+String(i+1).padStart(3,'0')+'.png',i));
      await page.locator('#ux2CollectionName').fill('Botanical hundred');
      await page.locator('#ux2MotifPngFiles').setInputFiles(files);
      await page.waitForFunction(()=>document.querySelector('#ux2MotifImportReport')?.textContent.includes('Imported 100'),null,{timeout:90000});
      let all=await page.evaluate(()=>window.PatternForgeMotifs.list());
      assert.equal(all.length,100,'exactly 100 imported');
      assert(all.every(m=>m.collection==='Botanical hundred'&&m.sourceType==='rgba-png'));
      const project=await downloadJson(page,'#saveProject');
      assert.equal(project.assets.length,0,'unused collection assets do not bloat saved project');
      assert.equal(project.items.length,0,'import does not place any motif');
      await page.locator('#ux2MotifPngFiles').setInputFiles([files[0]]);
      await page.waitForFunction(()=>document.querySelector('#ux2MotifImportReport')?.textContent.includes('already in collection'));
      assert.equal((await page.evaluate(()=>window.PatternForgeMotifs.list())).length,100,'duplicate in same collection skipped');
      await page.evaluate(async()=>window.PatternForgeMotifs.insert((await window.PatternForgeMotifs.list())[0].id));
      const placed=await downloadJson(page,'#saveProject');
      assert.equal(placed.assets.length,1,'inserting one motif uses one PNG asset');
      assert.equal(placed.items.length,1,'motif is placed as editable transformable image');
      assert(placed.assets[0].src.startsWith('data:image/png;base64,'));
      await page.reload({waitUntil:'networkidle'});
      assert.equal((await page.evaluate(()=>window.PatternForgeMotifs.list())).length,100,'collection persisted after full reload');
      assert.deepEqual(errors,[]);
      tests++;console.log('PASS 100 alpha motifs, named collection, duplicate rejection, insertion, persistence and portable project isolation');
    }finally{await context.close();}
  }
  {
    const {page,context,errors}=await pageFor(true);
    try{
      const entries=[
        {name:'coastal/shell.png',buffer:makePng('shell.png',1).buffer},
        {name:'coastal/starfish.png',buffer:makePng('starfish.png',2).buffer}
      ];
      await page.locator('#ux2CollectionName').fill('Coastal');
      await page.locator('#ux2MotifZipFile').setInputFiles({name:'coastal.zip',mimeType:'application/zip',buffer:zip(entries,true)});
      await page.waitForFunction(()=>document.querySelector('#ux2MotifImportReport')?.textContent.includes('Imported 2'),null,{timeout:90000});
      const all=await page.evaluate(()=>window.PatternForgeMotifs.list());
      assert.equal(all.length,2);
      assert(all.every(m=>m.collection==='Coastal'));
      assert.equal(await page.locator('#ux2MotifCollectionFilter option').count(),2,'collection filter available');
      await page.locator('#ux2MotifCollectionFilter').selectOption('Coastal');
      assert.equal(await page.locator('#ux2MotifList .ux2-layer-row').count(),2);
      assert.deepEqual(errors,[]);
      tests++;console.log('PASS compressed ZIP motif folder, Android viewport and collection filter');
    }finally{await context.close();}
  }
  {
    const {page,context,errors}=await pageFor();
    try{
      const correct=makePng('valid.png',1),opaque=makePng('bad-opaque.png',2,true);
      const bogus=makePng('rgb-only.png',3);bogus.buffer=Buffer.from(bogus.buffer);bogus.buffer[25]=2;
      await page.locator('#ux2CollectionName').fill('Rejected sources');
      await page.locator('#ux2MotifPngFiles').setInputFiles([correct,opaque,bogus]);
      await page.waitForFunction(()=>document.querySelector('#ux2MotifImportReport')?.textContent.includes('Imported 1'),null,{timeout:90000});
      const summary=await page.locator('#ux2MotifImportReport').textContent();
      assert.match(summary,/2 rejected/);
      assert.equal((await page.evaluate(()=>window.PatternForgeMotifs.list())).length,1);
      assert.deepEqual(errors,[]);
      tests++;console.log('PASS only RGBA real-alpha PNG accepted; opaque and RGB rejected');
    }finally{await context.close();}
  }
  {
    const {page,context,errors}=await pageFor(true);
    try{
      const animal=(name,seed)=>({name,buffer:makePng(name,seed).buffer});
      const first=zip([
        {name:'Woodland_creatures/Fox/sitting.png',buffer:animal('sitting.png',1).buffer},
        {name:'Woodland_creatures/Fox/running.png',buffer:animal('running.png',2).buffer},
        {name:'Woodland_creatures/Fox/Winter/sitting.png',buffer:animal('sitting.png',3).buffer},
        {name:'Woodland_creatures/Hedgehog/sitting.png',buffer:animal('sitting.png',4).buffer},
        {name:'Woodland_creatures/Doe/sitting.png',buffer:animal('sitting.png',5).buffer}
      ]);
      await page.locator('#ux2MotifZipFile').setInputFiles({name:'woodland.zip',mimeType:'application/zip',buffer:first});
      await page.waitForFunction(()=>document.querySelector('#ux2MotifImportReport')?.textContent.includes('Imported 5'),null,{timeout:90000});
      const saved=await page.evaluate(()=>window.PatternForgeMotifs.list());
      assert.equal(saved.length,5,'identical basenames in distinct directories are allowed');
      assert(saved.every(m=>m.collection==='Woodland_creatures'),'ZIP root creates collection when no label supplied');
      assert.equal(saved.filter(m=>m.categoryPath.startsWith('Fox')).length,3);
      assert(saved.some(m=>m.relativePath==='Woodland_creatures/Fox/Winter/sitting.png'&&m.categoryPath==='Fox / Winter'));
      await page.locator('#ux2MotifCollectionFilter').selectOption('Woodland_creatures');
      assert((await page.locator('#ux2MotifCategoryFilter option').allTextContents()).includes('Fox / Winter'));
      await page.locator('#ux2MotifCategoryFilter').selectOption('Fox');
      await page.waitForFunction(()=>document.querySelectorAll('#ux2MotifList .ux2-layer-row').length===3);
      const second=zip([
        {name:'Arctic_Animals/Fox/sleeping.png',buffer:animal('sleeping.png',6).buffer},
        {name:'Arctic_Animals/Wolf/sitting.png',buffer:animal('sitting.png',7).buffer}
      ],false);
      await page.locator('#ux2MotifZipFile').setInputFiles({name:'arctic.zip',mimeType:'application/zip',buffer:second});
      await page.waitForFunction(()=>document.querySelector('#ux2MotifImportReport')?.textContent.includes('Imported 2'),null,{timeout:90000});
      await page.locator('#ux2MotifSearch').fill('fox');
      await page.waitForFunction(()=>document.querySelectorAll('#ux2MotifList .ux2-layer-row').length===4);
      const details=await page.locator('#ux2MotifList .ux2-layer-row small').allTextContents();
      assert(details.some(x=>x.includes('Arctic_Animals / Fox')),'global search bypasses active collection and subfolder filters');
      assert(details.filter(x=>x.includes('Woodland_creatures / Fox')).length===3);
      await page.locator('#ux2MotifSearch').fill('winter');
      await page.waitForFunction(()=>document.querySelectorAll('#ux2MotifList .ux2-layer-row').length===1);
      await page.locator('#ux2MotifSearch').fill('arctic fox');
      await page.waitForFunction(()=>document.querySelectorAll('#ux2MotifList .ux2-layer-row').length===1);
      await page.locator('#ux2MotifSearch').fill('');
      await page.locator('#ux2MotifCollectionFilter').selectOption('Woodland_creatures');
      await page.locator('#ux2MotifCategoryFilter').selectOption('Doe');
      await page.waitForFunction(()=>document.querySelectorAll('#ux2MotifList .ux2-layer-row').length===1);
      await page.reload({waitUntil:'networkidle'});
      const reopened=await page.evaluate(()=>window.PatternForgeMotifs.list());
      assert.equal(reopened.length,7,'nested metadata persists on reload');
      assert.equal(reopened.filter(x=>x.categoryPath==='Fox').length,3);
      assert.deepEqual(errors,[]);
      tests++;console.log('PASS nested stored/deflated ZIP paths, duplicate basenames, subfolder browse, global cross-collection keyword search, persisted hierarchy');
    }finally{await context.close()}
  }
  {
    const {page,context,errors}=await pageFor();
    try{
      const png=makePng('fox-portrait.png',8);
      const bytes=Array.from(png.buffer);
      const result=await page.evaluate(async data=>{
        const f=new File([new Uint8Array(data)],'fox-portrait.png',{type:'image/png'});
        Object.defineProperty(f,'webkitRelativePath',{value:'Woodland_creatures/Fox/fox-portrait.png'});
        return await window.PatternForgeMotifs.importFiles([f],'');
      },bytes);
      assert.equal(result.collection,'Woodland_creatures');
      assert.equal(result.imported,1);
      await page.locator('#ux2MotifSearch').fill('fox');
      await page.waitForFunction(()=>document.querySelectorAll('#ux2MotifList .ux2-layer-row').length===1);
      const saved=await page.evaluate(()=>window.PatternForgeMotifs.list());
      assert.equal(saved[0].categoryPath,'Fox','native folder picker also preserves nested path');
      assert.deepEqual(errors,[]);
      tests++;console.log('PASS native folder hierarchy and single-motif search');
    }finally{await context.close()}
  }
  console.log('PASS motif collection browser suites '+tests);
}finally{await browser.close();}
