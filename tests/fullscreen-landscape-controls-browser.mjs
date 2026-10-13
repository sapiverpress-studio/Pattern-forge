import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
async function setup(width,height,doodle=false){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,hasTouch:true});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTypeInput').selectOption(doodle?'doodle':'pattern');
  await page.locator('#projectTitleInput').fill('Landscape editor UI');
  await page.locator('#projectSetupForm').evaluate(el=>el.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  return {context,page,errors};
}
function boundsReport(page){
  return page.evaluate(()=>{
    function b(q){let el=document.querySelector(q);if(!el)return null;let r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:getComputedStyle(el).display!=='none'&&r.width>0&&r.height>0}}
    const footer=document.getElementById('ux2Context');
    return {viewport:{w:innerWidth,h:innerHeight},clean:b('#ux2ShapeClean'),menu:b('#ux2ToolMenuTrigger'),zoom:b('#ux2CanvasHead'),header:b('.ux2-canvas-head'),footer:b('#ux2Context'),more:b('#ux2ContextSettingsToggle'),pane:b('#ux2ContextExtras'),buttons:b('#ux2Export'),footerScroll:footer.scrollWidth,footerClient:footer.clientWidth};
  });
}
async function assertCompact(page,tag){
  const report=await boundsReport(page);
  assert(report.clean?.visible,'Shape Clean must always be visible: '+tag+' '+JSON.stringify(report));
  assert(report.clean.x>=0&&report.clean.right<=report.viewport.w+1,'Shape Clean outside screen: '+tag);
  assert(report.clean.y>=0&&report.clean.bottom<=report.viewport.h+1,'Shape Clean outside screen vertically: '+tag);
  assert(report.more?.visible,'Tool settings must be directly discoverable: '+tag);
  assert(report.more.x>=0&&report.more.right<=report.viewport.w+2,'Settings button cropped off-screen: '+tag+' '+JSON.stringify(report));
  assert(report.footerScroll<=report.footerClient+3,'Overflow should be in explicit tray not hidden sideways: '+tag+' '+JSON.stringify(report));
  assert(report.clean.right<=report.viewport.w,'clean is usable: '+tag);
  if(await page.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen'))){
    assert(report.menu?.visible&&report.menu.x<80,'Tools must be anchored on left side, not crowding Undo/Shape Clean/Export: '+tag+' '+JSON.stringify(report));
    if(report.header?.visible&&report.header.right>report.clean.x&&report.header.x<report.clean.right
       &&report.header.bottom>report.clean.y&&report.header.y<report.clean.bottom)
      throw Error('Colour/zoom palette obscures Shape Clean: '+tag+' '+JSON.stringify(report));
  }
  return report;
}
async function toggleFullscreen(page){
  await page.locator('#ux2Fullscreen').evaluate(el=>el.click());
  await page.locator('body.ux2-fullscreen').waitFor({state:'attached'});
}
async function checkBrush(page,tag){
  await page.locator('[data-ux2-tool="brush"]').first().evaluate(el=>el.click());
  await assertCompact(page,tag+' brush');
  assert(await page.locator('#ux2Size').isVisible(),'Immediate brush size available');
  const toggle=page.locator('#ux2ContextSettingsToggle');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.evaluate(el=>el.click());
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  const pane=page.locator('#ux2ContextExtras');assert(await pane.isVisible());
  for(const id of ['ux2Opacity','ux2Stabilisation','ux2PressureWidth','ux2AutoClose','ux2AutoCloseDistance']){
    assert(await page.locator('#'+id).isVisible(),tag+' brush settings: '+id);
  }
  await page.locator('#ux2Stabilisation').selectOption('strong');
  assert.equal(await page.locator('#strokeStabilisation').inputValue(),'strong');
  await page.locator('#ux2Opacity').evaluate(el=>{el.value='77';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.locator('#inkOpacity').inputValue(),'77');
  await page.locator('#ux2PressureWidth').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.locator('#pressureWidth').isChecked(),true);
  await page.locator('#ux2ContextExtrasClose').evaluate(el=>el.click());
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await pane.isVisible(),false);
  await page.locator('#ux2ShapeClean').evaluate(el=>el.click());
  const msg=await page.locator('#status').textContent();
  assert.match(msg,/Draw a rough circle/,'Shape Clean action is wired, not decorative');
  await page.locator('[data-ux2-tool="brush"]').first().evaluate(el=>el.click());
  assert.equal(await page.locator('#ux2ContextExtras').isVisible(),false);
}
async function checkShape(page,tag){
  await page.locator('[data-ux2-tool="rect"]').first().evaluate(el=>el.click());
  await assertCompact(page,tag+' shape');
  await page.locator('#ux2ContextSettingsToggle').evaluate(el=>el.click());
  for(const id of ['ux2ShapeWidth','ux2ShapeFill','ux2ShapeColour'])
    assert(await page.locator('#'+id).isVisible(),tag+' shape extra '+id);
  await page.locator('#ux2ShapeFill').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.locator('#shapeFill').isChecked(),false);
  await page.locator('#ux2ContextExtrasClose').evaluate(el=>el.click());
}
try{
 for(const [w,h] of [[1536,686],[844,390],[760,360]]){
  const {context,page,errors}=await setup(w,h);
  try{
   await toggleFullscreen(page);
   await checkBrush(page,w+'x'+h);
   await checkShape(page,w+'x'+h);
   const pos=await boundsReport(page);
   console.log('PASS fullscreen '+w+'x'+h+' clean and tray positions '+JSON.stringify({clean:pos.clean,more:pos.more,menu:pos.menu}));
   assert.deepEqual(errors,[],'No page errors in fullscreen UX');
  }finally{await context.close()}
 }
 {
  const {context,page,errors}=await setup(1024,768);
  try{
   await checkBrush(page,'regular desktop');
   assert.deepEqual(errors,[]);
   console.log('PASS regular editor command strip');
  }finally{await context.close()}
 }
 {
  const {context,page,errors}=await setup(844,390,true);
  try{
   await toggleFullscreen(page);
   await checkBrush(page,'Doodle landscape');
   assert.deepEqual(errors,[]);
   console.log('PASS Doodle fullscreen, Brush settings and Shape Clean accessible');
  }finally{await context.close()}
 }
 console.log('PASS 5/5 responsive workspace scenarios');
}finally{await browser.close()}
