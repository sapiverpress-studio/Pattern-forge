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
function drawLoop(ctx,s,row,col,pitch){
 const spec=stitchAt(s,row,col),w=pitch*.31;
 const samples=s.gauge==='fine'?23:35,points=[];
 for(let i=0;i<=samples;i++)points.push(stitchPoint(row,col,i*TAU/samples,pitch,s.style,spec.type));
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.shadowColor='rgba(10,8,6,.5)';ctx.shadowBlur=w*.24;ctx.shadowOffsetY=w*.16;
 trace(ctx,points);ctx.strokeStyle=tint(spec.yarn,.34);ctx.lineWidth=w*1.25;ctx.stroke();
 ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 for(const [mult,light] of [[1.01,.64],[.83,.89],[.56,1.10],[.29,1.22]]){
   trace(ctx,points);ctx.lineWidth=w*mult;ctx.strokeStyle=tint(spec.yarn,light);ctx.globalAlpha=mult===.29?.7:1;ctx.stroke();
 }
 ctx.globalAlpha=1;
 // Individual twisted fibre strands follow the entire 3D yarn path and cross
 // each other continuously rather than repeating a stamped V-shaped sprite.
 for(let strand=0;strand<7;strand++){
   const phi=strand*TAU/7,curve=[];
   for(let i=0;i<=samples;i++){
     const t=i*TAU/samples,p=points[i];
     const f=numericTangent(row,col,t,pitch,s.style,spec.type);
     const twist=6.2*t+phi+((spec.type==='purl')?Math.PI/5:0);
     const edge=Math.sin(twist)*w*.38;
     curve.push({x:p.x+f.nx*edge,y:p.y+f.ny*edge,z:p.z});
   }
   trace(ctx,curve);ctx.lineWidth=clamp(w*.033,.75,2.8);
   ctx.strokeStyle=strand%3===0?'rgba(255,250,234,.30)':'rgba(31,18,12,.16)';ctx.stroke();
 }
 // Occasional short wool flyaways; loop-index randomness is periodic.
 for(let i=0;i<samples;i+=2){
   if(noise(mod(row,stitchCount(s)),mod(col,stitchCount(s)),i+s.seed)>.64){
     const t=(i+.4)*TAU/samples,p=stitchPoint(row,col,t,pitch,s.style,spec.type);
     const f=numericTangent(row,col,t,pitch,s.style,spec.type);
     const side=noise(row,col,i+s.seed+200)>.5?1:-1;
     ctx.beginPath();
     ctx.moveTo(p.x+f.nx*side*w*.43,p.y+f.ny*side*w*.43);
     ctx.lineTo(p.x+f.nx*side*w*.65+f.tx*w*.12,p.y+f.ny*side*w*.65+f.ty*w*.12);
     ctx.lineWidth=clamp(w*.012,.6,1.15);
     ctx.strokeStyle='rgba(245,234,213,.24)';ctx.stroke();
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
 for(let row=-2;row<n+2;row++)for(let col=-2;col<n+2;col++)drawLoop(ctx,s,row,col,pitch);
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