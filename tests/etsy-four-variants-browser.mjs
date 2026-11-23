import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(String(error)));
try{
 await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
 await page.locator('#projectTitleInput').fill('Four colour integration');
 await page.locator('#createProject').click();
 await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 await page.locator('#files').setInputFiles({
   name:'train-motif.svg',mimeType:'image/svg+xml',
   buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="27" fill="#3b6a71"/></svg>')
 });
 await page.waitForFunction(()=>window.PatternForgeEtsyBridge.state.items.length===1);
 const before=await page.evaluate(()=>JSON.stringify({
   items:window.PatternForgeEtsyBridge.state.items,project:window.PatternForgeEtsyBridge.state.project
 }));
 const preflight=await page.evaluate(()=>window.PatternForgeEtsy.check());
 assert.ok(preflight.every(c=>c.state!=='fail'),JSON.stringify(preflight.filter(c=>c.state==='fail')));
 const downloadPromise=page.waitForEvent('download',{timeout:180000});
 const result=await page.evaluate(()=>window.PatternForgeEtsy.prepare({
   download:true,fourVariants:true,
   colours:['#f7eee2','#d6e7ec','#b9cdbe'],
   sizes:[1800,900],allowMultipartPng:true
 }));
 assert.equal(result.success,true,JSON.stringify(result));
 assert.equal(result.fourVariantsUsed,true);
 assert.equal(result.buyerPackages.length,4);
 assert.equal(result.colourSizes.length,3);
 assert.ok(result.colourSizes.every(pair=>pair[0].width===1800&&pair[1].width===900));
 assert.ok(result.buyerPackages.every(p=>p.size<=20_000_000));
 assert.equal(result.multipartPngUsed,false);
 assert.equal(result.designUnchanged,true);
 assert.equal(result.listingImages.length,4);
 const after=await page.evaluate(()=>JSON.stringify({
   items:window.PatternForgeEtsyBridge.state.items,project:window.PatternForgeEtsyBridge.state.project
 }));
 assert.equal(after,before,'Packaging must preserve original editable design');
 const sample=await page.evaluate(async()=>{
   const bridge=window.PatternForgeEtsyBridge;
   async function alpha(color){
     const png=await bridge.renderPNGBlob({
       backgroundMode:color?'solid':'transparent',
       backgroundColor:color||undefined,maxSide:900
     });
     const img=await createImageBitmap(png.blob),c=document.createElement('canvas');
     c.width=1;c.height=1;
     const ctx=c.getContext('2d',{willReadFrequently:true});
     ctx.drawImage(img,0,0,1,1,0,0,1,1);
     const pixel=[...ctx.getImageData(0,0,1,1).data];
     img.close();c.width=0;c.height=0;return pixel;
   }
   return {transparent:await alpha(null),solid:await alpha('#f7eee2')};
 });
 assert.equal(sample.transparent[3],0,'Transparent master needs actual clear background');
 assert.equal(sample.solid[3],255,'Solid variant must have opaque background');
 const dl=await downloadPromise,bytes=await readFile(await dl.path());
 assert.equal(dl.suggestedFilename(),result.kitName);
 const python=String.raw`
import io,sys,zipfile,struct,hashlib,json
outer=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert outer.testzip() is None
names=outer.namelist()
buyers=sorted(n for n in names if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip'))
assert len(buyers)==4,buyers
assert len([n for n in names if n.startswith('LISTING-IMAGES/') and n.endswith('.jpg')])==4
archives=[zipfile.ZipFile(io.BytesIO(outer.read(n))) for n in buyers]
allpng=[]
for z in archives:
 assert z.testzip() is None
 for d in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'):assert d in z.namelist()
 allpng.extend([(n,z.read(n)) for n in z.namelist() if n.endswith('.png')])
assert len(allpng)==7,[n for n,b in allpng]
assert sum(n.endswith('-seamless-master.png') for n,b in allpng)==1
sizes=[]
for n,png in allpng:
 assert png[:8]==b'\x89PNG\r\n\x1a\n'
 sizes.append((n,struct.unpack('>II',png[16:24])))
original=next(s for n,s in sizes if n.endswith('-seamless-master.png'))
assert original==(5000,5000),original
for c in ('f7eee2','d6e7ec','b9cdbe'):
 found=[(n,wh) for n,wh in sizes if '-colour-' in n and '-'+c+'-' in n]
 assert len(found)==2,found
 assert {wh for n,wh in found}=={(1800,1800),(900,900)},found
assert len({hashlib.sha256(p).hexdigest() for _,p in allpng})==7
manifestfiles=[z.read('SAPIVER-FOUR-VARIANTS.json') for z in archives if 'SAPIVER-FOUR-VARIANTS.json' in z.namelist()]
assert len(manifestfiles)==1
manifest=json.loads(manifestfiles[0])
assert manifest['format']=='sapiver-four-background-pattern'
assert len(manifest['backgrounds'])==3
assert manifest['transparent']['width']==5000
assert len([f for f in buyers if len(outer.read(f))<=20000000])==4
print('PASS: 1 original transparent 5000px PNG and 3 colour variants with 2 exact labelled sizes each in four Etsy buyer ZIPs.')
`;
 const script=python;
 const verified=spawnSync('python3',['-c',script],{input:bytes,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(verified.status,0,verified.stderr||verified.stdout||'ZIP extraction failed');
 assert.equal(pageErrors.length,0,pageErrors.join(' | '));
 console.log(verified.stdout.trim());
}finally{await browser.close();}
