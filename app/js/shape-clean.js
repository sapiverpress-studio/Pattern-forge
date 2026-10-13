/* Shape Clean — convert one nearly closed freehand outline to an editable precise
   ellipse, square/rectangle or triangle without guessing at open/scribbled paths.
   The original input mark remains untouched until the caller commits the result. */
(function(){
  "use strict";
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const segmentDistance=(p,a,b)=>{
    const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  };
  function sampleStroke(points){
    const clean=points.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:p.x,y:p.y}));
    if(clean.length<6)return null;
    const count=clean.length;
    const first=clean[0],last=clean[count-1];
    const minX=Math.min(...clean.map(p=>p.x)),maxX=Math.max(...clean.map(p=>p.x));
    const minY=Math.min(...clean.map(p=>p.y)),maxY=Math.max(...clean.map(p=>p.y));
    const w=maxX-minX,h=maxY-minY,size=Math.min(w,h);
    if(size<6||!Number.isFinite(size))return null;
    const gap=dist(first,last),length=clean.slice(1).reduce((sum,p,i)=>sum+dist(p,clean[i]),0);
    // Never silently close a U, a C or a short freehand line.
    if(gap>Math.max(8,size*.27)||length<2.1*Math.max(w,h))return null;
    let total=0;const cum=[0];
    for(let i=1;i<count;i++){total+=dist(clean[i-1],clean[i]);cum.push(total);}
    if(total<1)return null;
    const samples=[],limit=144;
    for(let j=0;j<limit;j++){
      const target=j*total/(limit-1);
      let lo=0,hi=cum.length-1;
      while(lo+1<hi){const m=(lo+hi)>>1;if(cum[m]<target)lo=m;else hi=m;}
      const from=clean[lo],to=clean[hi],t=(target-cum[lo])/Math.max(.00001,cum[hi]-cum[lo]);
      samples.push({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t});
    }
    return {points:clean,samples,bounds:{minX,maxX,minY,maxY,w,h,cx:(minX+maxX)/2,cy:(minY+maxY)/2},size};
  }
  function hull(points){
    // Convex hull allows a triangular sketch at any angle, not just upright.
    const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),lower=[],upper=[];
    for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
    for(let i=sorted.length-1;i>=0;i--){const p=sorted[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
    return lower.slice(0,-1).concat(upper.slice(0,-1));
  }
  function corners(points){
    const boundary=hull(points);
    if(boundary.length<3)return null;
    const vertices=boundary.length>42?Array.from({length:42},(_,i)=>boundary[Math.floor(i*boundary.length/42)]):boundary;
    let best=-1,triangle=null;
    for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)for(let k=j+1;k<vertices.length;k++){
      const a=Math.abs(cross(vertices[i],vertices[j],vertices[k]));
      if(a>best){best=a;triangle=[vertices[i],vertices[j],vertices[k]];}
    }
    return triangle;
  }
  function scorePolygon(samples,vertices){
    let sum=0;
    for(const p of samples){
      let best=Infinity;
      for(let i=0;i<vertices.length;i++)best=Math.min(best,segmentDistance(p,vertices[i],vertices[(i+1)%vertices.length]));
      sum+=best;
    }
    return sum/samples.length;
  }
  function fit(points){
    if(!Array.isArray(points))return null;
    const source=sampleStroke(points);
    if(!source)return null;
    const {samples,bounds:b,size}=source;
    const rect=[{x:b.minX,y:b.minY},{x:b.maxX,y:b.minY},{x:b.maxX,y:b.maxY},{x:b.minX,y:b.maxY}];
    const rx=b.w/2,ry=b.h/2;
    const scores=[
      {kind:"ellipse",error:samples.reduce((sum,p)=>{
        const qx=(p.x-b.cx)/rx,qy=(p.y-b.cy)/ry;
        return sum+Math.abs(Math.hypot(qx,qy)-1)*Math.min(rx,ry);
      },0)/samples.length},
      {kind:"rectangle",error:scorePolygon(samples,rect)}
    ];
    const tri=corners(samples);
    if(tri)scores.push({kind:"triangle",error:scorePolygon(samples,tri)});
    scores.sort((a,b)=>a.error-b.error);
    const chosen=scores[0],relativeError=chosen.error/size;
    if(relativeError>.135)return null; // uncertain outline: no destructive conversion
    if(chosen.kind==="ellipse"){
      const isCircle=Math.abs(b.w-b.h)/Math.max(b.w,b.h)<.11;
      const radius=(rx+ry)/2;
      const x0=isCircle?b.cx-radius:b.minX,y0=isCircle?b.cy-radius:b.minY;
      const x1=isCircle?b.cx+radius:b.maxX,y1=isCircle?b.cy+radius:b.maxY;
      return {kind:isCircle?"circle":"oval",type:"ellipse",points:[{x:x0,y:y0},{x:x1,y:y1}],confidence:1-relativeError};
    }
    if(chosen.kind==="rectangle"){
      const isSquare=Math.abs(b.w-b.h)/Math.max(b.w,b.h)<.11;
      const radius=(b.w+b.h)/4;
      return {kind:isSquare?"square":"rectangle",type:"rect",points:[
        {x:isSquare?b.cx-radius:b.minX,y:isSquare?b.cy-radius:b.minY},
        {x:isSquare?b.cx+radius:b.maxX,y:isSquare?b.cy+radius:b.maxY}
      ],confidence:1-relativeError};
    }
    const ordered=tri.slice().sort((a,b)=>Math.atan2(a.y-b.cy,a.x-b.cx)-Math.atan2(b.y-b.cy,b.x-b.cx));
    ordered.push({...ordered[0]});
    return {kind:"triangle",type:"brush",points:ordered,confidence:1-relativeError};
  }
  window.PatternForgeShapeClean=Object.freeze({fit});
})();
