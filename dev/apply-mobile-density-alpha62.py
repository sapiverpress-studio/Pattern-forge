from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'guard failed for {label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

replace_once('<meta name="app-version" content="1.2.0-alpha.6.1">', '<meta name="app-version" content="1.2.0-alpha.6.2">', 'version')

replace_once('  .mobileNav{display:none}\n','  .mobileNav{display:none}\n  .mobileDisclosure>summary{display:none}\n','mobile disclosure base css')

replace_once('''    .panel{margin-bottom:10px;border-radius:13px}\n    .stageWrap{order:0;width:100%;margin-bottom:0}\n    .left{order:1;width:100%}.right{order:2;width:100%}\n''','''    .panel{margin-bottom:10px;border-radius:13px}\n    .stageWrap{order:0;width:100%;margin-bottom:0}\n    .left{order:1;width:100%}.right{order:2;width:100%}\n    .left,.right{background:transparent;border:0;box-shadow:none;padding:0;margin-bottom:0}\n    .mobileDisclosure{margin:0 0 8px;padding:0 10px 10px;background:#fff;border:1px solid var(--line);border-radius:13px;box-shadow:var(--shadow)}\n    .mobileDisclosure:not([open]){padding-bottom:0}\n    .mobileDisclosure>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 -10px;padding:11px 12px;cursor:pointer;font-size:.88rem;font-weight:800;color:#244e44;list-style:none}\n    .mobileDisclosure>summary::-webkit-details-marker{display:none}\n    .mobileDisclosure>summary::after{content:"+";flex:none;font-size:1rem;line-height:1;color:var(--muted)}\n    .mobileDisclosure[open]>summary{border-bottom:1px solid var(--line);margin-bottom:10px}\n    .mobileDisclosure[open]>summary::after{content:"−"}\n    .mobileDisclosure #focusControls>h2{font-size:.95rem;margin-top:0}\n    .doodle-project #previewDisclosure{display:none!important}\n''','mobile disclosure css')

replace_once('''    <section class="panel left">\n      <div id="focusControls">''','''    <section class="panel left">\n      <details id="drawingControlsDisclosure" class="mobileDisclosure" open>\n      <summary>Drawing controls</summary>\n      <div id="focusControls">''','wrap drawing controls start')

replace_once('''      </details>\n      </div>\n\n      <h3>Add your images</h3>''','''      </details>\n      </div>\n      </details>\n\n      <details id="imagesDisclosure" class="mobileDisclosure" open>\n      <summary>Images and motifs</summary>\n      <h3>Add your images</h3>''','wrap images start')

replace_once('''      </details>\n    </section>\n\n    <section id="stageWrap" class="stageWrap">''','''      </details>\n      </details>\n    </section>\n\n    <section id="stageWrap" class="stageWrap">''','wrap images end')

replace_once('''    <section class="panel right">\n      <h2>Selected artwork</h2>''','''    <section class="panel right">\n      <details id="layersDisclosure" class="mobileDisclosure" open>\n      <summary>Selection and layers</summary>\n      <h2>Selected artwork</h2>''','wrap layers start')

replace_once('''        <p id="layerSummary" class="help">Select a layer to draw into it. Layers at the top are rendered in front.</p>\n      </div>\n\n      <h3 id="repeatPreviewHeading">Live repeat preview</h3>''','''        <p id="layerSummary" class="help">Select a layer to draw into it. Layers at the top are rendered in front.</p>\n      </div>\n      </details>\n\n      <details id="previewDisclosure" class="mobileDisclosure" open>\n      <summary>Repeat preview</summary>\n      <h3 id="repeatPreviewHeading">Live repeat preview</h3>''','wrap preview start')

replace_once('''      <div id="previewScaleField" class="field" style="margin-top:8px">\n        <label for="previewScale">Preview repeat size <span id="previewScaleLabel">33%</span></label>\n        <input id="previewScale" type="range" min="10" max="100" value="33">\n      </div>\n\n      <h3>Print-quality check</h3>''','''      <div id="previewScaleField" class="field" style="margin-top:8px">\n        <label for="previewScale">Preview repeat size <span id="previewScaleLabel">33%</span></label>\n        <input id="previewScale" type="range" min="10" max="100" value="33">\n      </div>\n      </details>\n\n      <details id="exportDisclosure" class="mobileDisclosure" open>\n      <summary>Export and save</summary>\n      <h3>Print-quality check</h3>''','wrap export start')

replace_once('''      <p class="help">Project files include artwork used by placed motifs. Keep your original image files as separate backups.</p>\n    </section>''','''      <p class="help">Project files include artwork used by placed motifs. Keep your original image files as separate backups.</p>\n      </details>\n    </section>''','wrap export end')

old_mobile = '''  if(window.matchMedia("(max-width:760px)").matches)$("tileSettingsDisclosure").open=false;\n  document.querySelectorAll("[data-mobile-jump]").forEach(button=>button.addEventListener("click",()=>{\n    const targetId=button.dataset.mobileJump;\n    if(targetId==="tileSettingsDisclosure")$(targetId).open=true;\n    document.querySelectorAll("[data-mobile-jump]").forEach(item=>item.removeAttribute("aria-current"));\n    button.setAttribute("aria-current","page");\n    $(targetId).scrollIntoView({behavior:"smooth",block:"start"});\n  }));'''
new_mobile = '''  const mobileLayoutQuery=window.matchMedia("(max-width:760px)");\n  const mobileDisclosureIds=["drawingControlsDisclosure","imagesDisclosure","layersDisclosure","previewDisclosure","exportDisclosure"];\n  function setMobileSection(targetId="stageWrap"){\n    if(!mobileLayoutQuery.matches)return;\n    mobileDisclosureIds.forEach(id=>{const disclosure=$(id);if(disclosure)disclosure.open=false;});\n    $("tileSettingsDisclosure").open=false;\n    if(targetId==="drop")$("imagesDisclosure").open=true;\n    else if(targetId==="tileSettingsDisclosure"){$("drawingControlsDisclosure").open=true;$("tileSettingsDisclosure").open=true;}\n    else if(targetId==="exportSection")$("exportDisclosure").open=true;\n  }\n  setMobileSection();\n  document.querySelectorAll("[data-mobile-jump]").forEach(button=>button.addEventListener("click",()=>{\n    const targetId=button.dataset.mobileJump;\n    setMobileSection(targetId);\n    document.querySelectorAll("[data-mobile-jump]").forEach(item=>item.removeAttribute("aria-current"));\n    button.setAttribute("aria-current","page");\n    requestAnimationFrame(()=>$(targetId).scrollIntoView({behavior:"smooth",block:"start"}));\n  }));'''
replace_once(old_mobile, new_mobile, 'mobile navigation behavior')

path.write_text(text, encoding='utf-8')
print('Applied Pattern Forge mobile density alpha.6.2')
