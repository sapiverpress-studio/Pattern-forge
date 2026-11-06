import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:900,height:850}});
 page.on('pageerror',e=>console.log('Page error:',e.message));
 const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
 await page.goto(base+'/knit/preview-three.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>/rendered|failed/.test(document.querySelector('#status')?.textContent||''),null,{timeout:90000});
 assert.equal(await page.locator('#status').textContent(),'3D yarn rendered');
 await page.locator('#side').selectOption('back');
 await page.locator('#update').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='3D yarn rendered',null,{timeout:90000});
 await page.locator('#view').screenshot({path:'three-back-stockinette.png'});
 await page.locator('#side').selectOption('front');
 for(const style of ['stockinette','rib','seed','cable','fairisle']){
  await page.locator('#style').selectOption(style);
  await page.locator('#update').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='3D yarn rendered',null,{timeout:90000});
  await page.locator('#view').screenshot({path:'three-'+style+'.png'});
  await page.locator('#repeat').screenshot({path:'three-repeat-'+style+'.png'});
 }
 console.log('3D yarn QA completed');
}finally{await browser.close()}