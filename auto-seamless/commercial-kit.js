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
  const main=String(byId('metaMain')?.value||'').trim();
  const desc=String(byId('metaDesc')?.value||'').trim();
  const extras=String(byId('metaTags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!name||name.length>100||!main||extras.length!==14||!desc)
   throw Error('Automatic title, tags and description must be ready. Check the listing fields before exporting.');
  if(!/\bAI\b/i.test(desc))throw Error('The listing description must disclose AI assistance.');
  const tagCandidates=[main,...extras],tags=[],used=new Set();
  for(const raw of tagCandidates){
   if(!raw||raw.length>20||/[<>\x00-\x1f]/.test(raw))continue;
   const key=raw.toLowerCase();if(used.has(key))continue;
   tags.push(raw);used.add(key);if(tags.length===13)break;
  }
  if(tags.length<5)throw Error('The artwork needs at least five relevant Etsy tags of 20 characters or fewer. Edit the generated tag fields and retry.');
  const rawPrice=String(priceInput?.value||'').trim(),price=Number(rawPrice);
  if(!rawPrice||!/^\d+(?:\.\d{1,2})?$/.test(rawPrice)||!Number.isFinite(price)||price<0.2||price>10000)
   throw Error('Enter your approved GBP selling price (at least £0.20, no more than two decimal places).');
  return {
   format:'sapiver-seamless-seller-kit',version:1,
   product:{type:'digital',kind:'pattern',name,subject:name,description:desc,price,sectionTitle:'Digital Downloads',tags,seamlessConfirmed:true,useEmbeddedText:true,aiAssisted:true},
   listingSource:'AI visual description; keyword demand and search volumes are not measured.',
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
  if(tiled){for(let y=0;y<2;y++)for(let x=0;x<2;x++)c.drawImage(tileCanvas,x*1200,y*1200,1200,1200);}
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
  const hasFullPNG=accepted.some(f=>/-5000px-300dpi-repeat\.png$/i.test(f.name));
  const formats=[
   '5000 x 5000 JPG image',
   hasFullPNG?'5000 x 5000 PNG image':'5000px PNG not included',
   '2500 x 2500 PNG image',
   'Seamless repeat tile PNG',
   'Commercial-use licence',
   'Instructions + About'
  ];
  c.font='48px system-ui';
  for(let i=0;i<formats.length;i++){
   c.fillStyle=i===1&&!hasFullPNG?'#8a5324':'#263c35';
   c.fillText((i===1&&!hasFullPNG?'! ':'- ')+formats[i],1200,615+i*133,1090);
  }
  c.fillStyle='#263c35';c.font='bold 57px system-ui';c.fillText(partCount+' Etsy download ZIP'+(partCount===1?'':'s'),1200,1570);
  c.fillStyle='#607168';c.font='45px system-ui';c.fillText('PNG assets include 300 DPI metadata',1200,1670,1080);
  c.fillStyle='#263c35';c.font='bold 63px system-ui';c.fillText(String(listing.product.name).slice(0,95),125,2020,2150);
  c.fillStyle='#61746b';c.font='45px system-ui';c.fillText('Digital files only - no physical product',125,2115);
  c.fillText('Review the item description for exact formats',125,2190);
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
  if(documents.length!==3||names.some(name=>!documents.some(d=>d.name===name&&d.data.length>0))||!artwork.length)
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
 async function prepareCustomerArtwork(files,documents){
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
 function refresh(){button.disabled=running||!state.tile||state.busy||!check.checked;}
 window.addEventListener('sapiver:source-changed',()=>{check.checked=false;status.textContent='Review the new 3 × 3 repeat before export.';refresh();});
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
   big=render(5000);
   files.push({name:stem+'-5000px-300dpi-repeat.png',data:await getBytes(taggedDPI(await getBytes(await toBlob(big,'image/png'))))});
   files.push({name:stem+'-5000px-repeat.jpg',data:await getBytes(await toBlob(big,'image/jpeg',0.96))});
   big.width=big.height=0;big=null;
   small=render(2500);
   files.push({name:stem+'-2500px-300dpi-repeat.png',data:await getBytes(taggedDPI(await getBytes(await toBlob(small,'image/png'))))});
   small.width=small.height=0;small=null;
   files.push({name:stem+'-seamless-tile-300dpi.png',data:await getBytes(taggedDPI(await getBytes(await toBlob(tileCanvas,'image/png'))))});
   const documents=[];
   for(const file of ['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'])documents.push(await documentText(file));
   const {accepted,omitted}=await prepareCustomerArtwork(files,documents);
   if(omitted.length){
    const warning='Format disclosure: This package includes the original 5000 × 5000 JPG, 2500 × 2500 lossless PNG and seamless repeat tile, but NOT a 5000 × 5000 PNG. That PNG could not fit Etsy’s 20 MB limit even after lossless ZIP compression. No file was downscaled to conceal the limit.';
    listing.product.description=(listing.product.description+' '+warning).slice(0,1500);
    listing.formatWarnings=[warning];
   }
   const pieces=pack(accepted,documents),seller=[];
   for(let i=0;i<pieces.length;i++){
    const buyer=zip(pieces[i]);if(buyer.size>MAX)throw Error('Buyer ZIP exceeds Etsy’s 20 MB cap');
    seller.push({name:'UPLOAD-TO-ETSY/'+stem.slice(0,49)+'-part-'+(i+1)+'.zip',data:await getBytes(buyer)});
   }
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
    'Every buyer ZIP includes LICENSE.txt, README.txt and ABOUT-SAPIVER-PRINTS.txt',
    'Listing images: four 2400 x 2400 JPGs (artwork, 2x2 repeat, illustrative mock-up, included files/detail)',
    '5000px PNG included: '+(omitted.length?'NO - oversize disclosed':'YES'),
    '5000px JPG, 2500px PNG and seamless tile: included',
    'Seamless repeat and print results: require owner visual review; not guaranteed by export',
    'Etsy publication: NOT automatic; Poster Gen approval required'
   ];
   seller.push({name:'QUALITY-CHECK.txt',data:encode(quality.join('\n')+'\n')});
   const note='One design: '+listing.product.name+'\nPrice: £'+listing.product.price.toFixed(2)+'\nEtsy section: Digital Downloads\nTitle, visual description and '+listing.product.tags.length+' valid Etsy tags are embedded in LISTING-METADATA.json.\nUpload this outer ZIP directly to Poster Gen as one digital pattern product.\nOnly the UPLOAD-TO-ETSY ZIP parts are delivered to buyers, each with licence, About and instructions.\nSource: AI visual description, not live search-volume research.\nReview before approving Etsy deployment.\n';
   seller.push({name:'SELLER-CHECKLIST.txt',data:encode(note+(listing.formatWarnings||[]).join('\n'))});
   const complete=zip(seller);if(complete.size>100000000)throw Error('Seller ZIP exceeds uploader’s 100 MB cap; no quality was reduced');
   try{localStorage.setItem('sapiver-digital-pattern-price',String(listing.product.price.toFixed(2)));}catch{}
   saveBlob(complete,stem+'-commercial-seller-kit.zip');
   status.textContent='Seller ZIP downloaded: '+pieces.length+' Etsy buyer ZIP(s), all licensed and packaging-checked; four 2400px listing previews. '+(omitted.length?'WARNING: 5000px PNG exceeded Etsy’s limit and is not included; the 5000px JPG, 2500px PNG and seamless tile ARE included. This is disclosed in the listing. ':'All four artwork formats included. ')+'Review before Etsy publishing.';
  }catch(error){console.error(error);status.textContent='Export stopped: '+(error.message||'Unknown error')+'. No listing created.';}
  finally{if(big)big.width=big.height=0;if(small)small.width=small.height=0;if(prev)prev.width=prev.height=0;running=false;refresh();}
 }
 button.addEventListener('click',run);refresh();
})();