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
  await page.locator('#projectTitleInput').fill('Two ZIP integration');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('#files').setInputFiles({
    name:'motif.svg',mimeType:'image/svg+xml',
    buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="27" fill="#327c8c"/></svg>')
  });
  await page.waitForFunction(()=>window.PatternForgeEtsyBridge.state.items.length===1);
  // Even with the normal PNG toggle OFF, the Etsy master must be genuinely transparent.
  await page.locator('#exportTransparent').uncheck();
  assert.equal(await page.locator('#exportTransparent').isChecked(),false);
  const preflight=await page.evaluate(()=>window.PatternForgeEtsy.check());
  assert.equal(preflight.find(c=>c.id==='transparency')?.state,'pass','Etsy must verify clear pixels independently of the ordinary export setting');
  assert.ok(preflight.every(c=>c.state!=='fail'),'Preflight failed: '+JSON.stringify(preflight.filter(c=>c.state==='fail')));
  const downloadPromise=page.waitForEvent('download',{timeout:120000});
  const result=await page.evaluate(async()=>window.PatternForgeEtsy.prepare({download:true,allowSmallerPng:false}));
  assert.equal(result.success,true,'Actual browser export failed: '+JSON.stringify(result));
  assert.equal(result.buyerPackages.length,2,'Must export exactly two Etsy upload ZIPs');
  assert.ok(result.buyerPackages.every(f=>f.size<=20_000_000),'An Etsy file exceeds 20 MB');
  assert.equal(result.multipartPngUsed,false,'Small clean sample must retain full-resolution PNG in the usual two ZIPs');
  assert.deepEqual(result.pngDimensions,{width:5000,height:5000});
  assert.equal(result.designUnchanged,true,'Editable design was changed');
  assert.ok(result.alphaStats?.clearPercent>=1,'The actual full-resolution PNG must have genuinely clear pixels');
  const actualCorner=await page.evaluate(async()=>{
    const rendered=await window.PatternForgeEtsyBridge.renderPNGBlob({backgroundMode:'transparent'});
    const bitmap=await createImageBitmap(rendered.blob),canvas=document.createElement('canvas');
    canvas.width=1;canvas.height=1;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,1,1,0,0,1,1);
    const alpha=ctx.getImageData(0,0,1,1).data[3];bitmap.close();canvas.width=0;canvas.height=0;return alpha;
  });
  assert.equal(actualCorner,0,'The output PNG itself must contain clear transparent pixels, not only an RGBA channel');
  const download=await downloadPromise;
  const bytes=await readFile(await download.path());
  assert.equal(download.suggestedFilename(),result.kitName);
  const python=String.raw`
import io,sys,zipfile,hashlib,struct,json
outer=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert outer.testzip() is None
root=outer.namelist()
buyers=sorted(x for x in root if x.startswith('UPLOAD-TO-ETSY/') and x.endswith('.zip'))
assert len(buyers)==2,buyers
assert buyers[0].endswith('-buyer-01-png.zip'),buyers
assert buyers[1].endswith('-buyer-02-jpg-and-extras.zip'),buyers
assert len([x for x in root if x.startswith('LISTING-IMAGES/') and x.endswith('.jpg')])==3
assert 'SELLER-CHECKLIST.txt' in root
assert 'QUALITY-CHECK.txt' in root
archives=[zipfile.ZipFile(io.BytesIO(outer.read(b))) for b in buyers]
documents=('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt')
for z in archives:
 assert z.testzip() is None
 assert all(n in z.namelist() for n in documents)
 assert 'QUALITY-CHECK.txt' not in z.namelist()
for name in documents:
 assert archives[0].read(name)==archives[1].read(name),name
first=archives[0].namelist()
second=archives[1].namelist()
assert sum(x.endswith('.png') for x in first)==1,first
assert sum(x.endswith('.png') for x in second)==0,second
assert any(x.endswith('-seamless-master.jpg') for x in second),second
assert any(x.endswith('-seamless-vector.svg') for x in second),second
assert any('repeat-preview-3x3' in x for x in second),second
png=archives[0].read(next(x for x in first if x.endswith('.png')))
assert png[:8]==b'\x89PNG\r\n\x1a\n'
assert struct.unpack('>II',png[16:24])==(5000,5000)
assert b'pHYs' in png
for name in buyers:
 assert len(outer.read(name))<=20000000
print(json.dumps({'buyerZips':buyers,'customerFiles':[z.namelist() for z in archives],'listingImages':3,'masterPngPixels':[5000,5000]}))
`;
  const verified=spawnSync('python3',['-c',python],{input:bytes,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  assert.equal(verified.status,0,verified.stderr||verified.stdout||'ZIP readback failed');
  assert.equal(pageErrors.length,0,'Page errors: '+pageErrors.join(' | '));
  console.log('PASS: Android-sized browser generated real nested Etsy kit with two valid buyer ZIPs, matching documents, 5000px PNG, JPG, SVG and listing images.');
  console.log(verified.stdout.trim());
}finally{
  await browser.close();
}
