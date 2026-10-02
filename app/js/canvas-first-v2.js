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
      </div>
      <div class="ux2-top-actions">
        <span class="ux2-status" id="ux2Status"></span>
        <button class="ux2-icon-btn" id="ux2Undo" title="Undo">${icon('undo')}</button>
        <button class="ux2-icon-btn" id="ux2Redo" title="Redo">${icon('redo')}</button>
        <button class="ux2-icon-btn" id="ux2Fullscreen" title="Full screen" aria-label="Enter full screen">${icon('fullscreen')}</button>
        <button class="ux2-btn" id="ux2Preview">Preview</button>
        <button class="ux2-btn primary" id="ux2Export">Export</button>
      </div>
    </header>
    <div class="ux2-work">
      <nav class="ux2-tools" aria-label="Creative tools">
        <button class="ux2-tool active" data-ux2-tool="select">${icon('select')}<b>Select</b></button>
        <button class="ux2-tool" data-ux2-tool="brush">${icon('brush')}<b>Brush</b></button>
        <button class="ux2-tool" data-ux2-tool="eraser">${icon('eraser')}<b>Erase</b></button>
        <button class="ux2-tool" data-ux2-tool="freefill">${icon('fill')}<b>Fill</b></button>
        <button class="ux2-tool" data-ux2-tool="pan">${icon('pan')}<b>Pan</b></button>
        <button class="ux2-tool" data-ux2-action="image">${icon('image')}<b>Image</b></button>
        <button class="ux2-tool" data-ux2-tool="rect">${icon('shape')}<b>Shape</b></button>
      </nav>
      <main class="ux2-canvas-area">
        <div class="ux2-canvas-head"><span id="ux2Hint">Select artwork to move, scale or rotate</span><span class="spacer"></span><button class="ux2-btn" id="ux2Fit">Fit</button><span id="ux2ZoomLabel">100%</span></div>
        <div class="ux2-canvas-slot" id="ux2CanvasSlot"></div>
      </main>
      <nav class="ux2-dockbar" aria-label="Quick palettes">
        <button class="ux2-dock" data-ux2-panel="colour">${icon('colour')}<b>Colour</b></button>
        <button class="ux2-dock" data-ux2-panel="layers">${icon('layers')}<b>Layers</b></button>
        <button class="ux2-dock" data-ux2-panel="pattern">${icon('repeat')}<b>Pattern</b></button>
      </nav>
      <aside class="ux2-palette" id="ux2Palette" hidden><div class="ux2-palette-head"><span id="ux2PaletteTitle">Panel</span><button class="ux2-palette-close" id="ux2PaletteClose" aria-label="Close">×</button></div><div class="ux2-palette-body" id="ux2PaletteBody"></div></aside>
    </div>
    <footer class="ux2-context" id="ux2Context"></footer>`;

  oldLayout.before(shell);
  $('ux2CanvasSlot').appendChild(stage);
  document.body.classList.add('ux2-active');

  const hiddenTool = tool => oldLayout.querySelector(`[data-tool="${tool}"]`);
  const dispatchValue = (id, value, event='input') => {
    const el=$(id); if(!el) return; el.value=value; el.dispatchEvent(new Event(event,{bubbles:true}));
  };
  const dispatchChecked = (id, value) => {
    const el=$(id); if(!el) return; el.checked=!!value; el.dispatchEvent(new Event('change',{bubbles:true}));
  };
  const clickOld = id => { const el=$(id); if(el) el.click(); };
  const currentTool = () => [...oldLayout.querySelectorAll('[data-tool]')].find(b=>b.classList.contains('active'))?.dataset.tool || 'select';

  const hints={select:'Select artwork to move, scale or rotate',brush:'Draw on the active layer',eraser:'Erase from the active layer',freefill:'Trace a closed area to fill',gradient:'Trace a closed area for gradient fill',pan:'Move around the canvas',line:'Draw a straight line',rect:'Draw a rectangle',ellipse:'Draw an ellipse'};
  function renderContext(tool=currentTool()){
    const context=$('ux2Context');
    $('ux2Hint').textContent=hints[tool]||'Create on the canvas';
    if(tool==='brush'||tool==='eraser'){
      const size=$('brushSize')?.value||20, opacity=$('inkOpacity')?.value||100, style=$('brushStyle')?.value||'ink';
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">${tool==='eraser'?'Eraser':'Brush'}</span><select id="ux2BrushStyle"><option value="ink">Ink</option><option value="pencil">Pencil</option><option value="marker">Marker</option><option value="texture">Textured paint</option><option value="stamp">Stamp</option></select>${tool==='brush'?'<button class="ux2-chip" id="ux2BrushLibrary">Brush library</button>':''}</div><div class="ux2-context-group"><label class="ux2-slider">Size <input id="ux2Size" type="range" min="2" max="400" value="${size}"><b id="ux2SizeOut">${size}</b></label><label class="ux2-slider">Opacity <input id="ux2Opacity" type="range" min="5" max="100" value="${opacity}"><b id="ux2OpacityOut">${opacity}%</b></label></div>`;
      $('ux2BrushStyle').value=style;
      $('ux2BrushStyle').addEventListener('change',e=>dispatchValue('brushStyle',e.target.value,'change'));
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
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Canvas</span><button class="ux2-chip" id="ux2ZoomOut">− Zoom</button><button class="ux2-chip" id="ux2ZoomIn">+ Zoom</button><button class="ux2-chip" id="ux2FitContext">Fit</button></div>`;
      $('ux2ZoomOut').addEventListener('click',()=>clickOld('zoomOut'));$('ux2ZoomIn').addEventListener('click',()=>clickOld('zoomIn'));$('ux2FitContext').addEventListener('click',()=>clickOld('fit'));
    } else {
      const scale=$('selScale'),rot=$('selRot'),opacity=$('selOpacity'),hasSelection=Boolean(scale||rot||opacity);
      context.innerHTML=hasSelection
        ? `<div class="ux2-context-group"><span class="ux2-label">Transform</span>${scale?`<label class="ux2-slider">Scale <input id="ux2SelScale" type="range" min="${scale.min||1}" max="${scale.max||600}" value="${scale.value}"><b>${scale.value}%</b></label>`:''}${rot?`<label class="ux2-slider">Rotate <input id="ux2SelRot" type="range" min="-180" max="180" value="${rot.value}"><b>${rot.value}°</b></label>`:''}${opacity?`<label class="ux2-slider">Opacity <input id="ux2SelOpacity" type="range" min="5" max="100" value="${opacity.value}"><b>${opacity.value}%</b></label>`:''}</div><div class="ux2-context-group"><button class="ux2-chip" id="ux2Duplicate">Duplicate</button><button class="ux2-chip" id="ux2Delete">Delete</button><button class="ux2-chip" id="ux2Front">Bring front</button><button class="ux2-chip" id="ux2Back">Send back</button><button class="ux2-chip" id="ux2Snap">Snap</button></div>`
        : `<div class="ux2-context-group"><span class="ux2-label">Selection</span><span style="font-size:11px;color:#6d7885">Tap artwork to expose scale, rotation, opacity and arrange controls.</span><button class="ux2-chip" id="ux2Snap">Snap</button></div>`;
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
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Current colour</div><input id="ux2ColourInput" type="color" value="${colour}" style="width:100%;height:58px;border:1px solid #c7d0da;border-radius:12px;padding:4px;background:#fff"></div><div class="ux2-panel-block"><div class="ux2-panel-label">Current palette</div><div id="ux2PaletteSwatches" class="ux2-swatches"></div><button class="ux2-btn" id="ux2AddPaletteColour" style="width:100%;margin-top:9px">Add current colour</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Saved palettes</div><select id="ux2SavedPalette" style="width:100%;margin-bottom:8px">${palettes}</select><button class="ux2-btn" id="ux2SavePalette" style="width:100%">Save current palette</button></div><div class="ux2-panel-block"><button class="ux2-btn" id="ux2Eyedropper" style="width:100%">Pick colour from canvas</button></div>`;
  }
  function populateSwatches(){
    const target=$('ux2PaletteSwatches'); if(!target)return; target.innerHTML='';
    const old=[...document.querySelectorAll('#paletteSwatches button')];
    old.slice(0,10).forEach((button,i)=>{const sw=document.createElement('button');sw.className='ux2-swatch';sw.title=`Palette colour ${i+1}`;sw.style.background=getComputedStyle(button).backgroundColor||button.style.background||'#fff';sw.addEventListener('click',()=>button.click());target.appendChild(sw)});
    if(!old.length){['#17202b','#526d8f','#6f89a8','#c5ccd5','#ffffff'].forEach(c=>{const sw=document.createElement('button');sw.className='ux2-swatch';sw.style.background=c;sw.addEventListener('click',()=>dispatchValue('ink',c));target.appendChild(sw)})}
  }
  function layerPanel(){
    const layers=[...document.querySelectorAll('#layerList .layerRow')];
    const rows=layers.map((row,i)=>`<button class="ux2-layer-row ${row.classList.contains('active')?'active':''}" data-layer-index="${i}"><span class="ux2-layer-thumb"></span><span><strong>${row.querySelector('.layerRowName')?.textContent||`Layer ${i+1}`}</strong><small>${row.querySelector('.layerRowMeta')?.textContent||'Artwork layer'}</small></span><span>›</span></button>`).join('')||'<p style="color:#687483;font-size:12px">Layers will appear here when a project is open.</p>';
    const name=String($('layerName')?.value||'');
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork layers</div>${rows}<button class="ux2-btn" id="ux2AddLayer" style="width:100%;margin-top:6px">+ Add layer</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Selected layer</div><label class="ux2-field-label">Name<input id="ux2LayerName" type="text" value="${name.replace(/"/g,'&quot;')}"></label><label class="ux2-slider">Opacity <input id="ux2LayerOpacity" type="range" min="0" max="100" value="${$('layerOpacity')?.value||100}"></label><div class="ux2-check-grid"><label><input id="ux2LayerVisible" type="checkbox" ${$('layerVisible')?.checked?'checked':''}> Visible</label><label><input id="ux2LayerLocked" type="checkbox" ${$('layerLocked')?.checked?'checked':''}> Lock</label><label><input id="ux2LayerExport" type="checkbox" ${$('layerExport')?.checked?'checked':''}> Export</label></div><div class="ux2-segment" style="margin-top:9px"><button id="ux2LayerUp">Move up</button><button id="ux2LayerDown">Move down</button></div><div class="ux2-segment" style="margin-top:7px"><button id="ux2LayerDuplicate">Duplicate</button><button id="ux2LayerDelete">Delete</button></div></div>`;
  }
  function patternPanel(){
    const doodle=document.body.classList.contains('doodle-project'),repeat=doodle?'Doodle':($('projectRepeatStyle')?.value||'straight').replace('-', ' ');
    if(doodle)return `<div class="ux2-panel-block"><div class="ux2-panel-label">Workspace</div><div class="ux2-repeat-card"><strong>Doodle</strong><span>Standalone transparent artwork. Repeat tools are intentionally hidden.</span></div></div>`;
    const grid=$('gridCount')?.value||16,sym=$('symmetry')?.value||'off',guide=$('constructionGuide')?.value||'off';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Repeat</div><div class="ux2-repeat-card"><strong>${repeat}</strong><span>${$('pixelReadout')?.textContent||'4000 × 4000'} · 300 DPI metadata</span></div><button class="ux2-btn" id="ux2FullPreview" style="width:100%;margin-top:8px">Full repeat preview</button><button class="ux2-btn" id="ux2SeamInspect" style="width:100%;margin-top:7px">Inspect seams</button><label class="ux2-slider" style="margin-top:8px">Repeat visibility <input id="ux2Neighbour" type="range" min="15" max="100" value="${$('neighborOpacity')?.value||35}"></label><label class="ux2-check"><input id="ux2TileEdge" type="checkbox" ${$('showTileBorder')?.checked?'checked':''}> Show centre tile edge</label></div><div class="ux2-panel-block"><div class="ux2-panel-label">Construction</div><label class="ux2-field-label">Grid divisions<select id="ux2Grid"><option value="8">8 × 8</option><option value="10">10 × 10</option><option value="16">16 × 16</option><option value="20">20 × 20</option><option value="40">40 × 40</option></select></label><label class="ux2-check"><input id="ux2GridOn" type="checkbox" ${$('gridOn')?.checked?'checked':''}> Show grid</label><label class="ux2-field-label">Mirror while drawing<select id="ux2Symmetry"><option value="off">Off</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="quadrant">Quadrant · 4 copies</option><option value="radial">8-way radial</option></select></label><label class="ux2-check"><input id="ux2SymmetryGuides" type="checkbox" ${$('symmetryGuides')?.checked?'checked':''}> Show mirror guides</label><label class="ux2-field-label">Guide<select id="ux2Guide"><option value="off">Off</option><option value="centre">Centre cross</option><option value="diagonals">Diagonals</option><option value="diamond">Diamond</option><option value="all">All guides</option></select></label><label class="ux2-check"><input id="ux2SnapOn" type="checkbox" ${$('snapOn')?.checked?'checked':''}> Smart snapping</label></div>`;
  }
  function exportPanel(){
    const quality=$('quality')?.textContent?.trim()||'Add artwork to calculate print quality.',pixels=$('pixelReadout')?.textContent||'4000 × 4000';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Export confidence</div><div class="ux2-repeat-card"><strong>${pixels}</strong><span>PNG carries 300 DPI metadata.</span></div><p class="ux2-info">${quality}</p></div><div class="ux2-panel-block"><div class="ux2-panel-label">Artwork</div><button class="ux2-btn primary" data-export-old="exportPng" style="width:100%;margin-bottom:7px">Export PNG · 300 DPI</button><button class="ux2-btn" data-export-old="exportSvg" style="width:100%">Export SVG</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Editable project</div><button class="ux2-btn" data-export-old="saveProject" style="width:100%;margin-bottom:7px">Save editable project</button><button class="ux2-btn" data-export-old="openProject" style="width:100%;margin-bottom:7px">Open project file</button><button class="ux2-btn" data-export-old="exportZip" style="width:100%">Download project bundle</button></div>`;
  }


  function openPanel(name){
    const p=$('ux2Palette'), body=$('ux2PaletteBody'); p.hidden=false;
    $('ux2PaletteTitle').textContent=name==='colour'?'Colour':name==='layers'?'Layers':name==='pattern'?'Pattern':name==='brushes'?'Brush Library':'Export';
    body.innerHTML=name==='colour'?colourPanel():name==='layers'?layerPanel():name==='pattern'?patternPanel():name==='brushes'?brushPanel():exportPanel();
    document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Panel===name));
    if(name==='colour'){$('ux2ColourInput').addEventListener('input',e=>dispatchValue('ink',e.target.value));$('ux2Eyedropper').addEventListener('click',()=>setTool('eyedropper'));$('ux2AddPaletteColour')?.addEventListener('click',()=>{clickOld('addPaletteColour');populateSwatches()});$('ux2SavePalette')?.addEventListener('click',()=>clickOld('savePalette'));if($('ux2SavedPalette')&&$('savedPaletteSelect')){$('ux2SavedPalette').value=$('savedPaletteSelect').value;$('ux2SavedPalette').addEventListener('change',e=>dispatchValue('savedPaletteSelect',e.target.value,'change'))}populateSwatches()}
    if(name==='brushes'){document.querySelectorAll('[data-brush-style]').forEach(b=>b.addEventListener('click',()=>{dispatchValue('brushStyle',b.dataset.brushStyle,'change');setTool('brush');openPanel('brushes')}));document.querySelectorAll('[data-stamp]').forEach(b=>b.addEventListener('click',()=>dispatchValue('stampShape',b.dataset.stamp,'change')))}
    if(name==='layers'){
      document.querySelectorAll('[data-layer-index]').forEach(b=>b.addEventListener('click',()=>{const row=document.querySelectorAll('#layerList .layerRow')[Number(b.dataset.layerIndex)];if(row)row.click();openPanel('layers')}));
      $('ux2AddLayer').addEventListener('click',()=>{clickOld('layerAdd');openPanel('layers')});$('ux2LayerDuplicate').addEventListener('click',()=>{clickOld('layerDuplicate');openPanel('layers')});$('ux2LayerDelete').addEventListener('click',()=>{clickOld('layerDelete');openPanel('layers')});$('ux2LayerUp').addEventListener('click',()=>{clickOld('layerUp');openPanel('layers')});$('ux2LayerDown').addEventListener('click',()=>{clickOld('layerDown');openPanel('layers')});$('ux2LayerOpacity').addEventListener('input',e=>dispatchValue('layerOpacity',e.target.value));$('ux2LayerName').addEventListener('change',e=>dispatchValue('layerName',e.target.value,'change'));$('ux2LayerVisible').addEventListener('change',e=>dispatchChecked('layerVisible',e.target.checked));$('ux2LayerLocked').addEventListener('change',e=>dispatchChecked('layerLocked',e.target.checked));$('ux2LayerExport').addEventListener('change',e=>dispatchChecked('layerExport',e.target.checked));
    }
    if(name==='pattern'&&!document.body.classList.contains('doodle-project')){$('ux2FullPreview')?.addEventListener('click',()=>clickOld('repeatPreviewToggle'));$('ux2SeamInspect')?.addEventListener('click',()=>{dispatchValue('neighborOpacity','100');dispatchChecked('showTileBorder',true);clickOld('fit');const st=$('status');if(st)st.textContent='Seam inspection: repeat neighbours are at full visibility and the centre tile edge is marked.';openPanel('pattern')});$('ux2Neighbour')?.addEventListener('input',e=>dispatchValue('neighborOpacity',e.target.value));$('ux2TileEdge')?.addEventListener('change',e=>dispatchChecked('showTileBorder',e.target.checked));$('ux2Grid').value=String($('gridCount')?.value||16);$('ux2Grid').addEventListener('change',e=>dispatchValue('gridCount',e.target.value,'change'));$('ux2GridOn').addEventListener('change',e=>dispatchChecked('gridOn',e.target.checked));$('ux2Symmetry').value=$('symmetry')?.value||'off';$('ux2Symmetry').addEventListener('change',e=>dispatchValue('symmetry',e.target.value,'change'));$('ux2SymmetryGuides').addEventListener('change',e=>dispatchChecked('symmetryGuides',e.target.checked));$('ux2Guide').value=$('constructionGuide')?.value||'off';$('ux2Guide').addEventListener('change',e=>dispatchValue('constructionGuide',e.target.value,'change'));$('ux2SnapOn').addEventListener('change',e=>dispatchChecked('snapOn',e.target.checked))}
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
        if($('zoom'))dispatchValue('zoom','270');
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
  $('ux2Preview').addEventListener('click',()=>openPanel(document.body.classList.contains('doodle-project')?'layers':'pattern'));
  $('ux2Export').addEventListener('click',()=>openPanel('export'));$('ux2Fit').addEventListener('click',()=>clickOld('fit'));
  $('ux2PaletteClose').addEventListener('click',()=>{$('ux2Palette').hidden=true;document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.remove('active'))});
  document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.ux2Tool)));
  document.querySelectorAll('[data-ux2-action="image"]').forEach(b=>b.addEventListener('click',()=>{const picker=document.getElementById('files');if(picker)picker.click()}));
  document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.ux2Panel)));

  const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
  const updateIdentity=()=>{
    setText($('ux2Title'),$('projectNameDisplay')?.textContent?.trim()||'Pattern Forge');
    const doodle=document.body.classList.contains('doodle-project');setText($('ux2Mode'),doodle?'Doodle':'Pattern');
    const patternDock=document.querySelector('[data-ux2-panel="pattern"]');if(patternDock){patternDock.hidden=doodle;patternDock.style.display=doodle?'none':'';}
    setText($('ux2ZoomLabel'),$('zoomLabel')?.textContent||'100%');
  };
  const updateStatus=()=>setText($('ux2Status'),$('status')?.textContent||'');
  const titleNode=$('projectNameDisplay'),statusNode=$('status'),selectionNode=$('selectedPanel');
  if(titleNode)new MutationObserver(updateIdentity).observe(titleNode,{subtree:true,childList:true,characterData:true});
  if(statusNode)new MutationObserver(updateStatus).observe(statusNode,{subtree:true,childList:true,characterData:true});
  if(selectionNode)new MutationObserver(()=>{if(currentTool()==='select')renderContext('select')}).observe(selectionNode,{subtree:true,childList:true});
  new MutationObserver(updateIdentity).observe(document.body,{attributes:true,attributeFilter:['class']});
  $('zoom')?.addEventListener('input',updateIdentity);
  setTool(currentTool());updateIdentity();updateStatus();
})();
