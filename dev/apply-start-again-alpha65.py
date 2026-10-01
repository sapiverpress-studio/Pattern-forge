from pathlib import Path

index=Path('index.html')
s=index.read_text(encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old,new,1)

s=replace_once(s,'content="1.2.0-alpha.6.4"','content="1.2.0-alpha.6.5"','version')

old_buttons='''      <div class="btns" style="margin-top:9px"><button id="undo" class="btn">Undo</button><button id="redo" class="btn">Redo</button></div>\n      <p id="drawingHelp" class="help">'''
new_buttons='''      <div class="btns" style="margin-top:9px"><button id="undo" class="btn">Undo</button><button id="redo" class="btn">Redo</button></div>\n      <button id="startAgain" class="btn danger" type="button" style="width:100%;margin-top:8px">Start again</button>\n      <p class="help">Start again clears placed images and drawing marks, but keeps this project’s setup, imported image library, layers and settings.</p>\n      <p id="drawingHelp" class="help">'''
s=replace_once(s,old_buttons,new_buttons,'start-again button')

old_history='''  function restoreHistory(from,to){\n    if(!from.length)return;\n    to.push(JSON.stringify({items:state.items,marks:state.marks,layers:state.layers,activeLayerId:state.activeLayerId,nextId:state.nextId}));\n    const s=JSON.parse(from.pop());\n    state.items=s.items;state.marks=s.marks;state.layers=normaliseLayers(s.layers);state.activeLayerId=layerById(s.activeLayerId)?.id||layerById(BASE_LAYER_IDS.drawing)?.id||state.layers[state.layers.length-1]?.id||state.layers[0]?.id||"";state.nextId=s.nextId;\n    state.selectedId=null;state.activeMark=null;renderAll();\n  }'''
new_history='''  function restoreHistory(from,to){\n    if(!from.length)return;\n    to.push(JSON.stringify({items:state.items,marks:state.marks,layers:state.layers,activeLayerId:state.activeLayerId,nextId:state.nextId}));\n    const s=JSON.parse(from.pop());\n    state.items=s.items;state.marks=s.marks;state.layers=normaliseLayers(s.layers);state.activeLayerId=layerById(s.activeLayerId)?.id||layerById(BASE_LAYER_IDS.drawing)?.id||state.layers[state.layers.length-1]?.id||state.layers[0]?.id||"";state.nextId=s.nextId;\n    state.selectedId=null;state.activeMark=null;renderAll();\n  }\n  function startAgain(){\n    const itemCount=state.items.length;\n    const markCount=state.marks.length;\n    if(!itemCount&&!markCount){setStatus("Nothing to clear — the canvas is already empty.");return;}\n    const parts=[];\n    if(itemCount)parts.push(`${itemCount} placed image${itemCount===1?"":"s"}`);\n    if(markCount)parts.push(`${markCount} drawing mark${markCount===1?"":"s"}`);\n    const summary=parts.join(" and ");\n    if(!confirm(`Start again and clear ${summary}? Project setup, imported images, layers and settings will be kept. You can restore this once with Undo.`))return;\n    saveHistory();\n    state.items=[];\n    state.marks=[];\n    state.selectedId=null;\n    state.activeMark=null;\n    state.dragging=false;\n    state.resizeState=null;\n    state.transformState=null;\n    state.dragStart=null;\n    state.snapGuides={x:null,y:null};\n    renderAll();\n    setStatus(`Started again — cleared ${summary}. Project setup and image library kept.`);\n  }'''
s=replace_once(s,old_history,new_history,'start-again function')

old_events='''  $("undo").onclick=()=>restoreHistory(state.past,state.future);\n  $("redo").onclick=()=>restoreHistory(state.future,state.past);'''
new_events='''  $("undo").onclick=()=>restoreHistory(state.past,state.future);\n  $("redo").onclick=()=>restoreHistory(state.future,state.past);\n  $("startAgain").onclick=startAgain;'''
s=replace_once(s,old_events,new_events,'start-again event')

index.write_text(s,encoding='utf-8')

layer_test=Path('tests/layer-ux-smoke.mjs')
lt=layer_test.read_text(encoding='utf-8')
lt=replace_once(lt,"'1.2.0-alpha.6.4'","'1.2.0-alpha.6.5'",'layer UX version assertion')
layer_test.write_text(lt,encoding='utf-8')

print('Applied alpha.6.5 Start again reset')
