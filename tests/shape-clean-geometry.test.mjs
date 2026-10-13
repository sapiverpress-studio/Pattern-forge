import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('app/js/shape-clean.js','utf8'),sandbox);
const shape=sandbox.window.PatternForgeShapeClean;
const box=pts=>({w:Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)),h:Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))});
function ellipse(rx,ry,noise=0,cx=500,cy=500){
 return Array.from({length:128},(_,i)=>{const t=Math.PI*2*i/128;return {x:cx+rx*Math.cos(t)+noise*Math.cos(9*t+1),y:cy+ry*Math.sin(t)+noise*Math.sin(7*t)}});
}
function polygon(corners,noise=6){
 const out=[];for(let i=0;i<corners.length;i++){
  const a=corners[i],b=corners[(i+1)%corners.length];
  for(let j=0;j<32;j++){
   const t=j/32,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   out.push({x:x+noise*Math.sin(Math.PI*t)*Math.sin(j*1.31+i),y:y+noise*Math.sin(Math.PI*t)*Math.cos(j*1.13+i)});
  }
 }return out;
}
const cases=[
 ['circle',ellipse(150,144,7),'circle'],
 ['ellipse',ellipse(185,103,5),'ellipse'],
 ['square',polygon([{x:300,y:320},{x:590,y:320},{x:590,y:610},{x:300,y:610}]),'square'],
 ['rectangle',polygon([{x:210,y:330},{x:600,y:330},{x:600,y:510},{x:210,y:510}]),'rectangle'],
 ['triangle',polygon([{x:280,y:300},{x:620,y:300},{x:450,y:610}]),'triangle'],
 ['rotated rectangle',polygon([{x:400,y:280},{x:600,y:480},{x:510,y:570},{x:310,y:370}]),'rectangle']
];
for(const [label,p,expected] of cases){
 const out=shape.clean([...p,p[0]]);
 assert(out,'recognition returned null for '+label);
 assert.equal(out.shape,expected,label+' classified as '+out.shape+' score '+out.score);
 assert(out.points.length>10);
 assert(Math.hypot(out.points[0].x-out.points.at(-1).x,out.points[0].y-out.points.at(-1).y)<.00001,'closed');
 const a=box(p),b=box(out.points);
 assert(Math.abs(a.w-b.w)/a.w<.12&&Math.abs(a.h-b.h)/a.h<.12,label+' size changed too much '+JSON.stringify({a,b}));
 assert(out.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));
 console.log('PASS',label,'shape recognition and same dimensions',out.score.toFixed(3));
}
const open=Array.from({length:64},(_,i)=>({x:i*4,y:200+Math.sin(i*.05)*40}));
assert.equal(shape.clean(open),null,'open line should not be altered');
const zig=Array.from({length:120},(_,i)=>{const a=i*2*Math.PI/120,r=i%2?120:45;return {x:450+Math.cos(a)*r,y:450+Math.sin(a)*r};});
assert.equal(shape.clean([...zig,zig[0]]),null,'non geometric squiggle should be left unchanged');
console.log('PASS open stroke and irregular squiggle unchanged');
