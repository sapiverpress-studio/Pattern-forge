/* Read-only join diagnostics. Flags need visual review; absence of flags is not approval. */
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
function inspectInteriorPixels(data,width,height,vertical=false,span=1){
  const length=vertical?width:height,across=vertical?height:width;
  const ring=Array.from({length:4*span+1},()=>new Float32Array(across)),candidates=[];
  for(let row=span;row<length;row++){
    const distances=ring[row%ring.length];
    for(let col=0;col<across;col++){
      const a=(vertical?col*width+row:row*width+col)*4;
      const b=a-(vertical?span:span*width)*4,aa=data[a+3]/255,ba=data[b+3]/255;
      distances[col]=Math.max(Math.abs(data[a]*aa-data[b]*ba),Math.abs(data[a+1]*aa-data[b+1]*ba),Math.abs(data[a+2]*aa-data[b+2]*ba),Math.abs(data[a+3]-data[b+3]));
    }
    if(row<5*span)continue;
    const position=row-2*span;
    const at=offset=>ring[(position+offset+ring.length)%ring.length];
    const mid=at(0),before=at(-span),after=at(span),outerA=at(-2*span),outerB=at(2*span);
    let flagged=0,sum=0,localSum=0;const bins=new Uint32Array(8);
    for(let col=0;col<across;col++){
      const local=Math.max(outerA[col],outerB[col]);sum+=mid[col];localSum+=local;
      if(Math.max(mid[col],before[col],after[col])>Math.max(20,local*3+10)){
        flagged++;bins[Math.min(7,Math.floor(col*8/across))]++;
      }
    }
    const fraction=flagged/across,mean=sum/across,localMean=localSum/across;
    // A broad, unusually abrupt straight cut across several parts of the image.
    // Ordinary stitch/noise gradients are compared with their own nearby texture.
    const occupied=Array.from(bins).filter(n=>n>=Math.max(2,across/8*.05)).length;
    if(fraction>=.10&&flagged>=8&&occupied>=3&&mean>Math.max(10,localMean*1.5+3))
      candidates.push({position,span,fraction,mean,localMean,strength:mean-localMean});
  }
  return candidates;
}
function mergeLines(lines){
  const chosen=[];
  for(const line of [...lines].sort((a,b)=>b.strength-a.strength)){
    if(!chosen.some(other=>Math.abs(other.position-line.position)<=Math.max(4,other.span,line.span)*2))chosen.push(line);
    if(chosen.length===12)break;
  }
  return chosen.sort((a,b)=>a.position-b.position);
}
function inspectInterior(source){
  const maxAcross=768;
  function scan(vertical){
    const canvas=document.createElement('canvas');
    canvas.width=vertical?source.width:Math.min(maxAcross,source.width);
    canvas.height=vertical?Math.min(maxAcross,source.height):source.height;
    try{
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('Interior join analysis unavailable');
      // Keep EVERY native row/column position. Only sample along each line.
      ctx.drawImage(source,0,0,canvas.width,canvas.height);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      return mergeLines([1,4].flatMap(span=>inspectInteriorPixels(data,canvas.width,canvas.height,vertical,span)));
    }finally{canvas.width=canvas.height=0;}
  }
  const horizontal=scan(false),vertical=scan(true);
  return {horizontal,vertical,suspicious:!!(horizontal.length||vertical.length),maxSamplesPerLine:maxAcross};
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
  const interior=inspectInterior(source);
  return {width:w,height:h,leftRight,topBottom,interior,pass:!leftRight.suspicious&&!topBottom.suspicious&&!interior.suspicious};
}
async function inspectBlob(blob){
  const bitmap=await createImageBitmap(blob);
  try{return inspectImage(bitmap);}finally{bitmap.close();}
}
function describe(result){
  const axes=[["left/right",result.leftRight],["top/bottom",result.topBottom]];
  const inside=result.interior;
  const locations=inside?[['horizontal',inside.horizontal],['vertical',inside.vertical]].filter(([,lines])=>lines.length).map(([axis,lines])=>axis+' at '+lines.map(l=>l.position+' px').join(', ')).join('; '):'';
  return result.width+" × "+result.height+" px — "+(result.pass?"No strong join flags; visual review still required.":"Review possible joins.")+" "+axes.map(([name,m])=>name+": mean "+m.edgeMean.toFixed(1)+", longest suspicious run "+m.longest+" px"+(m.longest?" at offset "+m.first:"")).join("; ")+". Interior: "+(inside?(locations||'no strong straight-cut flags')+'. Every row/column scanned, up to '+inside.maxSamplesPerLine+' samples along each line.':'not checked.')+' Intentional straight shapes can also trigger a flag; this is not a visual quality guarantee.';
}
const api={inspectAxis,inspectInteriorPixels,mergeLines,inspectImage,inspectBlob,describe};
if(typeof module==="object"&&module.exports)module.exports=api;
else root.PatternForgeSeams=api;
})(typeof globalThis!=="undefined"?globalThis:this);
