// Pattern Forge motif-pack reader: no remote calls or third-party services.
// The pack importer never changes a project until the user inserts a motif.
(() => {
  "use strict";
  const decoder=new TextDecoder();
  const MAX_FILES=100,MAX_ZIP=200*1024*1024,MAX_IMAGE=12*1024*1024;
  const MAX_UNCOMPRESSED=300*1024*1024;
  function checkPngHeader(bytes){
    if(bytes.length<33||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n))throw Error("Not a PNG file");
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(decoder.decode(bytes.slice(12,16))!=="IHDR")throw Error("Missing PNG IHDR");
    const w=view.getUint32(16),h=view.getUint32(20),depth=bytes[24],colour=bytes[25];
    if(w<16||h<16||w>8192||h>8192)throw Error("PNG dimensions must be 16–8192 pixels");
    if(depth!==8||colour!==6)throw Error("PNG must be 8-bit RGBA (with real alpha channel)");
    return {w,h};
  }
  async function decode(file){
    if(file.size>MAX_IMAGE)throw Error("PNG is over the 12 MB motif limit");
    const bytes=new Uint8Array(await file.arrayBuffer());
    const {w,h}=checkPngHeader(bytes);
    const url=URL.createObjectURL(file);
    let img;
    try{
      img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("PNG cannot be decoded"));img.src=url;});
      if(img.naturalWidth!==w||img.naturalHeight!==h)throw Error("PNG decoded dimensions disagree with its header");
      const canvas=document.createElement('canvas');
      const width=Math.min(512,w),height=Math.min(512,h);
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error("Canvas image inspection is unavailable");
      ctx.clearRect(0,0,width,height);
      ctx.drawImage(img,0,0,width,height);
      const data=ctx.getImageData(0,0,width,height).data;
      let clear=0,visible=0,dirtyEdge=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const alpha=data[(y*width+x)*4+3];
        if(alpha===0)clear++;
        if(alpha>=16)visible++;
        if((x===0||y===0||x===width-1||y===height-1)&&alpha!==0)dirtyEdge++;
      }
      canvas.width=0;canvas.height=0;
      if(dirtyEdge)throw Error("Artwork touches a canvas edge; transparent padding is required");
      if(clear<width*height*.03)throw Error("Background is not sufficiently transparent");
      if(visible<width*height*.005)throw Error("PNG has no usable visible motif");
      // No upscaling: native source detail is preserved when placed.
      const src=await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("Could not read PNG"));reader.readAsDataURL(file);
      });
      return {src,w,h};
    }finally{URL.revokeObjectURL(url);}
  }
  function filenameToTitle(name){
    return name.replace(/^.*[/\\]/,'').replace(/\.png$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Imported motif';
  }
  function normaliseCollection(name){
    const v=String(name||'').trim().replace(/[<>\\/]/g,' ').replace(/\s+/g,' ');
    return (v||'Imported motifs').slice(0,80);
  }
  function readU16(view,pos){return view.getUint16(pos,true);}
  function readU32(view,pos){return view.getUint32(pos,true);}
  async function fromZip(file){
    if(file.size>MAX_ZIP)throw Error("ZIP exceeds the 200 MB import limit");
    const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
    let eocd=-1;
    for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
      if(readU32(view,p)===0x06054b50){eocd=p;break;}
    }
    if(eocd<0)throw Error("ZIP has no central directory");
    const count=readU16(view,eocd+10),directoryOffset=readU32(view,eocd+16),directorySize=readU32(view,eocd+12);
    if(count>500||directoryOffset+directorySize>bytes.length)throw Error("ZIP directory is invalid or too large");
    let pos=directoryOffset,rawTotal=0;const entries=[];
    for(let i=0;i<count;i++){
      if(pos+46>bytes.length||readU32(view,pos)!==0x02014b50)throw Error("Damaged ZIP directory");
      const flags=readU16(view,pos+8),method=readU16(view,pos+10),packed=readU32(view,pos+20),raw=readU32(view,pos+24);
      const nameLen=readU16(view,pos+28),extra=readU16(view,pos+30),comment=readU16(view,pos+32),local=readU32(view,pos+42);
      if(pos+46+nameLen+extra+comment>bytes.length)throw Error("Damaged ZIP file name");
      const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
      pos+=46+nameLen+extra+comment;
      if(!/\.png$/i.test(name))continue;
      if(name.startsWith('/')||name.split('/').includes('..')||name.includes('\\'))throw Error("Unsafe ZIP path");
      if(flags&1)throw Error("Encrypted ZIP entries are unsupported");
      if(method!==0&&method!==8)throw Error("ZIP compression method is unsupported");
      if(raw>MAX_IMAGE)throw Error(name+" is over the 12 MB limit");
      rawTotal+=raw;
      if(rawTotal>MAX_UNCOMPRESSED)throw Error("ZIP expands beyond the safe import limit");
      entries.push({name,method,packed,raw,local});
      if(entries.length>MAX_FILES)throw Error("A collection can contain at most 100 PNG motifs");
    }
    if(!entries.length)throw Error("ZIP contains no PNG motifs");
    const files=[];
    for(const ent of entries){
      if(ent.local+30>bytes.length||readU32(view,ent.local)!==0x04034b50)throw Error("Damaged ZIP local entry");
      const begin=ent.local+30+readU16(view,ent.local+26)+readU16(view,ent.local+28);
      if(begin+ent.packed>bytes.length)throw Error("ZIP entry is truncated");
      const content=bytes.slice(begin,begin+ent.packed);
      let data=content;
      if(ent.method===8){
        if(typeof DecompressionStream==='undefined')throw Error("This browser cannot open compressed ZIP folders. Select PNG files instead.");
        const stream=new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        data=new Uint8Array(await new Response(stream).arrayBuffer());
      }
      if(data.length!==ent.raw)throw Error("ZIP entry has an invalid uncompressed size");
      const name=ent.name.split('/').at(-1);
      const motifFile=new File([data],name,{type:'image/png'});
      // Retain directory identity; File.name alone loses ZIP subfolders.
      Object.defineProperty(motifFile,'patternForgePath',{value:ent.name});
      files.push(motifFile);
    }
    return files;
  }
  function sourcePath(file){
    const path=String(file.patternForgePath||file.webkitRelativePath||file.name||'').replace(/\\/g,'/');
    const parts=path.split('/');
    if(!path||path.startsWith('/')||parts.some(p=>!p||p==='.'||p==='..')||parts.length>12)throw Error("Unsafe or overly deep motif folder path");
    return path;
  }
  function detectRoot(files){
    const paths=Array.from(files||[]).map(sourcePath);
    const first=paths[0]?.split('/')||[];
    return first.length>1&&paths.every(p=>p.split('/').length>1&&p.split('/')[0]===first[0])?first[0]:'';
  }
  function displayFolder(path){return path.replace(/[_-]+/g,' ').replace(/\\s+/g,' ').trim();}
  async function prepare(files,onProgress){
    const batch=Array.from(files||[]);
    if(batch.length<1||batch.length>MAX_FILES)throw Error("Select 1–100 PNG files per collection");
    const rootFolder=detectRoot(batch),result=[],failures=[],used=new Set();
    for(let i=0;i<batch.length;i++){
      const file=batch[i];onProgress?.(i+1,batch.length);
      let path;
      try{path=sourcePath(file);}catch(e){failures.push(file.name+": "+e.message);continue;}
      if(!/\\.png$/i.test(file.name)){failures.push(path+": only PNG motifs allowed");continue;}
      const identity=path.toLowerCase();
      if(used.has(identity)){failures.push(path+": duplicate relative path");continue;}
      used.add(identity);
      const parts=path.split('/'),folders=parts.slice(0,-1);
      if(rootFolder&&folders[0]===rootFolder)folders.shift();
      const categoryPath=folders.map(displayFolder).filter(Boolean).join(' / ');
      try{result.push({name:filenameToTitle(file.name),filename:file.name,relativePath:path,categoryPath,...await decode(file)});}
      catch(e){failures.push(path+": "+(e?.message||"invalid PNG"));}
    }
    return {result,failures,rootFolder};
  }
  window.PatternForgeMotifPacks=Object.freeze({fromZip,prepare,normaliseCollection,detectRoot});
})();
