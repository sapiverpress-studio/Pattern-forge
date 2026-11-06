// Photographic wool surface renderer. The base photos are bundled locally under CC0.
// No images are fetched from third parties at runtime; all exports are browser-local.
export const TILE_SIZE=1000,EXPORT_SIZE=5000;
export const STITCH_COUNTS=Object.freeze({fine:30,medium:20,chunky:10,superchunky:6});
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const DEFAULTS=Object.freeze({style:'stockinette',gauge:'superchunky',yarn:'#e2d2b7',contrast:'#9b403b',seed:7});
export const mod=(n,d)=>((n%d)+d)%d;
export function normalize(raw={}){
  const colour=(x,fallback)=>/^#[0-9a-f]{6}$/i.test(x)?x:fallback;
  return {style:STYLES.includes(raw.style)?raw.style:DEFAULTS.style,
    gauge:Object.hasOwn(STITCH_COUNTS,raw.gauge)?raw.gauge:DEFAULTS.gauge,
    yarn:colour(raw.yarn,DEFAULTS.yarn),contrast:colour(raw.contrast,DEFAULTS.contrast),
    seed:Number.isInteger(Number(raw.seed))?Math.max(1,Math.min(9999,Number(raw.seed))):DEFAULTS.seed};
}
export const stitchCount=s=>STITCH_COUNTS[s.gauge]??STITCH_COUNTS.superchunky;
const PHOTO_ASSETS=Object.freeze({
  stockinette:'/knit/textures/grey-chunky-knit.jpg',
  rib:'/knit/textures/grey-chunky-knit.jpg',
  seed:'/knit/textures/rust-orange-knit.jpg',
  cable:'/knit/textures/cream-cable-knit.jpg',
  fairisle:'/knit/textures/grey-chunky-knit.jpg'
});
const CACHE={};
let loading=null;
export function loadPhotoTextures(){
  if(!loading){
    const paths=[...new Set(Object.values(PHOTO_ASSETS))];
    loading=Promise.all(paths.map(src=>new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight){reject(Error('Invalid image: '+src));return;}CACHE[src]=img;resolve();}
      img.onerror=()=>reject(Error('Could not load bundled wool texture: '+src));
      img.src=src;
    })));
  }
  return loading;
}
function fairIsleStitch(row,col){
  const r=mod(row,16),c=mod(col,16),dy=Math.abs(r-7.5),dx=Math.abs(c-7.5);
  // 16 x 16 individual-stitch Nordic snowflake repeat, not large rectangular patches.
  const axial=((dx===.5&&dy<=6.5)||(dy===.5&&dx<=6.5));
  const arms=(dx===dy&&dx>=2.5&&dx<=5.5);
  const hooks=((dx===2.5&&dy===5.5)||(dy===2.5&&dx===5.5));
  const border=(r===0||r===15)&&(c%4===1);
  return axial||arms||hooks||border;
}
export function selectedYarn(s,row,col){
  return s.style==='fairisle'&&fairIsleStitch(row,col)?s.contrast:s.yarn;
}
function channel(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function finishSeams(ctx,N){
  const img=ctx.getImageData(0,0,N,N),data=img.data,edge=12;
  for(let y=0;y<N;y++)for(let k=0;k<edge;k++)for(let ch=0;ch<3;ch++){
    const f=.5*Math.pow(1-k/edge,2),i=(y*N+k)*4+ch,j=(y*N+N-1-k)*4+ch;
    const a=data[i],b=data[j];data[i]=Math.round(a*(1-f)+b*f);data[j]=Math.round(b*(1-f)+a*f);
  }
  for(let x=0;x<N;x++)for(let k=0;k<edge;k++)for(let ch=0;ch<3;ch++){
    const f=.5*Math.pow(1-k/edge,2),i=(k*N+x)*4+ch,j=((N-1-k)*N+x)*4+ch;
    const a=data[i],b=data[j];data[i]=Math.round(a*(1-f)+b*f);data[j]=Math.round(b*(1-f)+a*f);
  }
  ctx.putImageData(img,0,0);
}
export function renderKnit(target,raw={}){
  const s=normalize(raw),photo=CACHE[PHOTO_ASSETS[s.style]];
  if(!photo)throw Error('Real knitted-wool textures are still loading.');
  target.width=target.height=TILE_SIZE;
  const ctx=target.getContext('2d',{alpha:false,willReadFrequently:true});
  if(!ctx)throw Error('Canvas 2D unavailable');
  const repeatCount=({fine:5,medium:4,chunky:2,superchunky:1})[s.gauge];
  const unit=TILE_SIZE/repeatCount;
  const motif=document.createElement('canvas');
  motif.width=motif.height=unit;
  const mctx=motif.getContext('2d',{alpha:false});
  mctx.imageSmoothingEnabled=true;mctx.imageSmoothingQuality='high';
  mctx.drawImage(photo,0,0,unit,unit);
  const pat=ctx.createPattern(motif,'repeat');
  if(!pat)throw Error('Cannot make photographic knit pattern');
  const offsetX=mod(s.seed*37,unit),offsetY=mod(s.seed*53,unit);
  ctx.save();ctx.translate(offsetX,offsetY);ctx.fillStyle=pat;
  ctx.fillRect(-offsetX,-offsetY,TILE_SIZE,TILE_SIZE);ctx.restore();
  // Retain true photographic surface structure, tinting colour without erasing yarn fibres.
  const pixels=ctx.getImageData(0,0,TILE_SIZE,TILE_SIZE),d=pixels.data;
  const main=channel(s.yarn),contrast=channel(s.contrast);
  const nativeLight=({stockinette:.55,rib:.55,seed:.40,cable:.73,fairisle:.55})[s.style];
  // Assign a yarn colour to each knitted stitch. Slight row-wise slant follows the V loops.
  for(let y=0;y<TILE_SIZE;y++){
    const rowPos=mod(y-offsetY,TILE_SIZE)/unit*16;
    const row=mod(Math.floor(rowPos),16);
    const tilt=.33*Math.sin(2*Math.PI*(rowPos-Math.floor(rowPos)));
    for(let x=0;x<TILE_SIZE;x++){
      const i=(y*TILE_SIZE+x)*4;
      const luminosity=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255;
      let factor=Math.pow(Math.max(.16,luminosity/nativeLight),.92);
      factor=Math.max(.40,Math.min(1.56,factor));
      if(s.style==='rib'){
        const localX=mod(x-offsetX,unit)/unit;
        factor*=.87+.13*Math.cos(localX*12*Math.PI)**2;
      }
      const col=mod(Math.floor(mod(x-offsetX,TILE_SIZE)/unit*16+tilt),16);
      const base=s.style==='fairisle'&&fairIsleStitch(row,col)?contrast:main;
      d[i]=Math.min(255,Math.round(base[0]*factor));
      d[i+1]=Math.min(255,Math.round(base[1]*factor));
      d[i+2]=Math.min(255,Math.round(base[2]*factor));
      d[i+3]=255;
    }
  }
  ctx.putImageData(pixels,0,0);
  finishSeams(ctx,TILE_SIZE);
  motif.width=motif.height=0;
  return target;
}
export function renderPreview(tile,canvas,repeat=false){
  const side=720;canvas.width=canvas.height=side;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const n=repeat?3:1,w=side/n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)ctx.drawImage(tile,x*w,y*w,w,w);
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
