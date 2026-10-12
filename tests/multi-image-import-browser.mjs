import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const BASE=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
let tests=0;
function svg(i){return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="rgb('+(i*19%255)+',90,120)"/></svg>')}
const batch=(count,start=1)=>Array.from({length:count},(_,i)=>({name:'image-'+(i+start)+'.svg',mimeType:'image/svg+xml',buffer:svg(i+start)}));
async function fresh(type='pattern',mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:820},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(25000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(BASE+'/app/',{waitUntil:'networkidle'});
 await page.locator('#projectTypeInput').selectOption(type);
 await page.locator('#projectTitleInput').fill('Batch image test '+type);
 await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 return {context,page,errors};
}
async function downloaded(page,button){
 const d=page.waitForEvent('download',{timeout:60000});
 await page.locator(button).evaluate(el=>el.click());
 const file=await d;return JSON.parse((await fs.readFile(await file.path())).toString());
}
async function importBatch(page,files,count){
 await page.locator('#files').setInputFiles(files);
 await page.waitForFunction(n=>document.querySelectorAll('#assetGrid .assetWrap').length===n,count);
 await page.waitForFunction(n=>document.querySelectorAll('#ux2ImageLibrary .ux2-image-card').length===n,count);
 assert.equal(await page.locator('#ux2PaletteTitle').textContent(),'Images');
 assert.equal(await page.locator('#ux2ImageCount').textContent(),count+' uploaded images');
}
try{
 {
  const {context,page,errors}=await fresh();
  try{
   await page.locator('[data-ux2-action="image"]').first().evaluate(el=>el.click());
   assert(await page.locator('#files').evaluate(e=>e.multiple),'native file chooser must support multiselect');
   assert(await page.locator('#ux2ImportImages').count(),'batch import button exists');
   assert(await page.locator('#ux2BackupImages').count(),'full library backup button exists');
   await page.locator('[data-ux2-tool="brush"]').first().evaluate(el=>el.click());
   await importBatch(page,batch(6),6);
   assert((await page.locator('[data-tool="select"].active').count())>0,'imported image must be immediately movable');assert.equal(await page.locator('[data-tool="brush"].active').count(),0);
   const first=await downloaded(page,'#saveProject');
   assert.equal(first.items.length,1,'only first automatically placed');
   assert.equal(first.assets.length,1,'normal compact save retains placed art only');
   await page.getByRole('button',{name:'Add image-6.svg to canvas'}).evaluate(el=>el.click());
   const second=await downloaded(page,'#saveProject');
   assert.equal(second.items.length,2,'other imported image can be placed independently');
   assert.equal(second.assets.length,2);
   const full=await downloaded(page,'#ux2BackupImages');
   assert.equal(full.assets.length,6,'full project backup retains all six uploaded files');
   assert.equal(full.items.length,2);
   await page.locator('#projectFile').setInputFiles({name:'full-library.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(full))});
   await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
   assert.equal(await page.locator('#assetGrid .assetWrap').count(),6,'full backup reopens complete image library');
   await page.locator('[data-ux2-action="image"]').first().evaluate(el=>el.click());
   assert.equal(await page.locator('#ux2ImageLibrary .ux2-image-card').count(),6);
   assert.deepEqual(errors,[]);
   tests++;console.log('PASS six-image import, UX2 library, individual placement, compact export and full backup roundtrip');
  }finally{await context.close()}
 }
 {
  const {context,page,errors}=await fresh('pattern',true);
  try{
   await page.locator('[data-ux2-action="image"]').first().evaluate(el=>el.click());
   await importBatch(page,batch(12),12);
   assert.equal(await page.locator('#files').evaluate(e=>e.value),'','file picker resets for next batch');
   assert.equal((await downloaded(page,'#ux2BackupImages')).assets.length,12);
   await page.locator('#files').setInputFiles([{name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('not SVG')},...batch(5,13),{name:'skip.txt',mimeType:'text/plain',buffer:Buffer.from('x')}]);
   await page.waitForFunction(()=>document.querySelectorAll('#assetGrid .assetWrap').length===17);
   await page.waitForFunction(()=>document.querySelectorAll('#ux2ImageLibrary .ux2-image-card').length===17);
   assert.match(await page.locator('#status').textContent(),/2 skipped\/failed/);
   const all=await downloaded(page,'#ux2BackupImages');
   assert.equal(all.assets.length,17);
   assert.equal(all.items.length,2,'one first placement per successful batch');
   assert.deepEqual(errors,[]);
   tests++;console.log('PASS 12 then 5 more images, Android-emulated layout, broken/unsupported image tolerance');
  }finally{await context.close()}
 }
 {
  const {context,page,errors}=await fresh('doodle',true);
  try{
   await page.locator('[data-ux2-action="image"]').first().evaluate(el=>el.click());
   await importBatch(page,batch(5,30),5);
   assert.equal(await page.locator('#ux2ImageCount').textContent(),'5 uploaded images');
   await page.getByRole('button',{name:'Add image-34.svg to canvas'}).evaluate(el=>el.click());
   const full=await downloaded(page,'#ux2BackupImages');
   assert.equal(full.project.projectType,'doodle');
   assert.equal(full.assets.length,5);
   assert.equal(full.items.length,2);
   assert.deepEqual(errors,[]);
   tests++;console.log('PASS Doodle five-image import, independently placed image and full backup');
  }finally{await context.close()}
 }
 console.log('PASS multi-image UX scenarios',tests);
}finally{await browser.close()}
