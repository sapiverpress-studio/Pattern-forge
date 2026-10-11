import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const output='/tmp/pattern-forge-actual-seller-kit.zip';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 let captured=false;
 await context.route('**/capture-real-seller-kit',async route=>{
   const bytes=route.request().postDataBuffer();
   fs.writeFileSync(output,bytes);
   captured=true;
   await route.fulfill({status:200,contentType:'text/plain',body:'stored'});
 });
 const page=await context.newPage();
 page.setDefaultTimeout(25000);
 await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'domcontentloaded'});
 await page.locator('#projectTypeInput').selectOption('pattern');
 await page.locator('#projectTitleInput').fill('Verified Autumn Pattern');
 await page.locator('#projectRepeatStyle').selectOption('straight');
 await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 await page.locator('[data-tool="brush"]').first().evaluate(el=>el.click());
 const box=await page.locator('#editorCanvas').boundingBox();
 assert.ok(box&&box.width>50&&box.height>50,'Drawing canvas missing');
 await page.mouse.move(box.x+box.width*.48,box.y+box.height*.48);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.54,box.y+box.height*.53,{steps:9});
 await page.mouse.up();
 const prepared=await page.evaluate(async()=>{
   const output=await window.PatternForgeEtsy.prepare({download:false,returnKit:true});
   if(!output?.success)return {success:false,error:output?.error,blockers:output?.blockers};
   const response=await fetch('/capture-real-seller-kit',{method:'POST',headers:{'Content-Type':'application/zip'},body:output.kitBlob});
   if(!response.ok)throw Error('Browser seller-kit capture failed');
   return {success:true,size:output.kitBlob.size,buyerPackages:output.buyerPackages,listingImages:output.listingImages,checks:output.checks,vectorIncluded:output.vectorIncluded};
 });
 if(!prepared.success)throw Error('Actual editor seller-kit export was blocked: '+JSON.stringify(prepared.blockers||prepared.error).slice(0,2000));
 assert.ok(captured,'Browser never delivered seller ZIP');
 assert.equal(fs.statSync(output).size,prepared.size);
 assert.ok(prepared.buyerPackages.length>=1&&prepared.buyerPackages.length<=5);
 assert.equal(prepared.listingImages.length,3);
 assert.ok(prepared.checks.every(x=>x.state!=='fail'));
 execFileSync('unzip',['-t',output],{stdio:'pipe'});
 const outer=execFileSync('unzip',['-Z','-1',output],{encoding:'utf8'}).trim().split('\n');
 const buyers=outer.filter(n=>n.startsWith('UPLOAD-TO-ETSY/')&&n.endsWith('.zip'));
 const gallery=outer.filter(n=>n.startsWith('LISTING-IMAGES/')&&n.endsWith('.jpg'));
 assert.equal(buyers.length,prepared.buyerPackages.length);
 assert.equal(gallery.length,3);
 assert.ok(outer.includes('SELLER-CHECKLIST.txt'));
 assert.ok(outer.includes('QUALITY-CHECK.txt'));
 for(const [i,name] of buyers.entries()){
   const inner='/tmp/pattern-forge-buyer-'+i+'.zip';
   fs.writeFileSync(inner,execFileSync('unzip',['-p',output,name],{maxBuffer:25000000}));
   execFileSync('unzip',['-t',inner],{stdio:'pipe'});
   const files=execFileSync('unzip',['-Z','-1',inner],{encoding:'utf8'});
   assert.match(files,/\.png/);
   assert.match(files,/\.jpg/);
   assert.match(files,/README\.txt/);
   assert.match(files,/LICENSE\.txt/);
   assert.ok(fs.statSync(inner).size<=20000000,'Etsy buyer ZIP too large');
 }
 console.log('PASS real Pattern Forge product: checked seamless export, '+prepared.buyerPackages.length+' valid buyer ZIP(s), three gallery images, readable nested archives, no failed quality checks');
 await context.close();
}finally{await browser.close()}
