import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';

const BASE=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const cases=[
  {type:'pattern',repeat:'straight',width:5000,height:5000},
  {type:'pattern',repeat:'half-drop',width:5000,height:10000},
  {type:'pattern',repeat:'brick',width:10000,height:5000},
  {type:'doodle',repeat:'straight',width:5000,height:5000}
];
const failures=[];
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const redSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f02020"/></svg>');

function inspectPng(buffer,width,height){
  assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature');
  assert.equal(buffer.readUInt32BE(16),width,'PNG width');
  assert.equal(buffer.readUInt32BE(20),height,'PNG height');
  let pos=8,phyCount=0,seenEnd=false;
  while(pos+12<=buffer.length){
    const length=buffer.readUInt32BE(pos),name=buffer.toString('ascii',pos+4,pos+8);
    assert(pos+length+12<=buffer.length,'PNG chunk bounds');
    if(name==='pHYs'){
      phyCount++;
      assert.equal(length,9,'pHYs size');
      assert.equal(buffer.readUInt32BE(pos+8),11811,'horizontal pixels per metre for 300 DPI');
      assert.equal(buffer.readUInt32BE(pos+12),11811,'vertical pixels per metre for 300 DPI');
      assert.equal(buffer[pos+16],1,'DPI physical units');
    }
    pos+=length+12;
    if(name==='IEND'){seenEnd=true;break;}
  }
  assert(seenEnd,'PNG complete');
  assert.equal(pos,buffer.length,'No trailing PNG data');
  assert.equal(phyCount,1,'Precisely one pHYs chunk');
}
async function download(page,selector){
  const pending=page.waitForEvent('download',{timeout:180000});
  await page.locator(selector).evaluate(node=>node.click());
  const dl=await pending;
  return {name:dl.suggestedFilename(),buffer:await fs.readFile(await dl.path())};
}
async function create(page,type,repeat){
  await page.locator('#projectTypeInput').selectOption(type);
  await page.locator('#projectRepeatStyle').selectOption(repeat);
  await page.locator('#projectTitleInput').fill('PF 5000 release '+type+' '+repeat);
  await page.locator('#projectSetupForm').evaluate(e=>e.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
}
async function addRedImage(page){
  await page.locator('#files').setInputFiles({name:'opaque-red.svg',mimeType:'image/svg+xml',buffer:redSvg});
  await page.waitForFunction(()=>document.querySelectorAll('#assetGrid .assetWrap').length===1);
  const data=JSON.parse((await download(page,'#saveProject')).buffer.toString());
  assert.equal(data.assets.length,1,'one asset imported');
  assert.equal(data.items.length,1,'asset placed on canvas');
  return data;
}
async function reload(page,data){
  await page.locator('#projectFile').setInputFiles({name:'old-logical-master.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
  await page.waitForTimeout(250);
}
async function scenario(spec){
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const runtimeErrors=[];
  page.on('pageerror',err=>runtimeErrors.push(String(err)));
  try{
    await page.goto(BASE+'/app/?legacy=1',{waitUntil:'networkidle'});
    await create(page,spec.type,spec.repeat);
    const readout=await page.locator('#pixelReadout').textContent();
    assert(readout.includes(spec.width.toLocaleString('en-US')),'screen width is updated');
    assert(readout.includes(spec.height.toLocaleString('en-US')),'screen height is updated');
    const data=await addRedImage(page);
    // Legacy saved documents still use 4000 logical units. Export must NOT alter
    // the saved editing coordinate system or depend on a destructive migration.
    assert.equal(data.tile,4000,'logical tile remains backward-compatible');
    if(spec.type==='pattern'&&spec.repeat==='straight'){
      data.items[0].x=894;
      data.items[0].y=450;
      data.items[0].scale=0.8;
      await reload(page,data);
    }
    const exported=await download(page,'#exportPng');
    inspectPng(exported.buffer,spec.width,spec.height);
    assert(exported.name.endsWith('.png'),'correct extension');
    assert(exported.buffer.length>1000,'nonempty encoded PNG');
    if(spec.type==='doodle'||spec.repeat==='straight'){
      const png=PNG.sync.read(exported.buffer);
      function rgbaAt(x,y){const idx=(y*png.width+x)*4;return [...png.data.subarray(idx,idx+4)];}
      if(spec.type==='doodle'){
        assert.equal(rgbaAt(0,0)[3],0,'Doodle corner truly alpha=0');
        assert.equal(rgbaAt(4999,4999)[3],0,'Doodle opposite corner truly alpha=0');
        assert(rgbaAt(2500,2500)[3]>0,'Doodle contains an opaque motif');
      }else{
        const atLeft=rgbaAt(0,2500),atRight=rgbaAt(4999,2500);
        assert(atLeft[0]>180&&atLeft[1]<90,'wrapped red motif reaches left boundary');
        assert(atRight[0]>180&&atRight[1]<90,'wrapped red motif reaches right boundary');
      }
    }
    const saved=JSON.parse((await download(page,'#saveProject')).buffer.toString());
    assert.equal(saved.tile,4000,'saved project stays in original editable coordinate system');
    assert.equal(saved.items.length,1);
    assert.deepEqual(runtimeErrors,[],'no JS page errors');
    console.log('PASS '+spec.type+' '+spec.repeat+' '+spec.width+'x'+spec.height+' PNG, pHYs 300DPI, save/export'+(spec.repeat==='straight'?', alpha/seam':''));
  }finally{await context.close();}
}
try{
  for(const spec of cases){
    try{await scenario(spec)}catch(err){failures.push({spec,error:err.stack||String(err)});console.error('FAIL '+JSON.stringify(spec)+'\n'+String(err.stack||err));}
  }
}finally{await browser.close();}
if(failures.length){console.error('FAILED '+failures.length+' of '+cases.length);process.exitCode=1;}
else console.log('PASS all 5000px export release scenarios');
