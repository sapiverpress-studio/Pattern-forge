import { chromium } from 'playwright';
import fs from 'node:fs';

const assert=(c,m)=>{if(!c)throw new Error(m)};
fs.mkdirSync('ux2-real-shots',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1365,height:820},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  assert(await page.locator('#ux2Editor').isVisible(),'canvas-first shell should render');
  assert(await page.locator('#projectSetupOverlay').isVisible(),'new project setup should still gate a fresh session');
  await page.locator('#projectTitleInput').fill('UX Engine QA');
  await page.locator('#projectRepeatStyle').selectOption('straight');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('#editorCanvas').isVisible(),'real editor canvas should be visible');
  const parent=await page.locator('#stageWrap').evaluate(el=>el.parentElement?.id);
  assert(parent==='ux2CanvasSlot','real stage should be moved into new canvas shell');
  assert((await page.locator('#ux2Title').textContent())?.includes('UX Engine QA'),'new shell should display project identity');

  const before=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  await page.locator('[data-ux2-tool="brush"]').click();
  assert(await page.locator('.layout [data-tool="brush"]').first().evaluate(el=>el.classList.contains('active')),'new Brush button should drive real engine tool');
  await page.locator('#ux2Size').evaluate(el=>{el.value='54';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert(await page.locator('#brushSize').inputValue()==='54','contextual size should drive real engine control');
  const box=await page.locator('#editorCanvas').boundingBox(); assert(box,'canvas bounds missing');
  await page.mouse.move(box.x+box.width*.32,box.y+box.height*.35);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.58,box.y+box.height*.60,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(120);
  const afterBrush=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  assert(afterBrush!==before,'real brush should change canvas rendering');

  await page.locator('#ux2Undo').click();await page.waitForTimeout(80);
  const afterUndo=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  assert(afterUndo===before,'new Undo should restore real engine canvas');
  await page.locator('#ux2Redo').click();await page.waitForTimeout(80);
  const afterRedo=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  assert(afterRedo===afterBrush,'new Redo should restore real engine brush mark');

  await page.locator('[data-ux2-tool="eraser"]').click();
  assert(await page.locator('.layout [data-tool="eraser"]').first().evaluate(el=>el.classList.contains('active')),'new Eraser should drive real engine tool');
  await page.locator('[data-ux2-tool="pan"]').click();
  assert(await page.locator('.layout [data-tool="pan"]').first().evaluate(el=>el.classList.contains('active')),'new Pan should drive real engine tool');
  await page.locator('[data-ux2-tool="freefill"]').click();
  assert(await page.locator('.layout [data-tool="freefill"]').first().evaluate(el=>el.classList.contains('active')),'new Fill should drive real engine tool');

  await page.locator('[data-ux2-panel="colour"]').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Colour','Colour palette should open');
  await page.locator('#ux2ColourInput').evaluate(el=>{el.value='#345678';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert((await page.locator('#ink').inputValue()).toLowerCase()==='#345678','new colour control should drive engine ink');

  await page.locator('[data-ux2-panel="layers"]').click();
  const layerCount=await page.locator('#layerList .layerRow').count();
  await page.locator('#ux2AddLayer').click();
  assert(await page.locator('#layerList .layerRow').count()===layerCount+1,'new Layers palette should add a real layer');

  await page.locator('[data-ux2-panel="pattern"]').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Pattern','Pattern palette should be discoverable');
  assert(await page.locator('#ux2FullPreview').isVisible(),'repeat preview should be available from Pattern palette');

  await page.locator('#ux2Export').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Export','Export palette should open');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-export-old="saveProject"]').click();
  const download=await downloadPromise;
  assert((await download.suggestedFilename()).endsWith('.json'),'editable project export should still download JSON');

  await page.screenshot({path:'ux2-real-shots/editor-desktop.png',fullPage:true});
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await context.close();

  const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1});
  const m=await mobile.newPage();
  const mErrors=[];m.on('pageerror',e=>mErrors.push(String(e)));m.on('console',x=>{if(x.type()==='error')mErrors.push(`console: ${x.text()}`)});
  await m.goto('http://127.0.0.1:4173/app/doodle/',{waitUntil:'networkidle'});
  if(await m.locator('#projectSetupOverlay').isVisible()){
    await m.locator('#projectTitleInput').fill('Doodle QA');
    await m.locator('#createProject').click();
    await m.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  }
  assert((await m.locator('#ux2Mode').textContent())==='Doodle','Doodle route should identify Doodle workspace');
  assert(await m.locator('[data-ux2-panel="pattern"]').isHidden(),'Pattern palette should hide in Doodle');
  assert(await m.locator('#editorCanvas').isVisible(),'Doodle should use real canvas in new shell');
  await m.locator('[data-ux2-panel="layers"]').click();
  assert(await m.locator('#ux2Palette').isVisible(),'mobile landscape palette should overlay on demand');
  await m.screenshot({path:'ux2-real-shots/doodle-phone-landscape.png',fullPage:true});
  assert(mErrors.length===0,`mobile browser errors: ${mErrors.join(' | ')}`);
  await mobile.close();
  console.log('PASS canvas-first real editor: engine canvas, tools, undo/redo, colour, layers, pattern and project download');
} finally {await browser.close()}
