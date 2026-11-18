import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.route('**/api/auto-seamless-listing',route=>route.fulfill({
 status:200,contentType:'application/json',body:JSON.stringify({
  title:'Blue Grid Textile Pattern',main_tag:'geometric',
  other_tags:['blue grid','blue textile','fabric texture','blue squares','woven pattern',
   'home decor','soft blue','square design','modern','blue repeat','textile',
   'cerulean','indigo','checkerboard'],
  description:'A blue geometric textile design. Created with the aid of AI.',
  visual_subject:'blue grid',source:'visual-ai',live_search_volume:false
 })
}));
try{
 await page.goto('http://127.0.0.1:4185/auto-seamless/',{waitUntil:'load'});
 await page.locator('#readyMode').click();
 const base64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle='#e5d8f0';ctx.fillRect(0,0,256,256);
  ctx.fillStyle='#424d72';for(let y=0;y<256;y+=64)for(let x=0;x<256;x+=64)ctx.fillRect(x+12,y+12,35,35);
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#upload').setInputFiles({name:'original.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.startsWith('Full original retained.'),null,{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#metaName')?.value,null,{timeout:30000});
 await page.locator('#commercialPrice').fill('2.99');
 await page.locator('#commercialReviewConfirmed').check();
 assert.equal(await page.locator('#commercialOversizeOptions').isVisible(),true);

 // The original File is too large for an Etsy ZIP even if deflated.
 await page.evaluate(()=>{
  let seed=1234567;
  const bytes=new Uint8Array(20_200_000);
  for(let i=0;i<bytes.length;i++){
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;bytes[i]=seed&255;
  }
  state.originalFile=new File([bytes],'oversize.png',{type:'image/png'});
  state.originalBytes=bytes;
  state.fileName='oversize';
 });
 await page.locator('#downloadCommercial').click();
 await page.waitForFunction(()=>document.querySelector('#commercialExportStatus')?.textContent?.includes('Tick "Allow an Etsy-compatible version"'),null,{timeout:90000});
 assert.equal(await page.locator('#commercialAllowConversion').isChecked(),false);
 console.log('PASS: original larger than Etsy cap blocked until owner explicitly opts in.');

 await page.locator('#commercialAllowConversion').check();
 const samePngWait=page.waitForEvent('download',{timeout:120000});
 await page.locator('#downloadCommercial').click();
 const samePng=await samePngWait;
 const verifyPng="import io,sys,zipfile,json,struct\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n m=json.loads(z.read('LISTING-METADATA.json'))\n assert m['product']['deliveryChangedFromOriginal'] is True\n assert 're-encoded' in m['product']['description'].lower()\n names=[n for n in z.namelist() if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip')]\n assert len(names)==1,names\n with zipfile.ZipFile(io.BytesIO(z.read(names[0]))) as inner:\n  assert inner.testzip() is None\n  files=inner.namelist()\n  pngs=[n for n in files if n.endswith('-full-size-reencoded.png')]\n  assert len(pngs)==1,files\n  assert not any(n.endswith('-seamless-master.png') for n in files)\n  data=inner.read(pngs[0])\n  assert data[:8]==b'\\x89PNG\\r\\n\\x1a\\n'\n  assert struct.unpack('>II',data[16:24])==(256,256)\n  assert b'pHYs' in data[:250]\n  for doc in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'): assert doc in files\nprint('PASS oversize: explicit approval delivers accurately labelled same-size PNG within Etsy cap')";
 const pngCheck=spawnSync('python3',['-c',verifyPng,await samePng.path()],{encoding:'utf8',timeout:30000});
 assert.equal(pngCheck.status,0,pngCheck.stderr||pngCheck.stdout);
 console.log(pngCheck.stdout.trim());

 // Force PNG to remain >20MB using a real high-entropy tile.
 // WebP can still carry full pixel dimensions and alpha support.
 await page.evaluate(()=>{
  const side=2800,ctx=tileCanvas.getContext('2d');
  tileCanvas.width=tileCanvas.height=side;
  const image=ctx.createImageData(side,side);
  const d=image.data;let seed=987654321;
  for(let i=0;i<d.length;i+=4){
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;d[i]=seed&255;
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;d[i+1]=seed&255;
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;d[i+2]=seed&255;
   d[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  state.tile={w:side,h:side};
 });
 const webpWait=page.waitForEvent('download',{timeout:180000});
 await page.locator('#downloadCommercial').click();
 const webp=await webpWait;
 const verifyWebp="import io,sys,zipfile,json,struct\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n m=json.loads(z.read('LISTING-METADATA.json'))\n assert m['product']['deliveryChangedFromOriginal'] is True\n assert 'WebP' in m['product']['description']\n pieces=[n for n in z.namelist() if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip')]\n assert 1<=len(pieces)<=5\n supplied=[]\n for name in pieces:\n  data=z.read(name)\n  assert len(data)<=20000000,(name,len(data))\n  with zipfile.ZipFile(io.BytesIO(data)) as inner:\n   assert inner.testzip() is None\n   names=inner.namelist()\n   for doc in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'): assert doc in names\n   for f in names:\n    if f.endswith('.webp'):\n     b=inner.read(f);assert b[:4]==b'RIFF' and b[8:12]==b'WEBP'\n     supplied.append(('WEBP',len(b)))\n    if f.endswith('-portable-png.png'):\n     b=inner.read(f);assert b[:8]==b'\\x89PNG\\r\\n\\x1a\\n'\n     assert struct.unpack('>II',b[16:24])==(2500,2500)\n     supplied.append(('PNG',len(b)))\n assert any(n=='WEBP' for n,_ in supplied),supplied\n assert not any('seamless-master' in n for n in z.namelist())\nprint('PASS oversize: real WebP produced, original omitted with consent, <=20MB buyer ZIPs, documents and accurate listing')";
 const webpCheck=spawnSync('python3',['-c',verifyWebp,await webp.path()],{encoding:'utf8',timeout:30000});
 assert.equal(webpCheck.status,0,webpCheck.stderr||webpCheck.stdout);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(webpCheck.stdout.trim());
}finally{await browser.close();}
