/* Image transparency verification and conservative flat-background repair.
   Never remove detailed/gradient backgrounds automatically or alter the source. */
(()=>{
  "use strict";
  const sampleSize=128,maximumRepairPixels=6_000_000;
  const rgbaDiff=(data,index,c)=>Math.max(
    Math.abs(data[index]-c[0]),Math.abs(data[index+1]-c[1]),Math.abs(data[index+2]-c[2]));
  const canvasFor=(img,w,h)=>{
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw Error("Canvas inspection unavailable.");
    ctx.drawImage(img,0,0,w,h);return {canvas,ctx};
  };
  function analyse(img){
    const iw=Number(img?.naturalWidth||img?.width)||1,ih=Number(img?.naturalHeight||img?.height)||1;
    const ratio=Math.min(1,sampleSize/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*ratio)),h=Math.max(1,Math.round(ih*ratio));
    try{
      const {canvas,ctx}=canvasFor(img,w,h),data=ctx.getImageData(0,0,w,h).data;
      let clear=0,partial=0,opaque=0;
      for(let i=3;i<data.length;i+=4){
        const a=data[i];
        if(a<=16)clear++;else if(a<248)partial++;else opaque++;
      }
      const pixels=w*h,transparent=clear/pixels>.002||partial/pixels>.01;
      const corners=[0,(w-1)*4,((h-1)*w)*4,(w*h-1)*4];
      const color=[0,1,2].map(k=>Math.round(corners.reduce((v,i)=>v+data[i+k],0)/4));
      const spread=Math.max(...corners.map(i=>rgbaDiff(data,i,color)));
      let edgeCount=0,edgeSimilar=0;
      const check=(x,y)=>{const i=(y*w+x)*4;edgeCount++;if(data[i+3]>245&&rgbaDiff(data,i,color)<37)edgeSimilar++;};
      for(let x=0;x<w;x++){check(x,0);if(h>1)check(x,h-1);}
      for(let y=1;y<h-1;y++){check(0,y);if(w>1)check(w-1,y);}
      const flatEdge=spread<=27&&edgeSimilar/Math.max(1,edgeCount)>.80;
      canvas.width=1;canvas.height=1;
      return {
        transparent,hasAlpha:clear+partial>0,
        emptyPercent:Math.round(clear/pixels*100),
        flatBackground:!transparent&&flatEdge,
        type:transparent?"transparent":flatEdge?"solid":"opaque",
        label:transparent?"Transparent background":flatEdge?"Solid background detected":"Opaque / background may be baked into image",
        canClean:!transparent&&flatEdge&&iw*ih<=maximumRepairPixels
      };
    }catch(_){
      return {transparent:false,hasAlpha:false,type:"unknown",label:"Transparency could not be verified",flatBackground:false,canClean:false};
    }
  }
  async function removeSolid(img){
    const details=analyse(img);
    if(details.transparent)throw Error("This image already has transparency.");
    if(!details.flatBackground)throw Error("Background is not a simple solid colour. Export a genuine transparent PNG from the background-removal tool.");
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,n=w*h;
    if(n>maximumRepairPixels)throw Error("Image exceeds the safe on-device cleanup limit. Use a transparent PNG exported by the background-removal tool.");
    const {canvas,ctx}=canvasFor(img,w,h),result=ctx.getImageData(0,0,w,h),d=result.data;
    const corners=[0,(w-1)*4,(h-1)*w*4,(n-1)*4];
    const bg=[0,1,2].map(k=>Math.round(corners.reduce((sum,i)=>sum+d[i+k],0)/4));
    if(Math.max(...corners.map(i=>rgbaDiff(d,i,bg)))>27)throw Error("The corners are not one solid colour; cleanup would risk the artwork.");
    const queue=new Int32Array(n),seen=new Uint8Array(n);
    let head=0,tail=0,removed=0,blended=0;
    const offer=(idx)=>{
      if(idx<0||idx>=n||seen[idx])return;
      seen[idx]=1;const at=idx*4;
      if(d[at+3]<16||rgbaDiff(d,at,bg)>74)return;
      queue[tail++]=idx;
    };
    for(let x=0;x<w;x++){offer(x);offer((h-1)*w+x);}
    for(let y=1;y<h-1;y++){offer(y*w);offer(y*w+w-1);}
    while(head<tail){
      const p=queue[head++],at=p*4,diff=rgbaDiff(d,at,bg);
      // Only connected background pixels are affected. Anti-aliased edges
      // are dematted to avoid an obvious white halo.
      const opacity=diff<=24?0:Math.min(1,(diff-24)/50);
      if(opacity<.999){
        if(opacity===0){d[at]=0;d[at+1]=0;d[at+2]=0;d[at+3]=0;removed++;}
        else{
          for(let k=0;k<3;k++)d[at+k]=Math.max(0,Math.min(255,Math.round((d[at+k]-bg[k]*(1-opacity))/opacity)));
          d[at+3]=Math.round(d[at+3]*opacity);blended++;
        }
      }
      const x=p%w,y=Math.floor(p/w);
      if(x>0)offer(p-1);if(x+1<w)offer(p+1);
      if(y>0)offer(p-w);if(y+1<h)offer(p+w);
    }
    if((removed+blended)<Math.max(10,n*.008))throw Error("Could not identify a safe edge-connected background; original image remains unchanged.");
    ctx.putImageData(result,0,0);
    const src=canvas.toDataURL("image/png");canvas.width=1;canvas.height=1;
    return {src,w,h,removed,blended};
  }
  window.PatternForgeAlpha=Object.freeze({analyse,removeSolid});
})();
