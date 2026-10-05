(() => {
  if(new URLSearchParams(location.search).get('legacy')==='1') return;
  const $ = id => document.getElementById(id);
  const oldLayout = document.querySelector('.layout');
  const stage = $('stageWrap');
  if (!oldLayout || !stage || $('ux2Editor')) return;

  const icon = name => `<svg aria-hidden="true"><use href="/app/assets/icons-v2.svg#i-${name}"/></svg>`;
  const shell = document.createElement('section');
  shell.id = 'ux2Editor';
  shell.className = 'ux2-editor';
  shell.innerHTML = `
    <header class="ux2-topbar">
      <div class="ux2-top-left">
        <button class="ux2-icon-btn ux2-gallery" id="ux2Gallery" title="Project home">${icon('gallery')}<b>Projects</b></button>
        <div class="ux2-project"><strong class="ux2-title" id="ux2Title">Pattern Forge</strong><span class="ux2-mode" id="ux2Mode">Pattern</span></div>
        <button class="ux2-btn ux2-tool-menu-trigger" id="ux2ToolMenuTrigger" aria-expanded="false">Tools</button>
      </div>
      <div class="ux2-top-actions">
        <span class="ux2-status" id="ux2Status"></span>
        <button class="ux2-icon-btn" id="ux2Undo" title="Undo" aria-label="Undo">${icon('undo')}</button>
        <button class="ux2-icon-btn" id="ux2Redo" title="Redo" aria-label="Redo">${icon('redo')}</button>
        <button class="ux2-icon-btn" id="ux2Fullscreen" title="Full screen" aria-label="Enter full screen">${icon('fullscreen')}</button>
        <button class="ux2-btn" id="ux2Preview">Preview</button>
        <button class="ux2-btn primary" id="ux2Export">Export</button>
      </div>
    </header>
    <div class="ux2-work">
      <nav class="ux2-tools" aria-label="Creative tools">
        <button class="ux2-tool active" data-ux2-tool="select" aria-label="Select">${icon('select')}<b>Select</b></button>
        <button class="ux2-tool" data-ux2-tool="brush" aria-label="Brush">${icon('brush')}<b>Brush</b></button>
        <button class="ux2-tool" data-ux2-tool="eraser" aria-label="Erase">${icon('eraser')}<b>Erase</b></button>
        <button class="ux2-tool" data-ux2-tool="freefill" aria-label="Fill">${icon('fill')}<b>Fill</b></button>
        <button class="ux2-tool" data-ux2-tool="pan" aria-label="Pan">${icon('pan')}<b>Pan</b></button>
        <button class="ux2-tool" data-ux2-action="image" aria-label="Image">${icon('image')}<b>Image</b></button>
        <button class="ux2-tool" data-ux2-tool="rect" aria-label="Shape">${icon('shape')}<b>Shape</b></button>
      </nav>
      <main class="ux2-canvas-area">
        <div class="ux2-canvas-head"><span id="ux2Hint">Select artwork to move, scale or rotate</span><div class="ux2-quick-palette" id="ux2QuickPalette" role="group" aria-label="Current palette colours"></div><span class="spacer"></span><div class="ux2-zoom-controls" role="group" aria-label="Canvas zoom"><button class="ux2-zoom-step" id="ux2ZoomOut" aria-label="Zoom out">−</button><output id="ux2ZoomLabel" aria-live="polite">100%</output><button class="ux2-zoom-step" id="ux2ZoomIn" aria-label="Zoom in">+</button><button class="ux2-btn" id="ux2Fit">Fit</button></div></div>
        <div class="ux2-canvas-slot" id="ux2CanvasSlot"></div>
      </main>
      <nav class="ux2-dockbar" aria-label="Quick palettes">
        <button class="ux2-dock" data-ux2-panel="colour" aria-label="Colour">${icon('colour')}<b>Colour</b></button>
        <button class="ux2-dock" data-ux2-panel="layers" aria-label="Layers">${icon('layers')}<b>Layers</b></button>
        <button class="ux2-dock" data-ux2-panel="motifs" aria-label="My Motifs">${icon('image')}<b>Motifs</b></button>
        <button class="ux2-dock" data-ux2-panel="pattern" aria-label="Design setup">${icon('repeat')}<b>Design setup</b></button>
      </nav>
      <aside class="ux2-palette" id="ux2Palette" hidden><div class="ux2-palette-head"><span id="ux2PaletteTitle">Panel</span><button class="ux2-palette-close" id="ux2PaletteClose" aria-label="Close">×</button></div><div class="ux2-palette-body" id="ux2PaletteBody"></div></aside>
    </div>
    <section class="ux2-tool-menu" id="ux2ToolMenu" hidden aria-label="Tools and quick tools"></section>
    <footer class="ux2-context" id="ux2Context"></footer>`;

  oldLayout.before(shell);
  $('ux2CanvasSlot').appendChild(stage);
  document.body.classList.add('ux2-active');
  if(document.body.classList.contains('doodle-project')){
    const quickPalette=$('ux2QuickPalette'),toolRail=shell.querySelector('.ux2-tools');
    if(quickPalette&&toolRail)toolRail.appendChild(quickPalette);
  }

  const hiddenTool = tool => oldLayout.querySelector(`[data-tool="${tool}"]`);
  const favouriteTools=[{id:'select',label:'Select',icon:'select'},{id:'brush',label:'Brush',icon:'brush'},{id:'eraser',label:'Erase',icon:'eraser'},{id:'freefill',label:'Fill',icon:'fill'},{id:'pan',label:'Pan',icon:'pan'},{id:'image',label:'Image',icon:'image'},{id:'rect',label:'Shape',icon:'shape'}];
  const favouriteStorageKey='patternForgeUx2FavouriteTools';
  const isDoodle=document.body.classList.contains('doodle-project');
  let favouriteIds=[];
  try{
    const saved=localStorage.getItem(favouriteStorageKey),stored=JSON.parse(saved||'[]');
    if(Array.isArray(stored))favouriteIds=stored.filter(id=>favouriteTools.some(tool=>tool.id===id));
    // Start each workspace with a useful rail, then let the one saved choice
    // drive quick tools consistently across Pattern and Doodle.
    if(saved===null){
      favouriteIds=isDoodle?['brush','eraser','pan']:favouriteTools.map(tool=>tool.id);
      localStorage.setItem(favouriteStorageKey,JSON.stringify(favouriteIds));
    }
  }catch(_){}
  function renderFavouriteShortcuts(){
    if(isDoodle)return;
    const context=$('ux2Context');if(!context)return;
    context.querySelector('.ux2-favourite-tools')?.remove();
    const selected=favouriteTools.filter(tool=>favouriteIds.includes(tool.id));if(!selected.length)return;
    const group=document.createElement('div');group.className='ux2-favourite-tools';group.setAttribute('role','group');group.setAttribute('aria-label','Favourite tools');
    const label=document.createElement('span');label.className='ux2-favourite-label';label.textContent='Favourites';group.append(label);
    selected.forEach(tool=>{const button=document.createElement('button');button.type='button';button.className='ux2-favourite-shortcut';button.title=tool.label;button.setAttribute('aria-label',`Switch to ${tool.label}`);button.innerHTML=`${icon(tool.icon)}<span>${tool.label}</span>`;button.addEventListener('click',()=>{const target=tool.id==='image'?document.querySelector('[data-ux2-action="image"]'):document.querySelector(`[data-ux2-tool="${tool.id}"]`);target?.click()});group.append(button)});
    context.prepend(group);
  }
  function saveFavouriteTools(){try{localStorage.setItem(favouriteStorageKey,JSON.stringify(favouriteIds))}catch(_){}}
  function renderFavouriteRail(){
    document.querySelectorAll('.ux2-tool-item').forEach(item=>{item.hidden=!favouriteIds.includes(item.dataset.toolId)});
  }
  function selectToolFromMenu(id){
    const target=id==='image'?document.querySelector('[data-ux2-action="image"]'):document.querySelector(`[data-ux2-tool="${id}"]`);
    target?.click();
    $('ux2ToolMenu').hidden=true;$('ux2ToolMenuTrigger').setAttribute('aria-expanded','false');
  }
  function renderToolMenu(){
    const menu=$('ux2ToolMenu');if(!menu)return;
    menu.innerHTML='<div class="ux2-tool-menu-head"><strong>Tools</strong><span>Choose quick tools</span></div>';
    const grid=document.createElement('div');grid.className='ux2-tool-menu-grid';
    favouriteTools.forEach(tool=>{
      const row=document.createElement('div');row.className='ux2-tool-menu-row';
      const use=document.createElement('button');use.type='button';use.className='ux2-tool-menu-use';use.innerHTML=`${icon(tool.icon)}<span>${tool.label}</span>`;use.addEventListener('click',()=>selectToolFromMenu(tool.id));
      const favourite=document.createElement('label');favourite.className='ux2-tool-menu-favourite';
      const check=document.createElement('input');check.type='checkbox';check.checked=favouriteIds.includes(tool.id);check.setAttribute('aria-label',`Show ${tool.label} in quick tools`);
      check.addEventListener('change',()=>{favouriteIds=check.checked?[...new Set([...favouriteIds,tool.id])]:favouriteIds.filter(savedId=>savedId!==tool.id);saveFavouriteTools();renderFavouriteRail();renderToolMenu()});
      favourite.append(check,document.createTextNode(' Quick'));
      row.append(use,favourite);grid.append(row);
    });
    menu.append(grid);
  }
  function initFavouriteControls(){
    document.querySelectorAll('.ux2-tools>.ux2-tool').forEach(toolButton=>{
      const id=toolButton.dataset.ux2Tool||(toolButton.hasAttribute('data-ux2-action')?'image':'');
      const tool=favouriteTools.find(item=>item.id===id);if(!tool)return;
      const item=document.createElement('div');item.className='ux2-tool-item';item.dataset.toolId=id;toolButton.before(item);item.append(toolButton);
    });
    renderFavouriteRail();
  }
  initFavouriteControls();
  $('ux2ToolMenuTrigger').addEventListener('click',()=>{const menu=$('ux2ToolMenu'),open=menu.hidden;menu.hidden=!open;$('ux2ToolMenuTrigger').setAttribute('aria-expanded',String(open));if(open)renderToolMenu()});
  renderToolMenu();
  const dispatchValue = (id, value, event='input') => {
    const el=$(id); if(!el) return; el.value=value; el.dispatchEvent(new Event(event,{bubbles:true}));
  };
  const dispatchChecked = (id, value) => {
    const el=$(id); if(!el) return; el.checked=!!value; el.dispatchEvent(new Event('change',{bubbles:true}));
  };
  const dispatchSetting = (id,value) => {
    const el=$(id);if(!el)return;
    if(el.type==='checkbox'){el.checked=!!value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
    else{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  };
  const clickOld = id => { const el=$(id); if(el) el.click(); };
  const currentTool = () => [...oldLayout.querySelectorAll('[data-tool]')].find(b=>b.classList.contains('active'))?.dataset.tool || 'select';

  const hints={select:'Select artwork to move, scale or rotate',brush:'Draw on the active layer',eraser:'Erase from the active layer',freefill:'Trace a closed area to fill',gradient:'Trace a closed area for gradient fill',pan:'Move around the canvas',line:'Draw a straight line',rect:'Draw a rectangle',ellipse:'Draw an ellipse'};
  function renderContext(tool=currentTool()){
    const context=$('ux2Context');
    context.classList.remove('ux2-context--empty-selection');
    $('ux2Hint').textContent=hints[tool]||'Create on the canvas';
    if(tool==='brush'||tool==='eraser'){
      const size=$('brushSize')?.value||20, opacity=$('inkOpacity')?.value||100, style=$('brushStyle')?.value||'ink',stabilisation=$('strokeStabilisation')?.value||'off';
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">${tool==='eraser'?'Eraser':'Brush'}</span><select id="ux2BrushStyle"><option value="ink">Ink</option><option value="pencil">Pencil</option><option value="marker">Marker</option><option value="texture">Textured paint</option><option value="stamp">Stamp</option></select>${tool==='brush'?'<button class="ux2-chip" id="ux2BrushLibrary">Brush library</button>':''}</div><div class="ux2-context-group"><label class="ux2-slider">Size <input id="ux2Size" type="range" min="2" max="400" value="${size}"><b id="ux2SizeOut">${size}</b></label><label class="ux2-slider">Opacity <input id="ux2Opacity" type="range" min="5" max="100" value="${opacity}"><b id="ux2OpacityOut">${opacity}%</b></label>${tool==='brush'?'<label style="display:flex;align-items:center;gap:4px;font-size:9px;font-weight:750">Stabilise <select id="ux2Stabilisation"><option value="off">Off</option><option value="light">Light</option><option value="medium">Medium</option><option value="strong">Strong</option></select></label>':''}</div>`;
      $('ux2BrushStyle').value=style;
      $('ux2BrushStyle').addEventListener('change',e=>dispatchValue('brushStyle',e.target.value,'change'));
      if($('ux2Stabilisation')){$('ux2Stabilisation').value=stabilisation;$('ux2Stabilisation').addEventListener('change',e=>dispatchValue('strokeStabilisation',e.target.value,'change'))}
      $('ux2Size').addEventListener('input',e=>{dispatchValue('brushSize',e.target.value);$('ux2SizeOut').textContent=e.target.value});
      $('ux2Opacity').addEventListener('input',e=>{dispatchValue('inkOpacity',e.target.value);$('ux2OpacityOut').textContent=e.target.value+'%'});
      if($('ux2BrushLibrary'))$('ux2BrushLibrary').addEventListener('click',()=>openPanel('brushes'));
    } else if(['line','rect','ellipse'].includes(tool)){
      const size=$('brushSize')?.value||20,filled=$('shapeFill')?.checked;
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Shape</span><button class="ux2-chip ${tool==='line'?'active':''}" id="ux2Line">Line</button><button class="ux2-chip ${tool==='rect'?'active':''}" id="ux2Rect">Rectangle</button><button class="ux2-chip ${tool==='ellipse'?'active':''}" id="ux2Ellipse">Ellipse</button></div><div class="ux2-context-group"><label class="ux2-slider">Width <input id="ux2ShapeWidth" type="range" min="2" max="400" value="${size}"><b>${size}</b></label>${tool==='line'?'':`<label style="display:flex;align-items:center;gap:6px;font-size:11px"><input id="ux2ShapeFill" type="checkbox" ${filled?'checked':''}> Fill shape</label>`}<button class="ux2-chip" id="ux2ShapeColour">Colour</button></div>`;
      $('ux2Line').addEventListener('click',()=>setTool('line'));$('ux2Rect').addEventListener('click',()=>setTool('rect'));$('ux2Ellipse').addEventListener('click',()=>setTool('ellipse'));
      $('ux2ShapeWidth').addEventListener('input',e=>{dispatchValue('brushSize',e.target.value);renderContext(tool)});
      if($('ux2ShapeFill'))$('ux2ShapeFill').addEventListener('change',e=>dispatchChecked('shapeFill',e.target.checked));$('ux2ShapeColour').addEventListener('click',()=>openPanel('colour'));
    } else if(tool==='freefill'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Fill</span><button class="ux2-chip active">Freehand area</button><button class="ux2-chip" id="ux2GradientFill">Gradient fill</button></div><div class="ux2-context-group"><button class="ux2-chip" id="ux2ColourShortcut">Choose colour</button></div>`;
      $('ux2GradientFill').addEventListener('click',()=>setTool('gradient'));
      $('ux2ColourShortcut').addEventListener('click',()=>openPanel('colour'));
    } else if(tool==='pan'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Canvas</span><span style="font-size:11px;color:#6d7885">Use the zoom controls above, pinch, or mouse wheel to change the view.</span></div>`;
    } else {
      const scale=$('selScale'),rot=$('selRot'),opacity=$('selOpacity'),panel=$('selectedPanel'),selectionCount=Number(panel?.dataset.selectionCount||0),grouped=panel?.dataset.selectionGrouped==='true',addMode=panel?.dataset.selectionAddMode==='true',hasSelection=selectionCount>0;
      context.classList.toggle('ux2-context--empty-selection',tool==='select'&&!hasSelection);
      const selectionControls=`<div class="ux2-context-group"><span class="ux2-label">Selection</span><button class="ux2-chip ${addMode?'active':''}" id="ux2AddSelection">Add</button><button class="ux2-chip" id="ux2SelectAll">All</button>${hasSelection?'<button class="ux2-chip" id="ux2ClearSelection">Clear</button>':''}</div>`;
      if(selectionCount>1){
        context.innerHTML=selectionControls+`<div class="ux2-context-group"><strong style="font-size:11px">${selectionCount} selected</strong><label class="ux2-slider">Scale <input id="ux2GroupScale" type="range" min="25" max="400" value="100"><b id="ux2GroupScaleOut">100%</b></label><label class="ux2-slider">Rotate <input id="ux2GroupRotate" type="range" min="-180" max="180" value="0"><b id="ux2GroupRotateOut">0°</b></label><button class="ux2-chip" id="${grouped?'ux2Ungroup':'ux2Group'}">${grouped?'Ungroup':'Group'}</button><button class="ux2-chip" id="ux2FlipH">Flip H</button><button class="ux2-chip" id="ux2FlipV">Flip V</button><button class="ux2-chip" id="ux2Duplicate">Duplicate</button><button class="ux2-chip" id="ux2Delete">Delete</button><button class="ux2-chip" id="ux2Snap">Snap</button></div>`;
      }else if(hasSelection){
        context.innerHTML=selectionControls+`<div class="ux2-context-group"><span class="ux2-label">Transform</span>${scale?`<label class="ux2-slider">Scale <input id="ux2SelScale" type="range" min="${scale.min||1}" max="${scale.max||600}" value="${scale.value}"><b>${scale.value}%</b></label>`:''}${rot?`<label class="ux2-slider">Rotate <input id="ux2SelRot" type="range" min="-180" max="180" value="${rot.value}"><b>${rot.value}°</b></label>`:''}${opacity?`<label class="ux2-slider">Opacity <input id="ux2SelOpacity" type="range" min="5" max="100" value="${opacity.value}"><b>${opacity.value}%</b></label>`:''}</div><div class="ux2-context-group"><button class="ux2-chip" id="ux2FlipH">Flip H</button><button class="ux2-chip" id="ux2FlipV">Flip V</button><button class="ux2-chip" id="ux2Duplicate">Duplicate</button><button class="ux2-chip" id="ux2Delete">Delete</button><button class="ux2-chip" id="ux2Front">Bring front</button><button class="ux2-chip" id="ux2Back">Send back</button><button class="ux2-chip" id="ux2Snap">Snap</button></div>`;
      }else{
        context.innerHTML=selectionControls+`<div class="ux2-context-group"><span style="font-size:11px;color:#6d7885">Tap artwork to select it. Use Add to build a multi-selection.</span><button class="ux2-chip" id="ux2Snap">Snap</button></div>`;
      }
      const selectionApi=window.PatternForgeSelection;
      if($('ux2AddSelection'))$('ux2AddSelection').addEventListener('click',e=>{const active=selectionApi?.toggleAddMode();e.currentTarget.classList.toggle('active',!!active)});
      if($('ux2SelectAll'))$('ux2SelectAll').addEventListener('click',()=>selectionApi?.selectAll());
      if($('ux2ClearSelection'))$('ux2ClearSelection').addEventListener('click',()=>selectionApi?.clear());
      if($('ux2Group'))$('ux2Group').addEventListener('click',()=>selectionApi?.group());
      if($('ux2Ungroup'))$('ux2Ungroup').addEventListener('click',()=>selectionApi?.ungroup());
      if($('ux2FlipH'))$('ux2FlipH').addEventListener('click',()=>selectionApi?.flipHorizontal());
      if($('ux2FlipV'))$('ux2FlipV').addEventListener('click',()=>selectionApi?.flipVertical());
      if($('ux2GroupScale')){
        let last=100,started=false;const begin=()=>{if(!started){selectionApi?.beginTransform();started=true}};
        $('ux2GroupScale').addEventListener('pointerdown',begin);
        $('ux2GroupScale').addEventListener('input',e=>{begin();const next=Number(e.target.value)||100;selectionApi?.scaleBy(next/last);last=next;$('ux2GroupScaleOut').textContent=next+'%'});
      }
      if($('ux2GroupRotate')){
        let last=0,started=false;const begin=()=>{if(!started){selectionApi?.beginTransform();started=true}};
        $('ux2GroupRotate').addEventListener('pointerdown',begin);
        $('ux2GroupRotate').addEventListener('input',e=>{begin();const next=Number(e.target.value)||0;selectionApi?.rotateByDegrees(next-last);last=next;$('ux2GroupRotateOut').textContent=next+'°'});
      }
      if($('ux2SelScale'))$('ux2SelScale').addEventListener('input',e=>{const target=$('selScale');if(target){target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}))}renderContext('select')});
      if($('ux2SelRot'))$('ux2SelRot').addEventListener('input',e=>{const target=$('selRot');if(target){target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}))}renderContext('select')});
      if($('ux2SelOpacity'))$('ux2SelOpacity').addEventListener('input',e=>{const target=$('selOpacity');if(target){target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}))}renderContext('select')});
      if($('ux2Duplicate'))$('ux2Duplicate').addEventListener('click',()=>clickOld('duplicateSel'));
      if($('ux2Delete'))$('ux2Delete').addEventListener('click',()=>clickOld('deleteSel'));
      if($('ux2Front'))$('ux2Front').addEventListener('click',()=>clickOld('frontSel'));
      if($('ux2Back'))$('ux2Back').addEventListener('click',()=>clickOld('backSel'));
      if($('ux2Snap'))$('ux2Snap').addEventListener('click',()=>{const el=$('snapOn');if(el){el.checked=!el.checked;el.dispatchEvent(new Event('change',{bubbles:true}))}});
    }
  }

  function setTool(tool){
    const old=hiddenTool(tool); if(old) old.click();
    const railTool=['line','rect','ellipse'].includes(tool)?'rect':tool;
    document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Tool===railTool));
    renderContext(tool);
  }

  function brushPanel(){
    const current=$('brushStyle')?.value||'ink';
    const styles=[['ink','Ink','Clean, solid line'],['pencil','Pencil','Lighter textured edge'],['marker','Marker','Broader translucent stroke'],['texture','Textured paint','Broken paint texture'],['stamp','Stamp','Repeated shape marks']];
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Brush library</div><div class="ux2-brush-list">${styles.map(([value,name,desc])=>`<button class="ux2-brush-card ${current===value?'active':''}" data-brush-style="${value}"><span class="ux2-brush-sample ${value}"></span><span><strong>${name}</strong><small>${desc}</small></span></button>`).join('')}</div></div>${current==='stamp'?`<div class="ux2-panel-block"><div class="ux2-panel-label">Stamp shape</div><div class="ux2-segment"><button data-stamp="leaf">Leaf</button><button data-stamp="star">Star</button><button data-stamp="dot">Dot</button></div></div>`:''}`;
  }

  function colourPanel(){
    const colour=$('ink')?.value||'#6f89a8';
    const palettes=$('savedPaletteSelect')?[...$('savedPaletteSelect').options].map(o=>`<option value="${o.value}">${o.textContent}</option>`).join(''):'';
    const selectedPanel=$('selectedPanel'),recolourable=Number(selectedPanel?.dataset.recolourableCount||0),selectedColour=selectedPanel?.dataset.selectionColour||colour;
    const selectionBlock=recolourable>0?`<div class="ux2-panel-block"><div class="ux2-panel-label">Selected artwork</div><p class="ux2-info">${recolourable} editable mark${recolourable===1?'':'s'} selected. Imported PNG/JPG/SVG images are not recoloured by this control.</p><label class="ux2-field-label">New colour<input id="ux2SelectionColour" type="color" value="${selectedColour}"></label><button class="ux2-btn primary" id="ux2RecolourSelection" style="width:100%;margin-bottom:8px">Recolour selected marks</button><label class="ux2-field-label">Replace tolerance <span id="ux2ColourToleranceLabel">0%</span><input id="ux2ColourTolerance" type="range" min="0" max="100" value="0"></label><button class="ux2-btn" id="ux2ReplaceMatchingColour" style="width:100%">Replace matching ${selectedColour} across project</button></div>`:'';
    return selectionBlock+`<div class="ux2-panel-block"><div class="ux2-panel-label">Current colour</div><input id="ux2ColourInput" type="color" value="${colour}" style="width:100%;height:58px;border:1px solid #c7d0da;border-radius:12px;padding:4px;background:#fff"></div><div class="ux2-panel-block"><div class="ux2-panel-label">Current palette</div><div id="ux2PaletteSwatches" class="ux2-swatches"></div><button class="ux2-btn" id="ux2AddPaletteColour" style="width:100%;margin-top:9px">Add current colour</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Saved palettes</div><select id="ux2SavedPalette" style="width:100%;margin-bottom:8px">${palettes}</select><button class="ux2-btn" id="ux2SavePalette" style="width:100%">Save current palette</button></div><div class="ux2-panel-block"><button class="ux2-btn" id="ux2Eyedropper" style="width:100%">Pick colour from canvas</button></div>`;
  }
  function populateSwatches(){
    const target=$('ux2PaletteSwatches'); if(!target)return; target.innerHTML='';
    const syncCurrentColour=colour=>{const input=$('ux2ColourInput');if(input)input.value=colour};
    const old=[...document.querySelectorAll('#paletteSwatches button')];
    old.slice(0,10).forEach((button,i)=>{const sw=document.createElement('button');sw.className='ux2-swatch';sw.title=`Palette colour ${i+1}`;sw.style.background=getComputedStyle(button).backgroundColor||button.style.background||'#fff';sw.addEventListener('click',()=>{button.click();syncCurrentColour(button.dataset.color||'#fff')});target.appendChild(sw)});
    if(!old.length){['#17202b','#526d8f','#6f89a8','#c5ccd5','#ffffff'].forEach(c=>{const sw=document.createElement('button');sw.className='ux2-swatch';sw.style.background=c;sw.addEventListener('click',()=>{dispatchValue('ink',c);syncCurrentColour(c)});target.appendChild(sw)})}
  }
  function motifPanel(){
    return '<div class="ux2-panel-block"><div class="ux2-panel-label">Save reusable motif</div><label class="ux2-field-label">Name<input id="ux2MotifName" type="text" maxlength="80" placeholder="e.g. Wildflower"></label><button class="ux2-btn primary" id="ux2SaveMotif" style="width:100%">Save current selection</button><p class="ux2-info">Select one or more editable artwork items first. Motifs stay on this device until exported as part of a project.</p></div><div class="ux2-panel-block"><div class="ux2-panel-label">My Motifs</div><div id="ux2MotifList"><p class="ux2-info">Loading motifs…</p></div></div>';
  }
  async function refreshMotifList(){
    const list=$('ux2MotifList');if(!list)return;
    const api=window.PatternForgeMotifs;if(!api){list.innerHTML='<p class="ux2-info">Motif library is unavailable.</p>';return;}
    try{
      const motifs=await api.list();
      if(!motifs.length){list.innerHTML='<p class="ux2-info">No saved motifs yet.</p>';return;}
      list.innerHTML='';
      motifs.forEach(motif=>{
        const row=document.createElement('div');row.className='ux2-layer-row';row.dataset.motifId=motif.id;
        const thumb=document.createElement('span');thumb.className='ux2-layer-thumb';
        const meta=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
        strong.textContent=motif.name||'Untitled motif';small.textContent=((motif.items?.length||0)+(motif.marks?.length||0))+' editable item'+(((motif.items?.length||0)+(motif.marks?.length||0))===1?'':'s');
        meta.append(strong,small);
        const actions=document.createElement('span');actions.className='ux2-motif-actions';
        const insert=document.createElement('button');insert.type='button';insert.className='ux2-btn';insert.textContent='Insert';insert.addEventListener('click',async()=>{insert.disabled=true;try{await api.insert(motif.id);openPanel('motifs')}catch(err){const st=$('status');if(st)st.textContent=err?.message||'Could not insert motif.'}finally{insert.disabled=false}});
        const remove=document.createElement('button');remove.type='button';remove.className='ux2-btn';remove.textContent='Delete';remove.addEventListener('click',async()=>{remove.disabled=true;try{await api.remove(motif.id);await refreshMotifList()}catch(err){const st=$('status');if(st)st.textContent=err?.message||'Could not delete motif.'}});
        actions.append(insert,remove);row.append(thumb,meta,actions);list.append(row);
      });
    }catch(err){list.innerHTML='<p class="ux2-info">Could not open My Motifs on this device.</p>';}
  }
  function wireMotifPanel(){
    const api=window.PatternForgeMotifs;
    $('ux2SaveMotif')?.addEventListener('click',async()=>{
      const button=$('ux2SaveMotif'),name=$('ux2MotifName')?.value||'';button.disabled=true;
      try{await api?.saveSelection(name);if($('ux2MotifName'))$('ux2MotifName').value='';await refreshMotifList()}
      catch(err){const st=$('status');if(st)st.textContent=err?.message||'Could not save motif.'}
      finally{button.disabled=false}
    });
    refreshMotifList();
  }
  function layerPanel(){
    const layers=[...document.querySelectorAll('#layerList .layerRow')];
    const rows=layers.map((row,i)=>`<button class="ux2-layer-row ${row.classList.contains('active')?'active':''}" data-layer-index="${i}"><span class="ux2-layer-thumb"></span><span><strong>${row.querySelector('.layerRowName')?.textContent||`Layer ${i+1}`}</strong><small>${row.querySelector('.layerRowMeta')?.textContent||'Artwork layer'}</small></span><span>›</span></button>`).join('')||'<p style="color:#687483;font-size:12px">Layers will appear here when a project is open.</p>';
    const name=String($('layerName')?.value||'');
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork layers</div>${rows}<button class="ux2-btn" id="ux2AddLayer" style="width:100%;margin-top:6px">+ Add layer</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Selected layer</div><label class="ux2-field-label">Name<input id="ux2LayerName" type="text" value="${name.replace(/"/g,'&quot;')}"></label><label class="ux2-slider">Opacity <input id="ux2LayerOpacity" type="range" min="0" max="100" value="${$('layerOpacity')?.value||100}"></label><div class="ux2-check-grid"><label><input id="ux2LayerVisible" type="checkbox" ${$('layerVisible')?.checked?'checked':''}> Visible</label><label><input id="ux2LayerLocked" type="checkbox" ${$('layerLocked')?.checked?'checked':''}> Lock</label><label><input id="ux2LayerExport" type="checkbox" ${$('layerExport')?.checked?'checked':''}> Export</label></div><div class="ux2-segment" style="margin-top:9px"><button id="ux2LayerUp">Move up</button><button id="ux2LayerDown">Move down</button></div><div class="ux2-segment" style="margin-top:7px"><button id="ux2LayerDuplicate">Duplicate</button><button id="ux2LayerDelete">Delete</button></div></div>`;
  }
  function canvasAssistControls(paletteOptions){
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Grid, guides & snapping</div><label class="ux2-field-label">Grid divisions<select id="ux2Grid"><option value="8">8 × 8</option><option value="10">10 × 10</option><option value="16">16 × 16</option><option value="20">20 × 20</option><option value="40">40 × 40</option></select></label><label class="ux2-check"><input id="ux2GridOn" type="checkbox" ${$('gridOn')?.checked?'checked':''}> Show grid</label><label class="ux2-field-label">Mirror while drawing<select id="ux2Symmetry"><option value="off">Off</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="quadrant">Quadrant · 4 copies</option><option value="radial">8-way radial</option></select></label><label class="ux2-check"><input id="ux2SymmetryGuides" type="checkbox" ${$('symmetryGuides')?.checked?'checked':''}> Show mirror guides</label><label class="ux2-field-label">Construction guide<select id="ux2Guide"><option value="off">Off</option><option value="centre">Centre cross</option><option value="diagonals">Diagonals</option><option value="diamond">Diamond</option><option value="all">All guides</option></select></label><label class="ux2-check"><input id="ux2SnapOn" type="checkbox" ${$('snapOn')?.checked?'checked':''}> Smart snapping</label></div><div class="ux2-panel-block"><div class="ux2-panel-label">Palette</div><label class="ux2-field-label">Saved palettes<select id="ux2PaletteSelect">${paletteOptions}</select></label><div id="ux2SetupSwatches" class="ux2-setup-swatches" role="group" aria-label="Current palette colours"></div><div class="ux2-palette-actions"><button class="ux2-btn" id="ux2AddPaletteColour">Add current colour</button><button class="ux2-btn" id="ux2SavePalette">Save palette</button></div></div>`;
  }
  function scatterPanel(){
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Image scatter</div><div class="ux2-segment"><label class="ux2-field-label">Copies<input id="ux2ScatterCount" type="number" min="1" max="500" value="${$('count')?.value||28}"></label><label class="ux2-field-label">Seed<input id="ux2ScatterSeed" type="text" value="${String($('seed')?.value||'pattern-01').replace(/"/g,'&quot;')}"></label></div><div class="ux2-segment"><label class="ux2-field-label">Min scale %<input id="ux2ScatterMinScale" type="number" min="1" max="1000" value="${$('minScale')?.value||18}"></label><label class="ux2-field-label">Max scale %<input id="ux2ScatterMaxScale" type="number" min="1" max="2000" value="${$('maxScale')?.value||42}"></label></div><label class="ux2-field-label">Random rotation ± <input id="ux2ScatterRotation" type="range" min="0" max="180" value="${$('rotationAmount')?.value||25}"></label><label class="ux2-field-label">Minimum spacing % of tile<input id="ux2ScatterSpacing" type="number" min="0" max="50" value="${$('scatterSpacing')?.value||0}"></label><label class="ux2-check"><input id="ux2ScatterOverlap" type="checkbox" ${$('scatterOverlap')?.checked?'checked':''}> Allow motif overlap</label><label class="ux2-check"><input id="ux2ScatterPreserve" type="checkbox" ${$('scatterPreserveManual')?.checked?'checked':''}> Preserve hand-positioned items</label><div class="ux2-segment"><button id="ux2ScatterGenerate">Generate</button><button id="ux2ScatterSeedNew">New seed</button></div><button class="ux2-btn" id="ux2ScatterFreeze" style="width:100%;margin-top:7px">Freeze scatter as editable artwork</button><p class="ux2-info">Generated copies remain distinguishable until frozen. Moving a generated copy also makes that copy manual, so regeneration can preserve it.</p></div>`;
  }
  const productScaleProfiles={
    fabric:{label:'Fabric · 1 metre square',w:100,h:100},
    wallpaper:{label:'Wallpaper · 1 × 2.4 m panel',w:100,h:240},
    cushion:{label:'Cushion · 45 × 45 cm',w:45,h:45},
    tote:{label:'Tote · 38 × 42 cm',w:38,h:42},
    notebook:{label:'A5 notebook · 14.8 × 21 cm',w:14.8,h:21},
    phone:{label:'Phone case · 7.5 × 15 cm',w:7.5,h:15}
  };
  function productScalePanel(){
    const size=$('focusPrintSize')?.value||30,unit=$('focusPrintUnit')?.value||'cm';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Product-scale preview</div><label class="ux2-field-label">Reference product<select id="ux2ProductScaleType">${Object.entries(productScaleProfiles).map(([id,p])=>`<option value="${id}">${p.label}</option>`).join('')}</select></label><div class="ux2-segment"><label class="ux2-field-label">Printed base-tile width<input id="ux2ProductTileWidth" type="number" min="1" max="300" step="any" value="${size}"></label><label class="ux2-field-label">Units<select id="ux2ProductTileUnit"><option value="cm" ${unit==='cm'?'selected':''}>cm</option><option value="in" ${unit==='in'?'selected':''}>in</option></select></label></div><div id="ux2ProductScaleStage" style="display:grid;place-items:center;min-height:170px;padding:10px;background:#e5e9ed;border-radius:12px;overflow:hidden"><div id="ux2ProductScaleObject" style="border:1px solid #aeb8c3;background:#fff center/contain repeat;box-shadow:0 5px 16px rgba(31,42,57,.14)"></div></div><p class="ux2-info" id="ux2ProductScaleReadout"></p><p class="ux2-info">Scale guide only; this is not a photorealistic product mockup.</p></div>`;
  }
  function renderProductScalePreview(){
    const stage=$('ux2ProductScaleStage'),object=$('ux2ProductScaleObject'),readout=$('ux2ProductScaleReadout'),type=$('ux2ProductScaleType')?.value||'cushion',profile=productScaleProfiles[type];
    const preview=window.PatternForgeProductPreview?.();if(!stage||!object||!readout||!profile||!preview)return;
    const raw=Number($('ux2ProductTileWidth')?.value||$('focusPrintSize')?.value||30),unit=$('ux2ProductTileUnit')?.value||$('focusPrintUnit')?.value||'cm',tileCm=unit==='in'?raw*2.54:raw;
    let width=250,height=width*profile.h/profile.w;if(height>290){height=290;width=height*profile.w/profile.h;}
    object.style.width=Math.max(55,width)+'px';object.style.height=Math.max(55,height)+'px';object.style.backgroundImage=`url("${preview.dataUrl}")`;
    const pxPerCm=width/profile.w,bgW=Math.max(1,tileCm*preview.repeatWidthUnits*pxPerCm),bgH=Math.max(1,tileCm*preview.repeatHeightUnits*pxPerCm);
    object.style.backgroundSize=bgW+'px '+bgH+'px';object.style.borderRadius=type==='phone'?'22px':type==='cushion'?'10px':'4px';
    const across=profile.w/tileCm,down=profile.h/tileCm;
    readout.textContent=`${profile.label}: a ${tileCm.toFixed(1)} cm base tile gives about ${across.toFixed(1)} base repeats across × ${down.toFixed(1)} down.`;
  }
  function wireProductScalePreview(){
    const render=()=>renderProductScalePreview();
    $('ux2ProductScaleType')?.addEventListener('change',render);
    $('ux2ProductTileWidth')?.addEventListener('input',e=>{dispatchValue('focusPrintSize',e.target.value);render()});
    $('ux2ProductTileUnit')?.addEventListener('change',e=>{dispatchValue('focusPrintUnit',e.target.value,'change');render()});
    render();
  }
  function variationPanel(){
    return '<div class="ux2-panel-block"><div class="ux2-panel-label">Variations & colourways</div><label class="ux2-field-label">Name<input id="ux2VariationName" type="text" maxlength="80" placeholder="e.g. Blue & Cream"></label><button class="ux2-btn primary" id="ux2SaveVariation" style="width:100%">Save current design state</button><p class="ux2-info">Stores current colours, background, motif transforms and scatter settings without duplicating imported image assets.</p><div id="ux2VariationList" style="margin-top:8px"></div></div>';
  }
  function refreshVariationList(){
    const list=$('ux2VariationList'),api=window.PatternForgeVariations;if(!list||!api)return;
    const variations=api.list();list.innerHTML='';
    if(!variations.length){const p=document.createElement('p');p.className='ux2-info';p.textContent='No saved variations yet.';list.appendChild(p);return;}
    variations.forEach(variation=>{
      const row=document.createElement('div');row.className='ux2-layer-row';row.dataset.variationId=variation.id;
      const thumb=document.createElement('span');thumb.className='ux2-layer-thumb';
      const meta=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=variation.name;small.textContent='Saved design state';meta.append(strong,small);
      const actions=document.createElement('span');actions.className='ux2-motif-actions';
      const apply=document.createElement('button');apply.className='ux2-btn';apply.type='button';apply.textContent='Apply';apply.addEventListener('click',()=>{api.apply(variation.id);openPanel('pattern')});
      const remove=document.createElement('button');remove.className='ux2-btn';remove.type='button';remove.textContent='Delete';remove.addEventListener('click',()=>{api.remove(variation.id);refreshVariationList()});
      actions.append(apply,remove);row.append(thumb,meta,actions);list.append(row);
    });
  }
  function wireVariationPanel(){
    $('ux2SaveVariation')?.addEventListener('click',()=>{
      const api=window.PatternForgeVariations,name=$('ux2VariationName')?.value||'',saved=api?.save(name);
      if(saved){if($('ux2VariationName'))$('ux2VariationName').value='';refreshVariationList();}
    });
    refreshVariationList();
  }
  function patternPanel(){
    const doodle=document.body.classList.contains('doodle-project');
    const badge=$('projectNameDisplay')?.textContent||'';
    const activeRepeat=badge.match(/·\s*(Straight|Half-drop|Brick)\s*$/i)?.[1]||'Straight';
    const repeat=doodle?'Doodle':activeRepeat.replace('-', ' ');
    const paletteOptions=[...($('savedPaletteSelect')?.options||[])].map(option=>`<option value="${option.value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${option.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
    if(doodle)return `<div class="ux2-panel-block"><div class="ux2-panel-label">Workspace</div><div class="ux2-repeat-card"><strong>Doodle</strong><span>Standalone transparent artwork. Canvas assists stay inside this drawing; repeat preview and seam tools are hidden.</span></div></div>${canvasAssistControls(paletteOptions)}`;
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Repeat</div><div class="ux2-repeat-card"><strong>${repeat}</strong><span>${$('pixelReadout')?.textContent||'4000 × 4000'} · 300 DPI metadata</span></div><button class="ux2-btn" id="ux2FullPreview" style="width:100%;margin-top:8px">Full repeat preview</button><button class="ux2-btn" id="ux2SeamInspect" style="width:100%;margin-top:7px">Inspect seams</button><label class="ux2-slider" style="margin-top:8px">Repeat visibility <input id="ux2Neighbour" type="range" min="15" max="100" value="${$('neighborOpacity')?.value||35}"></label><label class="ux2-check"><input id="ux2TileEdge" type="checkbox" ${$('showTileBorder')?.checked?'checked':''}> Show centre tile edge</label></div>${productScalePanel()}${scatterPanel()}${variationPanel()}${canvasAssistControls(paletteOptions)}`;
  }

  function exportPanel(){
    const quality=$('quality')?.textContent?.trim()||'Add artwork to calculate print quality.',pixels=$('pixelReadout')?.textContent||'4000 × 4000',doodle=document.body.classList.contains('doodle-project');
    const exportNote=doodle?'Transparent background is preserved for PNG and SVG. PNG carries 300 DPI metadata.':'PNG carries 300 DPI metadata.';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Export confidence</div><div class="ux2-repeat-card"><strong>${pixels}</strong><span>${exportNote}</span></div><p class="ux2-info">${quality}</p></div><div class="ux2-panel-block"><div class="ux2-panel-label">Artwork</div><button class="ux2-btn primary" data-export-old="exportPng" style="width:100%;margin-bottom:7px">Export PNG · 300 DPI</button><button class="ux2-btn" data-export-old="exportSvg" style="width:100%">Export SVG</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Editable project</div><button class="ux2-btn" data-export-old="saveProject" style="width:100%;margin-bottom:7px">Save editable project</button><button class="ux2-btn" data-export-old="openProject" style="width:100%;margin-bottom:7px">Open project file</button><button class="ux2-btn" data-export-old="exportZip" style="width:100%">Download project bundle</button><p class="ux2-info"><strong>Back up this project:</strong> Autosave stays on this device. Save a project file before clearing app or browser data.</p></div>`;
  }


  function openPanel(name){
    const p=$('ux2Palette'), body=$('ux2PaletteBody'); p.hidden=false;
    $('ux2PaletteTitle').textContent=name==='colour'?'Colour':name==='layers'?'Layers':name==='motifs'?'My Motifs':name==='pattern'?(document.body.classList.contains('doodle-project')?'Canvas setup':'Design setup'):name==='brushes'?'Brush Library':'Export';
    body.innerHTML=name==='colour'?colourPanel():name==='layers'?layerPanel():name==='motifs'?motifPanel():name==='pattern'?patternPanel():name==='brushes'?brushPanel():exportPanel();
    document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Panel===name));
    if(name==='colour'){
      $('ux2ColourInput').addEventListener('input',e=>dispatchValue('ink',e.target.value));
      $('ux2Eyedropper').addEventListener('click',()=>setTool('eyedropper'));
      $('ux2AddPaletteColour')?.addEventListener('click',()=>{clickOld('addPaletteColour');populateSwatches()});
      $('ux2SavePalette')?.addEventListener('click',()=>clickOld('savePalette'));
      if($('ux2SavedPalette')&&$('savedPaletteSelect')){$('ux2SavedPalette').value=$('savedPaletteSelect').value;$('ux2SavedPalette').addEventListener('change',e=>dispatchValue('savedPaletteSelect',e.target.value,'change'))}
      const selectionApi=window.PatternForgeSelection,selectedPanel=$('selectedPanel'),sourceColour=selectedPanel?.dataset.selectionColour||'';
      $('ux2ColourTolerance')?.addEventListener('input',e=>{if($('ux2ColourToleranceLabel'))$('ux2ColourToleranceLabel').textContent=e.target.value+'%'});
      $('ux2RecolourSelection')?.addEventListener('click',()=>{selectionApi?.recolour($('ux2SelectionColour')?.value);openPanel('colour')});
      $('ux2ReplaceMatchingColour')?.addEventListener('click',()=>{selectionApi?.replaceMatching(sourceColour,$('ux2SelectionColour')?.value,$('ux2ColourTolerance')?.value||0);openPanel('colour')});
      populateSwatches();
    }
    if(name==='motifs')wireMotifPanel();
    if(name==='brushes'){document.querySelectorAll('[data-brush-style]').forEach(b=>b.addEventListener('click',()=>{dispatchValue('brushStyle',b.dataset.brushStyle,'change');setTool('brush');openPanel('brushes')}));document.querySelectorAll('[data-stamp]').forEach(b=>b.addEventListener('click',()=>dispatchValue('stampShape',b.dataset.stamp,'change')))}
    if(name==='layers'){
      document.querySelectorAll('[data-layer-index]').forEach(b=>b.addEventListener('click',()=>{const row=document.querySelectorAll('#layerList .layerRow')[Number(b.dataset.layerIndex)];if(row)row.click();openPanel('layers')}));
      const refreshLayers=()=>requestAnimationFrame(()=>openPanel('layers'));$('ux2AddLayer').addEventListener('click',()=>{clickOld('layerAdd');refreshLayers()});$('ux2LayerDuplicate').addEventListener('click',()=>{clickOld('layerDuplicate');refreshLayers()});$('ux2LayerDelete').addEventListener('click',()=>{clickOld('layerDelete');refreshLayers()});$('ux2LayerUp').addEventListener('click',()=>{clickOld('layerUp');refreshLayers()});$('ux2LayerDown').addEventListener('click',()=>{clickOld('layerDown');refreshLayers()});$('ux2LayerOpacity').addEventListener('input',e=>dispatchValue('layerOpacity',e.target.value));const layerNameProxy=$('ux2LayerName');let layerNameEditing=false;const beginLayerNameEdit=()=>{if(layerNameEditing)return;layerNameEditing=true;$('layerName')?.dispatchEvent(new Event('focus',{bubbles:true}));};const commitLayerNameEdit=()=>{if(!layerNameEditing)return;dispatchValue('layerName',layerNameProxy.value);$('layerName')?.dispatchEvent(new Event('blur',{bubbles:true}));layerNameEditing=false;setTimeout(()=>openPanel('layers'),0)};layerNameProxy.addEventListener('focus',beginLayerNameEdit);layerNameProxy.addEventListener('input',e=>{beginLayerNameEdit();dispatchValue('layerName',e.target.value)});layerNameProxy.addEventListener('blur',commitLayerNameEdit);layerNameProxy.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();layerNameProxy.blur()}});$('ux2LayerVisible').addEventListener('change',e=>dispatchChecked('layerVisible',e.target.checked));$('ux2LayerLocked').addEventListener('change',e=>dispatchChecked('layerLocked',e.target.checked));$('ux2LayerExport').addEventListener('change',e=>dispatchChecked('layerExport',e.target.checked));
    }
    if(name==='pattern'&&!document.body.classList.contains('doodle-project')){wireVariationPanel();wireProductScalePreview();$('ux2FullPreview')?.addEventListener('click',()=>clickOld('repeatPreviewToggle'));$('ux2SeamInspect')?.addEventListener('click',()=>{dispatchValue('neighborOpacity','100');dispatchChecked('showTileBorder',true);clickOld('fit');const st=$('status');if(st)st.textContent='Seam inspection: repeat neighbours are at full visibility and the centre tile edge is marked.';openPanel('pattern')});$('ux2Neighbour')?.addEventListener('input',e=>dispatchValue('neighborOpacity',e.target.value));$('ux2TileEdge')?.addEventListener('change',e=>dispatchChecked('showTileBorder',e.target.checked));$('ux2Grid').value=String($('gridCount')?.value||16);$('ux2Grid').addEventListener('change',e=>dispatchSetting('gridCount',e.target.value));$('ux2GridOn').addEventListener('change',e=>dispatchSetting('gridOn',e.target.checked));$('ux2Symmetry').value=$('symmetry')?.value||'off';$('ux2Symmetry').addEventListener('change',e=>dispatchSetting('symmetry',e.target.value));$('ux2SymmetryGuides').addEventListener('change',e=>dispatchSetting('symmetryGuides',e.target.checked));$('ux2Guide').value=$('constructionGuide')?.value||'off';$('ux2Guide').addEventListener('change',e=>dispatchSetting('constructionGuide',e.target.value));$('ux2SnapOn').addEventListener('change',e=>dispatchChecked('snapOn',e.target.checked));$('ux2PaletteSelect').value=$('savedPaletteSelect')?.value||'default';$('ux2PaletteSelect').addEventListener('change',e=>{dispatchValue('savedPaletteSelect',e.target.value,'change');openPanel('pattern')});$('ux2SetupSwatches').replaceChildren(...[...($('paletteSwatches')?.querySelectorAll('.swatch')||[])].map(source=>{const button=document.createElement('button');button.type='button';button.className='ux2-setup-swatch';button.style.background=source.dataset.color;button.title=source.title;button.setAttribute('aria-label',source.getAttribute('aria-label')||source.title);button.addEventListener('click',()=>source.click());return button}));$('ux2AddPaletteColour').addEventListener('click',()=>{clickOld('addPaletteColour');openPanel('pattern')});$('ux2SavePalette').addEventListener('click',()=>{clickOld('savePalette');setTimeout(()=>openPanel('pattern'),0)});$('ux2ScatterCount')?.addEventListener('change',e=>dispatchValue('count',e.target.value,'change'));$('ux2ScatterSeed')?.addEventListener('change',e=>dispatchValue('seed',e.target.value,'change'));$('ux2ScatterMinScale')?.addEventListener('change',e=>dispatchValue('minScale',e.target.value,'change'));$('ux2ScatterMaxScale')?.addEventListener('change',e=>dispatchValue('maxScale',e.target.value,'change'));$('ux2ScatterRotation')?.addEventListener('input',e=>dispatchValue('rotationAmount',e.target.value));$('ux2ScatterSpacing')?.addEventListener('change',e=>dispatchValue('scatterSpacing',e.target.value,'change'));$('ux2ScatterOverlap')?.addEventListener('change',e=>dispatchChecked('scatterOverlap',e.target.checked));$('ux2ScatterPreserve')?.addEventListener('change',e=>dispatchChecked('scatterPreserveManual',e.target.checked));$('ux2ScatterGenerate')?.addEventListener('click',()=>clickOld('generate'));$('ux2ScatterSeedNew')?.addEventListener('click',()=>{clickOld('shuffle');setTimeout(()=>openPanel('pattern'),0)});$('ux2ScatterFreeze')?.addEventListener('click',()=>clickOld('freezeScatter'));}
    if(name==='pattern'&&document.body.classList.contains('doodle-project')){$('ux2Grid').value=String($('gridCount')?.value||16);$('ux2Grid').addEventListener('change',e=>dispatchSetting('gridCount',e.target.value));$('ux2GridOn').addEventListener('change',e=>dispatchSetting('gridOn',e.target.checked));$('ux2Symmetry').value=$('symmetry')?.value||'off';$('ux2Symmetry').addEventListener('change',e=>dispatchSetting('symmetry',e.target.value));$('ux2SymmetryGuides').addEventListener('change',e=>dispatchSetting('symmetryGuides',e.target.checked));$('ux2Guide').value=$('constructionGuide')?.value||'off';$('ux2Guide').addEventListener('change',e=>dispatchSetting('constructionGuide',e.target.value));$('ux2SnapOn').addEventListener('change',e=>dispatchChecked('snapOn',e.target.checked));$('ux2PaletteSelect').value=$('savedPaletteSelect')?.value||'default';$('ux2PaletteSelect').addEventListener('change',e=>{dispatchValue('savedPaletteSelect',e.target.value,'change');openPanel('pattern')});$('ux2SetupSwatches').replaceChildren(...[...($('paletteSwatches')?.querySelectorAll('.swatch')||[])].map(source=>{const button=document.createElement('button');button.type='button';button.className='ux2-setup-swatch';button.style.background=source.dataset.color;button.title=source.title;button.setAttribute('aria-label',source.getAttribute('aria-label')||source.title);button.addEventListener('click',()=>source.click());return button}));$('ux2AddPaletteColour').addEventListener('click',()=>{clickOld('addPaletteColour');openPanel('pattern')});$('ux2SavePalette').addEventListener('click',()=>{clickOld('savePalette');setTimeout(()=>openPanel('pattern'),0)})}
    if(name==='export')document.querySelectorAll('[data-export-old]').forEach(b=>b.addEventListener('click',()=>clickOld(b.dataset.exportOld)));
  }

  let ux2FullscreenActive=false;
  let ux2FullscreenZoomBefore=null;
  function notifyNativeFullscreen(active){
    try{
      const bridge=window.PatternForgeAndroid;
      if(bridge&&typeof bridge.setFullscreen==='function')bridge.setFullscreen(JSON.stringify({active:!!active}));
    }catch(_){/* Browser build or native bridge unavailable. */}
  }
  function syncFullscreenButton(){
    const button=$('ux2Fullscreen');if(!button)return;
    button.classList.toggle('active',ux2FullscreenActive);
    button.title=ux2FullscreenActive?'Exit full screen':'Full screen';
    button.setAttribute('aria-label',ux2FullscreenActive?'Exit full screen':'Enter full screen');
    button.setAttribute('aria-pressed',String(ux2FullscreenActive));
  }
  async function setUx2Fullscreen(active){
    const next=!!active;
    if(next===ux2FullscreenActive)return;
    ux2FullscreenActive=next;
    if(ux2FullscreenActive){
      ux2FullscreenZoomBefore=$('zoom')?.value||null;
      const palette=$('ux2Palette');if(palette)palette.hidden=true;
      document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.remove('active'));
    }
    document.body.classList.toggle('ux2-fullscreen',ux2FullscreenActive);
    syncFullscreenButton();
    notifyNativeFullscreen(ux2FullscreenActive);
    if(ux2FullscreenActive){
      requestAnimationFrame(()=>{
        clickOld('fit');
      });
      if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
        try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(_){/* Keep immersive in-app fallback. */}
      }
    }else{
      if(ux2FullscreenZoomBefore!==null&&$('zoom'))dispatchValue('zoom',ux2FullscreenZoomBefore);
      ux2FullscreenZoomBefore=null;
      if(document.fullscreenElement&&document.exitFullscreen){
        try{await document.exitFullscreen();}catch(_){/* UI state is already restored. */}
      }
    }
  }
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement&&ux2FullscreenActive)void setUx2Fullscreen(false);
  });
  window.addEventListener('patternforge:native-fullscreen-exit',()=>void setUx2Fullscreen(false));

  $('ux2Gallery').addEventListener('click',()=>{location.href='/'});
  $('ux2Undo').addEventListener('click',()=>clickOld('undo'));$('ux2Redo').addEventListener('click',()=>clickOld('redo'));
  $('ux2Fullscreen').addEventListener('click',()=>setUx2Fullscreen(!ux2FullscreenActive));syncFullscreenButton();
  $('ux2Preview').addEventListener('click',()=>clickOld('repeatPreviewToggle'));
  $('ux2Export').addEventListener('click',()=>openPanel('export'));$('ux2Fit').addEventListener('click',()=>clickOld('fit'));$('ux2ZoomOut').addEventListener('click',()=>clickOld('zoomOut'));$('ux2ZoomIn').addEventListener('click',()=>clickOld('zoomIn'));
  $('ux2PaletteClose').addEventListener('click',()=>{$('ux2Palette').hidden=true;document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.remove('active'))});
  document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.ux2Tool)));
  document.querySelectorAll('[data-ux2-action="image"]').forEach(b=>b.addEventListener('click',()=>{const picker=document.getElementById('files');if(picker)picker.click()}));
  document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.ux2Panel)));

  const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
  function populateQuickPalette(){
    const host=$('ux2QuickPalette'),source=$('paletteSwatches');if(!host||!source)return;
    host.replaceChildren(...[...source.querySelectorAll('button')].map(swatch=>{
      const button=document.createElement('button');button.type='button';button.className='ux2-quick-swatch';button.style.background=swatch.dataset.color;button.title=swatch.title;button.setAttribute('aria-label',swatch.getAttribute('aria-label')||swatch.title);
      button.addEventListener('click',()=>swatch.click());return button;
    }));
  }
  const updateIdentity=()=>{
    const doodle=document.body.classList.contains('doodle-project');
    setText($('ux2Title'),doodle?'Doodle':($('projectNameDisplay')?.textContent?.trim()||'Pattern Forge'));
    setText($('ux2Mode'),doodle?'Doodle':'Pattern');
    if(doodle){const quickPalette=$('ux2QuickPalette'),toolRail=document.querySelector('.ux2-tools');if(quickPalette&&toolRail&&quickPalette.parentElement!==toolRail)toolRail.appendChild(quickPalette);}
    const patternDock=document.querySelector('[data-ux2-panel="pattern"]');if(patternDock){patternDock.hidden=false;patternDock.style.display='';patternDock.setAttribute('aria-label',doodle?'Canvas setup':'Design setup');setText(patternDock.querySelector('b'),doodle?'Canvas setup':'Design setup');}
    setText($('ux2ZoomLabel'),$('zoomLabel')?.textContent||'100%');
  };
  const updateStatus=()=>setText($('ux2Status'),$('status')?.textContent||'');
  const titleNode=$('projectNameDisplay'),statusNode=$('status'),selectionNode=$('selectedPanel');
  const zoomLabelNode=$('zoomLabel');
  if(titleNode)new MutationObserver(updateIdentity).observe(titleNode,{subtree:true,childList:true,characterData:true});
  if($('paletteSwatches'))new MutationObserver(populateQuickPalette).observe($('paletteSwatches'),{childList:true,subtree:true});
  if(zoomLabelNode)new MutationObserver(updateIdentity).observe(zoomLabelNode,{subtree:true,childList:true,characterData:true});
  if(statusNode)new MutationObserver(updateStatus).observe(statusNode,{subtree:true,childList:true,characterData:true});
  if(selectionNode)new MutationObserver(()=>{if(currentTool()==='select')renderContext('select')}).observe(selectionNode,{subtree:true,childList:true});
  new MutationObserver(updateIdentity).observe(document.body,{attributes:true,attributeFilter:['class']});
  const setupOverlay=$('projectSetupOverlay');
  if(setupOverlay)new MutationObserver(()=>{if(setupOverlay.hidden)requestAnimationFrame(()=>clickOld('fit'))}).observe(setupOverlay,{attributes:true,attributeFilter:['hidden']});
  $('zoom')?.addEventListener('input',updateIdentity);
  populateQuickPalette();
  setTool(currentTool());updateIdentity();updateStatus();
})();
