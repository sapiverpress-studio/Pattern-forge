import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
// No AI charges or external API traffic are required for the ZIP test.
await page.route('**/api/auto-seamless-listing',route=>route.fulfill({
 status:200,contentType:'application/json',
 body:JSON.stringify({title:'Blue Grid Textile Pattern',main_tag:'geometric',
 other_tags:['blue grid','blue textile','fabric texture','blue squares','woven pattern',
 'home decor','soft blue','square design','modern','blue repeat','textile',
 'cerulean','indigo','checkerboard'],
 description:'A blue geometric textile design. Created with the aid of AI.',
 visual_subject:'blue grid',source:'visual-ai',live_search_volume:false})
}));
try{
 await page.goto('http://127.0.0.1:4185/auto-seamless/',{waitUntil:'load'});
 assert.equal(await page.locator('#downloadCommercial').count(),1);
 assert.equal(await page.locator('#downloadCommercial').isDisabled(),true);
 const base64=await page.evaluate(()=>{
  const c=document.createElement('canvas');
  c.width=c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#dae6f4';ctx.fillRect(0,0,256,256);
  ctx.fillStyle='#375f89';
  for(let y=0;y<256;y+=64)for(let x=0;x<256;x+=64){
   ctx.fillRect(x+8,y+8,24,24);
   ctx.fillRect(x+40,y+40,12,12);
  }
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#upload').setInputFiles({
  name:'blue-grid.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')
 });
 await page.waitForFunction(()=>!document.querySelector('#downloadTile').disabled,null,{timeout:45000});
 assert.equal(await page.locator('#downloadCommercial').isDisabled(),true,
  'owner must confirm repeat quality first');
 await page.waitForFunction(()=>Boolean(document.querySelector('#metaName')?.value),null,{timeout:15000});
 await page.locator('#commercialPrice').fill('4.95');
 await page.locator('#commercialReviewConfirmed').check();
 await page.waitForFunction(()=>!document.querySelector('#downloadCommercial').disabled,null,{timeout:10000});
 const wait=page.waitForEvent('download',{timeout:120000});
 await page.locator('#downloadCommercial').click();
 const download=await wait;
 assert.match(download.suggestedFilename(),/commercial-seller-kit\.zip$/);
 const downloaded=await download.path();
 const py=String.raw`
import io,sys,zipfile,struct
with zipfile.ZipFile(sys.argv[1]) as envelope:
    assert envelope.testzip() is None, 'outer ZIP CRC mismatch'
    names=envelope.namelist()
    import json
    manifest=json.loads(envelope.read('LISTING-METADATA.json'))
    assert manifest['format']=='sapiver-seamless-seller-kit' and manifest['version']==1
    product=manifest['product']
    assert product['name']=='Blue Grid Textile Pattern'
    assert product['price']==4.95
    assert product['kind']=='pattern' and product['sectionTitle']=='Digital Downloads'
    assert product['description'].endswith('aid of AI.')
    assert product['useEmbeddedText'] and product['seamlessConfirmed']
    assert 5<=len(product['tags'])<=13
    assert len({t.lower() for t in product['tags']})==len(product['tags'])
    assert all(len(t)<=20 for t in product['tags'])
    buyers=[n for n in names if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip')]
    assert 1<=len(buyers)<=5,names
    previews=[n for n in names if n.startswith('LISTING-IMAGES/')]
    assert len(previews)==4,names
    assert 'QUALITY-CHECK.txt' in names
    assert b'2400 x 2400' in envelope.read('QUALITY-CHECK.txt')
    assert 'formatWarnings' not in manifest
    assert b'Buyer artwork files:' in envelope.read('QUALITY-CHECK.txt')
    assert b'not included' not in envelope.read('QUALITY-CHECK.txt').lower()
    assert b'not included' not in envelope.read('SELLER-CHECKLIST.txt').lower()
    for image in previews:
        jpg=envelope.read(image)
        assert jpg.startswith(b'\xff\xd8'),image
        i=2
        dimensions=None
        while i<len(jpg)-8:
            if jpg[i]!=255: i+=1; continue
            marker=jpg[i+1]
            if marker in (0xD8,0xD9): i+=2; continue
            length=int.from_bytes(jpg[i+2:i+4],'big')
            if marker in (0xC0,0xC1,0xC2):
                dimensions=tuple(struct.unpack('>HH',jpg[i+5:i+9]))
                break
            i+=2+length
        assert dimensions==(2400,2400),(image,dimensions)
    assets=[]
    for buyer in buyers:
        data=envelope.read(buyer)
        assert len(data)<=20000000,(buyer,len(data))
        with zipfile.ZipFile(io.BytesIO(data)) as b:
            assert b.testzip() is None,'inner ZIP CRC mismatch'
            files=b.namelist()
            for document in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'):
                assert document in files,(buyer,document)
                assert len(b.read(document).strip())>50,(buyer,document)
            for f in files:
                if f.lower().endswith(('.png','.jpg')):
                    body=b.read(f)
                    if f.endswith('.png'):
                        assert body[:8]==b'\x89PNG\r\n\x1a\n'
                        w,h=struct.unpack('>II',body[16:24])
                        if '5000px' in f: assert (w,h)==(5000,5000),(f,w,h)
                        if '2500px' in f: assert (w,h)==(2500,2500),(f,w,h)
                        assert b'pHYs' in body[:250], 'PNG missing DPI metadata'
                    else: assert body.startswith(b'\xff\xd8')
                    assets.append(f)
    assert len(assets)==4,assets
    print('PASS REAL BROWSER ZIP:',len(buyers),'buyer ZIP(s),',len(assets),'artwork formats, 4 verified 2400px previews, all buyer legal documents present')
`;
 const test=spawnSync('python3',['-c',py,downloaded],{encoding:'utf8',timeout:30000});
 assert.equal(test.status,0,test.stderr||test.stdout);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(test.stdout.trim());
 console.log('PASS: actual 5000px Auto Seamless Chromium export was validated through both ZIP levels.');

 // Finished-pattern mode must preserve the source bytes inside the buyer ZIP.
 // Auto-detect assertions above remain unchanged.
 await page.locator('#readyMode').click();
 assert.equal(await page.locator('#readyMode').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#edgeControls').isHidden(),true);
 await page.locator('#upload').setInputFiles({
  name:'finished-grid.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')
 });
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.startsWith('Full original retained.') && document.querySelector('#uploadTitle')?.textContent==='finished-grid.png' && document.querySelector('#scoreFact')?.textContent==='Skipped',null,{timeout:30000});
 assert.equal(await page.locator('#sizeFact').textContent(),'256 × 256');
 assert.equal(await page.locator('#download5000').isHidden(),true);
 assert.match(await page.locator('#status').textContent(),/No detection, crop, blending/);
 // Simulate Android revoking the provider-backed File after its preview loads.
 // A late File.arrayBuffer() must fail, while both exports use the early snapshot.
 await page.evaluate(()=>{
  if(!(state.originalBytes instanceof Uint8Array)||state.originalBytes.byteLength!==state.originalFile.size)
   throw Error('Original upload was not saved to memory');
  Object.defineProperty(state.originalFile,'arrayBuffer',{
   configurable:true,
   value:()=>Promise.reject(new DOMException('The requested file could not be read','NotReadableError'))
  });
 });
 const unchangedWait=page.waitForEvent('download',{timeout:30000});
 await page.locator('#downloadTile').click();
 const unchangedDownload=await unchangedWait;
 assert.equal(unchangedDownload.suggestedFilename(),'finished-grid.png');
 assert.deepEqual(readFileSync(await unchangedDownload.path()),Buffer.from(base64,'base64'));
 await page.locator('#commercialPrice').fill('4.95');
 await page.locator('#commercialReviewConfirmed').check();
 await page.waitForFunction(()=>!document.querySelector('#downloadCommercial').disabled,null,{timeout:15000});
 const readyWait=page.waitForEvent('download',{timeout:120000});
 await page.locator('#downloadCommercial').click();
 const readyDownload=await readyWait;
 const readyPath=await readyDownload.path();
 const verifyReady="import io,sys,zipfile,base64,json\nexpected=base64.b64decode(sys.argv[2])\nwith zipfile.ZipFile(sys.argv[1]) as outer:\n    assert outer.testzip() is None\n    names=outer.namelist()\n    assert len([n for n in names if n.startswith('LISTING-IMAGES/')])==4\n    buyers=[n for n in names if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip')]\n    assert len(buyers)==1,buyers\n    assert json.loads(outer.read('LISTING-METADATA.json'))['product']['kind']=='pattern'\n    with zipfile.ZipFile(io.BytesIO(outer.read(buyers[0]))) as buyer:\n        assert buyer.testzip() is None\n        names=buyer.namelist()\n        art=[n for n in names if n.endswith('-seamless-master.png')]\n        assert len(art)==1,names\n        assert buyer.read(art[0])==expected,'ready-made mode changed original file bytes'\n        reduced=[n for n in names if n.endswith('-128px-300dpi-repeat.png')]\n        assert len(reduced)==1,names\n        b=buyer.read(reduced[0])\n        assert b[:8]==b'\\x89PNG\\r\\n\\x1a\\n'\n        import struct\n        assert struct.unpack('>II',b[16:24])==(128,128)\n        assert b'pHYs' in b[:250]\n        pictures=[n for n in names if n.lower().endswith(('.png','.jpg','.webp'))]\n        assert len(pictures)==2,pictures\n        for doc in ('LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'):\n            assert doc in names\n    assert b'256 x 256 PNG (original seamless master)' in outer.read('SELLER-CHECKLIST.txt')\n    assert b'128 x 128 PNG (smaller PNG seamless tile)' in outer.read('SELLER-CHECKLIST.txt')\nprint('PASS already seamless: original source unchanged, required 128px PNG derivative, 2 distinct sizes, 4 listing previews, licence and metadata')\n";
 const readyTest=spawnSync('python3',['-c',verifyReady,readyPath,base64],{encoding:'utf8',timeout:30000});
 assert.equal(readyTest.status,0,readyTest.stderr||readyTest.stdout);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(readyTest.stdout.trim());
 console.log('PASS Android file-provider revocation: original-download and seller ZIP preserve source bytes without a second File read.');
}finally{await browser.close();}
