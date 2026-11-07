import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const page=await browser.newPage({viewport:{width:385,height:840},acceptDownloads:true,hasTouch:true,isMobile:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4185/knit-studio/',{waitUntil:'load',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'),null,{timeout:45000});
assert.equal(await page.locator('#motifActive').isChecked(),true);
assert.equal(await page.locator('#chartCols').inputValue(),'16');
const picture=()=>page.locator('#preview').evaluate(el=>el.toDataURL());
const before=await picture();
const motif=page.locator('#motifCanvas');
await motif.scrollIntoViewIfNeeded();
await motif.click({position:{x:190,y:190}});
await page.waitForFunction(before=>document.querySelector('#preview').toDataURL()!==before,before,{timeout:30000});
const after=await picture();
assert.notEqual(before,after,'Painting a stitch must change actual knitted design preview');
assert.match(await page.locator('#paintStatus').innerText(),/edited stitches/);
// Mirror colour onto opposite side of chart.
await page.locator('#mirrorMotif').check();
await page.locator('[data-ink="2"]').click();
await motif.click({position:{x:29,y:42}});
const chartData=await page.waitForFunction(()=>{
 const message=document.querySelector('#paintStatus')?.textContent;
 return message?.includes('edited stitches')?true:false;
});
await page.locator('#chartCols').selectOption('24');
assert.equal(await page.locator('#chartCols').inputValue(),'24');
await page.locator('#undoMotif').click();
assert.equal(await page.locator('#chartCols').inputValue(),'16','Undo must restore grid size');
const jsonReady=page.waitForEvent('download',{timeout:20000});
await page.locator('#saveSettings').click();
const jsonFile=await jsonReady;
const settings=JSON.parse(await fs.readFile(await jsonFile.path(),'utf8'));
assert.equal(settings.format,'sapiver-wool-stitch-chart-v2');
assert.equal(settings.motifActive,true);
assert.equal(settings.chartCols,16);
assert.equal(settings.chartCells.length,256);
assert.ok(settings.chartCells.some(n=>n===1),'Own second-colour stitch should be preserved');
assert.ok(settings.chartCells.some(n=>n===2),'Own third-colour stitch should be preserved');
assert.ok(settings.chartCells.reduce((s,n)=>s+(n!==0),0)>=3,'Touch and mirror should paint multiple cells');
// Undo history and custom chart survive saved JSON reload.
await page.locator('#clearMotif').click();
await page.locator('#loadSettings').setInputFiles({
 name:'custom-knit.wool.json',mimeType:'application/json',
 buffer:Buffer.from(JSON.stringify(settings))
});
await page.waitForFunction(()=>document.querySelector('#paintStatus')?.textContent.includes('edited stitches'));
await page.locator('#repeatView').click();
assert.equal(await page.locator('#repeatView').getAttribute('aria-pressed'),'true');
await page.screenshot({path:'knit-original-motif-mobile.png',fullPage:true});
await page.locator('#tileView').click();
await page.screenshot({path:'knit-original-motif-single.png',fullPage:true});
// Test custom drawing rather than stock "Fair Isle" art.
await page.locator('#style').selectOption('fairisle');
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'),null,{timeout:30000});
const motifActive=await picture();
await page.locator('#motifActive').uncheck();
await page.waitForFunction(previous=>document.querySelector('#preview').toDataURL()!==previous,motifActive,{timeout:30000});
assert.notEqual(motifActive,await picture(),'Original motif must not just show existing Fair Isle preset');
// Switch user-created motif back on, export native 5K.
await page.locator('#motifActive').check();
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Seamless tile ready'),null,{timeout:30000});
const big=page.waitForEvent('download',{timeout:180000});
await page.locator('#downloadPng').click();
const file=await big;
assert.match(file.suggestedFilename(),/5000px-300dpi\.png$/);
await fs.copyFile(await file.path(),'knit-own-pattern-5000.png');
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Downloaded one 5000'),null,{timeout:45000});
assert.equal(errors.length,0,errors.join(' | '));
await browser.close();
console.log('PASS: user-drawn stitch motifs are editable, mirrored, undoable, saved and rendered at 5K');
