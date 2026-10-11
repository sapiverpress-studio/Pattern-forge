import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'domcontentloaded'});
  await page.locator('#ux2Export').waitFor({state:'attached',timeout:20000});
  await page.locator('#ux2Export').evaluate(el=>el.click());
  await page.locator('#ux2PosterSync').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#ux2PosterSync').textContent(),'Send to Sapiver Prints');
  assert.equal(await page.locator('#ux2EtsyExport').count(),1,'Original Etsy export must remain');
  assert.equal(await page.locator('#ux2PosterSyncStatus').count(),1);
  assert.deepEqual(errors,[],'JavaScript exceptions in complete Pattern Forge application');
  console.log('PASS live Pattern Forge application UI: Etsy exporter retained, new Send to Sapiver Prints action available on mobile layout');
}finally{await browser.close()}
