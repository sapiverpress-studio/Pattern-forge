const {test}=require("node:test");
const assert=require("node:assert/strict");
// Load this browser bundle explicitly as CommonJS under the type:module package.
const bundle={exports:{}};
new Function("module",require("node:fs").readFileSync(require("node:path").join(__dirname,"../app/js/seam-validation.js"),"utf8"))(bundle);
const {inspectAxis,inspectInteriorPixels,mergeLines}=bundle.exports;
const px=(v,a=255)=>[v,v,v,a],flat=px(90),bright=px(255),clear=px(90,0);
test("uniform",()=>assert.equal(inspectAxis(5000,()=>[flat,flat,flat,flat,flat,flat]).suspicious,false));
test("continuous gradient",()=>assert.equal(inspectAxis(5000,()=>[px(90),px(92),px(94),px(88),px(86),px(84)]).suspicious,false));
test("hidden RGB transparent",()=>assert.equal(inspectAxis(5000,()=>[px(255,0),px(0,0),px(0,0),px(0,0),px(100,0),px(0,0)]).suspicious,false));
test("one sided 20px gap",()=>assert.equal(inspectAxis(5000,i=>i>=110&&i<130?[clear,flat,flat,flat,flat,flat]:[flat,flat,flat,flat,flat,flat]).suspicious,true));
test("matching bright borders",()=>assert.equal(inspectAxis(5000,i=>i>=110&&i<130?[bright,flat,flat,bright,flat,flat]:[flat,flat,flat,flat,flat,flat]).suspicious,true));
test("isolated noise",()=>assert.equal(inspectAxis(5000,i=>i===110?[bright,flat,flat,flat,flat,flat]:[flat,flat,flat,flat,flat,flat]).suspicious,false));
test("normal sharp edge texture",()=>assert.equal(inspectAxis(5000,()=>[px(90),px(180),px(90),px(92),px(180),px(90)]).suspicious,false));

function image(w,h,colour){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(colour(x,y),(y*w+x)*4);
 return data;
}
const scan=(data,w,h,vertical=false)=>mergeLines([1,4].flatMap(span=>inspectInteriorPixels(data,w,h,vertical,span)));
test('matching outside borders do not hide an internal horizontal transparent gap',()=>{
 const data=image(400,400,(_x,y)=>px(130,y===200?0:255));
 const lines=scan(data,400,400);
 assert.ok(lines.some(line=>Math.abs(line.position-200)<=4));
});
test('internal vertical cut is detected independently of the outside seam',()=>{
 const data=image(400,400,(x,_y)=>px(x<177?80:190));
 assert.ok(scan(data,400,400,true).some(line=>Math.abs(line.position-177)<=4));
});
test('softened four-pixel internal cut is found by the wider context scan',()=>{
 const data=image(400,400,(_x,y)=>px(80+Math.min(1,Math.max(0,(y-197)/4))*110));
 assert.ok(scan(data,400,400).some(line=>Math.abs(line.position-200)<=8));
});
test('clean continuous fabric waves and a diagonal motif edge do not trigger straight-cut flags',()=>{
 const cloth=image(400,400,(x,y)=>px(120+20*Math.sin(x/9)+18*Math.cos(y/11)));
 const diagonal=image(400,400,(x,y)=>px(x>y?180:70));
 assert.deepEqual(scan(cloth,400,400),[]);
 assert.deepEqual(scan(cloth,400,400,true),[]);
 assert.deepEqual(scan(diagonal,400,400),[]);
 assert.deepEqual(scan(diagonal,400,400,true),[]);
});
test('invisible RGB changes never become interior line warnings',()=>{
 const data=image(400,400,(_x,y)=>px(y<200?0:255,0));
 assert.deepEqual(scan(data,400,400),[]);
});
