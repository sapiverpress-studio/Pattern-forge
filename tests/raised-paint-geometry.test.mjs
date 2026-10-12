import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('app/js/raised-paint.js','utf8'),sandbox);
const oil=sandbox.window.PatternForgeRaisedPaint;
assert.deepEqual(Array.from(oil.styles),['impasto','piped','knife']);
function mark(style,texture=.8,pressureWidth=false){
  return {id:17,type:'brush',brushStyle:style,color:'#e88932',width:24,texture,opacity:1,
    pressureWidth,pressureMin:15,pressureSensitivity:100,
    points:[{x:10,y:20,p:.15},{x:32,y:18,p:.4},{x:65,y:40,p:1},{x:80,y:75,p:.9}]};
}
const fake={
  globalAlpha:.75,
  calls:[],save(){this.calls.push('save')},restore(){this.calls.push('restore')},
  beginPath(){this.calls.push('begin')},moveTo(){},lineTo(){},closePath(){},
  fill(){this.calls.push('fill')},arc(){this.calls.push('arc')},
  set fillStyle(c){this.calls.push(c)}
};
for(const style of oil.styles){
  const m=mark(style),svg=oil.toSVG(m);
  assert(svg&&svg.includes('<path d="M')&&svg.includes('<circle'),'vector relief must use actual geometry');
  assert(svg.includes('fill="#')&&!svg.includes('NaN')&&!svg.includes('Infinity'));
  assert.equal(svg,oil.toSVG(m),'relief must render deterministically');
  assert.notEqual(svg,oil.toSVG({...m,texture:0}),'relief strength must change groove geometry/shading');
  assert.notEqual(svg,oil.toSVG(mark(style,.8,true)),'pen pressure changes relief thickness');
  fake.calls=[];assert.equal(oil.draw(fake,m),true);
  assert(fake.calls.filter(x=>x==='fill').length>=8,'each brush must actually paint several pigment bands');
  assert.equal(fake.globalAlpha,.75,'renderer must restore outer opacity');
  console.log('PASS',style,'canvas paint, vector relief, deterministic shading and pressure');
}
assert.notEqual(oil.toSVG(mark('impasto')),oil.toSVG(mark('piped')));
assert.notEqual(oil.toSVG(mark('piped')),oil.toSVG(mark('knife')));
assert.equal(oil.toSVG(mark('ink')),null);
assert.equal(oil.draw(fake,mark('ink')),false);
// Long gesture must preserve its final coordinate rather than truncate samples.
const long=mark('impasto');long.points=[{x:0,y:0},{x:1900,y:300}];
const result=oil.toSVG(long);
assert(result.includes('1900')&&result.length<900000,'keep extended editable strokes exportable');
console.log('PASS all raised-paint geometry assertions');
