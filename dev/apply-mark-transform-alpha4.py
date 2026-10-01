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
    '<meta name="app-version" content="1.2.0-alpha.3">',
    '<meta name="app-version" content="1.2.0-alpha.4">',
    "version",
)

replace_once(
    '''  function drawMark(c,m,alphaMultiplier=1){''',
    '''  function markGeometryBounds(m){
    if(!m?.points?.length)return {minX:0,maxX:0,minY:0,maxY:0,cx:0,cy:0};
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of m.points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    return {minX,maxX,minY,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function markTransformValues(m){
    const rawScale=Number(m?.transformScale),rawRotation=Number(m?.transformRotation),rawX=Number(m?.transformX),rawY=Number(m?.transformY);
    return {x:Number.isFinite(rawX)?rawX:0,y:Number.isFinite(rawY)?rawY:0,scale:Number.isFinite(rawScale)?clamp(rawScale,.01,60):1,rotation:Number.isFinite(rawRotation)?rawRotation:0};
  }
  function markHasTransform(m){const t=markTransformValues(m);return Math.abs(t.x)>1e-9||Math.abs(t.y)>1e-9||Math.abs(t.scale-1)>1e-9||Math.abs(t.rotation)>1e-9;}
  function markTransformPoint(p,m){
    const b=markGeometryBounds(m),t=markTransformValues(m),dx=(p.x-b.cx)*t.scale,dy=(p.y-b.cy)*t.scale,c=Math.cos(t.rotation),s=Math.sin(t.rotation);
    return {x:b.cx+t.x+dx*c-dy*s,y:b.cy+t.y+dx*s+dy*c};
  }
  function markTransformedBounds(m,mirrorX=false,mirrorY=false,angle=0){
    const b=markGeometryBounds(m),pad=Math.max(.5,Number(m.width)||0),corners=[
      {x:b.minX-pad,y:b.minY-pad},{x:b.maxX+pad,y:b.minY-pad},{x:b.maxX+pad,y:b.maxY+pad},{x:b.minX-pad,y:b.maxY+pad}
    ].map(p=>reflectPoint(markTransformPoint(p,m),mirrorX,mirrorY,angle));
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of corners){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    return {minX,maxX,minY,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function applyMarkTransformContext(c,m){
    const b=markGeometryBounds(m),t=markTransformValues(m);if(!markHasTransform(m))return;
    c.translate(b.cx+t.x,b.cy+t.y);c.rotate(t.rotation);c.scale(t.scale,t.scale);c.translate(-b.cx,-b.cy);
  }
  function applySymmetryContext(c,mirrorX,mirrorY,angle){
    c.translate(TILE/2,TILE/2);c.rotate(angle);c.scale(mirrorX?-1:1,mirrorY?-1:1);c.translate(-TILE/2,-TILE/2);
  }
  function markSvgTransform(m){
    const b=markGeometryBounds(m),t=markTransformValues(m),deg=t.rotation*180/Math.PI;
    return `translate(${b.cx+t.x} ${b.cy+t.y}) rotate(${deg}) scale(${t.scale}) translate(${-b.cx} ${-b.cy})`;
  }

  function drawMark(c,m,alphaMultiplier=1){''',
    "mark transform helpers",
)

old_draw = '''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        const transformed={...m,points:m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle))};
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const p of transformed.points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
        const pad=m.width;minX-=pad;maxX+=pad;minY-=pad;maxY+=pad;
        const copies=latticeCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,basis);
        for(const copy of copies){c.save();c.translate(copy.x,copy.y);drawMark(c,transformed,effectiveOpacity);c.restore();}
      }'''
new_draw = '''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        if(!markHasTransform(m)){
          const transformed={...m,points:m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle))};
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
          for(const p of transformed.points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
          const pad=m.width;minX-=pad;maxX+=pad;minY-=pad;maxY+=pad;
          const copies=latticeCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,basis);
          for(const copy of copies){c.save();c.translate(copy.x,copy.y);drawMark(c,transformed,effectiveOpacity);c.restore();}
        }else{
          const bounds=markTransformedBounds(m,mirrorX,mirrorY,angle),copies=latticeCopiesForBounds(bounds.minX,bounds.maxX,bounds.minY,bounds.maxY,clipW,clipH,basis);
          for(const copy of copies){
            c.save();c.translate(copy.x,copy.y);applySymmetryContext(c,mirrorX,mirrorY,angle);applyMarkTransformContext(c,m);drawMark(c,m,effectiveOpacity);c.restore();
          }
        }
      }'''
replace_once(old_draw,new_draw,"canvas mark transform branch")

old_svg = '''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        const transform=`translate(${TILE/2} ${TILE/2}) rotate(${angle*180/Math.PI}) scale(${mirrorX?-1:1} ${mirrorY?-1:1}) translate(${-TILE/2} ${-TILE/2})`;
        const transformedPoints=m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle));
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const p of transformedPoints){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
        minX-=m.width;maxX+=m.width;minY-=m.width;maxY+=m.width;
        const copies=latticeCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,markBasis);
        for(const copy of copies)body+=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}" ${style}>${shape}</g></g>`;
      }'''
new_svg = '''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        const transform=`translate(${TILE/2} ${TILE/2}) rotate(${angle*180/Math.PI}) scale(${mirrorX?-1:1} ${mirrorY?-1:1}) translate(${-TILE/2} ${-TILE/2})`;
        if(!markHasTransform(m)){
          const transformedPoints=m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle));
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
          for(const p of transformedPoints){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
          minX-=m.width;maxX+=m.width;minY-=m.width;maxY+=m.width;
          const copies=latticeCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,markBasis);
          for(const copy of copies)body+=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}" ${style}>${shape}</g></g>`;
        }else{
          const bounds=markTransformedBounds(m,mirrorX,mirrorY,angle),copies=latticeCopiesForBounds(bounds.minX,bounds.maxX,bounds.minY,bounds.maxY,clipW,clipH,markBasis),markTransform=markSvgTransform(m);
          for(const copy of copies)body+=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}"><g transform="${markTransform}" ${style}>${shape}</g></g></g>`;
        }
      }'''
replace_once(old_svg,new_svg,"svg mark transform branch")

required = [
    'content="1.2.0-alpha.4"',
    'function markTransformValues(m)',
    'function markHasTransform(m)',
    'function markTransformedBounds(m,mirrorX=false,mirrorY=false,angle=0)',
    'applyMarkTransformContext(c,m)',
    'markTransform=markSvgTransform(m)',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"post-patch assertion failed: {needle}")

path.write_text(text, encoding="utf-8")
print("alpha.4.0 non-destructive mark transform path applied")
