import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const browser=await chromium.launch({executablePath:process.env.PF_CHROME||undefined,headless:true,args:['--no-sandbox']});
const editor=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[];editor.on('pageerror',e=>errors.push('editor '+e.message));
try{
 await editor.goto('http://127.0.0.1:4185/app/',{waitUntil:'networkidle'});
 await editor.locator('#projectTitleInput').fill('Multi Colour Pattern');
 await editor.locator('#createProject').click();
 await editor.locator('#projectSetupOverlay').waitFor({state:'hidden'});
 await editor.locator('#files').setInputFiles({name:'art.svg',mimeType:'image/svg+xml',
  buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="35" fill="#eac97b"/></svg>')});
 await editor.waitForFunction(()=>window.PatternForgeEtsyBridge.state.items.length>0,null,{timeout:15000});
 await editor.locator('#ux2Export').click();
 await editor.locator('#ux2QuickBackgroundPreview').waitFor({state:'visible'});
 const picker=editor.locator('#ux2QuickBackground'),add=editor.locator('#ux2QuickAddColour');
 await picker.fill('#112233');
 await add.click();
 await picker.fill('#334455');
 await add.click();
 assert.equal(await editor.locator('#ux2QuickColours button').count(),2);
 assert.match(await editor.locator('#ux2QuickExportBoth').textContent(),/2 colours/);
 assert.equal(await editor.locator('#ux2QuickBackgroundPreview').isVisible(),true);
 const wait=editor.waitForEvent('download',{timeout:180000});
 await editor.locator('#ux2QuickExportBoth').click();
 const download=await wait;
 assert.match(download.suggestedFilename(),/background-pair\.zip$/);
 const sourcePath=await download.path(),buffer=readFileSync(sourcePath);
 assert.equal(await editor.locator('#ux2QuickBackground').inputValue(),'#334455');
 await editor.waitForFunction(()=>document.querySelector('#ux2QuickExportStatus')?.textContent?.includes('2 colour variations'),null,{timeout:15000});

 const ready=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 ready.on('pageerror',e=>errors.push('ready '+e.message));
 await ready.route('**/api/auto-seamless-listing',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  title:'Two Colour Celestial Circles',main_tag:'geometric',
  other_tags:['circles','space pattern','blue motif','blue fabric','navy','abstract tile',
   'repeat pattern','art print','surface design','digital image','blue repeat','printable','colourway','pattern'],
  description:'Circular motif in coordinated colours, created with the aid of AI.',
  visual_subject:'circles',source:'visual-ai',live_search_volume:false
 })}));
 await ready.goto('http://127.0.0.1:4185/auto-seamless/',{waitUntil:'load'});
 await ready.locator('#upload').setInputFiles({name:'multi-colour.zip',mimeType:'application/zip',buffer});
 await ready.waitForFunction(()=>state.backgroundPair?.variations?.length===2&&state.tile,null,{timeout:90000});
 assert.equal(await ready.locator('#readyMode').getAttribute('aria-pressed'),'true');
 await ready.waitForFunction(()=>document.querySelector('#metaName')?.value,null,{timeout:30000});
 await ready.locator('#commercialPrice').fill('3.99');
 await ready.locator('#commercialReviewConfirmed').check();
 const seller=ready.waitForEvent('download',{timeout:180000});
 await ready.locator('#downloadCommercial').click();
 const completed=await seller;
 const verify="import io,sys,zipfile,json,struct\ndef dims(buf):\n assert buf[:8]==b'\\x89PNG\\r\\n\\x1a\\n'\n return struct.unpack('>II',buf[16:24])\nwith zipfile.ZipFile(sys.argv[1]) as src:\n assert src.testzip() is None\n manifest=json.loads(src.read('SAPIVER-BACKGROUND-PAIR.json'))\n assert manifest['format']=='sapiver-background-pair' and manifest['version']==2\n assert manifest['width']==manifest['height']==5000 and manifest['dpi']==300\n assert [v['color'] for v in manifest['variations']]==['#112233','#334455'],manifest\n assert len(src.namelist())==4\n originals={'transparent':src.read(manifest['transparent'])}\n originals.update({v['color'][1:]:src.read(v['file']) for v in manifest['variations']})\n for data in originals.values():\n  assert dims(data)==(5000,5000)\n  assert b'pHYs' in data[:250]\nwith zipfile.ZipFile(sys.argv[2]) as outer:\n assert outer.testzip() is None\n meta=json.loads(outer.read('LISTING-METADATA.json'))\n assert meta['product']['backgroundOptions']=='transparent-and-colour-variations',meta\n assert meta['product']['backgroundColours']==['#112233','#334455'],meta\n assert 'separate Etsy buyer ZIPs' in meta['product']['description']\n assert len([x for x in outer.namelist() if x.startswith('LISTING-IMAGES/')])==4\n parts=json.loads(outer.read('BUYER-ZIP-MAP.json'))['buyerFiles']\n assert 2<=len(parts)<=5,parts\n assert [x['kind'] for x in parts].count('original')>=1,parts\n assert [x['kind'] for x in parts].count('colours')>=1,parts\n all_names=set()\n actual={}\n for part in parts:\n  payload=outer.read(part['file'])\n  assert len(payload)<=20000000,(part['file'],len(payload))\n  assert part['bytes']==len(payload)\n  with zipfile.ZipFile(io.BytesIO(payload)) as buyer:\n   assert buyer.testzip() is None\n   names=buyer.namelist()\n   for doc in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt','CONTENTS.txt'):\n    assert doc in names,(part,doc)\n   assert b'one commercial-use licence' in buyer.read('LICENSE.txt').lower()\n   images=[n for n in names if n.endswith(('.png','.webp','.jpg'))]\n   assert images,part\n   assert set(x['name'] for x in part['artwork'])==set(images)\n   contents=buyer.read('CONTENTS.txt').decode()\n   assert 'Files IN THIS ZIP' in contents\n   assert 'not other purchase attachments' in contents\n   for n in images:\n    assert n in contents,(n,contents)\n    assert n not in all_names,n\n    all_names.add(n)\n    buf=buyer.read(n)\n    actual[n]=buf\n    if n.endswith('.png'): assert b'pHYs' in buf[:250]\n   if part['kind']=='original': assert all('-transparent-' in n for n in images),images\n   else: assert all('-solid-' in n for n in images),images\n assert len(actual)==6,actual.keys()\n for label,src_bytes in originals.items():\n  prefix='-transparent-' if label=='transparent' else '-solid-'+label+'-'\n  if label=='transparent':\n   masters=[(n,b) for n,b in actual.items() if n.endswith('-transparent-seamless-master.png')]\n   smaller=[(n,b) for n,b in actual.items() if '-transparent-2500px-300dpi-repeat.png' in n]\n  else:\n   masters=[(n,b) for n,b in actual.items() if n.endswith('-solid-'+label+'-seamless-master.png')]\n   smaller=[(n,b) for n,b in actual.items() if '-solid-'+label+'-2500px-300dpi-repeat.png' in n]\n  assert len(masters)==len(smaller)==1,(label,list(actual))\n  assert masters[0][1]==src_bytes,(label,'Full-size changed unexpectedly')\n  assert dims(masters[0][1])==(5000,5000)\n  assert dims(smaller[0][1])==(2500,2500)\n assert b'Do NOT use the old single-attachment importer' in outer.read('SELLER-CHECKLIST.txt')\n print('PASS multi-colour: 1 transparent original + 2 colour variants, 5000/2500px, separate Etsy buyer ZIPs, exact license and contents, 20MB caps')\n";
 const check=spawnSync('python3',['-c',verify,sourcePath,await completed.path()],{encoding:'utf8',timeout:60000});
 assert.equal(check.status,0,check.stderr||check.stdout);
 console.log(check.stdout.trim());
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
