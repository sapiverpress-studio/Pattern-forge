import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('app/js/shape-clean.js','utf8'),sandbox);
const fit=sandbox.window.PatternForgeShapeClean.fit;
const point=(x,y)=>({x,y});
function ellipse(cx,cy,rx,ry,n=90){
  return Array.from({length:n+1},(_,i)=>{
    const a=i/n*Math.PI*2;
    const wobble=1+.025*Math.sin(a*7)+.013*Math.cos(a*13);
    return point(cx+Math.cos(a)*rx*wobble,cy+Math.sin(a)*ry*wobble);
  });
}
function poly(vertices,steps=23,noise=2.2){
  const output=[];
  for(let i=0;i<vertices.length;i++){
    const a=vertices[i],b=vertices[(i+1)%vertices.length];
    for(let j=0;j<steps;j++){
      const t=j/steps;
      output.push(point(a.x+(b.x-a.x)*t+noise*Math.sin((i*steps+j)*2.1),a.y+(b.y-a.y)*t+noise*Math.cos((i*steps+j)*1.6)));
    }
  }
  output.push({...output[0]});return output;
}
const rect=poly([point(120,110),point(490,120),point(485,300),point(117,293)]);
const square=poly([point(50,50),point(260,52),point(258,260),point(51,257)]);
const triangle=poly([point(155,70),point(370,345),point(45,330)]);
const angledTriangle=poly([point(110,50),point(390,185),point(70,390)]);
const tests=[
 ['circle',ellipse(340,250,150,150),'circle','ellipse'],
 ['oval',ellipse(340,250,170,105),'oval','ellipse'],
 ['rectangle',rect,'rectangle','rect'],
 ['square',square,'square','rect'],
 ['triangle',triangle,'triangle','brush'],
 ['angled triangle',angledTriangle,'triangle','brush']
];
for(const [label,points,kind,type] of tests){
 const unchanged=JSON.stringify(points);
 const result=fit(points);
 assert(result,label+' should be recognised');
 assert.equal(result.kind,kind,label+' correct classification');
 assert.equal(result.type,type,label+' correct editable representation');
 assert.equal(JSON.stringify(points),unchanged,'must not mutate freehand input');
 const oldBounds=[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y))];
 const newBounds=[Math.min(...result.points.map(p=>p.x)),Math.max(...result.points.map(p=>p.x)),Math.min(...result.points.map(p=>p.y)),Math.max(...result.points.map(p=>p.y))];
 for(let i=0;i<4;i++)assert(Math.abs(oldBounds[i]-newBounds[i])<17,label+' original bounding size and position preserved');
 if(type==='brush')assert.deepEqual(result.points[0],result.points.at(-1),'triangle closes as clean polygon outline');
 console.log('PASS Shape Clean geometry',label,'confidence',result.confidence.toFixed(3));
}
const open=ellipse(200,200,120,120,80).slice(0,58);
assert.equal(fit(open),null,'open C must not be falsely closed');
const line=Array.from({length:30},(_,i)=>point(10+i*12,100+3*Math.sin(i)));
assert.equal(fit(line),null,'straight pen stroke must stay untouched');
const randomScribble=Array.from({length:120},(_,i)=>point(250+100*Math.cos(i*.65),250+100*Math.sin(i*1.07)));randomScribble.push({...randomScribble[0]});
assert.equal(fit(randomScribble),null,'scribbles must not be mistaken for shapes');
assert.equal(fit([]),null);
assert.equal(fit(null),null);
console.log('PASS Shape Clean guards for open and ambiguous drawings');
