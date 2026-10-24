/* Copy a pattern layout without touching its source; replace motif types or individual placements. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const dialog=$("motifSwapDialog"),open=$("motifSwapOpen"),close=$("motifSwapClose"),
    cancel=$("motifSwapCancel"),filesInput=$("motifSwapFiles"),
    uploadMap=$("motifSwapMapping"),name=$("motifSwapName"),mode=$("motifSwapMode"),
    scope=$("motifSwapScope"),summary=$("motifSwapSummary"),scopeHelp=$("motifSwapScopeHelp"),
    filesHelp=$("motifSwapFilesHelp"),librarySection=$("motifSwapLibrarySection"),
    uploadSection=$("motifSwapUploadSection"),libraryMap=$("motifSwapLibraryMapping"),
    addMapping=$("motifSwapAddMapping"),apply=$("motifSwapApply"),error=$("motifSwapError"),
    ready=$("motifSwapReady");
  if(!dialog||!open||!window.PatternForgeRemix?.placements)return;
  let sources=[],placements=[],library=[],uploadRows=[],libraryRows=[],previewURLs=[],busy=false;
  const api=window.PatternForgeRemix;
  const unique=a=>new Set(a).size===a.length;
  function message(value){error.textContent=value||"";}
  function clearPreviews(){for(const url of previewURLs)URL.revokeObjectURL(url);previewURLs=[];}
  function targetList(){return scope.value==="type"?sources:placements;}
  function replacementLibrary(){return scope.value==="fill"
    ?library.filter(asset=>!sources.some(source=>source.id===asset.id)):library;}
  function targetName(target){
    return scope.value==="placement"
      ?target.name+" · copy "+target.copyNumber+" ("+target.x+"%, "+target.y+"%)"
      :target.name+" · "+target.placed+" placed";
  }
  function options(select,targets){
    select.replaceChildren();
    for(const target of targets){
      const item=document.createElement("option");item.value=target.id;
      item.textContent=targets===library?target.name:targetName(target);
      select.appendChild(item);
    }
  }
  function chosenOriginal(targetId){return targetList().find(t=>t.id===targetId);}
  function originalAssetId(targetId){
    const t=chosenOriginal(targetId);return scope.value==="placement"?t?.assetId:t?.id;
  }
  function chosenReplacement(targetId){return library.find(t=>t.id===targetId);}
  function image(src,alt){
    const el=document.createElement("img");el.className="motifSwapThumb";el.src=src||"";el.alt=alt;return el;
  }
  function labelFor(text,select){
    const label=document.createElement("label");
    label.textContent=text;label.appendChild(select);
    return label;
  }
  function helperMessage(){
    const count=sources.length,total=placements.length;
    scopeHelp.textContent=scope.value==="fill"
      ?"Every existing position will be filled with your new images, repeated evenly in rows. No old motifs remain. All positions, rotations and spacing are kept."
      :scope.value==="placement"
      ?"Change selected positions independently. Automatic seamless repeats still follow their source placement."
      :"Replace every placed copy using a chosen image. Other motif types remain unchanged.";
    filesHelp.textContent=scope.value==="fill"
      ?"Choose 1–"+Math.min(10,total)+" replacement images. They will alternate across all "+total+" positions; none of the originals will be left behind."
      :"This design has "+count+" distinct image"+(count===1?"":"s")+" across "+total+
      " placed cop"+(total===1?"y":"ies")+". You can assign up to "+Math.min(10,targetList().length)+" replacement"+(targetList().length===1?"":"s")+" in this mode.";
  }
  function getMappings(){
    if(mode.value==="upload")return uploadRows.map(row=>{
      const cleanBackground=!!$("motifSwapRemovePlain")?.checked;
      return scope.value==="fill"
        ?{fill:true,file:row.file,cleanBackground}:scope.value==="placement"
        ?{fromItemId:row.select.value,file:row.file,cleanBackground}
        :{fromAssetId:row.select.value,file:row.file,cleanBackground};
    });
    return libraryRows.map(row=>scope.value==="fill"
      ?{fill:true,toAssetId:row.to.value}:scope.value==="placement"
      ?{fromItemId:row.from.value,toAssetId:row.to.value}
      :{fromAssetId:row.from.value,toAssetId:row.to.value});
  }
  function validation(){
    const rows=mode.value==="upload"?uploadRows:libraryRows,targets=targetList();
    if(!rows.length)return mode.value==="upload"
      ?"Select at least one replacement image."
      :"Choose another image from your library, or use Upload new images.";
    if(mode.value==="upload"&&filesInput.files.length>10)return "Choose no more than ten replacement images at once.";
    if(mode.value==="upload"&&filesInput.files.length>targets.length)
      return "You selected "+filesInput.files.length+" images but this mode has "+targets.length+
        " targets. Choose Fill the entire pattern to reuse all of them, or select fewer files.";
    if(rows.length>10)return "Choose no more than ten replacement images at once.";
    if(rows.length>targets.length)return "Too many replacement images for this mode.";
    const mappings=getMappings(),ids=mappings.map(m=>String(m.fromItemId??m.fromAssetId));
    if(scope.value==="fill"){
      if(mode.value==="library"&&!unique(mappings.map(m=>String(m.toAssetId))))
        return "Choose each replacement image once; it will repeat automatically across the layout.";
    }else{
      if(ids.some(id=>!id||!targets.some(t=>t.id===id)))return "Choose a valid original placement for each replacement.";
      if(!unique(ids))return "The same original image is selected twice. Choose different targets.";
      if(mode.value==="library"&&mappings.some(m=>String(m.toAssetId)===String(originalAssetId(String(m.fromItemId??m.fromAssetId)))))
        return "Choose a different replacement image from the original.";
    }
    if(mode.value==="upload"&&rows.some(row=>!row.file))return "An uploaded image is missing; select it again.";
    return "";
  }
  function rowsForCurrentMode(){return mode.value==="upload"?uploadRows:libraryRows;}
  function updateReady(showError=false){
    const issue=validation();
    ready.textContent=issue?"":scope.value==="fill"
      ?"All "+placements.length+" positions will be filled using "+getMappings().length+" image"+(getMappings().length===1?"":"s")+". Original saved separately."
      :getMappings().length+" replacement"+(getMappings().length===1?"":"s")+
      " mapped · Your original design will remain unchanged.";
    if(showError||(issue&&rowsForCurrentMode().length>0))message(issue);
    else if(!issue)message("");
    apply.disabled=busy||!!issue||!name.value.trim();
    apply.textContent=busy?"Creating a separate design…":scope.value==="fill"?"Create new full pattern":"Create copied design";
    return issue;
  }
  function makeSourceSelect(initialId){
    const picker=document.createElement("select");
    picker.setAttribute("aria-label","Original artwork to replace");
    options(picker,targetList());picker.value=initialId||targetList()[0]?.id||"";
    return picker;
  }
  function renderUploads(note=""){
    clearPreviews();uploadMap.replaceChildren();uploadRows=[];
    const files=[...filesInput.files],targets=targetList();
    if(files.length>10){
      message("Choose no more than ten files in one batch.");
      updateReady();return;
    }
    if(scope.value==="fill"){
      files.forEach((file,index)=>{
        if(index>=placements.length)return;
        const row=document.createElement("div");row.className="motifSwapRow motifSwapFillRow";
        const url=URL.createObjectURL(file);previewURLs.push(url);
        const thumb=image(url,"New motif for the entire pattern");
        const fields=document.createElement("div");fields.className="motifSwapFields";
        const alphaHint=document.createElement("span");alphaHint.className="motifSwapReplacement";
        alphaHint.textContent="Checking transparency…";
        thumb.addEventListener("load",()=>{
          const info=window.PatternForgeAlpha?.analyse(thumb);
          alphaHint.textContent=info?.transparent?"✓ Transparent image":
            info?.canClean?"⚠ Solid background detected; tick Remove solid backgrounds below":
            "⚠ Opaque background detected. A genuine transparent PNG may be needed.";
        },{once:true});
        const title=document.createElement("strong");title.textContent="Motif "+(index+1);
        const label=document.createElement("span");label.className="motifSwapReplacement";
        label.textContent=file.name+" · Repeats across the pattern";
        fields.append(title,label,alphaHint);row.append(thumb,fields);uploadMap.appendChild(row);
        uploadRows.push({file});
      });
      if(files.length>placements.length)message("Your layout has only "+placements.length+
        " positions. Choose up to "+placements.length+" images, or add more positions first.");
      else message("");
      updateReady();
      return;
    }
    const active=targetList();
    files.forEach((file,index)=>{
      if(index>=active.length)return;
      const target=active[index];
      const row=document.createElement("div");row.className="motifSwapRow";
      const original=image(target.src,"Image currently in this position");
      const fields=document.createElement("div");fields.className="motifSwapFields";
      const picker=makeSourceSelect(target.id),newPreview=image("","New replacement image");
      const url=URL.createObjectURL(file);previewURLs.push(url);newPreview.src=url;
      const alphaHint=document.createElement("span");alphaHint.className="motifSwapReplacement";
      alphaHint.textContent="Checking transparency…";
      newPreview.addEventListener("load",()=>{
        const info=window.PatternForgeAlpha?.analyse(newPreview);
        alphaHint.textContent=info?.transparent?"✓ Transparent image":
          info?.canClean?"⚠ Solid background detected; tick Remove solid backgrounds below":
          "⚠ Opaque background detected. Re-export transparent PNG if you see a rectangle.";
      },{once:true});
      picker.addEventListener("change",()=>{
        original.src=chosenOriginal(picker.value)?.src||"";updateReady();
      });
      const intro=document.createElement("span");intro.className="motifSwapReplacement";
      intro.textContent="Replace with: "+file.name;
      fields.append(labelFor("Replace",picker),intro,alphaHint);
      row.append(original,fields,newPreview);uploadMap.appendChild(row);
      uploadRows.push({file,select:picker});
    });
    if(files.length>active.length)message("You chose "+files.length+" images but there are only "+active.length+
      " replaceable targets in this mode. Select fewer, or add more copies to your design.");
    else message("");
    updateReady();
    if(note)scopeHelp.textContent=note+" "+scopeHelp.textContent;
  }
  function renderLibraryRows(count=1){
    libraryMap.replaceChildren();libraryRows=[];
    const targets=targetList(),available=scope.value==="fill"?replacementLibrary().length>0:library.length>0;
    if(scope.value==="fill"){
      const availableReplacements=replacementLibrary();
      for(let index=0;index<Math.min(count,placements.length,availableReplacements.length,10);index++){
        const row=document.createElement("div");row.className="motifSwapRow motifSwapFillRow";
        const to=document.createElement("select");to.setAttribute("aria-label","Motif for whole pattern");
        options(to,availableReplacements);
        to.value=availableReplacements[index].id;
        const preview=image(chosenReplacement(to.value)?.src||"","New motif");
        const fields=document.createElement("div");fields.className="motifSwapFields";
        to.addEventListener("change",()=>{preview.src=chosenReplacement(to.value)?.src||"";updateReady();});
        fields.append(labelFor("Motif "+(index+1),to));
        const remove=document.createElement("button");remove.type="button";remove.className="motifSwapRemove";
        remove.textContent="Remove this image";remove.addEventListener("click",()=>{
          libraryRows=libraryRows.filter(entry=>entry.row!==row);row.remove();updateReady(true);
          addMapping.disabled=libraryRows.length>=Math.min(10,placements.length,availableReplacements.length);
        });
        fields.append(remove);row.append(preview,fields);libraryMap.appendChild(row);
        libraryRows.push({row,to});
      }
      addMapping.disabled=libraryRows.length>=Math.min(10,placements.length,availableReplacements.length);
      updateReady();return;
    }
    for(let index=0;index<Math.min(count,targets.length,10);index++){
      const row=document.createElement("div");row.className="motifSwapRow";
      const target=targets[index],original=image(target.src,"Original artwork");
      const fields=document.createElement("div");fields.className="motifSwapFields";
      const from=makeSourceSelect(target.id),to=document.createElement("select");
      to.setAttribute("aria-label","New image from library");
      options(to,library);
      const alternative=library.find(a=>a.id!==originalAssetId(target.id));
      if(alternative)to.value=alternative.id;
      const replacement=image(chosenReplacement(to.value)?.src||"","Replacement image");
      from.addEventListener("change",()=>{
        original.src=chosenOriginal(from.value)?.src||"";
        if(to.value===originalAssetId(from.value)){
          to.value=library.find(a=>a.id!==originalAssetId(from.value))?.id||to.value;
        }
        replacement.src=chosenReplacement(to.value)?.src||"";
        updateReady();
      });
      to.addEventListener("change",()=>{replacement.src=chosenReplacement(to.value)?.src||"";updateReady();});
      fields.append(labelFor("Replace",from),labelFor("With",to));
      const remove=document.createElement("button");remove.type="button";remove.className="motifSwapRemove";
      remove.textContent="Remove this swap";remove.addEventListener("click",()=>{
        const countNow=libraryRows.length;
        libraryRows=libraryRows.filter(r=>r.row!==row);row.remove();
        if(countNow>0)updateReady(true);
      });
      fields.append(remove);row.append(original,fields,replacement);libraryMap.appendChild(row);
      libraryRows.push({row,from,to});
    }
    addMapping.disabled=!available||libraryRows.length>=10||libraryRows.length>=targets.length;
    updateReady();
  }
  function switchScope(){
    helperMessage();
    if(mode.value==="library")renderLibraryRows(Math.max(1,Math.min(libraryRows.length,targetList().length)));
    else renderUploads();
  }
  function switchMode(){
    const useLibrary=mode.value==="library";
    librarySection.hidden=!useLibrary;uploadSection.hidden=useLibrary;
    helperMessage();
    if(useLibrary)renderLibraryRows(Math.max(1,libraryRows.length));
    else renderUploads();
  }
  function openDialog(){
    sources=api.sources();placements=api.placements();library=api.library();
    if(!sources.length){
      const status=$("status");if(status)status.textContent="Add at least one motif to your pattern before creating a copy.";
      return;
    }
    const originalName=String(api.projectTitle()||"Pattern").trim();
    const title=originalName.replace(/(?:\s*-\s*(?:Motif Remix|Remix)(?:\s+\d+)?)+\s*$/ig,"").trim()||"Pattern";
    name.value=(title+(originalName===title?" - Motif Remix":" - Remix 2")).slice(0,80);
    summary.textContent=placements.length+" placed image"+(placements.length===1?"":"s")+
      " · "+sources.length+" motif type"+(sources.length===1?"":"s")+
      " · Exact layout preserved in the new design.";
    filesInput.value="";if($("motifSwapRemovePlain"))$("motifSwapRemovePlain").checked=false;
    uploadMap.replaceChildren();libraryMap.replaceChildren();
    uploadRows=[];libraryRows=[];clearPreviews();message("");
    scope.value="fill";
    mode.value="upload";
    helperMessage();switchMode();dialog.showModal();
  }
  open.addEventListener("click",openDialog);
  const closeDialog=()=>{dialog.close();clearPreviews();};
  close.addEventListener("click",closeDialog);
  cancel.addEventListener("click",closeDialog);
  dialog.addEventListener("close",clearPreviews);
  scope.addEventListener("change",switchScope);
  mode.addEventListener("change",switchMode);
  filesInput.addEventListener("change",()=>renderUploads());
  name.addEventListener("input",()=>updateReady());
  addMapping.addEventListener("click",()=>{
    const count=libraryRows.length;
    if(count>=Math.min(targetList().length,10)){updateReady(true);return;}
    const previous=libraryRows.map(row=>({from:row.from?.value,to:row.to.value}));
    renderLibraryRows(count+1);
    previous.forEach((values,i)=>{
      if(libraryRows[i].from&&values.from!==undefined)libraryRows[i].from.value=values.from;
      libraryRows[i].to.value=values.to;
      libraryRows[i].from?.dispatchEvent(new Event("change"));
      libraryRows[i].to.dispatchEvent(new Event("change"));
    });
    updateReady();
  });
  apply.addEventListener("click",async()=>{
    if(busy)return;
    const issue=updateReady(true);if(issue)return;
    const title=name.value.trim();
    if(!title||title.length>80){message("Enter a name for the new design.");return;}
    const mappings=getMappings();
    busy=true;updateReady();
    try{
      await api.create(title,mappings);
      closeDialog();filesInput.value="";
    }catch(err){
      message(err?.message||"Could not create this copy. Your original is unchanged.");
    }finally{
      busy=false;updateReady();
    }
  });
})();
