import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const BASE=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE+'/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('a[href="/knit/"]').count(),1,'New Design link');
  await page.goto(BASE+'/knit/',{waitUntil:'networkidle'});
  assert(await page.getByRole('heading',{name:'Knitted Fabric'}).isVisible());
  assert(await page.locator('#preview').evaluate(el=>el.width===720&&el.height===720));
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Real wool texture loaded'),{timeout:20000});
  const digest=()=>page.locator('#preview').evaluate(el=>el.toDataURL().slice(-150));
  assert.equal(await page.locator('#gauge').inputValue(),'superchunky','initial cosy chunky gauge');
  assert.equal(await page.locator('#singleView').getAttribute('aria-pressed'),'true','close-up by default');
  await page.locator('#preview').screenshot({path:'knit-preview-closeup.png'});
  await page.locator('#repeatView').click();
  await page.locator('#preview').screenshot({path:'knit-preview-repeat.png'});
  const structure=await page.evaluate(async()=>{
     const {STYLES,renderKnit,loadPhotoTextures,fairIsleLoopMask,fairIsleStitch}=await import('/knit/engine.mjs');
     await loadPhotoTextures();
     const fingerprints=[];
     for(const style of STYLES){
       const c=document.createElement('canvas');
       renderKnit(c,{style,gauge:'superchunky'});
       const d=c.getContext('2d').getImageData(0,0,1000,1000).data;
       let signature=2166136261;
       for(let i=0;i<d.length;i+=991){signature=Math.imul(signature^d[i],16777619)>>>0;}
       fingerprints.push(signature);
     }
     if(new Set(fingerprints).size!==STYLES.length)throw new Error('At least two styles produce identical fabric pixels.');
     if(!fairIsleStitch(2,4)||fairIsleStitch(0,0))throw new Error('Fair Isle chart incorrect');
     if(fairIsleLoopMask(.12,.0)<.85||fairIsleLoopMask(.5,.0)>.1)throw new Error('Not a V-shaped yarn mask');
     return fingerprints;
  });
  console.log('Distinct knit structure fingerprints',structure);
  await page.locator('#singleView').click();
  for(const style of ['stockinette','rib','seed','cable','fairisle']){
    await page.locator('#knitStyle').selectOption(style);
    await page.waitForTimeout(170);
    await page.locator('#preview').screenshot({path:'knit-preview-'+style+'.png'});
  }
  await page.locator('#repeatView').click();

  await page.locator('#singleView').click();
  await page.locator('#knitStyle').selectOption('cable');
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Preview updated'));
  await page.locator('#preview').screenshot({path:'knit-preview-cable.png'});
  await page.locator('#knitStyle').selectOption('stockinette');
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.includes('Preview updated'));
  await page.locator('#singleView').click();
  const before=await digest();
  await page.locator('#knitStyle').selectOption('fairisle');
  await page.locator('#yarn').evaluate(el=>{el.value='#345678';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(180);
  assert.notEqual(await digest(),before,'changing yarn/style changes fabric pixels');
  await page.locator('#preview').screenshot({path:'knit-preview-fairisle.png'});
  const seams=await page.evaluate(async()=>{
    const {renderKnit,STYLES,TILE_SIZE,stitchCount,loadPhotoTextures}=await import('/knit/engine.mjs');
    await loadPhotoTextures();
    const result=[];
    for(const style of STYLES){
      const tile=document.createElement('canvas');
      renderKnit(tile,{style,gauge:'medium',yarn:'#d7bfa2',contrast:'#9b403b',seed:7});
      const cx=tile.getContext('2d',{willReadFrequently:true}),pixels=cx.getImageData(0,0,TILE_SIZE,TILE_SIZE).data;
      let horiz=0,vertical=0;
      for(let i=0;i<TILE_SIZE;i++){
        for(let k=0;k<3;k++){
          horiz+=Math.abs(pixels[(i*TILE_SIZE)*4+k]-pixels[(i*TILE_SIZE+TILE_SIZE-1)*4+k]);
          vertical+=Math.abs(pixels[i*4+k]-pixels[((TILE_SIZE-1)*TILE_SIZE+i)*4+k]);
        }
      }
      if(pixels[3]!==255)throw new Error('Knitted surface must be opaque');
      const repeat=document.createElement('canvas');repeat.width=repeat.height=TILE_SIZE*2;
      const rctx=repeat.getContext('2d',{willReadFrequently:true});
      rctx.fillStyle=rctx.createPattern(tile,'repeat');rctx.fillRect(0,0,repeat.width,repeat.height);
      const a=rctx.getImageData(137,211,1,1).data,b=rctx.getImageData(1137,1211,1,1).data;
      if(!a.every((v,i)=>v===b[i]))throw new Error('Repeat is not pixel-identical');
      result.push({style,horizontalDelta:horiz/(TILE_SIZE*3),verticalDelta:vertical/(TILE_SIZE*3)});
    }
    const chunky=document.createElement('canvas');renderKnit(chunky,{style:'stockinette',gauge:'superchunky'});
    if(stitchCount({style:'stockinette',gauge:'superchunky'})>=stitchCount({style:'stockinette',gauge:'chunky'}))throw new Error('Super Chunky must contain fewer, larger loops');
    return result;
  });
  assert(seams.every(s=>s.horizontalDelta<15&&s.verticalDelta<15),'tile border continuity: '+JSON.stringify(seams));
  console.log('Stitch seam checks:',seams);
  await page.locator('#cosyPreset').click();
  assert.equal(await page.locator('#gauge').inputValue(),'superchunky');
  assert.equal(await page.locator('#knitStyle').inputValue(),'stockinette');
  await page.locator('#singleView').click();
  assert.equal(await page.locator('#singleView').getAttribute('aria-pressed'),'true');
  await page.locator('#repeatView').click();
  assert.equal(await page.locator('#repeatView').getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no horizontal overflow');
  const downloadPromise=page.waitForEvent('download',{timeout:180000});
  await page.locator('#downloadPng').click();
  const dl=await downloadPromise,bytes=await readFile(await dl.path());
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),5000);assert.equal(bytes.readUInt32BE(20),5000);
  let p=8,found=0;
  while(p<bytes.length){
    const size=bytes.readUInt32BE(p),name=bytes.toString('ascii',p+4,p+8);
    if(name==='pHYs'){found++;assert.equal(bytes.readUInt32BE(p+8),11811);assert.equal(bytes.readUInt32BE(p+12),11811);assert.equal(bytes[p+16],1);}
    p+=12+size;if(name==='IEND')break;
  }
  assert.equal(found,1,'exactly one 300 DPI metadata chunk');
  assert.equal(p,bytes.length,'valid final PNG chunk');
  assert.equal(errors.length,0,'no browser script errors: '+errors.join(' | '));
  await context.close();
  console.log('PASS Knitted Fabric: home entry, mobile canvas, controls, repeat toggle, PNG dimensions and DPI.');
}finally{await browser.close()}