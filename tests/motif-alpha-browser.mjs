import { chromium } from 'playwright';
import { deflateSync } from 'node:zlib';
import fs from 'node:fs/promises';
const assert=(good,msg)=>{if(!good)throw Error(msg);};
function crc32(bytes){let c=0xffffffff;for(const v of bytes){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,bytes){const label=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([label,bytes])));return Buffer.concat([size,label,bytes,crc]);}
function png(kind,index=1,n=64){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(n,0);ihdr.writeUInt32BE(n,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc(n*(1+n*4));
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const offset=y*(1+n*4)+1+x*4,subject=x>18&&x<46&&y>18&&y<46;
    const v=kind==='checker'&&((Math.floor(x/8)+Math.floor(y/8))%2===0)?170:255;
    raw[offset]=subject?(index*45)%220:v;
    raw[offset+1]=subject?45:v;raw[offset+2]=subject?175:v;
    raw[offset+3]=subject?255:kind==='transparent'?0:255;
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
const errors=[];page.on('pageerror',err=>errors.push(String(err)));
const wait=()=>page.waitForTimeout(70);
try{
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Transparent motif inspector');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('#files').setInputFiles([
    {name:'white-box.png',mimeType:'image/png',buffer:png('solid',1)},
    {name:'real-alpha.png',mimeType:'image/png',buffer:png('transparent',2)},
    {name:'fake-checker.png',mimeType:'image/png',buffer:png('checker',3)}
  ]);
  await page.waitForFunction(()=>window.PatternForgeImageLibrary?.list().length===3);
  const before=await page.evaluate(()=>window.PatternForgeImageLibrary.list().map(({name,alpha})=>({name,type:alpha.type,canClean:alpha.canClean})));
  assert(before[0].type==='solid'&&before[0].canClean,'Solid background not detected: '+JSON.stringify(before));
  assert(before[1].type==='transparent'&&!before[1].canClean,'Real alpha not preserved: '+JSON.stringify(before));
  assert(before[2].type==='opaque'&&!before[2].canClean,'Baked checkerboard should not be silently erased: '+JSON.stringify(before));
  await page.locator('[data-ux2-action="image"]').click();
  await page.locator('#ux2ImageLibrary').waitFor({state:'visible'});
  assert((await page.locator('#ux2ImageLibrary .ux2-image-alpha').allTextContents()).some(s=>s.includes('Solid background detected')),
    'Android image library lacks clear alpha status');
  page.once('dialog',dlg=>dlg.accept());
  await page.locator('#ux2ImageLibrary button[aria-label^="Create a transparent copy of white-box"]').click();
  await page.waitForFunction(()=>window.PatternForgeImageLibrary.list().length===4);
  const after=await page.evaluate(()=>{
    const all=window.PatternForgeImageLibrary.list(),clean=all.find(a=>a.name.includes('transparent.png'));
    const st=window.PatternForgeEtsyBridge.state,original=all.find(a=>a.name==='white-box.png');
    const cv=document.createElement('canvas');cv.width=64;cv.height=64;
    const ctx=cv.getContext('2d',{willReadFrequently:true});
    const img=st.assets.find(a=>a.id===clean.id).img;ctx.drawImage(img,0,0,64,64);
    return {originalPreserved:!!original,cleanId:clean.id,alpha:clean.alpha,
      outside:[...ctx.getImageData(2,2,1,1).data],inside:[...ctx.getImageData(32,32,1,1).data],
      placed:st.items.map(a=>a.assetId)};
  });
  assert(after.originalPreserved,'Original image was overwritten');
  assert(after.alpha.transparent,'New PNG still opaque: '+JSON.stringify(after.alpha));
  assert(after.outside[3]===0,'Cleaned image still has opaque white box: '+after.outside);
  assert(after.inside[3]===255,'Solid-background clean damaged coloured object: '+after.inside);
  assert(after.placed.length===1&&after.placed[0]===after.cleanId,'Existing placement was not replaced with cleaned transparent motif');
  // Uploads through Pattern Remix should also be cleaned when explicitly requested.
  await page.locator('#motifSwapOpen').evaluate(el=>el.click());
  await page.locator('#motifSwapDialog').waitFor({state:'visible'});
  assert(await page.locator('#motifSwapScope').inputValue()==='fill','Whole layout should remain default');
  await page.locator('#motifSwapFiles').setInputFiles([{name:'remix-white.png',mimeType:'image/png',buffer:png('solid',4)}]);
  await page.waitForFunction(()=>document.querySelectorAll('.motifSwapFillRow').length===1);
  await page.locator('#motifSwapRemovePlain').check();
  await page.locator('#motifSwapApply').click();
  await page.locator('#motifSwapDialog').waitFor({state:'hidden',timeout:20000});
  const remix=await page.evaluate(()=>{
    const state=window.PatternForgeEtsyBridge.state;
    const a=state.assets.find(a=>String(a.id)===String(state.items[0].assetId));
    const details=window.PatternForgeAlpha.analyse(a.img);
    return {name:a.name,details,items:state.items.length};
  });
  assert(remix.items===1&&remix.details.transparent,'Opted-in cleanup did not produce transparent remixed motif: '+JSON.stringify(remix));
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('PASS: Android import alpha inspection, baked-checkerboard warning, original-preserving solid cleanup, cleaned placements, opted-in remix transparency.');
}finally{await browser.close();}
