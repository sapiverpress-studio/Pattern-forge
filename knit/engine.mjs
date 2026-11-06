// Knitted fabric from interlocking stitch geometry. No tiled photographs or overlays.
// Independent of Pattern Forge's existing motif/doodle editors.
export const TILE_SIZE=1000,EXPORT_SIZE=5000;
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const GAUGES=Object.freeze(['fine','medium','chunky','superchunky']);
export const STITCH_COUNTS=Object.freeze({fine:32,medium:24,chunky:16,superchunky:8});
export const DEFAULTS=Object.freeze({style:'stockinette',gauge:'superchunky',yarn:'#e2d2b7',contrast:'#9b403b',seed:7});
export const mod=(v,n)=>((v%n)+n)%n;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function noise(a,b,c){let x=Math.imul(a+683,73856093)^Math.imul(b+233,19349663)^Math.imul(c+719,83492791);x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function colour(hex,mult=1){return 'rgb('+rgb(hex).map(v=>Math.round(clamp(v*mult,0,255))).join(',')+')';}
export function normalize(input={}){
 return {style:STYLES.includes(input.style)?input.style:DEFAULTS.style,gauge:GAUGES.includes(input.gauge)?input.gauge:DEFAULTS.gauge,
 yarn:/^#[0-9a-f]{6}$/i.test(input.yarn)?input.yarn:DEFAULTS.yarn,contrast:/^#[0-9a-f]{6}$/i.test(input.contrast)?input.contrast:DEFAULTS.contrast,
 seed:Number.isInteger(Number(input.seed))?clamp(Number(input.seed),1,9999):DEFAULTS.seed};
}
export const stitchCount=s=>STITCH_COUNTS[s.gauge]??8;
const FAIR_ISLE=['...##...','..#..#..','.#....#.','#......#','#......#','.#....#.','..#..#..','...##...'];
export function stitchAt(s,r,c){
 const n=stitchCount(s),R=mod(r,n),C=mod(c,n);
 let type='knit';
 if(s.style==='rib'&&mod(C,4)>=2)type='purl';
 if(s.style==='seed'&&mod(R+C,2)===1)type='purl';
 const yarn=s.style==='fairisle'&&FAIR_ISLE[mod(R,8)][mod(C,8)]==='#'?s.contrast:s.yarn;
 return {type,yarn,cable:s.style==='cable'&&mod(C,8)>=2&&mod(C,8)<=5};
}
function bez(p,t){
 const q=1-t,x=q*q*q*p[0]+3*q*q*t*p[2]+3*q*t*t*p[4]+t*t*t*p[6],
 y=q*q*q*p[1]+3*q*q*t*p[3]+3*q*t*t*p[5]+t*t*t*p[7],
 dx=3*q*q*(p[2]-p[0])+6*q*t*(p[4]-p[2])+3*t*t*(p[6]-p[4]),
 dy=3*q*q*(p[3]-p[1])+6*q*t*(p[5]-p[3])+3*t*t*(p[7]-p[5]),
 len=Math.hypot(dx,dy)||1;
 return [x,y,dx/len,dy/len,-dy/len,dx/len];
}
function path(ctx,segments){
 ctx.beginPath();const a=segments[0];ctx.moveTo(a[0],a[1]);ctx.bezierCurveTo(a[2],a[3],a[4],a[5],a[6],a[7]);
 for(let i=1;i<segments.length;i++){const p=segments[i];ctx.bezierCurveTo(p[2],p[3],p[4],p[5],p[6],p[7]);}
}
function yarn(ctx,segments,w,hex,key,light=0){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.shadowColor='rgba(18,13,10,.48)';ctx.shadowOffsetY=w*.16;ctx.shadowBlur=w*.25;
 path(ctx,segments);ctx.lineWidth=w*1.19;ctx.strokeStyle=colour(hex,.40+light);ctx.stroke();
 ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 const layers=[[1,.70],[.78,.95],[.50,1.13],[.25,1.24]];
 for(const [radius,brightness] of layers){path(ctx,segments);ctx.lineWidth=w*radius;ctx.strokeStyle=colour(hex,brightness+light);ctx.globalAlpha=radius===.25?.6:1;ctx.stroke();}
 ctx.globalAlpha=1;
 const amount=clamp(Math.round(w*1.35),30,140);
 for(let j=0;j<segments.length;j++){
  const seg=segments[j];
  for(let i=0;i<amount;i++){
   const t=(i+.25+.40*noise(key,j,i))/amount,[x,y,tx,ty,nx,ny]=bez(seg,t);
   const q=noise(key+i*17,j,31),radius=(q-.5)*w*.95;
   const len=(.06+.12*noise(key,i,j+100))*w;
   const fx=x+nx*radius,fy=y+ny*radius;
   ctx.beginPath();ctx.moveTo(fx-tx*len*.45,fy-ty*len*.45);
   ctx.lineTo(fx+tx*len*.55+nx*w*.035,fy+ty*len*.55+ny*w*.035);
   ctx.strokeStyle=q>.6?'rgba(255,252,244,.22)':'rgba(30,19,13,.13)';
   ctx.lineWidth=clamp(w*.011,.65,1.7);ctx.stroke();
   if(i%9===0){const sign=q>.5?1:-1;
    ctx.beginPath();ctx.moveTo(x+nx*sign*w*.44,y+ny*sign*w*.44);
    ctx.lineTo(x+nx*sign*w*(.54+q*.09)+tx*w*.07,y+ny*sign*w*(.54+q*.09)+ty*w*.07);
    ctx.lineWidth=.8;ctx.strokeStyle='rgba(233,218,193,.23)';ctx.stroke();
   }
  }
 }
 ctx.restore();
}
function cableShift(s,r,c,w){
 if(s.style!=='cable')return 0;
 const k=mod(c,8);if(k<2||k>5)return 0;
 return (k<=3?1:-1)*Math.sin(2*Math.PI*(mod(r,8)+.5)/8)*w*.58;
}
function stitchLoops(ctx,s,r,c,w){
 const n=stitchCount(s),R=mod(r,n),C=mod(c,n),stitch=stitchAt(s,r,c),key=R*n+C;
 const x=c*w+cableShift(s,r,c,w),y=r*w;
 const tone=(noise(R,C,s.seed)-.5)*.06+(stitch.cable?.10:stitch.type==='purl'?-0.08:0);
 if(stitch.type==='knit'){
  const back=[x+w*.88,y-w*.24,x+w*.95,y-w*.15,x+w*1.06,y-w*.15,x+w*1.12,y-w*.24];
  yarn(ctx,[back],w*.235,stitch.yarn,key*23+5,-.16);
  const left=[x+w*.13,y-w*.18,x+w*.00,y+w*.18,x+w*.30,y+w*.73,x+w*.50,y+w*.86];
  const right=[x+w*.50,y+w*.86,x+w*.72,y+w*.72,x+w*1.00,y+w*.18,x+w*.87,y-w*.18];
  yarn(ctx,[left,right],w*.27,stitch.yarn,key*31+3,tone);
 }else{
  const left=[x+w*.12,y-w*.18,x+w*.11,y+w*.35,x+w*.33,y+w*.69,x+w*.48,y+w*.81];
  const right=[x+w*.48,y+w*.81,x+w*.68,y+w*.69,x+w*.88,y+w*.34,x+w*.88,y-w*.18];
  yarn(ctx,[left,right],w*.26,stitch.yarn,key*29+3,-.25+tone);
  const bump=[x+w*.16,y+w*.43,x+w*.37,y+w*.20,x+w*.63,y+w*.20,x+w*.84,y+w*.43];
  yarn(ctx,[bump],w*.44,stitch.yarn,key*29+13,.035+tone);
 }
}
export function renderKnit(target,raw={}){
 const s=normalize(raw),n=stitchCount(s),w=TILE_SIZE/n;
 target.width=target.height=TILE_SIZE;
 const ctx=target.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas 2D unavailable');
 ctx.fillStyle=colour(s.yarn,.34);ctx.fillRect(0,0,TILE_SIZE,TILE_SIZE);
 // Entirely geometric periodic stitch chart; extended rows/columns cover both edges.
 for(let r=-2;r<n+2;r++)for(let c=-2;c<n+2;c++)stitchLoops(ctx,s,r,c,w);
 return target;
}
export function renderPreview(tile,canvas,repeat=false){
 const side=720;canvas.width=canvas.height=side;const ctx=canvas.getContext('2d',{alpha:false});
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const n=repeat?3:1,w=side/n;
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