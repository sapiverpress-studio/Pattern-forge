import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const ROOT=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
let completed=0;
async function fresh({touch=false,doodle=false}={}){
 const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:850},
  isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?2:1,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(ROOT+'/app/',{waitUntil:'networkidle'});
 await page.locator('#projectTypeInput').selectOption(doodle?'doodle':'pattern');
 await page.locator('#projectTitleInput').fill('Drag response regression');
 await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 const image=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="red"/></svg>');
 await page.locator('#files').setInputFiles({name:'drag-test.svg',mimeType:'image/svg+xml',buffer:image});
 await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===1);
 await page.locator('[data-ux2-tool="select"]').first().evaluate(el=>el.click());
 return {context,page,errors};
}
async function project(page){
 const p=page.waitForEvent('download',{timeout:60000});
 await page.locator('#saveProject').evaluate(el=>el.click());
 const d=await p;
 return JSON.parse((await fs.readFile(await d.path())).toString());
}
async function drag(page,touch,dx,dy){
 const el=page.locator('#editorCanvas');
 await el.scrollIntoViewIfNeeded();
 const box=await el.boundingBox();assert(box&&box.width>100);
 const x=box.x+box.width/2,y=box.y+box.height/2;
 if(!touch){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:15});await page.mouse.up();return;}
 const client=await page.context().newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 for(let i=1;i<=15;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/15,y:y+dy*i/15,id:1}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await client.detach();
}
async function run(name,config,delta){
 const {context,page,errors}=await fresh(config);
 try{
  const before=await project(page);assert.equal(before.items.length,1,'asset on tile');
  await drag(page,!!config.touch,...delta);
  const after=await project(page);assert.equal(after.items.length,1,'asset retained');
  const a=before.items[0],b=after.items[0],travel=Math.hypot(b.x-a.x,b.y-a.y);
  console.log(name,'before',a.x,a.y,'after',b.x,b.y,'travel',travel.toFixed(3));
  assert(travel>0.3,'the image must move, not merely gain a selection outline');
  assert.deepEqual(errors,[],'no runtime exceptions');
  completed++;
  console.log('PASS',name);
 }finally{await context.close()}
}
try{
 await run('desktop mouse drag small 8px with snapping on',{touch:false,doodle:false},[8,7]);
 await run('Android touch drag short 8px with snapping on',{touch:true,doodle:false},[8,7]);
 await run('Android touch drag longer 45px with snapping on',{touch:true,doodle:false},[45,20]);
 await run('Android Doodle drag 12px with snapping on',{touch:true,doodle:true},[12,9]);
 console.log('PASS all',completed,'real-pointer input regressions');
}finally{await browser.close()}
