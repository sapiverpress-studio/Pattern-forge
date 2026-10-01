import { chromium } from 'playwright';

function assert(condition, message){ if(!condition) throw new Error(message); }

async function openFresh(page, path){
  await page.goto(`http://127.0.0.1:4173${path}`, {waitUntil:'networkidle'});
  await page.evaluate(async () => {
    localStorage.clear();
    if ('indexedDB' in window) {
      const dbs = await indexedDB.databases?.() || [];
      await Promise.all(dbs.map(db => db.name && new Promise(resolve => {
        const req = indexedDB.deleteDatabase(db.name); req.onsuccess = req.onerror = req.onblocked = () => resolve();
      })));
    }
  });
  await page.reload({waitUntil:'networkidle'});
}

const browser = await chromium.launch({headless:true});
try {
  const ctx = await browser.newContext({ viewport:{width:1280,height:800}, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{ if(m.type()==='error') errors.push(`console: ${m.text()}`); });
  await openFresh(page,'/app/pattern/');

  assert(await page.locator('#pfLiveShell').isVisible(),'canvas-first live shell should mount');
  assert(await page.locator('#projectSetupOverlay').isVisible(),'project setup should remain available');
  await page.locator('#startPractice').click();
  await page.waitForTimeout(200);
  assert(await page.locator('#projectSetupOverlay').isHidden(),'practice should enter the editor');
  assert(await page.locator('#pfCanvasHost #stageWrap').count()===1,'real stage should be mounted in new canvas host');
  assert(await page.locator('#pfCanvasHost #editorCanvas').isVisible(),'real editor canvas should be visible');

  const before = await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  await page.locator('[data-pf-tool="brush"]').click();
  assert(await page.locator('.panel.left [data-tool="brush"]').first().evaluate(el=>el.classList.contains('active')),'new Brush must activate legacy engine Brush');
  const canvas = page.locator('#editorCanvas');
  const box = await canvas.boundingBox();
  assert(box && box.width>150 && box.height>150,'canvas should have usable dimensions');
  await page.mouse.move(box.x+box.width*.38,box.y+box.height*.38);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.62,box.y+box.height*.62,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(120);
  const drawn = await canvas.evaluate(c=>c.toDataURL());
  assert(drawn!==before,'drawing through new shell must change the real canvas');
  await page.locator('#pfUndo').click();
  await page.waitForTimeout(120);
  const undone = await canvas.evaluate(c=>c.toDataURL());
  assert(undone!==drawn,'Undo in new top bar must affect engine state');

  await page.locator('[data-pf-panel="layers"]').click();
  assert(await page.locator('#pfPanelBody #layersDisclosure').isVisible(),'Layers should expose real layer controls');
  await page.locator('[data-pf-panel="colour"]').click();
  assert(await page.locator('#layersDisclosure').count()===1,'switching panels must not destroy real Layers DOM');
  assert(await page.locator('#pfPanelBody .pf-colour-picker').isVisible(),'Colour palette should open');
  await page.locator('[data-pf-panel="pattern"]').click();
  assert(await page.locator('#pfPanelBody #previewDisclosure').isVisible(),'Pattern panel should expose real repeat preview');
  assert(await page.locator('#pfPanelBody').getByText('Repeat visibility').isVisible(),'Pattern controls should be discoverable');
  await page.locator('#pfExport').click();
  assert(await page.locator('#pfPanelBody #exportDisclosure').isVisible(),'Export top action should expose real export controls');
  assert(await page.locator('#pfPanelBody #exportPng').isVisible(),'real PNG export action should remain available');

  await page.screenshot({path:'live-shots/pattern-desktop.png',fullPage:true});
  assert(errors.length===0,`pattern browser errors: ${errors.join(' | ')}`);
  await ctx.close();

  const mobile = await browser.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:1 });
  const m = await mobile.newPage();
  const mobileErrors=[];
  m.on('pageerror',e=>mobileErrors.push(String(e)));
  m.on('console',msg=>{ if(msg.type()==='error') mobileErrors.push(`console: ${msg.text()}`); });
  await openFresh(m,'/app/doodle/');
  assert(await m.locator('#pfLiveShell').isVisible(),'Doodle should mount canvas-first shell');
  await m.locator('#projectTitleInput').fill('Doodle test');
  await m.locator('#createProject').click();
  await m.waitForTimeout(220);
  assert(await m.locator('#projectSetupOverlay').isHidden(),'Doodle project should open');
  assert(await m.locator('#pfLiveShell').evaluate(el=>el.classList.contains('is-doodle')),'shell should reflect Doodle mode');
  assert(await m.locator('[data-pf-panel="pattern"]').isHidden(),'Pattern panel must hide in Doodle');
  assert(await m.locator('#editorCanvas').isVisible(),'Doodle real canvas should be visible');
  await m.locator('[data-pf-tool="brush"]').click();
  assert(await m.locator('#pfContextBar').getByText('Brush').first().isVisible(),'Doodle should expose contextual brush controls');
  await m.locator('[data-pf-panel="layers"]').click();
  const canvasBox = await m.locator('#pfCanvasHost').boundingBox();
  const panelBox = await m.locator('#pfSidePanel').boundingBox();
  assert(canvasBox && panelBox && panelBox.x > canvasBox.x,'phone landscape panel should overlay from right rather than replace canvas');
  await m.screenshot({path:'live-shots/doodle-phone-landscape.png',fullPage:true});
  assert(mobileErrors.length===0,`doodle browser errors: ${mobileErrors.join(' | ')}`);
  await mobile.close();

  console.log('PASS live canvas-first shell: real canvas, drawing, undo, panels, export and Doodle');
} finally {
  await browser.close();
}
