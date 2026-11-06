// Independent procedural knit-texture renderer, v2: interlocking layered yarn, not glyph stamps.
// Pure browser Canvas 2D; no network, cloud model, or Pattern Forge editor dependency.
export const TILE_SIZE=1000,EXPORT_SIZE=5000;
export const STITCH_COUNTS=Object.freeze({fine:30,medium:20,chunky:10,superchunky:6});
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const DEFAULTS=Object.freeze({style:'stockinette',gauge:'superchunky',yarn:'#e2d2b7',contrast:'#9b403b',seed:7});
export const mod=(n,d)=>((n%d)+d)%d;
export function normalize(raw={}){
  const safeColour=(x,fallback)=>/^#[0-9a-f]{6}$/i.test(x)?x:fallback;
  return {style:STYLES.includes(raw.style)?raw.style:DEFAULTS.style,
    gauge:Object.hasOwn(STITCH_COUNTS,raw.gauge)?raw.gauge:DEFAULTS.gauge,
    yarn:safeColour(raw.yarn,DEFAULTS.yarn),contrast:safeColour(raw.contrast,DEFAULTS.contrast),
    seed:Number.isInteger(Number(raw.seed))?Math.max(1,Math.min(9999,Number(raw.seed))):DEFAULTS.seed};
}
export const stitchCount=(settings)=>(settings.style==='fairisle'||settings.style==='cable')?({fine:32,medium:24,chunky:16,superchunky:8})[settings.gauge]:STITCH_COUNTS[settings.gauge];
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
function tone(h,f){return 'rgb('+rgb(h).map(n=>Math.round(Math.max(0,Math.min(255,f>=0?n+(255-n)*f:n*(1+f))))).join(',')+')';}
function noise(a,b,c){let n=(Math.imul(a+1181,73856093)^Math.imul(b+2221,19349663)^Math.imul(c+731,83492791))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function cubic(p,t){
  const q=1-t,q2=q*q,t2=t*t;
  const x=q*q2*p[0][0]+3*q2*t*p[1][0]+3*q*t2*p[2][0]+t*t2*p[3][0];
  const y=q*q2*p[0][1]+3*q2*t*p[1][1]+3*q*t2*p[2][1]+t*t2*p[3][1];
  const dx=3*q2*(p[1][0]-p[0][0])+6*q*t*(p[2][0]-p[1][0])+3*t2*(p[3][0]-p[2][0]);
  const dy=3*q2*(p[1][1]-p[0][1])+6*q*t*(p[2][1]-p[1][1])+3*t2*(p[3][1]-p[2][1]);
  const len=Math.hypot(dx,dy)||1;
  return {x,y,tx:dx/len,ty:dy/len,nx:-dy/len,ny:dx/len};
}
function trace(ctx,p){ctx.beginPath();ctx.moveTo(...p[0]);ctx.bezierCurveTo(...p[1],...p[2],...p[3]);}
function yarn(ctx,p,width,hex,shade,key){
  // Rounded, shadowed yarn tube; highlights are offset along the normal to model a 3D roll.
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.shadowColor='rgba(23,15,11,.55)';ctx.shadowBlur=width*.35;ctx.shadowOffsetY=width*.16;
  trace(ctx,p);ctx.lineWidth=width*1.24;ctx.strokeStyle=tone(hex,-.60+shade*.3);ctx.stroke();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  trace(ctx,p);ctx.lineWidth=width*1.02;ctx.strokeStyle=tone(hex,-.24+shade);ctx.stroke();
  trace(ctx,p);ctx.lineWidth=width*.80;ctx.strokeStyle=tone(hex,.04+shade);ctx.stroke();
  trace(ctx,p);ctx.lineWidth=width*.49;ctx.strokeStyle=tone(hex,.21+shade);ctx.stroke();
  trace(ctx,p);ctx.lineWidth=width*.20;ctx.strokeStyle=tone(hex,.34+shade);ctx.globalAlpha=.74;ctx.stroke();ctx.globalAlpha=1;
  // Fibres follow the curved strands. Slightly irregular fine fibres also protrude from their edges.
  const count=Math.min(80,Math.max(18,Math.round(width*.8)));
  for(let i=0;i<count;i++){
    const t=.02+.96*((i+.37*noise(key,i,31))/count);
    const pos=cubic(p,t);
    const jitter=noise(key,i,43)-.5;
    const side=(noise(key,i,51)-.5)*width*.91;
    const d=(2+width*.18)*(0.45+noise(key,i,67));
    const fuzz=noise(key,i,73)>.88;
    const edge=fuzz?Math.sign(side||1)*(width*.52+noise(key,i,89)*width*.19):side;
    const x=pos.x+pos.nx*edge,y=pos.y+pos.ny*edge;
    ctx.beginPath();ctx.moveTo(x-pos.tx*d*.5,y-pos.ty*d*.5);
    ctx.quadraticCurveTo(x+pos.nx*jitter*width*.035,y+pos.ny*jitter*width*.035,
      x+pos.tx*d*.5+pos.nx*jitter*width*.10,y+pos.ty*d*.5+pos.ny*jitter*width*.10);
    ctx.strokeStyle=fuzz?'rgba(242,236,220,.25)':(i%3===0?'rgba(33,18,15,.18)':'rgba(255,248,229,.23)');
    ctx.lineWidth=Math.max(.65,width*(fuzz?.012:.020));ctx.stroke();
  }
  // Gentle spun-yarn twist marks at intervals, visible on the chunky wool close-up.
  const twists=Math.min(18,Math.max(5,Math.round(width*.24)));
  for(let i=0;i<twists;i++){
    const pos=cubic(p,(i+.5)/twists),span=width*.20;
    const x=pos.x,y=pos.y;
    ctx.beginPath();ctx.moveTo(x-pos.nx*span-pos.tx*span*.4,y-pos.ny*span-pos.ty*span*.4);
    ctx.lineTo(x+pos.nx*span+pos.tx*span*.4,y+pos.ny*span+pos.ty*span*.4);
    ctx.strokeStyle='rgba(50,29,20,.09)';ctx.lineWidth=Math.max(.65,width*.014);ctx.stroke();
  }
  ctx.restore();
}
export function selectedYarn(s,r,c){
  if(s.style!=='fairisle')return s.yarn;
  const rr=mod(r,8),cc=mod(c,8);
  const pattern=['...##...','..#..#..','.#....#.','#..##..#','#..##..#','.#....#.','..#..#..','...##...'];
  return pattern[rr][cc]==='#'?s.contrast:s.yarn;
}
function stitch(ctx,x,y,w,s,r,c,count){
  const row=mod(r,count),col=mod(c,count);
  const hex=selectedYarn(s,row,col);
  const sh=(noise(row,col,s.seed)-.5)*.09;
  const valley=s.style==='rib'&&mod(col,4)>=2;
  const width=w*(s.style==='rib'?(valley?.29:.39):.37);
  const dx=(noise(row,col,s.seed+21)-.5)*w*.022;
  const X=x+dx;
  // Dimples under the loops and hidden upper strand provide depth and a connected knitted bed.
  const hollow=ctx.createRadialGradient(X+w*.5,y+w*.38,w*.05,X+w*.5,y+w*.38,w*.60);
  hollow.addColorStop(0,'rgba(18,12,10,.36)');hollow.addColorStop(1,'rgba(18,12,10,0)');
  ctx.fillStyle=hollow;ctx.fillRect(X-w*.15,y-w*.28,w*1.30,w*1.24);
  const back=[[X+w*.06,y-w*.22],[X+w*.22,y+w*.18],[X+w*.78,y+w*.18],[X+w*.94,y-w*.22]];
  yarn(ctx,back,width*.68,hex,-.23+sh,row*12409+col*257+1);
  if(s.style==='seed'&&mod(row+col,2)===0){
    const bump=[[X+w*.12,y+w*.45],[X+w*.30,y+w*.13],[X+w*.73,y+w*.14],[X+w*.87,y+w*.45]];
    yarn(ctx,bump,width*1.15,hex,.035+sh,row*12409+col*257+2);
    return;
  }
  // Long crossing legs overlap the previous row's loop. The yarn looks knitted together,
  // unlike individual decorative V marks.
  const left=[[X+w*.12,y-w*.24],[X-w*.02,y+w*.22],[X+w*.31,y+w*.76],[X+w*.50,y+w*.82]];
  const right=[[X+w*.88,y-w*.24],[X+w*1.02,y+w*.22],[X+w*.69,y+w*.76],[X+w*.50,y+w*.82]];
  if(valley){ctx.save();ctx.globalAlpha=.82;}
  yarn(ctx,left,width,hex,sh-.02,row*12409+col*257+3);
  yarn(ctx,right,width,hex,sh+.02,row*12409+col*257+4);
  if(valley)ctx.restore();
}
function braid(ctx,s,n,w){
  // Cable crossings are drawn as genuinely crossing raised yarn cords, not lateral V shifts.
  const group=8,period=8,hex=s.yarn;
  for(let start=0;start<n;start+=group){
    for(let row=-period;row<n+period;row+=period){
      for(let band=0;band<2;band++){
        const y=row*w+band*4*w,x=(start+4)*w;
        const p1=[[x-1.16*w,y-.5*w],[x-.95*w,y+1.1*w],[x+.94*w,y+2.8*w],[x+1.17*w,y+4.7*w]];
        const p2=[[x+1.16*w,y-.5*w],[x+.95*w,y+1.1*w],[x-.94*w,y+2.8*w],[x-1.17*w,y+4.7*w]];
        const key=mod(row,n)*41+start*7+band*151+s.seed;
        yarn(ctx,p2,w*.79,hex,-.13,key+2);
        yarn(ctx,p1,w*.88,hex,.10,key+1);
      }
    }
  }
}
function softenSeams(ctx,size){
  // Symmetrical edge blend; the first/last texels are identical and adjacent
  // pixels transition into the interior, preventing a rectangular repeat boundary.
  const data=ctx.getImageData(0,0,size,size),a=data.data;
  const width=18,channels=3;
  for(let y=0;y<size;y++)for(let k=0;k<width;k++){
    const factor=Math.pow(1-k/width,2)*.5;
    for(let c=0;c<channels;c++){
      const li=(y*size+k)*4+c,ri=(y*size+size-1-k)*4+c;
      const v1=a[li],v2=a[ri];a[li]=Math.round(v1*(1-factor)+v2*factor);
      a[ri]=Math.round(v2*(1-factor)+v1*factor);
    }
  }
  for(let x=0;x<size;x++)for(let k=0;k<width;k++){
    const factor=Math.pow(1-k/width,2)*.5;
    for(let c=0;c<channels;c++){
      const top=(k*size+x)*4+c,bottom=((size-1-k)*size+x)*4+c;
      const v1=a[top],v2=a[bottom];a[top]=Math.round(v1*(1-factor)+v2*factor);
      a[bottom]=Math.round(v2*(1-factor)+v1*factor);
    }
  }
  ctx.putImageData(data,0,0);
}
export function renderKnit(canvas,raw={}){
  const s=normalize(raw),n=stitchCount(s),w=TILE_SIZE/n;
  canvas.width=canvas.height=TILE_SIZE;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Canvas 2D unavailable');
  // Canvas is opaque knit fabric, not a transparent illustration.
  ctx.fillStyle=tone(s.yarn,-.46);ctx.fillRect(0,0,TILE_SIZE,TILE_SIZE);
  // Include two rows/columns beyond clipping, using periodic keys for exact continuous edges.
  for(let r=-2;r<n+2;r++)for(let c=-2;c<n+2;c++)stitch(ctx,c*w,r*w,w,s,r,c,n);
  if(s.style==='cable')braid(ctx,s,n,w);
  softenSeams(ctx,TILE_SIZE);
  return canvas;
}
export function renderPreview(tile,canvas,repeat=false){
  const width=720;canvas.width=canvas.height=width;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const n=repeat?3:1,size=width/n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)ctx.drawImage(tile,x*size,y*size,size,size);
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
