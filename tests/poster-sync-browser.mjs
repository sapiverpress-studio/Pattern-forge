import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const PAT='https://sapiver-pattern-forge.netlify.app', POST='https://sapiver-poster-gen-auth.netlify.app';
const patternScript=fs.readFileSync('app/js/poster-sync.js','utf8');
const receiverScript=fs.readFileSync('/tmp/poster-receiver-handoff.mjs','utf8');
const PROJECT='pf-project-mgkk1122-abcd123',PRODUCT='Z'.repeat(32),kitName='sapiver-autumn-leaves-etsy-kit.zip';
const appHtml='<!doctype html><html><meta charset="utf-8"><button id="send">Send to Sapiver Prints</button><output id="status"></output>'+
'<script>window.PatternForgeEtsyBridge={state:{project:{id:"'+PROJECT+'",title:"Autumn Leaves"}},setStatus(s){document.querySelector("#status").textContent=s}};'+
'window.mockEtsy={check(){return [{state:"pass"}]},async prepare(o){if(o.download!==false||o.returnKit!==true)throw Error("Wrong export options");return {success:true,kitName:"'+kitName+'",kitBlob:new Blob([new Uint8Array(8192).fill(77)],{type:"application/zip"})}}};</script>'+
'<script src="/app/js/poster-sync.js"></script><script>document.querySelector("#send").addEventListener("click",async()=>{try{await PatternForgePosterSync.send(window.mockEtsy)}catch(e){document.querySelector("#status").textContent=e.message}})</script></html>';
const loginHtml='<!doctype html><html><meta charset="utf-8"><h1>Owner sign in</h1><form action="/poster/upload"><button id="login">Open private product studio</button></form></html>';
const formHtml='<!doctype html><html><head><meta charset="utf-8"><meta name="poster-csrf" content="integration-csrf"></head><body>'+
'<form id="poster-upload-form"><label>Type<select name="type"><option value="physical" selected>Physical</option><option value="digital">Digital</option></select></label>'+
'<div data-physical><input name="referenceListingId"></div><input name="poster" type="file"><div data-digital>'+
'<input name="previews" type="file" multiple><label><input type="checkbox" name="useEmbeddedText">Embedded docs</label>'+
'<label>Price<input name="price" type="number" min=".20" step=".01" required></label><label><input name="seamlessConfirmed" type="checkbox">Seamless</label>'+
'<textarea name="licence"></textarea><textarea name="instructions"></textarea></div>'+
'<input name="name"><input name="subject"><select name="kind"><option data-type="physical" value="educational" selected>Physical</option>'+
'<option data-type="digital" value="pattern">Pattern</option><option data-type="digital" value="poster">Poster</option></select>'+
'<input name="tags"><select name="taxonomyId"><option value="">Auto</option></select>'+
'<button id="prepare" type="submit">Prepare my product</button></form><p id="upload-status" role="status"></p>'+
'<script src="/poster-upload.mjs"></script></body></html>';
const browser=await chromium.launch({headless:true});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  let loggedIn=false;const creates=[],chunks=[],finishes=[],bad=[],errors=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url()),method=request.method();
   const reply=(status,body,type='text/html')=>route.fulfill({status,contentType:type,headers:{'Cache-Control':'no-store'},body});
   if(url.origin===PAT){
    if(url.pathname==='/app/js/poster-sync.js')return reply(200,patternScript,'application/javascript');
    if(url.pathname==='/app/')return reply(200,appHtml);
   }
   if(url.origin===POST){
    if(url.pathname==='/poster/upload' && method==='GET' && !url.search){
      if(!loggedIn)return route.fulfill({status:303,headers:{Location:'/poster/workflow'},body:''});
      return reply(200,formHtml);
    }
    if(url.pathname==='/poster/workflow'){loggedIn=true;return reply(200,loginHtml);}
    if(url.pathname==='/poster-upload.mjs')return reply(200,receiverScript,'application/javascript');
    if(url.pathname==='/poster/uploads' && method==='POST'){
      creates.push(request.postDataJSON());
      if(request.headers()['x-poster-csrf']!=='integration-csrf')bad.push('No CSRF');
      return reply(201,JSON.stringify({id:PRODUCT,chunkBytes:3000,phase:'uploading'}),'application/json');
    }
    if(url.pathname.startsWith('/poster/uploads/'+PRODUCT+'/chunks/') && method==='PUT'){
      chunks.push(request.postDataBuffer());return reply(200,'{"stored":true}','application/json');
    }
    if(url.pathname==='/poster/uploads/'+PRODUCT+'/finish' && method==='POST'){
      finishes.push(1);return reply(202,'{"phase":"preparing"}','application/json');
    }
    if(url.pathname==='/poster/upload'&&method==='GET'&&url.searchParams.has('id'))return reply(200,'<!doctype html><h1>Private preparation queued</h1>');
    if(url.pathname==='/favicon.ico')return reply(200,'');
   }
   bad.push(method+' '+url.href);return reply(404,'Not mocked');
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(PAT+'/app/',{waitUntil:'load'});
  for(let pass=0;pass<2;pass++){
   const popupPromise=page.waitForEvent('popup',{timeout:15000});
   await page.locator('#send').click();
   const popup=await popupPromise;
   popup.on('pageerror',e=>errors.push(String(e)));
   await popup.waitForLoadState('load');
   if(pass===0){await popup.locator('#login').click();await popup.waitForURL('**/poster/upload');}
   await popup.waitForSelector('#pattern-handoff-status',{timeout:25000});
   await popup.waitForFunction(()=>document.querySelector('input[name=poster]')?.files?.length===1,null,{timeout:25000});
   const file=await popup.locator('input[name=poster]').evaluate(el=>({name:el.files[0].name,size:el.files[0].size}));
   assert.equal(file.name,kitName);assert.equal(file.size,8192);
   assert.equal(await popup.locator('[name=type]').inputValue(),'digital');
   assert.equal(await popup.locator('[name=kind]').inputValue(),'pattern');
   assert.equal(await popup.locator('[name=price]').inputValue(),'');
   assert.equal(await popup.locator('[name=seamlessConfirmed]').isChecked(),false);
   assert.equal(await popup.locator('[name=useEmbeddedText]').isChecked(),true);
   await popup.locator('[name=price]').fill('3.95');
   await popup.locator('[name=seamlessConfirmed]').check();
   await popup.locator('#prepare').click();
   await popup.waitForURL('**/poster/upload?id=*',{timeout:30000});
   await page.waitForFunction(key=>localStorage.getItem(key)?.includes('ZZZZZZ'),'patternForgePosterProduct/v1/'+PROJECT,{timeout:30000});
  }
  assert.equal(creates.length,2);
  assert.equal(creates[0].updateProductId,null);
  assert.equal(creates[1].updateProductId,PRODUCT);
  assert.equal(creates[0].type,'digital');
  assert.equal(creates[1].metadata.price,'3.95');
  assert.equal(creates[0].metadata.seamlessConfirmed,true);
  assert.equal(chunks.length,6);
  assert.equal(finishes.length,2);
  assert.deepEqual(bad,[],'Unexpected network calls');
  assert.deepEqual(errors,[],'Browser exceptions');
  console.log('PASS',mobile?'mobile':'desktop','real Chromium: cross-origin popup, owner login redirect, browser File, private CSRF upload, product revision');
  await context.close();
 }
}finally{await browser.close()}
