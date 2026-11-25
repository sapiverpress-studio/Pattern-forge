const test=require('node:test');
const assert=require('node:assert/strict');
// Load the browser bundle with its explicit CommonJS test target. The repository
// is type:module, so require(.js) otherwise returns an empty ES module namespace.
const bundle={exports:{}};
new Function('module',require('node:fs').readFileSync(require('node:path').join(__dirname,'../app/js/two-product-export.js'),'utf8'))(bundle);
const {PHONE_SIZES,layout,squareGrid,groupFiles,zipStored,manifest,wallpaper}=bundle.exports;
const settings={name:'Space',colour:'#111122',repeats:2,patternPrice:3.49,wallPrice:1.49,ai:false,tags:[]};
test('square and rectangular complete cells retain aspect',()=>{
 assert.deepEqual(squareGrid(5000,5000,5000),{across:1,down:1,tileWidth:5000,tileHeight:5000,renderSize:5000});
 const g=squareGrid(1500,1000,5000);assert.equal(g.across,2);assert.equal(g.down,3);
 assert.equal(g.tileWidth/g.tileHeight,1.5);
 assert.equal(g.tileWidth*g.across,g.tileHeight*g.down);
 assert.throws(()=>squareGrid(999,1000,5000),/rectangular/);
});
test('wallpaper positions are integers and cover the canvas across all four dimensions',()=>{
 const canvases=[];
 global.document={createElement(){
  const c={width:0,height:0,draws:[]};
  c.getContext=()=>({drawImage:(...args)=>c.draws.push(args),fillRect(){}});canvases.push(c);return c;
 }};
 try{
  for(const [w,h] of PHONE_SIZES){
   for(const scale of [1,2,2.25,6]){
    const c=wallpaper({width:1500,height:1000},w,h,'#111122',scale);
    const n=layout(w,scale),m=Math.round(n*1000/1500);
    assert.ok(c.draws.every(a=>Number.isInteger(a[1])&&Number.isInteger(a[2])));
    const xs=[...new Set(c.draws.map(a=>a[1]))],ys=[...new Set(c.draws.map(a=>a[2]))];
    assert.ok(xs[0]<=0&&xs.at(-1)+n>=w);assert.ok(ys[0]<=0&&ys.at(-1)+m>=h);
    assert.ok(xs.slice(1).every((x,i)=>x-xs[i]===n));assert.ok(ys.slice(1).every((y,i)=>y-ys[i]===m));
   }
  }
 }finally{delete global.document;}
});
test('ZIP grouping preserves all artwork without exceeding attachment cap',()=>{
 const f=(name,size)=>({name,blob:{size}});
 const docs=[f('README.txt',50),f('LICENSE.txt',50)];
 const art=[f('a.png',1200),f('b.png',1200),f('c.png',500),f('d.png',500)];
 const g=groupFiles(art,docs,2500);assert.equal(g.flat().length,4);assert.ok(g.length>=2);
 assert.throws(()=>groupFiles([f('too-big.png',2500)],docs,2500),/cannot fit/);
});
test('seller manifest is stored and ZIP local and central offsets are valid',async()=>{
 const bytes=await (await zipStored([{name:'LISTING-METADATA.json',blob:new Blob(['{"hello":1}'])},{name:'README.txt',blob:new Blob(['Read me'])}])).arrayBuffer();
 const v=new DataView(bytes),b=new Uint8Array(bytes);
 assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint16(8,true),0);
 assert.equal(v.getUint32(bytes.byteLength-22,true),0x06054b50);
 const central=v.getUint32(bytes.byteLength-6,true);
 assert.equal(v.getUint32(central,true),0x02014b50);
 assert.equal(v.getUint16(central+10,true),0);
 assert.equal(new TextDecoder().decode(b.slice(30,30+v.getUint16(26,true))),'LISTING-METADATA.json');
});
test('manifests distinguish one wallpaper design from two-size pattern and disclose AI only when selected',()=>{
 const w=manifest('wallpaper',settings,{},0).product,p=manifest('pattern',{...settings,ai:true},{},2).product;
 assert.equal(w.wallpaperCount,1);assert.equal(w.wallpaperSizes.length,4);assert.equal(w.packProfile,'one-design-four-sizes');
 assert.equal(p.packProfile,'two-size-pair');assert.equal(p.seamlessConfirmed,true);
 assert.doesNotMatch(w.description,/AI/);assert.match(p.description,/AI/);assert.match(p.description,/numbered/);assert.ok(w.price<p.price);
});
