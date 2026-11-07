/* Material-guided stitch ownership map for experimental three-yarn layering.
 * Identify the naturally DARK grooves in the *existing wool photograph*.
 * This makes the dye boundaries follow knitted fibres, not chart rectangles
 * or artificially drawn V-shaped marks. No external assets or network calls.
 *
 * Each pixel encodes native stitch column/row and an opacity confidence.
 * Precomputation: 256x256, performed once per wool material in the browser.
 * The three identical yarn materials are composed by shader.frag.
 */
export const OWNER_SIZE=512;
export const NATIVE_STITCHES=Object.freeze({
 stockinette:[16,11],
 rib:[11,12],
 seed:[15,21],
 cable:[4,6],
 fairisle:[16,11]
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const wrap=(i,n)=>(i%n+n)%n;

function findGrooves(gray,count,vertical){
 const side=OWNER_SIZE,pitch=side/count;
 const radius=clamp(Math.round(pitch*.34),2,14);
 const span=radius*2+1;
 function at(line,pixel){
  const p=wrap(Math.round(pixel),side);
  return vertical?gray[line*side+p]:gray[p*side+line];
 }
 // Locate seams where the source photograph is darkest on average.
 let phase=0,best=Infinity;
 for(let shift=0;shift<Math.ceil(pitch);shift++){
  let score=0;
  for(let k=0;k<count;k++){
   const x=shift+k*pitch;
   for(let t=0;t<side;t+=6)score+=at(t,x);
  }
  if(score<best){best=score;phase=shift;}
 }
 const result=new Float32Array(side*count);
 for(let k=0;k<count;k++){
  const center=phase+k*pitch;
  const parents=new Int8Array(side*span);
  let last=new Float32Array(span),next=new Float32Array(span);
  for(let q=0;q<span;q++){
   const u=(q-radius)/(radius+1);
   last[q]=at(0,center+q-radius)+.10*u*u;
  }
  for(let line=1;line<side;line++){
   for(let q=0;q<span;q++){
    let min=Infinity,prev=q;
    for(let d=-2;d<=2;d++){
     const p=q+d;if(p<0||p>=span)continue;
     const score=last[p]+Math.abs(d)*.012;
     if(score<min){min=score;prev=p;}
    }
    const u=(q-radius)/(radius+1);
    next[q]=at(line,center+q-radius)+.10*u*u+min;
    parents[line*span+q]=prev;
   }
   const swap=last;last=next;next=swap;
  }
  let q=0;
  for(let i=1;i<span;i++)if(last[i]<last[q])q=i;
  const path=new Float32Array(side);
  for(let line=side-1;line>=0;line--){
   path[line]=center+q-radius;
   if(line)q=parents[line*span+q];
  }
  // Subpixel-smoothed boundaries do not follow fine photographic grain.
  for(let line=0;line<side;line++){
   const smooth=(path[wrap(line-2,side)]+
      2*path[wrap(line-1,side)]+3*path[line]+
      2*path[wrap(line+1,side)]+path[wrap(line+2,side)])/9;
   result[line*count+k]=wrap(smooth,side);
  }
 }
 return result;
}
export function buildStitchOwnership(image,materialStyle='stockinette'){
 const native=NATIVE_STITCHES[materialStyle];
 if(!native)throw Error('Unknown knit material for stitch mapping.');
 const [cols,rows]=native;
 const side=OWNER_SIZE,canvas=document.createElement('canvas');
 canvas.width=canvas.height=side;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 if(!context)throw Error('Stitch mapping cannot read the wool source image.');
 context.filter='blur(1.5px)';
 context.drawImage(image,0,0,side,side);
 const pixels=context.getImageData(0,0,side,side).data;
 const gray=new Float32Array(side*side),hist=new Uint32Array(256);
 for(let i=0;i<gray.length;i++){
  const off=i*4;
  const lum=(pixels[off]*.299+pixels[off+1]*.587+pixels[off+2]*.114)/255;
  gray[i]=lum;hist[clamp(Math.floor(lum*255),0,255)]++;
 }
 function quantile(p){
  const target=gray.length*p;let count=0;
  for(let k=0;k<256;k++){count+=hist[k];if(count>=target)return k/255;}
  return 1;
 }
 const low=quantile(.20),high=Math.max(low+.10,quantile(.65));
 const vertical=findGrooves(gray,cols,true);
 const horizontal=findGrooves(gray,rows,false);
 const data=new Uint8Array(side*side*4);
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  let ix=cols-1,iy=rows-1,dx=side,dy=side;
  // Each seam tracks an actual dark groove, so its neighbouring knitted loop
  // becomes one chart-controlled yarn stitch without a square paint boundary.
  for(let k=0;k<cols;k++){
   const edge=vertical[y*cols+k],distance=Math.abs(x-edge);
   if(x>=edge)ix=k;
   dx=Math.min(dx,distance,side-distance);
  }
  for(let k=0;k<rows;k++){
   const edge=horizontal[x*rows+k],distance=Math.abs(y-edge);
   if(y>=edge)iy=k;
   dy=Math.min(dy,distance,side-distance);
  }
  const fiber=clamp((gray[y*side+x]-low)/(high-low),0,1);
  const seamFade=clamp(Math.min(dx,dy)/6,0,1);
  const opacity=seamFade*(.25+.75*fiber);
  const p=(y*side+x)*4;
  data[p]=Math.round((ix+.5)/cols*255);
  data[p+1]=Math.round((iy+.5)/rows*255);
  data[p+2]=Math.round(opacity*255);
  data[p+3]=255;
 }
 canvas.width=canvas.height=0;
 return {width:side,height:side,cols,rows,data};
}
export function pickLayeredChartCell(uvX,uvY,settings,ownership){
 if(!ownership)return null;
 const gauge={mega:1,super:1,chunky:2,medium:3,fine:4}[settings.gauge]??1;
 let u=uvX,v=uvY;
 const angle=Number(settings.angle);
 if(angle===90)[u,v]=[v,1-u];
 if(angle===180)[u,v]=[1-u,1-v];
 if(angle===270)[u,v]=[1-v,u];
 const variation=(Number(settings.variation)||0)/100;
 const TAU=Math.PI*2;
 const wx=variation*.085*Math.sin(TAU*v)*Math.cos(TAU*(2*u+v));
 const wy=variation*.078*Math.sin(TAU*u)*Math.cos(TAU*(u+2*v));
 const lookupX=u*gauge+wx,lookupY=v*gauge+wy;
 const ix=clamp(Math.floor(wrap(lookupX,1)*ownership.width),0,ownership.width-1);
 const iy=clamp(Math.floor(wrap(lookupY,1)*ownership.height),0,ownership.height-1);
 const i=(iy*ownership.width+ix)*4;
 const nativeX=Math.min(ownership.cols-1,Math.floor(ownership.data[i]/255*ownership.cols));
 const nativeY=Math.min(ownership.rows-1,Math.floor(ownership.data[i+1]/255*ownership.rows));
 const gx=Math.floor(lookupX)*ownership.cols+nativeX;
 const gy=Math.floor(lookupY)*ownership.rows+nativeY;
 const tX=wrap((gx+.5)/(ownership.cols*gauge),1);
 const tY=wrap((gy+.5)/(ownership.rows*gauge),1);
 const size=Number(settings.chartCols)||16;
 return {x:clamp(Math.floor(tX*size),0,size-1),y:clamp(Math.floor((1-tY)*size),0,size-1)};
}
