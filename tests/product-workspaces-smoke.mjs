import { chromium } from 'playwright';
function assert(v,m){ if(!v) throw new Error(m); }
const browser=await chromium.launch({headless:true});
try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  assert(await page.getByRole('heading',{name:'Sapiver Pattern Forge'}).isVisible(),'launcher heading missing');
  assert((await page.locator('a[href="/app/pattern/"]').count())===1,'Pattern launcher missing');
  assert((await page.locator('a[href="/app/doodle/"]').count())===1,'Doodle launcher missing');
  assert((await page.locator('a[href="/app/"]').count())===1,'Open project launcher missing');
  await page.goto('http://127.0.0.1:4173/app/pattern/',{waitUntil:'networkidle'});
  await page.waitForURL('**/app/pattern/');
  await page.waitForTimeout(250);
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.2.0-alpha.7.0','wrong alpha.7 app version');
  assert(await page.locator('#projectTypeInput').inputValue()==='pattern','Pattern route did not preselect Pattern');
  assert(await page.locator('#projectTypeInput').evaluate(el=>el.closest('.field')?.hidden===true),'Pattern route should hide redundant project type field');
  assert(await page.evaluate(()=>window.PatternForgePlatform?.runtime)==='web','platform adapter missing');
  await page.goto('http://127.0.0.1:4173/app/doodle/',{waitUntil:'networkidle'});
  await page.waitForURL('**/app/doodle/');
  await page.waitForTimeout(250);
  assert(await page.locator('#projectTypeInput').inputValue()==='doodle','Doodle route did not preselect Doodle');
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await ctx.close();
  console.log('PASS product workspaces: launcher, Pattern route, Doodle route, shared app and platform adapter');
} finally { await browser.close(); }
