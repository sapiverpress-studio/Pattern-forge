'use strict';
// Auto Seamless only: create a lossless Etsy seller-kit envelope for one design.
(function () {
 const byId=id=>document.getElementById(id);
 const button=byId('downloadCommercial'),check=byId('commercialReviewConfirmed'),status=byId('commercialExportStatus');
 if(!button||!check||!status)return;
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
   const name=entry.name,data=binary(entry.data);
   if(!name||name.length>180||/[\\\x00-\x1f<>:]/.test(name)||name.startsWith('/')||name.split('/').some(x=>!x||x==='..'))throw Error('Invalid ZIP filename');
   const path=encode(name),sum=crc(data);
   if(data.byteLength>50000000)throw Error('Individual file exceeds safety limit');
   const local=new Uint8Array(30+path.length),a=new DataView(local.buffer);
   w32(a,0,0x04034b50);w16(a,4,20);w16(a,6,2048);w16(a,10,time);w16(a,12,date);
   w32(a,14,sum);w32(a,18,data.length);w32(a,22,data.length);w16(a,26,path.length);local.set(path,30);
   const dir=new Uint8Array(46+path.length),b=new DataView(dir.buffer);
   w32(b,0,0x02014b50);w16(b,4,20);w16(b,6,20);w16(b,8,2048);w16(b,12,time);w16(b,14,date);
   w32(b,16,sum);w32(b,20,data.length);w32(b,24,data.length);w16(b,28,path.length);w32(b,42,offset);dir.set(path,46);
   files.push(local,data);central.push(dir);offset+=local.length+data.length;size+=dir.length;
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
 function preview(tiled){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1100;
  const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1100,1100);
  if(tiled){for(let y=0;y<2;y++)for(let x=0;x<2;x++)c.drawImage(tileCanvas,x*550,y*550,550,550);}
  else{const r=render(1100);c.drawImage(r,0,0);r.width=r.height=0;}
  return canvas;
 }
 async function documentText(name){
  const r=await fetch('/auto-seamless/commercial/'+encodeURIComponent(name),{cache:'no-store'});
  if(!r.ok)throw Error('Missing customer document '+name);
  const t=await r.text();if(!t.trim()||t.length>5000)throw Error('Invalid customer document '+name);
  return {name,data:encode(t)};
 }
 function packedSize(files){
  // ZIP is intentionally stored (lossless). Account for exact local and central headers.
  return 22+files.reduce((sum,f)=>sum+f.data.length+76+2*encode(f.name).length,0);
 }
 function pack(artwork,documents){
  const names=['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'];
  if(documents.length!==3||names.some(name=>!documents.some(d=>d.name===name&&d.data.length>0))||!artwork.length)
   throw Error('All three buyer documents and at least one artwork file are required');
  const documentBytes=packedSize(documents),groups=[];
  if(documentBytes>=MAX)throw Error('Buyer documents exceed the Etsy ZIP limit');
  for(const asset of [...artwork].sort((a,b)=>b.data.length-a.data.length)){
   const bytes=asset.data.length+76+2*encode(asset.name).length;
   if(bytes+documentBytes>MAX)throw Error(asset.name+' plus the required licence, About and instructions exceeds Etsy’s 20 MB limit. No image quality was reduced.');
   let group=groups.find(g=>g.bytes+bytes<=MAX);
   if(!group){group={bytes:documentBytes,artwork:[]};groups.push(group);}
   group.artwork.push(asset);group.bytes+=bytes;
  }
  if(groups.length>5)throw Error('Design requires more than five Etsy ZIP attachments after including the licence in each one.');
  // EACH independently downloadable buyer ZIP includes the same three actual documents.
  return groups.map(g=>[...g.artwork,...documents]);
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
   const pieces=pack(files,documents),seller=[];
   for(let i=0;i<pieces.length;i++){
    const buyer=zip(pieces[i]);if(buyer.size>MAX)throw Error('Buyer ZIP exceeds Etsy’s 20 MB cap');
    seller.push({name:'UPLOAD-TO-ETSY/'+stem+'-part-'+(i+1)+'.zip',data:await getBytes(buyer)});
   }
   prev=preview(false);seller.push({name:'LISTING-IMAGES/01-pattern.jpg',data:await getBytes(await toBlob(prev,'image/jpeg',0.94))});
   prev.width=prev.height=0;prev=preview(true);seller.push({name:'LISTING-IMAGES/02-repeat.jpg',data:await getBytes(await toBlob(prev,'image/jpeg',0.94))});
   const title=byId('metaName')?.value?.trim()||stem.replace(/-/g,' '),tags=(byId('metaTags')?.value||'').split(',').map(x=>x.trim()).filter(x=>x.length<=20);
   const note='Seller checklist — one design: '+title+'\nEtsy shop section: Digital Downloads\nDigital seamless pattern, not a physical product.\nCheck listing title, max 13 Etsy tags under 20 characters, pricing, AI disclosure, the 3×3 repeat, and all customer files before approval.\nSuggested terms (not live keyword research): '+tags.join(', ')+'\nNo SVG vector or embroidery machine files are implied.\n';
   seller.push({name:'SELLER-CHECKLIST.txt',data:encode(note)});
   const complete=zip(seller);if(complete.size>100000000)throw Error('Seller ZIP exceeds uploader’s 100 MB cap; no quality was reduced');
   saveBlob(complete,stem+'-commercial-seller-kit.zip');
   status.textContent='Commercial seller kit downloaded. '+pieces.length+' customer ZIP(s), EACH with licence, About and instructions, plus 2 listing previews. Review before publishing.';
  }catch(error){console.error(error);status.textContent='Export stopped: '+(error.message||'Unknown error')+'. No listing created.';}
  finally{if(big)big.width=big.height=0;if(small)small.width=small.height=0;if(prev)prev.width=prev.height=0;running=false;refresh();}
 }
 button.addEventListener('click',run);refresh();
})();