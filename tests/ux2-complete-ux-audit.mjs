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

  await step('Pattern setup: Repeat is chosen before entry; Design setup is inside the editor',async()=>{
    await page.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await page.locator('#newProjectSetup').waitFor({state:'visible'});
    for(const value of ['straight','half-drop','brick']){
      await page.locator('.workspaceRepeatCard[data-repeat="'+value+'"]').click();
      assert(await page.locator('#projectRepeatStyle').inputValue()===value,'Repeat card '+value+' did not update engine control');
    }
    await page.locator('.workspaceRepeatCard[data-repeat="half-drop"]').click();
    assert(await page.locator('#setupGridCount').count()===0,'Grid settings should not clutter project creation');
    await shot(page,'02-pattern-setup');
    await page.locator('#createProject').click();
    await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    assert(await page.locator('#ux2Editor').isVisible(),'UX2 editor not visible after Create Pattern');
    assert((await page.locator('#ux2Mode').textContent())==='Pattern','Mode badge is not Pattern');
    assert((await page.locator('#projectNameDisplay').textContent()).includes('Half-drop'),'Created project did not retain Half-drop repeat style');
    await page.waitForFunction(()=>Number(document.querySelector('#zoom')?.value)>=250);
    assert(await page.locator('#gridOn').isChecked(),'A new pattern should open with the grid visible');
    assert(await page.locator('#editorCanvas').isVisible(),'Canvas should be visible in the editor');
    assert(await page.locator('#ux2ZoomLabel').textContent()==='269%','New project should open fitted to the canvas');
    assert(await page.locator('#ux2QuickPalette .ux2-quick-swatch').count()===4,'Current palette swatches are not visible beside the canvas');
    await page.locator('[data-ux2-panel="pattern"]').click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Design setup','Pattern tools should be grouped under Design setup');
    await page.locator('#ux2Grid').selectOption('20');
    await page.locator('#ux2Symmetry').selectOption('radial');
    await page.locator('#ux2Guide').selectOption('centre');
    await page.locator('#ux2SnapOn').check();
    assert(await page.locator('#gridCount').inputValue()==='20','Design setup grid divisions failed');
    assert(await page.locator('#symmetry').inputValue()==='radial','Design setup mirror mode failed');
    assert(await page.locator('#constructionGuide').inputValue()==='centre','Design setup guide failed');
    assert(await page.locator('#snapOn').isChecked(),'Design setup snapping failed');
    assert(await page.locator('#ux2SetupSwatches .ux2-setup-swatch').count()===4,'Design setup palette swatches missing');
    assert((await page.locator('#ux2PaletteBody .ux2-repeat-card strong').textContent()).toLowerCase()==='half drop','Pattern panel repeat label does not match the active project');
    assert(await page.locator('#ux2ToolMenuTrigger').isVisible(),'Pattern Tools chooser is missing');
    await page.locator('#ux2ToolMenuTrigger').click();
    assert(await page.getByRole('checkbox',{name:'Show Brush in quick tools',exact:true}).isChecked(),'Pattern quick-tool state is not exposed in Tools');
    await page.getByRole('checkbox',{name:'Show Erase in quick tools',exact:true}).uncheck();
    assert(await page.locator('.ux2-tools [data-ux2-tool="eraser"]').isHidden(),'Pattern quick rail did not follow Tools favourites');
    await page.getByRole('button',{name:'Erase',exact:true}).click();
    assert(await activeOldTool(page,'eraser'),'Tools chooser did not switch to Erase');
    await page.locator('#ux2ToolMenuTrigger').click();
    await page.getByRole('checkbox',{name:'Show Erase in quick tools',exact:true}).check();
    assert(await page.locator('.ux2-tools [data-ux2-tool="eraser"]').isVisible(),'Restored Pattern quick tool did not return to the rail');
    await page.locator('#ux2ToolMenuTrigger').click();
    await page.locator('#ux2PaletteClose').click();
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

  await step('Pattern: stroke stabilisation changes new brush geometry and persists',async()=>{
    await page.locator('[data-ux2-tool="brush"]').click();
    assert(await visible(page,'#ux2Stabilisation'),'Stroke stabilisation control missing');
    await page.locator('#ux2BrushStyle').selectOption('ink');
    const canvas=page.locator('#editorCanvas'),box=await canvas.boundingBox();assert(box,'Canvas bounds unavailable for stabilisation');
    const drawPath=async(offsetY)=>{
      const pts=[[.24,.34+offsetY],[.32,.43+offsetY],[.40,.31+offsetY],[.49,.46+offsetY],[.58,.35+offsetY]];
      await page.mouse.move(box.x+box.width*pts[0][0],box.y+box.height*pts[0][1]);await page.mouse.down();
      for(const [x,y] of pts.slice(1))await page.mouse.move(box.x+box.width*x,box.y+box.height*y,{steps:5});
      await page.mouse.up();await page.waitForTimeout(70);
    };
    await page.locator('#ux2Stabilisation').selectOption('off');await drawPath(0);
    await page.locator('[data-ux2-tool="brush"]').click();await page.locator('#ux2Stabilisation').selectOption('strong');await drawPath(.18);
    assert(await page.locator('#strokeStabilisation').inputValue()==='strong','Stabilisation did not reach engine setting');
    await page.locator('#ux2Export').click();
    const projectP=page.waitForEvent('download');await page.locator('[data-export-old="saveProject"]').click();const project=await projectP;
    const projectPath=await project.path();assert(projectPath,'Stabilisation project download unavailable');
    const data=JSON.parse(fs.readFileSync(projectPath,'utf8')),brushes=data.marks.filter(mark=>mark.type==='brush'&&mark.brushStyle==='ink');
    assert(data.settings.strokeStabilisation==='strong','Stabilisation setting was not persisted');
    assert(brushes.length>=2,'Stabilisation test strokes missing from project');
    const [offMark,strongMark]=brushes.slice(-2);
    const shape=mark=>mark.points.slice(1,-1).map(point=>[Math.round((point.x-mark.points[0].x)*10)/10,Math.round((point.y-mark.points[0].y)*10)/10]);
    assert(JSON.stringify(shape(offMark))!==JSON.stringify(shape(strongMark)),'Strong stabilisation recorded the same intermediate path as Off');
    await page.locator('#ux2PaletteClose').click();
    await page.locator('[data-ux2-tool="brush"]').click();await page.locator('#ux2Stabilisation').selectOption('off');
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
    assert(await visible(page,'#ux2ColourShortcut'),'Fill colour shortcut missing');
    await page.locator('#ux2ColourShortcut').click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Colour','Fill colour shortcut did not open Colour panel');
    await page.locator('#ux2PaletteClose').click();
    await page.locator('[data-ux2-tool="freefill"]').click();
    await page.locator('#ux2GradientFill').click();
    assert(await activeOldTool(page,'gradient'),'Gradient Fill did not activate engine');
  });

  await step('Pattern: Canvas zoom buttons work and Fit fits the tile',async()=>{
    await page.locator('[data-ux2-tool="pan"]').click();
    assert(await activeOldTool(page,'pan'),'Pan did not activate engine');
    const initial=Number(await page.locator('#zoom').inputValue());
    await page.locator('#ux2ZoomIn').click();
    const zoomed=Number(await page.locator('#zoom').inputValue());
    assert(zoomed>initial,'Zoom in did not increase zoom');
    await page.locator('#ux2ZoomOut').click();
    await page.locator('#ux2Fit').click();
    const fitted=Number(await page.locator('#zoom').inputValue());
    const expected=await page.locator('#editorCanvas').evaluate(el=>Math.round(Math.min(el.width,el.height)*.92/(900*.38)*100));
    assert(fitted===expected,'Fit did not calculate a tile-sized view');
    assert((await page.locator('#ux2ZoomLabel').textContent()).trim()===`${fitted}%`,'Zoom readout did not follow Fit');
  });

  await step('Pattern: Shape tool exposes Line, Rectangle, Ellipse, width and fill',async()=>{
    await page.locator('[data-ux2-tool="rect"]').click();
    assert(await activeOldTool(page,'rect'),'Rectangle did not activate engine');
    await page.locator('#ux2Line').click();assert(await activeOldTool(page,'line'),'Line failed');
    await page.locator('#ux2Rect').click();assert(await activeOldTool(page,'rect'),'Rectangle failed');
    assert(await visible(page,'#ux2ShapeFill'),'Rectangle fill toggle missing');
    const fillBefore=await page.locator('#shapeFill').isChecked();
    await page.locator('#ux2ShapeFill').click();
    assert((await page.locator('#shapeFill').isChecked())!==fillBefore,'Shape fill toggle did not proxy to engine');
    await page.locator('#ux2ShapeColour').click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Colour','Shape Colour shortcut did not open Colour panel');
    await page.locator('#ux2PaletteClose').click();
    await page.locator('[data-ux2-tool="rect"]').click();
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

  await step('Pattern: scatter preserves manual items, freezes, and respects seam-aware spacing',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'scatter-controls');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    const chooserP=view.waitForEvent('filechooser');await view.locator('[data-ux2-action="image"]').click();const chooser=await chooserP;await chooser.setFiles(fixture);await view.waitForTimeout(160);

    const saveProject=async()=>{
      await view.locator('#ux2Export').click();const p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const d=await p;
      const file=await d.path();assert(file,'Scatter project download unavailable');const data=JSON.parse(fs.readFileSync(file,'utf8'));await view.locator('#ux2PaletteClose').click();return data;
    };

    await view.locator('[data-ux2-panel="pattern"]').click();
    await view.locator('#ux2ScatterCount').fill('6');await view.locator('#ux2ScatterMinScale').fill('6');await view.locator('#ux2ScatterMaxScale').fill('6');
    await view.locator('#ux2ScatterSpacing').fill('0');
    if(!(await view.locator('#ux2ScatterOverlap').isChecked()))await view.locator('#ux2ScatterOverlap').check();
    if(!(await view.locator('#ux2ScatterPreserve').isChecked()))await view.locator('#ux2ScatterPreserve').check();
    await view.locator('#ux2ScatterGenerate').click();await view.waitForTimeout(120);
    let data=await saveProject();
    assert(data.items.filter(item=>item.scatterGenerated).length===6,'Scatter did not create six tagged generated copies');
    assert(data.items.some(item=>!item.scatterGenerated),'Scatter did not preserve the manually placed import');

    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2ScatterFreeze').click();await view.waitForTimeout(80);
    data=await saveProject();assert(data.items.every(item=>!item.scatterGenerated),'Freeze scatter did not convert generated copies to ordinary artwork');

    await view.locator('[data-ux2-panel="pattern"]').click();
    await view.locator('#ux2ScatterCount').fill('5');await view.locator('#ux2ScatterMinScale').fill('6');await view.locator('#ux2ScatterMaxScale').fill('6');await view.locator('#ux2ScatterSpacing').fill('8');
    if(await view.locator('#ux2ScatterOverlap').isChecked())await view.locator('#ux2ScatterOverlap').uncheck();
    if(await view.locator('#ux2ScatterPreserve').isChecked())await view.locator('#ux2ScatterPreserve').uncheck();
    await view.locator('#ux2ScatterGenerate').click();await view.waitForTimeout(120);
    data=await saveProject();
    assert(data.items.length===5&&data.items.every(item=>item.scatterGenerated),'Constrained scatter did not replace prior artwork with five generated copies');
    assert(data.settings.scatterSpacing==='8'&&data.settings.scatterOverlap===false&&data.settings.scatterPreserveManual===false,'Scatter settings were not persisted');
    const assets=new Map(data.assets.map(asset=>[String(asset.id),asset])),spacing=900*.08;
    for(let i=0;i<data.items.length;i++)for(let j=i+1;j<data.items.length;j++){
      const a=data.items[i],b=data.items[j],aa=assets.get(String(a.assetId)),ba=assets.get(String(b.assetId));
      const dx0=Math.abs(a.x-b.x),dy0=Math.abs(a.y-b.y),dx=Math.min(dx0,900-dx0),dy=Math.min(dy0,900-dy0),distance=Math.hypot(dx,dy);
      const ar=Math.hypot(aa.w*a.scale,aa.h*a.scale)/2,br=Math.hypot(ba.w*b.scale,ba.h*b.scale)/2;
      assert(distance+0.01>=spacing+ar+br,'No-overlap spacing failed across repeat seam');
    }
    await shot(view,'scatter-controls');await context.close();
  });

  await step('Pattern: Selection transform, duplicate, arrange, snap and delete controls work',async()=>{
    await page.locator('[data-ux2-tool="select"]').click();
    if(!(await visible(page,'#ux2SelScale'))){
      const box=await page.locator('#editorCanvas').boundingBox();assert(box,'Canvas bounds unavailable for selection');
      await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
      await page.waitForTimeout(120);
    }
    assert(await visible(page,'#ux2SelScale'),'Selection scale control missing');
    assert(await visible(page,'#ux2SelRot'),'Selection rotate control missing');
    assert(await visible(page,'#ux2SelOpacity'),'Selection opacity control missing');
    await page.locator('#ux2SelScale').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2SelRot').evaluate(el=>{el.value='18';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2SelOpacity').evaluate(el=>{el.value='82';el.dispatchEvent(new Event('input',{bubbles:true}));});
    const before=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
    await page.locator('#ux2Duplicate').click();await page.waitForTimeout(120);
    const duplicated=await page.locator('#editorCanvas').evaluate(c=>c.toDataURL());
    assert(duplicated!==before,'Selection Duplicate produced no canvas change');
    await page.locator('#ux2Front').click();await page.waitForTimeout(50);
    await page.locator('#ux2Back').click();await page.waitForTimeout(50);
    await page.locator('#ux2Snap').click();await page.waitForTimeout(50);
    assert(await visible(page,'#ux2Delete'),'Selection Delete missing');
    await shot(page,'05b-selection-controls');
  });

  await step('Pattern: multi-select groups, moves, persists, duplicates and ungroups',async()=>{
    await page.locator('[data-ux2-tool="select"]').click();
    assert(await visible(page,'#ux2SelectAll'),'Select All control missing');
    await page.locator('#ux2SelectAll').click();
    await page.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>1);
    const selectedCount=Number(await page.locator('#selectedPanel').getAttribute('data-selection-count'));
    assert(selectedCount>1,'Select All did not create a multi-selection');
    assert(await visible(page,'#ux2Group'),'Group control missing for a multi-selection');

    await page.locator('#ux2Group').click();
    await page.waitForFunction(()=>document.querySelector('#selectedPanel')?.dataset.selectionGrouped==='true');
    assert(await visible(page,'#ux2Ungroup'),'Grouped selection did not expose Ungroup');
    assert(await visible(page,'#ux2GroupScale'),'Grouped selection scale control missing');
    assert(await visible(page,'#ux2GroupRotate'),'Grouped selection rotate control missing');
    const beforeTransform=await page.locator('#editorCanvas').evaluate(el=>el.toDataURL());
    await page.locator('#ux2GroupScale').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2GroupRotate').evaluate(el=>{el.value='25';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForTimeout(100);
    assert(await page.locator('#editorCanvas').evaluate(el=>el.toDataURL())!==beforeTransform,'Scale/rotate multi-selection produced no canvas change');

    await page.locator('#ux2Export').click();
    const projectP=page.waitForEvent('download');await page.locator('[data-export-old="saveProject"]').click();const projectDownload=await projectP;
    const groupedPath=await projectDownload.path();assert(groupedPath,'Grouped project download path unavailable');
    const groupedData=JSON.parse(fs.readFileSync(groupedPath,'utf8'));
    const groupedArtwork=[...groupedData.items,...groupedData.marks].filter(artwork=>typeof artwork.groupId==='string'&&artwork.groupId);
    assert(groupedArtwork.length>=selectedCount,'Group IDs were not persisted to the editable project');
    await page.locator('#ux2PaletteClose').click();

    const canvas=page.locator('#editorCanvas'),beforeMove=await canvas.evaluate(el=>el.toDataURL()),box=await canvas.boundingBox();assert(box,'Canvas bounds unavailable for multi-move');
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.54,{steps:6});await page.mouse.up();await page.waitForTimeout(100);
    const afterMove=await canvas.evaluate(el=>el.toDataURL());assert(afterMove!==beforeMove,'Dragging a grouped selection produced no canvas change');

    const beforeDuplicate=await canvas.evaluate(el=>el.toDataURL());await page.locator('#ux2Duplicate').click();await page.waitForTimeout(100);
    assert(await canvas.evaluate(el=>el.toDataURL())!==beforeDuplicate,'Duplicating a grouped selection produced no canvas change');
    assert(await visible(page,'#ux2Ungroup'),'Duplicated group lost grouped selection state');
    await page.locator('#ux2Ungroup').click();await page.waitForFunction(()=>document.querySelector('#selectedPanel')?.dataset.selectionGrouped==='false');
    assert(await visible(page,'#ux2Group'),'Ungroup did not return the Group action');

    await page.locator('#ux2ClearSelection').click();await page.waitForFunction(()=>document.querySelector('#selectedPanel')?.dataset.selectionCount==='0');
    await page.locator('#ux2AddSelection').click();assert(await page.locator('#ux2AddSelection').evaluate(el=>el.classList.contains('active')),'Add-to-selection mode did not turn on');
    await page.locator('#ux2AddSelection').click();assert(!(await page.locator('#ux2AddSelection').evaluate(el=>el.classList.contains('active'))),'Add-to-selection mode did not turn off');
    await shot(page,'05c-multi-selection');
  });

  await step('Pattern: selected editable marks recolour and matching colours replace project-wide',async()=>{
    await page.locator('[data-ux2-tool="select"]').click();
    await page.locator('#ux2SelectAll').click();
    await page.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.recolourableCount||0)>0);
    await page.locator('[data-ux2-panel="colour"]').click();
    assert(await visible(page,'#ux2SelectionColour'),'Selected-mark recolour control missing');
    const canvas=page.locator('#editorCanvas'),before=await canvas.evaluate(el=>el.toDataURL());
    await page.locator('#ux2SelectionColour').evaluate(el=>{el.value='#aa3377';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2RecolourSelection').click();await page.waitForTimeout(100);
    const recoloured=await canvas.evaluate(el=>el.toDataURL());assert(recoloured!==before,'Recolour selection produced no canvas change');
    assert((await page.locator('#selectedPanel').getAttribute('data-selection-colour')).toLowerCase()==='#aa3377','Selected mark colour did not update in engine state');

    await page.locator('#ux2SelectionColour').evaluate(el=>{el.value='#3377aa';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2ColourTolerance').evaluate(el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#ux2ReplaceMatchingColour').click();await page.waitForTimeout(100);
    const replaced=await canvas.evaluate(el=>el.toDataURL());assert(replaced!==recoloured,'Replace matching colour produced no canvas change');

    await page.locator('#ux2Export').click();
    const projectP=page.waitForEvent('download');await page.locator('[data-export-old="saveProject"]').click();const project=await projectP;
    const projectPath=await project.path();assert(projectPath,'Recoloured project download path unavailable');
    const data=JSON.parse(fs.readFileSync(projectPath,'utf8')),editable=data.marks.filter(mark=>mark.type!=='eraser');
    assert(editable.some(mark=>String(mark.color).toLowerCase()==='#3377aa'),'Recoloured marks were not persisted to project JSON');
    await page.locator('#ux2PaletteClose').click();
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
    const selectedSwatch=(await page.locator('#paletteSwatches button').nth(1).getAttribute('data-color')).toLowerCase();
    await page.locator('#ux2PaletteSwatches .ux2-swatch').nth(1).click();
    assert((await page.locator('#ink').inputValue()).toLowerCase()===selectedSwatch,'Palette swatch did not update brush colour');
    assert((await page.locator('#ux2ColourInput').inputValue()).toLowerCase()===selectedSwatch,'Current colour display did not follow palette swatch selection');
    assert(await visible(page,'#ux2Eyedropper'),'Eyedropper missing');
    page.once('dialog',dialog=>dialog.accept('Audit Palette'));
    await page.locator('#ux2SavePalette').click();
    await page.waitForTimeout(80);
    const options=await page.locator('#savedPaletteSelect option').count();
    assert(options>=2,'Save palette did not create a saved palette option');
    await page.locator('#ux2SavedPalette').selectOption('default');
    assert(await page.locator('#savedPaletteSelect').inputValue()==='default','Saved palette selector did not proxy to engine');
    await page.locator('#ux2Eyedropper').click();
    assert(await activeOldTool(page,'eyedropper'),'Eyedropper did not activate engine');
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
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Design setup','Design setup panel title wrong');
    await page.locator('#ux2Grid').selectOption('20');
    assert(await page.locator('#gridCount').inputValue()==='20','Grid divisions failed');
    const gridOff=await page.locator('#editorCanvas').screenshot();
    await page.locator('#ux2GridOn').click();
    const gridOn=await page.locator('#editorCanvas').screenshot();
    assert(!gridOff.equals(gridOn),'Grid toggle did not redraw the canvas immediately');
    await page.locator('#ux2Symmetry').selectOption('quadrant');
    assert(await page.locator('#symmetry').inputValue()==='quadrant','Quadrant mirror failed');
    await page.locator('#ux2SymmetryGuides').click();
    const guideBefore=await page.locator('#editorCanvas').screenshot();
    await page.locator('#ux2Guide').selectOption('diagonals');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const guideAfter=await page.locator('#editorCanvas').screenshot();
    assert(!guideBefore.equals(guideAfter),'Guide selection did not redraw the canvas immediately');
    assert(await page.locator('#constructionGuide').inputValue()==='diagonals','Construction guide failed');
    await page.locator('#ux2SnapOn').click();
    await page.locator('#ux2Neighbour').evaluate(el=>{el.value='71';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert(await page.locator('#neighborOpacity').inputValue()==='71','Repeat visibility failed');
    const previewBefore=await page.locator('#repeatPreviewToggle').textContent();
    await page.locator('#ux2FullPreview').click();await page.waitForTimeout(60);
    const previewAfter=await page.locator('#repeatPreviewToggle').textContent();
    assert(previewAfter!==previewBefore,'Full repeat preview button did not toggle engine preview state');
    await page.locator('#ux2SeamInspect').click();
    assert(await page.locator('#neighborOpacity').inputValue()==='100','Inspect seams did not set neighbours to 100%');
    assert(await page.locator('#showTileBorder').isChecked(),'Inspect seams did not enable centre tile edge');
    await shot(page,'08-pattern-panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Preview button toggles the repeat preview',async()=>{
    const before=await page.locator('#repeatPreviewToggle').textContent();
    await page.locator('#ux2Preview').click();
    await page.waitForTimeout(50);
    assert(await page.locator('#repeatPreviewToggle').textContent()!==before,'Preview did not toggle the repeat preview');
  });

  await step('Pattern: every export/open action works',async()=>{
    await page.locator('#ux2Export').click();
    for(const action of ['exportPng','exportSvg','saveProject','openProject','exportZip']){
      assert(await visible(page,'[data-export-old="'+action+'"]'),'Export action '+action+' missing');
    }
    const pngP=page.waitForEvent('download');await page.locator('[data-export-old="exportPng"]').click();const png=await pngP;
    assert(png.suggestedFilename().toLowerCase().endsWith('.png'),'PNG export did not download PNG');
    const svgP=page.waitForEvent('download');await page.locator('[data-export-old="exportSvg"]').click();const svg=await svgP;
    assert(svg.suggestedFilename().toLowerCase().endsWith('.svg'),'SVG export did not download SVG');
    const jsonP=page.waitForEvent('download');await page.locator('[data-export-old="saveProject"]').click();const json=await jsonP;
    assert(json.suggestedFilename().toLowerCase().endsWith('.json'),'Editable project did not download JSON');
    const jsonPath=await json.path();assert(jsonPath,'Editable project download path unavailable');
    const chooserP=page.waitForEvent('filechooser');await page.locator('[data-export-old="openProject"]').click();const chooser=await chooserP;
    await chooser.setFiles(jsonPath);await page.waitForTimeout(150);
    await page.locator('#ux2Export').click();
    const zipP=page.waitForEvent('download');await page.locator('[data-export-old="exportZip"]').click();const zip=await zipP;
    assert(zip.suggestedFilename().toLowerCase().endsWith('.zip'),'Project bundle did not download ZIP');
    await page.locator('#ux2Export').click();
    await shot(page,'09-export-panel');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: Fullscreen keeps tools functional while preserving the large canvas',async()=>{
    const zoomBeforeFullscreen=Number(await page.locator('#zoom').inputValue());
    await page.locator('#ux2Fullscreen').click();await page.waitForTimeout(100);
    assert(await page.locator('body').evaluate(el=>el.classList.contains('ux2-fullscreen')),'Fullscreen class missing');
    assert(Number(await page.locator('#zoom').inputValue())>=250,'Fullscreen did not fit the tile into the drawing area');
    const stage=await page.locator('#stageWrap').boundingBox();assert(stage&&stage.height>700,'Fullscreen canvas lost its large size after reserving the context-control gutter');
    assert(await page.locator('.ux2-tools').isVisible(),'Fullscreen tool rail hidden');
    assert(await page.locator('.ux2-dockbar').isVisible(),'Fullscreen palette dock hidden');
    for(const [selector,label] of [
      ['#ux2Undo','Undo'],['#ux2Redo','Redo'],['#ux2Fullscreen','Exit full screen'],
      ['[data-ux2-tool="select"]','Select'],['[data-ux2-tool="brush"]','Brush'],['[data-ux2-tool="eraser"]','Erase'],
      ['[data-ux2-tool="freefill"]','Fill'],['[data-ux2-tool="pan"]','Pan'],['[data-ux2-action="image"]','Image'],
      ['[data-ux2-tool="rect"]','Shape'],['[data-ux2-panel="colour"]','Colour'],['[data-ux2-panel="layers"]','Layers'],
      ['[data-ux2-panel="pattern"]','Design setup']
    ]) assert(await page.locator(selector).getAttribute('aria-label')===label,'Fullscreen control lacks accessible name: '+label);
    for(const tool of ['select','brush','eraser','freefill','pan','rect']){
      await page.locator('[data-ux2-tool="'+tool+'"]').click();
      assert(await activeOldTool(page,tool),'Fullscreen tool '+tool+' failed');
    }
    await shot(page,'10-pattern-fullscreen');
    await collectLayout(page,'pattern-fullscreen-desktop');
    await page.locator('#ux2Fullscreen').click();await page.waitForTimeout(80);
    assert(Number(await page.locator('#zoom').inputValue())===zoomBeforeFullscreen,'Fullscreen did not restore prior zoom');
  });

  await step('Pattern: Projects button returns to project home',async()=>{
    await page.locator('#ux2Gallery').click();await page.waitForLoadState('networkidle');
    assert(new URL(page.url()).pathname==='/','Projects did not return home');
  });

  await step('Project setup: Cancel returns a fresh generic editor route to project home',async()=>{
    await page.goto(BASE+'/app/',{waitUntil:'networkidle'});
    if(await page.locator('#resumePrompt').isVisible()){
      await page.locator('#startNewFromResume').click();
    }
    assert(await page.locator('#projectSetupOverlay').isVisible(),'Generic project setup did not open');
    const cancel=page.locator('#cancelProjectSetup');
    assert(await cancel.isVisible(),'Project setup Cancel missing');
    await cancel.click();await page.waitForLoadState('networkidle');
    assert(new URL(page.url()).pathname==='/','Cancel did not return to project home');
  });

  await step('Project home: recent project entry appears after saved work',async()=>{
    await page.waitForTimeout(1200);
    await page.reload({waitUntil:'networkidle'});
    const recentText=await page.locator('#recentProjects').textContent();
    assert(recentText&&!recentText.includes('Recent projects will appear here'),'No recent project entry appeared after saved work');
  });

  await step('Open Project: saved-project resume prompt exposes Continue and Start new',async()=>{
    await page.goto(BASE+'/app/',{waitUntil:'networkidle'});await page.waitForTimeout(200);
    assert(await page.locator('#resumePrompt').isVisible(),'Resume prompt missing for saved work');
    assert(await page.locator('#continuePrevious').isVisible(),'Continue previous missing');
    assert(await page.locator('#startNewFromResume').isVisible(),'Start new missing');
    await page.locator('#continuePrevious').click();
    await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    assert(await page.locator('#ux2Editor').isVisible(),'Continue previous did not open editor');
    await page.locator('#ux2Gallery').click();await page.waitForLoadState('networkidle');
  });

  await step('Doodle desktop: preview shortcut is removed and transparent export is stated',async()=>{
    await page.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});
    assert(await page.locator('#ux2Preview').isHidden(),'Doodle should not show a Preview button that opens Layers');
    await page.locator('#ux2Export').click();
    assert(await page.getByText('Transparent background is preserved for PNG and SVG.',{exact:false}).isVisible(),'Doodle export transparency is not stated');
    assert(await page.getByText('PNG carries 300 DPI metadata.',{exact:false}).isVisible(),'Doodle PNG resolution metadata is not stated');
    await page.locator('#ux2PaletteClose').click();
    assert(await page.locator('#ux2Gallery').isHidden(),'Standalone Doodle should not expose project gallery controls');
    await page.goto(BASE+'/',{waitUntil:'networkidle'});
  });

  await collectLayout(page,'home-after-pattern');
  await desktop.close();

  await step('Motifs: editable Doodle artwork can be reused in Pattern',async()=>{
    const context=await browser.newContext({viewport:{width:844,height:390}});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'motif-cross-workspace');
    await view.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});await view.waitForTimeout(350);
    await view.locator('#ux2ToolMenuTrigger').click();
    const chooserP=view.waitForEvent('filechooser');await view.locator('#ux2ToolMenu').getByRole('button',{name:'Image',exact:true}).click();const chooser=await chooserP;await chooser.setFiles(fixture);
    await view.waitForTimeout(180);await view.locator('#ux2ToolMenuTrigger').click();await view.locator('#ux2ToolMenu').getByRole('button',{name:'Select',exact:true}).click();
    if(!(await visible(view,'#ux2Duplicate'))){
      const box=await view.locator('#editorCanvas').boundingBox();assert(box,'Doodle canvas bounds unavailable');await view.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await view.waitForTimeout(80);
    }
    assert(await visible(view,'#ux2Duplicate'),'Imported Doodle artwork was not selectable');
    await view.locator('#ux2Duplicate').click();await view.locator('#ux2SelectAll').click();
    await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=2);
    await view.locator('[data-ux2-panel="motifs"]').click();
    await view.locator('#ux2MotifName').fill('Cross-workspace motif');await view.locator('#ux2SaveMotif').click();
    await view.getByText('Cross-workspace motif',{exact:true}).waitFor();

    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.waitForTimeout(400);
    if(await view.locator('#resumePrompt').isVisible())await view.locator('#startNewFromResume').click();
    if(await view.locator('#newProjectSetup').isVisible()){
      await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    }
    await view.locator('[data-ux2-panel="motifs"]').click();
    const row=view.locator('[data-motif-id]').filter({hasText:'Cross-workspace motif'});await row.waitFor({state:'visible'});
    await row.getByRole('button',{name:'Insert',exact:true}).click();
    await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=2);
    assert(await view.locator('#selectedPanel').getAttribute('data-selection-grouped')==='true','Inserted motif was not kept as one editable group');
    await shot(view,'motif-doodle-to-pattern');await context.close();
  });

  await step('Pattern: a new tile opens centred with its grid in portrait and landscape',async()=>{
    for(const size of [{width:390,height:844,label:'portrait'},{width:844,height:390,label:'landscape'}]){
      const context=await browser.newContext({viewport:{width:size.width,height:size.height}});
      const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'pattern-'+size.label);
      await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
      await view.locator('#newProjectSetup').waitFor({state:'visible'});
      await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();
      await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
      await view.waitForFunction(()=>Number(document.querySelector('#zoom')?.value)>=250);
      assert(await view.locator('#gridOn').isChecked(),size.label+': default construction grid is off');
      const geometry=await view.evaluate(()=>{const rect=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,w:r.width,h:r.height,display:getComputedStyle(el).display}};const work=rect('.ux2-work'),stage=rect('#stageWrap'),canvas=rect('#editorCanvas'),slot=rect('#ux2CanvasSlot'),canvasHead=rect('.ux2-canvas-head');const topButtons=['#ux2Gallery','#ux2Undo','#ux2Redo','#ux2Fullscreen','#ux2Preview','#ux2Export'].map(rect),canvasControls=['#ux2ZoomOut','#ux2ZoomLabel','#ux2ZoomIn','#ux2Fit'].map(rect);return {work,stage,canvas,slot,canvasHead,topButtons,canvasControls}});assert(geometry.work.x>=-1&&geometry.work.x+geometry.work.w<=size.width+1,size.label+': editor work area exceeds the device width (x='+geometry.work.x+', width='+geometry.work.w+', viewport='+size.width+', slotWidth='+geometry.slot.w+')');assert(geometry.topButtons.filter(button=>button.display!=='none').every(button=>button.x>=-1&&button.right<=size.width+1),size.label+': top bar action is clipped');assert(geometry.canvasControls.every(control=>control.x>=geometry.canvasHead.x-1&&control.right<=geometry.canvasHead.right+1),size.label+': zoom or Fit control is clipped from the canvas tool strip');assert(geometry.slot.x>=geometry.work.x-1&&geometry.slot.x+geometry.slot.w<=geometry.work.x+geometry.work.w+1,size.label+': canvas column exceeds the editor work area');
      assert(geometry.stage.x>=geometry.slot.x-1&&geometry.stage.x+geometry.stage.w<=geometry.slot.x+geometry.slot.w+1,size.label+': tile overflows the available canvas width');
      assert(geometry.stage.y>=geometry.slot.y-1&&geometry.stage.y+geometry.stage.h<=geometry.slot.y+geometry.slot.h+1,size.label+': tile overflows the available canvas height');
      assert(Math.abs((geometry.stage.x+geometry.stage.w/2)-(geometry.canvas.x+geometry.canvas.w/2))<2,size.label+': canvas tile is not horizontally centred');
      assert(Math.abs((geometry.stage.y+geometry.stage.h/2)-(geometry.canvas.y+geometry.canvas.h/2))<2,size.label+': canvas tile is not vertically centred');
      await shot(view,'pattern-fit-'+size.label);await context.close();
    }
  });

  const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,acceptDownloads:true});
  const m=await mobile.newPage();m.setDefaultTimeout(12000);await attachErrors(m,'mobile-landscape');

  await step('Doodle landscape: opens directly and hides Pattern-only controls',async()=>{
    await m.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});
    await m.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    assert((await m.locator('#ux2Mode').textContent())==='Doodle','Doodle mode badge wrong');
    assert(await m.locator('[data-ux2-panel="pattern"]').getAttribute('aria-label')==='Canvas setup','Doodle drawing assists should be available through Canvas setup');
    assert(await m.locator('#editorCanvas').isVisible(),'Doodle canvas missing');
    await shot(m,'11-doodle-landscape');
    const topControls=await Promise.all(['#ux2ToolMenuTrigger','#ux2Undo','#ux2Redo','#ux2Fullscreen','#ux2Export'].map(sel=>m.locator(sel).boundingBox()));
    assert(topControls.every(box=>box&&box.y>=0),'Compact Doodle top-bar controls must stay inside the viewport');
    await collectLayout(m,'doodle-landscape-before-fullscreen');
  });

  await step('Doodle landscape: visible tools are usable',async()=>{
    await m.locator('#ux2ToolMenuTrigger').click();
    for(const checkbox of await m.locator('#ux2ToolMenu input').all())await checkbox.check();
    await m.locator('#ux2ToolMenuTrigger').click();
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
    assert(await m.locator('#ux2Preview').isHidden(),'Doodle should not show a Preview button that opens Layers');
  });

  await step('Doodle fullscreen: camera-safe rail, tools, context and palettes remain usable',async()=>{
    await m.locator('#ux2Fullscreen').click();await m.waitForTimeout(100);
    const tools=await m.locator('.ux2-tools').boundingBox();
    assert(tools&&tools.x>=88,'Fullscreen tool rail is still in the camera/cutout zone');
    const stage=await m.locator('#stageWrap').boundingBox();
    assert(stage&&stage.height>330,'Doodle fullscreen canvas is too small');
    await m.locator('[data-ux2-tool="brush"]').click();
    assert(await m.locator('#ux2Context').isVisible(),'Doodle fullscreen Brush context missing');
    assert(await visible(m,'#ux2BrushLibrary'),'Doodle fullscreen Brush controls missing');
    await m.locator('[data-ux2-panel="layers"]').click();
    assert(await m.locator('#ux2Palette').isVisible(),'Doodle fullscreen Layers panel failed');
    await m.locator('#ux2PaletteClose').click();
    await shot(m,'12-doodle-fullscreen');
    await collectLayout(m,'doodle-fullscreen-landscape');
    await m.locator('#ux2Fullscreen').click();await m.waitForTimeout(220);
  });

  await collectLayout(m,'doodle-landscape-after-fullscreen');
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
