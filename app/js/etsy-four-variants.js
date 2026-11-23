/* Etsy four-variant buyer packaging. One complete transparent master (never
   resampled) and three solid-colour versions, each in two explicit PNG sizes.
   Output is four buyer ZIPs where possible; lossless multipart PNG can require
   up to Etsy's five-file maximum. No file is silently downscaled. */
(()=>{
 "use strict";
 const MAX_BYTES=20_000_000,MAX_FILES=5;
 const color=/^#[0-9a-f]{6}$/i;
 const safe=(base,suffix)=>(base+suffix).slice(0,70);
 const variantManifest=(original,versions,multipart)=>({
   format:"sapiver-four-background-pattern",version:1,
   transparent:{name:original.name,width:original.spec.wPx,height:original.spec.hPx,dpi:original.spec.dpi,
     reconstructionParts:multipart},
   backgrounds:versions.map(v=>({
     colour:v.colour,
     files:v.assets.map(a=>({name:a.name,width:a.spec.wPx,height:a.spec.hPx,dpi:a.spec.dpi,bytes:a.blob.size}))
   })),
   buyerRestorationRequired:multipart>0
 });
 async function build({base,transparent,versions,makeZip,makeDocuments,splitter}){
   if(typeof base!=="string"||!base||!Array.isArray(versions)||versions.length!==3||
      typeof makeZip!=="function"||typeof makeDocuments!=="function")
     throw Error("Exactly one transparent master and three coloured pattern versions are required.");
   const hexes=versions.map(v=>v.colour.toLowerCase());
   if(new Set(hexes).size!==3||hexes.some(v=>!color.test(v)))throw Error("Choose three different valid background colours.");
   for(const version of versions){
     if(version.assets?.length!==2||new Set(version.assets.map(a=>a.spec.wPx+"x"+a.spec.hPx)).size!==2)
       throw Error("Each background colour needs two different PNG sizes.");
     for(const asset of version.assets)
       if(!asset?.blob?.size||asset.blob.size>MAX_BYTES-3000)
         throw Error("A coloured PNG exceeds Etsy's 20 MB limit: "+(asset?.name||"unnamed")+". Choose the smaller PNG size option; the transparent original is unaffected.");
   }
   const docs=makeDocuments(0),originalFile={name:transparent.name,blob:transparent.blob};
   const first=await makeZip([originalFile,...docs]);
   let transparentGroups=[],multipartCount=0,split=null;
   if(first.size<=MAX_BYTES){
     transparentGroups=[{name:safe(base,"-buyer-01-transparent.zip"),blob:first,files:[originalFile,...docs]}];
   }else{
     if(!splitter)throw Error("The original transparent PNG exceeds 20 MB; lossless multipart support is unavailable.");
     split=await splitter(transparent.blob,transparent.name,transparent.spec);
     multipartCount=split.parts.length;
     if(multipartCount+1>MAX_FILES)throw Error("The full-resolution transparent PNG requires too many parts to leave room for the colour versions. No artwork was resized.");
     const shardDocs=makeDocuments(multipartCount);
     for(let i=0;i<split.parts.length;i++){
       const files=[{name:split.parts[i].name,blob:split.parts[i].blob},...shardDocs];
       const blob=await makeZip(files);
       if(blob.size>MAX_BYTES)throw Error("Transparent PNG part "+(i+1)+" exceeds Etsy's 20 MB limit. No artwork was changed.");
       transparentGroups.push({name:safe(base,"-buyer-"+String(i+1).padStart(2,"0")+"-png-part.zip"),blob,files});
     }
   }
   const manifest=variantManifest({...transparent,name:transparent.name},versions,multipartCount);
   const supplementary=[
     {name:"SAPIVER-FOUR-VARIANTS.json",blob:new Blob([JSON.stringify(manifest,null,2)],{type:"application/json"})},
     ...(split?[
       {name:"PNG-REASSEMBLY.json",blob:new Blob([JSON.stringify(split.manifest,null,2)],{type:"application/json"})},
       {name:"REBUILD-PNG.html",blob:split.html}
     ]:[])
   ];
   const groupsAvailable=MAX_FILES-transparentGroups.length;
   // Prefer one independent ZIP per background. Group two colour pairs together
   // only when the original PNG needs extra Etsy attachment slots.
   const candidates=[
     [[0],[1],[2]],
     [[0,1],[2]],[[0,2],[1]],[[1,2],[0]],
     [[0,1,2]]
   ].filter(parts=>parts.length<=groupsAvailable);
   let chosen=null;
   for(const partition of candidates){
     const results=[];let fits=true;
     for(let j=0;j<partition.length;j++){
       const indexes=partition[j];
       const files=[...indexes.flatMap(i=>versions[i].assets),...(j===0?supplementary:[]),...makeDocuments(multipartCount)];
       const blob=await makeZip(files);
       if(blob.size>MAX_BYTES){fits=false;break;}
       results.push({blob,files,indexes});
     }
     if(fits){chosen=results;break;}
   }
   if(!chosen)
     throw Error("The three coloured PNG pairs cannot fit into Etsy's "+groupsAvailable+
       " remaining download slots. Choose smaller explicit colour PNG sizes (for example 1800/900). The full-resolution transparent master has NOT been resized.");
   const colourGroups=chosen.map((v,i)=>({
     name:safe(base,"-buyer-"+String(transparentGroups.length+i+1).padStart(2,"0")+"-colours-"+v.indexes.map(n=>n+1).join("")+".zip"),
     blob:v.blob,files:v.files,indexes:v.indexes
   }));
   const packages=[...transparentGroups,...colourGroups];
   if(packages.length>MAX_FILES||packages.some(p=>p.blob.size>MAX_BYTES))throw Error("Generated buyer ZIPs exceed Etsy file limits.");
   const fileMap=new Map();
   for(const p of packages)for(const f of p.files)fileMap.set(f.name,f);
   return {packages,buyerFiles:[...fileMap.values()],multipartCount,manifest,
     zipCount:packages.length,colours:hexes,colourSizes:versions.map(v=>v.assets.map(a=>({width:a.spec.wPx,height:a.spec.hPx}))),
     groupedColours:colourGroups.some(v=>v.indexes.length>1)};
 }
 window.PatternForgeFourVariants=Object.freeze({build});
})();