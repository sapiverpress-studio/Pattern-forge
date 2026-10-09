from pathlib import Path

js_path = Path('app/js/canvas-first-v2.js')
s = js_path.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Missing anchor for {label}')
    s = s.replace(old, new, 1)

replace_once(
'''        <button class="ux2-btn" id="ux2Preview">Preview</button>
        <button class="ux2-btn primary" id="ux2Export">Export</button>''',
'''        <button class="ux2-btn ux2-btn-icon" id="ux2Preview">${icon('preview')}<span>Preview</span></button>
        <button class="ux2-btn primary ux2-btn-icon" id="ux2Export">${icon('export')}<span>Export</span></button>''',
'preview export icons')

replace_once(
'''        <button class="ux2-tool" data-ux2-tool="freefill">${icon('fill')}<b>Fill</b></button>
        <button class="ux2-tool" data-ux2-tool="pan">${icon('pan')}<b>Pan</b></button>''',
'''        <button class="ux2-tool" data-ux2-tool="freefill">${icon('fill')}<b>Fill</b></button>
        <button class="ux2-tool" data-ux2-tool="pan">${icon('pan')}<b>Pan</b></button>
        <button class="ux2-tool" data-ux2-tool="image">${icon('image')}<b>Image</b></button>
        <button class="ux2-tool" data-ux2-tool="shape">${icon('shape')}<b>Shape</b></button>''',
'tool rail depth')

replace_once(
'''        <button class="ux2-dock" data-ux2-panel="colour"><span style="width:20px;height:20px;border-radius:50%;border:2px solid currentColor;background:#6f89a8"></span><b>Colour</b></button>
        <button class="ux2-dock" data-ux2-panel="layers"><span style="font-size:23px;line-height:1">≡</span><b>Layers</b></button>
        <button class="ux2-dock" data-ux2-panel="pattern"><span style="font-size:21px;line-height:1">▦</span><b>Pattern</b></button>''',
'''        <button class="ux2-dock" data-ux2-panel="colour">${icon('colour')}<b>Colour</b></button>
        <button class="ux2-dock" data-ux2-panel="layers">${icon('layers')}<b>Layers</b></button>
        <button class="ux2-dock" data-ux2-panel="pattern">${icon('repeat')}<b>Pattern</b></button>''',
'original dock icons')

replace_once(
'''<button class="ux2-palette-close" id="ux2PaletteClose" aria-label="Close">×</button>''',
'''<button class="ux2-palette-close" id="ux2PaletteClose" aria-label="Close">${icon('close')}</button>''',
'close icon')

replace_once(
'''  const hints={select:'Select artwork to move, scale or rotate',brush:'Draw on the active layer',eraser:'Erase from the active layer',freefill:'Trace a closed area to fill',pan:'Move around the canvas'};''',
'''  const hints={select:'Select artwork to move, scale or rotate',brush:'Draw on the active layer',eraser:'Erase from the active layer',freefill:'Trace a closed area to fill',pan:'Move around the canvas',image:'Import, place and arrange artwork',shape:'Draw lines, rectangles or ellipses'};''',
'hints')

replace_once(
'''      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">${tool==='eraser'?'Eraser':'Brush'}</span><select id="ux2BrushStyle"><option value="ink">Ink</option><option value="pencil">Pencil</option><option value="marker">Marker</option><option value="texture">Textured paint</option><option value="stamp">Stamp</option></select></div><div class="ux2-context-group"><label class="ux2-slider">Size <input id="ux2Size" type="range" min="2" max="400" value="${size}"><b id="ux2SizeOut">${size}</b></label><label class="ux2-slider">Opacity <input id="ux2Opacity" type="range" min="5" max="100" value="${opacity}"><b id="ux2OpacityOut">${opacity}%</b></label></div>`;
      $('ux2BrushStyle').value=style;
      $('ux2BrushStyle').addEventListener('change',e=>dispatchValue('brushStyle',e.target.value,'change'));
      $('ux2Size').addEventListener('input',e=>{dispatchValue('brushSize',e.target.value);$('ux2SizeOut').textContent=e.target.value});
      $('ux2Opacity').addEventListener('input',e=>{dispatchValue('inkOpacity',e.target.value);$('ux2OpacityOut').textContent=e.target.value+'%'});''',
'''      const texture=$('textureAmount')?.value||35;
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">${tool==='eraser'?'Eraser':'Brush'}</span><select id="ux2BrushStyle"><option value="ink">Ink</option><option value="pencil">Pencil</option><option value="marker">Marker</option><option value="texture">Textured paint</option><option value="stamp">Stamp</option></select></div><div class="ux2-context-group"><label class="ux2-slider">Size <input id="ux2Size" type="range" min="2" max="400" value="${size}"><b id="ux2SizeOut">${size}</b></label><label class="ux2-slider">Opacity <input id="ux2Opacity" type="range" min="5" max="100" value="${opacity}"><b id="ux2OpacityOut">${opacity}%</b></label>${tool==='brush'?`<label class="ux2-slider">Texture <input id="ux2Texture" type="range" min="0" max="100" value="${texture}"><b id="ux2TextureOut">${texture}%</b></label><button class="ux2-chip" id="ux2BrushColour">Colour</button>`:''}</div>`;
      $('ux2BrushStyle').value=style;
      $('ux2BrushStyle').addEventListener('change',e=>dispatchValue('brushStyle',e.target.value,'change'));
      $('ux2Size').addEventListener('input',e=>{dispatchValue('brushSize',e.target.value);$('ux2SizeOut').textContent=e.target.value});
      $('ux2Opacity').addEventListener('input',e=>{dispatchValue('inkOpacity',e.target.value);$('ux2OpacityOut').textContent=e.target.value+'%'});
      if($('ux2Texture'))$('ux2Texture').addEventListener('input',e=>{dispatchValue('textureAmount',e.target.value);$('ux2TextureOut').textContent=e.target.value+'%'});
      if($('ux2BrushColour'))$('ux2BrushColour').addEventListener('click',()=>openPanel('colour'));''',
'brush depth')

replace_once(
'''    } else if(tool==='pan'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Canvas</span><button class="ux2-chip" id="ux2ZoomOut">− Zoom</button><button class="ux2-chip" id="ux2ZoomIn">+ Zoom</button><button class="ux2-chip" id="ux2FitContext">Fit</button></div>`;
      $('ux2ZoomOut').addEventListener('click',()=>clickOld('zoomOut'));$('ux2ZoomIn').addEventListener('click',()=>clickOld('zoomIn'));$('ux2FitContext').addEventListener('click',()=>clickOld('fit'));
    } else {''',
'''    } else if(tool==='image'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Images</span><button class="ux2-chip active" id="ux2AddImage">Add image</button><button class="ux2-chip" id="ux2ImageLibrary">Image library</button></div><div class="ux2-context-group"><span style="font-size:11px;color:#6d7885">Imported artwork stays reusable inside this project.</span></div>`;
      $('ux2AddImage').addEventListener('click',()=>clickOld('files'));
      $('ux2ImageLibrary').addEventListener('click',()=>openPanel('images'));
    } else if(tool==='shape'){
      const fill=$('shapeFill')?.checked;
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Shape</span><button class="ux2-chip" id="ux2Line">Line</button><button class="ux2-chip active" id="ux2Rect">Rectangle</button><button class="ux2-chip" id="ux2Ellipse">Ellipse</button></div><div class="ux2-context-group"><label class="ux2-check"><input id="ux2ShapeFill" type="checkbox" ${fill?'checked':''}> Fill</label><label class="ux2-slider">Outline <input id="ux2ShapeSize" type="range" min="2" max="400" value="${$('brushSize')?.value||20}"></label></div>`;
      $('ux2Line').addEventListener('click',()=>setTool('line'));$('ux2Rect').addEventListener('click',()=>setTool('rect'));$('ux2Ellipse').addEventListener('click',()=>setTool('ellipse'));
      $('ux2ShapeFill').addEventListener('change',e=>dispatchChecked('shapeFill',e.target.checked));$('ux2ShapeSize').addEventListener('input',e=>dispatchValue('brushSize',e.target.value));
    } else if(tool==='pan'){
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Canvas</span><button class="ux2-chip" id="ux2ZoomOut">− Zoom</button><button class="ux2-chip" id="ux2ZoomIn">+ Zoom</button><button class="ux2-chip" id="ux2FitContext">Fit</button></div>`;
      $('ux2ZoomOut').addEventListener('click',()=>clickOld('zoomOut'));$('ux2ZoomIn').addEventListener('click',()=>clickOld('zoomIn'));$('ux2FitContext').addEventListener('click',()=>clickOld('fit'));
    } else {''',
'image and shape context')

replace_once(
'''  function setTool(tool){
    const old=hiddenTool(tool); if(old) old.click();
    document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Tool===tool));
    renderContext(tool);
  }''',
'''  function setTool(tool){
    const shapeTools=['line','rect','ellipse'];
    const displayTool=shapeTools.includes(tool)?'shape':tool==='gradient'?'freefill':tool;
    if(tool==='image'){
      const select=hiddenTool('select');if(select)select.click();
    }else{
      const old=hiddenTool(tool);if(old)old.click();
    }
    document.querySelectorAll('[data-ux2-tool]').forEach(b=>b.classList.toggle('active',b.dataset.ux2Tool===displayTool));
    renderContext(displayTool);
  }''',
'composite tools')

replace_once(
'''  function colourPanel(){
    const colour=$('ink')?.value||'#6f89a8';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Current colour</div><input id="ux2ColourInput" type="color" value="${colour}" style="width:100%;height:58px;border:1px solid #c7d0da;border-radius:12px;padding:4px;background:#fff"></div><div class="ux2-panel-block"><div class="ux2-panel-label">Current palette</div><div id="ux2PaletteSwatches" class="ux2-swatches"></div></div><div class="ux2-panel-block"><button class="ux2-btn" id="ux2Eyedropper" style="width:100%">Pick colour from canvas</button></div>`;
  }''',
'''  function colourPanel(){
    const colour=$('ink')?.value||'#6f89a8', paletteOptions=$('savedPaletteSelect')?.innerHTML||'<option value="default">Default palette</option>';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Current colour</div><input id="ux2ColourInput" type="color" value="${colour}" class="ux2-colour-input"></div><div class="ux2-panel-block"><div class="ux2-panel-label">Current palette</div><div id="ux2PaletteSwatches" class="ux2-swatches"></div><div class="ux2-panel-actions"><button class="ux2-btn" id="ux2AddPaletteColour">Add current</button><button class="ux2-btn" id="ux2Eyedropper">Pick from canvas</button></div></div><div class="ux2-panel-block"><div class="ux2-panel-label">Saved palettes</div><select id="ux2SavedPalette" class="ux2-panel-select">${paletteOptions}</select><button class="ux2-btn" id="ux2SavePalette" style="width:100%;margin-top:8px">Save current palette</button></div>`;
  }''',
'colour depth')

replace_once(
'''  function layerPanel(){
    const layers=[...document.querySelectorAll('#layerList .layerRow')];
    const rows=layers.map((row,i)=>`<button class="ux2-layer-row ${row.classList.contains('active')?'active':''}" data-layer-index="${i}"><span class="ux2-layer-thumb"></span><span><strong>${row.querySelector('.layerRowName')?.textContent||`Layer ${i+1}`}</strong><small>${row.querySelector('.layerRowMeta')?.textContent||'Artwork layer'}</small></span><span>›</span></button>`).join('')||'<p style="color:#687483;font-size:12px">Layers will appear here when a project is open.</p>';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork layers</div>${rows}<button class="ux2-btn" id="ux2AddLayer" style="width:100%;margin-top:6px">+ Add layer</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Selected layer</div><label class="ux2-slider">Opacity <input id="ux2LayerOpacity" type="range" min="0" max="100" value="${$('layerOpacity')?.value||100}"></label><div style="display:flex;gap:6px;margin-top:8px"><button class="ux2-btn" id="ux2LayerDuplicate">Duplicate</button><button class="ux2-btn" id="ux2LayerDelete">Delete</button></div></div>`;
  }''',
'''  function layerPanel(){
    const layers=[...document.querySelectorAll('#layerList .layerRow')];
    const rows=layers.map((row,i)=>`<button class="ux2-layer-row ${row.classList.contains('active')?'active':''}" data-layer-index="${i}"><span class="ux2-layer-thumb"></span><span><strong>${row.querySelector('.layerRowName')?.textContent||`Layer ${i+1}`}</strong><small>${row.querySelector('.layerRowMeta')?.textContent||'Artwork layer'}</small></span><span>›</span></button>`).join('')||'<p class="ux2-muted-copy">Layers will appear here when a project is open.</p>';
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork layers</div>${rows}<button class="ux2-btn" id="ux2AddLayer" style="width:100%;margin-top:6px">+ Add layer</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Selected layer</div><label class="ux2-field-label">Name<input id="ux2LayerName" class="ux2-panel-input" value="${String($('layerName')?.value||'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}"></label><label class="ux2-slider">Opacity <input id="ux2LayerOpacity" type="range" min="0" max="100" value="${$('layerOpacity')?.value||100}"></label><div class="ux2-check-grid"><label class="ux2-check"><input id="ux2LayerVisible" type="checkbox" ${$('layerVisible')?.checked?'checked':''}> Visible</label><label class="ux2-check"><input id="ux2LayerLocked" type="checkbox" ${$('layerLocked')?.checked?'checked':''}> Locked</label><label class="ux2-check"><input id="ux2LayerExport" type="checkbox" ${$('layerExport')?.checked?'checked':''}> Export</label></div><div class="ux2-panel-actions"><button class="ux2-btn" id="ux2LayerUp">Move up</button><button class="ux2-btn" id="ux2LayerDown">Move down</button></div><div class="ux2-panel-actions"><button class="ux2-btn" id="ux2LayerDuplicate">Duplicate</button><button class="ux2-btn" id="ux2LayerDelete">Delete</button></div></div>`;
  }''',
'layer depth')

replace_once(
'''  function patternPanel(){
    const repeat=document.body.classList.contains('doodle-project')?'Doodle':($('projectRepeatStyle')?.value||'straight').replace('-', ' ');
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Workspace</div><div class="ux2-repeat-card"><strong>${repeat}</strong><span>${document.body.classList.contains('doodle-project')?'Standalone transparent artwork':'Live seamless repeat workspace'}</span></div></div>${document.body.classList.contains('doodle-project')?'':`<div class="ux2-panel-block"><button class="ux2-btn" id="ux2FullPreview" style="width:100%;margin-bottom:8px">Full repeat preview</button><label class="ux2-slider">Repeat visibility <input id="ux2Neighbour" type="range" min="15" max="100" value="${$('neighborOpacity')?.value||35}"></label><label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px"><input id="ux2TileEdge" type="checkbox" ${$('showTileBorder')?.checked?'checked':''}> Show centre tile edge</label></div>`}`;
  }''',
'''  const optionHtml=id=>[...($(id)?.options||[])].map(o=>`<option value="${o.value}" ${o.value===$(id)?.value?'selected':''}>${o.textContent}</option>`).join('');
  function patternPanel(){
    const doodle=document.body.classList.contains('doodle-project'),repeat=doodle?'Doodle':($('projectRepeatStyle')?.value||'straight').replace('-', ' ');
    return `<div class="ux2-panel-block"><div class="ux2-panel-label">Workspace</div><div class="ux2-repeat-card"><strong>${repeat}</strong><span>${doodle?'Standalone transparent artwork':'Live seamless repeat workspace'}</span></div></div>${doodle?'':`<div class="ux2-panel-block"><div class="ux2-panel-label">Repeat inspection</div><button class="ux2-btn" id="ux2FullPreview" style="width:100%;margin-bottom:8px">Full repeat preview</button><button class="ux2-btn" id="ux2InspectSeams" style="width:100%;margin-bottom:8px">Inspect seams</button><label class="ux2-slider">Repeat visibility <input id="ux2Neighbour" type="range" min="15" max="100" value="${$('neighborOpacity')?.value||35}"></label><label class="ux2-check"><input id="ux2TileEdge" type="checkbox" ${$('showTileBorder')?.checked?'checked':''}> Centre tile edge</label></div>`}<div class="ux2-panel-block"><div class="ux2-panel-label">Grid & snapping</div><label class="ux2-check"><input id="ux2GridOn" type="checkbox" ${$('gridOn')?.checked?'checked':''}> Show grid</label><select id="ux2GridCount" class="ux2-panel-select">${optionHtml('gridCount')}</select><label class="ux2-check"><input id="ux2SnapOn" type="checkbox" ${$('snapOn')?.checked?'checked':''}> Smart snapping</label></div><div class="ux2-panel-block"><div class="ux2-panel-label">Mirror while drawing</div><select id="ux2Symmetry" class="ux2-panel-select">${optionHtml('symmetry')}</select><label class="ux2-check"><input id="ux2SymmetryGuides" type="checkbox" ${$('symmetryGuides')?.checked?'checked':''}> Show mirror guides</label></div><div class="ux2-panel-block"><div class="ux2-panel-label">Construction guides</div><select id="ux2ConstructionGuide" class="ux2-panel-select">${optionHtml('constructionGuide')}</select><label class="ux2-slider">Guide opacity <input id="ux2GuideOpacity" type="range" min="10" max="100" value="${$('guideOpacity')?.value||55}"></label></div><div class="ux2-panel-block"><div class="ux2-panel-label">Canvas background</div><input id="ux2Background" type="color" value="${$('bg')?.value||'#ffffff'}" class="ux2-colour-input"><label class="ux2-check"><input id="ux2Transparent" type="checkbox" ${$('transparent')?.checked?'checked':''}> Transparent background</label></div>`;
  }''',
'pattern depth')

insert_anchor='''  function exportPanel(){return `<div class="ux2-panel-block"><div class="ux2-panel-label">Artwork</div>'''
images_function='''  function imagesPanel(){
    const sources=[...document.querySelectorAll('#assetGrid .asset')];
    const cards=sources.map((a,i)=>`<button class="ux2-asset-card" data-ux2-asset="${i}">${a.innerHTML}</button>`).join('')||'<p class="ux2-muted-copy">No imported images yet. Add PNG, JPG, WebP or SVG artwork.</p>';
    const doodle=document.body.classList.contains('doodle-project');
    return `<div class="ux2-panel-block"><button class="ux2-btn primary" id="ux2PanelAddImage" style="width:100%">Add images</button></div><div class="ux2-panel-block"><div class="ux2-panel-label">Project image library</div><div class="ux2-asset-grid">${cards}</div></div>${doodle?'':`<div class="ux2-panel-block"><div class="ux2-panel-label">Optional scatter</div><div class="ux2-two-col"><label class="ux2-field-label">Copies<input id="ux2Copies" class="ux2-panel-input" type="number" min="1" max="500" value="${$('count')?.value||28}"></label><label class="ux2-field-label">Seed<input id="ux2Seed" class="ux2-panel-input" value="${$('seed')?.value||'pattern-01'}"></label></div><div class="ux2-two-col"><label class="ux2-field-label">Min scale %<input id="ux2MinScale" class="ux2-panel-input" type="number" value="${$('minScale')?.value||18}"></label><label class="ux2-field-label">Max scale %<input id="ux2MaxScale" class="ux2-panel-input" type="number" value="${$('maxScale')?.value||42}"></label></div><label class="ux2-slider">Rotation ± <input id="ux2Rotation" type="range" min="0" max="180" value="${$('rotationAmount')?.value||25}"></label><button class="ux2-btn" id="ux2GenerateScatter" style="width:100%;margin-top:8px">Generate seamless scatter</button></div>`}`;
  }

'''
if images_function.strip() not in s:
    if insert_anchor not in s: raise SystemExit('Missing export anchor for images panel')
    s=s.replace(insert_anchor,images_function+insert_anchor,1)

replace_once(
'''    $('ux2PaletteTitle').textContent=name==='colour'?'Colour':name==='layers'?'Layers':name==='pattern'?'Pattern':'Export';
    body.innerHTML=name==='colour'?colourPanel():name==='layers'?layerPanel():name==='pattern'?patternPanel():exportPanel();''',
'''    $('ux2PaletteTitle').textContent=name==='colour'?'Colour':name==='layers'?'Layers':name==='pattern'?'Pattern':name==='images'?'Images':'Export';
    body.innerHTML=name==='colour'?colourPanel():name==='layers'?layerPanel():name==='pattern'?patternPanel():name==='images'?imagesPanel():exportPanel();''',
'panel routing')

replace_once(
'''    if(name==='colour'){$('ux2ColourInput').addEventListener('input',e=>dispatchValue('ink',e.target.value));$('ux2Eyedropper').addEventListener('click',()=>setTool('eyedropper'));populateSwatches()}
    if(name==='layers'){
      document.querySelectorAll('[data-layer-index]').forEach(b=>b.addEventListener('click',()=>{const row=document.querySelectorAll('#layerList .layerRow')[Number(b.dataset.layerIndex)];if(row)row.click();openPanel('layers')}));
      $('ux2AddLayer').addEventListener('click',()=>{clickOld('layerAdd');openPanel('layers')});$('ux2LayerDuplicate').addEventListener('click',()=>{clickOld('layerDuplicate');openPanel('layers')});$('ux2LayerDelete').addEventListener('click',()=>{clickOld('layerDelete');openPanel('layers')});$('ux2LayerOpacity').addEventListener('input',e=>dispatchValue('layerOpacity',e.target.value));
    }
    if(name==='pattern'&&!document.body.classList.contains('doodle-project')){$('ux2FullPreview')?.addEventListener('click',()=>clickOld('repeatPreviewToggle'));$('ux2Neighbour')?.addEventListener('input',e=>dispatchValue('neighborOpacity',e.target.value));$('ux2TileEdge')?.addEventListener('change',e=>dispatchChecked('showTileBorder',e.target.checked))}
    if(name==='export')document.querySelectorAll('[data-export-old]').forEach(b=>b.addEventListener('click',()=>clickOld(b.dataset.exportOld)));''',
'''    if(name==='colour'){
      $('ux2ColourInput').addEventListener('input',e=>dispatchValue('ink',e.target.value));$('ux2Eyedropper').addEventListener('click',()=>setTool('eyedropper'));populateSwatches();
      $('ux2AddPaletteColour')?.addEventListener('click',()=>clickOld('addPaletteColour'));$('ux2SavePalette')?.addEventListener('click',()=>clickOld('savePalette'));
      if($('ux2SavedPalette')){$('ux2SavedPalette').value=$('savedPaletteSelect')?.value||'default';$('ux2SavedPalette').addEventListener('change',e=>dispatchValue('savedPaletteSelect',e.target.value,'change'))}
    }
    if(name==='layers'){
      document.querySelectorAll('[data-layer-index]').forEach(b=>b.addEventListener('click',()=>{const row=document.querySelectorAll('#layerList .layerRow')[Number(b.dataset.layerIndex)];if(row)row.click();openPanel('layers')}));
      $('ux2AddLayer').addEventListener('click',()=>{clickOld('layerAdd');openPanel('layers')});$('ux2LayerDuplicate').addEventListener('click',()=>{clickOld('layerDuplicate');openPanel('layers')});$('ux2LayerDelete').addEventListener('click',()=>{clickOld('layerDelete');openPanel('layers')});$('ux2LayerUp').addEventListener('click',()=>{clickOld('layerUp');openPanel('layers')});$('ux2LayerDown').addEventListener('click',()=>{clickOld('layerDown');openPanel('layers')});
      $('ux2LayerOpacity').addEventListener('input',e=>dispatchValue('layerOpacity',e.target.value));$('ux2LayerName').addEventListener('change',e=>dispatchValue('layerName',e.target.value,'change'));$('ux2LayerVisible').addEventListener('change',e=>dispatchChecked('layerVisible',e.target.checked));$('ux2LayerLocked').addEventListener('change',e=>dispatchChecked('layerLocked',e.target.checked));$('ux2LayerExport').addEventListener('change',e=>dispatchChecked('layerExport',e.target.checked));
    }
    if(name==='pattern'){
      $('ux2FullPreview')?.addEventListener('click',()=>clickOld('repeatPreviewToggle'));$('ux2Neighbour')?.addEventListener('input',e=>dispatchValue('neighborOpacity',e.target.value));$('ux2TileEdge')?.addEventListener('change',e=>dispatchChecked('showTileBorder',e.target.checked));
      $('ux2InspectSeams')?.addEventListener('click',()=>{dispatchValue('neighborOpacity','100');dispatchChecked('showTileBorder',true);clickOld('repeatPreviewToggle')});
      $('ux2GridOn')?.addEventListener('change',e=>dispatchChecked('gridOn',e.target.checked));$('ux2GridCount')?.addEventListener('change',e=>dispatchValue('gridCount',e.target.value,'change'));$('ux2SnapOn')?.addEventListener('change',e=>dispatchChecked('snapOn',e.target.checked));$('ux2Symmetry')?.addEventListener('change',e=>dispatchValue('symmetry',e.target.value,'change'));$('ux2SymmetryGuides')?.addEventListener('change',e=>dispatchChecked('symmetryGuides',e.target.checked));$('ux2ConstructionGuide')?.addEventListener('change',e=>dispatchValue('constructionGuide',e.target.value,'change'));$('ux2GuideOpacity')?.addEventListener('input',e=>dispatchValue('guideOpacity',e.target.value));$('ux2Background')?.addEventListener('input',e=>dispatchValue('bg',e.target.value));$('ux2Transparent')?.addEventListener('change',e=>dispatchChecked('transparent',e.target.checked));
    }
    if(name==='images'){
      $('ux2PanelAddImage')?.addEventListener('click',()=>clickOld('files'));document.querySelectorAll('[data-ux2-asset]').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('#assetGrid .asset')[Number(b.dataset.ux2Asset)]?.click()));
      $('ux2Copies')?.addEventListener('change',e=>dispatchValue('count',e.target.value,'change'));$('ux2Seed')?.addEventListener('change',e=>dispatchValue('seed',e.target.value,'change'));$('ux2MinScale')?.addEventListener('change',e=>dispatchValue('minScale',e.target.value,'change'));$('ux2MaxScale')?.addEventListener('change',e=>dispatchValue('maxScale',e.target.value,'change'));$('ux2Rotation')?.addEventListener('input',e=>dispatchValue('rotationAmount',e.target.value));$('ux2GenerateScatter')?.addEventListener('click',()=>clickOld('generate'));
    }
    if(name==='export')document.querySelectorAll('[data-export-old]').forEach(b=>b.addEventListener('click',()=>clickOld(b.dataset.exportOld)));''',
'panel event depth')

js_path.write_text(s, encoding='utf-8')

css_path=Path('app/assets/canvas-first-v2.css')
css=css_path.read_text(encoding='utf-8')
extra='''
.ux2-btn-icon{display:inline-flex;align-items:center;gap:6px}.ux2-btn-icon svg{width:16px;height:16px}.ux2-palette-close svg{width:18px;height:18px;display:block;margin:auto}
.ux2-panel-input,.ux2-panel-select{width:100%;min-height:38px;border:1px solid #cbd4dd;border-radius:9px;background:#fff;color:#263442;padding:7px 9px;font:inherit;font-size:12px}.ux2-field-label{display:grid;gap:5px;color:#697687;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin:8px 0}.ux2-check{display:flex;align-items:center;gap:8px;margin-top:9px;font-size:12px;color:#425264}.ux2-check input{accent-color:var(--ux2-blue-deep)}.ux2-check-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px}.ux2-panel-actions{display:flex;gap:6px;margin-top:8px}.ux2-panel-actions>*{flex:1}.ux2-colour-input{width:100%;height:58px;border:1px solid #c7d0da;border-radius:12px;padding:4px;background:#fff}.ux2-muted-copy{color:#687483;font-size:12px;line-height:1.45}.ux2-two-col{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ux2-asset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;max-height:230px;overflow:auto}.ux2-asset-card{min-width:0;aspect-ratio:1;border:1px solid #cbd4dd;border-radius:10px;background:#fff;padding:5px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.ux2-asset-card img{max-width:100%;max-height:70%;object-fit:contain}.ux2-asset-card span{font-size:9px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ux2-palette .ux2-slider{margin-top:8px}.ux2-dock svg{width:22px;height:22px}
@media(orientation:landscape) and (max-height:600px){.ux2-btn-icon span{display:none}.ux2-check-grid{grid-template-columns:1fr}.ux2-panel-input,.ux2-panel-select{min-height:32px;font-size:10px}.ux2-asset-grid{grid-template-columns:repeat(4,1fr)}}
'''
if '.ux2-panel-input' not in css: css += extra
css_path.write_text(css, encoding='utf-8')
print('Enhanced canvas-first v2 feature exposure')
