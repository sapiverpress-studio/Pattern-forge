import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

function assert(condition,message){if(!condition)throw Error(message);}
function near(a,b,d=1){return Math.abs(a-b)<=d;}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:980,height:880},acceptDownloads:true}),errors=[];
page.on('pageerror',err=>errors.push(String(err)));
const sample=async({forExport=true}={})=>page.evaluate(async forExport=>{
  const bridge=window.PatternForgeEtsyBridge;
  const canvas=bridge.makeTileCanvas(90,90,90,90,bridge.getRepeatStyle(),forExport);
  const rgba=Array.from(canvas.getContext('2d').getImageData(0,0,1,1).data);
  canvas.width=1;canvas.height=1;return rgba;
},forExport);
const output=async()=>page.evaluate(async()=>{
  const bridge=window.PatternForgeEtsyBridge,answer=await bridge.renderPNGBlob();
  if(!answer?.blob)throw Error('Missing PNG');
  const bitmap=await createImageBitmap(answer.blob),c=document.createElement('canvas');
  c.width=1;c.height=1;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  const pixel=(x,y)=>{ctx.clearRect(0,0,1,1);ctx.drawImage(bitmap,x,y,1,1,0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);};
  const bytes=new Uint8Array(await answer.blob.slice(0,70).arrayBuffer());
  const result={width:bitmap.width,height:bitmap.height,alphaCorner:pixel(0,0),motifCentre:pixel(Math.floor(bitmap.width/2),Math.floor(bitmap.height/2)),bytesHead:Array.from(bytes),svg:await bridge.renderSVGBlob().text()};
  bitmap.close();return result;
});
try{
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Transparency validation');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('#bg').fill('#112233');
  await page.locator('#bg').dispatchEvent('input');
  assert(!await page.locator('#transparent').isChecked(),'Canvas preview should be opaque by default');
  assert(await page.locator('#exportTransparent').isChecked(),'Export should default to transparent');
  await page.locator('#files').setInputFiles({name:'transparent-symbol.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="45" fill="#fe4533"/></svg>')});
  await page.waitForFunction(()=>window.PatternForgeEtsyBridge.state.items.length===1);
  const preview=await sample({forExport:false});
  assert(preview[3]===255 && near(preview[0],17) && near(preview[1],34)&&near(preview[2],51),'Editor preview colour unexpectedly altered: '+preview);
  const transparent=await output();
  assert(transparent.width===5000&&transparent.height===5000,'Master dimensions unexpectedly altered');
  assert(transparent.alphaCorner[3]===0,'Transparent PNG top left pixel alpha is not zero: '+transparent.alphaCorner);
  assert(transparent.motifCentre[3]===255,'Opaque motif disappeared: '+transparent.motifCentre);
  assert(!transparent.svg.includes('<rect width="5000" height="5000" fill="#112233"'),'Transparent SVG still contains coloured page rectangle');
  assert(transparent.bytesHead[25]===6,'PNG colour type is not RGBA (type 6): '+transparent.bytesHead[25]);
  assert(transparent.bytesHead.some((v,i,arr)=>v===112&&arr[i+1]===72&&arr[i+2]===89&&arr[i+3]===115),'300 DPI pHYs metadata missing');
  assert((await sample({forExport:false}))[3]===255,'Editor preview changed after exporting transparent output');
  await page.locator('[data-ux2-panel="export"]').click();
  assert(await page.locator('#ux2ExportTransparent').isChecked(),'Mobile export drawer not synced');
  await page.locator('#ux2ExportTransparent').uncheck();
  assert(!await page.locator('#exportTransparent').isChecked(),'Mobile export toggle did not update source control');
  const opaque=await output();
  assert(opaque.alphaCorner[3]===255,'Opaque requested export not opaque: '+opaque.alphaCorner);
  assert(near(opaque.alphaCorner[0],17)&&near(opaque.alphaCorner[1],34)&&near(opaque.alphaCorner[2],51),'Opaque export used wrong canvas background: '+opaque.alphaCorner);
  assert(opaque.svg.includes('fill="#112233"'),'Explicit opaque SVG missing background');
  await page.locator('#ux2ExportTransparent').check();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportZip').evaluate(el=>el.click())]);
  const zip=await readFile(await download.path());
  const name=download.suggestedFilename();
  assert(name.endsWith('.zip'),'Download bundle was not ZIP: '+name);
  const pngSignature=Buffer.from('89504e470d0a1a0a','hex'),offset=zip.indexOf(pngSignature);
  assert(offset!==-1,'ZIP missing the seamless master PNG');
  assert(zip[offset+25]===6,'ZIP master PNG lost alpha colour type');
  const snap=await page.evaluate(()=>window.PatternForgeEtsyBridge.state);
  assert(snap.items.length===1,'Export ZIP modified design');
  assert(errors.length===0,'Browser console/page errors: '+errors.join(' | '));
  console.log('PASS: transparent 5000px PNG RGBA alpha pixel, preserved opaque preview, SVG backgrounds, optional opaque export, UX2 control, ZIP master PNG and 300 DPI.');
}finally{await browser.close();}
