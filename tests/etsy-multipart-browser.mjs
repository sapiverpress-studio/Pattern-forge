import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const browser=await chromium.launch({headless:true,channel:'chrome'});
const dir=await mkdtemp(path.join(os.tmpdir(),'pf-full-png-'));
try{
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  const data=await page.evaluate(async()=>{
    const width=5000,height=5000,canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d'),rgba=ctx.createImageData(width,height),pixels=rgba.data;
    let seed=0x43be3a21;
    for(let i=0;i<pixels.length;i+=4){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      pixels[i]=(seed&31)*8;
      pixels[i+1]=((seed>>>5)&31)*8;
      pixels[i+2]=((seed>>>10)&63)*4;
      pixels[i+3]=255;
    }
    ctx.putImageData(rgba,0,0);
    const original=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not encode test PNG')),'image/png'));
    if(original.size<20_000_000||original.size>74_000_000)throw Error('Test PNG must need 2–4 parts: '+original.size);
    const name='sapiver-full-resolution-test.png';
    const result=await window.PatternForgeMultipart.makeParts(original,name,{wPx:width,hPx:height,dpi:300});
    const docs=[{name:'README.txt',blob:new Blob(['See REBUILD-PNG.html for offline recovery.'])},{name:'LICENSE.txt',blob:new Blob(['Personal use.'])},{name:'ABOUT-SAPIVER-PRINTS.txt',blob:new Blob(['Sapiver Prints.'])}];
    const archives=[];
    for(let i=0;i<result.parts.length;i++){
      const part=result.parts[i],zip=await window.PatternForgeEtsyBridge.makeZip([{name:part.name,blob:part.blob},...docs]);
      if(zip.size>=20_000_000)throw Error('Buyer PNG part ZIP exceeds Etsy limit');
      archives.push({name:'part-'+String(i+1).padStart(2,'0')+'.zip',blob:zip});
    }
    const extras=await window.PatternForgeEtsyBridge.makeZip([
      {name:'PNG-REASSEMBLY.json',blob:new Blob([JSON.stringify(result.manifest)])},
      {name:'REBUILD-PNG.html',blob:result.html},...docs
    ]);
    if(extras.size>=20_000_000)throw Error('Extras ZIP exceeds Etsy limit');
    archives.push({name:'extras.zip',blob:extras});
    window.__fullTest={archives,html:result.html};
    return {originalBytes:original.size,partCount:result.parts.length,manifest:result.manifest,zipSizes:archives.map(a=>a.blob.size)};
  });
  assert.ok(data.partCount>=2&&data.partCount<=4);
  assert.ok(data.zipSizes.every(n=>n<20_000_000));
  const downloads=[];
  for(let i=0;i<data.partCount;i++){
    const dl=page.waitForEvent('download');
    await page.evaluate(i=>window.PatternForgeEtsyBridge.downloadBlob(window.__fullTest.archives[i].blob,window.__fullTest.archives[i].name),i);
    const file=await dl;
    const target=path.join(dir,file.suggestedFilename());
    await file.saveAs(target);
    downloads.push(target);
  }
  const htmlDownload=page.waitForEvent('download');
  await page.evaluate(()=>window.PatternForgeEtsyBridge.downloadBlob(window.__fullTest.html,'REBUILD-PNG.html'));
  const htmlFile=await htmlDownload,htmlPath=path.join(dir,'REBUILD-PNG.html');
  await htmlFile.saveAs(htmlPath);
  const restore=await browser.newPage({acceptDownloads:true});
  await restore.goto(pathToFileURL(htmlPath).href,{waitUntil:'load'});
  await restore.locator('#files').setInputFiles(downloads);
  const complete=restore.waitForEvent('download',{timeout:180000});
  await restore.locator('#build').click();
  const originalDownload=await complete;
  const assembled=await readFile(await originalDownload.path());
  assert.equal(originalDownload.suggestedFilename(),data.manifest.filename);
  assert.equal(assembled.length,data.originalBytes);
  assert.equal(createHash('sha256').update(assembled).digest('hex'),data.manifest.sha256);
  assert.equal(assembled.readUInt32BE(16),5000);
  assert.equal(assembled.readUInt32BE(20),5000);
  assert.match(await restore.locator('#status').innerText(),/Verified full-resolution PNG/);
  console.log('PASS: actual '+data.originalBytes+'-byte PNG reconstructed byte-for-byte from '+data.partCount+' Etsy-size ZIP files using the offline buyer HTML on Android-size browser viewport.');
}finally{await browser.close();await rm(dir,{recursive:true,force:true});}
