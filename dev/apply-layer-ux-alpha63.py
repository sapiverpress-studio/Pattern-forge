from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    text = text.replace(old, new, 1)

replace_once(
    '<meta name="app-version" content="1.2.0-alpha.6.2">',
    '<meta name="app-version" content="1.2.0-alpha.6.3">',
    'app version',
)

replace_once(
'''  function addLayer(){
    saveHistory();const layer={id:newLayerId(),name:`Layer ${state.layers.length+1}`,visible:true,opacity:1,locked:false,export:true};
    state.layers.push(layer);state.activeLayerId=layer.id;renderAll();setStatus(`Added “${layer.name}”.`);
  }''',
'''  function nextLayerName(){
    let max=0;
    for(const layer of state.layers){
      const match=/^Layer\\s+(\\d+)$/i.exec(String(layer.name||"").trim());
      if(match)max=Math.max(max,Number(match[1])||0);
    }
    return `Layer ${max+1}`;
  }
  function addLayer(){
    saveHistory();const layer={id:newLayerId(),name:nextLayerName(),visible:true,opacity:1,locked:false,export:true};
    state.layers.push(layer);state.activeLayerId=layer.id;renderAll();setStatus(`Added “${layer.name}”.`);
  }''',
    'unique layer naming',
)

replace_once(
'''  $("layerName").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;const name=$("layerName").value.trim();if(!name){$("layerName").value=layer.name;return;}saveHistory();layer.name=name.slice(0,80);renderAll();setStatus(`Layer renamed to “${layer.name}”.`);});''',
'''  let layerNameEditStart="";
  let layerNameEditDirty=false;
  $("layerName").addEventListener("focus",()=>{
    const layer=activeLayer();
    layerNameEditStart=layer?.name||"";
    layerNameEditDirty=false;
  });
  $("layerName").addEventListener("input",()=>{
    const layer=activeLayer();if(!layer)return;
    if(!layerNameEditDirty){saveHistory();layerNameEditDirty=true;}
    const value=$("layerName").value.slice(0,80);
    layer.name=value;
    const activeName=document.querySelector(".layerRow.active .layerRowName");
    if(activeName)activeName.textContent=value.trim()||"Untitled layer";
  });
  $("layerName").addEventListener("blur",()=>{
    const layer=activeLayer();if(!layer||!layerNameEditDirty)return;
    const name=$("layerName").value.trim();
    layer.name=(name||layerNameEditStart||nextLayerName()).slice(0,80);
    $("layerName").value=layer.name;
    layerNameEditDirty=false;
    renderAll();
    setStatus(`Layer renamed to “${layer.name}”.`);
  });
  $("layerName").addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();$("layerName").blur();}
  });''',
    'live layer rename',
)

path.write_text(text, encoding='utf-8')
print('Applied layer UX fixes for alpha.6.3')
