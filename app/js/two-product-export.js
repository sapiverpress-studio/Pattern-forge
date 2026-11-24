/* Two independent seller kits from one pattern. No live marketplace operations. */
(function(root){
"use strict";
const LIMIT=20000000,OUTER_LIMIT=100000000;
const PHONE_SIZES=[[1080,2400],[1170,2532],[1290,2796],[1440,3200]];
const $=id=>document.getElementById(id);
const utf=s=>new TextEncoder().encode(s);
const file=(name,blob)=>({name,blob});
const txt=(name,value)=>file(name,new Blob([value],{type:"text/plain"}));
const free=c=>{if(c){c.width=0;c.height=0}};
function canvas(w,h,opaque=false){const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{alpha:!opaque});if(!ctx)throw Error("Canvas unavailable");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";return {c,ctx};}
function layout(width,repeatCount){if(!Number.isFinite(repeatCount)||repeatCount<1||repeatCount>6)throw Error("Choose a scale from 1 to 6 repeats");return Math.max(1,Math.round(width/repeatCount));}
function squareGrid(w,h,size){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1)throw Error("Invalid repeat dimensions");
 for(let across=1;across<=25;across++)for(let down=1;down<=25;down++)
  if(w*across===h*down){
   let gcd=(x,y)=>y?gcd(y,x%y):x,unit=across*down/gcd(across,down);
   const renderSize=Math.max(unit,Math.round(size/unit)*unit);
   return {across,down,tileWidth:renderSize/across,tileHeight:renderSize/down,renderSize};
  }
 throw Error("This rectangular repeat cannot fill a square at this resolution without changing its proportions. Use the existing rectangular master export or prepare a square repeat first.");
}
function squareTile(source,size){
 const g=squareGrid(source.width,source.height,size),{c,ctx}=canvas(g.renderSize,g.renderSize);
 const {c:cell,ctx:cc}=canvas(g.tileWidth,g.tileHeight);
 try{
  cc.drawImage(source,0,0,cell.width,cell.height);
  for(let y=0;y<g.down;y++)for(let x=0;x<g.across;x++)ctx.drawImage(cell,x*cell.width,y*cell.height);
  if(g.renderSize===size)return c;
  const {c:final,ctx:fc}=canvas(size,size);
  try{fc.drawImage(c,0,0,size,size);return final;}catch(e){free(final);throw e;}finally{free(c);}
 }catch(e){free(c);throw e;}finally{free(cell);}
}
function solid(tile,colour){const {c,ctx}=canvas(tile.width,tile.height,true);ctx.fillStyle=colour;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(tile,0,0);return c;}
function wallpaper(tile,w,h,colour,repeats,onCell){
 const {c,ctx}=canvas(w,h,true),n=layout(w,repeats),m=Math.max(1,Math.round(n*tile.height/tile.width)),{c:cell,ctx:cc}=canvas(n,m);
 try{
  cc.drawImage(tile,0,0,n,m);
  if(onCell)onCell(cell);
  ctx.fillStyle=colour;ctx.fillRect(0,0,w,h);
  // One resampling step. All repeats share identical integer pixel boundaries.
  const x0=-Math.floor((Math.ceil(w/n)*n-w)/2),y0=0;
  for(let y=y0;y<h;y+=m)for(let x=x0;x<w;x+=n)ctx.drawImage(cell,x,y);
  return c;
 }catch(e){free(c);throw e;}finally{free(cell);}
}
function alphaOK(tile){
 const {c,ctx}=canvas(192,192);
 try{ctx.drawImage(tile,0,0,192,192);const d=ctx.getImageData(0,0,192,192).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]<=12)n++;return n/(192*192)>=.01;}finally{free(c);}
}
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function zipSize(files){return 22+files.reduce((n,f)=>n+76+2*utf(f.name).length+f.blob.size,0);}
async function zipStored(files){
 const local=[],central=[];let offset=0;const names=new Set();
 for(const f of files){
  if(names.has(f.name)||!f.blob.size)throw Error("Invalid or duplicate ZIP entry: "+f.name);names.add(f.name);
  const name=utf(f.name),bytes=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(bytes),l=new Uint8Array(30+name.length),d=new Uint8Array(46+name.length),lv=new DataView(l.buffer),dv=new DataView(d.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(12,33,true);lv.setUint32(14,crc,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,name.length,true);l.set(name,30);
  dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x800,true);dv.setUint16(14,33,true);dv.setUint32(16,crc,true);dv.setUint32(20,bytes.length,true);dv.setUint32(24,bytes.length,true);dv.setUint16(28,name.length,true);dv.setUint32(42,offset,true);d.set(name,46);
  local.push(l,f.blob);central.push(d);offset+=l.length+bytes.length;
 }
 const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,central.reduce((n,c)=>n+c.length,0),true);e.setUint32(16,offset,true);
 return new Blob([...local,...central,e.buffer],{type:"application/zip"});
}
function groupFiles(art,docs,limit=LIMIT){
 const groups=[];
 for(const f of [...art].sort((a,b)=>b.blob.size-a.blob.size)){
  if(zipSize([...docs,f])>limit)throw Error(f.name+" cannot fit an Etsy attachment at original quality. No image has been reduced.");
  let g=groups.find(g=>zipSize([...docs,...g,f])<=limit);
  if(!g){g=[];groups.push(g);}g.push(f);
 }
 return groups;
}
async function jpeg(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("Preview encoding failed")),"image/jpeg",.92));}
function cleanName(s){return String(s||"Pattern").replace(/[<>\x00-\x1f]/g," ").replace(/\s+/g," ").trim().slice(0,75)||"Pattern";}
function stemOf(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,38)||"pattern";}
function tagsFor(name,kind,provided){
 const title=cleanName(name).toLowerCase(),words=title.split(" ").filter(x=>x.length>=3&&x.length<=20);
 const defaults=kind==="wallpaper"?["phone wallpaper","mobile background","phone screen art","digital wallpaper","android wallpaper","iphone wallpaper","phone aesthetic","screen background","personalise phone"]:["seamless pattern","digital paper","surface pattern","fabric design","wrapping paper","commercial use","transparent png","repeat pattern","craft supplies","scrapbook paper","printable pattern"];
 const candidates=[...(kind==="pattern"?(provided||[]):[]),...(title.length<=20?[title]:[]),...words.map(x=>x+(kind==="wallpaper"?" wallpaper":" pattern")).filter(x=>x.length<=20),...defaults];
 return [...new Set(candidates.map(x=>String(x).trim().toLowerCase()).filter(x=>x.length>0&&x.length<=20&&!/[<>\x00-\x1f]/.test(x)))].slice(0,13);
}
async function doc(name){const r=await fetch("/auto-seamless/commercial/"+name,{cache:"no-store"});if(!r.ok)throw Error("Missing customer document "+name);const s=await r.text();if(!s.trim()||s.length>5000)throw Error("Invalid customer document "+name);return s;}
const PERSONAL="SAPIVER PRINTS - PERSONAL WALLPAPER LICENCE\nThis purchase grants a non-exclusive licence for personal use as a screen background on your own devices. You may resize or crop it for that purpose. Do not redistribute, resell, share or use the artwork commercially. No copyright or ownership is transferred. Nothing limits your statutory consumer rights. Contact Sapiver Prints via your Etsy order if a file is faulty.\n";
async function documents(kind,name,about,licence,split=0){
 const readme=kind==="wallpaper"?
  name+"\nOne wallpaper design in four portrait PNG resolutions: "+PHONE_SIZES.map(x=>x.join(" x ")).join(", ")+". Unzip, save the best-fitting file to your phone and apply via wallpaper settings. Device cropping and clock placement vary. The phone frames are illustrations only. Personal use only.":
  name+"\nOne repeat pattern: transparent and one solid-colour PNG, each 5000 x 5000 and 2500 x 2500 pixels, 300 DPI. Download all ZIPs. Repeat at exact integer-pixel positions or use your software's pattern fill. Check a small test repeat before printing. Do not mistake a Canva tile-placement gap for an artwork seam."+ (split?" The full transparent PNG is supplied in "+split+" numbered png-part ZIPs. Find REBUILD-PNG.html in an additional buyer ZIP, extract and open it locally, select all png-part ZIPs and restore the exact original.":"");
 return [txt("README.txt",readme),txt("LICENSE.txt",kind==="wallpaper"?PERSONAL:licence),txt("ABOUT-SAPIVER-PRINTS.txt",about)];
}
function paintHeader(ctx,title,sub){
 ctx.fillStyle="#f6f3ed";ctx.fillRect(0,0,2400,2400);ctx.fillStyle="#253331";ctx.textAlign="center";ctx.font="bold 72px system-ui";ctx.fillText(title,1200,140,2200);ctx.font="42px system-ui";ctx.fillText(sub,1200,2280,2200);
}
function phoneFrame(ctx,tile,x,y,w,h,colour,repeats){
 const img=wallpaper(tile,w,h,colour,repeats);
 try{ctx.fillStyle="#263331";ctx.fillRect(x-22,y-22,w+44,h+44);ctx.drawImage(img,x,y);}finally{free(img);}
}
async function previews(kind,tile,settings){
 const out=[],alts={},n=settings.name,colour=settings.colour;
 async function add(name,alt,draw){
  const {c,ctx}=canvas(2400,2400,true);
  try{draw(ctx);out.push(file("LISTING-IMAGES/"+name,await jpeg(c)));alts[name]=alt;}finally{free(c);}
 }
 if(kind==="pattern"){
  await add("01-pattern.jpg","Full "+n+" seamless artwork shown on the selected solid background colour.",ctx=>{ctx.fillStyle=colour;ctx.fillRect(0,0,2400,2400);ctx.drawImage(tile,0,0,2400,2400);});
  await add("02-repeat.jpg","Two by two repeat of the "+n+" pattern showing how the artwork joins.",ctx=>{ctx.fillStyle=colour;ctx.fillRect(0,0,2400,2400);for(let y=0;y<2;y++)for(let x=0;x<2;x++)ctx.drawImage(tile,x*1200,y*1200,1200,1200);});
  await add("03-cushion-visualisation.jpg","Illustrative cushion shape showing a possible use of the "+n+" surface pattern.",ctx=>{paintHeader(ctx,"DESIGN IN USE","Illustration only - no cushion included");ctx.save();ctx.shadowColor="#0004";ctx.shadowBlur=70;ctx.shadowOffsetY=25;ctx.fillStyle=colour;ctx.beginPath();ctx.roundRect(360,380,1680,1680,180);ctx.fill();ctx.shadowColor="transparent";ctx.clip();ctx.drawImage(tile,360,380,1680,1680);ctx.restore();});
  await add("04-files-and-detail.jpg","Included file guide for "+n+", with transparent and solid background PNGs in two sizes.",ctx=>{paintHeader(ctx,"FOUR PNG FILES","300 DPI metadata - digital design asset");ctx.fillStyle=colour;ctx.fillRect(150,400,1050,1050);ctx.drawImage(tile,150,400,1050,1050);ctx.fillStyle="#253331";ctx.textAlign="left";ctx.font="bold 60px system-ui";["Transparent background","5000 x 5000","2500 x 2500","Solid background","5000 x 5000","2500 x 2500"].forEach((s,i)=>ctx.fillText(s,1300,500+i*180,990));});
 }else{
  await add("01-wallpaper.jpg","One "+n+" wallpaper design shown in an illustrative portrait phone frame.",ctx=>{paintHeader(ctx,"PHONE WALLPAPER","One design - four screen sizes");phoneFrame(ctx,tile,775,260,850,1889,colour,settings.repeats);});
  await add("02-wallpaper-detail.jpg","A close view of the artwork and colours used in the "+n+" phone wallpaper.",ctx=>{const detail=wallpaper(tile,2400,2400,colour,1);try{ctx.drawImage(detail,0,0);}finally{free(detail);}});
  await add("03-phone-sizes.jpg","Four supplied portrait image resolutions for the single "+n+" wallpaper design.",ctx=>{paintHeader(ctx,"INCLUDED SIZES","Choose the best fit - device cropping may vary");phoneFrame(ctx,tile,170,390,700,1556,colour,settings.repeats);ctx.textAlign="left";ctx.fillStyle="#253331";ctx.font="bold 72px system-ui";PHONE_SIZES.forEach((s,i)=>ctx.fillText(s.join(" x "),1080,640+i*290,1150));});
 }
 return {out,alts};
}
function manifest(kind,settings,alts,split){
 const name=settings.name,wall=kind==="wallpaper",desc=wall?"One "+name+" phone wallpaper design, supplied in four portrait PNG resolutions for personal use.":"One "+name+" seamless design in transparent and "+settings.colour+" solid-background versions, each supplied as 5000 and 2500 pixel PNGs with 300 DPI metadata.";
 const description=desc+(split?" The original full-resolution transparent PNG is delivered in numbered ZIPs with an offline restoration tool.":"")+(settings.ai?" Created with the aid of AI.":"");
 const p={type:"digital",kind,name,subject:name,etsyTitle:(name+(wall?" - Phone Wallpaper, Four Sizes":" - Seamless Pattern, Commercial Use")).slice(0,140),description,price:wall?settings.wallPrice:settings.patternPrice,sectionTitle:"Digital Downloads",tags:tagsFor(name,kind,settings.tags),useEmbeddedText:true,aiAssisted:settings.ai,imageAltTextByFilename:alts,packProfile:wall?"one-design-four-sizes":"two-size-pair"};
 if(wall){p.wallpaperCount=1;p.wallpaperSizes=PHONE_SIZES.map(s=>s.join("x"));}
 else {p.seamlessConfirmed=true;p.cleanLeadAltText="A clean view of the "+name+" seamless design, showing the original pattern artwork.";}
 return {format:wall?"sapiver-wallpaper-seller-kit":"sapiver-seamless-seller-kit",version:1,reviewRequired:true,product:p,listingSource:"Draft buyer-intent tags; review in the uploader before publication."};
}
async function verifyPng(blob,w,h){
 const b=new Uint8Array(await blob.slice(0,128).arrayBuffer()),v=new DataView(b.buffer);
 if(b.length<54||v.getUint32(0)!==0x89504e47||v.getUint32(4)!==0x0d0a1a0a||v.getUint32(8)!==13||v.getUint32(12)!==0x49484452||v.getUint32(16)!==w||v.getUint32(20)!==h)throw Error("Encoded PNG dimensions differ from the requested size.");
 // Both existing DPI encoders insert pHYs immediately after IHDR.
 if(v.getUint32(33)!==9||v.getUint32(37)!==0x70485973||v.getUint32(41)!==11811||v.getUint32(45)!==11811||b[49]!==1)throw Error("Encoded PNG is missing verified 300 DPI metadata.");
 return blob;
}
async function seamReport(f){
 try{const r=await root.PatternForgeSeams.inspectBlob(f.blob);return (r.pass?"PASS ":"WARN ")+f.name+" — "+root.PatternForgeSeams.describe(r);}catch(e){return "WARN "+f.name+" — check unavailable: "+e.message;}
}
async function prepare(kind,source,settings,status){
 const stem=stemOf(settings.name),art=[],checks=[],wall=kind==="wallpaper",about=await doc("ABOUT-SAPIVER-PRINTS.txt"),licence=wall?"":await doc("LICENSE.txt");
 let tile=null,small=null;
 try{
  if(!wall){
   for(const size of [5000,2500]){
    status("Rendering "+size+"px transparent and colour variants…");
    tile=await source.makeTile(size);
    if(!alphaOK(tile))throw Error("The source has no genuine transparent background. Use transparent motifs or upload the original transparent PNG. Nothing was removed automatically.");
    let coloured=null;
    try{
     const a=file(stem+(size===5000?"-seamless-master.png":"-transparent-2500px.png"),await verifyPng(await source.png(tile),size,size));
     coloured=solid(tile,settings.colour);
     const b=file(stem+"-solid-"+size+"px.png",await verifyPng(await source.png(coloured),size,size));
     art.push(a,b);
    }finally{free(coloured);free(tile);tile=null;}
    for(const f of art.slice(-2)){status("Checking "+f.name+"…");checks.push(await seamReport(f));}
   }
  }else{
   tile=await (source.makePhoneTile||source.makeTile)(2500);
   for(const [w,h] of PHONE_SIZES){
    status("Rendering wallpaper "+w+" x "+h+"…");
    let seamCheck="WARN repeat-cell seam check unavailable";
    const c=wallpaper(tile,w,h,settings.colour,settings.repeats,cell=>{
     try{const r=root.PatternForgeSeams.inspectImage(cell);seamCheck=(r.pass?"PASS ":"WARN ")+root.PatternForgeSeams.describe(r);}catch(e){seamCheck="WARN "+e.message;}
    });
    try{
     art.push(file(stem+"-wallpaper-"+w+"x"+h+".png",await verifyPng(await source.png(c),w,h)));
     checks.push("PASS encoded dimensions "+w+" x "+h+" — one opaque canvas using integer repeat positions.");
     checks.push(seamCheck+" (scaled repeat for "+w+" x "+h+")");
    }finally{free(c);}
   }
   free(tile);tile=null;
  }
  let docs=await documents(kind,settings.name,about,licence),packages=[],extras=art,split=0;
  if(!wall&&zipSize([...docs,art[0]])>LIMIT){
   if(art[0].blob.size<LIMIT)throw Error("The master just exceeds Etsy's ZIP limit after adding documents. Use the existing export workflow; no pixels were changed.");
   if(!root.PatternForgeMultipart)throw Error("Lossless master splitting unavailable.");
   const parts=await root.PatternForgeMultipart.makeParts(art[0].blob,art[0].name,{wPx:5000,hPx:5000,dpi:300});
   split=parts.parts.length;docs=await documents(kind,settings.name,about,licence,split);
   for(let i=0;i<split;i++){
    const blob=await zipStored([parts.parts[i],...docs]);if(blob.size>LIMIT)throw Error("Numbered PNG part exceeds Etsy limit.");
    packages.push(file(stem+"-"+(i+1)+"-png-part.zip",blob));
   }
   const restored=file("PNG-REASSEMBLY.json",new Blob([JSON.stringify(parts.manifest)],{type:"application/json"}));
   const htmlText=(await parts.html.text()).replace(/JPG-and-extras ZIP/g,"additional artwork ZIP").replace(/JPG ZIP/g,"additional artwork ZIP");
   // Keep recovery documents in an actual artwork package so strict archive validation passes.
   const groups=groupFiles(art.slice(1),docs);
   const index=groups.findIndex(g=>zipSize([...docs,...g,restored,txt("REBUILD-PNG.html",htmlText)])<=LIMIT);
   if(index<0)throw Error("The recovery instructions cannot fit alongside the remaining artwork. No quality reduction performed.");
   groups[index].push(restored,txt("REBUILD-PNG.html",htmlText));
   for(const g of groups)packages.push(file(stem+"-buyer-"+(packages.length+1)+".zip",await zipStored([...g,...docs])));
   checks.push("INFO transparent master split losslessly into "+split+" numbered ZIPs. Buyer restores exact bytes.");
  }else{
   for(const g of groupFiles(extras,docs))packages.push(file(stem+"-buyer-"+(packages.length+1)+".zip",await zipStored([...g,...docs])));
  }
  if(packages.length>5||packages.some(p=>p.blob.size>LIMIT))throw Error("These files cannot fit Etsy's five attachments without altering the artwork. No image has been reduced.");
  status("Building listing images and documents…");
  small=await (wall?(source.makePhoneTile||source.makeTile):source.makeTile)(1000);
  const p=await previews(kind,small,settings),m=manifest(kind,settings,p.alts,split);
  const outer=await zipStored([...packages.map(f=>file("UPLOAD-TO-ETSY/"+f.name,f.blob)),...p.out,txt("LISTING-METADATA.json",JSON.stringify(m)),txt("QUALITY-CHECK.txt",["SAPIVER PRINTS - "+kind+" quality report",...checks,...(source.note?[source.note]:[]),...packages.map(f=>f.name+" - "+f.blob.size+" bytes"),"Seam diagnostics are heuristic. Inspect the delivered artwork and listing before publishing."].join("\n")),txt("SELLER-CHECKLIST.txt","Review the listing title, price, tags, actual artwork and quality report in Poster Gen before approval. Only the nested buyer ZIPs are customer files.")]);
  if(outer.size>OUTER_LIMIT)throw Error("Seller kit exceeds the uploader's 100 MB limit.");
  return {name:stem+"-"+(wall?"phone-wallpaper":"seamless")+"-seller-kit.zip",blob:outer,checks,packages:packages.length};
 }finally{free(tile);free(small);}
}
function open(source){
 const d=document.createElement("dialog");d.style.cssText="max-width:min(94vw,680px);max-height:92vh;overflow:auto;padding:18px;border:1px solid #869b99;border-radius:12px;background:#fff;color:#213333";
 d.innerHTML='<h2>One design - two seller packs</h2><p>Seamless: 5000 and 2500px, transparent + one colour. Wallpaper: one design in four phone sizes.</p><label>Design name <input data-name maxlength="75"></label><br><label>Background <input data-colour type="color"></label><br><label>Phone pattern scale <input data-scale type="range" min="1" max="6" step=".25" value="2"></label><br><canvas data-preview width="180" height="400" style="display:block;max-height:32vh;max-width:100%;margin:8px auto"></canvas><label><input type="checkbox" data-guide checked> Show 8% top guide in preview only</label><br><label>Seamless price £ <input data-pattern-price type="number" min=".2" max="10000" step=".01" value="3.49" style="width:90px"></label><br><label>Wallpaper price £ <input data-wall-price type="number" min=".2" max="10000" step=".01" value="1.49" style="width:90px"></label><br><label><input data-ai type="checkbox"> Artwork created with AI assistance</label><br><label><input data-review type="checkbox"> I have checked the source repeat and wallpaper preview.</label><p><button data-action="both" type="button">Download both seller packs</button> <button data-action="pattern" type="button">Seamless only</button> <button data-action="wallpaper" type="button">Wallpaper only</button></p><p data-status role="status" aria-live="polite"></p><div data-links></div><button data-close type="button">Close</button>';
 document.body.append(d);const q=s=>d.querySelector(s),status=s=>q("[data-status]").textContent=s,urls=[];
 q("[data-name]").value=cleanName(source.name);q("[data-colour]").value=/^#[0-9a-f]{6}$/i.test(source.colour||"")?source.colour:"#ffffff";q("[data-ai]").checked=source.ai===true;
 try{const price=localStorage.getItem("sapiver-digital-pattern-price");if(price&&Number(price)>=.2)q("[data-pattern-price]").value=price;const wp=localStorage.getItem("sapiver-wallpaper-price");if(wp&&Number(wp)>=.2)q("[data-wall-price]").value=wp;}catch(_){}
 let previewTile=null,working=false;
 function settings(){return {name:cleanName(q("[data-name]").value),colour:q("[data-colour]").value,repeats:Number(q("[data-scale]").value),patternPrice:Number(q("[data-pattern-price]").value),wallPrice:Number(q("[data-wall-price]").value),ai:q("[data-ai]").checked,tags:source.tags||[]};}
 function draw(){
  if(!previewTile)return;
  const s=settings(),c=q("[data-preview]"),ctx=c.getContext("2d"),p=wallpaper(previewTile,180,400,s.colour,s.repeats);try{ctx.drawImage(p,0,0);if(q("[data-guide]").checked){ctx.strokeStyle="#ffcf31";ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(0,32);ctx.lineTo(180,32);ctx.stroke();ctx.setLineDash([]);}}finally{free(p);}
 }
 for(const key of ["[data-colour]","[data-scale]","[data-guide]"])q(key).addEventListener("input",()=>{q("[data-review]").checked=false;draw();});
 function addDownload(result){
  const url=URL.createObjectURL(result.blob);urls.push(url);const a=document.createElement("a");a.href=url;a.download=result.name;a.textContent="Download "+result.name;const row=document.createElement("p");row.append(a);q("[data-links]").append(row);a.click();
 }
 async function run(mode){
  if(working)return;if(!q("[data-review]").checked){status("Review the source repeat and preview first.");return;}
  const s=settings();if(!q("[data-name]").value.trim()){status("Enter a design name.");return;}
  if(![s.patternPrice,s.wallPrice].every(n=>Number.isFinite(n)&&n>=.2&&n<=10000&&Math.abs(n*100-Math.round(n*100))<.00001)||s.wallPrice>=s.patternPrice){status("Set valid prices; the wallpaper must cost less than the pattern.");return;}
  working=true;for(const b of d.querySelectorAll("input,button"))b.disabled=true;
  const errors=[],warnings=[];let made=0;
  try{
   for(const kind of mode==="both"?["pattern","wallpaper"]:[mode]){
    try{const result=await prepare(kind,source,s,status);addDownload(result);made++;warnings.push(...result.checks.filter(x=>x.startsWith("WARN")));}
    catch(e){errors.push(kind+": "+e.message);}
   }
   try{localStorage.setItem("sapiver-digital-pattern-price",String(s.patternPrice));localStorage.setItem("sapiver-wallpaper-price",String(s.wallPrice));}catch(_){}
   status(made+" seller pack(s) prepared. "+(warnings.length?warnings.length+" seam warning(s): review QUALITY-CHECK.txt. ":"")+(errors.length?errors.join(" | "):"Review in Poster Gen before publishing.")+" Use the download links if your browser blocks multiple downloads.");
  }finally{working=false;for(const b of d.querySelectorAll("input,button"))b.disabled=false;}
 }
 d.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>run(b.dataset.action));
 q("[data-close]").onclick=()=>{if(!working)d.close();};d.addEventListener("cancel",e=>{if(working)e.preventDefault();});d.addEventListener("close",()=>{free(previewTile);for(const url of urls)URL.revokeObjectURL(url);d.remove();});
 d.showModal();for(const b of d.querySelectorAll("[data-action]"))b.disabled=true;
 Promise.resolve().then(()=>(source.makePhoneTile||source.makeTile)(400)).then(c=>{if(!d.isConnected){free(c);return;}previewTile=c;draw();for(const b of d.querySelectorAll("[data-action]"))b.disabled=false;}).catch(e=>status(e.message));
}
const api={PHONE_SIZES,layout,squareGrid,squareTile,wallpaper,groupFiles,zipStored,tagsFor,manifest,verifyPng,prepare,open};
if(typeof module==="object"&&module.exports)module.exports=api;else root.PatternForgeTwoPacks=api;
})(typeof globalThis!=="undefined"?globalThis:this);
