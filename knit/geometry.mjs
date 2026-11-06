/**
 * A yarn-level, continuous course model. MIT-licensed mathematical reference:
 * Keenan Crane, "A Simple Parametric Model of Plain-Knit Yarns" (2023)
 * https://github.com/keenancrane/plain-knit-yarn
 * Analytic centreline x=t+a*sin(2t), y=h*cos(t), z=d*cos(2t).
 * This module is a JavaScript adaptation with stitch operations and screen projection.
 * This is a visual model, not mechanical knitting instructions.
 */
export const TAU=Math.PI*2;
export const mod=(v,n)=>((v%n)+n)%n;
export function curve(t,a=1.5,h=4,d=1){
 return {x:t+a*Math.sin(2*t),y:h*Math.cos(t),z:d*Math.cos(2*t)};
}
export function stitchPoint(row,course,phase,pitch,style='stockinette',type='knit'){
 // Complete course has exactly one loop per pitch; the endpoints of adjacent stitches coincide.
 const t=course*TAU+phase,base=curve(t);
 let x=(base.x/TAU)*pitch;
 let y=(row+.5)*pitch-(base.y/4.5)*pitch;
 let z=base.z;
 if(type==='purl'){
   // Reversed outward crossing and frontal purl bump. Endpoints remain continuous.
   z=-z;
   y+=pitch*.16*Math.sin(phase*.5)**2;
 }
 if(style==='cable'){
   const col=mod(course,8);
   if(col>=2&&col<=5){
     const group=col<=3?1:-1;
     const rowPhase=(mod(row,8)+.5)*Math.PI/4;
     const smooth=Math.sin(Math.PI*phase/TAU)**2;
     x+=pitch*.56*group*Math.sin(rowPhase)*smooth;
     z+=.24*group*Math.cos(rowPhase)*smooth;
   }
 }
 return {x,y,z};
}
export function numericTangent(row,course,phase,pitch,style,type){
 const delta=1e-3;
 const a=stitchPoint(row,course,phase-delta,pitch,style,type);
 const b=stitchPoint(row,course,phase+delta,pitch,style,type);
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
 return {tx:dx/len,ty:dy/len,nx:-dy/len,ny:dx/len};
}
