'use strict';
// Local-only parser for the explicit background-pair ZIP produced by Pattern Forge.
// Rejects generic archives and unsupported ZIP modes rather than guessing which artwork to sell.
window.SapiverBackgroundPair=Object.freeze({
 async parse(input){
  if(!input||input.size>125_000_000)throw Error('Background pair ZIP exceeds the 125 MB mobile import limit.');
  const bytes=new Uint8Array(await input.arrayBuffer()),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const dec=new TextDecoder('utf-8',{fatal:true}),entries=new Map();
  const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc32=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  let pos=0,expanded=0;
  while(pos+4<=bytes.length){
   const magic=view.getUint32(pos,true);
   if(magic===0x02014b50||magic===0x06054b50)break;
   if(magic!==0x04034b50||pos+30>bytes.length)throw Error('Background ZIP has an invalid local file entry.');
   const flags=view.getUint16(pos+6,true),method=view.getUint16(pos+8,true),sum=view.getUint32(pos+14,true),
    packedSize=view.getUint32(pos+18,true),size=view.getUint32(pos+22,true),
    nameLength=view.getUint16(pos+26,true),extraLength=view.getUint16(pos+28,true);
   if(flags&0x0009||![0,8].includes(method))throw Error('Background ZIP uses an unsupported compression mode.');
   if(entries.size>=3)throw Error('Background ZIP has unexpected extra files.');
   if(size>70_000_000||packedSize>70_000_000||(expanded+=size)>125_000_000)throw Error('Background ZIP expands beyond mobile safety limits.');
   const headerEnd=pos+30+nameLength+extraLength,end=headerEnd+packedSize;
   if(nameLength<1||headerEnd>bytes.length||end>bytes.length)throw Error('Background ZIP is truncated.');
   const name=dec.decode(bytes.subarray(pos+30,pos+30+nameLength));
   if(!/^[A-Za-z0-9_.-]{1,150}$/.test(name)||entries.has(name))throw Error('Background ZIP contains an unsafe or duplicate filename.');
   const packed=bytes.subarray(headerEnd,end);
   let data;
   if(method===0){if(packedSize!==size)throw Error('Invalid stored file size.');data=new Uint8Array(packed);}
   else{
    if(typeof DecompressionStream!=='function')throw Error('This browser cannot read a compressed background-pair manifest.');
    const inflate=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    data=new Uint8Array(await new Response(inflate).arrayBuffer());
   }
   if(data.length!==size||crc32(data)!==sum)throw Error('Background ZIP failed an integrity check.');
   entries.set(name,data);pos=end;
  }
  if(entries.size!==3||!entries.has('SAPIVER-BACKGROUND-PAIR.json'))throw Error('Choose a Pattern Forge background-pair ZIP containing exactly two PNGs and its manifest.');
  let manifest;
  try{manifest=JSON.parse(dec.decode(entries.get('SAPIVER-BACKGROUND-PAIR.json')));}
  catch{throw Error('Background-pair manifest is invalid.');}
  if(manifest?.format!=='sapiver-background-pair'||manifest.version!==1||
     !/^[#][0-9a-fA-F]{6}$/.test(manifest.backgroundColor||'')||
     !Number.isInteger(manifest.width)||!Number.isInteger(manifest.height)||
     manifest.width<96||manifest.height<96||manifest.width*manifest.height>42_000_000||
     manifest.dpi!==300)throw Error('Background-pair manifest has unsupported dimensions, colour or resolution.');
  const names=[manifest.transparent,manifest.solid];
  if(names[0]===names[1]||names.some(n=>typeof n!=='string'||!n.endsWith('.png')||!entries.has(n))||
     [...entries.keys()].some(n=>n!=='SAPIVER-BACKGROUND-PAIR.json'&&!names.includes(n)))throw Error('Background ZIP must contain the exact two PNGs listed in its manifest.');
  function pngInfo(name){
   const data=entries.get(name);
   if(data.length<33||data.slice(0,8).some((v,i)=>v!==[137,80,78,71,13,10,26,10][i])||
     String.fromCharCode(...data.slice(12,16))!=='IHDR')throw Error(name+' is not a valid PNG.');
   const header=new DataView(data.buffer,data.byteOffset,data.byteLength);
   const w=header.getUint32(16),h=header.getUint32(20);
   if(w!==manifest.width||h!==manifest.height)throw Error('Transparent and coloured PNG dimensions do not match the manifest.');
   return {name,bytes:data,width:w,height:h};
  }
  return {transparent:pngInfo(manifest.transparent),solid:pngInfo(manifest.solid),
    backgroundColor:manifest.backgroundColor,width:manifest.width,height:manifest.height,dpi:manifest.dpi};
 }
});