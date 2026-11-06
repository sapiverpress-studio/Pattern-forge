import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('a[href="/knit/"]').count(),1);
 await page.goto(base+'/knit/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Material ready'),{timeout:30000});
 assert(await page.locator('#preview').evaluate(x=>x.width===720));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');
 for(const style of ['stockinette','rib','seed','cable','fairisle']){
   await page.locator('#knitStyle').selectOption(style);
   await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Material ready'),null,{timeout:25000});
   await page.locator('#singleView').click();
   await page.locator('#preview').screenshot({path:'knit-v5-'+style+'.png'});
   await page.locator('#repeatView').click();
   await page.locator('#preview').screenshot({path:'knit-v5-'+style+'-repeat.png'});
   if(style==='fairisle')assert(await page.locator('#navyWrap').isVisible());
 }

 const {tileResults,seams}=await page.evaluate(async()=>{
   const m=await import('/knit/engine.mjs');
   await m.loadPhotoTextures();
   const all=[],seams=[];
   for(const style of m.STYLES)for(const gauge of ['megachunky','superchunky','chunky','medium','fine']){
     const c=document.createElement('canvas');
     m.renderKnit(c,{style,gauge,yarn:'#a4b7cc',contrast:'#efd0a5',navy:'#25385b'});
     const ctx=c.getContext('2d',{willReadFrequently:true}),a=ctx.getImageData(0,0,m.TILE_SIZE,m.TILE_SIZE).data;
     let h=0,v=0;
     for(let i=0;i<m.TILE_SIZE;i++)for(let ch=0;ch<3;ch++){
       h+=Math.abs(a[(i*m.TILE_SIZE)*4+ch]-a[(i*m.TILE_SIZE+m.TILE_SIZE-1)*4+ch]);
       v+=Math.abs(a[i*4+ch]-a[((m.TILE_SIZE-1)*m.TILE_SIZE+i)*4+ch]);
     }
     const avgH=h/(m.TILE_SIZE*3),avgV=v/(m.TILE_SIZE*3);
     if(avgH>13||avgV>13)throw Error(style+'/'+gauge+' seam too large '+avgH+' '+avgV);
     if(a[3]!==255)throw Error('Unexpected transparent pixel');
     all.push({style,gauge,avgH,avgV});
   }
   return {tileResults:all.length,seams:all};
 });
 assert.equal(tileResults,25);
 console.log('25 source-tile seam tests',tileResults,seams);
 await page.locator('#knitStyle').selectOption('stockinette');
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Material ready'));
 // Mega Chunky magnifies the actual source and cannot be tiled seamlessly.
 await page.locator('#gauge').selectOption('megachunky');
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Mega Chunky close-up ready'));
 assert(await page.locator('#repeatView').isDisabled(),'Mega Chunky repeat must be disabled');
 const mega=await page.locator('#preview').evaluate(x=>x.toDataURL().slice(-300));
 await page.locator('#preview').screenshot({path:'knit-v5-megachunky.png'});
 await page.locator('#gauge').selectOption('superchunky');
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Material ready'));
 assert(!(await page.locator('#repeatView').isDisabled()),'Normal repeat remains available');
 const regular=await page.locator('#preview').evaluate(x=>x.toDataURL().slice(-300));
 assert.notEqual(mega,regular,'Mega Chunky must magnify the close-up');
 const before=await page.locator('#preview').evaluate(x=>x.toDataURL().slice(-250));
 await page.locator('#yarn').evaluate(x=>{x.value='#a05588';x.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Material ready'));
 const after=await page.locator('#preview').evaluate(x=>x.toDataURL().slice(-250));
 assert.notEqual(before,after,'Colour control must change pixels');
 const promise=page.waitForEvent('download',{timeout:180000});
 await page.locator('#downloadPng').click();
 const dl=await promise,bin=await readFile(await dl.path());
 assert.equal(bin.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bin.readUInt32BE(16),5000);assert.equal(bin.readUInt32BE(20),5000);
 let offset=8,phys=false;while(offset<bin.length){
   const length=bin.readUInt32BE(offset),type=bin.toString('ascii',offset+4,offset+8);
   if(type==='pHYs'){phys=true;assert.equal(bin.readUInt32BE(offset+8),11811);}
   offset+=length+12;if(type==='IEND')break;
 }
 assert(phys&&offset===bin.length,'PNG complete with DPI metadata');
 // A synthetic two-colour material must fill one enlarged close-up, not
 // repeat as a periodic square grid every 1250 pixels.
 const closeupSamples=await page.evaluate(async()=>{
   const m=await import('/knit/engine.mjs');
   const source=document.createElement('canvas');
   source.width=source.height=250;
   const ctx=source.getContext('2d');
   ctx.fillStyle='#f00000';ctx.fillRect(0,0,125,250);
   ctx.fillStyle='#0000f0';ctx.fillRect(125,0,125,250);
   const bitmap=await createImageBitmap(await m.exportPng(source,'superchunky'));
   const sample=x=>{
     const c=document.createElement('canvas');
     c.width=c.height=1;
     const g=c.getContext('2d');
     g.drawImage(bitmap,x,200,1,1,0,0,1,1);
     return [...g.getImageData(0,0,1,1).data];
   };
   const first=sample(250),last=sample(4750);
   bitmap.close();
   return {first,last};
 });
 assert(closeupSamples.first[0]>210&&closeupSamples.first[2]<40,'Single close-up starts with left yarn');
 assert(closeupSamples.last[2]>210&&closeupSamples.last[0]<40,'Single close-up ends with right yarn, not a repeat');
 assert.deepEqual(errors,[],'No JS page errors');
 console.log('PASS 5 styles x 5 gauges / Mega Chunky UI / mobile / 5000 close-up PNG / DPI');
}finally{await browser.close()}