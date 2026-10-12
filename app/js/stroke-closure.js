(()=>{
  "use strict";
  // Geometry-only helper shared by drawing code and isolated regression tests.
  // Working coordinates are unwrapped tile coordinates; a stroke may cross a seam.
  function closeNearLoop(points,{tolerance=24,period=0,minPoints=7}={}){
    if(!Array.isArray(points)||points.length<minPoints)return null;
    const tol=Number(tolerance),size=Number(period);
    if(!Number.isFinite(tol)||tol<=0||!Number.isFinite(size)||size<0)return null;
    const first=points[0],last=points.at(-1);
    if(![first?.x,first?.y,last?.x,last?.y].every(Number.isFinite))return null;
    const target=size>0?{
      x:first.x+Math.round((last.x-first.x)/size)*size,
      y:first.y+Math.round((last.y-first.y)/size)*size
    }:{x:first.x,y:first.y};
    if(Math.hypot(target.x-last.x,target.y-last.y)>tol)return null;
    let travel=0,maxDistance=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(![a?.x,a?.y,b?.x,b?.y].every(Number.isFinite))return null;
      const segment=Math.hypot(b.x-a.x,b.y-a.y);
      // Real seam crossing uses unwrapped coordinates. Reject giant artificial
      // jumps rather than mistaking a broken stroke for a closed loop.
      if(size>0&&segment>size*.45)return null;
      travel+=segment;
      maxDistance=Math.max(maxDistance,Math.hypot(b.x-first.x,b.y-first.y));
    }
    // Reject short dabs, almost-straight corrections and small accidental hooks.
    if(travel<4*tol||maxDistance<2*tol)return null;
    const closedPoint={...first,x:target.x,y:target.y};
    // Keep the exact final point for a genuinely closed loop; otherwise add the
    // seam-matching endpoint, preserving original editable strokes for Undo.
    const alreadyClosed=Math.hypot(target.x-last.x,target.y-last.y)<.001;
    return alreadyClosed?{points,closed:true}:{points:[...points,closedPoint],closed:true};
  }
  window.PatternForgeStrokeClosure=Object.freeze({closeNearLoop});
})();
