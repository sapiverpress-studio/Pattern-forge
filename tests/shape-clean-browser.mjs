import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const BASE=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
async function open(type='pattern',mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1260,height:820},hasTouch:mobile,isMobile:mobile,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/app/',{waitUntil:'networkidle'});
 await page.locator('#projectTypeInput').selectOption(type);
 await page.locator('#projectTitleInput').fill('Shape Clean '+type);
 await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 return {context,page,errors};
}
async function download(page,id){
 const pending=page.waitForEvent('download',{timeout:120000});
 await page.locator('#'+id).evaluate(el=>el.click());
 const d=await pending;return fs.readFile(await d.path());
}
async function saved(page){return JSON.parse((await download(page,'saveProject')).toString())}
function pen(pts){
 return {id:978,layerId:null,type:'brush',alphaLocked:false,color:'#286753',width:65,fill:false,opacity:.84,texture:.35,brushStyle:'ink',pressureWidth:false,stampShape:'leaf',points:pts};
}
function circle(){
 return Array.from({length:100},(_,i)=>{const a=i/99*Math.PI*2,r=720*(1+.025*Math.sin(a*11));return {x:1800+Math.cos(a)*r,y:1900+Math.sin(a)*r};});
}
function triangle(){
 const vs=[{x:1400,y:1000},{x:2750,y:2760},{x:750,y:2770}],points=[];
 for(let k=0;k<3;k++)for(let j=0;j<30;j++){const t=j/30,a=vs[k],b=vs[(k+1)%3];points.push({x:a.x+(b.x-a.x)*t+7*Math.sin(j*2.1),y:a.y+(b.y-a.y)*t+7*Math.cos(j*.9)})}
 points.push({...points[0]});return points;
}
async function importSketch(page,points){
 const data=await saved(page);
 const layer=data.layers.find(x=>x.id===data.activeLayerId)||data.layers.at(-1);
 data.marks=[{...pen(points),layerId:layer.id}];data.nextId=979;
 await page.locator('#projectFile').setInputFiles({name:'rough.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
 return data;
}
async function checkSVG(page,type){
 const xml=(await download(page,'exportSvg')).toString();
 assert(xml.startsWith('<?xml')||xml.includes('<svg'),'SVG file exists');
 if(type==='ellipse')assert(xml.includes('<ellipse '),'editable circle or oval must export as ellipse');
 if(type==='rect')assert(xml.includes('<rect ')&&xml.includes('fill="none"'),'clean square must be a hollow rectangle');
 if(type==='triangle'){
   const flags={path:xml.includes('<path d="M'),stroke:xml.includes('stroke="#286753"'),hollow:xml.includes('fill="none"')};
   assert(Object.values(flags).every(Boolean),'triangle must be an editable hollow vector outline: '+JSON.stringify(flags)+' SVG snippet '+xml.slice(xml.indexOf('path d='),xml.indexOf('path d=')+350));
 }
 assert(!xml.includes('NaN'));
 return xml;
}
try{
 {const {context,page,errors}=await open('pattern');
  try{
   const orig=await importSketch(page,circle());
   assert.equal(await page.locator('#ux2ShapeClean').count(),1);
   await page.locator('#ux2ShapeClean').evaluate(el=>el.click());
   assert.match(await page.locator('#status').textContent(),/Shape Clean: circle perfected/);
   let p=await saved(page);
   assert.equal(p.marks.length,1);
   assert.equal(p.marks[0].type,'ellipse');assert.equal(p.marks[0].shapeCleanKind,'circle');
   assert.equal(p.marks[0].fill,false);
   assert.equal(p.marks[0].color,'#286753');assert.equal(p.marks[0].width,65);
   await checkSVG(page,'ellipse');
   await page.locator('#undo').evaluate(el=>el.click());
   p=await saved(page);assert.equal(p.marks[0].type,'brush');
   assert.deepEqual(p.marks[0].points,orig.marks[0].points);
   await page.locator('#redo').evaluate(el=>el.click());
   p=await saved(page);assert.equal(p.marks[0].type,'ellipse');
   await page.locator('#projectFile').setInputFiles({name:'clean.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
   await page.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);
   assert.equal((await saved(page)).marks[0].shapeCleanKind,'circle');
   assert.deepEqual(errors,[]);
   console.log('PASS Pattern one tap circle clean, SVG, undo/redo, save/reopen, preserved colour/width');
  }finally{await context.close()}
 }
 {const {context,page,errors}=await open('doodle',true);
  try{
   await importSketch(page,triangle());
   await page.locator('#ux2ShapeClean').evaluate(el=>el.click());
   const data=await saved(page);
   assert.equal(data.project.projectType,'doodle');
   assert.equal(data.marks[0].shapeCleanKind,'triangle');
   assert.equal(data.marks[0].brushStyle,'ink');
   assert.equal(data.marks[0].points.length,4);
   assert.equal(data.transparent,true,'Doodle stays transparent');
   const svg=await checkSVG(page,'triangle');
   assert(!/<rect[^>]+(?:width="4000"|height="4000")/.test(svg),'SVG has no opaque white background');
   const png=await download(page,'exportPng');
   assert.equal(png.readUInt32BE(16),4000);assert.equal(png.readUInt32BE(20),4000);
   const corner=await page.evaluate(async base64=>{
     const resp=await fetch('data:image/png;base64,'+base64);
     const img=await createImageBitmap(await resp.blob());
     const c=document.createElement('canvas');c.width=2;c.height=2;
     const ctx=c.getContext('2d');ctx.drawImage(img,0,0,2,2);
     return [...ctx.getImageData(0,0,1,1).data];
   },png.toString('base64'));
   assert.equal(corner[3],0,'Doodle PNG alpha is completely transparent outside artwork');
   assert.deepEqual(errors,[]);
   console.log('PASS Doodle triangle clean, editable transparent SVG and PNG alpha 0, mobile viewport');
  }finally{await context.close()}
 }
 console.log('PASS Shape Clean 2/2 end-to-end flows');
}finally{await browser.close()}
