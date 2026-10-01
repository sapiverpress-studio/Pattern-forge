from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        '    tool: "select",\n    zoom: 1,',
        '    tool: "select",\n    previousTool: "select",\n    zoom: 1,',
        "state previousTool",
    ),
    (
        '''  function pickCanvasColour(world){\n    const x=clamp(Math.floor(world.x),0,TILE-1),y=clamp(Math.floor(world.y),0,TILE-1),tile=makeTileCanvas(TILE,TILE),c=tile.getContext("2d"),d=c.getImageData(x,y,1,1).data;\n    if(d[3]<12){setStatus("That spot is transparent. Pick a visible colour.");return;}\n    const hex="#"+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("");setInkColour(hex);setStatus(`Eyedropper picked ${hex}.`);\n    state.tool="brush";document.querySelectorAll("[data-tool]").forEach(t=>t.classList.toggle("active",t.dataset.tool==="brush"));\n    canvas.style.cursor="crosshair";\n  }''',
        '''  function pickCanvasColour(world){\n    const x=clamp(Math.floor(world.x),0,TILE-1),y=clamp(Math.floor(world.y),0,TILE-1),tile=makeTileCanvas(TILE,TILE),c=tile.getContext("2d"),d=c.getImageData(x,y,1,1).data;\n    if(d[3]<12){setStatus("That spot is transparent. Pick a visible colour.");return;}\n    const hex="#"+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("");setInkColour(hex);\n    const returnTool=state.previousTool&&state.previousTool!=="eyedropper"?state.previousTool:"select";\n    state.tool=returnTool;\n    document.querySelectorAll("[data-tool]").forEach(t=>t.classList.toggle("active",t.dataset.tool===returnTool));\n    updateToolHighlight();\n    canvas.style.cursor=returnTool==="pan"?"grab":returnTool==="select"?"default":"crosshair";\n    const toolName={select:"Select",brush:"Brush",pan:"Pan",line:"Line",rect:"Rectangle",ellipse:"Ellipse",freefill:"Freehand fill",gradient:"Gradient fill"}[returnTool]||"Previous";\n    setStatus(`Eyedropper picked ${hex}. ${toolName} tool restored.`);\n  }''',
        "pickCanvasColour restoration",
    ),
    (
        '''  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{\n    state.tool=b.dataset.tool;\n    document.querySelectorAll("[data-tool]").forEach(t=>t.classList.toggle("active",t.dataset.tool===state.tool));\n    updateToolHighlight();\n    canvas.style.cursor=state.tool==="pan"?"grab":state.tool==="select"?"default":state.tool==="eyedropper"?"copy":"crosshair";\n    setStatus(`${b.textContent} tool active.`);\n  }));''',
        '''  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{\n    const nextTool=b.dataset.tool;\n    if(nextTool==="eyedropper"){\n      if(state.tool!=="eyedropper")state.previousTool=state.tool;\n    }else state.previousTool=nextTool;\n    state.tool=nextTool;\n    document.querySelectorAll("[data-tool]").forEach(t=>t.classList.toggle("active",t.dataset.tool===state.tool));\n    updateToolHighlight();\n    canvas.style.cursor=state.tool==="pan"?"grab":state.tool==="select"?"default":state.tool==="eyedropper"?"copy":"crosshair";\n    setStatus(`${b.textContent} tool active.`);\n  }));''',
        "tool selection memory",
    ),
    (
        '<meta name="app-version" content="1.2.0-alpha.4.1">',
        '<meta name="app-version" content="1.2.0-alpha.4.2">',
        "app version",
    ),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"guard failed for {label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Applied guarded eyedropper return-to-previous-tool patch.")
