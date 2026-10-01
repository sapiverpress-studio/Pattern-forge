import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition, message){ if(!condition) throw new Error(message); }

async function createProject(page, type, title){
  await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle'});
  await page.locator('#projectTypeInput').selectOption(type);
  await page.locator('#projectTitleInput').fill(title);
  await page.locator('#projectSetupForm').evaluate(form=>form.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.waitForTimeout(150);
}

async function disclosureState(page){
  return await page.evaluate(()=>Object.fromEntries([
    'drawingControlsDisclosure','imagesDisclosure','layersDisclosure','previewDisclosure','exportDisclosure'
  ].map(id=>[id,document.getElementById(id)?.open])));
}

const browser = await chromium.launch({headless:true});
await fs.mkdir('mobile-qa',{recursive:true});
try{
  const mobile = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page = await mobile.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});

  await createProject(page,'pattern','Mobile Compact QA');
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.2.0-alpha.6.5','wrong app version');
  let state=await disclosureState(page);
  assert(Object.values(state).every(v=>v===false),`mobile disclosures should start collapsed: ${JSON.stringify(state)}`);
  assert(await page.locator('.mobileTools').isVisible(),'mobile quick tools should remain visible');
  const initialHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  assert(initialHeight<1900,`default mobile page is still too tall: ${initialHeight}px`);
  await page.screenshot({path:'mobile-qa/pattern-mobile-compact.png',fullPage:true});

  await page.locator('[data-mobile-jump="drop"]').click();
  await page.waitForTimeout(200);
  state=await disclosureState(page);
  assert(state.imagesDisclosure===true,'Images nav did not open Images and motifs');
  assert(!state.drawingControlsDisclosure&&!state.layersDisclosure&&!state.exportDisclosure,'Images nav left unrelated disclosures open');
  assert(await page.locator('#drop').isVisible(),'image picker not visible after Images nav');

  await page.locator('[data-mobile-jump="tileSettingsDisclosure"]').click();
  await page.waitForTimeout(200);
  state=await disclosureState(page);
  assert(state.drawingControlsDisclosure===true,'Settings nav did not open drawing controls');
  assert(await page.locator('#tileSettingsDisclosure').evaluate(el=>el.open),'Settings nav did not open tile settings');
  assert(!state.imagesDisclosure&&!state.exportDisclosure,'Settings nav left unrelated disclosures open');

  await page.locator('[data-mobile-jump="exportSection"]').click();
  await page.waitForTimeout(200);
  state=await disclosureState(page);
  assert(state.exportDisclosure===true,'Export nav did not open Export and save');
  assert(await page.locator('#exportPng').isVisible(),'PNG export not visible after Export nav');
  assert(!state.drawingControlsDisclosure&&!state.imagesDisclosure&&!state.layersDisclosure,'Export nav left unrelated disclosures open');

  await page.locator('[data-mobile-jump="stageWrap"]').click();
  await page.waitForTimeout(200);
  state=await disclosureState(page);
  assert(Object.values(state).every(v=>v===false),'Design nav should return to compact canvas-first view');
  assert(errors.length===0,`pattern mobile browser errors: ${errors.join(' | ')}`);
  await mobile.close();

  const doodleMobile = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const doodle = await doodleMobile.newPage();
  const doodleErrors=[];
  doodle.on('pageerror',e=>doodleErrors.push(String(e)));
  doodle.on('console',m=>{if(m.type()==='error')doodleErrors.push(`console: ${m.text()}`)});
  await createProject(doodle,'doodle','Mobile Doodle Compact QA');
  state=await disclosureState(doodle);
  assert(Object.values(state).every(v=>v===false),'Doodle mobile disclosures should start collapsed');
  assert(await doodle.locator('#previewDisclosure').isHidden(),'Doodle should hide repeat-preview disclosure');
  await doodle.screenshot({path:'mobile-qa/doodle-mobile-compact.png',fullPage:true});
  assert(doodleErrors.length===0,`doodle mobile browser errors: ${doodleErrors.join(' | ')}`);
  await doodleMobile.close();

  const desktop = await browser.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:1});
  const desk = await desktop.newPage();
  await createProject(desk,'pattern','Desktop Compatibility QA');
  state=await disclosureState(desk);
  assert(Object.values(state).every(v=>v===true),`desktop disclosures should stay open: ${JSON.stringify(state)}`);
  assert(await desk.locator('.mobileDisclosure>summary').first().isHidden(),'mobile summaries should be hidden on desktop');
  assert(await desk.locator('#exportPng').isVisible(),'desktop export controls were hidden by mobile compaction');
  await desktop.close();

  console.log(`PASS mobile density: default 390x844 scroll height ${initialHeight}px; nav opens only requested section; desktop remains expanded`);
}finally{
  await browser.close();
}
