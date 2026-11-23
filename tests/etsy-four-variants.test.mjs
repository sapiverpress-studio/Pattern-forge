import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../app/js/etsy-four-variants.js',import.meta.url),'utf8');
const window={};
new Function('window',src)(window);
const packer=window.PatternForgeFourVariants;
class SizedBlob{constructor(size){this.size=size;}}
const original={name:'sapiver-trains-seamless-master.png',blob:new SizedBlob(8_000_000),spec:{wPx:5000,hPx:5000,dpi:300}};
const versions=(bytes=2_000_000)=>['#f7eee2','#d6e7ec','#b9cdbe'].map((colour,i)=>({
  colour,assets:[
    {name:'sapiver-trains-colour-'+(i+1)+'-'+colour.slice(1)+'-1800x1800.png',blob:new SizedBlob(bytes),spec:{wPx:1800,hPx:1800,dpi:300}},
    {name:'sapiver-trains-colour-'+(i+1)+'-'+colour.slice(1)+'-900x900.png',blob:new SizedBlob(Math.round(bytes/4)),spec:{wPx:900,hPx:900,dpi:300}}
  ]
}));
const makeZip=async files=>({size:files.reduce((s,f)=>s+f.blob.size+180,100)});
const makeDocuments=()=>[
  {name:'README.txt',blob:new SizedBlob(1000)},
  {name:'LICENSE.txt',blob:new SizedBlob(500)},
  {name:'ABOUT-SAPIVER-PRINTS.txt',blob:new SizedBlob(300)}
];
function options(png,colourBytes=2_000_000,splitter=null){
 return {base:'sapiver-trains',transparent:png,versions:versions(colourBytes),makeZip,makeDocuments,splitter};
}
test('small transparent master plus three two-size colours yields EXACTLY four ZIPs',async()=>{
 const r=await packer.build(options(original));
 assert.equal(r.zipCount,4);
 assert.equal(r.multipartCount,0);
 assert.equal(r.groupedColours,false);
 assert.deepEqual(r.manifest.backgrounds.map(v=>v.files.length),[2,2,2]);
 assert.ok(r.packages.every(z=>z.blob.size<20_000_000));
 assert.equal(r.buyerFiles.filter(f=>f.name.endsWith('.png')).length,7);
 assert.ok(r.packages[0].files.some(f=>f.name==='LICENSE.txt'));
 assert.ok(r.packages.slice(1).every(z=>z.files.filter(f=>f.name.endsWith('.png')).length===2));
});
test('51.56 MB original remains exact and uses five buyer ZIPs with grouped colours',async()=>{
 const png={...original,blob:new SizedBlob(51_562_338)};
 let splitInput=null;
 const splitter=async(blob,name,spec)=>{
   splitInput={blob,name,spec};
   return {parts:[18_500_000,18_500_000,14_562_338].map((size,i)=>({
     name:name.slice(0,-4)+'-png-part-0'+(i+1)+'.pngpart',blob:new SizedBlob(size)
   })),manifest:{format:'sapiver-full-png-parts',filename:name,parts:[1,2,3]},html:new SizedBlob(5300)};
 };
 const r=await packer.build(options(png,3_500_000,splitter));
 assert.equal(splitInput.blob,png.blob,'Original source blob must be reused unmodified');
 assert.equal(splitInput.spec.wPx,5000);
 assert.equal(r.zipCount,5);
 assert.equal(r.multipartCount,3);
 assert.equal(r.groupedColours,true);
 assert.ok(r.packages.every(z=>z.blob.size<=20_000_000));
 assert.equal(r.buyerFiles.filter(f=>f.name.endsWith('.png')).length,6);
 assert.equal(r.buyerFiles.filter(f=>f.name.endsWith('.pngpart')).length,3);
 assert.ok(r.buyerFiles.some(f=>f.name==='REBUILD-PNG.html'));
 assert.ok(r.buyerFiles.some(f=>f.name==='SAPIVER-FOUR-VARIANTS.json'));
 assert.deepEqual(r.manifest.backgrounds.map(v=>v.colour),['#f7eee2','#d6e7ec','#b9cdbe']);
});
test('large colour pairs fail clearly, never silently reduce their pixel dimensions',async()=>{
 const png={...original,blob:new SizedBlob(51_562_338)};
 const splitter=async(blob,name)=>({parts:[18_500_000,18_500_000,14_562_338].map((size,i)=>({name:name.slice(0,-4)+'-png-part-0'+(i+1)+'.pngpart',blob:new SizedBlob(size)})),manifest:{},html:new SizedBlob(5000)});
 await assert.rejects(packer.build(options(png,9_000_000,splitter)),/Choose smaller explicit colour PNG sizes/);
});
test('reject duplicate colours before any packaging',async()=>{
 const input=options(original);input.versions[1].colour=input.versions[0].colour;
 await assert.rejects(packer.build(input),/three different valid background colours/);
});