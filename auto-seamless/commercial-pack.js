'use strict';
/* Commercial export for Auto Seamless. Offline, no uploads or added dependencies.
 * The source 5000px artwork is preserved when selected. Buyer archives are
 * independently extractable and capped below Etsy's 20,000,000-byte limit.
 */
(function(){
 const MAX_FILE=20000000, MAX_KIT=100000000, MAX_PARTS=5;
 const encoder=new TextEncoder();
 const license=[
  'SAPIVER PRINTS — COMMERCIAL USE LICENCE',
  'Version 1.0 — 10 November 2026',
  '',
  'This licence accompanies the digital design named in your purchase. "Design" means the artwork files supplied in that purchase. "Seller" means Sapiver Prints, a Sapiver Press project.',
  '',
  'YOUR PERMISSION',
  'Subject to the restrictions below and successful purchase, the Seller grants you a non-exclusive, worldwide, perpetual, royalty-free licence to use, reproduce, resize, recolour, adapt and incorporate the Design into finished personal or commercial products. There is no set limit on the number of finished products you may make or sell.',
  '',
  'PERMITTED EXAMPLES',
  'You may use the Design on fabric, clothing, accessories, stationery, packaging, homeware, print-on-demand merchandise, websites, advertising and other finished products. You may supply a production partner with the files solely to manufacture your own authorised products. No additional royalties or attribution are required.',
  '',
  'RESTRICTIONS',
  'You must not sell, share, upload, gift, sublicense or redistribute the Design files themselves, whether unchanged or modified, as digital assets, standalone patterns, stock artwork, downloadable files or competing design resources. Do not include an extractable copy of the Design in a digital template, design library or customer download. You may not claim exclusive ownership of the underlying Design, register it as a trademark, or offer it as an exclusive design. You may not present an AI-assisted design as guaranteed human-hand-embroidered artwork.',
  '',
  'OWNERSHIP AND LIMITS',
  'The purchase does not transfer copyright or ownership. This licence grants only rights the Seller lawfully holds and can grant. The Seller does not promise exclusivity, protectability, non-infringement or compatibility with every platform or manufacturer. Third-party software, fonts, logos and trademarks are not included unless expressly stated.',
  '',
  'NO EMBROIDERY MACHINE FILES UNLESS LISTED',
  'A decorative embroidery-style image is not a stitch-ready embroidery file. PES, DST, JEF or other machine formats are included only if expressly listed in the product files.',
  '',
  'REFUNDS AND SUPPORT',
  'Check the Etsy listing and your statutory consumer rights for refunds, faulty files and support. Nothing in this licence removes rights you cannot lawfully waive.',
  '',
  'By downloading or using the Design you agree to these terms. If these terms are unacceptable, do not use the Design commercially; contact the Seller through your Etsy order for assistance.',
  '',
  'Sapiver Prints | A Sapiver Press project'
 ].join('\n');
 const about=[
  'ABOUT SAPIVER PRINTS',
  '',
  'Sapiver Prints is an independent creative project from Sapiver Press, based in the United Kingdom.',
  '',
  'We make practical, design-led artwork and digital resources for people who want to create something of their own. Our surface patterns are prepared for useful applications such as fabric, accessories, stationery, packaging and print-on-demand products.',
  '',
  'We focus on one design at a time. Each listing is intended to explain clearly what files are included, how they can be used and which commercial permissions come with them.',
  '',
  'Our workflow combines digital design tools, experimentation and individual review. Some artwork is created with the aid of AI; we aim to describe this accurately rather than present digital effects as physical hand embroidery.',
  '',
  'A seamless-looking image still needs proper repeat checks, and an embroidery-style PNG is not an embroidery machine file. We distinguish those products so buyers can choose with confidence.',
  '',
  'Thank you for supporting an independent UK creative project.',
  '',
  'Sapiver Prints',
  'A Sapiver Press project'
 ].join('\n');
 const readme=[
  'SAPIVER PRINTS — READ ME',
  '',
  'Thank you for purchasing a Sapiver Prints commercial-use design.',
  '',
  '1. What you bought',
  'You are receiving ONE design in multiple file formats. File names identify resolution and format.',
  '',
  '2. Using the files',
  'PNG is lossless. JPG is convenient for services preferring photographic RGB files. A 2500px image is a smaller derivative for lighter projects. SVG is only included where genuine vector artwork exists.',
  '',
  '3. Seamless repeat',
  'Place identical repeat tiles edge to edge, without gaps or extra spacing. Check a 3 x 3 preview and obtain a small production proof before printing fabric or merchandise.',
  '',
  '4. Colour and printing',
  'Print results depend on fabric, inks and manufacturing processes. Ask your print provider which colour and file settings to use.',
  '',
  '5. Commercial use',
  'Read LICENSE.txt in this download. Keep it with your purchase records.',
  '',
  '6. Embroidery',
  'An embroidery-style image is not machine embroidery data. PES/DST/JEF files are supplied only where expressly named.',
  '',
  '7. Help',
  'For file problems, contact Sapiver Prints through your Etsy order with the design name and issue.',
  '',
  'Some artwork is created with the aid of AI.',
  'Sapiver Prints | A Sapiver Press project'
 ].join('\n');
 const wrap=document.createElement('section');
 wrap.setAttribute('aria-label','Commercial digital download pack');
 wrap.style.cssText='margin-top:18px;padding-top:15px;border-top:1px solid #425569';
 wrap.innerHTML='<h2>Commercial pattern pack</h2>'+
  '<p>One approved design, multiple formats, commercial licence, About Us and instructions. Produces the seller-kit ZIP recognised by the Sapiver Prints uploader. No vector file is invented from a raster image.</p>'+
  '<label style="display:block;margin:10px 0"><input id="commercialOriginal" type="checkbox" checked> Preserve uploaded original when it is already a 5000 × 5000 seamless design</label>'+
  '<p class="hint">Untick to package the newly generated repeating design instead. This will use the repeat density above.</p>'+
  '<div class="canvaswrap" style="max-width:260px;margin:10px auto"><canvas id="commercialPreview" width="450" height="450" aria-label="Selected design repeated three by three"></canvas></div>'+
  '<label style="display:block;margin:10px 0"><input id="commercialApproved" type="checkbox"> I have checked this 3 × 3 repeat and approve this design for sale</label>'+
  '<button class="primary" id="downloadCommercial" style="width:100%" type="button">Build Etsy commercial ZIP</button>'+
  '<p id="commercialStatus" class="info" role="status" aria-live="polite">Check the repeat before downloading. No Etsy listing is created here.</p>';
 const panel=document.getElementById('download5000')?.closest('.panel');
 if(!panel)return;
 panel.appendChild(wrap);
 const ce=id=>document.getElementById(id);
 const notify=(message,error=false)=>{ce('commercialStatus').textContent=message;ce('commercialStatus').style.color=error?'#ffcad0':'#baf3e4';};
 const validOriginal=()=>state.source&&sourceCanvas.width===5000&&sourceCanvas.height===5000;
 const selectedCanvas=()=>ce('commercialOriginal').checked&&validOriginal()?sourceCanvas:tileCanvas;
 function preview(){
  const cv=ce('commercialPreview'),c=cv.getContext('2d');
  c.clearRect(0,0,cv.width,cv.height);
  if(!state.tile){c.fillStyle='#acbdc9';c.font='20px system-ui';c.textAlign='center';c.fillText('Upload a pattern first',225,220);return;}
  const source=selectedCanvas();
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)c.drawImage(source,x*150,y*150,150,150);
 }
 ce('commercialOriginal').addEventListener('change',()=>{ce('commercialApproved').checked=false;preview();});
 const originalLoad=loadFile;
 loadFile=async function(file){ce('commercialApproved').checked=false;notify('Checking the selected artwork…');try{return await originalLoad(file);}finally{preview();}};
 ce('density').addEventListener('input',()=>{ce('commercialApproved').checked=false;preview();});
 ce('blend').addEventListener('input',()=>{ce('commercialApproved').checked=false;setTimeout(preview,0);});
 ce('coverage').addEventListener('input',()=>{ce('commercialApproved').checked=false;setTimeout(preview,0);});
 preview();
 function bytesFromText(s){return encoder.encode(s.replace(/\r\n/g,'\n'));}
 const table=(()=>{const a=new Uint32Array(256);for(let i=0;i<256;i++){let v=i;for(let n=0;n<8;n++)v=(v&1)?0xedb88320^(v>>>1):v>>>1;a[i]=v>>>0;}return a;})();
 function crc(data){let v=0xffffffff;for(let i=0;i<data.length;i++)v=table[(v^data[i])&255]^(v>>>8);return (v^0xffffffff)>>>0;}
 function dataView(n){return new DataView(new ArrayBuffer(n));}
 function u8(v){return new Uint8Array(v.buffer);}
 function zipSize(files){return 22+files.reduce((sum,f)=>sum+f.data.length+76+encoder.encode(f.name).length*2,0);}
 function zip(files){
  if(!files.length||files.length>100||zipSize(files)>MAX_KIT)throw Error('ZIP is too large or has too many entries');
  const content=[],directory=[];let offset=0;
  for(const f of files){
   const name=encoder.encode(f.name);if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(f.name)||f.name.includes('..')||name.length>180)throw Error('Unsafe file name');
   const size=f.data.length,checksum=crc(f.data);
   const local=dataView(30);local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,0x0800,true);
   local.setUint32(14,checksum,true);local.setUint32(18,size,true);local.setUint32(22,size,true);local.setUint16(26,name.length,true);
   const entry=dataView(46);entry.setUint32(0,0x02014b50,true);entry.setUint16(4,20,true);entry.setUint16(6,20,true);
   entry.setUint16(8,0x0800,true);entry.setUint32(16,checksum,true);entry.setUint32(20,size,true);entry.setUint32(24,size,true);
   entry.setUint16(28,name.length,true);entry.setUint32(42,offset,true);
   content.push(u8(local),name,f.data);directory.push(u8(entry),name);
   offset+=30+name.length+size;
  }
  const centralSize=directory.reduce((n,x)=>n+x.byteLength,0),end=dataView(22);
  end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);
  end.setUint32(12,centralSize,true);end.setUint32(16,offset,true);
  return new Blob([...content,...directory,u8(end)],{type:'application/zip'});
 }
 async function pngBlob(canvas){const b=await asBlob(canvas);return taggedDPI(new Uint8Array(await b.arrayBuffer()));}
 function canvasBlob(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed')),type,quality));}
 async function entry(name,blob){return {name,data:new Uint8Array(await blob.arrayBuffer())};}
 function smallCanvas(src,size){const cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(src,0,0,size,size);return cv;}
 function repeatMaster(){
  const cv=document.createElement('canvas');cv.width=cv.height=5000;
  const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const nx=Number(ce('density').value),ny=Math.max(1,Math.min(40,Math.round(nx*state.tile.w/state.tile.h)));
  for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
   const x0=Math.round(col*5000/nx),x1=Math.round((col+1)*5000/nx);
   const y0=Math.round(row*5000/ny),y1=Math.round((row+1)*5000/ny);
   ctx.drawImage(tileCanvas,x0,y0,x1-x0,y1-y0);
  }
  return cv;
 }
 function previewJpg(src,mode){
  const cv=document.createElement('canvas');cv.width=cv.height=900;
  const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,900,900);
  if(mode==='repeat'){for(let y=0;y<3;y++)for(let x=0;x<3;x++)ctx.drawImage(src,x*300,y*300,300,300);}
  else if(mode==='detail')ctx.drawImage(src,src.width*.3,src.height*.3,src.width*.4,src.height*.4,0,0,900,900);
  else ctx.drawImage(src,0,0,900,900);
  return canvasBlob(cv,'image/jpeg',.87);
 }
 function buildBuyerParts(files){
  const groups=[];let current=[];
  for(const f of files){
   if(zipSize([f])>MAX_FILE)throw Error(f.name+' alone exceeds Etsy’s 20 MB per-file limit. Keep the original and optimise the file losslessly before listing; no reduction has been applied.');
   if(current.length&&zipSize([...current,f])>MAX_FILE){groups.push(current);current=[];}
   current.push(f);
  }
  if(current.length)groups.push(current);
  const documents=[
   {name:'LICENSE.txt',data:bytesFromText(license)},
   {name:'README.txt',data:bytesFromText(readme)},
   {name:'ABOUT-SAPIVER-PRINTS.txt',data:bytesFromText(about)}
  ];
  const eligible=groups.find(g=>zipSize([...g,...documents])<=MAX_FILE);
  if(!eligible)throw Error('No buyer ZIP has enough room for its licence and instructions. One or more source files need safe lossless optimisation.');
  eligible.push(...documents);
  if(groups.length>MAX_PARTS)throw Error('More than five buyer ZIPs are required. Reduce formats, not resolution.');
  return groups.map((group,i)=>({name:'UPLOAD-TO-ETSY/'+String(i+1).padStart(2,'0')+'-commercial-pattern.zip',group}));
 }
 let running=false;
 ce('downloadCommercial').addEventListener('click',async()=>{
  if(running)return;
  if(!state.tile||state.busy){notify('Upload and generate a repeat before packaging.',true);return;}
  if(!ce('commercialApproved').checked){notify('Inspect the 3 × 3 repeat and tick the approval box first.',true);return;}
  running=true;ce('downloadCommercial').disabled=true;
  try{
   notify('Preparing full-resolution files. Large files may take longer on a phone…');
   await nextFrame();
   const main=ce('commercialOriginal').checked&&validOriginal()?sourceCanvas:repeatMaster();
   if(main.width!==5000||main.height!==5000)throw Error('The primary image is not 5000 × 5000');
   const clean=(ce('metaName')?.value||state.fileName||'seamless-pattern').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'pattern';
   const artwork=[
    await entry(clean+'-5000px-300dpi.png',await pngBlob(main)),
    await entry(clean+'-5000px.jpg',await canvasBlob(main,'image/jpeg',.95)),
    await entry(clean+'-2500px-300dpi.png',await pngBlob(smallCanvas(main,2500)))
   ];
   if(main!==sourceCanvas)artwork.push(await entry(clean+'-repeat-tile-300dpi.png',await pngBlob(tileCanvas)));
   notify('Checking Etsy file limits without reducing quality…');
   const packs=buildBuyerParts(artwork);
   const outer=[];
   for(const part of packs){const blob=zip(part.group);if(blob.size>MAX_FILE)throw Error('A customer ZIP exceeds Etsy’s exact file limit');outer.push(await entry(part.name,blob));}
   for(const [i,mode] of ['full','repeat','detail'].entries()){
    outer.push(await entry('LISTING-IMAGES/'+String(i+1).padStart(2,'0')+'-'+mode+'.jpg',await previewJpg(main,mode)));
   }
   const listing=[
    'SAPIVER PRINTS — SELLER CHECKLIST','One design. Digital download only. No PrintShrimp.',
    'Design: '+(ce('metaName')?.value||state.fileName||'Untitled'),
    'Image sizes: 5000 x 5000 and 2500 x 2500 pixels. PNG has 300 DPI metadata.',
    'Formats: PNG and JPG; no fake vectors or embroidery machine stitch files.',
    'Buyer files: '+packs.length+' independent ZIP(s), maximum 20 MB each.',
    'Shop section: Digital Downloads (create or verify in Etsy before activation).',
    'Etsy category: Clip Art & Image Files; verify actual taxonomy before listing.',
    'Set price, review 13 buyer-intent tags, and inspect listing photos.',
    'Confirm repeat quality on the uploader. The checkbox here is NOT independent quality certification.',
    'Artwork may have been created with the aid of AI; disclose it accurately.',
    'Review licence wording for legal suitability before the first sale.',
    'This seller checklist is not delivered to the buyer.'
   ].join('\n');
   outer.push({name:'SELLER-CHECKLIST.txt',data:bytesFromText(listing)});
   const output=zip(outer);if(output.size>MAX_KIT)throw Error('Seller kit exceeds the uploader’s 100 MB upload limit');
   saveBlob(output,clean+'-sapiver-commercial-seller-kit.zip');
   notify('Commercial seller kit downloaded: '+packs.length+' verified-size buyer ZIP(s), PNG/JPG, licence, About Us and listing previews. Review on the uploader before Etsy publication.');
  }catch(err){console.error(err);notify(err?.message||'Could not build commercial kit.',true);}
  finally{running=false;ce('downloadCommercial').disabled=false;}
 });
})();
