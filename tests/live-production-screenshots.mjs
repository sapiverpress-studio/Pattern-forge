import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const LIVE='https://sapiver-pattern-forge.netlify.app';
await fs.mkdir('live-screenshots',{recursive:true});

async function makeShot(browser, {mode, viewport, name}) {
  const context = await browser.newContext({viewportSize:viewport, deviceScaleFactor:1});
  const page = await context.newPage();
  await page.goto(LIVE,{waitUntil:'networkidle'});
  await page.locator('#projectTypeInput').selectOption(mode);
  await page.locator('#projectTitleInput').fill(mode==='doodle'?'Live Doodle QA':'Live Pattern QA');
  await page.locator('#projectSetupForm').evaluate(form=>form.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.waitForTimeout(500);
  await page.screenshot({path:`live-screenshots/${name}.png`,fullPage:true});
  const version=await page.locator('meta[name="app-version"]').getAttribute('content');
  const badge=(await page.locator('#projectNameDisplay').textContent())?.trim();
  console.log(`${name}: version=${version} badge=${badge}`);
  await context.close();
}

const browser=await chromium.launch({headless:true});
try {
  await makeShot(browser,{mode:'pattern',viewport:{width:1440,height:1200},name:'pattern-desktop'});
  await makeShot(browser,{mode:'doodle',viewport:{width:1440,height:1200},name:'doodle-desktop'});
  await makeShot(browser,{mode:'pattern',viewport:{width:390,height:844},name:'pattern-mobile'});
  await makeShot(browser,{mode:'doodle',viewport:{width:390,height:844},name:'doodle-mobile'});
} finally {
  await browser.close();
}
