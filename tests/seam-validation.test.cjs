const {test}=require("node:test");
const assert=require("node:assert/strict");
// Load this browser bundle explicitly as CommonJS under the type:module package.
const bundle={exports:{}};
new Function("module",require("node:fs").readFileSync(require("node:path").join(__dirname,"../app/js/seam-validation.js"),"utf8"))(bundle);
const {inspectAxis}=bundle.exports;
const px=(v,a=255)=>[v,v,v,a],flat=px(90),bright=px(255),clear=px(90,0);
test("uniform",()=>assert.equal(inspectAxis(5000,()=>[flat,flat,flat,flat,flat,flat]).suspicious,false));
test("continuous gradient",()=>assert.equal(inspectAxis(5000,()=>[px(90),px(92),px(94),px(88),px(86),px(84)]).suspicious,false));
test("hidden RGB transparent",()=>assert.equal(inspectAxis(5000,()=>[px(255,0),px(0,0),px(0,0),px(0,0),px(100,0),px(0,0)]).suspicious,false));
test("one sided 20px gap",()=>assert.equal(inspectAxis(5000,i=>i>=110&&i<130?[clear,flat,flat,flat,flat,flat]:[flat,flat,flat,flat,flat,flat]).suspicious,true));
test("matching bright borders",()=>assert.equal(inspectAxis(5000,i=>i>=110&&i<130?[bright,flat,flat,bright,flat,flat]:[flat,flat,flat,flat,flat,flat]).suspicious,true));
test("isolated noise",()=>assert.equal(inspectAxis(5000,i=>i===110?[bright,flat,flat,flat,flat,flat]:[flat,flat,flat,flat,flat,flat]).suspicious,false));
test("normal sharp edge texture",()=>assert.equal(inspectAxis(5000,()=>[px(90),px(180),px(90),px(92),px(180),px(90)]).suspicious,false));
