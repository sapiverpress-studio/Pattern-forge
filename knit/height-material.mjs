// Experimental material renderer: geometric displacement (CC BY 4.0), no photos.
// Source: Keenan Crane (2023), https://github.com/keenancrane/plain-knit-yarn
const N=1000,paths={front:'/knit/displacement/front-height.jpg',back:'/knit/displacement/back-height.jpg',alpha:'/knit/displacement/front-alpha.jpg'};
const assets={},shadeCache=new Map();
export const kinds=['stockinette','rib','seed','cable','fairisle'],sizes=['fine','medium','chunky','superchunky'];
export const palettes={cream:['#e2d2b7','#9b403b'],denim:['#8eaac8','#d4a17b'],sage:['#8cac8b','#e8e0bd']};
export async function initialise(){
  await Promise.all(Object.entries(paths).map(([k,url])=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>{assets[k]=image;resolve()};
    image.onerror=()=>reject(Error('Missing '+url));image.src=url;
  })));
}
const mod=(x,n)=>((x%n)+n)%n;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));}
const chart=['...##...','..#..#..','.#....#.','#......#','#......#','.#....#.','..#..#..','...##...'];
function count(gauge,style){
 const num={superchunky:2,chunky:4,medium:7,fine:12}[gauge]||2;
 if(style==='fairisle'){const map={superchunky:[8,8],chunky:[16,24],medium:[24,32],fine:[32,48]};return map[gauge]||[8,8]}
 return [num,Math.round(num*1.5)];
}
function imageArray(image,cols,rows){
 const c=document.createElement('canvas');c.width=c.height=N;
 const ctx=c.getContext('2d',{alpha:false,willReadFrequently:true}),w=N/cols,h=N/rows;
 ctx.imageSmoothingQuality='high';
 for(let r=0;r<rows;r++)for(let col=0;col<cols;col++)ctx.drawImage(image,col*w,r*h,w+.03,h+.03);
 const rgba=ctx.getImageData(0,0,N,N).data;const out=new Uint8Array(N*N);
 for(let i=0,j=0;i<out.length;i++,j+=4)out[i]=Math.round(rgba[j]*.299+rgba[j+1]*.587+rgba[j+2]*.114);
 c.width=c.height=0;return out;
}
function prep(style,gauge){
 const key=style+'|'+gauge;if(shadeCache.has(key))return shadeCache.get(key);
 const [cols,rows]=count(gauge,style),front=imageArray(assets.front,cols,rows),
 back=style==='rib'||style==='seed'?imageArray(assets.back,cols,rows):null,
 alpha=imageArray(assets.alpha,cols,rows),shading=new Float32Array(N*N),coverage=new Float32Array(N*N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x,c=Math.floor(x*cols/N),r=Math.floor(y*rows/N);
  const purl=style==='rib'?c%4>=2:style==='seed'?(r+c)%2===1:false;
  const source=back&&purl?back:front;
  let k=i;
  if(style==='cable')k=y*N+mod(Math.floor(x+N*.06*Math.sin(4*Math.PI*y/N)*Math.sin(Math.PI*x/N)**2),N);
  const H=source[k]/255,A=alpha[k]/255;
  const xp=mod(x+1,N),xm=mod(x-1,N),yp=mod(y+1,N),ym=mod(y-1,N);
  const dx=(source[y*N+xp]-source[y*N+xm])/510,dy=(source[yp*N+x]-source[ym*N+x])/510;
  const nx=-dx*28,ny=-dy*28,dot=Math.max(0,(nx*.45-ny*.5+.75)/Math.hypot(nx,ny,1));
  shading[i]=clamp((.17+1.08*dot)*(.19+.81*H**.45),.06,1.5);
  coverage[i]=A;
 }
 if(shadeCache.size>=3)shadeCache.clear();
 const val={shading,coverage,cols,rows};shadeCache.set(key,val);return val;
}
export function render(canvas,{style='stockinette',gauge='superchunky',main='#e2d2b7',contrast='#9b403b'}={}){
 if(!assets.front)throw Error('Source maps not loaded');
 const {shading,coverage,cols,rows}=prep(style,gauge),base=rgb(main),other=rgb(contrast);
 canvas.width=canvas.height=N;const ctx=canvas.getContext('2d',{alpha:false}),img=ctx.createImageData(N,N),p=img.data;
 for(let y=0;y<N;y++){
  const r=Math.floor(y*rows/N);
  for(let x=0;x<N;x++){
   const i=y*N+x,j=i*4,c=Math.floor(x*cols/N);
   const pattern=style==='fairisle'&&chart[mod(r,8)][mod(c,8)]==='#',colour=pattern?other:base;
   const multiplier=shading[i]*(.18+.82*coverage[i]);
   const jitter=(((x*7381+y*2731)>>>0)%17-8)/1000;
   for(let k=0;k<3;k++)p[j+k]=Math.round(clamp(colour[k]*(multiplier+jitter),0,255));
   p[j+3]=255;
  }
 }
 ctx.putImageData(img,0,0);
 return canvas;
}
export function repeat(tile,output){
 output.width=output.height=720;const c=output.getContext('2d',{alpha:false});
 for(let y=0;y<3;y++)for(let x=0;x<3;x++)c.drawImage(tile,x*240,y*240,240,240);
}
