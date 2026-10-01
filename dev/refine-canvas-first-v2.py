from pathlib import Path
p=Path('app/js/canvas-first-v2.js')
s=p.read_text(encoding='utf-8')

old='''    } else {
      context.innerHTML=`<div class="ux2-context-group"><span class="ux2-label">Selection</span><button class="ux2-chip active">Move</button><button class="ux2-chip">Scale / rotate on canvas</button></div><div class="ux2-context-group"><button class="ux2-chip" id="ux2Duplicate">Duplicate</button><button class="ux2-chip" id="ux2Delete">Delete</button><button class="ux2-chip" id="ux2Snap">Snapping</button></div>`;
      $('ux2Duplicate').addEventListener('click',()=>{const b=document.querySelector('#selectedPanel button[data-action="duplicate"],#selectedPanel button.duplicate');if(b)b.click()});
      $('ux2Delete').addEventListener('click',()=>{const b=document.querySelector('#selectedPanel button[data-action="delete"],#selectedPanel button.danger');if(b)b.click()});
      $('ux2Snap').addEventListener('click',()=>{const el=$('snapOn');if(el){el.checked=!el.checked;el.dispatchEvent(new Event('change',{bubbles:true}))}});
    }
'''
new='''    } else {
      const scale=$('selScale'),rot=$('selRot'),opacity=$('selOpacity'),hasSelection=Boolean(scale||rot||opacity);
      context.innerHTML=hasSelection
        ? `<div class="ux2-context-group"><span class="ux2-label">Transform</span>${scale?`<label class="ux2-slider">Scale <input id="ux2SelScale" type="range" min="${scale.min||1}" max="${scale.max||600}" value="${scale.value}"><b>${scale.value}%</b></label>`:''}${rot?`<label class="ux2-slider">Rotate <input id="ux2SelRot" type="range" min="-180" max="180" value="${rot.value}"><b>${rot.value}°</b></label>`:''}${opacity?`<label class="ux2-slider">Opacity <input id="ux2SelOpacity" type="range" min="5" max="100" value="${opacity.value}"><b>${opacity.value}%</b></label>`:''}</div><div class="ux2-context-group"><button class="ux2-chip" id="ux2Duplicate">Duplicate</button><button class="ux2-chip" id="ux2Delete">Delete</button><button class="ux2-chip" id="ux2Front">Bring front</button><button class="ux2-chip" id="ux2Back">Send back</button><button class="ux2-chip" id="ux2Snap">Snap</button></div>`
        : `<div class="ux2-context-group"><span class="ux2-label">Selection</span><span style="font-size:11px;color:#6d7885">Tap artwork to expose scale, rotation, opacity and arrange controls.</span><button class="ux2-chip" id="ux2Snap">Snap</button></div>`;
      if($('ux2SelScale'))$('ux2SelScale').addEventListener('input',e=>{const target=$('selScale');if(target){target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}))}renderContext('select')});
      if($('ux2SelRot'))$('ux2SelRot').addEventListener('input',e=>{const target=$('selRot');if(target){target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}))}renderContext('select')});
      if($('ux2SelOpacity'))$('ux2SelOpacity').addEventListener('input',e=>{const target=$('selOpacity');if(target){target.value=e.target.value;target.dispatchEvent(new Event('input',{bubbles:true}))}renderContext('select')});
      if($('ux2Duplicate'))$('ux2Duplicate').addEventListener('click',()=>clickOld('duplicateSel'));
      if($('ux2Delete'))$('ux2Delete').addEventListener('click',()=>clickOld('deleteSel'));
      if($('ux2Front'))$('ux2Front').addEventListener('click',()=>clickOld('frontSel'));
      if($('ux2Back'))$('ux2Back').addEventListener('click',()=>clickOld('backSel'));
      if($('ux2Snap'))$('ux2Snap').addEventListener('click',()=>{const el=$('snapOn');if(el){el.checked=!el.checked;el.dispatchEvent(new Event('change',{bubbles:true}))}});
    }
'''
if old not in s: raise SystemExit('selection context anchor not found')
s=s.replace(old,new,1)

old2='''  const updateIdentity=()=>{
    $('ux2Title').textContent=$('projectNameDisplay')?.textContent?.trim()||'Pattern Forge';
    const doodle=document.body.classList.contains('doodle-project');$('ux2Mode').textContent=doodle?'Doodle':'Pattern';
    const patternDock=document.querySelector('[data-ux2-panel="pattern"]');if(patternDock)patternDock.hidden=doodle;
    $('ux2ZoomLabel').textContent=$('zoomLabel')?.textContent||'100%';
  };
  const updateStatus=()=>{$('ux2Status').textContent=$('status')?.textContent||''};
  new MutationObserver(()=>{updateIdentity();updateStatus()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  $('zoom')?.addEventListener('input',updateIdentity);
  setTool(currentTool());updateIdentity();updateStatus();
'''
new2='''  const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
  const updateIdentity=()=>{
    setText($('ux2Title'),$('projectNameDisplay')?.textContent?.trim()||'Pattern Forge');
    const doodle=document.body.classList.contains('doodle-project');setText($('ux2Mode'),doodle?'Doodle':'Pattern');
    const patternDock=document.querySelector('[data-ux2-panel="pattern"]');if(patternDock)patternDock.hidden=doodle;
    setText($('ux2ZoomLabel'),$('zoomLabel')?.textContent||'100%');
  };
  const updateStatus=()=>setText($('ux2Status'),$('status')?.textContent||'');
  const titleNode=$('projectNameDisplay'),statusNode=$('status'),selectionNode=$('selectedPanel');
  if(titleNode)new MutationObserver(updateIdentity).observe(titleNode,{subtree:true,childList:true,characterData:true});
  if(statusNode)new MutationObserver(updateStatus).observe(statusNode,{subtree:true,childList:true,characterData:true});
  if(selectionNode)new MutationObserver(()=>{if(currentTool()==='select')renderContext('select')}).observe(selectionNode,{subtree:true,childList:true});
  new MutationObserver(updateIdentity).observe(document.body,{attributes:true,attributeFilter:['class']});
  $('zoom')?.addEventListener('input',updateIdentity);
  setTool(currentTool());updateIdentity();updateStatus();
'''
if old2 not in s: raise SystemExit('observer anchor not found')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
print('Refined selection context and removed mutation-observer feedback loop')
