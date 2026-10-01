import { chromium } from 'playwright';

function assert(condition, message){ if(!condition) throw new Error(message); }

const browser = await chromium.launch({headless:true});
try{
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});

  await page.goto('http://127.0.0.1:4173/app/pattern/',{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  const cancel = page.locator('#cancelProjectSetup');
  assert(await cancel.isVisible(),'Cancel should be visible when entering New Pattern Project with no current project');
  assert((await cancel.textContent())?.trim()==='Cancel','Cancel button should be labelled Cancel');
  await cancel.click();
  await page.waitForURL('http://127.0.0.1:4173/');

  await page.goto('http://127.0.0.1:4173/app/pattern/',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Cancel QA');
  await page.locator('#projectSetupForm').evaluate(form=>form.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  const badgeBefore=(await page.locator('.projectBadge').textContent())||'';
  assert(badgeBefore.includes('Cancel QA'),'test project should be active before reopening Project');

  await page.locator('#projectMenu').click();
  assert(await cancel.isVisible(),'Cancel should be visible when Project is opened from an active project');
  await cancel.click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(((await page.locator('.projectBadge').textContent())||'').includes('Cancel QA'),'Cancel should return to the current project without changing it');
  assert(!page.url().endsWith('/'),'Cancel from an active project should not send the user to Main menu');

  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await context.close();
  console.log('PASS project cancel: no-project Cancel returns to Main menu; active-project Cancel returns unchanged');
}finally{
  await browser.close();
}
