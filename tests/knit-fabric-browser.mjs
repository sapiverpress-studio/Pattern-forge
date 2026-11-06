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
 const {tileResults,seams}=await page.evaluate(async()=>{
   const m=await import('/knit/engine.mjs');
   await m.loadPhotoTextures();
   const all=[],seams=[];
   for(const style of m.STYLES)for(const gauge of ['superchunky','chunky','medium','fine']){
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
 console.log('20 seam tests',tileResults,seams);
 for(const style of ['stockinette','rib','seed','cable','fairisle']){
   await page.locator('#knitStyle').selectOption(style);
   await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Material ready'),null,{timeout:25000});
   await page.locator('#singleView').click();
   await page.locator('#preview').screenshot({path:'knit-v5-'+style+'.png'});
   await page.locator('#repeatView').click();
   await page.locator('#preview').screenshot({path:'knit-v5-'+style+'-repeat.png'});
   if(style==='fairisle')assert(await page.locator('#navyWrap').isVisible());
 }
 await page.locator('#knitStyle').selectOption('stockinette');
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Material ready'));
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
 assert.deepEqual(errors,[],'No JS page errors');
 console.log('PASS 5 styles x 4 gauges / mobile / 5000 PNG / DPI');
}finally{await browser.close()}