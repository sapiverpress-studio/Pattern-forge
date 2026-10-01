from pathlib import Path

path=Path('index.html')
text=path.read_text(encoding='utf-8')

repls=[
('''<button class="btn active" data-tool="select">Select</button><button class="btn" data-tool="brush">Brush</button><button class="btn" data-tool="freefill">Fill</button><button class="btn" data-tool="pan">Pan</button>''','''<button class="btn active" data-tool="select">Select</button><button class="btn" data-tool="brush">Brush</button><button class="btn" data-tool="eraser">Eraser</button><button class="btn" data-tool="freefill">Fill</button><button class="btn" data-tool="pan">Pan</button>''','mobile eraser'),
('''      let layerBody="",layerErase="";''','''      let layerBody="";''','remove whole-layer eraser accumulator'),
('''      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){''','''      let eraserNodes="";\n      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){''','per-mark eraser accumulator'),
('''if(m.type==="eraser")layerErase+=node;else layerBody+=node;''','''if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;''','plain eraser routing'),
('''if(m.type==="eraser")layerErase+=node;else layerBody+=node;''','''if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;''','transformed eraser routing'),
('''      }\n      }\n      if(layerErase){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${layerErase}</mask>`;body+=`<g mask="url(#${maskId})">${layerBody}</g>`;}else body+=layerBody;''','''      }\n      if(m.type==="eraser"&&eraserNodes){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${eraserNodes}</mask>`;layerBody=`<g mask="url(#${maskId})">${layerBody}</g>`;}\n      }\n      body+=layerBody;''','sequential SVG masking')
]
for old,new,label in repls:
    count=text.count(old)
    if count!=1: raise SystemExit(f'guard failed for {label}: expected 1 match, found {count}')
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')
print('Refined eraser ordering and mobile access')
