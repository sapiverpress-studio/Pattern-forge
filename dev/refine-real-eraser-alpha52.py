from pathlib import Path

path=Path('index.html')
text=path.read_text(encoding='utf-8')

mobile_old='<button class="btn active" data-tool="select">Select</button><button class="btn" data-tool="brush">Brush</button><button class="btn" data-tool="freefill">Fill</button><button class="btn" data-tool="pan">Pan</button>'
mobile_new='<button class="btn active" data-tool="select">Select</button><button class="btn" data-tool="brush">Brush</button><button class="btn" data-tool="eraser">Eraser</button><button class="btn" data-tool="freefill">Fill</button><button class="btn" data-tool="pan">Pan</button>'
if text.count(mobile_old)!=1: raise SystemExit(f'guard failed mobile eraser: {text.count(mobile_old)} matches')
text=text.replace(mobile_old,mobile_new,1)

svg_start=text.index('  function renderSVGBlob(){')
prefix,svg=text[:svg_start],text[svg_start:]

singles=[
('''      let layerBody="",layerErase="";''','''      let layerBody="";''','remove whole-layer eraser accumulator'),
('''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){''','''      let eraserNodes="";\n      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){''','per-mark eraser accumulator'),
('''      }\n      }\n      if(layerErase){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${layerErase}</mask>`;body+=`<g mask="url(#${maskId})">${layerBody}</g>`;}else body+=layerBody;''','''      }\n      if(m.type==="eraser"&&eraserNodes){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${eraserNodes}</mask>`;layerBody=`<g mask="url(#${maskId})">${layerBody}</g>`;}\n      }\n      body+=layerBody;''','sequential SVG masking')
]
for old,new,label in singles:
    count=svg.count(old)
    if count!=1: raise SystemExit(f'guard failed for {label}: expected 1 match, found {count}')
    svg=svg.replace(old,new,1)

route_old='if(m.type==="eraser")layerErase+=node;else layerBody+=node;'
route_new='if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;'
count=svg.count(route_old)
if count!=2: raise SystemExit(f'guard failed for eraser routing: expected 2 matches, found {count}')
svg=svg.replace(route_old,route_new)

text=prefix+svg
path.write_text(text,encoding='utf-8')
print('Refined eraser ordering and mobile access')
