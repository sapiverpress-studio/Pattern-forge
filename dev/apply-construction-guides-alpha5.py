from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        '<meta name="app-version" content="1.2.0-alpha.4.2">',
        '<meta name="app-version" content="1.2.0-alpha.5.0">',
        "app version",
    ),
    (
        '''      <label class="check"><input id="snapOn" type="checkbox"> Snap placement to grid</label>\n      <p class="help">Grid and snap are independent. Snap applies when moving imported artwork or drawn shapes.</p>''',
        '''      <div class="row">\n        <div class="field"><label for="constructionGuide">Construction guide</label><select id="constructionGuide"><option value="off" selected>Off</option><option value="centre">Centre cross</option><option value="diagonals">Diagonals</option><option value="diamond">Diamond</option><option value="all">All guides</option></select></div>\n        <div class="field"><label for="guideOpacity">Guide opacity <span id="guideOpacityLabel">55%</span></label><input id="guideOpacity" type="range" min="10" max="100" value="55"></div>\n      </div>\n      <p class="help">Construction guides help position artwork while drawing. They are editor-only and never appear in PNG or SVG exports.</p>\n      <label class="check"><input id="snapOn" type="checkbox"> Snap placement to grid</label>\n      <p class="help">Grid and snap are independent. Snap applies when moving imported artwork or drawn shapes.</p>''',
        "construction guide controls",
    ),
    (
        '''    drawSymmetryGuides(ctx,sc);''',
        '''    drawConstructionGuides(ctx,sc);\n    drawSymmetryGuides(ctx,sc);''',
        "editor guide rendering call",
    ),
    (
        '''  function drawSymmetryGuides(c,sc){\n    if(!$("symmetryGuides").checked)return;''',
        '''  function drawConstructionGuides(c,sc){\n    const mode=$("constructionGuide")?.value||"off";if(mode==="off")return;\n    const alpha=clamp((parseInt($("guideOpacity")?.value,10)||55)/100,.1,1);\n    const centre=mode==="centre"||mode==="all",diagonals=mode==="diagonals"||mode==="all",diamond=mode==="diamond"||mode==="all";\n    c.save();c.strokeStyle=`rgba(44,95,84,${alpha})`;c.fillStyle=`rgba(44,95,84,${alpha})`;c.lineWidth=1.5/sc;c.setLineDash([8/sc,6/sc]);c.beginPath();\n    if(centre){c.moveTo(TILE/2,0);c.lineTo(TILE/2,TILE);c.moveTo(0,TILE/2);c.lineTo(TILE,TILE/2);}\n    if(diagonals){c.moveTo(0,0);c.lineTo(TILE,TILE);c.moveTo(TILE,0);c.lineTo(0,TILE);}\n    if(diamond){c.moveTo(TILE/2,0);c.lineTo(TILE,TILE/2);c.lineTo(TILE/2,TILE);c.lineTo(0,TILE/2);c.closePath();}\n    c.stroke();c.setLineDash([]);\n    if(centre||diamond){c.beginPath();c.arc(TILE/2,TILE/2,4/sc,0,Math.PI*2);c.fill();}\n    c.restore();\n  }\n\n  function drawSymmetryGuides(c,sc){\n    if(!$("symmetryGuides").checked)return;''',
        "construction guide renderer",
    ),
    (
        '''seed:$("seed").value,settings:{gridCount:$("gridCount").value,gridOn:$("gridOn").checked,symmetry:$("symmetry").value,symmetryGuides:$("symmetryGuides").checked,snapOn:$("snapOn").checked,''',
        '''seed:$("seed").value,settings:{gridCount:$("gridCount").value,gridOn:$("gridOn").checked,symmetry:$("symmetry").value,symmetryGuides:$("symmetryGuides").checked,constructionGuide:$("constructionGuide").value,guideOpacity:$("guideOpacity").value,snapOn:$("snapOn").checked,''',
        "project guide settings",
    ),
    (
        '''for(const [id,key] of [["gridCount","gridCount"],["symmetry","symmetry"],["brushSize","brushSize"],''',
        '''for(const [id,key] of [["gridCount","gridCount"],["symmetry","symmetry"],["constructionGuide","constructionGuide"],["guideOpacity","guideOpacity"],["brushSize","brushSize"],''',
        "restore guide values",
    ),
    (
        '''    $("brushSizeLabel").textContent=$("brushSize").value;$("inkOpacityLabel").textContent=$("inkOpacity").value+"%";$("textureLabel").textContent=$("textureAmount").value+"%";''',
        '''    $("brushSizeLabel").textContent=$("brushSize").value;$("inkOpacityLabel").textContent=$("inkOpacity").value+"%";$("textureLabel").textContent=$("textureAmount").value+"%";$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";''',
        "restore guide opacity label",
    ),
    (
        '''  ["bg","transparent","gridOn","gridCount","showTileBorder","symmetry","symmetryGuides"].forEach(id=>$(id).addEventListener("input",()=>renderAll()));''',
        '''  ["bg","transparent","gridOn","gridCount","showTileBorder","symmetry","symmetryGuides","constructionGuide"].forEach(id=>$(id).addEventListener("input",()=>renderAll()));\n  $("guideOpacity").addEventListener("input",()=>{$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";renderAll();});''',
        "guide input listeners",
    ),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"guard failed for {label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Applied guarded construction guides patch.")
