from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '<meta name="app-version" content="1.2.0-alpha.2">',
    '<meta name="app-version" content="1.2.0-alpha.3">',
    "version",
)

replace_once(
    '  .selectedBox{padding:10px;border:1px solid var(--line);border-radius:12px;background:#faf9f6}\n  .empty{font-size:.78rem;color:var(--muted)}',
    '''  .selectedBox{padding:10px;border:1px solid var(--line);border-radius:12px;background:#faf9f6}\n  .layerPanel{padding:10px;border:1px solid var(--line);border-radius:12px;background:#faf9f6}\n  .layerList{display:grid;gap:5px;margin-bottom:8px}\n  .layerRow{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;border:1px solid var(--line);border-radius:9px;background:#fff;padding:7px 8px;color:var(--ink)}\n  .layerRow.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset;background:#f1f7f4}\n  .layerRowName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.78rem;font-weight:750}\n  .layerRowMeta{flex:none;color:var(--muted);font-size:.64rem;white-space:nowrap}\n  .layerActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:6px 0}\n  .layerActions.two{grid-template-columns:repeat(2,minmax(0,1fr))}\n  .layerActions .btn{min-width:0;padding:6px 4px;font-size:.7rem}\n  .layerFlags{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:7px}\n  .layerFlags .check{font-size:.68rem;gap:4px;min-width:0}\n  .layerFlags .check input{width:16px;height:16px;flex:none}\n  .empty{font-size:.78rem;color:var(--muted)}''',
    "layer css",
)

replace_once(
    '''      <div id="selectedPanel" class="selectedBox">\n        <div class="empty">Tap a motif in the tile to edit it.</div>\n      </div>\n\n      <h3>Live repeat preview</h3>''',
    '''      <div id="selectedPanel" class="selectedBox">\n        <div class="empty">Tap a motif in the tile to edit it.</div>\n      </div>\n\n      <h3>Layers</h3>\n      <div class="layerPanel">\n        <div id="layerList" class="layerList" aria-label="Artwork layers"></div>\n        <div class="layerActions">\n          <button id="layerAdd" class="btn" type="button">+ Layer</button>\n          <button id="layerDuplicate" class="btn" type="button">Duplicate</button>\n          <button id="layerDelete" class="btn danger" type="button">Delete</button>\n        </div>\n        <div class="layerActions two">\n          <button id="layerUp" class="btn" type="button">Move up</button>\n          <button id="layerDown" class="btn" type="button">Move down</button>\n        </div>\n        <div class="field">\n          <label for="layerName">Layer name</label>\n          <input id="layerName" type="text" maxlength="80" autocomplete="off">\n        </div>\n        <div class="field">\n          <label for="layerOpacity">Layer opacity <span id="layerOpacityValue">100%</span></label>\n          <input id="layerOpacity" type="range" min="0" max="100" value="100">\n        </div>\n        <div class="layerFlags">\n          <label class="check"><input id="layerVisible" type="checkbox" checked> Visible</label>\n          <label class="check"><input id="layerLocked" type="checkbox"> Lock</label>\n          <label class="check"><input id="layerExport" type="checkbox" checked> Export</label>\n        </div>\n        <p id="layerSummary" class="help">Select a layer to draw into it. Layers at the top are rendered in front.</p>\n      </div>\n\n      <h3>Live repeat preview</h3>''',
    "layer html",
)

replace_once(
    '''    pendingPreview: false, pendingSelected: false\n  };\n\n  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }''',
    '''    pendingPreview: false, pendingSelected: false\n  };\n\n  function newLayerId(){return "layer-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}\n  function activeLayer(){return layerById(state.activeLayerId)||state.layers[state.layers.length-1]||null;}\n  function layerArtworkCount(id){return state.items.filter(item=>item.layerId===id).length+state.marks.filter(mark=>mark.layerId===id).length;}\n  function rebuildLayerUI(){\n    const list=$("layerList");if(!list)return;\n    if(!layerById(state.activeLayerId)&&state.layers.length)state.activeLayerId=state.layers[state.layers.length-1].id;\n    list.innerHTML="";\n    [...state.layers].reverse().forEach(layer=>{\n      const button=document.createElement("button");button.type="button";button.className="layerRow"+(layer.id===state.activeLayerId?" active":"");\n      const name=document.createElement("span");name.className="layerRowName";name.textContent=layer.name;\n      const flags=[];if(layer.visible===false)flags.push("hidden");if(layer.locked)flags.push("locked");if(layer.export===false)flags.push("no export");\n      const meta=document.createElement("span");meta.className="layerRowMeta";meta.textContent=`${layerArtworkCount(layer.id)} item${layerArtworkCount(layer.id)===1?"":"s"}${flags.length?" · "+flags.join(" · "):""}`;\n      button.append(name,meta);\n      button.addEventListener("click",()=>{state.activeLayerId=layer.id;rebuildLayerUI();scheduleAutosave();setStatus(`“${layer.name}” is the active layer.`);});\n      list.appendChild(button);\n    });\n    const layer=activeLayer(),index=layer?state.layers.indexOf(layer):-1;\n    const controls=["layerName","layerOpacity","layerVisible","layerLocked","layerExport","layerDuplicate","layerDelete","layerUp","layerDown"];\n    controls.forEach(id=>$(id).disabled=!layer);\n    if(!layer)return;\n    $("layerName").value=layer.name;$("layerOpacity").value=Math.round(layer.opacity*100);$("layerOpacityValue").textContent=Math.round(layer.opacity*100)+"%";\n    $("layerVisible").checked=layer.visible!==false;$("layerLocked").checked=!!layer.locked;$("layerExport").checked=layer.export!==false;\n    $("layerDelete").disabled=state.layers.length<=1;$("layerUp").disabled=index>=state.layers.length-1;$("layerDown").disabled=index<=0;\n    $("layerSummary").textContent=`${layerArtworkCount(layer.id)} artwork item${layerArtworkCount(layer.id)===1?"":"s"}. Layers at the top are rendered in front.`;\n  }\n  function addLayer(){\n    saveHistory();const layer={id:newLayerId(),name:`Layer ${state.layers.length+1}`,visible:true,opacity:1,locked:false,export:true};\n    state.layers.push(layer);state.activeLayerId=layer.id;renderAll();setStatus(`Added “${layer.name}”.`);\n  }\n  function duplicateActiveLayer(){\n    const source=activeLayer();if(!source)return;saveHistory();\n    const layer={...source,id:newLayerId(),name:(source.name+" copy").slice(0,80)};const index=state.layers.indexOf(source);state.layers.splice(index+1,0,layer);\n    const itemCopies=state.items.filter(item=>item.layerId===source.id).map(item=>({...item,id:state.nextId++,layerId:layer.id}));\n    const markCopies=state.marks.filter(mark=>mark.layerId===source.id).map(mark=>({...JSON.parse(JSON.stringify(mark)),id:state.nextId++,layerId:layer.id}));\n    state.items.push(...itemCopies);state.marks.push(...markCopies);state.activeLayerId=layer.id;state.selectedId=null;renderAll();setStatus(`Duplicated “${source.name}”.`);\n  }\n  function deleteActiveLayer(){\n    const layer=activeLayer();if(!layer||state.layers.length<=1)return;const count=layerArtworkCount(layer.id);\n    if(count&&typeof confirm==="function"&&!confirm(`Delete “${layer.name}” and its ${count} artwork item${count===1?"":"s"}?`))return;\n    saveHistory();const index=state.layers.indexOf(layer);state.items=state.items.filter(item=>item.layerId!==layer.id);state.marks=state.marks.filter(mark=>mark.layerId!==layer.id);state.layers.splice(index,1);\n    state.activeLayerId=state.layers[Math.min(index,state.layers.length-1)].id;state.selectedId=null;renderAll();setStatus(`Deleted “${layer.name}”.`);\n  }\n  function moveActiveLayer(direction){\n    const layer=activeLayer();if(!layer)return;const index=state.layers.indexOf(layer),next=index+direction;if(next<0||next>=state.layers.length)return;\n    saveHistory();[state.layers[index],state.layers[next]]=[state.layers[next],state.layers[index]];renderAll();setStatus(direction>0?"Layer moved up.":"Layer moved down.");\n  }\n  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }''',
    "layer functions",
)

replace_once(
    '''      updateQuality();\n      if(state.pendingSelected)rebuildSelectedPanel();\n      state.pendingPreview=false;state.pendingSelected=false;''',
    '''      updateQuality();\n      if(state.pendingSelected){rebuildSelectedPanel();rebuildLayerUI();}\n      state.pendingPreview=false;state.pendingSelected=false;''',
    "render ui refresh",
)

replace_once(
    '''    saveHistory();\n    const markStart=canonicalPoint(w.x,w.y);\n    const mark={id:state.nextId++,layerId:layerById(state.activeLayerId)?.id||BASE_LAYER_IDS.drawing,type:state.tool,''',
    '''    const drawLayer=activeLayer();\n    if(!drawLayer||drawLayer.visible===false||drawLayer.locked){setStatus(!drawLayer?"Choose an active layer before drawing.":drawLayer.locked?`“${drawLayer.name}” is locked. Unlock it to draw.`:`“${drawLayer.name}” is hidden. Make it visible to draw.`);state.dragStart=null;return;}\n    saveHistory();\n    const markStart=canonicalPoint(w.x,w.y);\n    const mark={id:state.nextId++,layerId:drawLayer.id,type:state.tool,''',
    "locked drawing guard",
)

replace_once(
    '''  loadSavedPalettes();rebuildPaletteUI();''',
    '''  $("layerAdd").addEventListener("click",addLayer);\n  $("layerDuplicate").addEventListener("click",duplicateActiveLayer);\n  $("layerDelete").addEventListener("click",deleteActiveLayer);\n  $("layerUp").addEventListener("click",()=>moveActiveLayer(1));\n  $("layerDown").addEventListener("click",()=>moveActiveLayer(-1));\n  $("layerName").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;const name=$("layerName").value.trim();if(!name){$("layerName").value=layer.name;return;}saveHistory();layer.name=name.slice(0,80);renderAll();setStatus(`Layer renamed to “${layer.name}”.`);});\n  $("layerOpacity").addEventListener("input",()=>{$("layerOpacityValue").textContent=$("layerOpacity").value+"%";});\n  $("layerOpacity").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.opacity=clamp(Number($("layerOpacity").value)/100,0,1);renderAll();});\n  $("layerVisible").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.visible=$("layerVisible").checked;if(!layer.visible&&selectedItem()?.layerId===layer.id)state.selectedId=null;renderAll();});\n  $("layerLocked").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.locked=$("layerLocked").checked;renderAll();});\n  $("layerExport").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.export=$("layerExport").checked;renderAll();});\n  rebuildLayerUI();\n  loadSavedPalettes();rebuildPaletteUI();''',
    "layer event listeners",
)

required = [
    'content="1.2.0-alpha.3"',
    'id="layerList"',
    'function rebuildLayerUI()',
    'function duplicateActiveLayer()',
    'function deleteActiveLayer()',
    'function moveActiveLayer(direction)',
    'drawLayer.locked',
    'layer.export=$("layerExport").checked',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"post-patch assertion failed: {needle}")

path.write_text(text, encoding="utf-8")
print("alpha.3 layer UI patch applied")
