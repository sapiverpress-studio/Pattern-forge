from pathlib import Path

path=Path('index.html')
text=path.read_text(encoding='utf-8')

mobile_old='<button class="btn active" data-tool="select">Select</button><button class="btn" data-tool="brush">Brush</button><button class="btn" data-tool="freefill">Fill</button><button class="btn" data-tool="pan">Pan</button>'
mobile_new='<button class="btn active" data-tool="select">Select</button><button class="btn" data-tool="brush">Brush</button><button class="btn" data-tool="eraser">Eraser</button><button class="btn" data-tool="freefill">Fill</button><button class="btn" data-tool="pan">Pan</button>'
if text.count(mobile_old)!=1: raise SystemExit(f'guard failed mobile eraser: {text.count(mobile_old)} matches')
text=text.replace(mobile_old,mobile_new,1)

svg_start=text.index('  function renderSVGBlob(){')
prefix,svg=text[:svg_start],text[svg_start:]
repls=[
('''      let layerBody="",layerErase="";''','''      let layerBody="";''','remove whole-layer eraser accumulator'),
('''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){''','''      let eraserNodes="";\n      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){''','per-mark eraser accumulator'),
('''if(m.type==="eraser")layerErase+=node;else layerBody+=node;''','''if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;''','plain eraser routing'),
('''if(m.type==="eraser")layerErase+=node;else layerBody+=node;''','''if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;''','transformed eraser routing'),
('''      }\n      }\n      if(layerErase){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${layerErase}</mask>`;body+=`<g mask="url(#${maskId})">${layerBody}</g>`;}else body+=layerBody;''','''      }\n      if(m.type==="eraser"&&eraserNodes){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${eraserNodes}</mask>`;layerBody=`<g mask="url(#${maskId})">${layerBody}</g>`;}\n      }\n      body+=layerBody;''','sequential SVG masking')
]
for old,new,label in repls:
    count=svg.count(old)
    if count!=1: raise SystemExit(f'guard failed for {label}: expected 1 match, found {count}')
    svg=svg.replace(old,new,1)
text=prefix+svg
path.write_text(text,encoding='utf-8')
print('Refined eraser ordering and mobile access')
