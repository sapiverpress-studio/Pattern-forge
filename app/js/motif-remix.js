/* Duplicate a seamless layout and replace up to ten placed motif types.
   Replacement assets may be already imported images or newly uploaded files. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const dialog=$("motifSwapDialog"),open=$("motifSwapOpen"),close=$("motifSwapClose"),
    cancel=$("motifSwapCancel"),filesInput=$("motifSwapFiles"),
    mappings=$("motifSwapMapping"),name=$("motifSwapName"),mode=$("motifSwapMode"),
    librarySection=$("motifSwapLibrarySection"),uploadSection=$("motifSwapUploadSection"),
    libraryMapping=$("motifSwapLibraryMapping"),addMapping=$("motifSwapAddMapping"),
    apply=$("motifSwapApply"),error=$("motifSwapError");
  if(!dialog||!open||!filesInput||!window.PatternForgeRemix||!mode)return;
  let sources=[],library=[],uploadRows=[],libraryRows=[];
  function message(value){error.textContent=value||"";}
  function optionList(select,assets){
    for(const asset of assets){
      const option=document.createElement("option");option.value=asset.id;
      option.textContent=asset.name+(asset.placed!==undefined?" ("+asset.placed+" placed)":"");
      select.appendChild(option);
    }
  }
  function addLibraryRow(){
    if(libraryRows.length>=10||libraryRows.length>=sources.length){message("You can replace up to ten distinct motif types in one copy.");return;}
    const taken=new Set(libraryRows.map(row=>row.from.value));
    const initial=sources.find(source=>!taken.has(source.id));
    if(!initial){message("Every motif type is already assigned.");return;}
    const row=document.createElement("div");row.className="motifSwapRow";
    const original=document.createElement("img");original.className="motifSwapThumb";original.alt="Original artwork";original.src=initial.src;
    const fields=document.createElement("div");fields.className="motifSwapFields";
    const fromLabel=document.createElement("label");fromLabel.textContent="Replace these placed copies";
    const from=document.createElement("select");from.setAttribute("aria-label","Original placed motif type");
    optionList(from,sources);from.value=initial.id;fromLabel.appendChild(from);
    const toLabel=document.createElement("label");toLabel.textContent="With this imported image";
    const to=document.createElement("select");to.setAttribute("aria-label","Replacement from image library");
    optionList(to,library);
    const replacement=library.find(asset=>asset.id!==initial.id);
    if(replacement)to.value=replacement.id;
    toLabel.appendChild(to);
    const thumb=document.createElement("img");thumb.className="motifSwapThumb";thumb.alt="Replacement artwork";thumb.src=library.find(a=>a.id===to.value)?.src||"";
    const remove=document.createElement("button");remove.type="button";remove.className="btn";remove.textContent="Remove swap";
    remove.addEventListener("click",()=>{libraryRows=libraryRows.filter(record=>record.row!==row);row.remove();message("");});
    from.addEventListener("change",()=>{original.src=sources.find(a=>a.id===from.value)?.src||"";});
    to.addEventListener("change",()=>{thumb.src=library.find(a=>a.id===to.value)?.src||"";});
    fields.append(fromLabel,toLabel,remove);row.append(original,fields,thumb);
    libraryMapping.appendChild(row);libraryRows.push({row,from,to});
    message("");
  }
  function renderUploads(){
    mappings.replaceChildren();uploadRows=[];
    const files=[...filesInput.files];
    if(!files.length){message("Choose up to ten replacement images, then match them to originals.");return;}
    if(files.length>10||files.length>sources.length){message("Select no more than ten images, or the number of motif types in this design.");return;}
    message("");
    files.forEach((file,index)=>{
      const row=document.createElement("div");row.className="motifSwapRow";
      const thumb=document.createElement("img");thumb.className="motifSwapThumb";thumb.alt="Original artwork";thumb.src=sources[index].src;
      const group=document.createElement("div");group.className="motifSwapFields";
      const label=document.createElement("label");label.textContent="Replace original with "+file.name;
      const picker=document.createElement("select");picker.setAttribute("aria-label","Original motif replaced by "+file.name);
      optionList(picker,sources);picker.value=sources[index].id;
      picker.addEventListener("change",()=>{thumb.src=sources.find(a=>a.id===picker.value)?.src||"";});
      label.appendChild(picker);group.append(label);
      const note=document.createElement("span");note.className="motifSwapReplacement";note.textContent="New image: "+file.name;group.append(note);
      row.append(thumb,group);mappings.appendChild(row);uploadRows.push({file,picker});
    });
  }
  function renderMode(){
    const useLibrary=mode.value==="library";
    librarySection.hidden=!useLibrary;uploadSection.hidden=useLibrary;message("");
    if(useLibrary&&!libraryRows.length)addLibraryRow();
    if(!useLibrary&&filesInput.files.length)renderUploads();
  }
  function openDialog(){
    const api=window.PatternForgeRemix;
    sources=api.sources();library=api.library();
    if(!sources.length){
      const status=$("status");if(status)status.textContent="Place an image in the design before copying its pattern layout.";
      return;
    }
    const title=$("projectNameDisplay")?.textContent?.split(" · ")[0]||"Pattern";
    name.value=(title+" - New Colourway").slice(0,80);
    filesInput.value="";mappings.replaceChildren();libraryMapping.replaceChildren();
    uploadRows=[];libraryRows=[];message("");
    mode.value=library.some(asset=>sources.some(s=>s.id!==asset.id))?"library":"upload";
    renderMode();dialog.showModal();
  }
  open.addEventListener("click",openDialog);
  close.addEventListener("click",()=>dialog.close());
  cancel.addEventListener("click",()=>dialog.close());
  mode.addEventListener("change",renderMode);
  filesInput.addEventListener("change",renderUploads);
  addMapping.addEventListener("click",addLibraryRow);
  apply.addEventListener("click",async()=>{
    if(apply.disabled)return;
    const title=name.value.trim();
    if(!title||title.length>80){message("Give the new design a name, maximum 80 characters.");return;}
    let mappingsToApply=[];
    if(mode.value==="library"){
      if(!libraryRows.length){message("Add at least one image swap.");return;}
      mappingsToApply=libraryRows.map(row=>({fromAssetId:row.from.value,toAssetId:row.to.value}));
      if(mappingsToApply.some(row=>row.fromAssetId===row.toAssetId)){message("Choose different original and replacement images.");return;}
    }else{
      const files=[...filesInput.files];
      if(!files.length||files.length>10||files.length>sources.length||uploadRows.length!==files.length){
        message("Choose between one and ten replacement files and review the mapping.");return;
      }
      mappingsToApply=uploadRows.map(row=>({fromAssetId:row.picker.value,file:row.file}));
    }
    const ids=mappingsToApply.map(row=>row.fromAssetId);
    if(new Set(ids).size!==ids.length){message("The same original motif has been chosen more than once.");return;}
    apply.disabled=true;apply.textContent="Creating separate pattern…";message("");
    try{
      await window.PatternForgeRemix.create(title,mappingsToApply);
      dialog.close();filesInput.value="";
    }catch(err){
      message(err?.message||"The pattern copy failed. Your original design is unchanged.");
    }finally{
      apply.disabled=false;apply.textContent="Create separate design";
    }
  });
})();
