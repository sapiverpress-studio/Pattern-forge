import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

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
    buyers=[n for n in names if n.startswith('UPLOAD-TO-ETSY/') and n.endswith('.zip')]
    assert 1<=len(buyers)<=5,names
    assert len([n for n in names if n.startswith('LISTING-IMAGES/')])==2,names
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
    print('PASS REAL BROWSER ZIP:',len(buyers),'buyer ZIP(s),',len(assets),'artwork formats, all buyer legal documents present')
`;
 const test=spawnSync('python3',['-c',py,downloaded],{encoding:'utf8',timeout:30000});
 assert.equal(test.status,0,test.stderr||test.stdout);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(test.stdout.trim());
 console.log('PASS: actual 5000px Auto Seamless Chromium export was validated through both ZIP levels.');
}finally{await browser.close();}
