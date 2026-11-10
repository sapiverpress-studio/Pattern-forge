import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../auto-seamless/commercial-pack.js',import.meta.url),'utf8');
const fake=(extra={})=>({
  checked:false,disabled:false,style:{},textContent:'',
  addEventListener(){},appendChild(){},setAttribute(){},
  getContext(){return {clearRect(){},fillRect(){},fillText(){},drawImage(){}};},
  closest(){return {appendChild(){}};},
  ...extra
});
function makeHarness(){
 const elements=Object.fromEntries(['download5000','commercialOriginal','commercialApproved','commercialPreview','commercialStatus','downloadCommercial','density','blend','coverage'].map(k=>[k,fake()]));
 elements.commercialOriginal.checked=true;
 const document={createElement(){return fake();},getElementById(k){return elements[k]||null;}};
 // Access the internal format writer without changing application source or public API.
 const instrumented=source.replace('(function(){','return (function(){')
   .replace(/\}\)\(\);\s*$/,'return {zip,zipSize,buildBuyerParts,bytesFromText,crc};})();');
 assert.notEqual(instrumented,source,'Export test harness must identify the IIFE');
 const loader=new Function('document','state','sourceCanvas','tileCanvas','loadFile','asBlob','taggedDPI','saveBlob','nextFrame','TextEncoder','Blob',instrumented);
 return loader(document,{tile:null,source:null},fake(),fake(),async()=>{},()=>{},()=>{},()=>{},()=>{},TextEncoder,Blob);
}

test('commercial pack UI script compiles, hooks in without forcing a new upload',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.ok(makeHarness().zip);
});

test('seller-kit ZIP is extractable with local, central and end headers, and sound CRC',async()=>{
 const api=makeHarness(),png=api.bytesFromText('original sunflower file content');
 const entry={name:'UPLOAD-TO-ETSY/01-commercial-pattern.zip',data:png};
 const blob=api.zip([entry]),bytes=new Uint8Array(await blob.arrayBuffer()),v=new DataView(bytes.buffer);
 assert.equal(v.getUint32(0,true),0x04034b50);
 assert.equal(v.getUint32(14,true),api.crc(png));
 assert.equal(v.getUint32(bytes.length-22,true),0x06054b50);
 assert.equal(blob.size,api.zipSize([entry]));
 const firstCentral=v.getUint32(bytes.length-22+16,true);
 assert.equal(v.getUint32(firstCentral,true),0x02014b50);
});

test('each product has license, buyer instructions and About text',()=>{
 const api=makeHarness(),parts=api.buildBuyerParts([{name:'original-5000.png',data:api.bytesFromText('image')}]);
 assert.equal(parts.length,1);
 assert.deepEqual(parts[0].group.map(x=>x.name),['original-5000.png','LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt']);
});

test('never silently shrink an oversized 5000px asset',()=>{
 const api=makeHarness();
 assert.throws(()=>api.buildBuyerParts([{name:'original-5000.png',data:new Uint8Array(20_000_001)}]),/20 MB per-file limit/);
});
