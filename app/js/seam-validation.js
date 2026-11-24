/* Native-resolution, read-only seam diagnostics. A heuristic, not proof of visual seamlessness. */
(function(root){
"use strict";
function inspectAxis(length, read) {
  let sum=0, localSum=0, run=0, longest=0, flagged=0, first=-1;
  const distance=(a,b)=>{
    const aa=a[3]/255, ba=b[3]/255;
    return Math.max(Math.abs(a[0]*aa-b[0]*ba),Math.abs(a[1]*aa-b[1]*ba),Math.abs(a[2]*aa-b[2]*ba),Math.abs(a[3]-b[3]));
  };
  for(let i=0;i<length;i++){
    // Read from each edge inward, at native pixel resolution.
    const [a,b,c,d,e,f]=read(i);
    const seam=distance(a,d), nearA=distance(a,b), nearB=distance(d,e);
    const local=Math.max(distance(b,c),distance(e,f));
    sum+=seam;localSum+=local;
    // Catch an isolated bright/transparent edge even when BOTH outer edges match.
    const edgeSpike=Math.max(nearA,nearB);
    const bad=Math.max(seam,edgeSpike)>Math.max(20,local*3+10);
    if(bad){flagged++;run++;if(run>longest){longest=run;first=i-run+1;}}
    else run=0;
  }
  const edgeMean=sum/length,localMean=localSum/length;
  const suspicious=longest>=Math.min(24,Math.max(8,Math.ceil(length*.004))) || edgeMean>Math.max(18,localMean*3+8);
  return {edgeMean,localMean,flagged,longest,first,suspicious};
}
function inspectImage(source) {
  const w=source.width,h=source.height;
  if(w<3||h<3)throw Error("Tile too small for native seam analysis");
  // Read only narrow border strips; never allocate a second full-size RGBA canvas.
  function strip(x,y,sw,sh){
    const c=document.createElement("canvas");c.width=sw;c.height=sh;
    try{const ctx=c.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw Error("Seam analysis canvas unavailable");
      ctx.drawImage(source,x,y,sw,sh,0,0,sw,sh);
      return ctx.getImageData(0,0,sw,sh).data;
    }finally{c.width=c.height=0;}
  }
  const l=strip(0,0,3,h),r=strip(w-3,0,3,h),t=strip(0,0,w,3),b=strip(0,h-3,w,3);
  const pixel=(data,index)=>data.subarray(index*4,index*4+4);
  const leftRight=inspectAxis(h,i=>[pixel(l,i*3),pixel(l,i*3+1),pixel(l,i*3+2),pixel(r,i*3+2),pixel(r,i*3+1),pixel(r,i*3)]);
  const topBottom=inspectAxis(w,i=>[pixel(t,i),pixel(t,w+i),pixel(t,2*w+i),pixel(b,2*w+i),pixel(b,w+i),pixel(b,i)]);
  return {width:w,height:h,leftRight,topBottom,pass:!leftRight.suspicious&&!topBottom.suspicious};
}
async function inspectBlob(blob){
  const bitmap=await createImageBitmap(blob);
  try{return inspectImage(bitmap);}finally{bitmap.close();}
}
function describe(result){
  const axes=[["left/right",result.leftRight],["top/bottom",result.topBottom]];
  return result.width+" × "+result.height+" px — "+(result.pass?"No strong edge anomaly detected.":"Inspect flagged joins visually.")+" "+axes.map(([name,m])=>name+": mean "+m.edgeMean.toFixed(1)+", longest suspicious run "+m.longest+" px"+(m.longest?" at offset "+m.first:"")).join("; ")+".";
}
const api={inspectAxis,inspectImage,inspectBlob,describe};
if(typeof module==="object"&&module.exports)module.exports=api;
else root.PatternForgeSeams=api;
})(typeof globalThis!=="undefined"?globalThis:this);
