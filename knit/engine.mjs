// Style-authentic knit surface renderer v3: licensed fabric tiles + stitch-following colourwork.
// All sources are bundled. The Pattern Forge general editor is never imported or modified.
export const TILE_SIZE=1000,EXPORT_SIZE=5000;
export const STITCH_COUNTS=Object.freeze({fine:30,medium:20,chunky:10,superchunky:6});
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const DEFAULTS=Object.freeze({style:'stockinette',gauge:'superchunky',yarn:'#e2d2b7',contrast:'#9b403b',seed:7});
export const mod=(n,d)=>((n%d)+d)%d;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function normalize(raw={}){
 const colour=(x,def)=>/^#[0-9a-f]{6}$/i.test(x)?x:def;
 return {
   style:STYLES.includes(raw.style)?raw.style:DEFAULTS.style,
   gauge:Object.hasOwn(STITCH_COUNTS,raw.gauge)?raw.gauge:DEFAULTS.gauge,
   yarn:colour(raw.yarn,DEFAULTS.yarn),contrast:colour(raw.contrast,DEFAULTS.contrast),
   seed:Number.isInteger(Number(raw.seed))?clamp(Number(raw.seed),1,9999):DEFAULTS.seed
 };
}
export const stitchCount=s=>STITCH_COUNTS[s.gauge]??STITCH_COUNTS.superchunky;
const PHOTO_ASSETS=Object.freeze({
 stockinette:'/knit/textures/grey-chunky-knit.jpg',
 rib:'/knit/textures/rib-knit-authentic.png',
 seed:'/knit/textures/seed-stitch-authentic.png',
 cable:'/knit/textures/cream-cable-knit.jpg',
 fairisle:'/knit/textures/grey-chunky-knit.jpg'
});
const CACHE=Object.create(null);
let loading;
export function loadPhotoTextures(){
 if(!loading){
   loading=Promise.all([...new Set(Object.values(PHOTO_ASSETS))].map(src=>new Promise((resolve,reject)=>{
     const img=new Image();
     img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight)return reject(Error('Empty knit source: '+src));CACHE[src]=img;resolve();}
     img.onerror=()=>reject(Error('Missing knit source: '+src));
     img.src=src;
   })));
 }
 return loading;
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function fairIsleStitch(row,col){
 // Stitch chart is 18×11, with symmetric Nordic diamonds kept off the tile edges.
 const r=mod(row,11),c=mod(col,18);
 return (Math.abs(c-4)+Math.abs(r-5)===3)||
        (Math.abs(c-13)+Math.abs(r-5)===3);
}
export function selectedYarn(s,row,col){
 return s.style==='fairisle'&&fairIsleStitch(row,col)?s.contrast:s.yarn;
}
export function fairIsleLoopMask(u,v){
 // Knit loop = two thick slanted wool legs meeting at the bottom.
 // Shade *only the photographed loop*, not a rectangle painted over fabric.
 const left=.12+.39*v,right=.88-.39*v;
 const dist=Math.min(Math.abs(u-left),Math.abs(u-right));
 const t=clamp((.245-dist)/(.245-.105),0,1);
 return t*t*(3-2*t);
}
function seamFinish(ctx,size,width){
 const pixel=ctx.getImageData(0,0,size,size),a=pixel.data,edge=width;
 // Equalize opposite edges with a smooth falloff, not a hard rectangular border.
 for(let y=0;y<size;y++)for(let k=0;k<edge;k++){
   const t=.5*Math.pow(1-k/edge,2);
   for(let ch=0;ch<3;ch++){
     const i=(y*size+k)*4+ch,j=(y*size+size-k-1)*4+ch;
     const l=a[i],r=a[j];a[i]=Math.round(l*(1-t)+r*t);a[j]=Math.round(r*(1-t)+l*t);
   }
 }
 for(let x=0;x<size;x++)for(let k=0;k<edge;k++){
   const t=.5*Math.pow(1-k/edge,2);
   for(let ch=0;ch<3;ch++){
     const i=(k*size+x)*4+ch,j=((size-k-1)*size+x)*4+ch;
     const top=a[i],bottom=a[j];a[i]=Math.round(top*(1-t)+bottom*t);
     a[j]=Math.round(bottom*(1-t)+top*t);
   }
 }
 ctx.putImageData(pixel,0,0);
}
function sourceCrop(style,gauge){
 // Source V loops are already coarse. Rib and seed materials are finer and need
 // a tighter source crop at the larger gauges to keep the wool visibly chunky.
 if(style==='rib'){
   return ({superchunky:.48,chunky:.65,medium:.85,fine:1})[gauge];
 }
 if(style==='seed'){
   return ({superchunky:.27,chunky:.43,medium:.70,fine:1})[gauge];
 }
 return 1;
}
export function renderKnit(target,raw={}){
 const s=normalize(raw),photo=CACHE[PHOTO_ASSETS[s.style]];
 if(!photo)throw Error('Knitted material has not loaded.');
 target.width=target.height=TILE_SIZE;
 const ctx=target.getContext('2d',{alpha:false,willReadFrequently:true});
 if(!ctx)throw Error('2D canvas unavailable.');
 const count=({superchunky:1,chunky:2,medium:3,fine:4})[s.gauge],unit=TILE_SIZE/count;
 const motif=document.createElement('canvas');motif.width=motif.height=Math.round(unit);
 const mctx=motif.getContext('2d',{alpha:false});
 const fraction=sourceCrop(s.style,s.gauge),side=Math.min(photo.naturalWidth,photo.naturalHeight)*fraction;
 const sx=(photo.naturalWidth-side)/2,sy=(photo.naturalHeight-side)/2;
 mctx.imageSmoothingEnabled=true;mctx.imageSmoothingQuality='high';
 mctx.drawImage(photo,sx,sy,side,side,0,0,motif.width,motif.height);
 const pattern=ctx.createPattern(motif,'repeat');
 if(!pattern)throw Error('Failed to tile knit photo');
 // Do not random-shift Fair Isle: the stitch geometry must remain aligned.
 const offsetX=s.style==='fairisle'?0:mod(s.seed*37,unit);
 const offsetY=s.style==='fairisle'?0:mod(s.seed*53,unit);
 ctx.save();ctx.translate(offsetX,offsetY);ctx.fillStyle=pattern;
 ctx.fillRect(-offsetX,-offsetY,TILE_SIZE,TILE_SIZE);ctx.restore();
 const px=ctx.getImageData(0,0,TILE_SIZE,TILE_SIZE),d=px.data;
 const main=rgb(s.yarn),accent=rgb(s.contrast);
 const nativeLight=({stockinette:.55,rib:.56,seed:.53,cable:.73,fairisle:.55})[s.style];
 for(let y=0;y<TILE_SIZE;y++){
   const phaseY=mod(y-offsetY,TILE_SIZE)/unit;
   const v=phaseY%1;
   const stitchY=mod(Math.floor(v*11),11);
   const stitchV=(v*11)%1;
   for(let x=0;x<TILE_SIZE;x++){
     const i=(y*TILE_SIZE+x)*4;
     const light=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255;
     const shading=clamp(Math.pow(Math.max(.14,light/nativeLight),.89),.35,1.57);
     let alpha=0;
     if(s.style==='fairisle'){
       const phaseX=mod(x-offsetX,TILE_SIZE)/unit;
       const u=phaseX%1,stitchX=mod(Math.floor(u*18),18),stitchU=(u*18)%1;
       if(fairIsleStitch(stitchY,stitchX))alpha=fairIsleLoopMask(stitchU,stitchV);
     }
     for(let ch=0;ch<3;ch++)
       d[i+ch]=Math.round(clamp((main[ch]+(accent[ch]-main[ch])*alpha)*shading,0,255));
     d[i+3]=255;
   }
 }
 ctx.putImageData(px,0,0);
 seamFinish(ctx,TILE_SIZE,sourceCrop(s.style,s.gauge)<1?56:12);
 motif.width=motif.height=0;
 return target;
}
export function renderPreview(tile,canvas,repeat=false){
 const width=720;canvas.width=canvas.height=width;
 const ctx=canvas.getContext('2d',{alpha:false});
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const n=repeat?3:1,cell=width/n;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)ctx.drawImage(tile,x*cell,y*cell,cell,cell);
}

function pngChunk(name,data){
  const bytes=new Uint8Array(12+data.length),v=new DataView(bytes.buffer);
  v.setUint32(0,data.length);for(let i=0;i<4;i++)bytes[4+i]=name.charCodeAt(i);
  bytes.set(data,8);let crc=0xffffffff;
  for(let i=4;i<8+data.length;i++){crc^=bytes[i];for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  v.setUint32(8+data.length,(crc^0xffffffff)>>>0);return bytes;
}
export function add300DpiPngMetadata(input){
  const signature=[137,80,78,71,13,10,26,10],a=new Uint8Array(input);
  if(a.length<45||!signature.every((n,i)=>a[i]===n))throw new Error('Not a valid PNG');
  const parts=[a.slice(0,8)],view=new DataView(a.buffer,a.byteOffset,a.byteLength);
  const phy=new Uint8Array(9),pv=new DataView(phy.buffer);
  pv.setUint32(0,11811);pv.setUint32(4,11811);phy[8]=1;
  let pos=8,hasIHDR=false,hasIEND=false;
  while(pos<a.length){
    if(pos+12>a.length)throw new Error('Invalid PNG chunk');
    const n=view.getUint32(pos),end=pos+12+n;
    if(n>100000000||end>a.length)throw new Error('Invalid PNG length');
    const name=String.fromCharCode(...a.slice(pos+4,pos+8));
    if(name!=='pHYs')parts.push(a.slice(pos,end));
    if(name==='IHDR'){hasIHDR=true;parts.push(pngChunk('pHYs',phy));}
    pos=end;
    if(name==='IEND'){hasIEND=true;break;}
  }
  if(!hasIHDR||!hasIEND||pos!==a.length)throw new Error('Incomplete PNG');
  return new Blob(parts,{type:'image/png'});
}
export async function exportPng(tile){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=EXPORT_SIZE;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Cannot create export canvas');
  ctx.imageSmoothingEnabled=false;
  const pattern=ctx.createPattern(tile,'repeat');
  if(!pattern)throw new Error('Cannot create seamless repeat');
  ctx.fillStyle=pattern;ctx.fillRect(0,0,EXPORT_SIZE,EXPORT_SIZE);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png'));
  const bytes=await blob.arrayBuffer();
  canvas.width=canvas.height=0;
  return add300DpiPngMetadata(bytes);
}
