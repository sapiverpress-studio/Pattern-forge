import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
async function fresh({doodle=false,mobile=false}={}){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:820},
    isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTypeInput').selectOption(doodle?'doodle':'pattern');
  await page.locator('#projectTitleInput').fill('Raised oil paint test');
  await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  return {context,page,errors};
}
async function download(page,button){
  const upcoming=page.waitForEvent('download',{timeout:120000});
  await page.locator('#'+button).evaluate(el=>el.click());
  const file=await upcoming;return fs.readFile(await file.path());
}
async function choose(page,style){
  await page.locator('[data-ux2-tool="brush"]').first().evaluate(el=>el.click());
  await page.locator('#ux2BrushLibrary').evaluate(el=>el.click());
  assert.equal(await page.locator('[data-brush-style="'+style+'"]').count(),1);
  await page.locator('[data-brush-style="'+style+'"]').evaluate(el=>el.click());
  assert.equal(await page.locator('#brushStyle').inputValue(),style);
  assert(Number(await page.locator('#brushSize').inputValue())>=130,'raised paint should start thick');
  assert(Number(await page.locator('#textureAmount').inputValue())>=70,'visible relief should be enabled');
  assert.equal(await page.locator('#ux2PaintRelief').count(),1,'on-canvas relief slider is visible');
}
async function draw(page){
  const b=await page.locator('#editorCanvas').boundingBox();
  assert(b&&b.width>200);
  await page.mouse.move(b.x+b.width*.24,b.y+b.height*.50);await page.mouse.down();
  await page.mouse.move(b.x+b.width*.38,b.y+b.height*.29,{steps:16});
  await page.mouse.move(b.x+b.width*.62,b.y+b.height*.69,{steps:20});
  await page.mouse.move(b.x+b.width*.74,b.y+b.height*.42,{steps:16});await page.mouse.up();
}
try{
 const fingerprints=new Set();
 for(const style of ['impasto','piped','knife']){
  const {context,page,errors}=await fresh();
  try{
   await choose(page,style);
   await page.locator('#ink').evaluate(el=>{el.value='#ea8232';el.dispatchEvent(new Event('input',{bubbles:true}))});
   await draw(page);
   const project=JSON.parse(await download(page,'saveProject'));
   assert.equal(project.marks.length,1);
   assert.equal(project.marks[0].brushStyle,style);
   assert(project.marks[0].width>20);
   assert(project.marks[0].points.length>5);
   const svg=(await download(page,'exportSvg')).toString();
   assert(svg.includes('<svg')&&svg.includes('<path')&&svg.includes('<circle'),'SVG must include editable paint relief geometry');
   assert(!/NaN|Infinity/.test(svg));
   assert((svg.match(/fill="#[0-9a-f]{6}"/g)||[]).length>=8,'SVG must have multiple actual pigment bands');
   assert(await page.evaluate(s=>!new DOMParser().parseFromString(s,'image/svg+xml').querySelector('parsererror'),svg),'SVG syntax');
   fingerprints.add((svg.match(/fill="#[0-9a-f]{6}"/g)||[]).slice(0,16).join('|'));
   await page.locator('#undo').evaluate(el=>el.click());
   const undone=JSON.parse(await download(page,'saveProject'));assert.equal(undone.marks.length,0);
   await page.locator('#redo').evaluate(el=>el.click());
   const redone=JSON.parse(await download(page,'saveProject'));assert.equal(redone.marks.length,1);
   await page.locator('#projectFile').setInputFiles({name:'raised-oil.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
   await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
   const reopened=JSON.parse(await download(page,'saveProject'));
   assert.equal(reopened.marks[0].brushStyle,style);
   assert.equal(reopened.settings.brushStyle,style);
   assert.deepEqual(errors,[]);
   console.log('PASS',style,'vector relief, undo/redo, editable save/reopen');
  }finally{await context.close()}
 }
 assert.equal(fingerprints.size,3,'brush styles must yield distinct pigment ridge renderings');
 {
  const {context,page,errors}=await fresh({doodle:true,mobile:true});
  try{
   await choose(page,'piped');await draw(page);
   const svg=(await download(page,'exportSvg')).toString();
   assert(svg.includes('fill="#')&&!svg.includes('NaN'));
   const png=await download(page,'exportPng');
   assert.equal(png.subarray(1,4).toString(),'PNG');
   assert.equal(png.readUInt32BE(16),5000);
   assert.equal(png.readUInt32BE(20),5000);
   assert.deepEqual(errors,[]);
   console.log('PASS Doodle mobile viewport PNG/SVG thick icing paint');
  }finally{await context.close()}
 }
 console.log('PASS four raised-paint end-to-end browser flows');
}finally{await browser.close()}
