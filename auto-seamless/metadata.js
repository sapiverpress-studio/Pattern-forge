'use strict';
// Automatic visual metadata. No filename guessing, subject dropdown or fake SEO research.
(function(){
const E=id=>document.getElementById(id);
const ENDPOINT="/api/auto-seamless-listing";
const fields=["metaName","metaMain","metaTags","metaDesc"];
const copyActions=["name","main","tags","desc","all"];
let currentFile=null,sequence=0,active=null,ready=false;
function status(message,loading=false){
  E("metaNotice").textContent=message;
  E("metaGenerate").disabled=loading||!currentFile;
  E("metaGenerate").textContent=loading?"Analysing artwork…":"Analyse image again";
}
function clear(){
  ready=false;
  fields.forEach(id=>E(id).value="");
  copyActions.forEach(id=>E("copy-"+id).disabled=true);
  E("saveMeta").disabled=true;
  E("metaCount").textContent="Waiting for automatic image analysis";
}
function smallPreview(){
  if(!state.source||!sourceCanvas.width||!sourceCanvas.height)throw Error("No uploaded artwork available");
  const max=768,scale=Math.min(1,max/Math.max(sourceCanvas.width,sourceCanvas.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(sourceCanvas.width*scale));
  canvas.height=Math.max(1,Math.round(sourceCanvas.height*scale));
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(sourceCanvas,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",0.78);
}
async function analyse(file){
  if(!file||!state.source)return;
  const token=++sequence;
  if(active)active.abort();
  const ctrl=new AbortController();active=ctrl;
  clear();status("AI is examining the image and preparing the title, 15 tags and description…",true);
  const timer=setTimeout(()=>ctrl.abort(),40000);
  try{
    const preview=smallPreview();
    if(preview.length>800000)throw Error("Image preview exceeds the analysis limit");
    const result=await fetch(ENDPOINT,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({imageDataUrl:preview,filename:file.name||""}),
      signal:ctrl.signal,cache:"no-store"
    });
    const data=await result.json().catch(()=>({}));
    if(token!==sequence)return;
    if(!result.ok)throw Error(data.error||"Image analysis is unavailable");
    const title=String(data.title||"").trim(),main=String(data.main_tag||"").trim(),
      tags=Array.isArray(data.other_tags)?data.other_tags.map(x=>String(x).trim()):[],
      description=String(data.description||"").trim();
    if(!title||!main||tags.length!==14||!description||!/\bAI\b/i.test(description))
      throw Error("The analysis returned incomplete listing information");
    E("metaName").value=title;E("metaMain").value=main;
    E("metaTags").value=tags.join(", ");E("metaDesc").value=description.slice(0,250);
    ready=true;copyActions.forEach(id=>E("copy-"+id).disabled=false);
    E("saveMeta").disabled=false;
    E("metaCount").textContent="14 additional tags · 15 total · "+E("metaDesc").value.length+"/250 description characters";
    status("Automatically generated from the image. Check accuracy before publishing; live keyword volumes were not checked.");
  }catch(error){
    if(token!==sequence)return;
    const message=error?.name==="AbortError"?"AI analysis timed out.":
      error?.message||"Automatic image analysis failed.";
    status(message+" Tap Analyse image again to retry; no generic placeholder tags were inserted.");
  }finally{
    clearTimeout(timer);
    if(token===sequence)active=null;
  }
}
function collect(){
  if(!ready)return null;
  const title=E("metaName").value.trim(),main=E("metaMain").value.trim().slice(0,50);
  const tags=E("metaTags").value.split(",").map(x=>x.trim().slice(0,50)).filter(Boolean);
  if(!title||!main||tags.length!==14){
    status("Keep one main tag and 14 other tags before copying.");
    return null;
  }
  const suffix=" Created with the aid of AI.";
  let description=E("metaDesc").value.trim();
  if(!/\bAI\b/i.test(description))description=description.slice(0,250-suffix.length).trimEnd()+suffix;
  description=description.slice(0,250);
  E("metaDesc").value=description;
  return {title,main,tags,description};
}
function textFor(kind){
  const result=collect();if(!result)return "";
  if(kind==="name")return result.title;
  if(kind==="main")return result.main;
  if(kind==="tags")return result.tags.join(", ");
  if(kind==="desc")return result.description;
  return "Title: "+result.title+"\nMain tag: "+result.main+
    "\n14 other tags: "+result.tags.join(", ")+
    "\nDescription: "+result.description+
    "\n\nSource: AI visual description; keyword demand and search volumes are not measured.";
}
async function copy(kind){
  const t=textFor(kind);if(!t)return;
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(t);
    else{const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();}
    status("Copied "+(kind==="all"?"all listing information":kind)+".");
  }catch{status("Browser prevented copying. Select and copy the text manually.");}
}
function save(){
  const t=textFor("all");if(!t)return;
  const blob=new Blob([t],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;
  link.download=(state.fileName||"design")+"-redbubble-listing.txt";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
for(const kind of copyActions)E("copy-"+kind).addEventListener("click",()=>copy(kind));
E("saveMeta").addEventListener("click",save);
E("metaGenerate").addEventListener("click",()=>{if(currentFile&&state.source)analyse(currentFile)});
E("metaDesc").addEventListener("input",()=>E("metaCount").textContent=
  "14 additional tags · 15 total · "+E("metaDesc").value.length+"/250 description characters");
clear();status("Upload an image; its listing will be generated automatically.");
const originalLoad=loadFile;
loadFile=async function(file){
  ++sequence;if(active)active.abort();
  currentFile=null;clear();
  if(!file)return;
  const permitted=/^image\/(?:png|jpeg|webp)$/.test(file.type)&&file.size<=70*1024*1024;
  await originalLoad(file);
  if(permitted&&state.source){currentFile=file;await analyse(file);}
};
})();
