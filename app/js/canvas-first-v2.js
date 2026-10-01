(() => {
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
      </nav>
      <main class="ux2-canvas-area">
        <div class="ux2-canvas-head"><span id="ux2Hint">Select artwork to move, scale or rotate</span><span class="spacer"></span><button class="ux2-btn" id="ux2Fit">Fit</button><span id="ux2ZoomLabel">100%</span></div>
        <div class="ux2-canvas-slot" id="ux2CanvasSlot"></div>
      </main>
      <nav class="ux2-dockbar" aria-label="Quick palettes">
        <button class="ux2-dock" data-ux2-panel="colour"><span style="width:20px;height:20px;border-radius:50%;border:2px solid currentColor;background:#6f89a8"></span><b>Colour</b></button>
        <button class="ux2-dock" data-ux2-panel="layers"><span style="font-size:23px;line-height:1">≡</span><b>Layers</b></button>
        <button class="ux2-dock" data-ux2-panel="pattern"><span style="font-size:21px;line-height:1">▦</span><b>Pattern</b></button>
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

  const hints={select:'Select artwork to move, scale or rotate',brush:'Draw on the active layer',eraser:'Erase from the active layer',freefill:'Trace a closed area to fill',pan:'Move around the canvas'};
  function renderContext(tool=currentTool()){
    const context=$('ux2Context');
    $('ux2Hint').textContent=hints[tool]||'Create on the canvas';
    if(tool==='brush'||tool==='eraser'){
      const size=$('brushSize')?.value||20, opacity=$('inkOpacity')?.value||100, style=$('brushStyle')?.value||'ink';
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">${tool==='eraser'?'Eraser':'Brush'}</span><select id="ux2BrushStyle"><option value="ink">Ink</option><option value="pencil">Pencil</option><option value="marker">Marker</option><option value="texture">Textured paint</option><option value="stamp">Stamp</option></select></div><div class="ux2-context-group"><label class="ux2-slider">Size <input id="ux2Size" type="range" min="2" max="400" value="${size}"><b id="ux2SizeOut">${size}</b></label><label class="ux2-slider">Opacity <input id="ux2Opacity" type="range" min="5" max="100" value="${opacity}"><b id="ux2OpacityOut">${opacity}%</b></label></div>`;
      $('ux2BrushStyle').value=style;
      $('ux2BrushStyle').addEventListener('change',e=>dispatchValue('brushStyle',e.target.value,'change'));
      $('ux2Size').addEventListener('input',e=>{dispatchValue('brushSize',e.target.value);$('ux2SizeOut').textContent=e.target.value});
      $('ux2Opacity').addEventListener('input',e=>{dispatchValue('inkOpacity',e.target.value);$('ux2OpacityOut').textContent=e.target.value+'%'});
    } else if(tool==='freefill'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Fill</span><button class="ux2-chip active">Freehand area</button><button class="ux2-chip" id="ux2GradientFill">Gradient fill</button></div><div class="ux2-context-group"><button class="ux2-chip" id="ux2ColourShortcut">Choose colour</button></div>`;
      $('ux2GradientFill').addEventListener('click',()=>setTool('gradient'));
      $('ux2ColourShortcut').addEventListener('click',()=>openPanel('colour'));
    } else if(tool==='pan'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Canvas</span><button class="ux2-chip" id="ux2ZoomOut">− Zoom</button><button class="ux2-chip" id="ux2ZoomIn">+ Zoom</button><button class="ux2-chip" id="ux2FitContext">Fit</button></div>`;
      $('ux2ZoomOut').addEventListener('click',()=>clickOld('zoomOut'));$('ux2ZoomIn').addEventListener('click',()=>clickOld('zoomIn'));$('ux2FitContext').addEventListener('click',()=>clickOld('fit'));
    } else {
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Selection</span><button class="ux2-chip active">Move</button><button class="ux2-chip">Scale / rotate on canvas</button></div><div class="ux2-context-group"><button class="ux2-chip" id="ux2Duplicate">Duplicate</button><button class="ux2-chip" id="ux2Delete">Delete</button><button class="ux2-chip" id="ux2Snap">Snapping</button></div>`;
      $('ux2Duplicate').addEventListener('click',()=>{const b=document.querySelector('#selectedPanel button[data-action="duplicate"],#selectedPanel button.duplicate');if(b)b.click()});
      $('ux2Delete').addEventListener('click',()=>{const b=document.querySelector('#selectedPanel button[data-action="delete"],#selectedPanel button.danger');if(b)b.click()});
      $('ux2Snap').addEventListener('click',()=>{const el=$('snapOn');if(el){el.checked=!el.checked;el.dispatchEvent(new Event('change',{bubbles:true}))}});
    }
  }

  function setTool(tool){
    const old=hiddenTool(tool); if(old) old.click();
    document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Tool===tool));
    renderContext(tool);
  }

  function colourPanel(){
    const colour=$('ink')?.value||'#6f89a8';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Current colour</div><input id="ux2ColourInput" type="color" value="${colour}" style="width:100%;height:58px;border:1px solid #c7d0da;border-radius:12px;padding:4px;background:#fff"></div><div class="ux2-panel-block"><div class="ux2-panel-label">Current palette</div><div id="ux2PaletteSwatches" class="ux2-swatches"></div></div><div class="ux2-panel-block"><button class="ux2-btn" id="ux2Eyedropper" style="width:100%">Pick colour from canvas</button></div>`;
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
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork layers</div>${rows}<button class="ux2-btn" id="ux2AddLayer" style="width:100%;margin-top:6px">+ Add layer</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Selected layer</div><label class="ux2-slider">Opacity <input id="ux2LayerOpacity" type="range" min="0" max="100" value="${$('layerOpacity')?.value||100}"></label><div style="display:flex;gap:6px;margin-top:8px"><button class="ux2-btn" id="ux2LayerDuplicate">Duplicate</button><button class="ux2-btn" id="ux2LayerDelete">Delete</button></div></div>`;
  }
  function patternPanel(){
    const repeat=document.body.classList.contains('doodle-project')?'Doodle':($('projectRepeatStyle')?.value||'straight').replace('-', ' ');
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Workspace</div><div class="ux2-repeat-card"><strong>${repeat}</strong><span>${document.body.classList.contains('doodle-project')?'Standalone transparent artwork':'Live seamless repeat workspace'}</span></div></div>${document.body.classList.contains('doodle-project')?'':`<div class="ux2-panel-block"><button class="ux2-btn" id="ux2FullPreview" style="width:100%;margin-bottom:8px">Full repeat preview</button><label class="ux2-slider">Repeat visibility <input id="ux2Neighbour" type="range" min="15" max="100" value="${$('neighborOpacity')?.value||35}"></label><label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px"><input id="ux2TileEdge" type="checkbox" ${$('showTileBorder')?.checked?'checked':''}> Show centre tile edge</label></div>`}`;
  }
  function exportPanel(){return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork</div><button class="ux2-btn primary" data-export-old="exportPng" style="width:100%;margin-bottom:7px">Export PNG · 300 DPI</button><button class="ux2-btn" data-export-old="exportSvg" style="width:100%">Export SVG</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Editable project</div><button class="ux2-btn" data-export-old="saveProject" style="width:100%;margin-bottom:7px">Save editable project</button><button class="ux2-btn" data-export-old="openProject" style="width:100%;margin-bottom:7px">Open project file</button><button class="ux2-btn" data-export-old="exportZip" style="width:100%">Download project bundle</button></div>`}

  function openPanel(name){
    const p=$('ux2Palette'), body=$('ux2PaletteBody'); p.hidden=false;
    $('ux2PaletteTitle').textContent=name==='colour'?'Colour':name==='layers'?'Layers':name==='pattern'?'Pattern':'Export';
    body.innerHTML=name==='colour'?colourPanel():name==='layers'?layerPanel():name==='pattern'?patternPanel():exportPanel();
    document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Panel===name));
    if(name==='colour'){$('ux2ColourInput').addEventListener('input',e=>dispatchValue('ink',e.target.value));$('ux2Eyedropper').addEventListener('click',()=>setTool('eyedropper'));populateSwatches()}
    if(name==='layers'){
      document.querySelectorAll('[data-layer-index]').forEach(b=>b.addEventListener('click',()=>{const row=document.querySelectorAll('#layerList .layerRow')[Number(b.dataset.layerIndex)];if(row)row.click();openPanel('layers')}));
      $('ux2AddLayer').addEventListener('click',()=>{clickOld('layerAdd');openPanel('layers')});$('ux2LayerDuplicate').addEventListener('click',()=>{clickOld('layerDuplicate');openPanel('layers')});$('ux2LayerDelete').addEventListener('click',()=>{clickOld('layerDelete');openPanel('layers')});$('ux2LayerOpacity').addEventListener('input',e=>dispatchValue('layerOpacity',e.target.value));
    }
    if(name==='pattern'&&!document.body.classList.contains('doodle-project')){$('ux2FullPreview')?.addEventListener('click',()=>clickOld('repeatPreviewToggle'));$('ux2Neighbour')?.addEventListener('input',e=>dispatchValue('neighborOpacity',e.target.value));$('ux2TileEdge')?.addEventListener('change',e=>dispatchChecked('showTileBorder',e.target.checked))}
    if(name==='export')document.querySelectorAll('[data-export-old]').forEach(b=>b.addEventListener('click',()=>clickOld(b.dataset.exportOld)));
  }

  $('ux2Gallery').addEventListener('click',()=>{location.href='/'});
  $('ux2Undo').addEventListener('click',()=>clickOld('undo'));$('ux2Redo').addEventListener('click',()=>clickOld('redo'));
  $('ux2Preview').addEventListener('click',()=>openPanel(document.body.classList.contains('doodle-project')?'layers':'pattern'));
  $('ux2Export').addEventListener('click',()=>openPanel('export'));$('ux2Fit').addEventListener('click',()=>clickOld('fit'));
  $('ux2PaletteClose').addEventListener('click',()=>{$('ux2Palette').hidden=true;document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.classList.remove('active'))});
  document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.ux2Tool)));
  document.querySelectorAll('[data-ux2-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.ux2Panel)));

  const updateIdentity=()=>{
    $('ux2Title').textContent=$('projectNameDisplay')?.textContent?.trim()||'Pattern Forge';
    const doodle=document.body.classList.contains('doodle-project');$('ux2Mode').textContent=doodle?'Doodle':'Pattern';
    const patternDock=document.querySelector('[data-ux2-panel="pattern"]');if(patternDock)patternDock.hidden=doodle;
    $('ux2ZoomLabel').textContent=$('zoomLabel')?.textContent||'100%';
  };
  const updateStatus=()=>{$('ux2Status').textContent=$('status')?.textContent||''};
  new MutationObserver(()=>{updateIdentity();updateStatus()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  $('zoom')?.addEventListener('input',updateIdentity);
  setTool(currentTool());updateIdentity();updateStatus();
})();
