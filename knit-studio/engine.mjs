/* Seamless photographic-wool tile renderer, not a grid of copied squares.
 * Existing periodic source photos provide knitted structures; WebGL renders
 * full-size pixel-periodic variation and fine fibre texture. No backend needed.
 * Source photographic resolution is 1254px, an explicit quality limitation.
 */
export const EXPORT_SIZE=5000;
export const STYLES=Object.freeze(['stockinette','rib','seed','cable','fairisle']);
export const GAUGES=Object.freeze({mega:1,super:2,chunky:3,medium:4,fine:6});
export const PALETTES=Object.freeze({
 cream:['#e9d7b6','#ebd9b5','#24344f'],
 sage:['#9cb396','#ead7b4','#345846'],
 denim:['#729ac6','#ead7b4','#233e60'],
 berry:['#88312d','#ebd9b5','#172a42']
});
export const DEFAULTS=Object.freeze({
 style:'cable',gauge:'mega',colour:'#e9d7b6',contrast:'#ebd9b5',
 third:'#24344f',variation:32,fibres:55,angle:0,name:'Cosy Cable Wool'
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const colour=(c,f)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:f;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export function normalize(x={}){
 return {
  style:STYLES.includes(x.style)?x.style:DEFAULTS.style,
  gauge:Object.hasOwn(GAUGES,x.gauge)?x.gauge:DEFAULTS.gauge,
  colour:colour(x.colour,DEFAULTS.colour),
  contrast:colour(x.contrast,DEFAULTS.contrast),
  third:colour(x.third,DEFAULTS.third),
  variation:clamp(Number(x.variation)||0,0,100),
  fibres:clamp(Number(x.fibres)||0,0,100),
  angle:[0,90,180,270].includes(Number(x.angle))?Number(x.angle):0,
  name:typeof x.name==='string'?x.name.slice(0,70):DEFAULTS.name
 };
}
const vertex='#version 300 es\nin vec2 position;\nvoid main(){gl_Position=vec4(position,0.0,1.0);}';
const photoPromises=new Map();
function loadPhoto(name){
 if(!photoPromises.has(name)){
  const p=new Promise((resolve,reject)=>{
   const i=new Image();i.decoding='async';
   i.onload=()=>i.naturalWidth>=1000?resolve(i):reject(Error('Wool source too small: '+name));
   i.onerror=()=>reject(Error('Wool source unavailable: '+name));
   i.src='/knit/materials/'+name+'.png';
  });
  photoPromises.set(name,p);
 }
 return photoPromises.get(name);
}
function compile(gl,type,src){
 const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))
  throw Error('Wool shader: '+gl.getShaderInfoLog(sh));
 return sh;
}
async function makeRenderer(){
 const shaderURL=new URL('./shader.frag',import.meta.url);
 const response=await fetch(shaderURL);
 if(!response.ok)throw Error('Wool shader not available.');
 const fragment=await response.text();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const gl=canvas.getContext('webgl2',{alpha:false,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false});
 if(!gl)throw Error('WebGL2 is not available in this browser.');
 if(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)<1024)throw Error('GPU limit is below 1024 pixels.');
 const prg=gl.createProgram(),vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(prg,vs);gl.attachShader(prg,fs);gl.linkProgram(prg);
 if(!gl.getProgramParameter(prg,gl.LINK_STATUS))
  throw Error('Wool programme link failed: '+gl.getProgramInfoLog(prg));
 gl.useProgram(prg);
 const pos=gl.getAttribLocation(prg,'position');
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const loc=n=>gl.getUniformLocation(prg,n);
 gl.uniform1i(loc('materialPhoto'),0);
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 let current=null;
 async function block(settings,x,y,w,h,size){
  const s=normalize(settings);
  if(s.style!==current){
   const image=await loadPhoto(s.style);
   gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
   gl.generateMipmap(gl.TEXTURE_2D);
   current=s.style;
  }
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.useProgram(prg);
  gl.uniform2f(loc('origin'),x,y);gl.uniform1f(loc('fullSize'),size);
  gl.uniform1f(loc('stitchFrequency'),GAUGES[s.gauge]);
  gl.uniform1f(loc('variation'),s.variation/100);
  gl.uniform1f(loc('fibreStrength'),s.fibres/100);
  gl.uniform1f(loc('rotationAngle'),s.angle/90);
  gl.uniform3fv(loc('mainYarn'),rgb(s.colour));
  gl.uniform3fv(loc('contrastYarn'),rgb(s.contrast));
  gl.uniform3fv(loc('darkYarn'),rgb(s.third));
  gl.uniform1i(loc('stitchStyle'),STYLES.indexOf(s.style));
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  if(gl.getError()!==gl.NO_ERROR)throw Error('Wool GPU render error.');
  return canvas;
 }
 return {
  async renderTile(target,settings,size=720,onProgress=()=>{}){
   if(!Number.isInteger(size)||size<256||size>EXPORT_SIZE)throw Error('Invalid tile dimensions');
   target.width=target.height=size;
   const ctx=target.getContext('2d',{alpha:false});
   if(!ctx)throw Error('Output canvas failed');
   const chunk=Math.min(1024,size),total=Math.ceil(size/chunk)**2;
   let done=0;
   for(let py=0;py<size;py+=chunk){
    const h=Math.min(chunk,size-py);
    for(let px=0;px<size;px+=chunk){
     const w=Math.min(chunk,size-px);
     const img=await block(settings,px,py,w,h,size);
     ctx.drawImage(img,px,size-py-h);
     onProgress(++done/total);
    }
    if(size>1024)await new Promise(resolve=>requestAnimationFrame(resolve));
   }
   sealOuterEdges(ctx,size);
   return target;
  },
  dispose(){gl.deleteTexture(texture);gl.deleteProgram(prg);}
 };
}
// Edge-only colour reconciliation. The existing wool photographs are almost
// periodic, but fine fibre grain and sampling leave a 1-pixel join. Only the
// outer 0.4% of the tile is blended with its opposite edge. No photo squares
// are stamped into the middle and the full knitted structure remains intact.
function sealOuterEdges(ctx,size){
 const w=Math.max(3,Math.min(24,Math.round(size*.004)));
 const left=ctx.getImageData(0,0,w,size),right=ctx.getImageData(size-w,0,w,size);
 const a=left.data,b=right.data;
 for(let y=0;y<size;y++)for(let k=0;k<w;k++){
  const fade=.5*Math.pow((w-k)/w,2),p=(y*w+k)*4,q=(y*w+w-1-k)*4;
  for(let ch=0;ch<3;ch++){
   const x=a[p+ch],z=b[q+ch];
   a[p+ch]=Math.round(x*(1-fade)+z*fade);
   b[q+ch]=Math.round(z*(1-fade)+x*fade);
  }
 }
 ctx.putImageData(left,0,0);ctx.putImageData(right,size-w,0);
 const top=ctx.getImageData(0,0,size,w),bottom=ctx.getImageData(0,size-w,size,w);
 const t=top.data,d=bottom.data;
 for(let x=0;x<size;x++)for(let k=0;k<w;k++){
  const fade=.5*Math.pow((w-k)/w,2),p=(k*size+x)*4,q=((w-1-k)*size+x)*4;
  for(let ch=0;ch<3;ch++){
   const u=t[p+ch],v=d[q+ch];
   t[p+ch]=Math.round(u*(1-fade)+v*fade);
   d[q+ch]=Math.round(v*(1-fade)+u*fade);
  }
 }
 ctx.putImageData(top,0,0);ctx.putImageData(bottom,0,size-w);
}

let rendererPromise=null;
export function getRenderer(){
 if(!rendererPromise)rendererPromise=makeRenderer().catch(e=>{rendererPromise=null;throw e;});
 return rendererPromise;
}
function pngChunk(name,data){
 const bytes=new Uint8Array(12+data.length),v=new DataView(bytes.buffer);
 v.setUint32(0,data.length);for(let i=0;i<4;i++)bytes[4+i]=name.charCodeAt(i);
 bytes.set(data,8);let crc=0xffffffff;
 for(let i=4;i<8+data.length;i++){crc^=bytes[i];for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 v.setUint32(8+data.length,(crc^0xffffffff)>>>0);return bytes;
}
export function add300DpiPngMetadata(input){
 const a=new Uint8Array(input),signature=[137,80,78,71,13,10,26,10];
 if(a.length<45||!signature.every((b,i)=>a[i]===b))throw Error('Not a PNG');
 const view=new DataView(a.buffer,a.byteOffset,a.byteLength),chunks=[a.slice(0,8)];
 const phy=new Uint8Array(9),p=new DataView(phy.buffer);
 p.setUint32(0,11811);p.setUint32(4,11811);phy[8]=1;
 let pos=8,ihdr=false,ended=false;
 while(pos<a.length){
  if(pos+12>a.length)throw Error('Corrupt PNG');
  const n=view.getUint32(pos),end=pos+n+12;
  if(n>100000000||end>a.length)throw Error('Invalid PNG length');
  const name=String.fromCharCode(...a.slice(pos+4,pos+8));
  if(name!=='pHYs')chunks.push(a.slice(pos,end));
  if(name==='IHDR'){ihdr=true;chunks.push(pngChunk('pHYs',phy));}
  pos=end;if(name==='IEND'){ended=true;break;}
 }
 if(!ihdr||!ended||pos!==a.length)throw Error('Incomplete PNG');
 return new Blob(chunks,{type:'image/png'});
}
export async function exportPng(renderer,settings,onProgress=()=>{}){
 const canvas=document.createElement('canvas');
 await renderer.renderTile(canvas,settings,EXPORT_SIZE,onProgress);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(
  b=>b?resolve(b):reject(Error('PNG export could not complete')),'image/png'));
 const bytes=await blob.arrayBuffer();
 canvas.width=canvas.height=0;
 return add300DpiPngMetadata(bytes);
}
