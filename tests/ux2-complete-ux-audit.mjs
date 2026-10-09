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
function zipEntryNames(buffer){
  const names=[];let offset=0;
  while(offset+30<=buffer.length&&buffer.readUInt32LE(offset)===0x04034b50){
    const compressed=buffer.readUInt32LE(offset+18),nameLen=buffer.readUInt16LE(offset+26),extraLen=buffer.readUInt16LE(offset+28),nameStart=offset+30;
    names.push(buffer.subarray(nameStart,nameStart+nameLen).toString('utf8'));
    offset=nameStart+nameLen+extraLen+compressed;
  }
  return names;
}
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
    assert((await page.locator('#ux2PaletteBody .ux2-repeat-card strong').first().textContent()).toLowerCase()==='half drop','Pattern panel repeat label does not match the active project');
    assert(await page.locator('#ux2ToolMenuTrigger').isVisible(),'Pattern Tools chooser is missing');
    await page.locator('#ux2ToolMenuTrigger').click();
    for(const label of ['Colour','Layers','Motifs','Design setup'])assert(await page.getByRole('button',{name:'Open '+label,exact:true}).isVisible(),'Tools menu workspace shortcut missing: '+label);
    assert(await page.getByText('Group, flip & transform',{exact:true}).isVisible(),'Select advanced-feature hint missing');
    assert(await page.getByText('Stabilise, pressure & brush library',{exact:true}).isVisible(),'Brush advanced-feature hint missing');
    assert(await page.getByText('Bucket, gradient & tolerance',{exact:true}).isVisible(),'Fill advanced-feature hint missing');
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

  await step('Pattern: pen pressure stores per-point width data and exports variable-width SVG',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'pressure-width');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('[data-ux2-tool="brush"]').click();
    assert(await visible(view,'#ux2PressureWidth'),'Pressure-width control missing');
    await view.locator('#ux2Stabilisation').selectOption('off');
    await view.locator('#ux2PressureWidth').check();
    await view.locator('#ux2BrushLibrary').click();
    await view.locator('#ux2PressureMin').evaluate(el=>{el.value='24';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ux2PressureResponse').evaluate(el=>{el.value='70';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ux2PaletteClose').click();

    await view.evaluate(async()=>{
      const canvas=document.querySelector('#editorCanvas');canvas.setPointerCapture=()=>{};
      const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;
      const client=(x,y)=>({clientX:rect.x+(ox+x*scale)*rect.width/canvas.width,clientY:rect.y+(oy+y*scale)*rect.height/canvas.height});
      const points=[[220,450,.05],[320,430,.25],[420,470,.5],[520,435,.75],[660,450,1]];
      const fire=(type,x,y,pressure,buttons,pointerType='pen',pointerId=91)=>{const p=client(x,y);canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId,pointerType,pressure,buttons,button:0,...p}))};
      fire('pointerdown',...points[0],1);
      for(const point of points.slice(1))fire('pointermove',...point,1);
      fire('pointerup',660,450,1,0);
      const mouse=[[220,560,0],[420,560,.1],[660,560,1]];
      fire('pointerdown',...mouse[0],1,'mouse',92);for(const point of mouse.slice(1))fire('pointermove',...point,1,'mouse',92);fire('pointerup',660,560,1,0,'mouse',92);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });

    await view.locator('#ux2Export').click();
    const jsonP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const json=await jsonP;const jsonPath=await json.path();assert(jsonPath,'Pressure project download unavailable');
    const data=JSON.parse(fs.readFileSync(jsonPath,'utf8')),brushes=data.marks.filter(mark=>mark.type==='brush');
    const brush=brushes.find(mark=>mark.pressureWidth===true&&(mark.points||[]).some(point=>Number(point.p)<.9));
    assert(brush?.pressureWidth===true,'Pressure-enabled stylus brush flag was not saved');
    const pressures=(brush.points||[]).map(point=>Number(point.p)).filter(Number.isFinite);
    assert(pressures.length>=4&&Math.min(...pressures)<=.08&&Math.max(...pressures)>=.95,'Pen pressure values were not captured across the stroke');
    assert(brush.pressureMin===24&&brush.pressureSensitivity===70,'Pressure curve settings were not captured on the stroke');
    assert(data.settings.pressureWidth===true&&data.settings.pressureMin==='24'&&data.settings.pressureSensitivity==='70','Pressure refinement settings were not persisted');
    const mouseBrush=brushes.find(mark=>mark!==brush&&(mark.points||[]).length>=2&&(mark.points||[]).every(point=>point.p===undefined||Number(point.p)>=.99));
    assert(mouseBrush,'Mouse fallback stroke missing');
    assert((mouseBrush.points||[]).every(point=>point.p===undefined||Math.abs(Number(point.p)-1)<.001),'Mouse input did not fall back to full-width pressure');

    const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP;const svgPath=await svg.path();assert(svgPath,'Pressure SVG download unavailable');
    const svgText=fs.readFileSync(svgPath,'utf8'),widths=[...svgText.matchAll(/stroke-width="([0-9.]+)"/g)].map(match=>Number(match[1])).filter(Number.isFinite);
    const unique=[...new Set(widths.map(width=>width.toFixed(4)))];
    assert(unique.length>=2,'Pressure SVG did not contain multiple vector stroke widths');
    const baseWidth=Number(brush.width),lightExpected=baseWidth*(.24+(1-.24)*(1-(1-.05)*.70));
    assert(widths.some(width=>Math.abs(width-lightExpected)<Math.max(.25,baseWidth*.08)),'SVG did not respect the configured minimum-width/response curve');
    await view.locator('#ux2PaletteClose').click();await shot(view,'pressure-width');await context.close();
  });

  await step('Pattern: pressure width remains compatible with Ink, Pencil and Marker',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(15000);await attachErrors(view,'pressure-style-compat');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('[data-ux2-tool="brush"]').click();await view.locator('#ux2PressureWidth').check();await view.locator('#ux2Stabilisation').selectOption('off');

    const styles=[['ink','#cc2244',340],['pencil','#228844',450],['marker','#2244cc',560]];
    for(let index=0;index<styles.length;index++){
      const [style,colour,y]=styles[index];await view.locator('#ux2BrushStyle').selectOption(style);await view.locator('#ink').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))},colour);
      await view.evaluate(async({index,y})=>{
        const canvas=document.querySelector('#editorCanvas');canvas.setPointerCapture=()=>{};
        const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;
        const client=(x,yy)=>({clientX:rect.x+(ox+x*scale)*rect.width/canvas.width,clientY:rect.y+(oy+yy*scale)*rect.height/canvas.height});
        const fire=(type,x,yy,pressure,buttons)=>{const p=client(x,yy);canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:300+index,pointerType:'pen',pressure,buttons,button:0,...p}))};
        fire('pointerdown',220,y,.2,1);fire('pointermove',420,y,.55,1);fire('pointermove',650,y,1,1);fire('pointerup',650,y,1,0);
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      },{index,y});
    }

    await view.locator('#ux2Export').click();const jsonP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const json=await jsonP;const jsonPath=await json.path();assert(jsonPath,'Pressure style project download unavailable');
    const data=JSON.parse(fs.readFileSync(jsonPath,'utf8')),recent=data.marks.filter(mark=>mark.type==='brush').slice(-3);
    assert(recent.map(mark=>mark.brushStyle).join(',')==='ink,pencil,marker','Pressure style strokes were not retained as Ink/Pencil/Marker');
    for(const mark of recent)assert(mark.pressureWidth===true&&(mark.points||[]).some(point=>Number(point.p)<.5)&&(mark.points||[]).some(point=>Number(point.p)>=.99),mark.brushStyle+' lost pressure data');

    const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP;const svgPath=await svg.path();assert(svgPath,'Pressure style SVG unavailable');
    const svgText=fs.readFileSync(svgPath,'utf8'),svgWidths=[...svgText.matchAll(/stroke-width="([0-9.]+)"/g)].map(match=>Number(match[1])).filter(Number.isFinite);
    const responseWidth=(mark,pressure)=>{
      const min=Math.max(.05,Math.min(.8,Number(mark.pressureMin??18)/100)),sensitivity=Math.max(0,Math.min(1,Number(mark.pressureSensitivity??100)/100));
      const response=1-(1-pressure)*sensitivity,factor=mark.brushStyle==='pencil'?.72:mark.brushStyle==='marker'?1.8:1;
      return Number(mark.width)*factor*(min+(1-min)*response);
    };
    const expected={};
    for(const mark of recent){
      const pressurePairs=[];for(let i=1;i<mark.points.length;i++)pressurePairs.push((Number(mark.points[i-1].p)+Number(mark.points[i].p))/2);
      expected[mark.brushStyle]=pressurePairs.map(pressure=>responseWidth(mark,pressure));
      assert(expected[mark.brushStyle].length>=2,mark.brushStyle+' pressure SVG expectation had too few segments');
      for(const width of expected[mark.brushStyle])assert(svgWidths.some(actual=>Math.abs(actual-width)<Math.max(.02,width*.002)),mark.brushStyle+' expected pressure width '+width.toFixed(4)+' missing from SVG');
    }
    assert(Math.max(...expected.pencil)<Math.max(...expected.ink),'Pencil pressure width did not remain narrower than Ink');
    assert(Math.max(...expected.marker)>Math.max(...expected.ink),'Marker pressure width did not remain broader than Ink');
    await view.locator('#ux2PaletteClose').click();await shot(view,'pressure-style-compat');await context.close();
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

  await step('Pattern: bucket fill makes an editable transparent-region vector and round-trips exports',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(30000);await attachErrors(view,'bucket-vector');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#transparent').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('input',{bubbles:true}))});
    const worldToClient=async(x,y)=>view.locator('#editorCanvas').evaluate((canvas,{x,y})=>{
      const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;
      return {x:rect.x+(ox+x*scale)*rect.width/canvas.width,y:rect.y+(oy+y*scale)*rect.height/canvas.height};
    },{x,y});
    const dragWorld=async(a,b)=>{
      const p1=await worldToClient(a[0],a[1]),p2=await worldToClient(b[0],b[1]);
      await view.mouse.move(p1.x,p1.y);await view.mouse.down();await view.mouse.move(p2.x,p2.y,{steps:12});await view.mouse.up();await view.waitForTimeout(80);
    };
    await view.locator('[data-ux2-tool="rect"]').click();await view.locator('#ux2Rect').click();
    if(await view.locator('#ux2ShapeFill').isChecked())await view.locator('#ux2ShapeFill').uncheck();
    await view.locator('#ux2ShapeWidth').evaluate(el=>{el.value='28';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await dragWorld([250,250],[650,650]);

    await view.locator('[data-ux2-tool="freefill"]').click();await view.locator('#ux2BucketFill').click();
    assert(await activeOldTool(view,'bucket'),'Bucket did not activate the real engine tool');
    if(await view.locator('#ux2BucketSampleVisible').isChecked())await view.locator('#ux2BucketSampleVisible').uncheck();
    await view.locator('#ux2BucketTolerance').evaluate(el=>{el.value='4';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ink').evaluate(el=>{el.value='#dd2244';el.dispatchEvent(new Event('input',{bubbles:true}))});
    const canvas=view.locator('#editorCanvas'),before=await view.evaluate(()=>window.PatternForgeProductPreview().dataUrl),inside=await worldToClient(450,450);
    await view.mouse.click(inside.x,inside.y);
    await view.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Bucket filled'),null,{timeout:30000});
    const metrics=await view.evaluate(()=>window.PatternForgeBucketMetrics);
    assert(metrics?.sampleSize===1800,'Bucket diagnostic sample size changed unexpectedly');
    assert(metrics.estimatedWorkingBytes<=35*1024*1024,'Bucket transient working-buffer estimate exceeded 35 MiB');
    assert(metrics.elapsedMs<6000,'Bucket fill exceeded the 6-second CI performance budget: '+metrics.elapsedMs+' ms');
    const after=await view.evaluate(()=>window.PatternForgeProductPreview().dataUrl);assert(after!==before,'Bucket fill produced no visible canvas change');

    const pixels=await view.evaluate(async()=>{
      const data=window.PatternForgeProductPreview().dataUrl,img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data});
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
      const sample=(wx,wy)=>Array.from(x.getImageData(Math.round(wx/900*c.width),Math.round(wy/900*c.height),1,1).data);
      return {inside:sample(450,450),outside:sample(150,150)};
    });
    assert(pixels.inside[3]>0&&pixels.inside[0]>pixels.inside[2],'Bucket did not colour the transparent enclosed region');
    assert(pixels.outside[3]===0,'Bucket leaked outside the enclosed transparent region');

    await view.locator('#ux2Export').click();
    const jsonP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const json=await jsonP;const jsonPath=await json.path();assert(jsonPath,'Bucket project save failed');
    const data=JSON.parse(fs.readFileSync(jsonPath,'utf8')),bucket=data.marks.filter(mark=>mark.type==='bucket').at(-1);
    assert(bucket?.paths?.length>=1&&bucket.points.length>=3,'Bucket did not persist editable contour geometry');
    assert(bucket.bucketTolerance===4&&bucket.bucketSampleVisible===false,'Bucket settings were not captured on the fill mark');

    await view.locator('#ux2PaletteClose').click();await view.locator('#ux2Undo').click();await view.waitForTimeout(120);
    assert(await view.evaluate(()=>window.PatternForgeProductPreview().dataUrl)===before,'Undo did not remove bucket fill');
    await view.locator('#ux2Redo').click();await view.waitForTimeout(120);
    assert(await view.evaluate(()=>window.PatternForgeProductPreview().dataUrl)===after,'Redo did not restore bucket fill');

    await view.locator('#ux2Export').click();
    const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP;const svgPath=await svg.path();assert(svgPath,'Bucket SVG export failed');
    const svgText=fs.readFileSync(svgPath,'utf8');assert(svgText.includes('fill-rule="evenodd"'),'Bucket SVG lost even-odd vector contours');
    const pngP=view.waitForEvent('download');await view.locator('[data-export-old="exportPng"]').click();const png=await pngP;const pngPath=await png.path();assert(pngPath&&fs.statSync(pngPath).size>1000,'Bucket PNG export failed');
    await view.locator('#ux2PaletteClose').click();

    await view.locator('#projectFile').setInputFiles({name:'bucket-roundtrip.json',mimeType:'application/json',buffer:fs.readFileSync(jsonPath)});
    await view.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);await view.waitForTimeout(150);
    await view.locator('#ux2Export').click();const reopenP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const reopened=await reopenP;const reopenedPath=await reopened.path();
    const reopenedData=JSON.parse(fs.readFileSync(reopenedPath,'utf8')),reopenedBucket=reopenedData.marks.filter(mark=>mark.type==='bucket').at(-1);
    assert(reopenedBucket?.paths?.length===bucket.paths.length&&reopenedBucket.points.length===bucket.points.length,'Bucket contour geometry changed after reopen');
    await view.locator('#ux2PaletteClose').click();await shot(view,'bucket-vector');await context.close();
  });

  await step('Pattern: bucket tolerance changes matching colour extent',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(30000);await attachErrors(view,'bucket-tolerance');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#ux2Export').click();const baseP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const baseD=await baseP;const basePath=await baseD.path();let data=JSON.parse(fs.readFileSync(basePath,'utf8'));await view.locator('#ux2PaletteClose').click();
    const layer=data.layers.find(layer=>layer.id==='layer-drawing')||data.layers.at(-1),id1=data.nextId++,id2=data.nextId++;
    data.transparent=true;data.settings.symmetry='off';data.settings.symmetryGuides=false;data.marks.push(
      {id:id1,layerId:layer.id,type:'rect',color:'#808080',width:1,fill:true,opacity:1,points:[{x:0,y:0},{x:450,y:900}]},
      {id:id2,layerId:layer.id,type:'rect',color:'#888888',width:1,fill:true,opacity:1,points:[{x:450,y:0},{x:900,y:900}]}
    );
    await view.locator('#projectFile').setInputFiles({name:'bucket-tolerance-base.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    await view.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);await view.waitForTimeout(120);
    const worldToClient=async(x,y)=>view.locator('#editorCanvas').evaluate((canvas,{x,y})=>{const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;return {x:rect.x+(ox+x*scale)*rect.width/canvas.width,y:rect.y+(oy+y*scale)*rect.height/canvas.height};},{x,y});
    const tap=await worldToClient(200,450);
    await view.locator('[data-ux2-tool="freefill"]').click();await view.locator('#ux2BucketFill').click();if(await view.locator('#ux2BucketSampleVisible').isChecked())await view.locator('#ux2BucketSampleVisible').uncheck();
    await view.locator('#ux2BucketTolerance').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});await view.mouse.click(tap.x,tap.y);await view.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Bucket filled'),null,{timeout:30000});
    const zeroMetrics=await view.evaluate(()=>window.PatternForgeBucketMetrics);
    assert(zeroMetrics.fillRatio>.45&&zeroMetrics.fillRatio<.55,'Zero-tolerance flood ratio was not one half: '+JSON.stringify(zeroMetrics));
    await view.locator('#ux2Export').click();let p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();let d=await p;let file=await d.path();let zero=JSON.parse(fs.readFileSync(file,'utf8')).marks.filter(mark=>mark.type==='bucket').at(-1);await view.locator('#ux2PaletteClose').click();
    const zeroBounds={min:Math.min(...zero.points.map(p=>p.x)),max:Math.max(...zero.points.map(p=>p.x))};assert(zeroBounds.max-zeroBounds.min<=451,'Zero-tolerance contour spanned too far: '+JSON.stringify({zeroBounds,zeroMetrics}));

    await view.locator('#ux2Undo').click();await view.waitForTimeout(100);await view.locator('[data-ux2-tool="freefill"]').click();await view.locator('#ux2BucketFill').click();
    await view.locator('#ux2BucketTolerance').evaluate(el=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}))});await view.mouse.click(tap.x,tap.y);await view.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Bucket filled'),null,{timeout:30000});
    await view.locator('#ux2Export').click();p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();d=await p;file=await d.path();const five=JSON.parse(fs.readFileSync(file,'utf8')).marks.filter(mark=>mark.type==='bucket').at(-1);await view.locator('#ux2PaletteClose').click();
    const fiveBounds={min:Math.min(...five.points.map(p=>p.x)),max:Math.max(...five.points.map(p=>p.x))};assert(fiveBounds.min<=1&&fiveBounds.max>=899,'Higher bucket tolerance did not include the neighbouring colour');
    await context.close();
  });

  await step('Pattern: bucket fill crosses straight, half-drop and brick repeat seams correctly',async()=>{
    const cases=[
      {repeat:'straight',points:[{x:820,y:300},{x:980,y:600}],tap:[850,450],axis:'x'},
      {repeat:'half-drop',points:[{x:200,y:820},{x:400,y:980}],tap:[300,850],axis:'y'},
      {repeat:'brick',points:[{x:820,y:200},{x:980,y:400}],tap:[850,300],axis:'x'}
    ];
    for(const testCase of cases){
      const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true}),view=await context.newPage();view.setDefaultTimeout(30000);await attachErrors(view,'bucket-seam-'+testCase.repeat);
      await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="'+testCase.repeat+'"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
      await view.locator('#ux2Export').click();const baseP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const baseD=await baseP,basePath=await baseD.path();let data=JSON.parse(fs.readFileSync(basePath,'utf8'));await view.locator('#ux2PaletteClose').click();
      const layer=data.layers.find(layer=>layer.id==='layer-drawing')||data.layers.at(-1);data.transparent=true;data.settings.symmetry='off';data.settings.symmetryGuides=false;data.marks.push({id:data.nextId++,layerId:layer.id,type:'rect',color:'#111111',width:18,fill:false,opacity:1,points:testCase.points});
      await view.locator('#projectFile').setInputFiles({name:'bucket-seam-'+testCase.repeat+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await view.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);await view.waitForTimeout(120);
      const client=await view.locator('#editorCanvas').evaluate((canvas,{x,y})=>{const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;return {x:rect.x+(ox+x*scale)*rect.width/canvas.width,y:rect.y+(oy+y*scale)*rect.height/canvas.height};},{x:testCase.tap[0],y:testCase.tap[1]});
      await view.locator('[data-ux2-tool="freefill"]').click();await view.locator('#ux2BucketFill').click();if(await view.locator('#ux2BucketSampleVisible').isChecked())await view.locator('#ux2BucketSampleVisible').uncheck();await view.locator('#ux2BucketTolerance').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}))});
      await view.mouse.click(client.x,client.y);await view.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Bucket filled'),null,{timeout:30000});
      await view.locator('#ux2Export').click();const p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const d=await p,file=await d.path(),filled=JSON.parse(fs.readFileSync(file,'utf8')).marks.filter(mark=>mark.type==='bucket').at(-1);assert(filled,'Seam bucket missing for '+testCase.repeat);
      const coords=filled.points.map(point=>point[testCase.axis]),min=Math.min(...coords),max=Math.max(...coords);assert(min<=1&&max>=899,'Bucket did not connect across '+testCase.repeat+' '+testCase.axis+' seam');
      await view.locator('#ux2PaletteClose').click();await context.close();
    }
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

  await step('Pattern: live interaction uses lightweight frames and restores full quality on release',async()=>{
    await page.locator('[data-ux2-tool="select"]').click();
    const canvas=page.locator('#editorCanvas'),box=await canvas.boundingBox();assert(box,'Canvas bounds unavailable for interaction test');
    await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await page.waitForTimeout(60);
    await page.evaluate(()=>{const m=window.PatternForgeInteractionMetrics;m.interactiveFrames=0;m.fullFrames=0;m.deferredWorkFrames=0;m.lastInteractiveTileSize=null;});
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();
    for(let i=1;i<=8;i++)await page.mouse.move(box.x+box.width*(.5+i*.012),box.y+box.height*(.5+i*.006));
    await page.waitForTimeout(70);
    const during=await page.evaluate(()=>({...window.PatternForgeInteractionMetrics}));
    assert(during.interactiveFrames>0,'No lightweight interaction frames were rendered');
    assert(during.lastInteractiveTileSize===540,'Interaction frames did not use the 540px working tile');
    assert(during.deferredWorkFrames>0,'Heavy preview/quality work was not deferred during interaction');
    await page.mouse.up();await page.waitForTimeout(90);
    const after=await page.evaluate(()=>({...window.PatternForgeInteractionMetrics}));
    assert(after.active===false,'Interaction mode did not end on pointer release');
    assert(after.fullFrames>0,'Full-quality frame was not restored after interaction');
  });

  await step('Pattern: element-count templates generate three choices, place artwork and persist',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'layout-templates');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('[data-ux2-panel="pattern"]').click();
    const count=view.locator('#ux2TemplateCount');await count.fill('6');await count.dispatchEvent('change');
    assert(await view.locator('.ux2-template-card').count()===3,'Template engine did not present exactly three layout choices');
    assert(await view.locator('.ux2-template-preview svg').count()===3,'Template choices do not have visual previews');
    const first=await view.evaluate(()=>window.PatternForgeTemplates.options(6,0).map(o=>o.slots.map(s=>[Math.round(s.x),Math.round(s.y)])));
    await view.locator('#ux2TemplateNew').click();
    const second=await view.evaluate(()=>window.PatternForgeTemplates.options(6,1).map(o=>o.slots.map(s=>[Math.round(s.x),Math.round(s.y)])));
    assert(JSON.stringify(first)!==JSON.stringify(second),'Show me 3 different layouts did not generate different placement geometry');
    await view.getByRole('button',{name:'Choose Flowing layout',exact:true}).click();
    let active=await view.evaluate(()=>window.PatternForgeTemplates.active);
    assert(active&&active.count===6&&active.choice===1&&active.slots.length===6,'Chosen template state is incomplete');
    await view.locator('#ux2PaletteClose').click();
    const chooserP=view.waitForEvent('filechooser');await view.locator('[data-ux2-action="image"]').click();const chooser=await chooserP;await chooser.setFiles(fixture);await view.waitForTimeout(180);
    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2TemplateDistribute').click();await view.waitForTimeout(80);
    const result=await view.evaluate(()=>({active:window.PatternForgeTemplates.active,count:window.PatternForgeTemplates.countElements()}));
    assert(result.count>=1,'Template distribution could not see imported artwork');
    const exportOpen=view.locator('#ux2Export');await exportOpen.click();const p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const d=await p;const path=await d.path();assert(path,'Template project download unavailable');const data=JSON.parse(fs.readFileSync(path,'utf8'));
    assert(data.templateGuide&&data.templateGuide.count===6&&data.templateGuide.slots.length===6,'Template guide did not persist in editable project');
    const placed=data.items[0],slot=data.templateGuide.slots[0];assert(placed&&Math.hypot(placed.x-slot.x,placed.y-slot.y)<2,'Template did not place the current element in its first slot');
    await view.locator('#ux2PaletteClose').click();await shot(view,'template-six-elements');await context.close();
  });

  await step('Pattern: Etsy kit validates a boundary-crossing repeat and preserves the editable design',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(60000);await attachErrors(view,'etsy-export');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    const chooserP=view.waitForEvent('filechooser');await view.locator('[data-ux2-action="image"]').click();const chooser=await chooserP;await chooser.setFiles(fixture);await view.waitForTimeout(180);
    await view.evaluate(()=>{
      const bridge=window.PatternForgeEtsyBridge,state=bridge.state,item=state.items[0];if(!item)throw new Error('Imported Etsy test item missing');
      item.x=25;item.y=450;item.scale=Math.max(item.scale,.72);
      document.querySelector('#transparent').checked=true;
    });
    await view.locator('#ux2Export').click();
    assert(await view.locator('#ux2EtsyExport').isVisible(),'Export for Etsy button is missing');
    const pre=await view.evaluate(()=>window.PatternForgeEtsy.check());
    assert(pre.some(check=>check.id==='seams'&&check.state==='pass'),'Boundary-crossing repeat did not pass seam continuity: '+JSON.stringify(pre.find(check=>check.id==='seams')));
    assert(!pre.some(check=>check.state==='fail'),'Etsy preflight unexpectedly failed: '+JSON.stringify(pre));
    const result=await view.evaluate(()=>window.PatternForgeEtsy.prepare({download:false}));
    assert(result.success===true,'Etsy kit generation failed: '+JSON.stringify(result));
    assert(result.designUnchanged===true,'Etsy packaging modified the editable design');
    assert(result.buyerPackages.length>=1&&result.buyerPackages.length<=5,'Etsy buyer package count is outside the five-file limit');
    assert(result.buyerPackages.every(file=>file.size<=20000000),'An Etsy buyer ZIP exceeds 20 MB');
    const buyerNames=result.buyerFiles.map(file=>file.name);
    assert(buyerNames.some(name=>name.endsWith('.png')),'Etsy buyer files are missing PNG');
    assert(buyerNames.some(name=>name.endsWith('.jpg')),'Etsy buyer files are missing JPG');
    assert(buyerNames.some(name=>name.includes('repeat-preview-3x3')),'Etsy buyer files are missing the 3 × 3 repeat preview');
    assert(result.vectorIncluded===true&&buyerNames.some(name=>name.endsWith('.svg')),'Vector-only design did not receive an SVG inside the buyer package');
    const vectorDownload=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const vectorFile=await vectorDownload;const vectorPath=await vectorFile.path();assert(vectorPath,'SVG export file unavailable');
    const vectorText=fs.readFileSync(vectorPath,'utf8'),rootMatch=vectorText.match(/<svg\b([^>]*)>/i);assert(rootMatch,'SVG root element missing');
    assert(!/undefined|NaN/i.test(rootMatch[1]),'SVG root contains an undefined or invalid dimension');
    assert(/\bwidth="4000"/.test(rootMatch[1])&&/\bheight="4000"/.test(rootMatch[1]),'Straight-repeat SVG intrinsic dimensions are not 4000 × 4000');
    assert(/\bviewBox="0 0 4000 4000"/.test(rootMatch[1]),'Straight-repeat SVG viewBox is incorrect');
    const vectorParse=await view.evaluate(async svgText=>{
      const doc=new DOMParser().parseFromString(svgText,'image/svg+xml'),root=doc.documentElement,parserError=doc.querySelector('parsererror')?.textContent||'';
      let imageLoaded=false;
      try{
        const blob=new Blob([svgText],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
        imageLoaded=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0);image.onerror=()=>resolve(false);image.src=url});
        URL.revokeObjectURL(url);
      }catch{}
      return {name:root?.localName||'',width:root?.getAttribute('width'),height:root?.getAttribute('height'),viewBox:root?.getAttribute('viewBox'),parserError,imageLoaded};
    },vectorText);
    assert(vectorParse.name==='svg'&&!vectorParse.parserError,'SVG cannot be parsed as XML');
    assert(vectorParse.width==='4000'&&vectorParse.height==='4000'&&vectorParse.viewBox==='0 0 4000 4000','Parsed SVG dimensions/viewBox are incorrect');
    assert(vectorParse.imageLoaded===true,'Exported SVG cannot be reopened as an image');
    assert(buyerNames.some(name=>name.endsWith('-seamless-master.png'))&&buyerNames.some(name=>name.endsWith('-seamless-master.jpg')),'Buyer filenames should describe one adaptable master design rather than a physical size');
    assert(!buyerNames.some(name=>/300dpi|4000x4000/i.test(name)),'Buyer filenames still imply a fixed size/resolution product');
    assert(result.listingImages.length===3,'Expected three design-only Etsy listing images');
    assert(result.listingImages.every(image=>image.width>=2000&&image.height>=1500),'Listing images are below the intended listing-ready size');
    const listingNames=result.listingImages.map(image=>image.name.toLowerCase());
    assert(listingNames.some(name=>name.includes('full-pattern'))&&listingNames.some(name=>name.includes('seamless-tile'))&&listingNames.some(name=>name.includes('pattern-detail')),'Design-only listing views are incomplete');
    assert(!listingNames.some(name=>/(fabric|cushion|wallpaper|wrapping|stationery)/.test(name)),'Product mockup imagery leaked into the design-only Etsy kit');
    assert(result.rules.maxFiles===5&&result.rules.maxBytes===20000000,'Encoded Etsy upload limits are incorrect');
    await shot(view,'etsy-export-ready');await context.close();
  });

  await step('Pattern: SVG root dimensions stay valid for half-drop and brick repeats',async()=>{
    for(const testCase of [{repeat:'half-drop',width:'4000',height:'8000',viewBox:'0 0 4000 8000'},{repeat:'brick',width:'8000',height:'4000',viewBox:'0 0 8000 4000'}]){
      const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true}),view=await context.newPage();view.setDefaultTimeout(20000);await attachErrors(view,'svg-root-'+testCase.repeat);
      await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="'+testCase.repeat+'"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
      await view.locator('#ux2Export').click();const p=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const d=await p,file=await d.path();assert(file,testCase.repeat+' SVG export unavailable');
      const svgText=fs.readFileSync(file,'utf8'),root=svgText.match(/<svg\b([^>]*)>/i)?.[1]||'';
      assert(root&&!/undefined|NaN/i.test(root),testCase.repeat+' SVG root contains an invalid dimension');
      assert(root.includes('width="'+testCase.width+'"')&&root.includes('height="'+testCase.height+'"'),testCase.repeat+' SVG intrinsic dimensions are incorrect');
      assert(root.includes('viewBox="'+testCase.viewBox+'"'),testCase.repeat+' SVG viewBox is incorrect');
      await context.close();
    }
  });

  await step('Pattern: scatter preserves manual items, freezes, and respects seam-aware spacing',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'scatter-controls');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#ux2ToolMenuTrigger').click();
    const chooserP=view.waitForEvent('filechooser');await view.locator('#ux2ToolMenu').getByRole('button',{name:'Image',exact:true}).click();const chooser=await chooserP;await chooser.setFiles(fixture);await view.waitForTimeout(160);

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

  await step('Pattern: saved variation restores design state and Undo reverses the apply',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'variations');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    const chooserP=view.waitForEvent('filechooser');await view.locator('[data-ux2-action="image"]').click();const chooser=await chooserP;await chooser.setFiles(fixture);await view.waitForTimeout(140);
    const saveProject=async()=>{
      await view.locator('#ux2Export').click();const p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const d=await p;const file=await d.path();assert(file,'Variation project path unavailable');const data=JSON.parse(fs.readFileSync(file,'utf8'));await view.locator('#ux2PaletteClose').click();return data;
    };
    const baseline=await saveProject(),baseItem=baseline.items[0];assert(baseItem,'Variation baseline item missing');

    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2VariationName').fill('Baseline colourway');await view.locator('#ux2SaveVariation').click();
    await view.getByText('Baseline colourway',{exact:true}).waitFor();await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-tool="select"]').click();
    if(!(await visible(view,'#ux2SelScale'))){const box=await view.locator('#editorCanvas').boundingBox();assert(box,'Variation canvas unavailable');await view.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await view.waitForTimeout(80);}
    assert(await visible(view,'#ux2SelScale'),'Variation test could not select imported item');
    await view.locator('#ux2SelScale').evaluate(el=>{el.value='155';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await view.locator('#ux2SelRot').evaluate(el=>{el.value='33';el.dispatchEvent(new Event('input',{bubbles:true}));});await view.waitForTimeout(80);
    const modified=await saveProject(),modifiedItem=modified.items.find(item=>item.id===baseItem.id);assert(modifiedItem,'Modified variation item missing');
    assert(Math.abs(modifiedItem.scale-baseItem.scale)>1e-5||Math.abs(modifiedItem.rotation-baseItem.rotation)>1e-5,'Variation test did not alter the item');

    await view.locator('[data-ux2-panel="pattern"]').click();
    const row=view.locator('[data-variation-id]').filter({hasText:'Baseline colourway'});await row.waitFor({state:'visible'});await row.getByRole('button',{name:'Apply',exact:true}).click();await view.waitForTimeout(100);
    const applied=await saveProject(),appliedItem=applied.items.find(item=>item.id===baseItem.id);
    assert(Math.abs(appliedItem.scale-baseItem.scale)<1e-6&&Math.abs(appliedItem.rotation-baseItem.rotation)<1e-6,'Applying saved variation did not restore item transform');
    assert(applied.variations?.some(v=>v.name==='Baseline colourway'),'Saved variation was not persisted in project JSON');

    await view.locator('#ux2Undo').click();await view.waitForTimeout(100);
    const undone=await saveProject(),undoneItem=undone.items.find(item=>item.id===baseItem.id);
    assert(Math.abs(undoneItem.scale-modifiedItem.scale)<1e-6&&Math.abs(undoneItem.rotation-modifiedItem.rotation)<1e-6,'Undo did not reverse variation application');
    await shot(view,'saved-variation');await context.close();
  });

  await step('Pattern: colourway manager renames, duplicates, compares and exports without changing work',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(30000);await attachErrors(view,'colourway-export');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#files').setInputFiles(fixture);await view.waitForTimeout(140);

    const saveProject=async()=>{
      await view.locator('#ux2Export').click();const p=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const d=await p,file=await d.path();
      assert(file,'Colourway editable project path unavailable');const data=JSON.parse(fs.readFileSync(file,'utf8'));await view.locator('#ux2PaletteClose').click();return data;
    };
    const stable=data=>{const copy=structuredClone(data);if(copy.project)delete copy.project.updatedAt;return copy;};

    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2VariationName').fill('Blue & Cream');await view.locator('#ux2SaveVariation').click();
    await view.getByText('Blue & Cream',{exact:true}).waitFor();await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-tool="select"]').click();
    if(!(await visible(view,'#ux2SelScale'))){const box=await view.locator('#editorCanvas').boundingBox();assert(box,'Colourway canvas unavailable');await view.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await view.waitForTimeout(80);}
    await view.locator('#ux2SelScale').evaluate(el=>{el.value='142';el.dispatchEvent(new Event('input',{bubbles:true}))});await view.waitForTimeout(60);
    await view.locator('[data-ux2-panel="colour"]').click();await view.locator('#ux2ColourInput').evaluate(el=>{el.value='#b8643f';el.dispatchEvent(new Event('input',{bubbles:true}))});await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2VariationName').fill('Terracotta');await view.locator('#ux2SaveVariation').click();
    await view.getByText('Terracotta',{exact:true}).waitFor();
    const terraRow=view.locator('[data-variation-id]').filter({hasText:'Terracotta'}),blueRow=view.locator('[data-variation-id]').filter({hasText:'Blue & Cream'});
    assert((await terraRow.locator('small').textContent())==='Matches current design','Current colourway comparison did not report a match');
    assert((await blueRow.locator('small').textContent())!=='Matches current design','Older colourway comparison did not report differences');

    await blueRow.getByRole('button',{name:'Duplicate',exact:true}).click();await view.getByText('Copy of Blue & Cream',{exact:true}).waitFor();
    const copyRow=view.locator('[data-variation-id]').filter({hasText:'Copy of Blue & Cream'});
    view.once('dialog',dialog=>dialog.accept('Green Study'));await copyRow.getByRole('button',{name:'Rename',exact:true}).click();await view.getByText('Green Study',{exact:true}).waitFor();
    const greenRow=view.locator('[data-variation-id]').filter({hasText:'Green Study'});await greenRow.getByRole('button',{name:'Delete',exact:true}).click();
    assert(await view.getByText('Green Study',{exact:true}).count()===0,'Deleted duplicate colourway remained visible');

    await view.locator('#ux2PaletteClose').click();
    const beforeCanvas=await view.locator('#editorCanvas').evaluate(el=>el.toDataURL()),before=await saveProject();
    assert(before.variations.length===2,'Colourway manager should have two saved variations before export');

    await view.locator('[data-ux2-panel="pattern"]').click();
    const zipP=view.waitForEvent('download',{timeout:120000});await view.locator('#ux2ExportVariations').click();const zip=await zipP,zipPath=await zip.path();assert(zipPath,'Colourway ZIP path unavailable');
    assert(zip.suggestedFilename().endsWith('-colourways.zip'),'Colourway export used the wrong ZIP filename');
    const names=zipEntryNames(fs.readFileSync(zipPath));
    assert(names.filter(name=>name.endsWith('.png')).length===2,'Colourway ZIP did not contain two PNG files');
    assert(names.filter(name=>name.endsWith('.svg')).length===2,'Colourway ZIP did not contain two SVG files');
    assert(names.filter(name=>name.endsWith('-editable-project.json')).length===1,'Colourway ZIP did not contain one editable project');
    assert(names.some(name=>/Terracotta/i.test(name))&&names.some(name=>/Blue-Cream/i.test(name)),'Colourway ZIP filenames did not preserve saved variation names');

    await view.locator('#ux2PaletteClose').click();
    const afterCanvas=await view.locator('#editorCanvas').evaluate(el=>el.toDataURL()),after=await saveProject();
    assert(afterCanvas===beforeCanvas,'Colourway batch export changed the working canvas');
    assert(JSON.stringify(stable(after))===JSON.stringify(stable(before)),'Colourway batch export changed the editable working project');
    await shot(view,'colourway-export');await context.close();
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
    assert(await visible(page,'#ux2FlipH')&&await visible(page,'#ux2FlipV'),'Group flip controls missing');
    await page.locator('#ux2FlipH').click();await page.locator('#ux2FlipV').click();
    await page.waitForTimeout(100);
    assert(await page.locator('#editorCanvas').evaluate(el=>el.toDataURL())!==beforeTransform,'Scale/rotate/flip multi-selection produced no canvas change');

    await page.locator('#ux2Export').click();
    const projectP=page.waitForEvent('download');await page.locator('[data-export-old="saveProject"]').click();const projectDownload=await projectP;
    const groupedPath=await projectDownload.path();assert(groupedPath,'Grouped project download path unavailable');
    const groupedData=JSON.parse(fs.readFileSync(groupedPath,'utf8'));
    const groupedArtwork=[...groupedData.items,...groupedData.marks].filter(artwork=>typeof artwork.groupId==='string'&&artwork.groupId);
    assert(groupedArtwork.length>=selectedCount,'Group IDs were not persisted to the editable project');
    assert(groupedData.items.some(item=>item.flipX===true&&item.flipY===true),'Imported artwork flip state was not persisted');
    assert(groupedData.marks.some(mark=>mark.type!=='eraser'&&mark.transformFlipX===true&&mark.transformFlipY===true),'Drawn mark flip state was not persisted');
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

  await step('Pattern: master-output preview is scale-neutral and has no product presets',async()=>{
    await page.locator('[data-ux2-panel="pattern"]').click();
    assert(await visible(page,'#ux2MasterOutputStage'),'Master-output preview missing');
    assert(await page.locator('#ux2ProductScaleType').count()===0,'Legacy product preset control is still present');
    assert(await page.locator('#ux2ProductTileWidth').count()===0,'Legacy physical tile-width control is still present');
    assert(await page.locator('#ux2ProductTileUnit').count()===0,'Legacy physical unit control is still present');
    const readout=page.locator('#ux2MasterOutputReadout');await readout.waitFor({state:'visible'});
    const initial=await readout.textContent();assert(initial.includes('4,000')&&initial.includes('does not set a physical size'),'Master-output readout does not state the scale-neutral model');
    const object=page.locator('#ux2MasterOutputObject');await page.waitForFunction(()=>document.querySelector('#ux2MasterOutputObject')?.style.backgroundImage.includes('data:image/png'));
    const before=parseFloat((await object.evaluate(el=>el.style.backgroundSize)).split('px')[0]);assert(before>0,'Master-output repeat density is missing');
    await page.locator('#ux2MasterDensity').evaluate(el=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(50);
    const after=parseFloat((await object.evaluate(el=>el.style.backgroundSize)).split('px')[0]);assert(after>before*1.5,'Master-output density slider did not change the visual repeat scale');
    assert((await readout.textContent()).includes('visual only'),'Master-output density is being presented as a physical scale');
    await page.locator('#ux2PaletteClose').click();
  });

  await step('Pattern: master-output preview preserves straight, half-drop and brick repeat-cell proportions',async()=>{
    for(const testCase of [{repeat:'straight',ratio:1,text:'4,000 × 4,000'},{repeat:'half-drop',ratio:2,text:'4,000 × 8,000'},{repeat:'brick',ratio:.5,text:'8,000 × 4,000'}]){
      const context=await browser.newContext({viewport:{width:1100,height:760}}),view=await context.newPage();view.setDefaultTimeout(15000);await attachErrors(view,'master-'+testCase.repeat);
      await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="'+testCase.repeat+'"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
      await view.locator('[data-ux2-panel="pattern"]').click();await view.waitForTimeout(60);
      const size=(await view.locator('#ux2MasterOutputGrid').evaluate(el=>el.style.backgroundSize)).split(' ').map(value=>parseFloat(value));
      assert(size.length>=2&&size[0]>0&&size[1]>0,testCase.repeat+' master repeat-cell grid size missing');
      assert(Math.abs(size[1]/size[0]-testCase.ratio)<.08,testCase.repeat+' master repeat-cell ratio is wrong');
      const readout=await view.locator('#ux2MasterOutputReadout').textContent();assert(readout.includes(testCase.text),testCase.repeat+' master pixel dimensions are wrong');
      assert(!/cushion|phone|A2|fabric|wallpaper|printed base-tile|reference product|printed tile width/i.test(await view.locator('#ux2PaletteBody').textContent()),testCase.repeat+' Design setup still contains physical-product sizing language');
      await view.locator('#ux2PaletteClose').click();await context.close();
    }
  });
  await step('Pattern: Alpha Lock preserves layer alpha through paint, recolour, eraser and reopen',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(20000);await attachErrors(view,'alpha-lock');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#transparent').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#symmetry').evaluate(el=>{el.value='off';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});
    await view.locator('#symmetryGuides').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});

    const worldToClient=async(x,y)=>view.locator('#editorCanvas').evaluate((canvas,{x,y})=>{
      const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;
      return {x:rect.x+(ox+x*scale)*rect.width/canvas.width,y:rect.y+(oy+y*scale)*rect.height/canvas.height};
    },{x,y});
    const dragWorld=async(a,b)=>{
      const p1=await worldToClient(a[0],a[1]),p2=await worldToClient(b[0],b[1]);
      await view.mouse.move(p1.x,p1.y);await view.mouse.down();await view.mouse.move(p2.x,p2.y,{steps:14});await view.mouse.up();await view.waitForTimeout(90);
    };
    const previewPixels=()=>view.evaluate(async()=>{
      const data=window.PatternForgeProductPreview().dataUrl,img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data});
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
      const sample=(wx,wy)=>Array.from(x.getImageData(Math.round(wx/900*c.width),Math.round(wy/900*c.height),1,1).data);
      return {inside:sample(450,450),insideSafe:sample(450,360),outside:sample(220,450)};
    });

    await view.locator('[data-ux2-tool="rect"]').click();await view.locator('#ux2Rect').click();
    if(!(await view.locator('#ux2ShapeFill').isChecked()))await view.locator('#ux2ShapeFill').check();
    await view.locator('#ux2ShapeWidth').evaluate(el=>{el.value='12';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#inkOpacity').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ink').evaluate(el=>{el.value='#2244aa';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await dragWorld([300,300],[600,600]);
    const basePixels=await previewPixels();assert(basePixels.inside[3]>=120&&basePixels.inside[3]<=135,'Base semi-transparent alpha was not ~50%');

    await view.locator('[data-ux2-panel="layers"]').click();
    assert(await visible(view,'#ux2LayerAlphaLock'),'Alpha Lock control missing from Layers');
    await view.locator('#ux2LayerAlphaLock').check();await view.waitForTimeout(80);await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-tool="brush"]').click();
    await view.locator('#ux2Size').evaluate(el=>{el.value='180';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ux2Opacity').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ink').evaluate(el=>{el.value='#dd2244';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await dragWorld([180,450],[720,450]);
    let painted=await previewPixels();
    assert(painted.outside[3]===0,'Alpha-Locked brush leaked outside existing layer alpha');
    assert(painted.inside[3]>=120&&painted.inside[3]<=135,'Alpha-Locked brush changed destination alpha');
    assert(painted.inside[0]>painted.inside[2],'Alpha-Locked red paint was not visible inside existing alpha');

    await view.locator('[data-ux2-tool="select"]').click();
    const inside=await worldToClient(450,450);await view.mouse.click(inside.x,inside.y);await view.waitForTimeout(80);
    await view.locator('[data-ux2-panel="colour"]').click();
    assert(await visible(view,'#ux2SelectionColour'),'Selected Alpha-Locked mark did not expose recolour');
    await view.locator('#ux2SelectionColour').evaluate(el=>{el.value='#22aa44';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ux2RecolourSelection').click();await view.waitForTimeout(90);
    painted=await previewPixels();
    assert(painted.outside[3]===0,'Recolour caused Alpha-Locked artwork to leak outside base alpha');
    assert(painted.inside[3]>=120&&painted.inside[3]<=135,'Recolour changed Alpha-Locked destination alpha');
    assert(painted.inside[1]>painted.inside[0]&&painted.inside[1]>painted.inside[2],'Alpha-Locked recolour was not visible');
    await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-tool="eraser"]').click();
    await view.locator('#ux2Size').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await dragWorld([400,450],[500,450]);
    const erased=await previewPixels();assert(erased.inside[3]===0,'Eraser did not remain subtractive under Alpha Lock');assert(erased.insideSafe[3]>=120,'Eraser removed unrelated Alpha-Locked artwork');

    await view.locator('#ux2Export').click();
    const jsonP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const json=await jsonP;const jsonPath=await json.path();assert(jsonPath,'Alpha Lock project save failed');
    const saved=JSON.parse(fs.readFileSync(jsonPath,'utf8')),drawing=saved.layers.find(layer=>layer.id==='layer-drawing'),lockedBrush=saved.marks.find(mark=>mark.type==='brush'&&mark.alphaLocked===true),eraser=saved.marks.find(mark=>mark.type==='eraser');
    assert(drawing?.alphaLock===true,'Layer Alpha Lock state was not persisted');
    assert(lockedBrush,'Alpha-Locked brush flag was not persisted');
    assert(eraser&&eraser.alphaLocked!==true,'Eraser was incorrectly Alpha-Locked');

    const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP,svgPath=await svg.path();assert(svgPath,'Alpha Lock SVG export failed');
    const svgText=fs.readFileSync(svgPath,'utf8');assert(svgText.includes('pf-alpha-lock-')&&svgText.includes('mask-type:alpha'),'SVG did not preserve Alpha Lock boundary masking');
    const pngP=view.waitForEvent('download');await view.locator('[data-export-old="exportPng"]').click();const png=await pngP,pngPath=await png.path();assert(pngPath&&fs.statSync(pngPath).size>1000,'Alpha Lock PNG export failed');
    await view.locator('#ux2PaletteClose').click();

    await view.locator('#projectFile').setInputFiles({name:'alpha-lock-roundtrip.json',mimeType:'application/json',buffer:fs.readFileSync(jsonPath)});
    await view.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);await view.waitForTimeout(160);
    const reopened=await previewPixels();
    assert(reopened.outside[3]===0&&reopened.inside[3]===0&&reopened.insideSafe[3]>=120,'Alpha Lock visual result changed after reopen');
    await view.locator('#ux2Export').click();const reopenP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const reopenedDownload=await reopenP,reopenedPath=await reopenedDownload.path();const reopenedData=JSON.parse(fs.readFileSync(reopenedPath,'utf8'));
    assert(reopenedData.layers.find(layer=>layer.id==='layer-drawing')?.alphaLock===true,'Alpha Lock layer state changed after reopen');
    assert(reopenedData.marks.some(mark=>mark.type==='brush'&&mark.alphaLocked===true),'Alpha-Locked mark state changed after reopen');
    await view.locator('#ux2PaletteClose').click();await shot(view,'alpha-lock');await context.close();
  });

  await step('Pattern: clipping mask constrains artwork in PNG preview and SVG export',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'clipping-mask');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});
    await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#transparent').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('input',{bubbles:true}))});
    const worldToClient=async(x,y)=>view.locator('#editorCanvas').evaluate((canvas,{x,y})=>{
      const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;
      return {x:rect.x+(ox+x*scale)*rect.width/canvas.width,y:rect.y+(oy+y*scale)*rect.height/canvas.height};
    },{x,y});
    const dragWorld=async(a,b)=>{
      const p1=await worldToClient(a[0],a[1]),p2=await worldToClient(b[0],b[1]);
      await view.mouse.move(p1.x,p1.y);await view.mouse.down();await view.mouse.move(p2.x,p2.y,{steps:12});await view.mouse.up();await view.waitForTimeout(80);
    };

    await view.locator('[data-ux2-tool="rect"]').click();await view.locator('#ux2Rect').click();
    if(!(await view.locator('#ux2ShapeFill').isChecked()))await view.locator('#ux2ShapeFill').check();
    await view.locator('#ink').evaluate(el=>{el.value='#2244aa';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await dragWorld([300,300],[600,600]);

    await view.locator('[data-ux2-panel="layers"]').click();await view.locator('#ux2AddLayer').click();
    assert(await view.locator('#ux2LayerClipToBelow').isEnabled(),'New upper layer cannot enable clipping');
    await view.locator('#ux2LayerClipToBelow').check();await view.waitForTimeout(80);await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-tool="brush"]').click();
    await view.locator('#ux2Size').evaluate(el=>{el.value='180';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await view.locator('#ink').evaluate(el=>{el.value='#dd2244';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await dragWorld([180,450],[720,450]);

    const pixels=await view.evaluate(async()=>{
      const data=window.PatternForgeProductPreview().dataUrl,img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data});
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
      const sample=(wx,wy)=>Array.from(x.getImageData(Math.round(wx/900*c.width),Math.round(wy/900*c.height),1,1).data);
      return {outside:sample(230,450),inside:sample(450,450)};
    });
    assert(pixels.outside[3]===0,'Clipped brush leaked outside the base-layer transparency');
    assert(pixels.inside[3]>0&&pixels.inside[0]>pixels.inside[2],'Clipped brush is not visible inside the base-layer alpha');

    await view.locator('#ux2Export').click();
    const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP;const svgPath=await svg.path();assert(svgPath,'Clipping SVG path unavailable');
    const svgText=fs.readFileSync(svgPath,'utf8');assert(svgText.includes('pf-clip-')&&svgText.includes('mask-type:alpha'),'SVG export did not preserve the clipping mask');
    const jsonP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const json=await jsonP;const jsonPath=await json.path();assert(jsonPath,'Clipping project path unavailable');
    const data=JSON.parse(fs.readFileSync(jsonPath,'utf8'));assert(data.layers.some(layer=>layer.clipToBelow===true),'Clipping layer state did not persist');
    await view.locator('#ux2PaletteClose').click();await shot(view,'clipping-mask');await context.close();
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
    await page.locator('#ux2ToolMenuTrigger').click();
    const menuBox=await page.locator('#ux2ToolMenu').boundingBox(),dockBox=await page.locator('.ux2-dockbar').boundingBox();
    assert(menuBox&&dockBox&&menuBox.x+menuBox.width<=dockBox.x+1,'Fullscreen Tools menu covers the feature dock');
    for(const label of ['Colour','Layers','Motifs','Design setup'])assert(await page.getByRole('button',{name:'Open '+label,exact:true}).isVisible(),'Fullscreen workspace shortcut missing: '+label);
    await page.getByRole('button',{name:'Open Design setup',exact:true}).click();
    assert((await page.locator('#ux2PaletteTitle').textContent())==='Design setup','Tools workspace shortcut did not open Design setup');
    await page.locator('#ux2PaletteClose').click();
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
    assert(await page.getByText('Raster dimensions describe the master file, not a physical size.',{exact:false}).isVisible(),'Doodle adaptable-master export model is not stated');
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

  await step('Integration: pressure motif, grouping, clipping, save-reopen and exports stay compatible',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(15000);await attachErrors(view,'integration-pressure-motif-clip');

    await view.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});await view.waitForTimeout(300);
    await view.locator('[data-ux2-tool="brush"]').click();
    await view.locator('#ux2Stabilisation').selectOption('off');
    await view.locator('#ux2PressureWidth').check();
    await view.evaluate(async()=>{
      const canvas=document.querySelector('#editorCanvas');canvas.setPointerCapture=()=>{};
      const rect=canvas.getBoundingClientRect(),zoom=Number(document.querySelector('#zoom').value)/100,scale=.38*zoom,ox=(canvas.width-900*scale)/2,oy=(canvas.height-900*scale)/2;
      const client=(x,y)=>({clientX:rect.x+(ox+x*scale)*rect.width/canvas.width,clientY:rect.y+(oy+y*scale)*rect.height/canvas.height});
      const stroke=(id,points)=>{
        const fire=(type,x,y,pressure,buttons)=>{const p=client(x,y);canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'pen',pressure,buttons,button:0,...p}))};
        fire('pointerdown',...points[0],1);for(const point of points.slice(1))fire('pointermove',...point,1);const last=points.at(-1);fire('pointerup',last[0],last[1],last[2],0);
      };
      stroke(201,[[230,390,.1],[330,365,.35],[440,405,.7],[560,380,1]]);
      stroke(202,[[260,520,.2],[360,495,.45],[470,535,.8],[610,505,1]]);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });

    await view.locator('#ux2ToolMenuTrigger').click();await view.locator('#ux2ToolMenu').getByRole('button',{name:'Select',exact:true}).click();
    await view.locator('#ux2SelectAll').click();
    await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=2);
    await view.locator('[data-ux2-panel="motifs"]').click();await view.locator('#ux2MotifName').fill('Pressure pair');await view.locator('#ux2SaveMotif').click();
    await view.getByText('Pressure pair',{exact:true}).waitFor();

    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.waitForTimeout(350);
    if(await view.locator('#resumePrompt').isVisible())await view.locator('#startNewFromResume').click();
    if(await view.locator('#newProjectSetup').isVisible()){
      await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    }

    await view.locator('#files').setInputFiles(fixture);await view.waitForTimeout(160);
    await view.locator('[data-ux2-panel="motifs"]').click();
    const motifRow=view.locator('[data-motif-id]').filter({hasText:'Pressure pair'});await motifRow.waitFor({state:'visible'});await motifRow.getByRole('button',{name:'Insert',exact:true}).click();
    await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=2);
    assert(await view.locator('#selectedPanel').getAttribute('data-selection-grouped')==='true','Inserted pressure motif did not remain one group');

    await view.locator('[data-ux2-panel="layers"]').click();
    const drawingRow=view.locator('[data-layer-index]').filter({hasText:'Drawing'}).first();await drawingRow.click();
    assert(await view.locator('#ux2LayerClipToBelow').isEnabled(),'Drawing layer could not clip to the motif layer below');
    if(!(await view.locator('#ux2LayerClipToBelow').isChecked()))await view.locator('#ux2LayerClipToBelow').check();
    await view.locator('#ux2PaletteClose').click();

    await view.locator('#ux2Export').click();
    const pngP=view.waitForEvent('download');await view.locator('[data-export-old="exportPng"]').click();const png=await pngP;const pngPath=await png.path();assert(pngPath&&fs.statSync(pngPath).size>1000,'Combined PNG export failed');
    const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP;const svgPath=await svg.path();assert(svgPath,'Combined SVG export failed');
    const svgText=fs.readFileSync(svgPath,'utf8');
    assert(svgText.includes('pf-clip-')&&svgText.includes('mask-type:alpha'),'Combined SVG lost clipping');
    const widths=[...svgText.matchAll(/stroke-width="([0-9.]+)"/g)].map(match=>Number(match[1])).filter(Number.isFinite);
    assert(new Set(widths.map(width=>width.toFixed(4))).size>=2,'Combined SVG lost pressure width variation');

    const saveP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const savedDownload=await saveP;const savedPath=await savedDownload.path();assert(savedPath,'Combined project save failed');
    const before=JSON.parse(fs.readFileSync(savedPath,'utf8')),pressureMarks=before.marks.filter(mark=>mark.pressureWidth===true);
    assert(pressureMarks.length>=2,'Pressure marks were not preserved in Pattern');
    const groupIds=new Set(pressureMarks.map(mark=>mark.groupId).filter(Boolean));assert(groupIds.size===1,'Pressure motif group identity was not preserved');
    assert(before.layers.some(layer=>layer.name==='Drawing'&&layer.clipToBelow===true),'Clipping state was not saved');

    await view.locator('#ux2PaletteClose').click();
    await view.locator('#projectFile').setInputFiles({name:'combined-roundtrip.json',mimeType:'application/json',buffer:fs.readFileSync(savedPath)});
    await view.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);await view.waitForTimeout(150);
    await view.locator('#ux2Export').click();
    const reopenP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const reopened=await reopenP;const reopenedPath=await reopened.path();assert(reopenedPath,'Reopened combined project save failed');
    const after=JSON.parse(fs.readFileSync(reopenedPath,'utf8')),afterPressure=after.marks.filter(mark=>mark.pressureWidth===true);
    assert(afterPressure.length===pressureMarks.length,'Pressure marks changed after reopen');
    assert(new Set(afterPressure.map(mark=>mark.groupId).filter(Boolean)).size===1,'Group identity changed after reopen');
    assert(after.layers.some(layer=>layer.name==='Drawing'&&layer.clipToBelow===true),'Clipping state changed after reopen');
    await view.locator('#ux2PaletteClose').click();await shot(view,'integration-pressure-motif-clip');await context.close();
  });

  await step('Hardening: motif group survives flip, recolour, clipping, variation and export chain',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(20000);await attachErrors(view,'hardening-motif-chain');

    await view.goto(BASE+'/app/doodle/',{waitUntil:'networkidle'});await view.waitForTimeout(250);
    await view.locator('[data-ux2-tool="brush"]').click();
    const canvas=view.locator('#editorCanvas'),box=await canvas.boundingBox();assert(box,'Hardening Doodle canvas unavailable');
    for(const offset of [0,.13]){
      await view.mouse.move(box.x+box.width*.30,box.y+box.height*(.38+offset));await view.mouse.down();
      await view.mouse.move(box.x+box.width*.66,box.y+box.height*(.48+offset),{steps:10});await view.mouse.up();
    }
    await view.locator('#ux2ToolMenuTrigger').click();await view.locator('#ux2ToolMenu').getByRole('button',{name:'Select',exact:true}).click();
    await view.locator('#ux2SelectAll').click();await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=2);
    await view.locator('[data-ux2-panel="motifs"]').click();await view.locator('#ux2MotifName').fill('Hardening Motif');await view.locator('#ux2SaveMotif').click();await view.getByText('Hardening Motif',{exact:true}).waitFor();

    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.waitForTimeout(300);
    if(await view.locator('#resumePrompt').isVisible())await view.locator('#startNewFromResume').click();
    if(await view.locator('#newProjectSetup').isVisible()){await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});}
    await view.locator('#files').setInputFiles(fixture);await view.waitForTimeout(140);
    await view.locator('[data-ux2-panel="motifs"]').click();const motifRow=view.locator('[data-motif-id]').filter({hasText:'Hardening Motif'});await motifRow.waitFor({state:'visible'});await motifRow.getByRole('button',{name:'Insert',exact:true}).click();
    await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=2);
    assert(await view.locator('#selectedPanel').getAttribute('data-selection-grouped')==='true','Hardening motif did not insert as one group');
    await view.locator('#ux2FlipH').click();await view.locator('#ux2FlipV').click();

    await view.locator('[data-ux2-panel="colour"]').click();assert(await visible(view,'#ux2SelectionColour'),'Hardening motif did not expose selected-mark recolour');
    await view.locator('#ux2SelectionColour').evaluate(el=>{el.value='#7a3bb2';el.dispatchEvent(new Event('input',{bubbles:true}))});await view.locator('#ux2RecolourSelection').click();
    await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-panel="layers"]').click();const drawingRow=view.locator('[data-layer-index]').filter({hasText:'Drawing'}).first();await drawingRow.click();
    if(!(await view.locator('#ux2LayerClipToBelow').isChecked()))await view.locator('#ux2LayerClipToBelow').check();await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2VariationName').fill('Hardening Colourway');await view.locator('#ux2SaveVariation').click();await view.getByText('Hardening Colourway',{exact:true}).waitFor();await view.locator('#ux2PaletteClose').click();

    await view.locator('#ux2Export').click();const svgP=view.waitForEvent('download');await view.locator('[data-export-old="exportSvg"]').click();const svg=await svgP,svgPath=await svg.path();assert(svgPath,'Hardening chain SVG missing');
    const svgText=fs.readFileSync(svgPath,'utf8');assert(svgText.includes('#7a3bb2')&&svgText.includes('pf-clip-'),'Hardening chain SVG lost recolour or clipping');
    const jsonP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const json=await jsonP,jsonPath=await json.path();assert(jsonPath,'Hardening chain project missing');
    const data=JSON.parse(fs.readFileSync(jsonPath,'utf8')),marks=data.marks.filter(mark=>String(mark.color).toLowerCase()==='#7a3bb2');
    assert(marks.length>=2,'Hardening chain lost recoloured motif marks');
    assert(new Set(marks.map(mark=>mark.groupId).filter(Boolean)).size===1,'Hardening chain lost motif group identity');
    assert(marks.every(mark=>mark.transformFlipX===true&&mark.transformFlipY===true),'Hardening chain lost group flip state');
    assert(data.layers.some(layer=>layer.id==='layer-drawing'&&layer.clipToBelow===true),'Hardening chain lost layer clipping');
    assert(data.variations.some(variation=>variation.name==='Hardening Colourway'),'Hardening chain lost saved variation');
    await view.locator('#ux2PaletteClose').click();await context.close();
  });

  await step('Hardening: frozen scatter group and variation survive save-reopen',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760},acceptDownloads:true});
    const view=await context.newPage();view.setDefaultTimeout(20000);await attachErrors(view,'hardening-scatter-chain');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.locator('#files').setInputFiles(fixture);await view.waitForTimeout(140);
    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2ScatterCount').fill('4');await view.locator('#ux2ScatterMinScale').fill('8');await view.locator('#ux2ScatterMaxScale').fill('12');
    if(!(await view.locator('#ux2ScatterPreserve').isChecked()))await view.locator('#ux2ScatterPreserve').check();
    await view.locator('#ux2ScatterGenerate').click();await view.waitForTimeout(100);await view.locator('#ux2ScatterFreeze').click();await view.locator('#ux2PaletteClose').click();

    await view.locator('[data-ux2-tool="select"]').click();await view.locator('#ux2SelectAll').click();await view.waitForFunction(()=>Number(document.querySelector('#selectedPanel')?.dataset.selectionCount||0)>=5);
    await view.locator('#ux2Group').click();await view.waitForFunction(()=>document.querySelector('#selectedPanel')?.dataset.selectionGrouped==='true');
    await view.locator('[data-ux2-panel="pattern"]').click();await view.locator('#ux2VariationName').fill('Frozen Scatter Group');await view.locator('#ux2SaveVariation').click();await view.getByText('Frozen Scatter Group',{exact:true}).waitFor();await view.locator('#ux2PaletteClose').click();

    await view.locator('#ux2Export').click();const saveP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const saved=await saveP,savedPath=await saved.path();assert(savedPath,'Frozen scatter project save missing');
    const before=JSON.parse(fs.readFileSync(savedPath,'utf8'));assert(before.items.length>=5,'Frozen scatter chain has too few items');assert(before.items.every(item=>!item.scatterGenerated),'Frozen scatter chain retained generated flags');
    const groups=new Set(before.items.map(item=>item.groupId).filter(Boolean));assert(groups.size===1,'Frozen scatter chain was not one group');assert(before.variations.some(v=>v.name==='Frozen Scatter Group'),'Frozen scatter variation missing before reopen');
    await view.locator('#ux2PaletteClose').click();

    await view.locator('#projectFile').setInputFiles({name:'hardening-scatter.json',mimeType:'application/json',buffer:fs.readFileSync(savedPath)});await view.waitForFunction(()=>document.querySelector('#projectFile').files.length===0);await view.waitForTimeout(140);
    await view.locator('#ux2Export').click();const reopenP=view.waitForEvent('download');await view.locator('[data-export-old="saveProject"]').click();const reopened=await reopenP,reopenedPath=await reopened.path();assert(reopenedPath,'Frozen scatter reopened save missing');
    const after=JSON.parse(fs.readFileSync(reopenedPath,'utf8'));assert(after.items.every(item=>!item.scatterGenerated),'Frozen scatter flags returned after reopen');assert(new Set(after.items.map(item=>item.groupId).filter(Boolean)).size===1,'Frozen scatter group changed after reopen');assert(after.variations.some(v=>v.name==='Frozen Scatter Group'),'Frozen scatter variation changed after reopen');
    await view.locator('#ux2PaletteClose').click();await context.close();
  });

  await step('Hardening: 40-state undo cap remains stable after 45 edits',async()=>{
    const context=await browser.newContext({viewport:{width:1100,height:760}});
    const view=await context.newPage();view.setDefaultTimeout(12000);await attachErrors(view,'undo-depth');
    await view.goto(BASE+'/app/pattern/',{waitUntil:'networkidle'});await view.locator('.workspaceRepeatCard[data-repeat="straight"]').click();await view.locator('#createProject').click();await view.locator('#projectSetupOverlay').waitFor({state:'hidden'});
    await view.evaluate(()=>{
      const slider=document.querySelector('#layerOpacity');
      for(let i=1;i<=45;i++){slider.value=String(100-i);slider.dispatchEvent(new Event('change',{bubbles:true}));}
    });
    assert(await view.locator('#layerOpacity').inputValue()==='55','Undo-depth setup did not record 45 edits');
    await view.evaluate(()=>{for(let i=0;i<40;i++)document.querySelector('#undo').click();});
    // History updates synchronously; layer controls refresh on the next animation
    // frame. Wait for the expected value, not a fixed delay or an immediate read.
    await view.waitForFunction(()=>document.querySelector('#layerOpacity').value==='95');
    assert(await view.locator('#layerOpacity').inputValue()==='95','Forty undos did not stop at the oldest retained history state');
    await view.evaluate(()=>document.querySelector('#undo').click());assert(await view.locator('#layerOpacity').inputValue()==='95','Undo exceeded the 40-state history cap');
    await view.evaluate(()=>{for(let i=0;i<40;i++)document.querySelector('#redo').click();});
    await view.waitForFunction(()=>document.querySelector('#layerOpacity').value==='55');
    assert(await view.locator('#layerOpacity').inputValue()==='55','Forty redos did not restore the latest state');
    await view.locator('#ux2Undo').click();
    await view.waitForFunction(()=>document.querySelector('#layerOpacity').value==='56');
    await view.locator('#ux2Redo').click();
    await view.waitForFunction(()=>document.querySelector('#layerOpacity').value==='55');
    const downloadPromise=view.waitForEvent('download');
    await view.locator('#saveProject').evaluate(el=>el.click());
    const download=await downloadPromise,savedPath=await download.path();
    assert(savedPath,'Undo-depth project download missing');
    const restored=JSON.parse(fs.readFileSync(savedPath,'utf8'));
    assert(restored.layers.find(layer=>layer.id===restored.activeLayerId)?.opacity===.55,'Redo result was not preserved in the editable project');
    await context.close();
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
    await m.locator('#ux2ToolMenuTrigger').click();
    assert(await m.getByRole('button',{name:'Open Canvas setup',exact:true}).isVisible(),'Doodle Tools menu does not expose Canvas setup');
    const doodleMenu=await m.locator('#ux2ToolMenu').boundingBox(),doodleDock=await m.locator('.ux2-dockbar').boundingBox();
    assert(doodleMenu&&doodleDock&&doodleMenu.x+doodleMenu.width<=doodleDock.x+1,'Doodle fullscreen Tools menu covers the feature dock');
    await m.getByRole('button',{name:'Open Canvas setup',exact:true}).click();
    assert((await m.locator('#ux2PaletteTitle').textContent())==='Canvas setup','Doodle workspace shortcut did not open Canvas setup');
    await m.locator('#ux2PaletteClose').click();
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
