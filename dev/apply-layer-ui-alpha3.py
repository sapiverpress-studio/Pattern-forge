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
    '''    if(state.tool==="select"){\n      const current=selectedItem();\n      const handle=current&&imageHandleAt(current,w.x,w.y);''',
    '''    if(state.tool==="select"){\n      let current=selectedItem();\n      const currentLayer=current?layerForArtwork(current,BASE_LAYER_IDS.motifs):null;\n      if(current&&(!layerIsRenderable(currentLayer,false)||currentLayer.locked)){state.selectedId=null;current=null;}\n      const handle=current&&imageHandleAt(current,w.x,w.y);''',
    "selection lock guard",
)

replace_once(
    '''  $("layerLocked").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.locked=$("layerLocked").checked;renderAll();});''',
    '''  $("layerLocked").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.locked=$("layerLocked").checked;if(layer.locked&&selectedItem()?.layerId===layer.id)state.selectedId=null;renderAll();});''',
    "lock toggle selection clear",
)

required = [
    'content="1.2.0-alpha.3"',
    'currentLayer.locked',
    'layer.locked&&selectedItem()?.layerId===layer.id',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"post-patch assertion failed: {needle}")

path.write_text(text, encoding="utf-8")
print("alpha.3 locked-layer selection guard applied")
