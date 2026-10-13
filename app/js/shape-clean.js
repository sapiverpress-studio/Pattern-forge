/* One-tap shape recognition for closed freehand marks.
   Returns a clean, editable closed centreline, not a raster overlay.
   Conservative scoring avoids turning arbitrary doodles into geometry. */
(function(){
  "use strict";
  const tau=Math.PI*2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const pointSegmentDistance=(p,a,b)=>{
    const dx=b.x-a.x,dy=b.y-a.y,dd=dx*dx+dy*dy;
    const t=dd?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/dd,0,1):0;
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  };
  function box(points){
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    return {minX,maxX,minY,maxY,w:maxX-minX,h:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function arcResample(input,count){
    const seg=[],cum=[0];let total=0;
    for(let i=0;i<input.length-1;i++){const d=distance(input[i],input[i+1]);seg.push(d);total+=d;cum.push(total);}
    if(total<1)return [];
    const output=[];
    let k=0;
    for(let j=0;j<count;j++){
      const at=j*total/count;while(k<seg.length-1&&cum[k+1]<at)k++;
      const t=seg[k]?clamp((at-cum[k])/seg[k],0,1):0,a=input[k],b=input[k+1];
      output.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    }
    return output;
  }
  function rdp(points,epsilon){
    if(points.length<=2)return points;
    let best=0,idx=0;
    for(let i=1;i<points.length-1;i++){
      const d=pointSegmentDistance(points[i],points[0],points[points.length-1]);
      if(d>best){best=d;idx=i;}
    }
    if(best<=epsilon)return [points[0],points[points.length-1]];
    return [...rdp(points.slice(0,idx+1),epsilon).slice(0,-1),...rdp(points.slice(idx),epsilon)];
  }
  function polygonSimplify(samples,epsilon){
    const centre=box(samples);
    let start=0,big=-1;
    for(let i=0;i<samples.length;i++){
      const r=Math.hypot(samples[i].x-centre.cx,samples[i].y-centre.cy);
      if(r>big){big=r;start=i;}
    }
    const loop=[...samples.slice(start),...samples.slice(0,start),samples[start]];
    const half=Math.floor(samples.length/2);
    const first=rdp(loop.slice(0,half+1),epsilon);
    const second=rdp(loop.slice(half),epsilon);
    let verts=[...first.slice(0,-1),...second.slice(0,-1)];
    // Remove redundant corner candidates that remain on a straight side.
    for(let attempts=0;attempts<8&&verts.length>3;attempts++){
      let smallest=Infinity,drop=-1;
      for(let i=0;i<verts.length;i++){
        const dev=pointSegmentDistance(verts[i],verts[(i-1+verts.length)%verts.length],verts[(i+1)%verts.length]);
        if(dev<smallest){smallest=dev;drop=i;}
      }
      if(smallest>epsilon*1.3)break;
      verts.splice(drop,1);
    }
    return verts;
  }
  function polygonError(points,corners,diag){
    let sum=0;
    for(const p of points){
      let best=Infinity;
      for(let i=0;i<corners.length;i++)best=Math.min(best,pointSegmentDistance(p,corners[i],corners[(i+1)%corners.length]));
      sum+=best*best;
    }
    return Math.sqrt(sum/points.length)/diag;
  }
  function ellipseFit(samples,b){
    const rx=b.w/2,ry=b.h/2;
    let sum=0;
    for(const p of samples){
      const t=Math.hypot((p.x-b.cx)/rx,(p.y-b.cy)/ry);
      sum+=(t-1)*(t-1);
    }
    return Math.sqrt(sum/samples.length)*Math.min(rx,ry)/Math.hypot(b.w,b.h);
  }
  function rectangleFit(samples,b){
    const diag=Math.hypot(b.w,b.h),steps=91;
    let best=null;
    // Orientation is inferred, not forced horizontal. A weak tie favours
    // horizontal when a hand-drawn square is almost upright.
    for(let i=0;i<steps;i++){
      const angle=(i*Math.PI/2)/(steps-1),co=Math.cos(angle),si=Math.sin(angle);
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      const rot=samples.map(p=>{
        const dx=p.x-b.cx,dy=p.y-b.cy,x=dx*co+dy*si,y=-dx*si+dy*co;
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
        return {x,y};
      });
      const w=right-left,h=bottom-top;
      if(w<5||h<5)continue;
      let sum=0,occupied=[0,0,0,0];
      for(const p of rot){
        const ds=[p.y-top,right-p.x,bottom-p.y,p.x-left];
        let nearest=0;for(let j=1;j<4;j++)if(ds[j]<ds[nearest])nearest=j;
        sum+=ds[nearest]*ds[nearest];occupied[nearest]++;
      }
      // All four sides need substantial coverage: protects against triangles,
      // diagonal crossings and open arcs being identified as rectangles.
      if(occupied.some(n=>n<samples.length*.10))continue;
      const score=Math.sqrt(sum/samples.length)/diag;
      const adjusted=score+.0002*Math.min(i,steps-1-i);
      if(!best||adjusted<best.adjusted)best={score,adjusted,angle,left,right,top,bottom,co,si};
    }
    if(!best)return null;
    const ratio=(best.right-best.left)/(best.bottom-best.top);
    const square=ratio>.89&&ratio<1.12;
    if(square){
      const side=((best.right-best.left)+(best.bottom-best.top))/2;
      const mx=(best.right+best.left)/2,my=(best.bottom+best.top)/2;
      best.left=mx-side/2;best.right=mx+side/2;best.top=my-side/2;best.bottom=my+side/2;
    }
    const corners=[{x:best.left,y:best.top},{x:best.right,y:best.top},{x:best.right,y:best.bottom},{x:best.left,y:best.bottom}]
      .map(p=>({x:b.cx+p.x*best.co-p.y*best.si,y:b.cy+p.x*best.si+p.y*best.co}));
    return {name:square?"square":"rectangle",score:best.score,points:corners};
  }
  function signedArea(points){
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;}return area/2;
  }
  function clean(input){
    if(!Array.isArray(input))return null;
    const pts=input.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(pts.length<9)return null;
    const b=box(pts),diag=Math.hypot(b.w,b.h),minSide=Math.min(b.w,b.h);
    if(diag<18||minSide/diag<.11)return null;
    const gap=distance(pts[0],pts[pts.length-1]);
    if(gap>diag*.23)return null;
    let total=gap;
    for(let i=1;i<pts.length;i++)total+=distance(pts[i-1],pts[i]);
    if(total<diag*2.0||total>diag*7.5)return null;
    const closed=[...pts];if(gap>.001)closed.push(pts[0]);
    const samples=arcResample(closed,128);if(samples.length<64)return null;
    const eb=box(samples),eDiag=Math.hypot(eb.w,eb.h);
    // Closed strokes that doubled back over themselves are not a clean shape.
    if(!eDiag||eDiag<18)return null;
    const ellipseScore=ellipseFit(samples,eb);
    let best={name:eb.w/eb.h>.88&&eb.w/eb.h<1.12?"circle":"ellipse",score:ellipseScore+.008,kind:"ellipse"};
    const rect=rectangleFit(samples,eb);
    if(rect&&rect.score<.085&&rect.score+.012<best.score)best={...rect,kind:"polygon"};
    for(const eps of [.03,.048,.07,.09]){
      const corners=polygonSimplify(samples,eDiag*eps);
      if(corners.length!==3)continue;
      const error=polygonError(samples,corners,eDiag);
      if(error<.065&&error+.015<best.score)best={name:"triangle",score:error,points:corners,kind:"polygon"};
    }
    if(best.score>.09)return null;
    let points;
    if(best.kind==="ellipse"){
      const circle=best.name==="circle";
      const rx=circle?(eb.w+eb.h)/4:eb.w/2,ry=circle?rx:eb.h/2;
      const n=192,angle0=Math.atan2((samples[0].y-eb.cy)/ry,(samples[0].x-eb.cx)/rx);
      const orientation=signedArea(samples)>=0?1:-1;
      points=Array.from({length:n},(_,i)=>({x:eb.cx+rx*Math.cos(angle0+orientation*i*tau/n),y:eb.cy+ry*Math.sin(angle0+orientation*i*tau/n)}));
    }else{
      let corners=best.points.slice();
      if(signedArea(corners)*signedArea(samples)<0)corners=corners.reverse();
      points=[];
      for(let i=0;i<corners.length;i++){
        const a=corners[i],b=corners[(i+1)%corners.length],n=Math.max(2,Math.ceil(distance(a,b)/Math.max(2,eDiag/90)));
        for(let j=0;j<n;j++){const t=j/n;points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
      }
    }
    points.push({...points[0]});
    return {shape:best.name,points,score:best.score,original:{x:eb.cx,y:eb.cy,width:eb.w,height:eb.h}};
  }
  window.PatternForgeShapeClean=Object.freeze({clean});
})();
