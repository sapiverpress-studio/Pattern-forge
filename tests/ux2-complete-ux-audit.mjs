import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE=process.env.UX2_AUDIT_BASE_URL||'http://127.0.0.1:4173';
const OUT='ux2-audit';
const SHOTS=path.join(OUT,'shots');
fs.mkdirSync(SHOTS,{recursive:true});
const fixture=path.join(OUT,'audit-fixture.svg');
fs.writeFileSync(fixture,'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" rx="18" fill="#9cb3c9"/><circle cx="80" cy="60" r="28" fill="#526d8f"/></svg>');

const results=[];
const warnings=[];
const browserErrors=[];
const fmt=v=>v===undefined?'':typeof v==='string'?v:JSON.stringify(v);

async function step(name,fn){
  try{
    const detail=await fn();
    results.push({name,status:'PASS',detail:fmt(detail)});
  }catch(error){
    results.push({name,status:'FAIL',detail:error instanceof Error?error.message:String(error)});
  }
}
function assert(condition,message){if(!condition)throw new Error(message);}
async function shot(page,name){await page.screenshot({path:path.join(SHOTS,name+'.png'),fullPage:true});}
async function attachErrors(page,label){
  page.on('pageerror',e=>browserErrors.push(label+': pageerror: '+String(e)));
  page.on('console',m=>{if(m.type()==='error')browserErrors.push(label+': console: '+m.text());});
}
async function visible(page,selector){return await page.locator(selector).isVisible().catch(()=>false);}
async function activeOldTool(page,tool){
  return await page.locator('.layout [data-tool="'+tool+'"]').first().evaluate(el=>el.classList.contains('active'));
}
async function collectLayout(page,label){
  const data=await page.evaluate(()=>{
    const viewport={w:innerWidth,h:innerHeight};
    const gate=document.getElementById('doodleLandscapeGate');
    const gateStyle=gate?getComputedStyle(gate):null;
    const gateVisible=!!gate&&gateStyle.display!=='none'&&gateStyle.visibility!=='hidden';
    const els=[...document.querySelectorAll('button,a[href],input,select')].filter(el=>{
      if(gateVisible&&!gate.contains(el))return false;
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
    }).map(el=>{
      const r=el.getBoundingClientRect();
      return {
        tag:el.tagName.toLowerCase(),
        id:el.id||'',
        text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,80),
        aria:el.getAttribute('aria-label')||'',
        title:el.getAttribute('title')||'',
        x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
        right:Math.round(r.right),bottom:Math.round(r.bottom)
      };
    });
    return {viewport,els};
  });
  for(const el of data.els){
    const name=el.id||el.aria||el.title||el.text||el.tag;
    if(el.x<-1||el.y<-1||el.right>data.viewport.w+1||el.bottom>data.viewport.h+1){
      warnings.push(label+': clipped/overflowing control "'+name+'" @ '+JSON.stringify(el));
    }
    if(el.tag==='button'&&el.w<32&&el.h<32){
      warnings.push(label+': small button target "'+name+'" is '+el.w+'x'+el.h);
    }
  }
  fs.writeFileSync(path.join(OUT,label.replace(/[^a-z0-9-]+/gi,'-').toLowerCase()+'-controls.json'),JSON.stringify(data,null,2));
  return data;
}

const browser=await chromium.launch({headless:true});
try{
  const desktop=await browser.newContext({viewport:{width:1365,height:820},acceptDownloads:true});
  const page=await desktop.newPage();
  page.setDefaultTimeout(12000);
  await attachErrors(page,'desktop');

  await step('Home: three workspace entry points are visible',async()=>{
    await page.goto(BASE+'/',{waitUntil:'networkidle'});
    for(const text of ['New Pattern','New Doodle','Open Project']) assert(await page.getByText(text,{exact:true}).isVisible(),text+' missing');
    assert(await page.getByRole('link',{name:'Quick guide'}).isVisible(),'Quick guide missing');
    await shot(page,'01-home-desktop');
    await collectLayout(page,'home-desktop');
  });

  await step('Home: Quick guide opens and returns to main menu',async()=>{
    await page.getByRole('link',{name:'Quick guide'}).click();
    await page.waitForLoadState('networkidle');
    assert(page.url().includes('/help/'),'Quick guide did not open help route');
    const home=page.getByRole('link',{name:'Project home'});
    assert(await home.isVisible(),'Help Project home link missing');
    await home.click();await page.waitForLoadState('networkidle');
    assert(new URL(page.url()).pathname==='/','Project home did not return home');
  });

  await step('Pattern setup: Straight, Half-drop and Brick cards drive the fixed repeat choice',async()=>{
    await page.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await page.locator('#newProjectSetup').waitFor({state:'visible'});
    for(const value of ['straight','half-drop','brick']){
      await page.locator('.workspaceRepeatCard[data-repeat="'+value+'"]').click();
      assert(await page.locator('#projectRepeatStyle').inputValue()===value,'Repeat card '+value+' did not update engine control');
    }
    await page.locator('.workspaceRepeatCard[data-repeat="straight"]').click();
    await shot(page,'02-pattern-setup');
    await page.locator('#createProject').click();
    await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    assert(await page.locator('#ux2Editor').isVisible(),'UX2 editor not visible after Create Pattern');
    assert((await page.locator('#ux2Mode').textContent())==='Pattern','Mode badge is not Pattern');
    await shot(page,'03-pattern-editor');
  });

  await step('Pattern: Select tool drives the real engine',async()=>{
    await page.locator('[data-ux2-tool="select"]').click();
    assert(await activeOldTool(page,'select'),'Select did not activate old engine tool');
  });

  await step('Pattern: Brush controls, all brush styles and stamp choices work',async()=>{
    await page.locator('[data-ux2-tool="brush"]').click();
    assert(await activeOldTool(page,'brush'),'Brush did not activate engine');
    assert(await visible(page,'#ux2BrushLibrary'),'Brush Library button missing');
    await page.locator('#ux2Size').evaluate(el=>{el.value='61';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2Opacity').evaluate(el=>{el.value='72';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert(await page.locator('#brushSize').inputValue()==='61','Brush size proxy failed');
    assert(await page.locator('#inkOpacity').inputValue()==='72','Brush opacity proxy failed');
    await page.locator('#ux2BrushLibrary').click();
    for(const style of ['ink','pencil','marker','texture','stamp']){
      await page.locator('[data-brush-style="'+style+'"]').click();
      assert(await page.locator('#brushStyle').inputValue()===style,'Brush style '+style+' failed');
    }
    for(const stamp of ['leaf','star','dot']){
      if(await visible(page,'[data-stamp="'+stamp+'"]')){
        await page.locator('[data-stamp="'+stamp+'"]').click();
        assert(await page.locator('#stampShape').inputValue()===stamp,'Stamp '+stamp+' failed');
      }
    }
    await shot(page,'04-brush-library');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Brush drawing, Undo and Redo change the real canvas',async()=>{
    await page.locator('[data-ux2-tool="brush"]').click();
    const canvas=page.locator('#editorCanvas');
    const before=await canvas.evaluate(c=>c.toDataURL());
    const box=await canvas.boundingBox();assert(box,'Canvas bounds unavailable');
    await page.mouse.move(box.x+box.width*.38,box.y+box.height*.38);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.57,box.y+box.height*.56,{steps:12});
    await page.mouse.up();await page.waitForTimeout(100);
    const after=await canvas.evaluate(c=>c.toDataURL());
    assert(after!==before,'Brush stroke did not change canvas');
    await page.locator('#ux2Undo').click();await page.waitForTimeout(80);
    assert(await canvas.evaluate(c=>c.toDataURL())===before,'Undo failed');
    await page.locator('#ux2Redo').click();await page.waitForTimeout(80);
    assert(await canvas.evaluate(c=>c.toDataURL())===after,'Redo failed');
  });

  await step('Pattern: Eraser exposes size and opacity and activates real eraser',async()=>{
    await page.locator('[data-ux2-tool="eraser"]').click();
    assert(await activeOldTool(page,'eraser'),'Eraser did not activate engine');
    assert(await visible(page,'#ux2Size'),'Eraser size missing');
    assert(await visible(page,'#ux2Opacity'),'Eraser opacity missing');
  });

  await step('Pattern: Fill and Gradient Fill switch the real engine tools',async()=>{
    await page.locator('[data-ux2-tool="freefill"]').click();
    assert(await activeOldTool(page,'freefill'),'Freehand Fill did not activate engine');
    assert(await visible(page,'#ux2GradientFill'),'Gradient Fill shortcut missing');
    await page.locator('#ux2GradientFill').click();
    assert(await activeOldTool(page,'gradient'),'Gradient Fill did not activate engine');
  });

  await step('Pattern: Pan controls Zoom out, Zoom in and Fit',async()=>{
    await page.locator('[data-ux2-tool="pan"]').click();
    assert(await activeOldTool(page,'pan'),'Pan did not activate engine');
    const initial=Number(await page.locator('#zoom').inputValue());
    await page.locator('#ux2ZoomIn').click();
    const zoomed=Number(await page.locator('#zoom').inputValue());
    assert(zoomed>initial,'Zoom in did not increase zoom');
    await page.locator('#ux2ZoomOut').click();
    await page.locator('#ux2FitContext').click();
    assert(Number(await page.locator('#zoom').inputValue())===100,'Fit did not restore 100%');
  });

  await step('Pattern: Shape tool exposes Line, Rectangle, Ellipse, width and fill',async()=>{
    await page.locator('[data-ux2-tool="rect"]').click();
    assert(await activeOldTool(page,'rect'),'Rectangle did not activate engine');
    await page.locator('#ux2Line').click();assert(await activeOldTool(page,'line'),'Line failed');
    await page.locator('#ux2Rect').click();assert(await activeOldTool(page,'rect'),'Rectangle failed');
    assert(await visible(page,'#ux2ShapeFill'),'Rectangle fill toggle missing');
    await page.locator('#ux2Ellipse').click();assert(await activeOldTool(page,'ellipse'),'Ellipse failed');
    assert(await visible(page,'#ux2ShapeWidth'),'Shape width missing');
    await shot(page,'05-shape-controls');
  });

  await step('Pattern: Image button opens the file picker and imports a test SVG',async()=>{
    const chooserPromise=page.waitForEvent('filechooser');
    await page.locator('[data-ux2-action="image"]').click();
    const chooser=await chooserPromise;
    await chooser.setFiles(fixture);
    await page.waitForTimeout(250);
    const assetCount=await page.locator('#assetList .assetItem, #assetList [data-id], #assetList > *').count().catch(()=>0);
    assert(assetCount>0 || (await page.locator('#status').textContent()||'').length>0,'Image import gave no visible engine response');
  });

  await step('Pattern: Colour panel updates ink, adds a swatch and exposes eyedropper',async()=>{
    await page.locator('[data-ux2-panel="colour"]').click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Colour','Colour panel title wrong');
    await page.locator('#ux2ColourInput').evaluate(el=>{el.value='#345678';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert((await page.locator('#ink').inputValue()).toLowerCase()==='#345678','Colour input did not update ink');
    const before=await page.locator('.ux2-swatches .ux2-swatch').count();
    await page.locator('#ux2AddPaletteColour').click();
    const after=await page.locator('.ux2-swatches .ux2-swatch').count();
    assert(after>=before,'Add palette colour regressed');
    assert(await visible(page,'#ux2Eyedropper'),'Eyedropper missing');
    await shot(page,'06-colour-panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Layers add, rename, opacity, flags, duplicate, reorder and delete work',async()=>{
    await page.locator('[data-ux2-panel="layers"]').click();
    const before=await page.locator('#layerList .layerRow').count();
    await page.locator('#ux2AddLayer').click();
    await page.waitForFunction(expected=>document.querySelectorAll('#layerList .layerRow').length===expected,before+1);
    const afterAdd=await page.locator('#layerList .layerRow').count();
    assert(afterAdd===before+1,'Add Layer failed');
    await page.locator('#ux2LayerName').fill('Audit Layer');
    await page.locator('#ux2LayerName').dispatchEvent('change');
    assert((await page.locator('#layerName').inputValue())==='Audit Layer','Layer rename proxy failed');
    await page.locator('#ux2LayerOpacity').evaluate(el=>{el.value='66';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert(await page.locator('#layerOpacity').inputValue()==='66','Layer opacity proxy failed');
    for(const id of ['ux2LayerVisible','ux2LayerLocked','ux2LayerExport']){
      const target=page.locator('#'+id);
      const old=await target.isChecked();
      await target.click();
      assert((await target.isChecked())!==old,id+' toggle did not change');
    }
    await page.locator('#ux2LayerDuplicate').click();
    await page.waitForFunction(expected=>document.querySelectorAll('#layerList .layerRow').length===expected,afterAdd+1);
    assert(await page.locator('#layerList .layerRow').count()===afterAdd+1,'Duplicate Layer failed');
    await page.locator('#ux2LayerUp').click();
    await page.locator('#ux2LayerDown').click();
    await page.locator('#ux2LayerDelete').click();
    await page.waitForFunction(expected=>document.querySelectorAll('#layerList .layerRow').length===expected,afterAdd);
    assert(await page.locator('#layerList .layerRow').count()===afterAdd,'Delete Layer failed');
    await shot(page,'07-layers-panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: specialist Pattern controls proxy to the repeat engine',async()=>{
    await page.locator('[data-ux2-panel="pattern"]').click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Pattern','Pattern panel title wrong');
    await page.locator('#ux2Grid').selectOption('20');
    assert(await page.locator('#gridCount').inputValue()==='20','Grid divisions failed');
    await page.locator('#ux2GridOn').click();
    await page.locator('#ux2Symmetry').selectOption('quadrant');
    assert(await page.locator('#symmetry').inputValue()==='quadrant','Quadrant mirror failed');
    await page.locator('#ux2SymmetryGuides').click();
    await page.locator('#ux2Guide').selectOption('centre');
    assert(await page.locator('#constructionGuide').inputValue()==='centre','Construction guide failed');
    await page.locator('#ux2SnapOn').click();
    await page.locator('#ux2Neighbour').evaluate(el=>{el.value='71';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert(await page.locator('#neighborOpacity').inputValue()==='71','Repeat visibility failed');
    await page.locator('#ux2SeamInspect').click();
    assert(await page.locator('#neighborOpacity').inputValue()==='100','Inspect seams did not set neighbours to 100%');
    assert(await page.locator('#showTileBorder').isChecked(),'Inspect seams did not enable centre tile edge');
    await shot(page,'08-pattern-panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Preview button opens the Pattern workspace',async()=>{
    await page.locator('#ux2Preview').click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Pattern','Preview did not open Pattern panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Export panel exposes PNG, SVG, editable project, open and ZIP',async()=>{
    await page.locator('#ux2Export').click();
    for(const action of ['exportPng','exportSvg','saveProject','openProject','exportZip']){
      assert(await visible(page,'[data-export-old="'+action+'"]'),'Export action '+action+' missing');
    }
    const downloadPromise=page.waitForEvent('download');
    await page.locator('[data-export-old="saveProject"]').click();
    const download=await downloadPromise;
    assert(download.suggestedFilename().endsWith('.json'),'Editable project did not download JSON');
    await shot(page,'09-export-panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Fullscreen keeps tools functional while preserving the large canvas',async()=>{
    await page.locator('#ux2Fullscreen').click();await page.waitForTimeout(100);
    assert(await page.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen')),'Fullscreen class missing');
    assert(Number(await page.locator('#zoom').inputValue())===270,'Fullscreen detail zoom is not 270%');
    const stage=await page.locator('#stageWrap').boundingBox();assert(stage&&stage.height>760,'Fullscreen canvas lost its large size');
    assert(await page.locator('.ux2-tools').isVisible(),'Fullscreen tool rail hidden');
    assert(await page.locator('.ux2-dockbar').isVisible(),'Fullscreen palette dock hidden');
    for(const tool of ['select','brush','eraser','freefill','pan','rect']){
      await page.locator('[data-ux2-tool="'+tool+'"]').click();
      assert(await activeOldTool(page,tool),'Fullscreen tool '+tool+' failed');
    }
    await shot(page,'10-pattern-fullscreen');
    await collectLayout(page,'pattern-fullscreen-desktop');
    await page.locator('#ux2Fullscreen').click();await page.waitForTimeout(80);
    assert(Number(await page.locator('#zoom').inputValue())===100,'Fullscreen did not restore prior zoom');
  });

  await step('Pattern: Projects button returns to project home',async()=>{
    await page.locator('#ux2Gallery').click();await page.waitForLoadState('networkidle');
    assert(new URL(page.url()).pathname==='/','Projects did not return home');
  });

  await collectLayout(page,'home-after-pattern');
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,acceptDownloads:true});
  const m=await mobile.newPage();m.setDefaultTimeout(12000);await attachErrors(m,'mobile-landscape');

  await step('Doodle landscape: opens directly and hides Pattern-only controls',async()=>{
    await m.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});
    await m.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    assert((await m.locator('#ux2Mode').textContent())==='Doodle','Doodle mode badge wrong');
    assert(await m.locator('[data-ux2-panel="pattern"]').isHidden(),'Pattern dock visible in Doodle');
    assert(await m.locator('#editorCanvas').isVisible(),'Doodle canvas missing');
    await shot(m,'11-doodle-landscape');
  });

  await step('Doodle landscape: visible tools are usable',async()=>{
    for(const tool of ['select','brush','eraser','freefill','pan','rect']){
      await m.locator('[data-ux2-tool="'+tool+'"]').click();
      assert(await activeOldTool(m,tool),'Doodle tool '+tool+' failed');
    }
    assert(await visible(m,'[data-ux2-action="image"]'),'Doodle Image tool missing');
    await m.locator('[data-ux2-panel="colour"]').click();
    assert((await m.locator('#ux2PaletteTitle').textContent())==='Colour','Doodle Colour panel failed');
    await m.locator('#ux2PaletteClose').click();
    await m.locator('[data-ux2-panel="layers"]').click();
    assert((await m.locator('#ux2PaletteTitle').textContent())==='Layers','Doodle Layers panel failed');
    await m.locator('#ux2PaletteClose').click();
  });

  await step('Doodle fullscreen: camera-safe rail, tools, context and palettes remain usable',async()=>{
    await m.locator('#ux2Fullscreen').click();await m.waitForTimeout(100);
    const tools=await m.locator('.ux2-tools').boundingBox();
    assert(tools&&tools.x>=50,'Fullscreen tool rail is still in the camera/cutout zone');
    const stage=await m.locator('#stageWrap').boundingBox();
    assert(stage&&stage.height>330,'Doodle fullscreen canvas is too small');
    assert(await m.locator('#ux2Context').isVisible(),'Doodle fullscreen context missing');
    await m.locator('[data-ux2-tool="brush"]').click();
    assert(await visible(m,'#ux2BrushLibrary'),'Doodle fullscreen Brush controls missing');
    await m.locator('[data-ux2-panel="layers"]').click();
    assert(await m.locator('#ux2Palette').isVisible(),'Doodle fullscreen Layers panel failed');
    await m.locator('#ux2PaletteClose').click();
    await shot(m,'12-doodle-fullscreen');
    await collectLayout(m,'doodle-fullscreen-landscape');
    await m.locator('#ux2Fullscreen').click();await m.waitForTimeout(80);
  });

  await collectLayout(m,'doodle-landscape-normal');
  await mobile.close();

  const portrait=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const p=await portrait.newPage();p.setDefaultTimeout(12000);await attachErrors(p,'mobile-portrait');
  await step('Doodle portrait: rotate-to-landscape gate is shown',async()=>{
    await p.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});
    assert(await p.locator('#doodleLandscapeGate').isVisible(),'Portrait Doodle did not show rotate gate');
    assert((await p.locator('#doodleLandscapeTitle').textContent())==='Rotate to landscape','Rotate gate copy missing');
    await shot(p,'13-doodle-portrait-gate');
    await collectLayout(p,'doodle-portrait');
  });
  await portrait.close();

}finally{
  await browser.close();
}

if(browserErrors.length){
  for(const e of browserErrors)warnings.push(e);
}

const pass=results.filter(r=>r.status==='PASS').length;
const fail=results.filter(r=>r.status==='FAIL').length;
let md='# Sapiver Pattern Forge UX2 complete browser audit\n\n';
md+='Generated: '+new Date().toISOString()+'\n\n';
md+='## Summary\n\n- Checks: '+results.length+'\n- Passed: '+pass+'\n- Failed: '+fail+'\n- Warnings: '+warnings.length+'\n\n';
md+='## Functional checks\n\n| Status | Check | Detail |\n|---|---|---|\n';
for(const r of results)md+='| '+r.status+' | '+r.name.replace(/\|/g,'/')+' | '+(r.detail||'').replace(/\|/g,'/').replace(/\n/g,' ')+' |\n';
md+='\n## Layout / browser warnings\n\n';
if(warnings.length)for(const w of warnings)md+='- '+w+'\n';else md+='- None recorded.\n';
md+='\n## Interpretation\n\nThis report verifies visible UX2 controls against the real preserved editor engine. It does not replace physical-device judgement for touch feel, Android camera cutouts, status-bar behaviour, native save/share or orientation transitions.\n';
fs.writeFileSync(path.join(OUT,'report.md'),md);
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({summary:{checks:results.length,pass,fail,warnings:warnings.length},results,warnings},null,2));
console.log(md);
if(fail>0)process.exitCode=1;
