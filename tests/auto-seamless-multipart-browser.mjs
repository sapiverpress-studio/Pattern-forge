import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const dir=await mkdtemp(path.join(tmpdir(),'auto-seamless-png-'));
const browser=await chromium.launch({executablePath:process.env.PF_CHROME||undefined,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const tags=['seamless pattern','knit digital paper','sweater texture','winter craft paper','scrapbook design','cable knit print','fabric print design','warm neutral paper','rust cream pattern','gift wrap pattern','textile digital art','cozy craft print','knit repeat tile'];
await page.route('**/api/auto-seamless-listing',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
 title:'Colourful Woven Texture',main_tag:'woven texture',other_tags:['bright cloth','cloth pattern','woven fabric','red texture','blue texture','green texture','colourful cloth','fabric artwork','textile design','textile pattern','colour texture','fabric repeat','woven artwork','cloth design'],etsy_tags:tags,
 description:'Colourful woven texture for digital crafts. Created with the aid of AI.',visual_subject:'woven texture in colourful shades and',source:'visual-ai',live_search_volume:false
})}));
try{
 await page.goto('http://127.0.0.1:4185/auto-seamless/',{waitUntil:'load'});
 const data=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=c.height=900;
  const ctx=c.getContext('2d'),im=ctx.createImageData(900,900);let seed=0x431234ab;
  for(let y=0;y<900;y++)for(let x=0;x<900;x++){
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
   im.data.set([(seed&31)*8,((seed>>>5)&31)*8,((seed>>>10)&63)*4,255],(y*900+x)*4);
  }
  ctx.putImageData(im,0,0);return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#upload').setInputFiles({name:'woven-test.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await page.waitForFunction(()=>!state.busy&&!!state.tile,null,{timeout:45000});
 await page.waitForFunction(()=>!!document.querySelector('#metaName').value);
 assert.ok(!(await page.locator('#metaEtsyAlt1').inputValue()).includes('shades and'),'Alt captions must use a complete title');
 const directWait=page.waitForEvent('download',{timeout:120000});await page.locator('#download5000').click();
 const direct=await directWait,original=await readFile(await direct.path());
 assert.ok(original.length>20_000_000,'Real browser-generated PNG must exercise multipart delivery: '+original.length);
 console.log('Actual direct 5000px PNG bytes: '+original.length);
 const expected=createHash('sha256').update(original).digest('hex');
 await page.locator('#commercialPrice').fill('2.99');await page.locator('#commercialReviewConfirmed').check();
 const kitWait=Promise.race([
  page.waitForEvent('download',{timeout:180000}),
  page.waitForFunction(()=>document.querySelector('#commercialExportStatus').textContent.startsWith('Export stopped:'),null,{timeout:180000})
   .then(async()=>{throw Error(await page.locator('#commercialExportStatus').textContent());})
 ]);await page.locator('#downloadCommercial').click();
 const kit=await kitWait,kitPath=await kit.path();
 const verify=String.raw`
import io,sys,zipfile,json,hashlib,struct,pathlib
root=pathlib.Path(sys.argv[2]); outer=zipfile.ZipFile(sys.argv[1]); assert outer.testzip() is None
listing=json.loads(outer.read('LISTING-METADATA.json')); assert listing['product']['pngDelivery']=='lossless-numbered-parts'
assert 'offline restore tool' in listing['product']['description']
buyers=[n for n in outer.namelist() if n.startswith('UPLOAD-TO-ETSY/')]; assert 3<=len(buyers)<=5,buyers
files={}; partzips=[]
for name in buyers:
 body=outer.read(name); assert len(body)<=20000000; z=zipfile.ZipFile(io.BytesIO(body)); assert z.testzip() is None
 for doc in ['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt']: assert doc in z.namelist()
 assert b'REBUILD-PNG.html' in z.read('README.txt')
 for f in z.namelist():
  if f in ['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt']: continue
  assert f not in files,f; files[f]=z.read(f)
 if name.endswith('-png-part.zip'):
  assert len([f for f in z.namelist() if f.endswith('.pngpart')])==1
  p=root/pathlib.Path(name).name; p.write_bytes(body); partzips.append(str(p))
m=json.loads(files['PNG-REASSEMBLY.json']); assert len(partzips)==len(m['parts'])
restored=b''.join(files[p['name']] for p in m['parts'])
for p in m['parts']: assert hashlib.sha256(files[p['name']]).hexdigest()==p['sha256']
assert hashlib.sha256(restored).hexdigest()==m['sha256']==sys.argv[3]
assert struct.unpack('>II',restored[16:24])==(5000,5000); assert b'pHYs' in restored[:250]
assert any('2500px' in f and struct.unpack('>II',v[16:24])==(2500,2500) for f,v in files.items() if f.endswith('.png'))
assert any(f.endswith('5000px-repeat.jpg') for f in files)
assert any(f.endswith('seamless-tile-300dpi.png') for f in files)
(root/'REBUILD-PNG.html').write_bytes(files['REBUILD-PNG.html'])
print(json.dumps({'bytes':len(restored),'parts':partzips,'attachments':len(buyers)}))
`;
 const checked=spawnSync('python3',['-c',verify,kitPath,dir,expected],{encoding:'utf8',timeout:30000});
 assert.equal(checked.status,0,checked.stderr||checked.stdout);const result=JSON.parse(checked.stdout);
 if(process.env.PF_KIT_OUTPUT)await copyFile(kitPath,process.env.PF_KIT_OUTPUT);
 // Exercise the customer restoration page, including arbitrary part order.
 await page.goto(pathToFileURL(path.join(dir,'REBUILD-PNG.html')).href);
 await page.locator('#files').setInputFiles([...result.parts].reverse());
 const restoredWait=page.waitForEvent('download',{timeout:30000});await page.locator('#build').click();
 const restored=await readFile(await(await restoredWait).path());
 assert.equal(createHash('sha256').update(restored).digest('hex'),expected);
 await page.locator('#files').setInputFiles([result.parts[0]]);await page.locator('#build').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Could not restore PNG:'));
 assert.match(await page.locator('#status').textContent(),/Select all/);
 assert.deepEqual(errors,[]);
 console.log('PASS actual oversize Auto Seamless kit: '+result.bytes+' byte 5000px PNG, '+result.attachments+' compliant buyer ZIPs, exact offline restoration and missing-part rejection');
}finally{await browser.close();await rm(dir,{recursive:true,force:true});}
