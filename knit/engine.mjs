// Sapiver Knitted Fabric v5.
// Each style is made from a real-looking knitted-material source with colour
// woven into the source artwork. There are no simulated V overlays or inner
// photograph crops. Sources are periodic-plus-smooth processed, then bundled
// locally in /knit/materials/. No remote image services at runtime.
export const TILE_SIZE=1250, EXPORT_SIZE=5000;
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const STITCH_COUNTS=Object.freeze({fine:32,medium:24,chunky:16,superchunky:8,megachunky:5});
export const STYLE_COLOURS=Object.freeze({
  stockinette:['#729ac6','#ead7b4','#24344f'],
  rib:['#ead2ae','#ad765b','#3c4349'],
  seed:['#9cb396','#d7d2b2','#4d6254'],
  cable:['#efdcb8','#c5a584','#56473d'],
  fairisle:['#88312d','#ebd9b5','#19263d']
});
export const DEFAULTS=Object.freeze({style:'stockinette',gauge:'superchunky',
  yarn:'#729ac6',contrast:'#ead7b4',navy:'#24344f',seed:7});
const assetPaths=Object.freeze(Object.fromEntries(STYLES.map(s=>[s,'/knit/materials/'+s+'.png'])));
const loaded=new Map(),pending=new Map();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const validColour=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const srgb=(r,g,b)=>.299*r+.587*g+.114*b;
const smooth=(lo,hi,v)=>{const t=clamp((v-lo)/(hi-lo),0,1);return t*t*(3-2*t);};
export function normalize(p={}){
  const style=STYLES.includes(p.style)?p.style:DEFAULTS.style;
  const base=STYLE_COLOURS[style];
  return {style,gauge:Object.hasOwn(STITCH_COUNTS,p.gauge)?p.gauge:DEFAULTS.gauge,
    yarn:validColour(p.yarn,base[0]),contrast:validColour(p.contrast,base[1]),
    navy:validColour(p.navy,base[2]),seed:Number.isInteger(Number(p.seed))?
      clamp(Number(p.seed),1,9999):7};
}
export function stylePalette(style){return STYLE_COLOURS[style]||STYLE_COLOURS.stockinette;}
export const stitchCount=(s)=>STITCH_COUNTS[s.gauge]||STITCH_COUNTS.superchunky;
function load(name){
  if(loaded.has(name))return Promise.resolve(loaded.get(name));
  if(pending.has(name))return pending.get(name);
  const work=new Promise((resolve,reject)=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>{if(img.naturalWidth<100||img.naturalHeight<100){
      reject(Error('Empty material source for '+name));return;}
      loaded.set(name,img);resolve(img);};
    img.onerror=()=>reject(Error('Cannot load bundled knitted material: '+name));
    img.src=assetPaths[name];
  });
  pending.set(name,work);return work;
}
export function loadPhotoTextures(){return Promise.all(STYLES.map(load));}
export function loadStyle(style){return load(STYLES.includes(style)?style:'stockinette');}
function baseMaterial(target,settings,count){
  const photo=loaded.get(settings.style);
  if(!photo)throw Error('This knitted style has not loaded yet.');
  target.width=target.height=TILE_SIZE;
  const ctx=target.getContext('2d',{alpha:false,willReadFrequently:true});
  if(!ctx)throw Error('2D canvas unavailable.');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  // Complete source tile, integer-scaled only. Never centre-crop any photograph.
  const unit=TILE_SIZE/count;
  for(let y=0;y<count;y++)for(let x=0;x<count;x++)
    ctx.drawImage(photo,x*unit,y*unit,unit+.01,unit+.01);
  return ctx;
}
function applyDye(ctx,s){
  const frame=ctx.getImageData(0,0,TILE_SIZE,TILE_SIZE),d=frame.data;
  const newMain=rgb(s.yarn),newCream=rgb(s.contrast),newNavy=rgb(s.navy);
  // Nominal luminance of each captured colour. Preserve the photographed
  // yarn's lighting and fibres, not a rectangular graphic printed over it.
  const nominal={stockinette:142,rib:204,seed:169,cable:212};
  if(s.style!=='fairisle'){
    const ref=nominal[s.style],lumTarget=srgb(...newMain);
    const correction=clamp((lumTarget+12)/(ref+12),.35,2.1);
    for(let i=0;i<d.length;i+=4){
      const l=srgb(d[i],d[i+1],d[i+2]);
      // Luminosity mapped across the *entire knitted material*, not per glyph.
      const shade=clamp((l+18)/(ref+18),.24,1.64);
      const adjustment=shade*correction;
      for(let c=0;c<3;c++)d[i+c]=Math.round(clamp(
        (newMain[c]*.94+ref*.06)*adjustment,0,255));
      d[i+3]=255;
    }
  }else{
    // Source photograph already depicts knitted-in colourwork. Recolour the
    // photographed yarn itself by its existing red/cream/navy chromaticity.
    // Never add newly drawn V symbols or block-colour masks.
    const colours=[newMain,newCream,newNavy];
    const targets=[65,205,31];
    for(let i=0;i<d.length;i+=4){
      const R=d[i],G=d[i+1],B=d[i+2],L=srgb(R,G,B);
      const cream=smooth(97,159,L)*smooth(0,17,G-B+10);
      const navy=(1-cream)*smooth(-10,11,B-R);
      const weights=[(1-cream)-navy,cream,navy];
      const out=[0,0,0];
      for(let k=0;k<3;k++){
        const shade=clamp((L+10)/(targets[k]+10),.43,1.50);
        for(let c=0;c<3;c++)out[c]+=colours[k][c]*weights[k]*shade;
      }
      d[i]=Math.round(clamp(out[0],0,255));
      d[i+1]=Math.round(clamp(out[1],0,255));
      d[i+2]=Math.round(clamp(out[2],0,255));d[i+3]=255;
    }
  }
  ctx.putImageData(frame,0,0);
}
// Recolouring the three Fair Isle yarns can amplify sub-pixel differences at
// the original tile edge. Join only the first 6px of the *final* tile. This does
// not smooth or copy large square regions and does not paint a pattern overlay.
function alignRasterEdges(ctx){
  const n=TILE_SIZE,width=6,img=ctx.getImageData(0,0,n,n),a=img.data;
  for(let y=0;y<n;y++)for(let k=0;k<width;k++){
    const t=.5*Math.pow(1-k/width,2);
    for(let ch=0;ch<3;ch++){
      const i=(y*n+k)*4+ch,j=(y*n+n-1-k)*4+ch;
      const p=a[i],q=a[j];
      a[i]=Math.round(p*(1-t)+q*t);
      a[j]=Math.round(q*(1-t)+p*t);
    }
  }
  for(let x=0;x<n;x++)for(let k=0;k<width;k++){
    const t=.5*Math.pow(1-k/width,2);
    for(let ch=0;ch<3;ch++){
      const i=(k*n+x)*4+ch,j=((n-1-k)*n+x)*4+ch;
      const p=a[i],q=a[j];
      a[i]=Math.round(p*(1-t)+q*t);
      a[j]=Math.round(q*(1-t)+p*t);
    }
  }
  ctx.putImageData(img,0,0);
}
export function renderKnit(target,raw={}){
  const s=normalize(raw);
  const count=({megachunky:1,superchunky:1,chunky:2,medium:3,fine:4})[s.gauge];
  const ctx=baseMaterial(target,s,count);
  applyDye(ctx,s);alignRasterEdges(ctx);return target;
}
// Use the same close-up framing for preview and final PNG. Mega Chunky
// enlarges the centre of the photographed knit; it is intentionally NOT a
// seamlessly repeatable tile. Other gauges use the full, single material tile.
function drawCloseUp(ctx,tile,side,gauge){
  const zoom=gauge==='megachunky'?1.7:1;
  const source=tile.width/zoom;
  const left=(tile.width-source)/2,top=(tile.height-source)/2;
  ctx.drawImage(tile,left,top,source,source,0,0,side,side);
}
export function renderPreview(tile,canvas,repeat=false,gauge='superchunky'){
  canvas.width=canvas.height=720;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Preview canvas not available');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(!repeat){
    drawCloseUp(ctx,tile,720,gauge);
    return;
  }
  const count=3,step=720/count;
  for(let y=0;y<count;y++)for(let x=0;x<count;x++)
    ctx.drawImage(tile,x*step,y*step,step,step);
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
// Export the actual single close-up shown to the user, not a 4×4 grid of
// 1250px tiles. 5000px raster dimensions and PNG 300 DPI pHYs are retained.
// Source detail remains limited by the original photographed material.
export async function exportPng(tile,gauge='superchunky'){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=EXPORT_SIZE;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Cannot create export canvas');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  drawCloseUp(ctx,tile,EXPORT_SIZE,gauge);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png'));
  const bytes=await blob.arrayBuffer();
  canvas.width=canvas.height=0;
  return add300DpiPngMetadata(bytes);
}
