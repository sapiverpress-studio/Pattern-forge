import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const BASE=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('a[href="/knit/"]').count(),1);
 await page.goto(BASE+'/knit/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('engine ready'),null,{timeout:45000});
 const test=await page.evaluate(async()=>{
  const mod=await import('/knit/engine.mjs');
  const source=await (await fetch('/knit/engine.mjs')).text();
  if(['PHOTO_ASSETS','seamFinish','loadPhotoTextures'].some(marker=>source.includes(marker)))throw Error('Photo renderer still in use');
  const results=[];
  for(const style of mod.STYLES)for(const gauge of mod.GAUGES){
   const s={style,gauge,yarn:'#a4b7ce',contrast:'#f0d7a4',seed:7};
   const c=document.createElement('canvas');mod.renderKnit(c,s);
   const p=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1000,1000).data;
   if(p[3]!==255)throw Error('Unexpected transparent knit');
   let horiz=0,vert=0;
   for(let i=0;i<1000;i++)for(let k=0;k<3;k++){
    horiz+=Math.abs(p[(i*1000)*4+k]-p[(i*1000+999)*4+k]);
    vert+=Math.abs(p[i*4+k]-p[(999*1000+i)*4+k]);
   }
   const diffH=horiz/3000,diffV=vert/3000;
   if(diffH>19||diffV>19)throw Error(style+'/'+gauge+' discontinuous boundary: '+diffH+', '+diffV);
   results.push({style,gauge,diffH,diffV});
  }
  if(mod.stitchAt({style:'fairisle',gauge:'chunky'},0,3).yarn===mod.stitchAt({style:'fairisle',gauge:'chunky'},0,0).yarn)throw Error('Fair Isle chart did not change individual stitch colours');
  if(mod.stitchAt({style:'seed',gauge:'chunky'},0,0).type===mod.stitchAt({style:'seed',gauge:'chunky'},0,1).type)throw Error('Seed chart incorrect');
  if(mod.stitchAt({style:'rib',gauge:'chunky'},0,1).type===mod.stitchAt({style:'rib',gauge:'chunky'},0,2).type)throw Error('Rib chart incorrect');
  return results;
 });
 console.log('20 pattern/gauge seam tests',test);
 for(const style of ['stockinette','rib','seed','cable','fairisle']){
  await page.locator('#knitStyle').selectOption(style);
  await page.waitForTimeout(250);
  await page.locator('#preview').screenshot({path:'knit-v4-'+style+'.png'});
  if(style==='fairisle'){
   await page.locator('#repeatView').click();
   await page.locator('#preview').screenshot({path:'knit-v4-fairisle-repeat.png'});
  }
 }
 assert.equal(await page.locator('#gauge').inputValue(),'superchunky');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const dlWait=page.waitForEvent('download',{timeout:180000});
 await page.locator('#downloadPng').click();const d=await dlWait;const b=await readFile(await d.path());
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(b.readUInt32BE(16),5000);assert.equal(b.readUInt32BE(20),5000);
 let metadata=false,p=8;while(p<b.length){const len=b.readUInt32BE(p),name=b.toString('ascii',p+4,p+8);
  if(name==='pHYs'){metadata=true;assert.equal(b.readUInt32BE(p+8),11811);}
  p+=12+len;if(name==='IEND')break;
 }
 assert(metadata&&p===b.length);
 assert.deepEqual(errors,[]);
 console.log('PASS 5 geometrical knit styles × 4 gauges; PNG export and mobile controls');
}finally{await browser.close()}