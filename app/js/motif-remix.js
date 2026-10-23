/* Pattern Forge: copy a design and swap 1-10 placed motif TYPES in one batch.
   UI only. The editor validates/decodes all files before changing project state. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const dialog=$("motifSwapDialog"),open=$("motifSwapOpen"),close=$("motifSwapClose"),
    cancel=$("motifSwapCancel"),filesInput=$("motifSwapFiles"),
    mappings=$("motifSwapMapping"),name=$("motifSwapName"),
    apply=$("motifSwapApply"),error=$("motifSwapError");
  if(!dialog||!open||!filesInput||!window.PatternForgeRemix)return;
  let sources=[],rows=[];
  function message(text){error.textContent=text||"";}
  function render(){
    mappings.replaceChildren();rows=[];
    const files=[...filesInput.files];
    if(!files.length){message("Choose up to ten replacement image files. You can then review the matching originals.");return;}
    if(files.length>10){message("Choose no more than ten images in a batch.");return;}
    if(files.length>sources.length){message("The design uses only "+sources.length+" distinct placed motif types. Choose no more replacement files than that.");return;}
    message("");
    files.forEach((file,index)=>{
      const source=sources[index];
      const row=document.createElement("div");row.className="motifSwapRow";
      const thumb=document.createElement("img");thumb.className="motifSwapThumb";thumb.alt="Original motif preview";thumb.src=source.src;
      const group=document.createElement("div");group.className="motifSwapFields";
      const label=document.createElement("label");label.textContent="Original motif to replace with "+file.name;
      const picker=document.createElement("select");picker.setAttribute("aria-label","Original motif replaced by "+file.name);
      for(const asset of sources){
        const option=document.createElement("option");option.value=asset.id;
        option.textContent=asset.name+" ("+asset.placed+" placed)";
        picker.appendChild(option);
      }
      picker.value=source.id;
      picker.addEventListener("change",()=>{
        const selected=sources.find(asset=>asset.id===picker.value);
        if(selected)thumb.src=selected.src;
      });
      const note=document.createElement("span");note.className="motifSwapReplacement";
      note.textContent="New image "+(index+1)+": "+file.name;
      label.appendChild(picker);group.append(label,note);row.append(thumb,group);
      mappings.appendChild(row);rows.push({file,picker});
    });
  }
  function openDialog(){
    const api=window.PatternForgeRemix;
    sources=api.sources();
    if(!sources.length){
      const status=$("status");if(status)status.textContent="Place at least one motif on a design before using Duplicate & replace.";
      return;
    }
    const title=$("projectNameDisplay")?.textContent?.split(" · ")[0]||"Pattern";
    name.value=(title+" - Motif Remix").slice(0,80);
    filesInput.value="";mappings.replaceChildren();message("");
    dialog.showModal();
  }
  open.addEventListener("click",openDialog);
  close.addEventListener("click",()=>dialog.close());
  cancel.addEventListener("click",()=>dialog.close());
  filesInput.addEventListener("change",render);
  apply.addEventListener("click",async()=>{
    if(apply.disabled)return;
    const files=[...filesInput.files];
    if(!files.length||files.length>10||files.length>sources.length||rows.length!==files.length){
      message("Choose between one and ten images and review their mapping.");return;
    }
    const ids=rows.map(row=>row.picker.value);
    if(new Set(ids).size!==ids.length){
      message("The same original motif has been chosen more than once. Each replacement must target a different original.");return;
    }
    const title=name.value.trim();
    if(!title||title.length>80){message("Give this new design a name (maximum 80 characters).");return;}
    apply.disabled=true;apply.textContent="Creating copied design…";message("");
    try{
      await window.PatternForgeRemix.create(title,rows.map(row=>({
        fromAssetId:row.picker.value,file:row.file
      })));
      dialog.close();filesInput.value="";
    }catch(err){
      message(err?.message||"The copied design could not be created. Your existing design is unchanged.");
    }finally{
      apply.disabled=false;apply.textContent="Create separate design";
    }
  });
})();
