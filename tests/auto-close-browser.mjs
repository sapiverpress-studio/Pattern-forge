import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
let checks=0;
async function fresh(type='pattern'){
 const context=await browser.newContext({viewport:{width:1300,height:900},acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/app/?legacy=1',{waitUntil:'networkidle'});
 await page.locator('#projectTypeInput').selectOption(type);
 await page.locator('#projectTitleInput').fill('Auto-close test '+type);
 await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 return {context,page,errors};
}
async function file(page,id='saveProject'){
 const download=page.waitForEvent('download',{timeout:60000});
 await page.locator('#'+id).click();
 const d=await download;
 return {buffer:await fs.readFile(await d.path()),name:d.suggestedFilename()};
}
async function saved(page){return JSON.parse((await file(page)).buffer.toString());}
async function stroke(page,{ring=true,radius=0.105}={}){
 const b=await page.locator('#editorCanvas').boundingBox();
 assert(b,'editor canvas must have geometry');
 const x=b.x+b.width*.52,y=b.y+b.height*.47,r=b.width*radius;
 let points;
 if(ring)points=Array.from({length:39},(_,i)=>{const a=2*Math.PI*.991*i/38;return [x+Math.cos(a)*r,y+Math.sin(a)*r*.78]});
 else points=Array.from({length:35},(_,i)=>[x-r+i*r*1.8/34,y-i*r*.3/34]);
 await page.mouse.move(...points[0]);await page.mouse.down();
 for(const [px,py] of points.slice(1))await page.mouse.move(px,py,{steps:2});
 await page.mouse.up();
}
async function choose(page,tool){await page.locator('[data-tool="'+tool+'"]').first().evaluate(el=>el.click());}
try{
 {
  const {context,page,errors}=await fresh();
  assert.equal(await page.locator('#strokeStabilisation').inputValue(),'strong');
  assert(await page.locator('#autoCloseShapes').isChecked());
  assert(await page.locator('#snapOn').isChecked());
  assert.equal(await page.locator('#autoCloseTolerance').inputValue(),'24');
  await choose(page,'brush');
  await stroke(page);
  let project=await saved(page);
  assert.equal(project.marks.length,1);
  assert.equal(project.marks[0].autoClosed,true,'oval should join');
  const first=project.marks[0].points[0],last=project.marks[0].points.at(-1);
  assert.equal(first.x,last.x);assert.equal(first.y,last.y);
  assert.equal(project.settings.strokeStabilisation,'strong');
  assert.equal(project.settings.autoCloseShapes,true);
  assert.equal(project.settings.snapOn,true);
  const svg=await file(page,'exportSvg');
  assert(svg.buffer.toString().includes('<svg'),'joined mark must export to SVG');
  const png=await file(page,'exportPng');
  assert(png.buffer.length>1500,'joined mark must export to PNG');
  await page.locator('#undo').evaluate(el=>el.click());
  assert.equal((await saved(page)).marks.length,0,'Undo must restore previous state');
  await page.locator('#redo').evaluate(el=>el.click());
  assert.equal((await saved(page)).marks.at(-1).autoClosed,true,'Redo must restore joined loop');
  await choose(page,'brush');
  await stroke(page,{ring:false});
  project=await saved(page);
  assert.equal(project.marks.length,2);
  assert.notEqual(project.marks[1].autoClosed,true,'open line must not close');
  await page.locator('#autoCloseShapes').uncheck();
  await page.locator('#strokeStabilisation').selectOption('off');
  await page.locator('#autoCloseTolerance').fill('16');
  await choose(page,'brush');
  await stroke(page,{ring:true});
  project=await saved(page);
  assert.equal(project.marks[2].autoClosed,undefined,'disabled setting must respect intentional gaps');
  assert.equal(project.settings.autoCloseShapes,false);
  assert.equal(project.settings.strokeStabilisation,'off');
  assert.equal(project.settings.autoCloseTolerance,16);
  const savedBuffer=(await file(page)).buffer;
  await page.locator('#autoCloseShapes').check();
  await page.locator('#strokeStabilisation').selectOption('strong');
  await page.locator('#projectFile').setInputFiles({name:'existing-project.json',mimeType:'application/json',buffer:savedBuffer});
  await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
  assert.equal(await page.locator('#strokeStabilisation').inputValue(),'off','existing project stabiliser preserved');
  assert.equal(await page.locator('#autoCloseShapes').isChecked(),false,'existing project toggle preserved');
  assert.equal(await page.locator('#autoCloseTolerance').inputValue(),'16');
  assert.equal((await saved(page)).marks.length,3,'all original marks restored');
  assert.deepEqual(errors,[]);
  checks++;
  console.log('PASS Pattern: default Strong + smart snap, closed oval, open line, disabled auto-close, undo/redo, PNG/SVG, saved project reload');
  await context.close();
 }
 {
  const {context,page,errors}=await fresh('doodle');
  assert.equal(await page.locator('#strokeStabilisation').inputValue(),'strong');
  assert(await page.locator('#autoCloseShapes').isChecked());
  await choose(page,'brush');await stroke(page);
  const project=await saved(page);
  assert.equal(project.marks[0].autoClosed,true);
  assert.deepEqual(errors,[]);checks++;
  console.log('PASS Doodle: strong and auto-close, standalone shape closed');
  await context.close();
 }
 {
  const {context,page,errors}=await fresh('pattern');
  await choose(page,'brush');
  // UX2 real shell proxy controls should be wired, not merely visual placeholders.
  const ux=page.locator('#ux2AutoClose');
  assert.equal(await ux.count(),1,'Brush controls must expose auto-close');
  await ux.uncheck({force:true});
  assert.equal(await page.locator('#autoCloseShapes').isChecked(),false);
  await ux.check({force:true});
  await page.locator('#ux2AutoCloseDistance').fill('32');
  assert.equal(await page.locator('#autoCloseTolerance').inputValue(),'32');
  await choose(page,'freefill');
  assert.equal(await page.locator('#ux2AutoClose').count(),1,'Freehand fill needs join control');
  assert.deepEqual(errors,[]);checks++;
  console.log('PASS UX2: Brush/Fill auto-join controls change editor settings');
  await context.close();
 }
 console.log('PASS total app browser scenarios',checks);
}finally{await browser.close()}
