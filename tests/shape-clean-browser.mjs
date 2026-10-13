import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
let successes=0;
function imperfectOval(rx,ry){
 return Array.from({length:100},(_,i)=>{const t=2*Math.PI*i/100;return {x:450+rx*Math.cos(t)+5*Math.sin(t*9),y:400+ry*Math.sin(t)+6*Math.cos(t*6)}});
}
function imperfectTriangle(){
 const corners=[{x:230,y:270},{x:690,y:290},{x:425,y:640}],out=[];
 for(let k=0;k<3;k++)for(let i=0;i<35;i++){const t=i/35,a=corners[k],b=corners[(k+1)%3];out.push({x:a.x+(b.x-a.x)*t+3*Math.sin(i)*Math.sin(Math.PI*t),y:a.y+(b.y-a.y)*t+4*Math.cos(i)*Math.sin(Math.PI*t)})}
 return out;
}
async function fresh(type,small=false){
 const context=await browser.newContext({viewport:small?{width:844,height:390}:{width:1340,height:900},
 hasTouch:small,isMobile:small,acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 page.setDefaultTimeout(25000);
 await page.goto(base+'/app/',{waitUntil:'networkidle'});
 await page.locator('#projectTypeInput').selectOption(type);
 await page.locator('#projectTitleInput').fill('Shape Clean '+type);
 await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 return {context,page,errors};
}
async function download(page,id){
 const incoming=page.waitForEvent('download',{timeout:120000});
 await page.locator('#'+id).evaluate(el=>el.click());
 const d=await incoming;return fs.readFile(await d.path());
}
async function saved(page){return JSON.parse(await download(page,'saveProject'))}
async function openProject(page,project){
 await page.locator('#projectFile').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
}
function addMark(project,points,style='ink'){
 project.marks=[{id:101,type:'brush',layerId:'layer-drawing',color:'#285e52',opacity:1,width:24,brushStyle:style,
 pressureWidth:false,texture:.7,points:[...points,points[0]]}];project.nextId=102;
 return project;
}
try{
 for(const [type,shapeName,points] of [
   ['doodle','circle',imperfectOval(161,153)],
   ['pattern','triangle',imperfectTriangle()]
 ]){
  const {context,page,errors}=await fresh(type,type==='doodle');
  try{
   const old=addMark(await saved(page),points,type==='doodle'?'impasto':'ink');
   await openProject(page,old);
   await page.locator('[data-ux2-tool="brush"]').first().evaluate(el=>el.click());
   assert.equal(await page.locator('#ux2ShapeClean').count(),1,'Shape Clean quick button visible');
   assert.equal(await page.locator('#brushStyle').inputValue(),old.settings.brushStyle);
   assert.equal(await page.locator('#ux2ShapeClean').evaluate(el=>{el.click();return el.textContent;}),'Shape Clean');
   await page.waitForFunction(()=>/Shape Clean:/.test(document.querySelector('#status').textContent));
   const cleaned=await saved(page);
   assert.equal(cleaned.marks[0].cleanShape,shapeName,'correct shape recognition');
   assert.equal(cleaned.marks[0].brushStyle,old.marks[0].brushStyle,'same brush retained');
   assert.notDeepEqual(cleaned.marks[0].points,old.marks[0].points,'points refined');
   assert.equal(cleaned.marks[0].id,101,'editable identity retained');
   const svg=(await download(page,'exportSvg')).toString();
   assert(svg.includes('<svg')&&svg.includes('<path'),'full SVG vector drawing');
   assert(!svg.includes('NaN')&&!svg.includes('Infinity'));
   if(type==='doodle'){
     assert.equal(cleaned.transparent,true,'Doodle saves mandatory transparency');
     assert(!/<rect width="4000" height="4000" fill=/.test(svg),'Doodle SVG must not draw opaque background');
     const png=await download(page,'exportPng');
     assert.equal(png.readUInt32BE(16),4000);assert.equal(png.readUInt32BE(20),4000);
     const pixel=await page.evaluate(async b64=>{
       const bytes=Uint8Array.from(atob(b64),s=>s.charCodeAt(0));
       const bmp=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
       const c=document.createElement('canvas');c.width=c.height=1;
       c.getContext('2d').drawImage(bmp,0,0,1,1,0,0,1,1);
       return c.getContext('2d').getImageData(0,0,1,1).data[3];
     },png.toString('base64'));
     assert.equal(pixel,0,'Doodle exported PNG has transparent corner');
   }
   await page.locator('#undo').evaluate(el=>el.click());
   assert.deepEqual((await saved(page)).marks[0].points,old.marks[0].points,'undo restores imperfect drawn outline');
   await page.locator('#redo').evaluate(el=>el.click());
   assert.equal((await saved(page)).marks[0].cleanShape,shapeName,'redo restores cleaned outline');
   await openProject(page,cleaned);
   assert.equal((await saved(page)).marks[0].cleanShape,shapeName,'clean geometry survives save/open');
   assert.deepEqual(errors,[],'no JavaScript errors');
   console.log('PASS',type,shapeName,'one tap, original style, undo/redo, SVG alpha and full project roundtrip');
   successes++;
  }finally{await context.close()}
 }
 const {context,page,errors}=await fresh('doodle');
 try{
   const points=Array.from({length:80},(_,i)=>({x:i*3+100,y:300+Math.sin(i*.03)*15}));
   const old=addMark(await saved(page),points);
   old.marks[0].points=points;
   await openProject(page,old);
   await page.locator('[data-ux2-tool="brush"]').first().evaluate(el=>el.click());
   await page.locator('#ux2ShapeClean').evaluate(el=>el.click());
   assert.match(await page.locator('#status').textContent(),/left unchanged/);
   assert.deepEqual((await saved(page)).marks[0].points,old.marks[0].points);
   assert.deepEqual(errors,[]);
   console.log('PASS open freehand mark preserved without losing artwork');
   successes++;
 }finally{await context.close()}
 console.log('PASS shape-clean browser scenarios',successes);
}finally{await browser.close()}
