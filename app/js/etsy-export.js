(()=>{
  "use strict";
  const bridge=window.PatternForgeEtsyBridge;
  if(!bridge)return;

  const ETSY_MAX_BYTES=20000000;
  const ETSY_MAX_FILES=5;
  const RULES_VERIFIED="2026-10-09";
  const LISTING_W=2400,LISTING_H=1800;
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const blobFromCanvas=(canvas,type="image/jpeg",quality=.92)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Browser could not encode "+type+".")),type,quality));
  const mb=bytes=>(bytes/1000000).toFixed(2)+" MB";
  const cleanStem=()=>{
    const raw=("sapiver-"+bridge.safeName()).toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"");
    return (raw||"sapiver-pattern").slice(0,42);
  };
  const stateFingerprint=()=>{
    const s=bridge.state;
    return JSON.stringify({
      items:s.items,marks:s.marks,layers:s.layers,assets:s.assets.map(a=>({id:a.id,name:a.name,src:a.src,w:a.w,h:a.h,vector:a.vector})),
      templateGuide:s.templateGuide,project:s.project?{...s.project,updatedAt:null}:null
    });
  };
  function artworkCounts(){
    const s=bridge.state;
    const itemCount=s.items.filter(item=>bridge.layerIsRenderable(bridge.layerForArtwork(item,bridge.baseLayerIds.motifs),true)).length;
    const markCount=s.marks.filter(mark=>mark.type!=="eraser"&&bridge.layerIsRenderable(bridge.layerForArtwork(mark,bridge.baseLayerIds.drawing),true)).length;
    return {itemCount,markCount,total:itemCount+markCount};
  }
  function vectorEligible(){
    const s=bridge.state;
    for(const item of s.items){
      const layer=bridge.layerForArtwork(item,bridge.baseLayerIds.motifs);
      if(!bridge.layerIsRenderable(layer,true))continue;
      const asset=bridge.assetOf(item);
      if(!asset||!asset.vector)return false;
    }
    return true;
  }
  function rasterQuality(){
    const s=bridge.state,spec=bridge.getSpec(),sx=spec.wPx/900,sy=spec.hPx/900,uniform=Math.sqrt(sx*sy);
    let maxUpscale=1,rasterCount=0,vectorCount=0;
    for(const item of s.items){
      const layer=bridge.layerForArtwork(item,bridge.baseLayerIds.motifs),asset=bridge.assetOf(item);
      if(!asset||!bridge.layerIsRenderable(layer,true))continue;
      if(asset.vector){vectorCount++;continue;}
      rasterCount++;
      maxUpscale=Math.max(maxUpscale,Math.max(.0001,item.scale*uniform));
    }
    return {maxUpscale:rasterCount?maxUpscale:null,rasterCount,vectorCount};
  }
  function pixelDiff(data,a,b){
    const aa=data[a+3]/255,ba=data[b+3]/255;
    const dr=data[a]*aa-data[b]*ba,dg=data[a+1]*aa-data[b+1]*ba,db=data[a+2]*aa-data[b+2]*ba,da=(data[a+3]-data[b+3])*.75;
    return Math.sqrt(dr*dr+dg*dg+db*db+da*da);
  }
  function seamMetrics(){
    const mult=bridge.getMultipliers(),base=320,w=base*mult.x,h=base*mult.y;
    const canvas=bridge.makeTileCanvas(w,h,base,base,bridge.getRepeatStyle(),true),ctx=canvas.getContext("2d",{willReadFrequently:true}),data=ctx.getImageData(0,0,w,h).data;
    const mean=values=>values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),lr=[],lrLocal=[],tb=[],tbLocal=[];
    for(let y=0;y<h;y+=2){
      const row=y*w*4;lr.push(pixelDiff(data,row,(row+(w-1)*4)));lrLocal.push(pixelDiff(data,row,row+4),pixelDiff(data,row+(w-2)*4,row+(w-1)*4));
    }
    for(let x=0;x<w;x+=2){
      const top=x*4,bottom=((h-1)*w+x)*4;tb.push(pixelDiff(data,top,bottom));tbLocal.push(pixelDiff(data,top,top+w*4),pixelDiff(data,((h-2)*w+x)*4,bottom));
    }
    canvas.width=1;canvas.height=1;
    const finish=(edge,local)=>{
      const edgeMean=mean(edge),localMean=mean(local),limit=Math.max(22,localMean*4+6);
      return {edgeMean,localMean,limit,pass:edgeMean<=limit};
    };
    return {leftRight:finish(lr,lrLocal),topBottom:finish(tb,tbLocal)};
  }
  function check(){
    const checks=[],spec=bridge.getSpec(),counts=artworkCounts();
    if(bridge.isDoodle())checks.push({id:"project-type",state:"fail",label:"Pattern Project required",detail:"Export for Etsy is for seamless Pattern Projects, not standalone Doodle artwork."});
    else checks.push({id:"project-type",state:"pass",label:"Pattern Project",detail:"Seamless repeat packaging is available."});
    checks.push({id:"artwork",state:counts.total?"pass":"fail",label:"Artwork present",detail:counts.total?counts.total+" editable element"+(counts.total===1?"":"s")+" will be rendered.":"Add artwork before creating an Etsy product."});
    checks.push({id:"dimensions",state:"pass",label:"Master raster file",detail:spec.wPx+" × "+spec.hPx+" px complete repeat cell. This is file resolution, not a fixed physical product size."});
    const q=rasterQuality();
    if(!q.rasterCount)checks.push({id:"source-quality",state:"pass",label:"Source quality",detail:"Placed imported motifs are vector sources; drawn artwork renders at the master raster resolution."});
    else if(q.maxUpscale<=1.25)checks.push({id:"source-quality",state:"pass",label:"Source quality",detail:"Raster motifs are not being substantially enlarged in the master raster."});
    else if(q.maxUpscale<=2)checks.push({id:"source-quality",state:"warn",label:"Source quality",detail:"At least one raster motif is enlarged about "+q.maxUpscale.toFixed(1)+"× in the master raster. The design is still exportable, but extreme enlargement by the buyer may soften detail."});
    else checks.push({id:"source-quality",state:"warn",label:"Source quality",detail:"At least one raster motif is enlarged about "+q.maxUpscale.toFixed(1)+"× in the master raster. Inspect sharpness before listing; the exporter does not impose a fixed physical-use size."});
    if(!bridge.isDoodle()&&counts.total){
      const seams=seamMetrics(),pass=seams.leftRight.pass&&seams.topBottom.pass;
      checks.push({id:"seams",state:pass?"pass":"fail",label:"Seam continuity",detail:pass?"Opposite-edge pixel continuity is within tolerance in both directions.":"A strong discontinuity was detected at "+(!seams.leftRight.pass&&!seams.topBottom.pass?"both tile seams":!seams.leftRight.pass?"the left/right seam":"the top/bottom seam")+". Inspect the repeat before sale.",metrics:seams});
    }
    const transparent=!!$("transparent")?.checked;
    checks.push({id:"transparency",state:"pass",label:"Background handling",detail:transparent?"PNG retains transparency; JPG and design-only listing images are flattened against the selected background colour.":"PNG, JPG and design-only listing images use the selected background colour."});
    checks.push({id:"vector",state:"info",label:"SVG eligibility",detail:vectorEligible()?"A vector SVG can be included inside the buyer ZIP.":"At least one placed asset is raster, so the Etsy package will omit SVG rather than label a raster-backed SVG as genuine vector."});
    checks.push({id:"etsy-rules",state:"info",label:"Etsy upload rules",detail:"Checked against Etsy rules verified "+RULES_VERIFIED+": up to "+ETSY_MAX_FILES+" digital files, maximum 20 MB each. Buyer packages are generated as ZIP files."});
    return checks;
  }
  const blocking=checks=>checks.filter(c=>c.state==="fail");
  async function flattenedTileCanvas(){
    const spec=bridge.getSpec(),tile=bridge.makeTileCanvas(spec.wPx,spec.hPx,4000,4000,bridge.getRepeatStyle(),true),out=document.createElement("canvas");
    out.width=spec.wPx;out.height=spec.hPx;const ctx=out.getContext("2d");ctx.fillStyle=$("bg")?.value||"#ffffff";ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(tile,0,0);tile.width=1;tile.height=1;return {canvas:out,spec};
  }
  async function jpegTile(){
    const made=await flattenedTileCanvas(),blob=await blobFromCanvas(made.canvas,"image/jpeg",.94);made.canvas.width=1;made.canvas.height=1;return {blob,spec:made.spec};
  }
  async function repeatPreview(){
    const mult=bridge.getMultipliers(),base=700,cw=base*mult.x,ch=base*mult.y,cell=bridge.makeTileCanvas(cw,ch,base,base,bridge.getRepeatStyle(),true),out=document.createElement("canvas");
    out.width=cw*3;out.height=ch*3;const ctx=out.getContext("2d");ctx.fillStyle=$("bg")?.value||"#ffffff";ctx.fillRect(0,0,out.width,out.height);
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)ctx.drawImage(cell,x*cw,y*ch);
    const blob=await blobFromCanvas(out,"image/jpeg",.9);cell.width=1;cell.height=1;out.width=1;out.height=1;
    return {blob,width:cw*3,height:ch*3};
  }
  function makeListingTile(base){
    const mult=bridge.getMultipliers(),raw=bridge.makeTileCanvas(base*mult.x,base*mult.y,base,base,bridge.getRepeatStyle(),true),tile=document.createElement("canvas");
    tile.width=raw.width;tile.height=raw.height;const t=tile.getContext("2d");t.fillStyle=$("bg")?.value||"#ffffff";t.fillRect(0,0,tile.width,tile.height);t.drawImage(raw,0,0);raw.width=1;raw.height=1;return tile;
  }
  function listingCanvas(kind,tile){
    const c=document.createElement("canvas");c.width=LISTING_W;c.height=LISTING_H;const x=c.getContext("2d");
    x.fillStyle=$("bg")?.value||"#ffffff";x.fillRect(0,0,c.width,c.height);
    if(kind==="repeat"||kind==="detail"){
      const pat=x.createPattern(tile,"repeat");x.fillStyle=pat;x.fillRect(0,0,c.width,c.height);return c;
    }
    if(kind==="tile"){
      x.fillStyle="#f4f1eb";x.fillRect(0,0,c.width,c.height);
      const scale=Math.min((c.width*.82)/tile.width,(c.height*.82)/tile.height),w=tile.width*scale,h=tile.height*scale,left=(c.width-w)/2,top=(c.height-h)/2;
      x.shadowColor="rgba(0,0,0,.16)";x.shadowBlur=36;x.shadowOffsetY=16;x.fillStyle="#ffffff";x.fillRect(left-18,top-18,w+36,h+36);x.shadowColor="transparent";x.drawImage(tile,left,top,w,h);return c;
    }
    return c;
  }
  async function listingImages(){
    const repeatTile=makeListingTile(360),tileTile=makeListingTile(720),detailTile=makeListingTile(640),spec=[
      {kind:"repeat",name:"01-full-pattern.jpg",tile:repeatTile},
      {kind:"tile",name:"02-seamless-tile.jpg",tile:tileTile},
      {kind:"detail",name:"03-pattern-detail.jpg",tile:detailTile}
    ],out=[];
    for(const item of spec){
      const canvas=listingCanvas(item.kind,item.tile),blob=await blobFromCanvas(canvas,"image/jpeg",.9);out.push({name:item.name,blob,width:LISTING_W,height:LISTING_H});canvas.width=1;canvas.height=1;
    }
    repeatTile.width=1;repeatTile.height=1;tileTile.width=1;tileTile.height=1;detailTile.width=1;detailTile.height=1;return out;
  }
  function instructions(spec,hasSvg){
    const style=bridge.getRepeatStyle();
    return [
      "SAPIVER PRINTS — DIGITAL SEAMLESS PATTERN",
      "",
      "Thank you for purchasing this digital pattern.",
      "",
      "WHAT IS INCLUDED",
      "- PNG seamless master tile: "+spec.wPx+" × "+spec.hPx+" px.",
      "- JPG seamless master tile: "+spec.wPx+" × "+spec.hPx+" px with a flattened background.",
      "- 3 × 3 repeat preview JPG for checking the seamless repeat.",
      hasSvg?"- SVG vector repeat file for resolution-independent scaling.":"- SVG is not included because this design contains raster artwork.",
      "- Licence terms.",
      "",
      "SIZE AND SCALING",
      "This design is not tied to a physical product size. The pixel dimensions above describe the raster master file only.",
      "You may scale the design to suit your project. Raster enlargement can reduce sharpness; use the SVG where supplied when you need resolution-independent scaling.",
      "",
      "REPEAT TYPE",
      style==="straight"?"Straight repeat.":style==="half-drop"?"Half-drop repeat; use the complete rectangular repeat cell supplied.":"Brick repeat; use the complete rectangular repeat cell supplied.",
      "",
      "HOW TO USE",
      "Place the seamless tile into software that supports repeating/tiled fills. Repeat the complete supplied tile edge-to-edge without cropping or stretching it non-proportionally.",
      "Choose the scale that suits your intended use and check the requirements of the software, printer or production service you use.",
      "",
      "IMPORTANT",
      "This is a digital product. No physical item is included.",
      "Colours can vary between displays, printers, inks and materials.",
      "",
      "Sapiver Prints"
    ].join("\n");
  }
  function licence(){
    return [
      "SAPIVER PRINTS — DIGITAL PATTERN LICENCE",
      "",
      "PERMITTED",
      "- Personal use.",
      "- Commercial use in finished physical or digital end products where this pattern is part of the finished design.",
      "- Reasonable modification of colour, scale and composition for your end product.",
      "",
      "NOT PERMITTED",
      "- Reselling, redistributing, sharing or giving away the original pattern files, whether modified or unmodified.",
      "- Uploading the source pattern files to another marketplace, stock library, design-resource site or shared drive.",
      "- Sublicensing the source files or claiming the original pattern artwork as your own.",
      "",
      "The licence applies to the purchased pattern files. It does not transfer copyright in the original artwork.",
      "",
      "Sapiver Prints"
    ].join("\n");
  }
  function reportText(checks){
    return ["PATTERN FORGE — ETSY EXPORT QUALITY REPORT","Generated: "+new Date().toISOString(),"",...checks.map(c=>"["+c.state.toUpperCase()+"] "+c.label+" — "+c.detail)].join("\n");
  }
  function sellerChecklist(packages,listing){
    return [
      "SAPIVER PRINTS — ETSY SELLER CHECKLIST",
      "",
      "1. Extract this master kit.",
      "2. In UPLOAD-TO-ETSY, attach every buyer ZIP to the Etsy digital listing.",
      "3. Do not upload the LISTING-IMAGES folder as buyer download files.",
      "4. Add the JPGs in LISTING-IMAGES to the listing photo gallery.",
      "5. Review the title, description, tags, price and licence before publishing.",
      "6. Publishing remains manual; Pattern Forge has not created or published an Etsy listing.",
      "",
      "ETSY FILE CHECK",
      "Rules verified "+RULES_VERIFIED+": maximum "+ETSY_MAX_FILES+" digital files, maximum 20 MB per file.",
      ...packages.map(p=>"- "+p.name+" — "+mb(p.blob.size)),
      "",
      "LISTING IMAGES",
      listing.length+" design-only listing images generated at "+LISTING_W+" × "+LISTING_H+" px. They show the pattern itself only; no product mockups are included."
    ].join("\n");
  }
  async function buyerPackages(files,base){
    const all=await bridge.makeZip(files);
    const packageName=(suffix="")=>(base+"-buyer-files"+suffix+".zip").slice(0,70);
    if(all.size<=ETSY_MAX_BYTES)return [{name:packageName(),blob:all}];
    const docs=files.filter(file=>/\.txt$/i.test(file.name)),payload=files.filter(file=>!/\.txt$/i.test(file.name)),groups=[],current=[];
    async function zipped(group){return bridge.makeZip([...group,...docs]);}
    for(const file of payload){
      const candidate=[...current,file],zip=await zipped(candidate);
      if(zip.size<=ETSY_MAX_BYTES){current.push(file);continue;}
      if(!current.length)throw new Error(file.name+" cannot fit inside Etsy's 20 MB digital-file limit even as its own ZIP.");
      groups.push([...current]);current.length=0;current.push(file);
      const single=await zipped(current);if(single.size>ETSY_MAX_BYTES)throw new Error(file.name+" cannot fit inside Etsy's 20 MB digital-file limit even as its own ZIP.");
    }
    if(current.length)groups.push([...current]);
    if(groups.length>ETSY_MAX_FILES)throw new Error("This product needs "+groups.length+" buyer ZIPs, exceeding Etsy's five-file limit.");
    const packages=[];for(let i=0;i<groups.length;i++){const blob=await zipped(groups[i]);packages.push({name:packageName("-"+(i+1)),blob});}
    return packages;
  }
  async function prepare(options={}){
    const download=options.download!==false,includeListing=options.listingImages!==false,before=stateFingerprint(),checks=check();
    if(blocking(checks).length){bridge.setStatus("Etsy export blocked: "+blocking(checks)[0].detail);return {success:false,checks,blockers:blocking(checks)};}
    try{
      bridge.setStatus("Etsy export: rendering seamless PNG…");
      const png=await bridge.renderPNGBlob();if(!png)throw new Error("PNG rendering was cancelled.");
      bridge.setStatus("Etsy export: rendering flattened JPG…");const jpg=await jpegTile();
      bridge.setStatus("Etsy export: rendering 3 × 3 repeat preview…");const preview=await repeatPreview();
      const stem=cleanStem(),hasSvg=vectorEligible(),buyerFiles=[
        {name:stem+"-seamless-master.png",blob:png.blob},
        {name:stem+"-seamless-master.jpg",blob:jpg.blob},
        {name:stem+"-repeat-preview-3x3.jpg",blob:preview.blob}
      ];
      if(hasSvg)buyerFiles.push({name:stem+"-seamless-vector.svg",blob:bridge.renderSVGBlob()});
      buyerFiles.push({name:"README.txt",blob:new Blob([instructions(png.spec,hasSvg)],{type:"text/plain"})});
      buyerFiles.push({name:"LICENSE.txt",blob:new Blob([licence()],{type:"text/plain"})});
      buyerFiles.push({name:"QUALITY-CHECK.txt",blob:new Blob([reportText(checks)],{type:"text/plain"})});
      bridge.setStatus("Etsy export: checking Etsy package sizes…");
      const packages=await buyerPackages(buyerFiles,stem);
      const sizeOk=packages.length<=ETSY_MAX_FILES&&packages.every(p=>p.blob.size<=ETSY_MAX_BYTES);
      checks.push({id:"etsy-package",state:sizeOk?"pass":"fail",label:"Etsy buyer package",detail:sizeOk?packages.length+" upload ZIP"+(packages.length===1?"":"s")+" prepared; largest is "+mb(Math.max(...packages.map(p=>p.blob.size)))+".":"Generated buyer files exceed Etsy's upload limits."});
      if(!sizeOk)throw new Error("Generated buyer package exceeds Etsy's upload limits.");
      bridge.setStatus("Etsy export: generating design-only listing images…");
      const listing=includeListing?await listingImages():[];
      const after=stateFingerprint(),unchanged=before===after;
      checks.push({id:"editable-design",state:unchanged?"pass":"fail",label:"Original design unchanged",detail:unchanged?"Packaging did not alter the editable artwork.":"The editable design changed during packaging; export has been blocked."});
      if(!unchanged)throw new Error("Editable design changed while packaging.");
      const kitFiles=[
        ...packages.map(p=>({name:"UPLOAD-TO-ETSY/"+p.name,blob:p.blob})),
        ...listing.map(file=>({name:"LISTING-IMAGES/"+stem+"-"+file.name,blob:file.blob})),
        {name:"SELLER-CHECKLIST.txt",blob:new Blob([sellerChecklist(packages,listing)],{type:"text/plain"})},
        {name:"QUALITY-CHECK.txt",blob:new Blob([reportText(checks)],{type:"text/plain"})}
      ];
      const kit=await bridge.makeZip(kitFiles),kitName=(stem+"-etsy-kit.zip").slice(0,70);
      if(download)bridge.downloadBlob(kit,kitName);
      bridge.setStatus("Etsy kit ready: one adaptable seamless design, "+packages.length+" buyer ZIP"+(packages.length===1?"":"s")+" plus "+listing.length+" design-only listing images.");
      return {success:true,checks,blockers:[],kitName,kitSize:kit.size,buyerPackages:packages.map(p=>({name:p.name,size:p.blob.size})),buyerFiles:buyerFiles.map(f=>({name:f.name,size:f.blob.size})),listingImages:listing.map(f=>({name:stem+"-"+f.name,size:f.blob.size,width:f.width,height:f.height})),vectorIncluded:hasSvg,repeatPreview:{width:preview.width,height:preview.height},rules:{verified:RULES_VERIFIED,maxFiles:ETSY_MAX_FILES,maxBytes:ETSY_MAX_BYTES},designUnchanged:unchanged};
    }catch(error){
      const message=error instanceof Error?error.message:String(error);checks.push({id:"package-build",state:"fail",label:"Package build",detail:message});bridge.setStatus("Etsy export blocked: "+message);
      return {success:false,checks,blockers:blocking(checks),error:message};
    }
  }
  window.PatternForgeEtsy=Object.freeze({check,prepare,rules:Object.freeze({verified:RULES_VERIFIED,maxFiles:ETSY_MAX_FILES,maxBytes:ETSY_MAX_BYTES,listingImageMinWidth:2000})});
})();