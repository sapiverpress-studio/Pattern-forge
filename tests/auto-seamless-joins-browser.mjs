import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const browser=await chromium.launch({executablePath:process.env.PF_CHROME||undefined,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// This suite checks image pixels, not listing generation; no provider calls.
await page.route('**/api/auto-seamless-listing',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Offline image-check test"}'}));
try{
 await page.goto('http://127.0.0.1:4185/auto-seamless/',{waitUntil:'load'});
 await page.locator('#readyMode').click();
 const make=broken=>page.evaluate(broken=>{
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d'),im=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const v=128+20*Math.sin(x*Math.PI/32)+18*Math.cos(y*Math.PI/32),p=(y*512+x)*4;
   im.data.set([v,v+12,v-10,broken&&(y===171||y===342)?0:255],p);
  }
  ctx.putImageData(im,0,0);return c.toDataURL('image/png').split(',')[1];
 },broken);
 const clean=Buffer.from(await make(false),'base64');
 await page.locator('#upload').setInputFiles({name:'clean-fabric.png',mimeType:'image/png',buffer:clean});
 await page.waitForFunction(()=>!state.busy&&!!state.seamReport);
 assert.equal(await page.evaluate(()=>state.seamReport.pass),true);
 assert.match(await page.locator('#seamCheck').textContent(),/visually before sale/);
 const broken=Buffer.from(await make(true),'base64');
 await page.locator('#upload').setInputFiles({name:'broken-fabric.png',mimeType:'image/png',buffer:broken});
 await page.waitForFunction(()=>!state.busy&&!!state.seamReport);
 const report=await page.evaluate(()=>state.seamReport);
 assert.equal(report.leftRight.suspicious,false,'Matching outside edges must not hide internal gaps');
 assert.equal(report.topBottom.suspicious,false);
 assert.equal(report.pass,false);
 for(const row of [171,342])assert.ok(report.interior.horizontal.some(l=>Math.abs(l.position-row)<=4));
 assert.equal(await page.locator('#scoreFact').textContent(),'Inspect joins');
 assert.match(await page.locator('#seamCheck').textContent(),/inside the artwork/);
 assert.ok(await page.locator('#showSeamGuides').isChecked());
 const guides=await page.evaluate(()=>document.querySelector('#preview').toDataURL());
 await page.locator('#showSeamGuides').uncheck();
 assert.notEqual(await page.evaluate(()=>document.querySelector('#preview').toDataURL()),guides);
 const wait=page.waitForEvent('download');await page.locator('#downloadTile').click();
 assert.deepEqual(readFileSync(await(await wait).path()),broken,'Guides must never change delivered artwork bytes');
 await page.locator('#detectMode').click();
 await page.waitForFunction(()=>!state.busy&&!!state.seamReport);
 assert.equal(await page.evaluate(()=>state.seamReport.interior.suspicious),true,'Make Seamless must inspect the resulting interior too');
 await page.locator('#commercialReviewConfirmed').check();
 await page.locator('#blend').evaluate(el=>{el.value='7';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#commercialReviewConfirmed').isChecked(),false,'A changed crop/blend requires a fresh review');
 if(process.env.PF_JOIN_SOURCE){
  await page.locator('#readyMode').click();
  await page.locator('#upload').setInputFiles({name:'owner-source.webp',mimeType:'image/webp',buffer:readFileSync(process.env.PF_JOIN_SOURCE)});
  await page.waitForFunction(()=>!state.busy&&!!state.seamReport);
  const lines=await page.evaluate(()=>state.seamReport.interior.horizontal);
  for(const row of [512,1024])assert.ok(lines.some(l=>Math.abs(l.position-row)<=4));
 }
 assert.deepEqual(errors,[]);
 console.log('PASS interior joins: matching borders, clean fabric control, internal gaps in both modes, preview-only guides and fresh-review reset');
}finally{await browser.close();}
