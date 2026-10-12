import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={window:{}};
runInNewContext(readFileSync(new URL('../app/js/stroke-closure.js',import.meta.url),'utf8'),context);
const {closeNearLoop}=context.window.PatternForgeStrokeClosure;
const ellipse=(cx,cy,rx,ry,n=25,start=0,end=2*Math.PI)=>Array.from({length:n},(_,i)=>{const a=start+(end-start)*i/(n-1);return {x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry}});
const closed=(p,o)=>closeNearLoop(p,o);
test('near-complete loop meets the same end in precise editable geometry',()=>{
 const sample=ellipse(200,220,90,58,31,0,Math.PI*1.98),before=JSON.stringify(sample),result=closed(sample,{tolerance:18});
 assert(result?.closed);assert.equal(result.points.length,sample.length+1);
 assert.deepEqual(JSON.parse(JSON.stringify(result.points.at(-1))),sample[0]);
 assert.equal(JSON.stringify(sample),before,'never mutate saved original arrays');
});
test('open strokes, pen flicks, tiny dabs and partial circles are never joined',()=>{
 for(const p of [ellipse(200,220,90,58,31,0,Math.PI),ellipse(200,220,90,58,31,0,Math.PI*1.5),[{x:1,y:1},{x:2,y:2}],Array.from({length:30},(_,i)=>({x:i*.7,y:0}))])
   assert.equal(closed(p,{tolerance:18}),null);
});
test('path spanning repeated tile edge closes against nearest periodic start',()=>{
 const size=4000;const points=ellipse(3940,2200,135,82,41,0,Math.PI*1.99);
 const result=closed(points,{tolerance:32,period:size});
 assert(result?.closed);assert.equal(result.points.at(-1).x,points[0].x);
 const shifted=points.map((p,i)=>i>24?{...p,x:p.x+size}:p);
 assert.equal(closed(shifted,{tolerance:32,period:size}),null,'discontinuous paths are not misread as closed loops');
});
test('repeated periodic traversal snaps to exact periodic start without distorting saved coordinates',()=>{
 const p=Array.from({length:50},(_,i)=>{const t=i/49;return {x:200+4000*t,y:200+110*Math.sin(2*Math.PI*t)}});
 const result=closed(p,{tolerance:30,period:4000});
 assert(result?.closed);assert.equal(result.points.at(-1).x,p[0].x+4000);
 assert.equal(result.points.at(-1).y,p[0].y);
});
test('invalid, giant tolerance and already-closed loops are safe',()=>{
 const p=ellipse(200,200,95,95,31);
 assert.equal(closed(p,{tolerance:Infinity}),null);
 assert.equal(closed(p,{tolerance:-2}),null);
 const r=closed(p,{tolerance:20});assert(r?.closed);assert.equal(r.points.length,p.length);
 assert.equal(r.points.at(-1).x,p[0].x);assert.equal(r.points.at(-1).y,p[0].y);
 assert.equal(closed([{x:0,y:0},{x:Infinity,y:1},{x:0,y:0}],{minPoints:3}),null);
});
