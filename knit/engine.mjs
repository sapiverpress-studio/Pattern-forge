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
 rib:'/knit/textures/grey-chunky-knit.jpg',
 seed:'/knit/textures/grey-chunky-knit.jpg',
 cable:'/knit/textures/cream-cable-knit.jpg',
 fairisle:'/knit/textures/grey-chunky-knit.jpg'
});
const PURL_ASSET='/knit/textures/rust-orange-knit.jpg';
const CACHE=Object.create(null);
let loading;
export function loadPhotoTextures(){
 if(!loading){
   loading=Promise.all([...new Set([...Object.values(PHOTO_ASSETS),PURL_ASSET])].map(src=>new Promise((resolve,reject)=>{
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
function purlCrop(gauge){
  return ({superchunky:.27,chunky:.43,medium:.70,fine:1})[gauge];
}
// Draw the complete CC0 seamless source, never an arbitrary centre crop. Previously,
// cropping a photo and repeating its raw rectangle caused the visible square blocks.
function repeatInto(ctx,photo,count=1){
  const N=TILE_SIZE,unit=N/count;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  for(let r=0;r<count;r++)for(let c=0;c<count;c++)
    ctx.drawImage(photo,c*unit,r*unit,unit+.03,unit+.03);
}
export function renderKnit(target,raw={}){
 const s=normalize(raw),photo=CACHE[PHOTO_ASSETS[s.style]];
 if(!photo)throw Error('Knitted material has not loaded.');
 const hasPurl=s.style==='rib'||s.style==='seed';
 const purlPhoto=hasPurl?CACHE[PURL_ASSET]:null;
 if(hasPurl&&!purlPhoto)throw Error('Purl wool material has not loaded.');
 target.width=target.height=TILE_SIZE;
 const ctx=target.getContext('2d',{alpha:false,willReadFrequently:true});
 if(!ctx)throw Error('2D canvas unavailable.');
 const count=({superchunky:1,chunky:2,medium:3,fine:4})[s.gauge];
 const unit=TILE_SIZE/count;
 repeatInto(ctx,photo,count);
 const px=ctx.getImageData(0,0,TILE_SIZE,TILE_SIZE),d=px.data;
 let purl;
 if(hasPurl){
   const purlTile=document.createElement('canvas');
   purlTile.width=purlTile.height=TILE_SIZE;
   const pc=purlTile.getContext('2d',{alpha:false,willReadFrequently:true});
   repeatInto(pc,purlPhoto,count);
   purl=pc.getImageData(0,0,TILE_SIZE,TILE_SIZE).data;
   purlTile.width=purlTile.height=0;
 }
 const main=rgb(s.yarn),contrast=rgb(s.contrast);
 // Photographic shading is retained in every option, including the purl stitch areas.
 const nativeLight=s.style==='cable'?.73:.49;
 for(let y=0;y<TILE_SIZE;y++){
   const phaseY=y/unit,vy=phaseY%1;
   const row=Math.floor(vy*11),sv=(vy*11)%1;
   for(let x=0;x<TILE_SIZE;x++){
     const i=(y*TILE_SIZE+x)*4;
     const photoLum=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255;
     const knitShade=clamp(Math.pow(Math.max(.14,photoLum/nativeLight),.89),.38,1.55);
     const phaseX=x/unit,ux=phaseX%1;
     const col=Math.floor(ux*18),su=(ux*18)%1;
     let shade=knitShade;
     if(hasPurl){
       const purlLum=(purl[i]*.299+purl[i+1]*.587+purl[i+2]*.114)/255;
       const purlShade=clamp(Math.pow(Math.max(.14,purlLum/.35),.89),.38,1.55);
       let blend=0,relief=1;
       if(s.style==='rib'){
         const recessed=col%3===2;
         if(recessed){
           blend=.78*Math.pow(Math.sin(Math.PI*su),.3);
           relief=.86+.06*Math.pow(Math.sin(Math.PI*su),2);
         }else relief=1+.08*Math.pow(Math.cos((su-.5)*Math.PI),2);
       }else if((row+col)%2===0){
         blend=.98*Math.pow(Math.sin(Math.PI*su),.6)*Math.pow(Math.sin(Math.PI*sv),.6);
       }
       shade=((1-blend)*knitShade+blend*purlShade)*relief;
     }
     let accent=0;
     if(s.style==='fairisle'&&fairIsleStitch(row,col))
       accent=fairIsleLoopMask(su,sv);
     for(let c=0;c<3;c++)
       d[i+c]=Math.round(clamp((main[c]+(contrast[c]-main[c])*accent)*shade,0,255));
     d[i+3]=255;
   }
 }
 ctx.putImageData(px,0,0);
 seamFinish(ctx,TILE_SIZE,5);
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
