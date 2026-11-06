// Procedural interlocking yarn renderer, with MIT-licensed centreline reference.
// Unlike previous builds, no photographic bitmap, texture repeat, or graphic overlay.
import {TAU,stitchPoint,numericTangent,mod} from './geometry.mjs';
export const TILE_SIZE=1000,EXPORT_SIZE=5000;
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const GAUGES=Object.freeze(['fine','medium','chunky','superchunky']);
export const STITCH_COUNTS=Object.freeze({fine:32,medium:24,chunky:16,superchunky:8});
export const DEFAULTS=Object.freeze({style:'stockinette',gauge:'superchunky',yarn:'#e2d2b7',contrast:'#9b403b',seed:7});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
function tint(h,m=1){return 'rgb('+rgb(h).map(v=>Math.round(clamp(v*m,0,255))).join(',')+')';}
function noise(a,b,c){let n=(Math.imul(a+1181,73856093)^Math.imul(b+2221,19349663)^Math.imul(c+731,83492791))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
export function normalize(p={}){
 return {style:STYLES.includes(p.style)?p.style:DEFAULTS.style,
 gauge:GAUGES.includes(p.gauge)?p.gauge:DEFAULTS.gauge,
 yarn:/^#[0-9a-f]{6}$/i.test(p.yarn)?p.yarn:DEFAULTS.yarn,
 contrast:/^#[0-9a-f]{6}$/i.test(p.contrast)?p.contrast:DEFAULTS.contrast,
 seed:Number.isInteger(Number(p.seed))?clamp(Number(p.seed),1,9999):DEFAULTS.seed};
}
export const stitchCount=s=>STITCH_COUNTS[s.gauge]??8;
const FAIR_ISLE=['...##...','..#..#..','.#....#.','#......#','#......#','.#....#.','..#..#..','...##...'];
export function stitchAt(s,r,c){
 const n=stitchCount(s),R=mod(r,n),C=mod(c,n);
 let type='knit';
 if(s.style==='rib'&&mod(C,4)>=2)type='purl';
 if(s.style==='seed'&&mod(R+C,2))type='purl';
 const yarn=s.style==='fairisle'&&FAIR_ISLE[mod(R,8)][mod(C,8)]==='#'?(s.contrast||DEFAULTS.contrast):(s.yarn||DEFAULTS.yarn);
 return {type,yarn,cable:s.style==='cable'&&mod(C,8)>=2&&mod(C,8)<=5};
}
function trace(ctx,pts,ox=0,oy=0){
 ctx.beginPath();ctx.moveTo(pts[0].x+ox,pts[0].y+oy);
 for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x+ox,pts[i].y+oy);
}
function drawLoopPass(ctx,s,row,col,pitch,pass){
 const stitch=stitchAt(s,row,col);
 const w=pitch*.36;
 const samples=s.gauge==='fine'?20:s.gauge==='medium'?28:s.gauge==='chunky'?36:52;
 const points=[];
 for(let i=0;i<=samples;i++)points.push(stitchPoint(row,col,i*TAU/samples,pitch,s.style,stitch.type));
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(let i=0;i<samples;i++){
  const a=points[i],b=points[i+1],depth=(a.z+b.z)/2;
  const group=depth<-.24?0:depth<.34?1:2;
  if(group!==pass)continue;
  const shade=clamp(.94+depth*.115+(noise(mod(row,stitchCount(s)),mod(col,stitchCount(s)),s.seed)-.5)*.045,.74,1.16);
  // Draw occluding front fibres after the back fibres from every other stitch.
  // Crucial: the same depth ordering applies across cell and tile boundaries.
  const widths=[[1.19,.40],[.93,.69],[.70,.93],[.41,1.14],[.17,1.23]];
  for(const [thick,light] of widths){
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    ctx.lineWidth=w*thick;ctx.strokeStyle=tint(stitch.yarn,light*shade);ctx.stroke();
  }
  if(pass===2||pass===1){
   const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
   const nx=-dy/L,ny=dx/L;
   const phase=i*TAU/samples;
   for(let j=0;j<4;j++){
    const p1=Math.sin(phase*7+j*TAU/4)*w*.23;
    const p2=Math.sin((phase+TAU/samples)*7+j*TAU/4)*w*.23;
    ctx.beginPath();
    ctx.moveTo(a.x+nx*p1,a.y+ny*p1);
    ctx.lineTo(b.x+nx*p2,b.y+ny*p2);
    ctx.lineWidth=clamp(w*.018,.56,1.45);
    ctx.strokeStyle=j===0?'rgba(255,251,238,.30)':j===2?'rgba(24,14,10,.17)':'rgba(255,241,218,.16)';
    ctx.stroke();
   }
  }
 }
 // sparse short fibres; not separate graphic shapes or square texture stamps
 if(pass===2){
  for(let k=1;k<samples;k+=4){
   const p=points[k],z=p.z;if(z<.34)continue;
   const vec=numericTangent(row,col,k*TAU/samples,pitch,s.style,stitch.type);
   const sign=noise(mod(row,stitchCount(s)),mod(col,stitchCount(s)),k+s.seed)>.5?1:-1;
   ctx.beginPath();ctx.moveTo(p.x+sign*vec.nx*w*.43,p.y+sign*vec.ny*w*.43);
   ctx.lineTo(p.x+sign*vec.nx*w*.61+vec.tx*w*.085,p.y+sign*vec.ny*w*.61+vec.ty*w*.085);
   ctx.lineWidth=clamp(w*.011,.55,1.1);ctx.strokeStyle='rgba(248,237,217,.22)';ctx.stroke();
  }
 }
 ctx.restore();
}
function joinEdges(ctx,N){
 // Small raster antialiasing correction only; there is no source-image square
 // and no large-area texture blending that can create patch artefacts.
 const im=ctx.getImageData(0,0,N,N),a=im.data,width=4;
 for(let y=0;y<N;y++)for(let k=0;k<width;k++)for(let ch=0;ch<3;ch++){
   const l=(y*N+k)*4+ch,r=(y*N+N-k-1)*4+ch,t=.5*(1-k/width)**2;
   const p=a[l],q=a[r];a[l]=Math.round(p*(1-t)+q*t);a[r]=Math.round(q*(1-t)+p*t);
 }
 for(let x=0;x<N;x++)for(let k=0;k<width;k++)for(let ch=0;ch<3;ch++){
   const t=(k*N+x)*4+ch,b=((N-k-1)*N+x)*4+ch,w=.5*(1-k/width)**2;
   const p=a[t],q=a[b];a[t]=Math.round(p*(1-w)+q*w);a[b]=Math.round(q*(1-w)+p*w);
 }
 ctx.putImageData(im,0,0);
}
export function renderKnit(canvas,raw={}){
 const s=normalize(raw),n=stitchCount(s),pitch=TILE_SIZE/n;
 canvas.width=canvas.height=TILE_SIZE;
 const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
 if(!ctx)throw Error('Canvas 2D unavailable');
 ctx.fillStyle=tint(s.yarn,.27);ctx.fillRect(0,0,TILE_SIZE,TILE_SIZE);
 for(let layer=0;layer<3;layer++)for(let row=-2;row<n+2;row++)for(let col=-2;col<n+2;col++)drawLoopPass(ctx,s,row,col,pitch,layer);
 joinEdges(ctx,TILE_SIZE);
 return canvas;
}
export function renderPreview(tile,canvas,repeat=false){
 const side=720;canvas.width=canvas.height=side;
 const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const count=repeat?3:1,size=side/count;
 for(let y=0;y<count;y++)for(let x=0;x<count;x++)ctx.drawImage(tile,x*size,y*size,size,size);
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
 if(a.length<45||!signature.every((n,i)=>a[i]===n))throw Error('Not a valid PNG');
 const parts=[a.slice(0,8)],view=new DataView(a.buffer,a.byteOffset,a.byteLength);
 const phy=new Uint8Array(9),pv=new DataView(phy.buffer);pv.setUint32(0,11811);pv.setUint32(4,11811);phy[8]=1;
 let pos=8,hasIHDR=false,hasIEND=false;
 while(pos<a.length){
  if(pos+12>a.length)throw Error('Invalid PNG chunk');
  const n=view.getUint32(pos),end=pos+12+n;
  if(n>100000000||end>a.length)throw Error('Invalid PNG length');
  const name=String.fromCharCode(...a.slice(pos+4,pos+8));
  if(name!=='pHYs')parts.push(a.slice(pos,end));
  if(name==='IHDR'){hasIHDR=true;parts.push(pngChunk('pHYs',phy));}
  pos=end;if(name==='IEND'){hasIEND=true;break;}
 }
 if(!hasIHDR||!hasIEND||pos!==a.length)throw Error('Incomplete PNG');
 return new Blob(parts,{type:'image/png'});
}
export async function exportPng(tile){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=EXPORT_SIZE;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Export canvas unavailable');
 ctx.imageSmoothingEnabled=false;const p=ctx.createPattern(tile,'repeat');if(!p)throw Error('Cannot repeat tile');
 ctx.fillStyle=p;ctx.fillRect(0,0,EXPORT_SIZE,EXPORT_SIZE);
 const b=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('PNG export failed')),'image/png'));
 const result=await add300DpiPngMetadata(await b.arrayBuffer());canvas.width=canvas.height=0;return result;
}