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
    '<meta name="app-version" content="1.2.0-alpha.4">',
    '<meta name="app-version" content="1.2.0-alpha.4.1">',
    "version",
)

replace_once(
    '<h2>Selected motif</h2>\n      <div id="selectedPanel" class="selectedBox">\n        <div class="empty">Tap a motif in the tile to edit it.</div>',
    '<h2>Selected artwork</h2>\n      <div id="selectedPanel" class="selectedBox">\n        <div class="empty">Tap an imported motif or drawn mark in the tile to edit it.</div>',
    "selected artwork heading",
)

replace_once(
    '  function selectedItem(){ return state.items.find(i=>i.id===state.selectedId)||null; }',
    '  function selectedItem(){ return state.items.find(i=>i.id===state.selectedId)||null; }\n  function selectedMark(){ return state.marks.find(m=>m.id===state.selectedId)||null; }',
    "selected mark helper",
)

replace_once(
    '''  function markSvgTransform(m){
    const b=markGeometryBounds(m),t=markTransformValues(m),deg=t.rotation*180/Math.PI;
    return `translate(${b.cx+t.x} ${b.cy+t.y}) rotate(${deg}) scale(${t.scale}) translate(${-b.cx} ${-b.cy})`;
  }

  function drawMark(c,m,alphaMultiplier=1){''',
    '''  function markSvgTransform(m){
    const b=markGeometryBounds(m),t=markTransformValues(m),deg=t.rotation*180/Math.PI;
    return `translate(${b.cx+t.x} ${b.cy+t.y}) rotate(${deg}) scale(${t.scale}) translate(${-b.cx} ${-b.cy})`;
  }
  function inverseMarkTransformPoint(p,m){
    const b=markGeometryBounds(m),t=markTransformValues(m),dx=p.x-(b.cx+t.x),dy=p.y-(b.cy+t.y),c=Math.cos(-t.rotation),s=Math.sin(-t.rotation);
    return {x:b.cx+(dx*c-dy*s)/t.scale,y:b.cy+(dx*s+dy*c)/t.scale};
  }
  function unreflectPoint(p,mirrorX,mirrorY,angle){
    let x=p.x-TILE/2,y=p.y-TILE/2;const c=Math.cos(-angle),s=Math.sin(-angle),rx=x*c-y*s,ry=x*s+y*c;x=mirrorX?-rx:rx;y=mirrorY?-ry:ry;
    return {x:TILE/2+x,y:TILE/2+y};
  }
  function normaliseMarkTranslation(m){
    const b=markGeometryBounds(m),t=markTransformValues(m),centre={x:b.cx+t.x,y:b.cy+t.y},canonical=canonicalPoint(centre.x,centre.y);
    m.transformX=t.x+canonical.x-centre.x;m.transformY=t.y+canonical.y-centre.y;
  }
  function markPrimaryBounds(m){
    const b=markTransformedBounds(m),canonical=canonicalPoint(b.cx,b.cy),dx=canonical.x-b.cx,dy=canonical.y-b.cy;
    return {minX:b.minX+dx,maxX:b.maxX+dx,minY:b.minY+dy,maxY:b.maxY+dy,cx:b.cx+dx,cy:b.cy+dy};
  }

  function drawMark(c,m,alphaMultiplier=1){''',
    "inverse mark transform helpers",
)

replace_once(
    '''      ctx.restore();
    }
    ctx.restore();
  }

  function drawImageTransformHandle''',
    '''      ctx.restore();
    }
    const mark=selectedMark();
    if(mark){
      const layer=layerForArtwork(mark,BASE_LAYER_IDS.drawing);
      if(layerIsRenderable(layer,false)&&!layer.locked)drawSelectedMarkOverlay(ctx,mark,sc);
    }
    ctx.restore();
  }

  function drawImageTransformHandle''',
    "selected mark editor overlay call",
)

replace_once(
    '''  function symmetryTransforms(){''',
    '''  function drawSelectedMarkOverlay(c,m,sc){
    const b=markPrimaryBounds(m),w=Math.max(1,b.maxX-b.minX),h=Math.max(1,b.maxY-b.minY);
    c.save();c.setLineDash([7/sc,5/sc]);c.strokeStyle="#cc523e";c.lineWidth=2/sc;c.strokeRect(b.minX,b.minY,w,h);c.setLineDash([]);
    for(const [x,y] of [[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]]){
      c.beginPath();c.arc(x,y,8/sc,0,Math.PI*2);c.fillStyle="#fff";c.fill();c.strokeStyle="#173d36";c.lineWidth=2/sc;c.stroke();
    }
    drawImageTransformHandle(c,b.cx,b.minY-22/sc,"rotate",sc);drawImageTransformHandle(c,b.cx,b.maxY+22/sc,"move",sc);c.restore();
  }
  function markHandleAt(m,x,y){
    const b=markPrimaryBounds(m),limit=20/viewScale();
    if(Math.hypot(x-b.cx,y-(b.minY-22/viewScale()))<=limit)return "rotate";
    if(Math.hypot(x-b.cx,y-(b.maxY+22/viewScale()))<=limit)return "move";
    return null;
  }
  function markResizeHandleHit(m,x,y){
    const b=markPrimaryBounds(m),limit=25/viewScale();
    return [[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]].some(([cx,cy])=>Math.hypot(x-cx,y-cy)<=limit);
  }

  function symmetryTransforms(){''',
    "mark selection overlay helpers",
)

replace_once(
    '''  function rebuildSelectedPanel(){
    const panel=$("selectedPanel"), item=selectedItem();
    if(!item){ panel.innerHTML='<div class="empty">Select an imported image to scale, rotate or delete it. Use the drawing tools on the centre tile.</div>'; return; }''',
    '''  function rebuildSelectedPanel(){
    const panel=$("selectedPanel"), item=selectedItem(), mark=selectedMark();
    if(mark){
      const t=markTransformValues(mark),pct=Math.round(t.scale*100),rawDeg=t.rotation*180/Math.PI,deg=Math.round(((rawDeg+180)%360+360)%360-180),layer=layerForArtwork(mark,BASE_LAYER_IDS.drawing);
      const typeName={brush:"Brush stroke",line:"Line",rect:"Rectangle",ellipse:"Ellipse",freefill:"Freehand fill",gradient:"Gradient fill"}[mark.type]||"Drawn mark";
      panel.innerHTML=`
        <div class="field">
          <label>Artwork</label>
          <div class="mini"><strong>${typeName}</strong> · ${escapeHtml(layer?.name||"Drawing")}</div>
          <p class="help">Drag the mark to move it, use the curved-arrow handle to rotate, or a corner dot to resize. The original stroke points remain intact for seamless wrapping.</p>
        </div>
        <div class="field"><label for="selScale">Resize <span id="selScaleLabel">${pct}%</span></label><input id="selScale" type="range" min="1" max="600" value="${clamp(pct,1,600)}"></div>
        <div class="field"><label for="selRot">Rotation <span id="selRotLabel">${deg}°</span></label><input id="selRot" type="range" min="-180" max="180" value="${clamp(deg,-180,180)}"></div>
        <div class="field"><label for="selOpacity">Opacity <span id="selOpacityLabel">${Math.round((mark.opacity??1)*100)}%</span></label><input id="selOpacity" type="range" min="5" max="100" value="${Math.round((mark.opacity??1)*100)}"></div>
        <div class="btns"><button id="duplicateSel" class="btn">Duplicate</button><button id="deleteSel" class="btn danger">Delete</button><button id="frontSel" class="btn">Bring front</button><button id="backSel" class="btn">Send back</button></div>`;
      $("selScale").addEventListener("input",e=>{mark.transformScale=clamp(parseFloat(e.target.value)/100,.01,60);$("selScaleLabel").textContent=e.target.value+"%";renderAll(false);});
      $("selRot").addEventListener("input",e=>{mark.transformRotation=parseFloat(e.target.value)*Math.PI/180;$("selRotLabel").textContent=e.target.value+"°";renderAll(false);});
      $("selOpacity").addEventListener("input",e=>{mark.opacity=parseFloat(e.target.value)/100;$("selOpacityLabel").textContent=e.target.value+"%";renderAll(false);});
      $("duplicateSel").onclick=()=>{saveHistory();const base=markTransformValues(mark),copy={...JSON.parse(JSON.stringify(mark)),id:state.nextId++,transformX:base.x+40,transformY:base.y+40,transformScale:base.scale,transformRotation:base.rotation};state.marks.push(copy);state.selectedId=copy.id;renderAll();};
      $("deleteSel").onclick=()=>{saveHistory();state.marks=state.marks.filter(m=>m.id!==mark.id);state.selectedId=null;renderAll();};
      $("frontSel").onclick=()=>{saveHistory();state.marks=state.marks.filter(m=>m.id!==mark.id);state.marks.push(mark);renderAll();};
      $("backSel").onclick=()=>{saveHistory();state.marks=state.marks.filter(m=>m.id!==mark.id);state.marks.unshift(mark);renderAll();};
      return;
    }
    if(!item){ panel.innerHTML='<div class="empty">Select an imported motif or drawn mark to move, resize, rotate or delete it.</div>'; return; }''',
    "selected mark panel",
)

old_hit = '''  function hitTest(x,y){
    for(let layerIndex=state.layers.length-1;layerIndex>=0;layerIndex--){
      const layer=state.layers[layerIndex];if(!layerIsRenderable(layer,false)||layer.locked)continue;
      for(let idx=state.items.length-1;idx>=0;idx--){
        const item=state.items[idx],itemLayer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item);
        if(!a||itemLayer?.id!==layer.id)continue;
        const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y;
        const cos=Math.cos(-item.rotation),sin=Math.sin(-item.rotation);
        const lx=dx*cos-dy*sin, ly=dx*sin+dy*cos;
        const iw=a.w*item.scale,ih=a.h*item.scale;
        if(Math.abs(lx)<=iw/2 && Math.abs(ly)<=ih/2)return item;
      }
    }
    return null;
  }'''
new_hit = '''  function pointSegmentDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(len2<1e-9)return Math.hypot(p.x-a.x,p.y-a.y);
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len2,0,1),x=a.x+t*dx,y=a.y+t*dy;return Math.hypot(p.x-x,p.y-y);
  }
  function pointInPolygon(p,points){
    let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j],cross=((a.y>p.y)!=(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/((b.y-a.y)||1e-9)+a.x);if(cross)inside=!inside;
    }return inside;
  }
  function rawMarkHit(m,p,tolerance){
    const pts=m.points||[];if(!pts.length)return false;const first=pts[0],last=pts[pts.length-1],brush=m.brushStyle||"ink",strokeFactor=m.type==="brush"?(brush==="marker"?1.8:brush==="pencil"?.72:1):1,strokeRadius=Math.max(tolerance,(Number(m.width)||1)*strokeFactor/2);
    if(m.type==="rect"){
      const left=Math.min(first.x,last.x),right=Math.max(first.x,last.x),top=Math.min(first.y,last.y),bottom=Math.max(first.y,last.y),inside=p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;if(m.fill)return inside;
      return (p.x>=left-tolerance&&p.x<=right+tolerance&&(Math.abs(p.y-top)<=strokeRadius||Math.abs(p.y-bottom)<=strokeRadius))||(p.y>=top-tolerance&&p.y<=bottom+tolerance&&(Math.abs(p.x-left)<=strokeRadius||Math.abs(p.x-right)<=strokeRadius));
    }
    if(m.type==="ellipse"){
      const cx=(first.x+last.x)/2,cy=(first.y+last.y)/2,rx=Math.max(.1,Math.abs(last.x-first.x)/2),ry=Math.max(.1,Math.abs(last.y-first.y)/2),q=Math.sqrt(((p.x-cx)/rx)**2+((p.y-cy)/ry)**2);if(m.fill)return q<=1;return Math.abs(q-1)*Math.min(rx,ry)<=strokeRadius;
    }
    if(m.type==="freefill"||m.type==="gradient")return pts.length>=3&&pointInPolygon(p,pts);
    if(pts.length===1)return Math.hypot(p.x-first.x,p.y-first.y)<=strokeRadius;
    for(let i=1;i<pts.length;i++)if(pointSegmentDistance(p,pts[i-1],pts[i])<=strokeRadius)return true;return false;
  }
  function markHitTest(m,x,y){
    const t=markTransformValues(m),base=markGeometryBounds(m),transformedCentre=markTransformPoint({x:base.cx,y:base.cy},m),tolerance=Math.max(7/viewScale()/t.scale,(Number(m.width)||1)/2);
    for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
      const centre=reflectPoint(transformedCentre,mirrorX,mirrorY,angle),delta=nearestLatticeDelta(x,y,centre.x,centre.y),periodicPoint={x:centre.x+delta.x,y:centre.y+delta.y},unsym=unreflectPoint(periodicPoint,mirrorX,mirrorY,angle),raw=inverseMarkTransformPoint(unsym,m);
      if(rawMarkHit(m,raw,tolerance))return true;
    }
    return false;
  }
  function hitTestArtwork(x,y){
    for(let layerIndex=state.layers.length-1;layerIndex>=0;layerIndex--){
      const layer=state.layers[layerIndex];if(!layerIsRenderable(layer,false)||layer.locked)continue;
      for(let idx=state.marks.length-1;idx>=0;idx--){const mark=state.marks[idx];if(layerForArtwork(mark,BASE_LAYER_IDS.drawing)?.id===layer.id&&markHitTest(mark,x,y))return {kind:"mark",artwork:mark};}
      for(let idx=state.items.length-1;idx>=0;idx--){
        const item=state.items[idx],itemLayer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item);if(!a||itemLayer?.id!==layer.id)continue;
        const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y,cos=Math.cos(-item.rotation),sin=Math.sin(-item.rotation),lx=dx*cos-dy*sin,ly=dx*sin+dy*cos,iw=a.w*item.scale,ih=a.h*item.scale;
        if(Math.abs(lx)<=iw/2&&Math.abs(ly)<=ih/2)return {kind:"item",artwork:item};
      }
    }
    return null;
  }'''
replace_once(old_hit,new_hit,"combined artwork hit testing")

old_select = '''    if(state.tool==="select"){
      let current=selectedItem();
      const currentLayer=current?layerForArtwork(current,BASE_LAYER_IDS.motifs):null;
      if(current&&(!layerIsRenderable(currentLayer,false)||currentLayer.locked)){state.selectedId=null;current=null;}
      const handle=current&&imageHandleAt(current,w.x,w.y);
      if(handle){
        saveHistory();
        if(handle==="rotate"){
          const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);
          state.transformState={mode:"rotate",id:current.id,startRotation:current.rotation,startAngle:Math.atan2(delta.y,delta.x)};
        }else{
          state.transformState={mode:"move",id:current.id,offset:{x:w.x-current.x,y:w.y-current.y}};
        }
        state.dragging=false;state.resizeState=null;renderAll();return;
      }
      if(current&&resizeHandleHit(current,w.x,w.y)){
        const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);
        saveHistory();state.resizeState={id:current.id,scale:current.scale,startDistance:Math.max(1,Math.hypot(delta.x,delta.y))};
        state.dragging=false;renderAll();return;
      }
      const hit=hitTest(w.x,w.y);
      state.selectedId=hit?.id??null;
      state.dragging=!!hit;
      if(hit){saveHistory();state.dragOffset=nearestLatticeDelta(w.x,w.y,hit.x,hit.y);}
      renderAll();return;
    }'''
new_select = '''    if(state.tool==="select"){
      let current=selectedItem(),currentMark=selectedMark();
      const currentLayer=current?layerForArtwork(current,BASE_LAYER_IDS.motifs):currentMark?layerForArtwork(currentMark,BASE_LAYER_IDS.drawing):null;
      if((current||currentMark)&&(!layerIsRenderable(currentLayer,false)||currentLayer.locked)){state.selectedId=null;current=null;currentMark=null;}
      const markHandle=currentMark&&markHandleAt(currentMark,w.x,w.y);
      if(markHandle){
        saveHistory();const t=markTransformValues(currentMark),bounds=markPrimaryBounds(currentMark);
        if(markHandle==="rotate")state.transformState={kind:"mark",mode:"rotate",id:currentMark.id,startRotation:t.rotation,startAngle:Math.atan2(w.y-bounds.cy,w.x-bounds.cx),center:{x:bounds.cx,y:bounds.cy}};
        else state.transformState={kind:"mark",mode:"move",id:currentMark.id,startX:t.x,startY:t.y,startPointer:{x:w.x,y:w.y},baseCenter:{x:markGeometryBounds(currentMark).cx+t.x,y:markGeometryBounds(currentMark).cy+t.y}};
        state.dragging=false;state.resizeState=null;renderAll();return;
      }
      if(currentMark&&markResizeHandleHit(currentMark,w.x,w.y)){
        const t=markTransformValues(currentMark),bounds=markPrimaryBounds(currentMark);saveHistory();state.resizeState={kind:"mark",id:currentMark.id,scale:t.scale,startDistance:Math.max(1,Math.hypot(w.x-bounds.cx,w.y-bounds.cy)),center:{x:bounds.cx,y:bounds.cy}};state.dragging=false;renderAll();return;
      }
      const handle=current&&imageHandleAt(current,w.x,w.y);
      if(handle){
        saveHistory();
        if(handle==="rotate"){
          const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);
          state.transformState={kind:"item",mode:"rotate",id:current.id,startRotation:current.rotation,startAngle:Math.atan2(delta.y,delta.x)};
        }else state.transformState={kind:"item",mode:"move",id:current.id,offset:{x:w.x-current.x,y:w.y-current.y}};
        state.dragging=false;state.resizeState=null;renderAll();return;
      }
      if(current&&resizeHandleHit(current,w.x,w.y)){
        const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);saveHistory();state.resizeState={kind:"item",id:current.id,scale:current.scale,startDistance:Math.max(1,Math.hypot(delta.x,delta.y))};state.dragging=false;renderAll();return;
      }
      const hit=hitTestArtwork(w.x,w.y);state.selectedId=hit?.artwork?.id??null;state.dragging=hit?.kind==="item";
      if(hit?.kind==="item"){saveHistory();state.dragOffset=nearestLatticeDelta(w.x,w.y,hit.artwork.x,hit.artwork.y);}
      else if(hit?.kind==="mark"){
        saveHistory();const t=markTransformValues(hit.artwork),b=markGeometryBounds(hit.artwork);state.transformState={kind:"mark",mode:"move",id:hit.artwork.id,startX:t.x,startY:t.y,startPointer:{x:w.x,y:w.y},baseCenter:{x:b.cx+t.x,y:b.cy+t.y}};
      }
      renderAll();return;
    }'''
replace_once(old_select,new_select,"pointerdown drawn selection")

old_move = '''    if(state.transformState){
      const item=state.items.find(i=>i.id===state.transformState.id);if(!item)return;
      if(state.transformState.mode==="move"){
        const pos=canonicalPoint(snapCoordinate(w.x-state.transformState.offset.x),snapCoordinate(w.y-state.transformState.offset.y));
        item.x=pos.x;item.y=pos.y;
      }else{
        const delta=nearestLatticeDelta(w.x,w.y,item.x,item.y),angle=Math.atan2(delta.y,delta.x);
        item.rotation=state.transformState.startRotation+angle-state.transformState.startAngle;
      }
      renderAll(false,false);return;
    }
    if(state.resizeState){
      const item=state.items.find(i=>i.id===state.resizeState.id);if(!item)return;
      const delta=nearestLatticeDelta(w.x,w.y,item.x,item.y),dist=Math.hypot(delta.x,delta.y);
      item.scale=clamp(state.resizeState.scale*dist/state.resizeState.startDistance,.01,60);
      renderAll(false,false);return;
    }'''
new_move = '''    if(state.transformState){
      if(state.transformState.kind==="mark"){
        const mark=state.marks.find(m=>m.id===state.transformState.id);if(!mark)return;
        if(state.transformState.mode==="move"){
          const dx=w.x-state.transformState.startPointer.x,dy=w.y-state.transformState.startPointer.y,targetX=snapCoordinate(state.transformState.baseCenter.x+dx),targetY=snapCoordinate(state.transformState.baseCenter.y+dy);
          mark.transformX=state.transformState.startX+targetX-state.transformState.baseCenter.x;mark.transformY=state.transformState.startY+targetY-state.transformState.baseCenter.y;
        }else mark.transformRotation=state.transformState.startRotation+Math.atan2(w.y-state.transformState.center.y,w.x-state.transformState.center.x)-state.transformState.startAngle;
      }else{
        const item=state.items.find(i=>i.id===state.transformState.id);if(!item)return;
        if(state.transformState.mode==="move"){
          const pos=canonicalPoint(snapCoordinate(w.x-state.transformState.offset.x),snapCoordinate(w.y-state.transformState.offset.y));item.x=pos.x;item.y=pos.y;
        }else{
          const delta=nearestLatticeDelta(w.x,w.y,item.x,item.y),angle=Math.atan2(delta.y,delta.x);item.rotation=state.transformState.startRotation+angle-state.transformState.startAngle;
        }
      }
      renderAll(false,false);return;
    }
    if(state.resizeState){
      if(state.resizeState.kind==="mark"){
        const mark=state.marks.find(m=>m.id===state.resizeState.id);if(!mark)return;const dist=Math.hypot(w.x-state.resizeState.center.x,w.y-state.resizeState.center.y);mark.transformScale=clamp(state.resizeState.scale*dist/state.resizeState.startDistance,.01,60);
      }else{
        const item=state.items.find(i=>i.id===state.resizeState.id);if(!item)return;const delta=nearestLatticeDelta(w.x,w.y,item.x,item.y),dist=Math.hypot(delta.x,delta.y);item.scale=clamp(state.resizeState.scale*dist/state.resizeState.startDistance,.01,60);
      }
      renderAll(false,false);return;
    }'''
replace_once(old_move,new_move,"pointermove drawn transforms")

replace_once(
    '''  function endDrag(e){
    state.pointers.delete(e.pointerId);
    if(state.pointers.size<2)state.gesture=null;
    state.dragging=false;state.resizeState=null;state.transformState=null;state.activeMark=null;state.dragStart=null;
    renderAll();
  }''',
    '''  function endDrag(e){
    state.pointers.delete(e.pointerId);if(state.pointers.size<2)state.gesture=null;
    const transformedMarkId=state.transformState?.kind==="mark"?state.transformState.id:state.resizeState?.kind==="mark"?state.resizeState.id:null;if(transformedMarkId){const mark=state.marks.find(m=>m.id===transformedMarkId);if(mark)normaliseMarkTranslation(mark);}
    state.dragging=false;state.resizeState=null;state.transformState=null;state.activeMark=null;state.dragStart=null;renderAll();
  }''',
    "normalise mark after pointer transform",
)

replace_once(
    '''  $("layerVisible").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.visible=$("layerVisible").checked;if(!layer.visible&&selectedItem()?.layerId===layer.id)state.selectedId=null;renderAll();});
  $("layerLocked").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.locked=$("layerLocked").checked;if(layer.locked&&selectedItem()?.layerId===layer.id)state.selectedId=null;renderAll();});''',
    '''  $("layerVisible").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.visible=$("layerVisible").checked;const selectedLayerId=selectedItem()?.layerId||selectedMark()?.layerId;if(!layer.visible&&selectedLayerId===layer.id)state.selectedId=null;renderAll();});
  $("layerLocked").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.locked=$("layerLocked").checked;const selectedLayerId=selectedItem()?.layerId||selectedMark()?.layerId;if(layer.locked&&selectedLayerId===layer.id)state.selectedId=null;renderAll();});''',
    "layer flags clear mark selection",
)

required = [
    'content="1.2.0-alpha.4.1"',
    'function selectedMark()',
    'function hitTestArtwork(x,y)',
    'function markHitTest(m,x,y)',
    'function drawSelectedMarkOverlay(c,m,sc)',
    'state.transformState={kind:"mark",mode:"move"',
    'mark.transformScale=clamp',
    'normaliseMarkTranslation(mark)',
    'Tap an imported motif or drawn mark',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"post-patch assertion failed: {needle}")

path.write_text(text, encoding="utf-8")
print("alpha.4.1 drawn artwork selection and transforms applied")
