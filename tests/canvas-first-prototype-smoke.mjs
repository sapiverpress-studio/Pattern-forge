import { chromium } from 'playwright';
import fs from 'node:fs';

function assert(condition, message){ if(!condition) throw new Error(message); }
fs.mkdirSync('prototype-shots', { recursive:true });

const browser = await chromium.launch({headless:true});
try {
  const desktop = await browser.newContext({ viewport:{ width:1440, height:900 }, deviceScaleFactor:1 });
  const page = await desktop.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{ if(m.type()==='error') errors.push(`console: ${m.text()}`); });
  await page.goto('http://127.0.0.1:4173/prototype/', {waitUntil:'networkidle'});

  assert(await page.locator('[data-action="new-pattern"]').isVisible(),'New Pattern should be visible');
  assert(await page.locator('[data-action="new-doodle"]').isVisible(),'New Doodle should be visible');
  const iconCount = await page.locator('svg use[href*="icons.svg"]').count();
  assert(iconCount >= 10, 'prototype should use the custom Sapiver SVG icon set');
  const blue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--blue').trim());
  assert(blue.toLowerCase()==='#6f89a8','prototype should use the approved slate-blue accent');
  assert(await page.locator('.motif').count()===0,'prototype must not contain decorative sample motifs');
  assert(await page.locator('.neutral-thumb').count()===3,'recent projects should use neutral structural previews');
  await page.screenshot({path:'prototype-shots/gallery-desktop.png',fullPage:true});

  await page.locator('[data-action="new-pattern"]').click();
  assert(await page.locator('#newPatternModal').isVisible(),'repeat chooser should open');
  await page.locator('[data-repeat="Half-drop"]').click();
  await page.locator('#createPatternButton').click();
  assert(await page.locator('#editorView').isVisible(),'editor should open');
  assert((await page.locator('#projectName').textContent())?.includes('Half-drop'),'repeat choice should carry into project title');
  await page.locator('[data-tool="brush"]').click();
  assert((await page.locator('#canvasHint').textContent())?.includes('Draw directly'),'Brush should expose brush-specific context');
  assert(await page.locator('#contextBar').getByText('Brush library').isVisible(),'Brush library entry should be visible');
  await page.locator('[data-panel="pattern"]').click();
  assert((await page.locator('#panelTitle').textContent())==='Pattern','Pattern panel should open');
  assert(await page.locator('#panelBody').getByText('Seam check').isVisible(),'Pattern specialist feature should be discoverable');
  await page.screenshot({path:'prototype-shots/editor-desktop.png',fullPage:true});
  assert(errors.length===0,`desktop browser errors: ${errors.join(' | ')}`);
  await desktop.close();

  const mobile = await browser.newContext({ viewport:{ width:844, height:390 }, deviceScaleFactor:1 });
  const m = await mobile.newPage();
  const mobileErrors=[];
  m.on('pageerror',e=>mobileErrors.push(String(e)));
  m.on('console',msg=>{ if(msg.type()==='error') mobileErrors.push(`console: ${msg.text()}`); });
  await m.goto('http://127.0.0.1:4173/prototype/', {waitUntil:'networkidle'});
  await m.screenshot({path:'prototype-shots/gallery-phone-landscape.png',fullPage:true});
  await m.locator('[data-action="new-doodle"]').click();
  assert((await m.locator('#modePill').textContent())==='Doodle','Doodle should open directly');
  assert(await m.locator('.pattern-only').isHidden(),'Pattern-only dock should hide in Doodle');
  assert(await m.locator('#sidePanel').isHidden(),'phone landscape should start with palette closed so canvas keeps its width');
  await m.locator('[data-panel="layers"]').click();
  assert(await m.locator('#sidePanel').isVisible(),'phone palette should open on demand as an overlay');
  await m.locator('#closePanel').click();
  assert(await m.locator('#sidePanel').isHidden(),'phone palette should close without leaving a permanent canvas column');
  await m.locator('[data-tool="brush"]').click();
  assert(await m.locator('#contextBar').getByText('Brush library').isVisible(),'mobile landscape should expose contextual Brush controls');
  await m.screenshot({path:'prototype-shots/doodle-phone-landscape.png',fullPage:true});
  assert(mobileErrors.length===0,`mobile browser errors: ${mobileErrors.join(' | ')}`);
  await mobile.close();

  console.log('PASS canvas-first prototype: original icons, blue/silver system, neutral previews, contextual editor, Pattern tools and phone overlay palette');
} finally {
  await browser.close();
}
