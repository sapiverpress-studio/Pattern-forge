import { chromium } from 'playwright';
import { deflateSync } from 'node:zlib';
import fs from 'node:fs/promises';

function assert(ok,message){if(!ok)throw Error(message);}
function crc32(bytes){let c=0xffffffff;for(const v of bytes){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(tag,data){const t=Buffer.from(tag),header=Buffer.alloc(4),crc=Buffer.alloc(4);header.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([header,t,data,crc]);}
function png(n,index){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(n,0);ihdr.writeUInt32BE(n,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc(n*(1+n*4));
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const at=y*(1+n*4)+1+x*4;raw[at]=(index*65+30)%255;raw[at+1]=(index*40+50)%255;raw[at+2]=(index*90+60)%255;raw[at+3]=255;}
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
async function saved(){
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProject').evaluate(el=>el.click())]);
  return JSON.parse(await fs.readFile(await download.path(),'utf8'));
}
try{
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Baking - Motif Remix');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('#files').setInputFiles({
    name:'rolling-pin.svg',mimeType:'image/svg+xml',
    buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="8" y="20" width="84" height="60" fill="#79605a"/></svg>')
  });
  await page.waitForFunction(()=>window.PatternForgeEtsyBridge.state.items.length===1);
  await page.evaluate(()=>{
    const id=window.PatternForgeImageLibrary.list()[0].id;
    for(let i=0;i<3;i++)window.PatternForgeImageLibrary.place(id);
    window.PatternForgeEtsyBridge.state.items.forEach((item,i)=>{
      item.x=140+i*160;item.y=280+i*60;item.rotation=i*.2;
    });
  });
  const original=await saved();
  assert(original.items.length===4,'Expected four copies of a single imported motif');
  await page.locator('#ux2Export').click();
  await page.locator('#ux2ExportRemix').click();
  await page.locator('#motifSwapDialog').waitFor({state:'visible'});
  const originalName=await page.locator('#motifSwapName').inputValue();
  assert(originalName==='Baking - Remix 2','Repeated remix name not cleaned: '+originalName);
  assert((await page.locator('#motifSwapSummary').textContent()).includes('4 placed images'),'Missing placed image count');
  assert(await page.locator('#motifSwapMode').inputValue()==='upload','Expected upload when only original image available');
  assert(await page.locator('#motifSwapScope').inputValue()==='type','Expected all-copies mode first');
  const files=[
    {name:'new-oven.png',mimeType:'image/png',buffer:png(32,1)},
    {name:'new-cake.png',mimeType:'image/png',buffer:png(32,2)}
  ];
  await page.locator('#motifSwapFiles').setInputFiles(files);
  assert(await page.locator('#motifSwapScope').inputValue()==='placement','Two images for one source motif should switch to per-copy mapping');
  await page.waitForFunction(()=>document.querySelectorAll('#motifSwapMapping .motifSwapRow').length===2);
  assert((await page.locator('#motifSwapError').textContent()).includes('individual copies'),'Missing clear automatic scope explanation');
  const originals=await page.locator('#motifSwapMapping select').evaluateAll(nodes=>nodes.map(node=>node.value));
  assert(new Set(originals).size===2,'Uploaded files do not map to two unique placements');
  assert(await page.locator('#motifSwapApply').isEnabled(),'User cannot create a mapped copy');
  const bounds=await page.locator('#motifSwapDialog').boundingBox(),foot=await page.locator('.motifSwapFooter').boundingBox();
  assert(bounds&&foot&&bounds.y>=0&&bounds.y+bounds.height<=845,'Mobile dialog overflowed viewport');
  assert(foot.y>=bounds.y&&foot.y+foot.height<=bounds.y+bounds.height+1,'Footer not visible inside mobile dialog');
  assert(await page.locator('#motifSwapMapping img').count()===4,'Source and replacement images not previewed');
  // Intentionally choose the same placement twice: clear, actionable validation.
  const selectors=page.locator('#motifSwapMapping select');
  await selectors.nth(1).selectOption(originals[0]);
  await page.locator('#motifSwapApply').click();
  assert((await page.locator('#motifSwapError').textContent()).includes('same original'),'Duplicate placement failed to report a specific issue');
  await selectors.nth(1).selectOption(originals[1]);
  await page.locator('#motifSwapApply').click();
  await page.locator('#motifSwapDialog').waitFor({state:'hidden',timeout:20000});
  const copy=await saved();
  assert(copy.project.id!==original.project.id,'Copied design overwrote original');
  assert(copy.items.length===4,'Copy modified placement count');
  assert(copy.items.filter(item=>item.assetId!==original.items[0].assetId).length===2,'Exactly two selected placements must be replaced');
  assert(copy.items.filter(item=>item.assetId===original.items[0].assetId).length===2,'Unselected identical copies should be preserved');
  copy.items.forEach((item,i)=>{
    for(const key of ['id','rotation','layerId'])assert(item[key]===original.items[i][key],'Copied item '+i+' changed '+key);
    assert(Math.abs(item.x-original.items[i].x)<.6&&Math.abs(item.y-original.items[i].y)<.6,'Copied item moved unexpectedly '+i);
  });
  assert(errors.length===0,'Page errors: '+errors.join(' | '));
  console.log('PASS: Android-size dialog, unique default name, 2 uploads mapped to 2 of 4 identical copies, duplicate validation, source layout safety and preview.');
}finally{await browser.close();}
