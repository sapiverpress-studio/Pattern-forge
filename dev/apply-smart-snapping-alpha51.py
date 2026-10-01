from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"guard failed for {label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '<meta name="app-version" content="1.2.0-alpha.5.0">',
    '<meta name="app-version" content="1.2.0-alpha.5.1">',
    'app version',
)

replace_once(
    '''      <label class="check"><input id="snapOn" type="checkbox"> Snap placement to grid</label>\n      <p class="help">Grid and snap are independent. Snap applies when moving imported artwork or drawn shapes.</p>''',
    '''      <label class="check"><input id="snapOn" type="checkbox"> Smart snapping</label>\n      <p class="help">Smart snapping uses the grid plus tile centre lines and tile edges. Temporary alignment guides appear while moved artwork is snapped. Grid visibility and snapping remain independent.</p>''',
    'smart snapping UI',
)

replace_once(
    '''    dragOffset: {x:0,y:0},\n    renderQueued: false,''',
    '''    dragOffset: {x:0,y:0},\n    snapGuides: {x:null,y:null},\n    renderQueued: false,''',
    'snap guide state',
)

replace_once(
    '''    drawConstructionGuides(ctx,sc);\n    drawSymmetryGuides(ctx,sc);\n    const item=selectedItem();''',
    '''    drawConstructionGuides(ctx,sc);\n    drawSymmetryGuides(ctx,sc);\n    drawSnapGuides(ctx,sc);\n    const item=selectedItem();''',
    'editor snap guides',
)

replace_once(
    '''  function snapCoordinate(v){\n    if(!$("snapOn").checked)return v;\n    const step=TILE/(parseInt($("gridCount").value,10)||16);\n    const target=Math.round(v/step)*step;\n    return Math.abs(target-v)<14/viewScale()?target:v;\n  }''',
    '''  function clearSnapGuides(){state.snapGuides={x:null,y:null};}\n  function smartSnapAxis(v,halfExtent){\n    if(!$("snapOn").checked)return {value:v,guide:null};\n    const strongLimit=18/viewScale(),gridLimit=10/viewScale();\n    const strong=[{value:TILE/2,guide:TILE/2}];\n    if(halfExtent<=TILE/2){strong.push({value:halfExtent,guide:0},{value:TILE-halfExtent,guide:TILE});}\n    let best=null;\n    for(const candidate of strong){\n      const distance=Math.abs(candidate.value-v);\n      if(distance<=strongLimit&&(!best||distance<best.distance))best={...candidate,distance};\n    }\n    if(best)return {value:best.value,guide:best.guide};\n    const step=TILE/(parseInt($("gridCount").value,10)||16),gridTarget=Math.round(v/step)*step;\n    return Math.abs(gridTarget-v)<=gridLimit?{value:gridTarget,guide:null}:{value:v,guide:null};\n  }\n  function smartSnapPosition(x,y,halfW=0,halfH=0){\n    const sx=smartSnapAxis(x,Math.max(0,halfW)),sy=smartSnapAxis(y,Math.max(0,halfH));\n    state.snapGuides={x:sx.guide,y:sy.guide};\n    return {x:sx.value,y:sy.value};\n  }\n  function itemSnapHalfExtents(item){\n    const a=assetOf(item);if(!a)return {x:0,y:0};\n    const iw=a.w*item.scale,ih=a.h*item.scale,c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation));\n    return {x:(iw*c+ih*s)/2,y:(iw*s+ih*c)/2};\n  }\n  function drawSnapGuides(c,sc){\n    const guides=state.snapGuides||{};if(!Number.isFinite(guides.x)&&!Number.isFinite(guides.y))return;\n    c.save();c.strokeStyle="rgba(204,82,62,.92)";c.lineWidth=2/sc;c.setLineDash([5/sc,4/sc]);c.beginPath();\n    if(Number.isFinite(guides.x)){c.moveTo(guides.x,0);c.lineTo(guides.x,TILE);}\n    if(Number.isFinite(guides.y)){c.moveTo(0,guides.y);c.lineTo(TILE,guides.y);}\n    c.stroke();c.restore();\n  }''',
    'smart snap engine',
)

replace_once(
    '''          const dx=w.x-state.transformState.startPointer.x,dy=w.y-state.transformState.startPointer.y,targetX=snapCoordinate(state.transformState.baseCenter.x+dx),targetY=snapCoordinate(state.transformState.baseCenter.y+dy);\n          mark.transformX=state.transformState.startX+targetX-state.transformState.baseCenter.x;mark.transformY=state.transformState.startY+targetY-state.transformState.baseCenter.y;''',
    '''          const dx=w.x-state.transformState.startPointer.x,dy=w.y-state.transformState.startPointer.y,bounds=markPrimaryBounds(mark),snapped=smartSnapPosition(state.transformState.baseCenter.x+dx,state.transformState.baseCenter.y+dy,(bounds.maxX-bounds.minX)/2,(bounds.maxY-bounds.minY)/2);\n          mark.transformX=state.transformState.startX+snapped.x-state.transformState.baseCenter.x;mark.transformY=state.transformState.startY+snapped.y-state.transformState.baseCenter.y;''',
    'drawn mark move snapping',
)

replace_once(
    '''          const pos=canonicalPoint(snapCoordinate(w.x-state.transformState.offset.x),snapCoordinate(w.y-state.transformState.offset.y));item.x=pos.x;item.y=pos.y;''',
    '''          const extents=itemSnapHalfExtents(item),snapped=smartSnapPosition(w.x-state.transformState.offset.x,w.y-state.transformState.offset.y,extents.x,extents.y),pos=canonicalPoint(snapped.x,snapped.y);item.x=pos.x;item.y=pos.y;''',
    'item move handle snapping',
)

replace_once(
    '''      item.x=((snapCoordinate(w.x-state.dragOffset.x)%TILE)+TILE)%TILE;\n      item.y=((snapCoordinate(w.y-state.dragOffset.y)%TILE)+TILE)%TILE;\n      renderAll(false,false);''',
    '''      const extents=itemSnapHalfExtents(item),snapped=smartSnapPosition(w.x-state.dragOffset.x,w.y-state.dragOffset.y,extents.x,extents.y);\n      item.x=((snapped.x%TILE)+TILE)%TILE;\n      item.y=((snapped.y%TILE)+TILE)%TILE;\n      renderAll(false,false);''',
    'direct item drag snapping',
)

replace_once(
    '''    state.dragging=false;state.resizeState=null;state.transformState=null;state.activeMark=null;state.dragStart=null;renderAll();''',
    '''    state.dragging=false;state.resizeState=null;state.transformState=null;state.activeMark=null;state.dragStart=null;clearSnapGuides();renderAll();''',
    'clear guides after drag',
)

replace_once(
    '''  $("guideOpacity").addEventListener("input",()=>{$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";renderAll();});\n  document.querySelectorAll("[data-tool]").forEach''',
    '''  $("guideOpacity").addEventListener("input",()=>{$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";renderAll();});\n  $("snapOn").addEventListener("change",()=>{if(!$("snapOn").checked)clearSnapGuides();renderAll(false,false);});\n  document.querySelectorAll("[data-tool]").forEach''',
    'snap toggle cleanup',
)

path.write_text(text, encoding="utf-8")
print("Applied smart snapping alpha.5.1 patch.")
