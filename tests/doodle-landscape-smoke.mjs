import { chromium } from 'playwright';

function assert(condition, message){ if(!condition) throw new Error(message); }

const browser = await chromium.launch({headless:true});
try {
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{ if(m.type()==='error') errors.push(`console: ${m.text()}`); });

  await page.goto('http://127.0.0.1:4173/app/doodle/?workspace=doodle',{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  const gate=page.locator('#doodleLandscapeGate');
  assert(await gate.isVisible(),'Doodle should show the rotate-to-landscape blocker in portrait');
  assert((await gate.locator('h2').textContent())?.includes('Rotate to landscape'),'Doodle landscape blocker heading is missing');

  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(150);
  assert(await gate.isHidden(),'Doodle blocker should disappear in landscape');
  assert(await page.locator('#projectSetupOverlay').isVisible(),'Doodle project setup should be usable in landscape');

  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/app/pattern/?workspace=pattern',{waitUntil:'networkidle'});
  await page.waitForTimeout(150);
  assert(await page.locator('#doodleLandscapeGate').isHidden(),'Pattern workspace must remain usable in portrait');

  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await context.close();
  console.log('PASS Doodle landscape: portrait blocked, landscape enabled, Pattern portrait unaffected');
} finally {
  await browser.close();
}
