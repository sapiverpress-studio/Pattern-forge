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
    '''  function activeLayer(){return layerById(state.activeLayerId)||state.layers[state.layers.length-1]||null;}\n  function layerArtworkCount(id){''',
    '''  function activeLayer(){return layerById(state.activeLayerId)||state.layers[state.layers.length-1]||null;}\n  function motifTargetLayerId(){return layerById(BASE_LAYER_IDS.motifs)?.id||activeLayer()?.id||state.layers[0]?.id||null;}\n  function layerArtworkCount(id){''',
    "motif target helper",
)

replace_once(
    '''      id:state.nextId++, assetId:asset.id, layerId:BASE_LAYER_IDS.motifs,''',
    '''      id:state.nextId++, assetId:asset.id, layerId:motifTargetLayerId(),''',
    "import motif target",
)

replace_once(
    '''        id:state.nextId++,assetId:a.id,layerId:BASE_LAYER_IDS.motifs,''',
    '''        id:state.nextId++,assetId:a.id,layerId:motifTargetLayerId(),''',
    "generated motif target",
)

replace_once(
    '''    state.items=s.items;state.marks=s.marks;state.layers=normaliseLayers(s.layers);state.activeLayerId=layerById(s.activeLayerId)?.id||BASE_LAYER_IDS.drawing;state.nextId=s.nextId;''',
    '''    state.items=s.items;state.marks=s.marks;state.layers=normaliseLayers(s.layers);state.activeLayerId=layerById(s.activeLayerId)?.id||layerById(BASE_LAYER_IDS.drawing)?.id||state.layers[state.layers.length-1]?.id||state.layers[0]?.id||"";state.nextId=s.nextId;''',
    "history active layer fallback",
)

replace_once(
    '''  function hitTest(x,y){\n    for(let idx=state.items.length-1;idx>=0;idx--){\n      const item=state.items[idx],layer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item); if(!a||!layerIsRenderable(layer,false)||layer.locked) continue;\n      const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y;\n      const cos=Math.cos(-item.rotation),sin=Math.sin(-item.rotation);\n      const lx=dx*cos-dy*sin, ly=dx*sin+dy*cos;\n      const iw=a.w*item.scale,ih=a.h*item.scale;\n      if(Math.abs(lx)<=iw/2 && Math.abs(ly)<=ih/2) return item;\n    }\n    return null;\n  }''',
    '''  function hitTest(x,y){\n    for(let layerIndex=state.layers.length-1;layerIndex>=0;layerIndex--){\n      const layer=state.layers[layerIndex];if(!layerIsRenderable(layer,false)||layer.locked)continue;\n      for(let idx=state.items.length-1;idx>=0;idx--){\n        const item=state.items[idx],itemLayer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item);\n        if(!a||itemLayer?.id!==layer.id)continue;\n        const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y;\n        const cos=Math.cos(-item.rotation),sin=Math.sin(-item.rotation);\n        const lx=dx*cos-dy*sin, ly=dx*sin+dy*cos;\n        const iw=a.w*item.scale,ih=a.h*item.scale;\n        if(Math.abs(lx)<=iw/2 && Math.abs(ly)<=ih/2)return item;\n      }\n    }\n    return null;\n  }''',
    "layer ordered hit test",
)

required = [
    'content="1.2.0-alpha.3"',
    'function motifTargetLayerId()',
    'layerId:motifTargetLayerId()',
    'for(let layerIndex=state.layers.length-1;layerIndex>=0;layerIndex--)',
    'layerById(BASE_LAYER_IDS.drawing)?.id||state.layers[state.layers.length-1]?.id',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"post-patch assertion failed: {needle}")

path.write_text(text, encoding="utf-8")
print("alpha.3 layer ordering and motif fallback guards applied")
