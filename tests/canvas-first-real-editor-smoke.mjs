// UX2 current-head verification
import { chromium } from 'playwright';
import fs from 'node:fs';

const assert=(c,m)=>{if(!c)throw new Error(m)};
fs.mkdirSync('ux2-real-shots',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1365,height:820},acceptDownloads:true});
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  assert(await page.getByText('New Pattern',{exact:true}).isVisible(),'project home should expose New Pattern');
  assert(await page.getByText('New Doodle',{exact:true}).isVisible(),'project home should expose New Doodle');
  const homeBlue=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--blue').trim());
  assert(homeBlue.toLowerCase()==='#6f89a8','project home should use blue/silver design system');
  await page.screenshot({path:'ux2-real-shots/project-home.png',fullPage:true});

  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  assert(await page.locator('#ux2Editor').isVisible(),'canvas-first shell should render');
  assert(await page.locator('#projectSetupOverlay').isVisible(),'generic project route should still gate a fresh session');
  await page.locator('#projectTitleInput').fill('UX Engine QA');
  await page.locator('#projectRepeatStyle').selectOption('straight');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('#editorCanvas').isVisible(),'real editor canvas should be visible');
  const parent=await page.locator('#stageWrap').evaluate(el=>el.parentElement?.id);
  assert(parent==='ux2CanvasSlot','real stage should be moved into new canvas shell');
  assert((await page.locator('#ux2Title').textContent())?.includes('UX Engine QA'),'new shell should display project identity');
  assert(await page.locator('[data-ux2-action="image"]').isVisible(),'Image tool should be discoverable');
  assert(await page.locator('[data-ux2-tool="rect"]').isVisible(),'Shape tool should be discoverable');
  assert(await page.locator('#ux2Fullscreen').isVisible(),'fullscreen control should be visible in Pattern');
  await page.locator('#ux2Fullscreen').click();
  await page.waitForTimeout(80);
  assert(await page.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen')),'Pattern fullscreen should enter immersive UX2 mode');
  assert(await page.locator('.ux2-tools').isVisible(),'Pattern fullscreen should keep the creative tool rail available as an overlay');
  assert(await page.locator('.ux2-dockbar').isVisible(),'Pattern fullscreen should keep quick palettes available as an overlay');
  assert(await page.locator('#ux2Context').isVisible(),'Pattern fullscreen should keep contextual tool controls available as an overlay');
  const canvasHead=page.locator('.ux2-canvas-head');
  assert(await canvasHead.isVisible(),'Pattern fullscreen should keep Fit, zoom and palette controls available');
  const canvasHeadBox=await canvasHead.boundingBox(),toolRailBox=await page.locator('.ux2-tools').boundingBox(),dockRailBox=await page.locator('.ux2-dockbar').boundingBox();
  assert(canvasHeadBox&&toolRailBox&&canvasHeadBox.x>=toolRailBox.x+toolRailBox.width-1,'Fullscreen canvas controls should stay clear of the left camera/tool rail');
  assert(canvasHeadBox&&dockRailBox&&canvasHeadBox.x+canvasHeadBox.width<=dockRailBox.x+1,'Fullscreen canvas controls should stay clear of the right tool rail');
  const fullscreenZoom=Number(await page.locator('#zoom').inputValue());
  assert(fullscreenZoom>=250&&fullscreenZoom<=300,'Pattern fullscreen should fit into the detailed working zoom range');
  const patternStage=await page.locator('#stageWrap').boundingBox();
  assert(patternStage&&patternStage.height>760,'Pattern fullscreen should preserve the large square drawing surface');
  await page.locator('[data-ux2-tool="brush"]').click();
  assert(await page.locator('#ux2BrushLibrary').isVisible(),'Pattern fullscreen Brush should expose contextual brush controls');
  assert(await page.locator('.layout [data-tool="brush"]').first().evaluate(el=>el.classList.contains('active')),'Pattern fullscreen Brush should still drive the real engine');
  await page.locator('[data-ux2-panel="colour"]').click();
  assert(await page.locator('#ux2Palette').isVisible(),'Pattern fullscreen palette controls should open over the large canvas');
  await page.locator('#ux2PaletteClose').click();
  await page.locator('#ux2Fullscreen').click();
  await page.waitForTimeout(80);
  assert(!(await page.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen'))),'Pattern fullscreen should exit immersive UX2 mode');
  assert(Number(await page.locator('#zoom').inputValue())===100,'Pattern fullscreen should restore the previous zoom on exit');

  const before=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  await page.locator('[data-ux2-tool="brush"]').click();
  assert(await page.locator('.layout [data-tool="brush"]').first().evaluate(el=>el.classList.contains('active')),'new Brush button should drive real engine tool');
  assert(await page.locator('#ux2BrushLibrary').isVisible(),'Brush library should be discoverable from brush context');
  await page.locator('#ux2BrushLibrary').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Brush Library','Brush Library palette should open');
  assert(await page.locator('.ux2-brush-card').filter({hasText:'Textured paint'}).isVisible(),'existing textured brush should be visible');
  await page.locator('[data-brush-style="marker"]').click();
  assert((await page.locator('#brushStyle').inputValue())==='marker','brush library should drive existing brush style');
  await page.locator('[data-ux2-tool="brush"]').click();
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

  await page.locator('#ux2Undo').click();await page.waitForTimeout(100);
  const afterUndo=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  assert(afterUndo===before,'new Undo should restore real engine canvas');
  await page.locator('#ux2Redo').click();await page.waitForTimeout(100);
  const afterRedo=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
  assert(afterRedo===afterBrush,'new Redo should restore real engine brush mark');

  await page.locator('[data-ux2-tool="select"]').click();
  await page.mouse.click(box.x+box.width*.45,box.y+box.height*.48);
  await page.waitForTimeout(150);
  if(await page.locator('#selScale').count()){
    assert(await page.locator('#ux2SelScale').isVisible(),'selected artwork should expose scale in contextual inspector');
    assert(await page.locator('#ux2SelRot').isVisible(),'selected artwork should expose rotation in contextual inspector');
    assert(await page.locator('#ux2SelOpacity').isVisible(),'selected artwork should expose opacity in contextual inspector');
  }

  await page.locator('[data-ux2-tool="eraser"]').click();
  assert(await page.locator('.layout [data-tool="eraser"]').first().evaluate(el=>el.classList.contains('active')),'new Eraser should drive real engine tool');
  await page.locator('[data-ux2-tool="pan"]').click();
  assert(await page.locator('.layout [data-tool="pan"]').first().evaluate(el=>el.classList.contains('active')),'new Pan should drive real engine tool');
  await page.locator('[data-ux2-tool="freefill"]').click();
  assert(await page.locator('.layout [data-tool="freefill"]').first().evaluate(el=>el.classList.contains('active')),'new Fill should drive real engine tool');
  await page.locator('[data-ux2-tool="rect"]').click();
  assert(await page.locator('#ux2Line').isVisible()&&await page.locator('#ux2Ellipse').isVisible(),'Shape context should expose line, rectangle and ellipse');
  await page.locator('#ux2Ellipse').click();
  assert(await page.locator('.layout [data-tool="ellipse"]').first().evaluate(el=>el.classList.contains('active')),'Shape context should drive real ellipse engine tool');

  await page.locator('[data-ux2-panel="colour"]').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Colour','Colour palette should open');
  await page.locator('#ux2ColourInput').evaluate(el=>{el.value='#345678';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert((await page.locator('#ink').inputValue()).toLowerCase()==='#345678','new colour control should drive engine ink');
  assert(await page.locator('#ux2AddPaletteColour').isVisible(),'palette editing should be discoverable');
  assert(await page.locator('#ux2SavedPalette').isVisible(),'saved palettes should be discoverable');

  await page.locator('[data-ux2-panel="layers"]').click();
  const layerCount=await page.locator('#layerList .layerRow').count();
  assert(await page.locator('#ux2LayerName').isVisible(),'layer naming should be visible');
  assert(await page.locator('#ux2LayerLocked').isVisible(),'layer locking should be visible');
  assert(await page.locator('#ux2LayerExport').isVisible(),'layer export flag should be visible');
  await page.locator('#ux2AddLayer').click();
  await page.waitForFunction(expected=>document.querySelectorAll('#layerList .layerRow').length===expected,layerCount+1);
  assert(await page.locator('#layerList .layerRow').count()===layerCount+1,'new Layers palette should add a real layer');

  await page.locator('[data-ux2-panel="pattern"]').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Pattern','Pattern palette should be discoverable');
  assert(await page.locator('#ux2FullPreview').isVisible(),'repeat preview should be available from Pattern palette');
  assert(await page.locator('#ux2SeamInspect').isVisible(),'seam inspection should be discoverable');
  assert(await page.locator('#ux2Grid').isVisible(),'grid controls should be discoverable');
  assert(await page.locator('#ux2Symmetry').isVisible(),'symmetry controls should be discoverable');
  assert(await page.locator('#ux2SnapOn').isVisible(),'snapping should be discoverable');

  await page.locator('#ux2Export').click();
  assert((await page.locator('#ux2PaletteTitle').textContent())==='Export','Export palette should open');
  assert(await page.locator('#ux2PaletteBody .ux2-repeat-card span').filter({hasText:'300 DPI metadata'}).isVisible(),'export confidence should disclose 300 DPI metadata');
  const downloadPromise=page.waitForEvent('download',{timeout:12000});
  await page.locator('[data-export-old="saveProject"]').click();
  const download=await downloadPromise;
  assert((await download.suggestedFilename()).endsWith('.json'),'editable project export should still download JSON');

  await page.screenshot({path:'ux2-real-shots/editor-desktop.png',fullPage:true});
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await context.close();

  const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1});
  const m=await mobile.newPage();m.setDefaultTimeout(12000);
  const mErrors=[];m.on('pageerror',e=>mErrors.push(String(e)));m.on('console',x=>{if(x.type()==='error')mErrors.push(`console: ${x.text()}`)});
  await m.goto('http://127.0.0.1:4173/app/doodle/',{waitUntil:'networkidle'});
  await m.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert((await m.locator('#ux2Mode').textContent())==='Doodle','Doodle route should identify Doodle workspace');
  assert(await m.locator('[data-ux2-panel="pattern"]').isHidden(),'Pattern palette should hide in Doodle');
  assert(await m.locator('#editorCanvas').isVisible(),'Doodle should use real canvas in new shell');
  assert(await m.locator('#ux2Fullscreen').isVisible(),'fullscreen control should be visible in Doodle');
  await m.locator('#ux2Fullscreen').click();await m.waitForTimeout(60);
  assert(await m.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen')),'Doodle fullscreen should enter immersive UX2 mode');
  assert(await m.locator('.ux2-tools').isVisible(),'Doodle fullscreen should keep creative tools available as a compact overlay');
  const fullscreenTools=await m.locator('.ux2-tools').boundingBox();
  assert(fullscreenTools&&fullscreenTools.x>=50,'Doodle fullscreen tool rail should clear the landscape camera cutout area');
  assert(await m.locator('.ux2-dockbar').isVisible(),'Doodle fullscreen should keep Colour and Layers available as a compact overlay');
  assert(await m.locator('#ux2Context').isVisible(),'Doodle fullscreen should keep contextual tool controls available as an overlay');
  assert(Number(await m.locator('#zoom').inputValue())===270,'Doodle fullscreen should enter at detailed 270% zoom');
  const immersiveStage=await m.locator('#stageWrap').boundingBox();
  assert(immersiveStage&&immersiveStage.height>330,'Doodle fullscreen should give the square canvas nearly the full landscape height');
  await m.locator('[data-ux2-tool="brush"]').click();
  assert(await m.locator('#ux2BrushLibrary').isVisible(),'Doodle fullscreen Brush should expose size, opacity and brush-library controls');
  assert(await m.locator('.layout [data-tool="brush"]').first().evaluate(el=>el.classList.contains('active')),'Doodle fullscreen Brush should still drive the real drawing engine');
  await m.locator('[data-ux2-panel="layers"]').click();
  assert(await m.locator('#ux2Palette').isVisible(),'Doodle fullscreen Layers should open over the canvas');
  await m.locator('#ux2PaletteClose').click();
  await m.locator('#ux2Fullscreen').click();await m.waitForTimeout(60);
  assert(!(await m.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen'))),'Doodle fullscreen should exit immersive UX2 mode');
  assert(Number(await m.locator('#zoom').inputValue())===100,'Doodle fullscreen should restore the previous zoom on exit');
  await m.locator('[data-ux2-panel="layers"]').click();
  assert(await m.locator('#ux2Palette').isVisible(),'mobile landscape palette should overlay on demand');
  await m.screenshot({path:'ux2-real-shots/doodle-phone-landscape.png',fullPage:true});
  assert(mErrors.length===0,`mobile browser errors: ${mErrors.join(' | ')}`);
  await mobile.close();
  console.log('PASS canvas-first real editor: home, canvas, tools, brush library, shapes, transform, undo/redo, colour, layers, pattern, export and Doodle landscape');
} finally {await browser.close()}
