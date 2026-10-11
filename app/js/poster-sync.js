(()=>{
 "use strict";
 // Browser-only handoff. No marketplace tokens, shared cookies or server-side writes.
 const POSTER_ORIGIN="https://sapiver-poster-gen-auth.netlify.app";
 const CHANNEL="sapiver-pattern-poster-handoff-v1";
 const KEY="patternForgePosterProduct/v1/";
 const PRODUCT_ID=/^[A-Za-z0-9_-]{32}$/;
 const PROJECT_ID=/^pf-project-[A-Za-z0-9_-]{8,90}$/;
 const MAX_KIT=100000000;
 let pending=false;
 const safeStorage={
   get(id){try{const v=JSON.parse(localStorage.getItem(KEY+id)||"null");return PRODUCT_ID.test(v?.productId||"")?v.productId:null;}catch{return null;}},
   put(id,productId){if(!PROJECT_ID.test(id)||!PRODUCT_ID.test(productId))return false;try{localStorage.setItem(KEY+id,JSON.stringify({productId,savedAt:new Date().toISOString()}));return true;}catch{return false;}}
 };
 function manualDownload(blob,name){
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 async function send(etsyApi,{onReport=()=>{},onStatus=()=>{}}={}){
   if(pending)throw Error("A transfer to Sapiver Prints is already in progress.");
   const project=window.PatternForgeEtsyBridge?.state?.project;
   if(!project||project.isPractice===true||!PROJECT_ID.test(project.id))throw Error("Save a named Pattern Project before sending it to Sapiver Prints.");
   const checks=etsyApi.check();
   if(checks.some(c=>c.state==="fail")){onReport({checks,blockers:checks.filter(c=>c.state==="fail")});throw Error("Fix the failed Etsy export checks before sending.");}
   const projectId=project.id,projectTitle=String(project.title||"Seamless pattern").trim().slice(0,100);
   const existingId=safeStorage.get(projectId);
   // Open while processing a direct user click, before awaiting expensive image/ZIP work.
   // An existing link preloads the private listing record and its approved details.
   const target=window.open(POSTER_ORIGIN+"/poster/upload"+(existingId?"?update="+encodeURIComponent(existingId):""),"_blank");
   if(!target)throw Error("Your browser blocked the Sapiver Prints tab. Allow pop-ups or use Check & build Etsy kit instead.");
   pending=true;
   let kitBlob=null,kitName="",challenge="",received=false,delivered=false,closed=false;
   const status=message=>{onStatus(message);window.PatternForgeEtsyBridge?.setStatus(message);};
   function cleanup(){if(closed)return;closed=true;pending=false;clearTimeout(expiry);window.removeEventListener("message",receive);}
   function fallback(reason){
     if(kitBlob&&!received){manualDownload(kitBlob,kitName);status(reason+" The Etsy kit was downloaded as a fallback; upload it manually in Sapiver Prints.");}
     else status(reason);
     cleanup();
   }
   function deliver(){
     if(!kitBlob||!challenge||closed||received||delivered)return;
     if(target.closed){fallback("The Sapiver Prints tab was closed.");return;}
     try{
       const file=new File([kitBlob],kitName,{type:"application/zip",lastModified:Date.now()});
       target.postMessage({channel:CHANNEL,type:"kit",challenge,projectId,projectTitle,updateProductId:existingId,fileName:kitName,file},POSTER_ORIGIN);
       delivered=true;
       status("Sending the prepared kit to Sapiver Prints. Complete owner sign-in there if prompted.");
     }catch(error){fallback("The browser could not transfer the kit: "+(error?.message||"unknown error"));}
   }
   function receive(event){
     if(event.origin!==POSTER_ORIGIN||event.source!==target||event.data?.channel!==CHANNEL||closed)return;
     const msg=event.data;
     if(msg.type==="ready"&&typeof msg.challenge==="string"&&/^[0-9a-f]{32}$/.test(msg.challenge)){
       if(received)return;
       challenge=msg.challenge;delivered=false;deliver();
     }else if(msg.challenge===challenge&&delivered&&msg.type==="received"&&msg.projectId===projectId){
       received=true;kitBlob=null;
       status("Sapiver Prints received the kit. Enter the price, verify the repeat and press Prepare my product there.");
     }else if(msg.challenge===challenge&&msg.type==="saved"&&msg.projectId===projectId&&PRODUCT_ID.test(msg.productId||"")){
       const stored=safeStorage.put(projectId,msg.productId);
       status(stored?"Product upload accepted for private preparation. Future sends from this project will reuse the same product. Check its review in Sapiver Prints.":"Product upload accepted for private preparation, but this device could not save its product link. Record its ID before making revisions.");
       cleanup();
     }else if(msg.challenge===challenge&&msg.type==="error"&&!received){
       fallback("Sapiver Prints could not receive the kit: "+String(msg.message||"Transfer failed").slice(0,150));
     }
   }
   window.addEventListener("message",receive);
   const expiry=setTimeout(()=>{if(!closed)fallback(received?"The handoff window has expired. Check your saved draft in Sapiver Prints.":"The handoff expired before the product was received.");},15*60*1000);
   try{
     status("Building the checked Etsy kit for Sapiver Prints…");
     const output=await etsyApi.prepare({download:false,returnKit:true});
     onReport(output);
     if(!output.success||!(output.kitBlob instanceof Blob)||output.kitBlob.size<33||output.kitBlob.size>MAX_KIT){
       status(output.error||"Etsy packaging failed or exceeded Poster_gen's 100 MB upload limit.");
       cleanup();return output;
     }
     kitBlob=output.kitBlob;kitName=output.kitName;
     status("Etsy kit ready. Sign in to Sapiver Prints in the new tab if necessary.");
     deliver();
     return output;
   }catch(error){cleanup();throw error;}
 }
 window.PatternForgePosterSync=Object.freeze({send});
})();
