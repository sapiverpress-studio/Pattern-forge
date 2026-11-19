import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const editor=await browser.newPage({viewport:{width:980,height:900},acceptDownloads:true});
const errors=[];editor.on('pageerror',e=>errors.push('editor '+e.message));
try{
 await editor.goto('http://127.0.0.1:4185/app/',{waitUntil:'networkidle'});
 await editor.locator('#projectTitleInput').fill('Blue Background Pair');
 await editor.locator('#createProject').click();
 await editor.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 await editor.locator('#bg').evaluate(el=>{el.value='#112233';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await editor.locator('#files').setInputFiles({
  name:'centre-symbol.svg',mimeType:'image/svg+xml',
  buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#f18f56"/></svg>')
 });
 await editor.waitForFunction(()=>window.PatternForgeEtsyBridge.state.items.length===1,null,{timeout:15000});
 const count=await editor.evaluate(()=>window.PatternForgeEtsyBridge.state.items.length);
 await editor.locator('#exportPng').evaluate(el=>el.click());
 await editor.locator('#backgroundExportDialog').waitFor({state:'visible',timeout:60000});
 await editor.locator('#backgroundExportBoth').waitFor({state:'visible',timeout:60000});
 await editor.waitForFunction(()=>!document.querySelector('#backgroundExportBoth').disabled,null,{timeout:120000});
 const recommendation=await editor.locator('#backgroundExportRecommendation').textContent();
 assert.match(recommendation,/Etsy|buyer/i);
 const progress=await editor.locator('#backgroundExportProgress').textContent();
 assert.match(progress,/Transparent PNG:/);
 assert.match(progress,/Solid background/);
 const wait=editor.waitForEvent('download',{timeout:120000});
 await editor.locator('#backgroundExportBoth').click();
 const pairDownload=await wait;
 assert.match(pairDownload.suggestedFilename(),/background-pair\.zip$/);
 const pairPath=await pairDownload.path();
 const pairBytes=readFileSync(pairPath);
 assert.equal(await editor.evaluate(()=>window.PatternForgeEtsyBridge.state.items.length),count,'Editable project changed');

 const ready=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 ready.on('pageerror',e=>errors.push('ready '+e.message));
 await ready.route('**/api/auto-seamless-listing',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({title:'Blue Cosmic Circle Pattern',main_tag:'geometric',
   other_tags:['blue textile','circle pattern','graphic art','blue motif','abstract tile','repeat pattern',
   'fabric design','navy decor','textile design','digital pattern','blue repeat','printable','background','geometric decor'],
   description:'A blue geometric circular repeating pattern. Created with the aid of AI.',
   etsy:{title:'Blue Cosmic Circle Seamless Pattern Digital Download',tags:['blue circle pattern','cosmic blue pattern','digital pattern','navy geometric','abstract circle','blue decor design','blue motif tile','navy blue pattern','circle tile print','modern circle art','seamless blue','blue graphic tile','geometric digital'],description:'Geometric blue circles supplied as a digital download. Created with the aid of AI.'},
   visual_subject:'blue circle',source:'visual-ai',live_search_volume:false})
 }));
 await ready.goto('http://127.0.0.1:4185/auto-seamless/',{waitUntil:'load'});
 await ready.locator('#upload').setInputFiles({name:'Blue-Background-Pair.zip',mimeType:'application/zip',buffer:pairBytes});
 await ready.waitForTimeout(2200);
 console.log('PAIR IMPORT SNAPSHOT',JSON.stringify(await ready.evaluate(()=>({
  status:document.querySelector('#status')?.textContent,
  file:document.querySelector('#upload')?.files?.[0]?.name,
  mode:state.mode,processing:state.busy,
  pairLoaded:!!state.backgroundPair,sourceWidth:state.source?.w,
  parserReady:typeof window.SapiverBackgroundPair?.parse
 }))),errors.join(' | '));
 await ready.waitForFunction(()=>{
  const status=document.querySelector('#status')?.textContent||'';
  return status.startsWith('Two original background variants')||status.startsWith('Paired ZIP rejected:')||status.startsWith('Unable to process')||status.startsWith('Chrome cannot read');
 },null,{timeout:30000});
 const readyStatus=await ready.locator('#status').textContent();
 assert.match(readyStatus,/^Two original background variants/,readyStatus+'; JS errors: '+errors.join(' | '));
 assert.equal(await ready.locator('#readyMode').getAttribute('aria-pressed'),'true');
 assert.equal(await ready.locator('#scoreFact').textContent(),'Skipped');
 await ready.waitForFunction(()=>document.querySelector('#metaName')?.value,null,{timeout:30000});
 await ready.locator('#commercialPrice').fill('3.95');
 await ready.locator('#commercialReviewConfirmed').check();
 await ready.waitForFunction(()=>!document.querySelector('#downloadCommercial').disabled,null,{timeout:15000});
 const sale=ready.waitForEvent('download',{timeout:180000});
 await ready.locator('#downloadCommercial').click();
 const saleDownload=await sale;
 const verify="import io,sys,zipfile,json,struct,hashlib\npair=zipfile.ZipFile(sys.argv[1])\nassert pair.testzip() is None\nm=json.loads(pair.read('SAPIVER-BACKGROUND-PAIR.json'))\nassert m['format']=='sapiver-background-pair' and m['version']==1\nassert m['backgroundColor']=='#112233',m\nassert m['width']==5000 and m['height']==5000 and m['dpi']==300\nassert len(pair.namelist())==3,pair.namelist()\ndef dimensions(data):\n assert data[:8]==b'\\x89PNG\\r\\n\\x1a\\n'\n return struct.unpack('>II',data[16:24])\noriginals={m['transparent']:pair.read(m['transparent']),m['solid']:pair.read(m['solid'])}\nfor v in originals.values():\n assert dimensions(v)==(5000,5000)\n assert b'pHYs' in v[:250]\nwith zipfile.ZipFile(sys.argv[2]) as outer:\n assert outer.testzip() is None\n names=outer.namelist()\n meta=json.loads(outer.read('LISTING-METADATA.json'))\n assert meta['product']['backgroundOptions']=='transparent-and-solid'\n assert meta['product']['etsyTitle']=='Blue Cosmic Circle Seamless Pattern Digital Download'\n assert len(meta['product']['tags'])==13\n assert meta['product']['backgroundColour']=='#112233'\n assert 'transparent' in meta['product']['description'].lower()\n assert 'solid' in meta['product']['description'].lower()\n buyers=[n for n in names if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip')]\n assert 1<=len(buyers)<=5,buyers\n assert len([n for n in names if n.startswith('LISTING-IMAGES/')])==4\n pictures={}\n for name in buyers:\n  payload=outer.read(name)\n  assert len(payload)<=20000000,(name,len(payload))\n  with zipfile.ZipFile(io.BytesIO(payload)) as inner:\n   assert inner.testzip() is None\n   for doc in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt','CONTENTS.txt'):\n    assert doc in inner.namelist(),(name,doc)\n   assert b'BACKGROUND VERSIONS' in inner.read('LICENSE.txt')\n   for name in inner.namelist():\n    if name.lower().endswith(('.png','.webp','.jpg')):\n     pictures[name]=inner.read(name)\n   listed=inner.read('CONTENTS.txt').decode()\n   assert listed.count('seamless-master.png')==2,listed\n assert len(pictures)==4,list(pictures)\n for label in ('solid','transparent'):\n  full=[(n,data) for n,data in pictures.items() if n.endswith('-'+label+'-seamless-master.png')]\n  smaller=[(n,data) for n,data in pictures.items() if '-'+label+'-2500px-300dpi-repeat.png' in n]\n  assert len(full)==len(smaller)==1,list(pictures)\n  assert dimensions(full[0][1])==(5000,5000)\n  assert dimensions(smaller[0][1])==(2500,2500)\n  assert full[0][1]==originals[m[label if label=='transparent' else 'solid']],'Original bytes not preserved: '+label\n  assert b'pHYs' in smaller[0][1][:250]\n assert b'four images required' in outer.read('QUALITY-CHECK.txt')\n print('PASS background pair: two 5000px original PNGs + two 2500px PNGs; exact source bytes, 300 DPI, metadata, licence and <=20MB ZIPs')\n";
 const check=spawnSync('python3',['-c',verify,pairPath,await saleDownload.path()],{encoding:'utf8',timeout:60000});
 assert.equal(check.status,0,check.stderr||check.stdout);
 console.log(check.stdout.trim());
 assert.deepEqual(errors,[]);
 await ready.locator('#upload').setInputFiles({name:'not-a-pair.zip',mimeType:'application/zip',buffer:Buffer.from('invalid zip')});
 await ready.waitForFunction(()=>document.querySelector('#status')?.textContent?.startsWith('Paired ZIP rejected:'),null,{timeout:15000});
 console.log('PASS background pair importer rejects generic/invalid ZIPs while retaining original old-mode tests.');
}finally{await browser.close();}
