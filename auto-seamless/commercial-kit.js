'use strict';
// Auto Seamless only: create a lossless Etsy seller-kit envelope for one design.
(function () {
 const byId=id=>document.getElementById(id);
 const button=byId('downloadCommercial'),check=byId('commercialReviewConfirmed'),status=byId('commercialExportStatus');
 if(!button||!check||!status)return;
 const priceInput=byId('commercialPrice');
 if(priceInput){
  try{const remembered=localStorage.getItem('sapiver-digital-pattern-price');if(remembered)priceInput.value=remembered;}catch{}
 }
 function listingDetails(){
  const name=String(byId('metaName')?.value||'').trim();
  const desc=String(byId('metaDesc')?.value||'').trim();
  const tags=String(byId('metaEtsyTags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!name||name.length>100||!desc||!/\\bAI\\b/i.test(desc))
   throw Error('Complete the artwork analysis and AI disclosure before exporting.');
  // This is never a truncated Redbubble tag list.
  if(tags.length!==13||new Set(tags.map(t=>t.toLocaleLowerCase('en'))).size!==13||
     tags.some(t=>t.length<3||t.length>20||/[<>\x00-\x1f]/.test(t))||
     tags.filter(t=>t.split(/\s+/).length>=2).length<11)
   throw Error('Review exactly 13 different Etsy buyer-search phrases, mostly multi-word and no longer than 20 characters. Do not use the Redbubble tags.');
  const altIds=['metaEtsyAlt1','metaEtsyAlt2','metaEtsyAlt3','metaEtsyAlt4'];
  const imageNames=['01-pattern.jpg','02-repeat.jpg','03-cushion-visualisation.jpg','04-files-and-detail.jpg'];
  const alts=altIds.map(id=>String(byId(id)?.value||'').trim());
  const lead=String(byId('metaEtsyCleanAlt')?.value||'').trim();
  if([lead,...alts].some(t=>t.length<35||t.length>250||/[<>\x00-\x1f]/.test(t)))
   throw Error('Review each image-specific Etsy alt description (35–250 characters) before export.');
  const imageAltTextByFilename=Object.fromEntries(imageNames.map((name,i)=>[name,alts[i]]));
  const rawPrice=String(priceInput?.value||'').trim(),price=Number(rawPrice);
  if(!rawPrice||!/^\d+(?:\.\d{1,2})?$/.test(rawPrice)||!Number.isFinite(price)||price<0.2||price>10000)
   throw Error('Enter your approved GBP selling price (at least £0.20, no more than two decimal places).');
  return {
   format:'sapiver-seamless-seller-kit',version:1,
   product:{type:'digital',kind:'pattern',name,subject:name,description:desc,price,sectionTitle:'Digital Downloads',tags,seamlessConfirmed:true,useEmbeddedText:true,aiAssisted:true,imageAltTextByFilename,cleanLeadAltText:lead},
   listingSource:'Etsy buyer-intent candidate phrases from one visual AI analysis; live search demand and keyword volume are not measured.',
   reviewRequired:true
  };
 }
  const encoder=new TextEncoder(), MAX=20000000;
 const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
 const encode=s=>encoder.encode(s),binary=v=>typeof v==='string'?encode(v):v;
 const w16=(v,p,n)=>v.setUint16(p,n,true), w32=(v,p,n)=>v.setUint32(p,n>>>0,true);
 const crc=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
 let running=false;
 function zip(entries){
  if(!entries.length||entries.length>100)throw Error('Invalid ZIP entry count');
  const now=new Date(),date=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  const files=[],central=[];let offset=0,size=0;
  for(const entry of entries){
   const name=entry.name,data=binary(entry.data),packed=entry.packedData||data,method=entry.packedData?8:0;
   if(!name||name.length>180||/[\\\x00-\x1f<>:]/.test(name)||name.startsWith('/')||name.split('/').some(x=>!x||x==='..'))throw Error('Invalid ZIP filename');
   const path=encode(name),sum=crc(data);
   if(data.byteLength>50000000)throw Error('Individual file exceeds safety limit');
   const local=new Uint8Array(30+path.length),a=new DataView(local.buffer);
   w32(a,0,0x04034b50);w16(a,4,20);w16(a,6,2048);w16(a,8,method);w16(a,10,time);w16(a,12,date);
   w32(a,14,sum);w32(a,18,packed.length);w32(a,22,data.length);w16(a,26,path.length);local.set(path,30);
   const dir=new Uint8Array(46+path.length),b=new DataView(dir.buffer);
   w32(b,0,0x02014b50);w16(b,4,20);w16(b,6,20);w16(b,8,2048);w16(b,10,method);w16(b,12,time);w16(b,14,date);
   w32(b,16,sum);w32(b,20,packed.length);w32(b,24,data.length);w16(b,28,path.length);w32(b,42,offset);dir.set(path,46);
   files.push(local,packed);central.push(dir);offset+=local.length+packed.length;size+=dir.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  w32(e,0,0x06054b50);w16(e,8,entries.length);w16(e,10,entries.length);w32(e,12,size);w32(e,16,offset);
  return new Blob([...files,...central,end],{type:'application/zip'});
 }
 async function getBytes(blob){return new Uint8Array(await blob.arrayBuffer());}
 function toBlob(canvas,kind,quality){return new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Image export failed; check device memory.')),kind,quality));}
 function render(width){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=width;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas rendering unavailable');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(typeof state!=='undefined'&&state.mode==='ready'){
   // Listing-only rendering retains the tile aspect ratio; it never modifies the buyer master.
   const tileHeight=width*state.tile.h/state.tile.w;
   for(let y=0;y<Math.ceil(width/tileHeight);y++)ctx.drawImage(tileCanvas,0,y*tileHeight,width,tileHeight);
   return canvas;
  }
  const across=Number(byId('density').value),down=Math.max(1,Math.min(40,Math.round(across*state.tile.w/state.tile.h)));
  for(let y=0;y<down;y++)for(let x=0;x<across;x++){
   const x0=Math.round(x*width/across),x1=Math.round((x+1)*width/across),y0=Math.round(y*width/down),y1=Math.round((y+1)*width/down);
   ctx.drawImage(tileCanvas,x0,y0,x1-x0,y1-y0);
  }
  return canvas;
 }

 const PREVIEW_SIZE=2400;
 function preview(tiled){
  const size=PREVIEW_SIZE,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');if(!c)throw Error('Listing image rendering unavailable');
  c.fillStyle='#fff';c.fillRect(0,0,size,size);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  if(typeof state!=='undefined'&&state.mode==='ready'){
   if(tiled){
    const tw=size/2,th=tw*state.tile.h/state.tile.w;
    for(let y=0;y<Math.ceil(size/th);y++)for(let x=0;x<2;x++)c.drawImage(tileCanvas,x*tw,y*th,tw,th);
   }else{
    // The cover shows the whole original rectangle, never stretched or cropped.
    const scale=Math.min(size/state.tile.w,size/state.tile.h),w=state.tile.w*scale,h=state.tile.h*scale;
    c.drawImage(tileCanvas,(size-w)/2,(size-h)/2,w,h);
   }
  }else if(tiled){for(let y=0;y<2;y++)for(let x=0;x<2;x++)c.drawImage(tileCanvas,x*1200,y*1200,1200,1200);}
  else{const r=render(size);c.drawImage(r,0,0);r.width=r.height=0;}
  return canvas;
 }
 function previewMockup(){
  const size=PREVIEW_SIZE,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');if(!c)throw Error('Mock-up rendering unavailable');
  const bg=c.createLinearGradient(0,0,size,size);bg.addColorStop(0,'#e9e5dc');bg.addColorStop(1,'#f8f5ef');
  c.fillStyle=bg;c.fillRect(0,0,size,size);
  c.fillStyle='#273e38';c.font='bold 82px system-ui';c.fillText('PATTERN IN CONTEXT',145,205);
  c.fillStyle='#556861';c.font='48px system-ui';c.fillText('Illustrative fabric cushion mock-up',145,285);
  c.save();c.translate(1220,1210);c.rotate(-0.07);
  c.shadowColor='rgba(22,35,29,.34)';c.shadowBlur=100;c.shadowOffsetY=65;
  c.fillStyle='#fff';c.beginPath();c.roundRect(-765,-765,1530,1530,150);c.fill();
  c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;
  c.clip();
  const art=render(1550);c.drawImage(art,-765,-765,1530,1530);art.width=art.height=0;
  const shade=c.createLinearGradient(-765,0,765,0);shade.addColorStop(0,'rgba(0,0,0,.22)');shade.addColorStop(.16,'rgba(255,255,255,.1)');shade.addColorStop(.8,'rgba(255,255,255,.06)');shade.addColorStop(1,'rgba(0,0,0,.19)');
  c.fillStyle=shade;c.fillRect(-765,-765,1530,1530);
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=13;c.strokeRect(-742,-742,1484,1484);
  c.restore();
  c.fillStyle='#273e38';c.font='bold 52px system-ui';c.fillText('DIGITAL PATTERN FILES',145,2230);
  c.fillStyle='#556861';c.font='40px system-ui';c.fillText('Visualisation only - cushion is not supplied',145,2300);
  return canvas;
 }
 function previewContents(listing,accepted,partCount){
  const size=PREVIEW_SIZE,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');if(!c)throw Error('Contents image rendering unavailable');
  c.fillStyle='#f7f4ec';c.fillRect(0,0,size,size);
  c.fillStyle='#263c35';c.font='bold 92px system-ui';c.fillText('WHAT IS INCLUDED',125,215);
  c.fillStyle='#61746b';c.font='48px system-ui';c.fillText('One seamless design - digital download',125,298);
  const side=Math.min(tileCanvas.width,tileCanvas.height),sx=Math.round((tileCanvas.width-side)/2),sy=Math.round((tileCanvas.height-side)/2);
  c.drawImage(tileCanvas,sx,sy,side,side,130,400,980,980);
  c.strokeStyle='#d8d2c6';c.lineWidth=10;c.strokeRect(130,400,980,980);
  c.fillStyle='#263c35';c.font='bold 54px system-ui';c.fillText('MOTIF CLOSE-UP',130,1470);
  c.font='bold 65px system-ui';c.fillText('Your files',1200,490);
  const formats=[...includedArtworkLabels(accepted),'Commercial-use licence','Instructions + About'];
  c.font='48px system-ui';
  c.fillStyle='#263c35';
  for(let i=0;i<formats.length;i++)c.fillText('- '+formats[i],1200,615+i*133,1090);
  c.fillStyle='#263c35';c.font='bold 57px system-ui';c.fillText(partCount+' Etsy download ZIP'+(partCount===1?'':'s'),1200,1570);
  c.fillStyle='#607168';c.font='45px system-ui';c.fillText(state.mode==='ready'?(accepted.some(f=>/-seamless-master\./i.test(f.name))?'Full-size original unchanged':'Full-size re-encoded image supplied'):'PNG assets include 300 DPI metadata',1200,1670,1080);
  c.fillStyle='#263c35';c.font='bold 63px system-ui';c.fillText(String(listing.product.name).slice(0,95),125,2020,2150);
  c.fillStyle='#61746b';c.font='45px system-ui';c.fillText('Digital files only - no physical product',125,2115);
  c.fillText('Only the files listed above are included',125,2190);
  return canvas;
 }
 async function documentText(name){
  const r=await fetch('/auto-seamless/commercial/'+encodeURIComponent(name),{cache:'no-store'});
  if(!r.ok)throw Error('Missing customer document '+name);
  const t=await r.text();if(!t.trim()||t.length>5000)throw Error('Invalid customer document '+name);
  return {name,data:encode(t)};
 }
 function packedSize(files){
  // Exact ZIP archive bytes, whether an entry is stored or compressed losslessly.
  return 22+files.reduce((sum,f)=>sum+(f.packedData?.length??f.data.length)+76+2*encode(f.name).length,0);
 }
 function pack(artwork,documents){
  const names=['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'];
  if((documents.length<3||documents.length>4)||names.some(name=>!documents.some(d=>d.name===name&&d.data.length>0))||!artwork.length)
   throw Error('All three buyer documents and at least one artwork file are required');
  const documentBytes=packedSize(documents),groups=[];
  if(documentBytes>=MAX)throw Error('Buyer documents exceed the Etsy ZIP limit');
  for(const asset of [...artwork].sort((a,b)=>(b.packedData?.length??b.data.length)-(a.packedData?.length??a.data.length))){
   const bytes=(asset.packedData?.length??asset.data.length)+76+2*encode(asset.name).length;
   if(bytes+documentBytes>MAX)throw Error(asset.name+' plus the required licence, About and instructions exceeds Etsy’s 20 MB limit. No image quality was reduced.');
   let group=groups.find(g=>g.bytes+bytes<=MAX);
   if(!group){group={bytes:documentBytes,artwork:[]};groups.push(group);}
   group.artwork.push(asset);group.bytes+=bytes;
  }
  if(groups.length>5)throw Error('Design requires more than five Etsy ZIP attachments after including the licence in each one.');
  // EACH independently downloadable buyer ZIP includes the same three actual documents.
  return groups.map(g=>[...g.artwork,...documents]);
 }
 async function tryLosslessZipCompression(asset){
  // The original PNG pixels and bytes remain unchanged when extracted.
  // This is raw DEFLATE (ZIP method 8), not JPEG conversion or downscaling.
  if(typeof CompressionStream!=='function'||asset.data.length>50_000_000)return asset;
  try{
   const stream=new Blob([asset.data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
   const packedData=new Uint8Array(await new Response(stream).arrayBuffer());
   // Preserve the server's ZIP bomb guard and never use an expansion ratio >100:1.
   if(packedData.length>0&&packedData.length<asset.data.length&&asset.data.length/packedData.length<=100)
    return {...asset,packedData};
  }catch(error){console.warn('Lossless ZIP compression unavailable; using original bytes.',error);}
  return asset;
 }
 async function readySmallerArtwork(stem,documents,renderCanvas=null){
  if(!renderCanvas)renderCanvas=tileCanvas;
  // Each completed ready-made kit must include a genuinely smaller image.
  const sw=renderCanvas.width,sh=renderCanvas.height,longest=Math.max(sw,sh);
  if(!sw||!sh||longest<2)throw Error('Complete original image is unavailable. Upload it again.');
  const target=longest>2500?2500:Math.floor(longest/2);
  const w=Math.max(1,Math.round(sw*target/longest)),h=Math.max(1,Math.round(sh*target/longest));
  if(w===sw&&h===sh)throw Error('Cannot create a distinct second size from this image.');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  try{
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Smaller-image rendering unavailable on this device.');
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(renderCanvas,0,0,w,h);
   status.textContent='Preparing required '+w+' × '+h+' PNG…';
   const png=await toBlob(canvas,'image/png');
   if(png.type!=='image/png')throw Error('Browser cannot encode the required smaller PNG.');
   let asset={name:stem+'-'+target+'px-300dpi-repeat.png',data:await getBytes(taggedDPI(await getBytes(png))),width:w,height:h,kind:'small-png'};
   if(packedSize([asset,...documents])>MAX)asset=await tryLosslessZipCompression(asset);
   if(packedSize([asset,...documents])<=MAX)return {asset,smallerAlternative:false};
   if(!byId('commercialAllowConversion')?.checked)
    throw Error('The smaller PNG also exceeds Etsy’s 20 MB limit. Tick "Allow an Etsy-compatible version" to permit a smaller compressed WebP, then export again.');
   for(const q of [0.98,0.94,0.90,0.85,0.78,0.68]){
    status.textContent='Preparing required smaller WebP ('+Math.round(q*100)+'% quality)…';
    const blob=await toBlob(canvas,'image/webp',q);
    if(blob.type!=='image/webp')throw Error('This browser cannot create the smaller WebP.');
    let candidate={name:stem+'-'+target+'px-compressed.webp',data:await getBytes(blob),width:w,height:h,kind:'small-webp'};
    if(packedSize([candidate,...documents])>MAX)candidate=await tryLosslessZipCompression(candidate);
    if(packedSize([candidate,...documents])<=MAX)return {asset:candidate,smallerAlternative:true};
   }
   throw Error('No smaller image fits Etsy’s limit. Export stopped rather than delivering an incomplete customer pack.');
  }finally{canvas.width=canvas.height=0;}
 }
 async function prepareCustomerArtwork(files,documents,renderCanvas=null){
  if(typeof state!=='undefined'&&state.mode==='ready'){
   if(!renderCanvas)renderCanvas=tileCanvas;
   if(files.length!==1||!/-seamless-master\.(png|jpg|webp)$/i.test(files[0].name))throw Error('The unchanged seamless master is missing');
   let original=files[0];
   if(packedSize([original,...documents])>MAX){
    status.textContent='Checking whether the unmodified file fits with lossless ZIP compression…';
    original=await tryLosslessZipCompression(original);
   }
   if(packedSize([original,...documents])<=MAX){
    const stem=files[0].name.replace(/-seamless-master\.(png|jpg|webp)$/i,'');
    const smaller=await readySmallerArtwork(stem,documents,renderCanvas);
    return {accepted:[original,smaller.asset],omitted:[],converted:false,smallerAlternative:smaller.smallerAlternative};
   }
   // A larger original can be retained on the seller's device. Conversion is strictly opt-in:
   // it is NOT equivalent to the original master; list the delivered file formats honestly.
   if(!byId('commercialAllowConversion')?.checked)
    throw Error('Original is '+(files[0].data.length/1e6).toFixed(2)+' MB and cannot fit Etsy’s 20 MB buyer ZIP. Tick "Allow an Etsy-compatible version" to approve a re-encoded alternative, then download again. Original unchanged.');
   const stem=files[0].name.replace(/-seamless-master\.(png|jpg|webp)$/i,'');
   if(!renderCanvas.width||!renderCanvas.height)throw Error('Original image preview is missing; upload again.');
   const sourceWidth=renderCanvas.width,sourceHeight=renderCanvas.height;
   const fits=async asset=>{
    if(packedSize([asset,...documents])>MAX)asset=await tryLosslessZipCompression(asset);
    return packedSize([asset,...documents])<=MAX?asset:null;
   };
   // First try a same-size PNG re-encode (no downsampling, but not byte-identical).
   status.textContent='Trying to fit a full-resolution PNG without resizing…';
   const recodedPng=await toBlob(renderCanvas,'image/png');
   if(recodedPng.type!=='image/png')throw Error('Browser cannot create a PNG image.');
   const png=await fits({
    name:stem+'-full-size-reencoded.png',
    data:await getBytes(taggedDPI(await getBytes(recodedPng))),width:sourceWidth,height:sourceHeight,
    deliveryNote:'Same-dimension PNG re-encoded from the source, not the byte-identical original.'
   });
   if(png){
    const smaller=await readySmallerArtwork(stem,documents,renderCanvas);
    return {accepted:[png,smaller.asset],omitted:[],converted:true,smallerAlternative:smaller.smallerAlternative};
   }
   // WebP supports alpha and keeps the full pixel dimensions, but is lossy.
   // If the user's printer requires PNG, a smaller PNG companion is included where it fits.
   let webp=null;
   for(const quality of [0.98,0.94,0.90,0.85,0.78]){
    status.textContent='Preparing full-resolution WebP with transparent pixels supported ('+Math.round(quality*100)+'% quality)…';
    const blob=await toBlob(renderCanvas,'image/webp',quality);
    if(blob.type!=='image/webp')throw Error('Your browser cannot create WebP files. No alternative was delivered.');
    const candidate=await fits({
     name:stem+'-full-size-compressed.webp',
     data:await getBytes(blob),width:sourceWidth,height:sourceHeight,
     deliveryNote:'Full-resolution WebP uses lossy compression; transparency is supported. Check compatibility with the printer and inspect the repeat.'
    });
    if(candidate){webp=candidate;break;}
   }
   if(!webp)throw Error('The full-resolution version still exceeds Etsy’s limit. Nothing was silently resized. Use a smaller original or prepare a separate delivery format.');
   const smaller=await readySmallerArtwork(stem,documents,renderCanvas);
   return {accepted:[webp,smaller.asset],omitted:[],converted:true,smallerAlternative:smaller.smallerAlternative};
  }
  const accepted=[],omitted=[];
  for(const file of files){
   let selected=file;
   if(packedSize([selected,...documents])>MAX){
    status.textContent='Checking lossless ZIP compression for '+file.name+'…';
    await new Promise(resolve=>requestAnimationFrame(resolve));
    selected=await tryLosslessZipCompression(file);
   }
   if(packedSize([selected,...documents])>MAX){
    // A full-size JPEG, a smaller PNG and the usable seamless tile are all required.
    // Do not silently shrink pixels or corrupt the full PNG by splitting raw bytes.
    if(/-5000px-300dpi-repeat\.png$/i.test(file.name)){
     omitted.push(file.name);continue;
    }
    throw Error(file.name+' remains above Etsy’s 20 MB cap even after ZIP compression. The design has not been downscaled; export needs a different file format or less complex artwork.');
   }
   accepted.push(selected);
  }
  if(!accepted.some(f=>/-5000px-repeat\.jpg$/i.test(f.name))||
     !accepted.some(f=>/-2500px-300dpi-repeat\.png$/i.test(f.name))||
     !accepted.some(f=>/-seamless-tile-300dpi\.png$/i.test(f.name)))
    throw Error('Required customer formats are missing. Nothing was downloaded.');
  return {accepted,omitted};
 }
 function includedArtworkLabels(accepted){
  // Customer-facing descriptions are derived from buyer ZIP contents only.
  if(typeof state!=='undefined'&&state.mode==='ready')return accepted.map(f=>{
   const ext=f.name.split('.').pop().toUpperCase(),width=f.width||state.tile.w,height=f.height||state.tile.h;
   const kind=/-seamless-master\./i.test(f.name)?'original seamless master':
    /-full-size-reencoded\.png$/i.test(f.name)?'full-size re-encoded PNG':
    /-full-size-compressed\.webp$/i.test(f.name)?'high-quality compressed WEBP':
    /-portable-png\.png$/i.test(f.name)?'smaller PNG companion':
    /-\d+px-300dpi-repeat\.png$/i.test(f.name)?'smaller PNG seamless tile':
    /-\d+px-compressed\.webp$/i.test(f.name)?'smaller compressed WEBP tile':'digital image';
   const option=/-solid-/i.test(f.name)?'solid background':/-transparent-/i.test(f.name)?'transparent background':null;
   return width+' x '+height+' '+ext+' ('+(option?option+', ':'')+kind+')';
  });
  const formats=[
   [/-5000px-repeat\.jpg$/i,'5000 x 5000 JPG image'],
   [/-5000px-300dpi-repeat\.png$/i,'5000 x 5000 PNG image'],
   [/-2500px-300dpi-repeat\.png$/i,'2500 x 2500 PNG image'],
   [/-seamless-tile-300dpi\.png$/i,'Seamless tile PNG']
  ];
  return formats.filter(([pattern])=>accepted.some(f=>pattern.test(f.name))).map(([,label])=>label);
 }
 function refresh(){button.disabled=running||!state.tile||state.busy||!check.checked;}
 window.addEventListener('sapiver:source-changed',()=>{check.checked=false;const conversion=byId('commercialAllowConversion');if(conversion)conversion.checked=false;status.textContent='Review the new 3 × 3 repeat before export.';refresh();});
 window.addEventListener('sapiver:tile-ready',refresh);
 check.addEventListener('change',refresh);
 async function run(){
  if(running||!check.checked||!state.tile||state.busy)return;
  running=true;refresh();status.textContent='Preparing full-resolution image formats and seller ZIP…';
  await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
  let big,small,prev;
  try{
   const listing=listingDetails();
   const stem=(state.fileName||'seamless-pattern').replace(/[^A-Za-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'seamless-pattern',files=[];
   const paired=state.mode==='ready'&&state.backgroundPair;
   if(typeof state!=='undefined'&&state.mode==='ready'){
    // Unmodified source bytes are delivered in the Etsy buyer ZIP.
    const original=state.originalFile;
    if(!original||!/\.(png|jpe?g|webp)$/i.test(original.name))throw Error('Upload a PNG, JPG or WebP master first');
    const ext=original.name.toLowerCase().split('.').pop().replace('jpeg','jpg');
    // Original file permissions can expire on Android after preview/AI analysis.
    // Only use the byte-for-byte snapshot captured during initial upload.
    const originalBytes=state.originalBytes;
    if(!(originalBytes instanceof Uint8Array)||originalBytes.byteLength!==original.size)
     throw Error('The original artwork is not safely held in memory. Please upload the file again.');
    if(paired){
     const variations=paired.variations||[{color:paired.backgroundColor,image:paired.solid}];
     if(ext!=='png'||!(paired.transparent.bytes instanceof Uint8Array)||
        paired.transparent.width!==state.tile.w||paired.transparent.height!==state.tile.h||
        variations.length<1||variations.length>3)
      throw Error('Transparent original and one to three colour PNGs are required at matching dimensions.');
     files.push({name:stem+'-transparent-seamless-master.png',data:paired.transparent.bytes,
       width:state.tile.w,height:state.tile.h,role:'original'});
     for(let i=0;i<variations.length;i++){
      const variant=variations[i],hex=String(variant.color).replace('#','').toLowerCase();
      if(!/^[0-9a-f]{6}$/.test(hex)||!(variant.image?.bytes instanceof Uint8Array)||
         variant.image.width!==state.tile.w||variant.image.height!==state.tile.h)
       throw Error('Colour '+(i+1)+' is missing or has inconsistent dimensions.');
      const filename=variations.length===1?stem+'-solid-seamless-master.png':
        stem+'-solid-'+hex+'-seamless-master.png';
      files.push({name:filename,data:variant.image.bytes,width:state.tile.w,height:state.tile.h,role:'colour',colour:variant.color});
     }
    }else files.push({name:stem+'-seamless-master.'+ext,data:originalBytes,width:state.tile.w,height:state.tile.h});
   }else{
    big=render(5000);
    files.push({name:stem+'-5000px-300dpi-repeat.png',data:await getBytes(taggedDPI(await getBytes(await toBlob(big,'image/png'))))});
    files.push({name:stem+'-5000px-repeat.jpg',data:await getBytes(await toBlob(big,'image/jpeg',0.96))});
    big.width=big.height=0;big=null;
    small=render(2500);
    files.push({name:stem+'-2500px-300dpi-repeat.png',data:await getBytes(taggedDPI(await getBytes(await toBlob(small,'image/png'))))});
    small.width=small.height=0;small=null;
    files.push({name:stem+'-seamless-tile-300dpi.png',data:await getBytes(taggedDPI(await getBytes(await toBlob(tileCanvas,'image/png'))))});
   }
   const documents=[];
   for(const file of ['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'])documents.push(await documentText(file));
   let prepared,originalAssets=[],colourAssets=[];
   if(paired){
    // Reserve enough for the part-specific CONTENTS.txt before choosing formats.
    const reserve=[...documents,{name:'CONTENTS.txt',data:encode(' '.repeat(4096))}];
    const preparedParts=[];
    for(let i=0;i<files.length;i++){
     const item=files[i];
     let canvas=tileCanvas,decoded=null,temporary=null;
     // The preview canvas holds the FIRST coloured version; all other images
     // are decoded independently from the exact bytes in the source ZIP.
     if(i===0||i>1){
      temporary=document.createElement('canvas');
      temporary.width=paired.width;temporary.height=paired.height;
      try{
       decoded=await createImageBitmap(new Blob([item.data],{type:'image/png'}));
       const ctx=temporary.getContext('2d');
       if(!ctx)throw Error('Browser cannot prepare background variation '+i);
       ctx.drawImage(decoded,0,0);
       canvas=temporary;
      }catch(e){temporary.width=temporary.height=0;throw e;}
     }
     try{preparedParts.push(await prepareCustomerArtwork([item],reserve,canvas));}
     finally{decoded?.close?.();if(temporary)temporary.width=temporary.height=0;}
    }
    originalAssets=preparedParts[0].accepted;
    colourAssets=preparedParts.slice(1).flatMap(part=>part.accepted);
    prepared={accepted:[...originalAssets,...colourAssets],
      converted:preparedParts.some(part=>part.converted),
      smallerAlternative:preparedParts.some(part=>part.smallerAlternative)};
   }else prepared=await prepareCustomerArtwork(files,documents);
   const {accepted,converted=false,smallerAlternative=false}=prepared;
   if(state.mode==='ready'){
    const dimensions=asset=>String(asset.width||state.tile.w)+'x'+String(asset.height||state.tile.h);
    const sizes=new Set(accepted.filter(f=>/\.(png|jpg|webp)$/i.test(f.name)).map(dimensions));
    if((paired?accepted.length!==(files.length*2):accepted.length!==2)||sizes.size!==2)
     throw Error('Both image sizes must be present for every included background.');
    if(paired){
     for(const source of files){
      const prefix=source.name.replace(/-seamless-master\.(png|jpg|webp)$/i,'');
      const images=accepted.filter(f=>f.name.startsWith(prefix));
      if(images.length!==2||new Set(images.map(dimensions)).size!==2)
       throw Error('Missing full-size or smaller image for '+source.name);
     }
    }
   }
   if(state.mode==='ready'){
    const delivered=includedArtworkLabels(accepted);
    listing.product.description+='\n\nDigital artwork included: '+delivered.join('; ')+'.';
    if(paired){
     const colours=(paired.variations||[{color:paired.backgroundColor}]).map(v=>v.color);
     listing.product.backgroundOptions=colours.length===1?'transparent-and-solid':'transparent-and-colour-variations';
     listing.product.backgroundColour=colours[0];
     listing.product.backgroundColours=colours;
     listing.product.description+=' This one design includes a transparent original and '+colours.length+
       ' solid-background colour option(s) ('+colours.join(', ')+'), each in original and smaller sizes. Original and colour files are delivered in separate Etsy buyer ZIPs under one commercial-use licence.';
    }
    if(converted){
     listing.product.description+=' One or more full-resolution files could not fit Etsy’s per-file limit without the approved re-encoding. PNG re-encoding preserves pixel dimensions; WebP, if included, uses lossy compression. Check the exact supplied formats and printer compatibility.';
     listing.product.deliveryChangedFromOriginal=true;
    }
    if(smallerAlternative)listing.product.description+=' The smaller WEBP uses lossy compression and is not a PNG. Inspect the included file formats and printer compatibility.';
   }
   // One separate class for the transparent ORIGINAL, another for the
   // selected COLOUR VARIATIONS. Each group can span multiple Etsy attachments.
   // Reserve 4096 bytes for a precise, per-part CONTENTS.txt during bin packing.
   const reserve=paired?[...documents,{name:'CONTENTS.txt',data:encode(' '.repeat(4096))}]:documents;
   const planned=paired?[
    ...pack(originalAssets,reserve).map((group,i)=>({role:'original',number:i+1,artwork:group.slice(0,-reserve.length)})),
    ...pack(colourAssets,reserve).map((group,i)=>({role:'colours',number:i+1,artwork:group.slice(0,-reserve.length)}))
   ]:pack(accepted,documents).map((group,i)=>({role:'standard',number:i+1,entries:group}));
   if(planned.length>5)throw Error('These image sizes and colours require '+planned.length+
     ' Etsy download ZIPs. Etsy accepts five. Remove a colour variation or approve a permitted alternative.');
   const pieces=[],seller=[],buyerMap=[];
   for(const part of planned){
    const entries=paired?[
     ...part.artwork,...documents,
     {name:'CONTENTS.txt',data:encode([
      'SAPIVER PRINTS - CONTENTS OF THIS DOWNLOAD ZIP','',
      'Type: '+(part.role==='original'?'ORIGINAL TRANSPARENT PATTERN':'SOLID BACKGROUND COLOUR VARIATIONS'),
      'Files IN THIS ZIP (not other purchase attachments):',
      ...part.artwork.map(asset=>'- '+asset.name+' - '+includedArtworkLabels([asset])[0]),
      '',
      'Also inside THIS ZIP: LICENSE.txt, README.txt, ABOUT-SAPIVER-PRINTS.txt, CONTENTS.txt.',
      'Check your Etsy order for separate original and background-colour ZIP downloads.',
      'All background options represent one design under one commercial-use licence.',
      'Some files are supplied as compressed WebP only if that alternative was approved.'
     ].join('\n')+'\n')}
    ]:part.entries;
    const buyer=zip(entries);
    if(buyer.size>MAX)throw Error('The '+part.role+' buyer ZIP exceeds Etsy’s 20 MB limit with its licence documents.');
    const filename=paired?stem.slice(0,41)+'-'+(part.role==='original'?'01-original':'02-colour-variations')+'-part-'+part.number+'.zip':
      stem.slice(0,49)+'-part-'+part.number+'.zip';
    const path='UPLOAD-TO-ETSY/'+filename;
    seller.push({name:path,data:await getBytes(buyer)});
    pieces.push(entries);
    buyerMap.push({file:path,kind:part.role,part:part.number,bytes:buyer.size,
      artwork:entries.filter(e=>/\.(png|jpg|webp)$/i.test(e.name)).map(e=>({name:e.name,description:includedArtworkLabels([e])[0]})),
      documents:entries.filter(e=>/\.txt$/i.test(e.name)).map(e=>e.name)});
   }
   if(paired)seller.push({name:'BUYER-ZIP-MAP.json',data:encode(JSON.stringify({
    schema:'sapiver-buyer-parts',version:1,listingId:stem,backgroundColours:listing.product.backgroundColours,
    etsyMaxFiles:5,etsyMaxBytesPerFile:MAX,buyerFiles:buyerMap
   },null,2)+'\n')});
   // Four independent 2400px Etsy photographs: cover, repeat evidence, honest context mock-up and contents/detail.
   for(const [imageName,makeImage] of [
    ['01-pattern.jpg',()=>preview(false)],
    ['02-repeat.jpg',()=>preview(true)],
    ['03-cushion-visualisation.jpg',()=>previewMockup()],
    ['04-files-and-detail.jpg',()=>previewContents(listing,accepted,pieces.length)]
   ]){
    status.textContent='Rendering listing image '+imageName+' at 2400 x 2400…';
    await new Promise(resolve=>requestAnimationFrame(resolve));
    prev=makeImage();
    const data=await getBytes(await toBlob(prev,'image/jpeg',0.9));
    if(!data.length)throw Error('Listing image export is empty: '+imageName);
    seller.push({name:'LISTING-IMAGES/'+imageName,data});
    prev.width=prev.height=0;prev=null;
   }
   seller.push({name:'LISTING-METADATA.json',data:encode(JSON.stringify(listing,null,2)+'\n')});
   const quality=[
    'QUALITY CHECK - automated packaging checks only',
    'Seller kit: '+stem,
    'Buyer ZIP files: '+pieces.length+' (each at or below 20,000,000 bytes)',
    'Every buyer ZIP includes LICENSE.txt, README.txt and ABOUT-SAPIVER-PRINTS.txt'+(paired?' and CONTENTS.txt':''),
    'Listing images: four 2400 x 2400 JPGs (artwork, 2x2 repeat, illustrative mock-up, included files/detail)',
    'Buyer artwork files: '+includedArtworkLabels(accepted).join(' | '),
    'Ready-made master conversion: '+(converted?'YES — replacement delivery formats disclosed to buyers':'NO — original files preserved'),
    'Ready-made second size: '+(state.mode==='ready'?(smallerAlternative?'smaller WebP (lossy, approved)':'smaller PNG (lossless)'):'standard 2500px PNG'),
    'Two distinct ready-made image sizes: '+(state.mode==='ready'?'required and validated':'not applicable'),
    'Background variants: '+(paired?'transparent original and '+listing.product.backgroundColours.length+' solid colour(s): '+listing.product.backgroundColours.join(', ')+(listing.product.backgroundColours.length===1?'; four images required':'; '+accepted.length+' images required'):'single image background'),
    'Owner instruction: examine the actual delivered image at 3 x 3 before publishing; re-encoding can introduce small repeat-boundary changes.',
    'Seamless repeat and print results: require owner visual review; not guaranteed by export',
    'Etsy publication: NOT automatic; Poster Gen approval required'
   ];
   seller.push({name:'QUALITY-CHECK.txt',data:encode(quality.join('\n')+'\n')});
   const note='One design: '+listing.product.name+'\nPrice: £'+listing.product.price.toFixed(2)+
    '\nEtsy section: Digital Downloads\nTitle, description and '+listing.product.tags.length+
    ' Etsy tags are embedded in LISTING-METADATA.json.\n'+
    (paired?'IMPORTANT: Poster Gen must be updated to attach ALL the nested original and colour-variation ZIPs to ONE Etsy digital listing before publishing. Do NOT use the old single-attachment importer for this seller kit.\n':
      'Upload the outer ZIP to Poster Gen as one digital pattern product.\n')+
    'Only UPLOAD-TO-ETSY ZIP files are delivered to buyers. Each has the licence, About and instructions.\n'+
    (paired?'BUYER-ZIP-MAP.json identifies the original and colour-variation ZIPs separately.\n':'')+
    'Source: AI visual description; not live keyword-demand research.\nReview before Etsy publication.\n';
   seller.push({name:'SELLER-CHECKLIST.txt',data:encode(note+'Included customer artwork:\n'+includedArtworkLabels(accepted).join('\n')+'\n')});
   const complete=zip(seller);if(complete.size>(paired?125000000:100000000))throw Error('The seller ZIP exceeds safe preparation limits. Reduce background colours or approve a smaller format; no files were omitted.');
   try{localStorage.setItem('sapiver-digital-pattern-price',String(listing.product.price.toFixed(2)));}catch{}
   saveBlob(complete,stem+'-commercial-seller-kit.zip');
   status.textContent='Seller ZIP downloaded with '+pieces.length+' separate Etsy buyer ZIP(s), '+(paired?'original and colour options grouped separately':'all images documented')+
    ', and four listing previews. '+(paired?'Do not use Poster Gen until its multi-attachment importer is updated. ':'')+
    (converted?'Approved image format changes must be reviewed. ':'')+'No Etsy listing created.';
  }catch(error){console.error(error);status.textContent='Export stopped: '+(error.message||'Unknown error')+'. No listing created.';}
  finally{if(big)big.width=big.height=0;if(small)small.width=small.height=0;if(prev)prev.width=prev.height=0;running=false;refresh();}
 }
 button.addEventListener('click',run);refresh();
})();