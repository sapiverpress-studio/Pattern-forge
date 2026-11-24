(()=>{
  "use strict";
  const bridge=window.PatternForgeEtsyBridge;
  if(!bridge)return;

  const ETSY_MAX_BYTES=20000000;
  const ETSY_MAX_FILES=5;
  const RULES_VERIFIED="2026-11-22";
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
    const canvas=bridge.makeTileCanvas(w,h,base,base,bridge.getRepeatStyle(),true,"transparent"),ctx=canvas.getContext("2d",{willReadFrequently:true}),data=ctx.getImageData(0,0,w,h).data;
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
    // Transparent canvas alone cannot erase white/background rectangles baked
    // into placed image assets. Never silently remove legitimate light details.
    const opaqueAssets=new Set();
    for(const item of bridge.state.items){
      const layer=bridge.layerForArtwork(item,bridge.baseLayerIds.motifs);
      if(!bridge.layerIsRenderable(layer,true))continue;
      const asset=bridge.assetOf(item);
      const alpha=asset?.alphaInfo||(asset?.img&&window.PatternForgeAlpha?.analyse(asset.img));
      if(alpha?.transparent===false)opaqueAssets.add(asset.name||"Unnamed imported image");
    }
    if(opaqueAssets.size)checks.push({id:"opaque-sources",state:"warn",label:"Opaque imported motifs",detail:[...opaqueAssets].slice(0,4).join(", ")+(opaqueAssets.size>4?" and "+(opaqueAssets.size-4)+" more":"")+" might contain a solid or white background inside the motif. The transparent canvas is still allowed. Check all three coloured previews for visible rectangles; background colours cannot replace white baked into an image. No pixel removal is performed."});
    if(!bridge.isDoodle()&&counts.total){
      const seams=seamMetrics(),pass=seams.leftRight.pass&&seams.topBottom.pass;
      checks.push({id:"seams",state:pass?"pass":"fail",label:"Seam continuity",detail:pass?"Opposite-edge pixel continuity is within tolerance in both directions.":"A strong discontinuity was detected at "+(!seams.leftRight.pass&&!seams.topBottom.pass?"both tile seams":!seams.leftRight.pass?"the left/right seam":"the top/bottom seam")+". Inspect the repeat before sale.",metrics:seams});
    }
    // Etsy PNGs must contain actual clear pixels regardless of the editor's
    // ordinary Export Transparent switch. An RGBA file alone is insufficient.
    if(!bridge.isDoodle()&&counts.total){
      const sample=bridge.makeTileCanvas(192,192,192,192,bridge.getRepeatStyle(),true,"transparent");
      try{
        const data=sample.getContext("2d",{willReadFrequently:true}).getImageData(0,0,192,192).data;
        let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]<=12)clear++;
        const percent=Math.round(clear/(192*192)*1000)/10;
        const pass=clear/(192*192)>=.01;
        checks.push({id:"transparency",state:pass?"pass":"fail",label:"Actual transparent background",detail:pass?"The Etsy PNG uses a transparent canvas and the artwork has about "+percent+"% fully clear area in a render sample. JPG and listing previews remain opaque.":"The rendered artwork contains less than 1% clear pixels, even without a canvas background. A white background may be baked into imported images. Open Images to clean eligible flat backgrounds or replace opaque motifs with genuine transparent PNGs. Etsy export is blocked; no pixels are removed automatically."});
      }finally{sample.width=0;sample.height=0;}
    }
    checks.push({id:"vector",state:"info",label:"SVG eligibility",detail:vectorEligible()?"A vector SVG can be included inside the buyer ZIP.":"At least one placed asset is raster, so the Etsy package will omit SVG rather than label a raster-backed SVG as genuine vector."});
    checks.push({id:"etsy-rules",state:"info",label:"Etsy upload rules",detail:"Checked against Etsy rules verified "+RULES_VERIFIED+": up to "+ETSY_MAX_FILES+" digital files, maximum 20 MB each. Buyer packages are generated as ZIP files."});
    return checks;
  }
  const blocking=checks=>checks.filter(c=>c.state==="fail");
  async function flattenedTileCanvas(){
    const spec=bridge.getSpec(),tile=bridge.makeTileCanvas(spec.wPx,spec.hPx,5000,5000,bridge.getRepeatStyle(),true),out=document.createElement("canvas");
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
  function instructions(spec,hasSvg,pngSpec=spec,multipartCount=0){
    const style=bridge.getRepeatStyle();
    return [
      "SAPIVER PRINTS — DIGITAL SEAMLESS PATTERN",
      "",
      "Thank you for purchasing this digital pattern.",
      "",
      "WHAT IS INCLUDED",
      multipartCount?"- PNG seamless master: "+pngSpec.wPx+" × "+pngSpec.hPx+" px, original bytes recovered from "+multipartCount+" numbered ZIP parts.":"- PNG seamless tile: "+pngSpec.wPx+" × "+pngSpec.hPx+" px.",
      "- JPG seamless master tile: "+spec.wPx+" × "+spec.hPx+" px with a flattened background.",
      "- 3 × 3 repeat preview JPG for checking the seamless repeat.",
      hasSvg?"- SVG vector repeat file for resolution-independent scaling.":"- SVG is not included because this design contains raster artwork.",
      "- Licence terms.",
      ...(multipartCount?["","REBUILDING YOUR ORIGINAL FULL-RESOLUTION PNG","Download all Etsy ZIP files for this order. In the ZIP labelled JPG-and-extras, extract and open REBUILD-PNG.html in your browser. Select every ZIP labelled png-part (do not select JPG-and-extras), then press Restore original PNG. Save the complete PNG to your device. The tool works offline and verifies that the original file has not changed. Each numbered part on its own is not an image."]:[]),
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
  function aboutSapiverPrints(){
    return [
      "ABOUT SAPIVER PRINTS",
      "",
      "Sapiver Prints creates digital pattern artwork for use in personal and commercial projects.",
      "The seamless pattern files and permitted uses are described in README.txt and LICENSE.txt.",
      "",
      "This is a digital product. No physical goods are supplied.",
      "For order questions, contact the seller through your Etsy order.",
      "",
      "Sapiver Prints"
    ].join("\n");
  }
  function reportText(checks){
    return ["PATTERN FORGE — ETSY EXPORT QUALITY REPORT","Generated: "+new Date().toISOString(),"",...checks.map(c=>"["+c.state.toUpperCase()+"] "+c.label+" — "+c.detail)].join("\n");
  }
  function sellerChecklist(packages,listing,multipartCount,pngSpec,originalSpec){
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
      "PNG included: "+pngSpec.wPx+" × "+pngSpec.hPx+" px.",
      ...(multipartCount?["Seller note: exact original "+originalSpec.wPx+" × "+originalSpec.hPx+" px PNG (not resized) is divided into "+multipartCount+" buyer ZIPs and restored using the bundled offline HTML tool. Buyers must download all parts. Clearly disclose this extra step in the Etsy listing."]:[]),
      "",
      "LISTING IMAGES",
      listing.length+" design-only listing images generated at "+LISTING_W+" × "+LISTING_H+" px. They show the pattern itself only; no product mockups are included."
    ].join("\n");
  }
  async function buyerPackages(files,base){
    const docs=files.filter(file=>file.name.toLowerCase().endsWith(".txt"));
    const artwork=files.filter(file=>!file.name.toLowerCase().endsWith(".txt"));
    const png=artwork.find(file=>file.name.toLowerCase().endsWith(".png"));
    if(!png)throw new Error("An Etsy PNG tile is required for this digital pattern.");
    const otherArtwork=artwork.filter(file=>file!==png);
    if(!otherArtwork.length)throw new Error("The JPG master and preview are missing from the buyer package.");
    const groups=[
      {name:(base+"-buyer-01-png.zip").slice(0,70),files:[png,...docs]},
      {name:(base+"-buyer-02-jpg-and-extras.zip").slice(0,70),files:[...otherArtwork,...docs]}
    ];
    const packages=[];
    for(const group of groups){
      const blob=await bridge.makeZip(group.files);
      if(blob.size>ETSY_MAX_BYTES){
        const dominant=group.files.filter(file=>!docs.includes(file)).sort((a,b)=>b.blob.size-a.blob.size)[0];
        throw new Error((dominant?.name||group.name)+" cannot fit inside Etsy's 20 MB digital-file limit even as its own ZIP.");
      }
      packages.push({name:group.name,blob});
    }
    return packages;
  }

  function fourVariantInstructions(png,versions,partCount){
    const details=versions.map((v,i)=>"- Background "+(i+1)+": "+v.colour+
      " — "+v.assets.map(a=>a.spec.wPx+" × "+a.spec.hPx+" px PNG").join(" and "));
    return [
      "SAPIVER PRINTS — FOUR SEAMLESS PATTERN BACKGROUNDS","",
      "Includes ONE transparent seamless PNG master and THREE coloured background versions.",
      "The original transparent artwork remains "+png.spec.wPx+" × "+png.spec.hPx+" px at "+png.spec.dpi+" DPI; it is NEVER downscaled or re-encoded during Etsy splitting.",
      ...details,"",
      ...(partCount?[
        "RESTORE THE TRANSPARENT ORIGINAL",
        "The full-size original PNG is too large for Etsy's single-file limit.",
        "Download every Etsy ZIP named png-part, plus the ZIP containing REBUILD-PNG.html.",
        "Extract REBUILD-PNG.html, open it in your browser, select all numbered png-part ZIPs, and press Restore original PNG.",
        "The tool verifies the full SHA-256 checksum before providing an exact original PNG.",
        ""
      ]:[]),
      "HOW TO USE",
      "The three colour versions are ready-to-use, opaque PNG files in two explicitly named pixel sizes.",
      "Repeat any complete tile edge-to-edge; do not crop or distort the artwork.",
      "The transparent original is intended for adding your own custom backgrounds.",
      "White or opaque details already part of imported illustrations remain part of the design.",
      "Printing and usable scale depend on the actual pixel dimensions and your print provider.",
      "This is a digital product, not a physical print.",
      "See LICENSE.txt for commercial-use terms.","","Sapiver Prints"
    ].join("\n");
  }
  async function fourVariantListingImages(versions){
    const variants=[{colour:null,index:0},...versions.map((v,i)=>({colour:v.colour,index:i+1}))],out=[];
    for(const variant of variants){
      const mult=bridge.getMultipliers(),side=540;
      const tile=bridge.makeTileCanvas(side*mult.x,side*mult.y,side,side,bridge.getRepeatStyle(),true,
        variant.colour?"solid":"transparent",variant.colour||null);
      const canvas=document.createElement("canvas");
      canvas.width=LISTING_W;canvas.height=LISTING_H;
      try{
        const ctx=canvas.getContext("2d");
        if(!variant.colour){
          // Clear areas appear as checkerboard ONLY in this listing preview.
          ctx.fillStyle="#f0f0f0";ctx.fillRect(0,0,LISTING_W,LISTING_H);
          ctx.fillStyle="#ffffff";
          for(let y=0;y<LISTING_H;y+=80)for(let x=0;x<LISTING_W;x+=80)
            if(((x/80)+(y/80))%2===0)ctx.fillRect(x,y,80,80);
        }
        ctx.fillStyle=ctx.createPattern(tile,"repeat");ctx.fillRect(0,0,LISTING_W,LISTING_H);
        const name=variant.colour?"0"+(variant.index+1)+"-colour-"+variant.colour.slice(1)+".jpg":"01-transparent-checker-preview.jpg";
        out.push({name,blob:await blobFromCanvas(canvas,"image/jpeg",.86),width:LISTING_W,height:LISTING_H});
      }finally{tile.width=1;tile.height=1;canvas.width=1;canvas.height=1;}
    }
    return out;
  }
  async function checkExportedSeam(name,blob,checks){
    try{
      const result=await window.PatternForgeSeams.inspectBlob(blob);
      checks.push({id:"native-seam-"+name,state:result.pass?"pass":"warn",label:"Native seam check: "+name,detail:window.PatternForgeSeams.describe(result),metrics:result});
    }catch(error){
      checks.push({id:"native-seam-"+name,state:"warn",label:"Native seam check: "+name,detail:"Unable to check actual exported pixels: "+error.message+". Inspect the file before sale."});
    }
  }
  async function prepareFourVariants(options,png,checks,before,download,includeListing){
    if(!window.PatternForgeFourVariants)throw Error("Four-background Etsy packaging is unavailable. Refresh the app.");
    const colours=Array.isArray(options.colours)?options.colours.map(x=>String(x).toLowerCase()):[];
    const sizes=Array.isArray(options.sizes)?options.sizes.map(Number):[];
    if(colours.length!==3||new Set(colours).size!==3||colours.some(c=>!/^#[a-f0-9]{6}$/.test(c)))
      throw Error("Select three DIFFERENT valid background colours.");
    if(sizes.length!==2||!Number.isInteger(sizes[0])||!Number.isInteger(sizes[1])||
       sizes[0]<=sizes[1]||sizes[1]<500||sizes[0]>5000)
      throw Error("Choose two different named PNG sizes, between 500 and 5000 pixels.");
    if(!png.alphaStats||png.alphaStats.clear/png.alphaStats.total<.01)
      throw Error("The transparent master has no usable clear area. No Etsy kit was created.");
    const stem=cleanStem(),masterName=stem+"-seamless-master.png",versions=[];
    for(let i=0;i<colours.length;i++){
      const colour=colours[i],assets=[];
      for(const maxSide of sizes){
        bridge.setStatus("Etsy: rendering colour "+(i+1)+" of 3, "+maxSide+" px…");
        const rendered=await bridge.renderPNGBlob({backgroundMode:"solid",backgroundColor:colour,maxSide});
        if(!rendered)throw Error("Colour variant rendering was cancelled.");
        const name=stem+"-colour-"+String(i+1)+"-"+colour.slice(1)+"-"+rendered.spec.wPx+"x"+rendered.spec.hPx+".png";
        await checkExportedSeam(name,rendered.blob,checks);
        assets.push({name,blob:rendered.blob,spec:rendered.spec});
      }
      versions.push({colour,assets});
    }
    const makeDocuments=count=>[
      {name:"README.txt",blob:new Blob([fourVariantInstructions(png,versions,count)],{type:"text/plain"})},
      {name:"LICENSE.txt",blob:new Blob([licence()],{type:"text/plain"})},
      {name:"ABOUT-SAPIVER-PRINTS.txt",blob:new Blob([aboutSapiverPrints()],{type:"text/plain"})}
    ];
    bridge.setStatus("Etsy: fitting four artwork variants within five buyer files…");
    const packed=await window.PatternForgeFourVariants.build({
      base:stem,transparent:{...png,name:masterName},versions,makeZip:bridge.makeZip,makeDocuments,
      splitter:options.allowMultipartPng===true?window.PatternForgeMultipart?.makeParts:null
    });
    const packages=packed.packages;
    const sizeOk=packages.length<=ETSY_MAX_FILES&&packages.every(x=>x.blob.size<=ETSY_MAX_BYTES);
    if(!sizeOk)throw Error("The requested background PNG versions exceed Etsy's five-file, 20 MB-per-file allowance.");
    checks.push({id:"etsy-variants",state:"pass",label:"Four background versions",detail:
      "One full-resolution transparent PNG plus three coloured designs, each in two sizes; "+
      packages.length+" Etsy buyer ZIPs prepared."});
    if(packed.multipartCount)checks.push({id:"etsy-original-png",state:"warn",label:"Original PNG preserved",detail:
      "The "+mb(png.blob.size)+" transparent original is preserved in "+packed.multipartCount+
      " exact-byte parts. A buyer reconstruction step is required."});
    if(packed.groupedColours)checks.push({id:"etsy-grouped-colours",state:"info",label:"Coloured ZIP grouping",detail:
      "Two background colour pairs share one buyer ZIP to stay within Etsy's five-file limit. All six coloured PNGs are included."});
    const listing=includeListing?await fourVariantListingImages(versions):[];
    const unchanged=before===stateFingerprint();
    if(!unchanged)throw Error("Editable artwork changed during Etsy packaging. No ZIP was downloaded.");
    checks.push({id:"editable-design",state:"pass",label:"Editable design unchanged",detail:"The four exported versions do not modify the project."});
    const sellerMessage=[
      "SAPIVER PRINTS — ETSY FOUR-BACKGROUND SELLER KIT","",
      "Import THIS OUTER ZIP as one digital product in the Sapiver Prints uploader.",
      "The uploader extracts the "+packages.length+" customer ZIPs under UPLOAD-TO-ETSY.",
      "Transparent master: "+png.spec.wPx+" × "+png.spec.hPx+" px; "+mb(png.blob.size)+".",
      "Colour version PNG sizes: "+sizes.join(" px and ")+" px (longest side).",
      "Selected colours: "+colours.join(", ")+".",
      ...(packed.multipartCount?["The original transparent master is in "+packed.multipartCount+" numbered ZIPs; buyers reconstruct it using REBUILD-PNG.html."]:[]),
      ...(packed.groupedColours?["Two colour sets may share one ZIP; each design still has both PNG sizes."]:[]),
      ...packages.map(p=>p.name+" — "+mb(p.blob.size)),
      "Check every preview, particularly any imported image with a baked-in white rectangle.",
      "Verify the Etsy listing clearly describes the colours, resolutions and optional reconstruction step.",
      "Review before publishing. No live listing was created by Pattern Forge."
    ].join("\n");
    const kitFiles=[
      ...packages.map(p=>({name:"UPLOAD-TO-ETSY/"+p.name,blob:p.blob})),
      ...listing.map(img=>({name:"LISTING-IMAGES/"+stem+"-"+img.name,blob:img.blob})),
      {name:"SELLER-CHECKLIST.txt",blob:new Blob([sellerMessage],{type:"text/plain"})},
      {name:"QUALITY-CHECK.txt",blob:new Blob([reportText(checks)],{type:"text/plain"})}
    ];
    const kit=await bridge.makeZip(kitFiles),kitName=(stem+"-four-background-etsy-kit.zip").slice(0,70);
    if(kit.size>100_000_000)throw Error("The "+mb(kit.size)+" seller kit exceeds the uploader's 100 MB safety cap. Choose smaller coloured PNG sizes or fewer listing previews; your transparent original has not been resized.");
    if(download)bridge.downloadBlob(kit,kitName);
    bridge.setStatus("Etsy four-background kit ready: "+packages.length+" buyer ZIPs and "+listing.length+" listing previews."+(checks.some(c=>c.id.startsWith("native-seam-")&&c.state==="warn")?" Seam warnings: inspect QUALITY-CHECK.txt before sale.":""));
    return {success:true,checks,blockers:[],kitName,kitSize:kit.size,fourVariantsUsed:true,
      buyerPackages:packages.map(p=>({name:p.name,size:p.blob.size})),
      buyerFiles:packed.buyerFiles.map(f=>({name:f.name,size:f.blob.size})),
      listingImages:listing.map(f=>({name:stem+"-"+f.name,size:f.blob.size,width:f.width,height:f.height})),
      variantColours:colours,colourSizes:packed.colourSizes,groupedColours:packed.groupedColours,
      alphaStats:png.alphaStats,multipartPngUsed:packed.multipartCount>0,multipartCount:packed.multipartCount,
      pngDimensions:{width:png.spec.wPx,height:png.spec.hPx},masterDimensions:{width:png.spec.wPx,height:png.spec.hPx},
      originalPngBytes:png.blob.size,designUnchanged:true};
  }

  async function prepare(options={}){
    const download=options.download!==false,includeListing=options.listingImages!==false,before=stateFingerprint(),checks=check();
    if(blocking(checks).length){bridge.setStatus("Etsy export blocked: "+blocking(checks)[0].detail);return {success:false,checks,blockers:blocking(checks)};}
    try{
      bridge.setStatus("Etsy export: rendering seamless PNG…");
      const png=await bridge.renderPNGBlob({backgroundMode:"transparent"});if(!png)throw new Error("PNG rendering was cancelled.");
      await checkExportedSeam("transparent master PNG",png.blob,checks);
      if(options.fourVariants===true)return await prepareFourVariants(options,png,checks,before,download,includeListing);
      bridge.setStatus("Etsy export: rendering flattened JPG…");const jpg=await jpegTile();
      await checkExportedSeam("flattened master JPG",jpg.blob,checks);
      bridge.setStatus("Etsy export: rendering 3 × 3 repeat preview…");const preview=await repeatPreview();
      const stem=cleanStem(),hasSvg=vectorEligible(),pngOriginalName=stem+"-seamless-master.png";
      if(!png.alphaStats||png.alphaStats.clear/png.alphaStats.total<.01)throw new Error("The master PNG has no verified transparent background. Packaging was stopped.");
      let buyerFiles=[],packages=[],multipartCount=0,originalBytes=png.blob.size;
      const artwork=[
        {name:pngOriginalName,blob:png.blob},
        {name:stem+"-seamless-master.jpg",blob:jpg.blob},
        {name:stem+"-repeat-preview-3x3.jpg",blob:preview.blob}
      ];
      if(hasSvg)artwork.push({name:stem+"-seamless-vector.svg",blob:bridge.renderSVGBlob({transparent:true})});
      const makeDocuments=count=>[
        {name:"README.txt",blob:new Blob([instructions(jpg.spec,hasSvg,png.spec,count)],{type:"text/plain"})},
        {name:"LICENSE.txt",blob:new Blob([licence()],{type:"text/plain"})},
        {name:"ABOUT-SAPIVER-PRINTS.txt",blob:new Blob([aboutSapiverPrints()],{type:"text/plain"})}
      ];
      bridge.setStatus("Etsy export: checking full-resolution PNG…");
      try{
        buyerFiles=[...artwork,...makeDocuments(0)];
        packages=await buyerPackages(buyerFiles,stem);
      }catch(error){
        const oversize=String(error?.message||"").includes(pngOriginalName+" cannot fit");
        if(!oversize)throw error;
        if(options.allowMultipartPng!==true)
          throw new Error("The full-resolution PNG ("+mb(originalBytes)+") exceeds Etsy's 20 MB per-file limit. Enable 'Preserve original PNG across Etsy ZIPs' to package every byte without resizing.");
        if(!window.PatternForgeMultipart)throw new Error("Lossless multipart export is unavailable. Refresh Pattern Forge and retry.");
        bridge.setStatus("Etsy export: dividing original full-resolution PNG into verified parts (no resizing)…");
        const split=await window.PatternForgeMultipart.makeParts(png.blob,pngOriginalName,png.spec);
        multipartCount=split.parts.length;
        const documents=makeDocuments(multipartCount);
        const additional=[
          ...artwork.slice(1),
          {name:"PNG-REASSEMBLY.json",blob:new Blob([JSON.stringify(split.manifest,null,2)],{type:"application/json"})},
          {name:"REBUILD-PNG.html",blob:split.html}
        ];
        buyerFiles=[...split.parts.map(p=>({name:p.name,blob:p.blob})),...additional,...documents];
        packages=[];
        for(let i=0;i<split.parts.length;i++){
          const files=[{name:split.parts[i].name,blob:split.parts[i].blob},...documents];
          const archive=await bridge.makeZip(files);
          if(archive.size>ETSY_MAX_BYTES)throw new Error("Numbered PNG ZIP "+(i+1)+" exceeded Etsy's 20 MB cap. Original PNG was not altered.");
          packages.push({name:(stem+"-buyer-"+String(i+1).padStart(2,"0")+"-png-part.zip").slice(0,70),blob:archive});
        }
        const extraArchive=await bridge.makeZip([...additional,...documents]);
        if(extraArchive.size>ETSY_MAX_BYTES)throw new Error("JPG-and-extras ZIP exceeds Etsy's 20 MB cap; full original PNG was not altered.");
        packages.push({name:(stem+"-buyer-"+String(packages.length+1).padStart(2,"0")+"-jpg-and-extras.zip").slice(0,70),blob:extraArchive});
        checks.push({id:"etsy-original-png",state:"warn",label:"Original full-resolution PNG retained",detail:"The "+mb(originalBytes)+" original PNG is split losslessly across "+multipartCount+" numbered ZIPs. Buyer must use the included offline HTML tool to restore the identical file."});
      }
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
        {name:"SELLER-CHECKLIST.txt",blob:new Blob([sellerChecklist(packages,listing,multipartCount,png.spec,png.spec)],{type:"text/plain"})},
        {name:"QUALITY-CHECK.txt",blob:new Blob([reportText(checks)],{type:"text/plain"})}
      ];
      const kit=await bridge.makeZip(kitFiles),kitName=(stem+"-etsy-kit.zip").slice(0,70);
      if(kit.size>100_000_000)throw new Error("The complete seller kit exceeds the uploader\u0027s 100 MB limit. No image was resized.");
      if(download)bridge.downloadBlob(kit,kitName);
      bridge.setStatus("Etsy kit ready: one adaptable seamless design, "+packages.length+" buyer ZIP"+(packages.length===1?"":"s")+" plus "+listing.length+" design-only listing images."+(checks.some(c=>c.id.startsWith("native-seam-")&&c.state==="warn")?" Seam warnings: inspect QUALITY-CHECK.txt before sale.":""));
      return {success:true,checks,blockers:[],kitName,kitSize:kit.size,buyerPackages:packages.map(p=>({name:p.name,size:p.blob.size})),buyerFiles:buyerFiles.map(f=>({name:f.name,size:f.blob.size})),listingImages:listing.map(f=>({name:stem+"-"+f.name,size:f.blob.size,width:f.width,height:f.height})),vectorIncluded:hasSvg,alphaStats:png.alphaStats,multipartPngUsed:multipartCount>0,multipartCount,pngDimensions:{width:png.spec.wPx,height:png.spec.hPx},masterDimensions:{width:png.spec.wPx,height:png.spec.hPx},originalPngBytes:originalBytes,repeatPreview:{width:preview.width,height:preview.height},rules:{verified:RULES_VERIFIED,maxFiles:ETSY_MAX_FILES,maxBytes:ETSY_MAX_BYTES},designUnchanged:unchanged};
    }catch(error){
      const message=error instanceof Error?error.message:String(error);checks.push({id:"package-build",state:"fail",label:"Package build",detail:message});bridge.setStatus("Etsy export blocked: "+message);
      return {success:false,checks,blockers:blocking(checks),error:message};
    }
  }
  window.PatternForgeEtsy=Object.freeze({check,prepare,rules:Object.freeze({verified:RULES_VERIFIED,maxFiles:ETSY_MAX_FILES,maxBytes:ETSY_MAX_BYTES,listingImageMinWidth:2000})});
})();