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
  await page.waitForTimeout(300);
  assert(await page.locator('#newProjectSetup').isVisible(),'new project setup should show when there is no autosave');
  assert(await page.locator('#resumePrompt').isHidden(),'resume prompt should be hidden without autosave');
  assert(await page.locator('.headerHome').getAttribute('href')==='/', 'editor Main menu link should return to root');

  await page.locator('#projectTitleInput').fill('Resume QA');
  await page.locator('#projectSetupForm').evaluate(form=>form.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.waitForTimeout(1300);

  await page.reload({waitUntil:'networkidle'});
  await page.waitForTimeout(400);
  assert(await page.locator('#projectSetupOverlay').isVisible(),'saved project choice should block the editor on reload');
  assert(await page.locator('#resumePrompt').isVisible(),'resume prompt should show when an autosave exists');
  assert(await page.locator('#newProjectSetup').isHidden(),'new project fields should stay hidden until requested');
  assert((await page.locator('#resumePromptTitle').textContent())==='Continue where you left off?','workspace router overwrote resume prompt heading');
  assert((await page.locator('#resumePromptDetail').textContent()).includes('Resume QA'),'resume prompt should name the saved project');
  assert(!(await page.locator('.projectBadge').textContent()).includes('Resume QA'),'saved project must not be restored/revealed before Continue is chosen');

  await page.locator('#startNewFromResume').click();
  assert(await page.locator('#resumePrompt').isHidden(),'Start new should hide resume prompt');
  assert(await page.locator('#newProjectSetup').isVisible(),'Start new should reveal project setup');
  assert(await page.locator('#projectSetupOverlay').isVisible(),'Start new should keep setup modal open');
  assert((await page.locator('#projectTitleInput').inputValue())==='','Start new should not preload previous project title');

  await page.reload({waitUntil:'networkidle'});
  await page.waitForTimeout(400);
  assert(await page.locator('#resumePrompt').isVisible(),'previous project should remain available after choosing Start new but not creating yet');
  await page.locator('#continuePrevious').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert((await page.locator('.projectBadge').textContent()).includes('Resume QA'),'Continue should restore the saved project');

  await page.goto('http://127.0.0.1:4173/help/',{waitUntil:'networkidle'});
  assert(await page.getByRole('link',{name:'Main menu'}).getAttribute('href')==='/', 'help Main menu link should return to root');
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await context.close();
  console.log('PASS start-flow: saved design hidden until choice; Continue/New/Main menu routes work on mobile');
}finally{
  await browser.close();
}
