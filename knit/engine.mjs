// Standalone procedural knitted-fabric renderer. No dependency on the Pattern Forge editor.
export const TILE_SIZE = 1000;
export const EXPORT_SIZE = 5000;
export const STITCH_COUNTS = Object.freeze({fine:32,medium:24,chunky:16});
export const STYLES = Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const DEFAULTS = Object.freeze({style:'stockinette',gauge:'medium',yarn:'#d7bfa2',contrast:'#9b403b',seed:7});
export const mod=(n,d)=>((n%d)+d)%d;
export function normalize(input={}){
  return {
    style:STYLES.includes(input.style)?input.style:DEFAULTS.style,
    gauge:Object.hasOwn(STITCH_COUNTS,input.gauge)?input.gauge:DEFAULTS.gauge,
    yarn:/^#[0-9a-f]{6}$/i.test(input.yarn)?input.yarn:DEFAULTS.yarn,
    contrast:/^#[0-9a-f]{6}$/i.test(input.contrast)?input.contrast:DEFAULTS.contrast,
    seed:Number.isInteger(Number(input.seed))?Math.max(1,Math.min(9999,Number(input.seed))):DEFAULTS.seed
  };
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function colour(hex,factor){
  const a=rgb(hex), f=Math.max(-1,Math.min(1,factor));
  return 'rgb('+a.map(v=>Math.round(f>=0?v+(255-v)*f:v*(1+f))).join(',')+')';
}
function noise(a,b,c){let n=(Math.imul(a+1181,73856093)^Math.imul(b+2221,19349663)^Math.imul(c+731,83492791))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
export function selectedYarn(settings,row,col){
  const r=mod(row,8), c=mod(col,8);
  if(settings.style==='fairisle'){
    const diamond=Math.abs(c-3.5)+Math.abs(r-3.5)<3.6;
    const band=r===0 || r===7;
    const dot=(r===2||r===5)&&(c===0||c===7);
    return (diamond||band||dot)?settings.contrast:settings.yarn;
  }
  return settings.yarn;
}
function strokeYarn(ctx,points,width,hex,light){
  const grad=ctx.createLinearGradient(points[0][0]-width,points[0][1],points[points.length-1][0]+width,points[points.length-1][1]);
  grad.addColorStop(0,colour(hex,-.40));grad.addColorStop(.24,colour(hex,.04+light));
  grad.addColorStop(.55,colour(hex,.28+light));grad.addColorStop(.78,colour(hex,-.08+light));grad.addColorStop(1,colour(hex,-.38));
  function trace(){
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(let i=1;i<points.length;i+=3)ctx.bezierCurveTo(...points[i],...points[i+1],...points[i+2]);
  }
  ctx.lineCap='round';ctx.lineJoin='round';
  trace();ctx.lineWidth=width*1.22;ctx.strokeStyle=colour(hex,-.55);ctx.stroke();
  trace();ctx.lineWidth=width;ctx.strokeStyle=grad;ctx.stroke();
  trace();ctx.lineWidth=width*.19;ctx.strokeStyle='rgba(255,255,255,.19)';ctx.stroke();
}
function stitch(ctx,x,y,w,h,hex,row,col,settings){
  const rKey=mod(row,STITCH_COUNTS[settings.gauge]),cKey=mod(col,STITCH_COUNTS[settings.gauge]);
  const rnd=noise(rKey,cKey,settings.seed);
  const light=(rnd-.5)*.075 + (settings.style==='rib'?(mod(col,4)<2?.10:-.13):0);
  let shift=0;
  if(settings.style==='cable'){
    const phase=(mod(row,8)/8)*Math.PI*2;
    const strand=mod(col,8);
    if(strand===2)shift=Math.sin(phase)*w*.26;
    if(strand===3)shift=-Math.sin(phase)*w*.26;
    if(strand===4)shift=Math.sin(phase)*w*.26;
    if(strand===5)shift=-Math.sin(phase)*w*.26;
  }
  x+=shift;
  const thickness=w*(settings.style==='rib'?.26:.235);
  const purl=settings.style==='seed'&&mod(row+col,2)===0;
  if(purl){
    const g=ctx.createRadialGradient(x+w*.38,y+h*.40,w*.03,x+w*.50,y+h*.48,w*.43);
    g.addColorStop(0,colour(hex,.36+light));g.addColorStop(.44,colour(hex,.08+light));g.addColorStop(1,colour(hex,-.52));
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x+w*.5,y+h*.48,w*.41,h*.29,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=colour(hex,-.3);ctx.lineWidth=w*.08;ctx.stroke();
  } else {
    const left=[[x+w*.17,y-h*.15],[x+w*.12,y+h*.25],[x+w*.33,y+h*.70],[x+w*.51,y+h*.80]];
    const right=[[x+w*.83,y-h*.15],[x+w*.88,y+h*.25],[x+w*.68,y+h*.71],[x+w*.51,y+h*.80]];
    strokeYarn(ctx,left,thickness,hex,light);
    strokeYarn(ctx,right,thickness,hex,light);
  }
  // Subtle, deterministic fibres. Drawn on the wrap-over cells as well.
  for(let i=0;i<5;i++){
    const tx=x+w*(.18+.64*noise(rKey,cKey,settings.seed+i*13));
    const ty=y+h*(.12+.78*noise(rKey,cKey,settings.seed+i*19+51));
    const dx=w*(noise(rKey,cKey,settings.seed+i*17+91)-.5)*.19;
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+dx,ty-h*.065);
    ctx.strokeStyle=i%2?'rgba(255,255,255,.14)':'rgba(20,12,8,.12)';
    ctx.lineWidth=Math.max(.65,w*.012);ctx.stroke();
  }
}
export function renderKnit(target,raw={}){
  const settings=normalize(raw), n=STITCH_COUNTS[settings.gauge];
  target.width=target.height=TILE_SIZE;
  const ctx=target.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvas 2D is not available.');
  const cell=TILE_SIZE/n;
  // A uniform ground colour prevents holes between the loops.
  ctx.fillStyle=colour(settings.yarn,-.50);ctx.fillRect(0,0,TILE_SIZE,TILE_SIZE);
  // These indices include overdraw beyond the tile, making wrapped stitches align.
  for(let r=-2;r<n+2;r++){
    for(let c=-2;c<n+2;c++){
      const hex=selectedYarn(settings,r,c);
      stitch(ctx,c*cell,r*cell,cell,cell,hex,r,c,settings);
    }
  }
  return target;
}
export function renderPreview(tile,canvas,repeat=true){
  const width=720;canvas.width=canvas.height=width;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const count=repeat?3:1,cell=width/count;
  for(let y=0;y<count;y++)for(let x=0;x<count;x++)ctx.drawImage(tile,x*cell,y*cell,cell,cell);
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
