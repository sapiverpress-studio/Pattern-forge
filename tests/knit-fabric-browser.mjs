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
  const digest=()=>page.locator('#preview').evaluate(el=>el.toDataURL().slice(-150));
  const before=await digest();
  await page.locator('#knitStyle').selectOption('fairisle');
  await page.locator('#yarn').evaluate(el=>{el.value='#345678';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(180);
  assert.notEqual(await digest(),before,'changing yarn/style changes fabric pixels');
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