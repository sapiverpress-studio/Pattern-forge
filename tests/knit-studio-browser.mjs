import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const page=await browser.newPage({viewport:{width:385,height:840},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4185/knit-studio/';
await page.goto(base,{waitUntil:'load',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'),null,{timeout:30000});
assert.equal(await page.locator('#downloadPng').isDisabled(),false);
// Inspect multiple pixels and WAIT for a real new frame; old status text
// can still say "ready" before the next animation frame is painted.
const fingerprint=()=>page.locator('#preview').evaluate(canvas=>{
 const c=canvas.getContext('2d');
 return [[41,42],[80,200],[260,320],[350,430],[599,550],[701,701]]
  .map(([x,y])=>Array.from(c.getImageData(x,y,1,1).data).join(',')).join('|');
});
const waitChanged=previous=>page.waitForFunction(expected=>{
 const c=document.querySelector('#preview').getContext('2d');
 const current=[[41,42],[80,200],[260,320],[350,430],[599,550],[701,701]]
  .map(([x,y])=>Array.from(c.getImageData(x,y,1,1).data).join(',')).join('|');
 return current!==expected;
},previous,{timeout:15000});
const first=await fingerprint();
await page.locator('[data-palette="sage"]').click();
await waitChanged(first);
const second=await fingerprint();
assert.notEqual(first,second,'Yarn colour must change live design');
await page.locator('#gauge').selectOption('chunky');
await waitChanged(second);
const third=await fingerprint();
assert.notEqual(second,third,'Stitch size must change live design');
for(const style of ['stockinette','rib','seed','cable','fairisle']){
 await page.locator('#style').selectOption(style);
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'),null,{timeout:30000});
 const pixel=await page.locator('#preview').evaluate(x=>Array.from(x.getContext('2d').getImageData(360,360,1,1).data).slice(0,3));
 assert.ok(pixel.some(ch=>ch>18),style+' preview blank');
}
await page.locator('#style').selectOption('cable');
await page.locator('#gauge').selectOption('mega');
await page.locator('[data-palette="cream"]').click();
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'));
await page.locator('#repeatView').click();
assert.equal(await page.locator('#repeatView').getAttribute('aria-pressed'),'true');
await page.screenshot({path:'knit-studio-mobile-repeat.png',fullPage:true});
await page.locator('#tileView').click();
await page.screenshot({path:'knit-studio-mobile-single.png',fullPage:true});
await page.locator('#closeView').click();
assert.equal(await page.locator('#closeView').getAttribute('aria-pressed'),'true');
await page.locator('#tileView').click();
const oldJson=page.waitForEvent('download');
await page.locator('#saveSettings').click();
const jsonDownload=await oldJson;
const saved=JSON.parse(await fs.readFile(await jsonDownload.path(),'utf8'));
assert.equal(saved.format,'sapiver-wool-seamless-v1');
assert.equal(saved.style,'cable');
const px=await page.locator('#miniPreview').evaluate(x=>Array.from(x.getContext('2d').getImageData(45,45,1,1).data));
assert.equal(px[3],255);
assert.equal(errors.length,0,errors.join(' | '));
const bigDownload=page.waitForEvent('download',{timeout:120000});
await page.locator('#downloadPng').click();
const output=await bigDownload;
assert.ok(output.suggestedFilename().endsWith('-5000px-300dpi.png'));
await fs.copyFile(await output.path(),'knit-studio-check-5000.png');
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Downloaded one 5000'),null,{timeout:30000});
await browser.close();
console.log('PASS: five wool styles, palette/gauge, mobile views, JSON, 5000px PNG');
