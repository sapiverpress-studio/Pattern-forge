import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {randomFillSync} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const source=readFileSync(new URL('../auto-seamless/commercial-kit.js',import.meta.url),'utf8');
const a=source.indexOf(' const encoder=new TextEncoder(), MAX=20000000;');
const b=source.indexOf('\n async function getBytes(',a);
const c=source.indexOf(' function packedSize(files){');
const d=source.indexOf('\n function refresh(){',c);
assert.ok(a>=0&&b>a&&c>b&&d>c,'Source packaging functions must be present');
// Execute the actual browser writer and lossless preflight from the page with Node22 web streams.
const status={textContent:''},requestAnimationFrame=fn=>fn();
const window={};
new Function('window',readFileSync(new URL('../app/js/etsy-multipart.js',import.meta.url),'utf8'))(window);
const {zip,pack,packedSize,tryLosslessZipCompression,prepareCustomerArtwork,planMultipartArtwork,includedArtworkLabels}=new Function(
 'status','requestAnimationFrame','CompressionStream','Blob','Response','window','getBytes',
 source.slice(a,b)+'\n'+source.slice(c,d)+'\nreturn {zip,pack,packedSize,tryLosslessZipCompression,prepareCustomerArtwork,planMultipartArtwork,includedArtworkLabels};'
)(status,requestAnimationFrame,CompressionStream,Blob,Response,window,async blob=>new Uint8Array(await blob.arrayBuffer()));
const docs=['LICENSE.txt','README.txt','ABOUT-SAPIVER-PRINTS.txt'].map(name=>({name,data:new TextEncoder().encode('This document accompanies each buyer ZIP. Permission and instructions remain identical across downloads.')}));
const asset=(name,data)=>({name,data});

test('real ZIP method 8 compresses a 20MB+ patterned file without changing one byte',async()=>{
 // 4-bit texture: sizable (>20MB) but only moderately compressible, safely under 100:1.
 const original=new Uint8Array(20_100_000);let seed=123456789;
 for(let i=0;i<original.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;original[i]=seed&15;}
 const filename='texture-5000px-300dpi-repeat.png';
 const candidate=await tryLosslessZipCompression(asset(filename,original));
 assert.ok(candidate.packedData,'Actual raw DEFLATE bytes must be generated');
 assert.ok(candidate.packedData.length<20_000_000,'Compressed payload must fit the Etsy cap');
 assert.ok(original.length/candidate.packedData.length<=100);
 const archive=zip([candidate,...docs]);
 assert.ok(archive.size<20_000_000);
 const bytes=new Uint8Array(await archive.arrayBuffer());
 const view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 assert.equal(view.getUint16(8,true),8,'ZIP local header must identify DEFLATE');
 const dataStart=30+view.getUint16(26,true)+view.getUint16(28,true);
 const compressedSize=view.getUint32(18,true);
 const recovered=inflateRawSync(bytes.subarray(dataStart,dataStart+compressedSize));
 assert.deepEqual(recovered,Buffer.from(original),'ZIP extraction must be byte-for-byte identical');
 const python=spawnSync('python3',['-c',"import io,sys,zipfile; b=sys.stdin.buffer.read(); z=zipfile.ZipFile(io.BytesIO(b)); assert z.testzip() is None; assert len(z.namelist())==4; assert len(z.read(z.namelist()[0]))==20100000"],{
  input:Buffer.from(bytes),encoding:'utf8',timeout:30000,maxBuffer:1024*1024
 });
 assert.equal(python.status,0,python.stderr||python.stdout||'Python ZIP validation failed');
});

test('uncompressible over-limit 5000px PNG is retained byte-for-byte in numbered buyer ZIPs',async()=>{
 const noise=new Uint8Array(20_000_300);randomFillSync(noise);
 noise.set([137,80,78,71,13,10,26,10]);
 const images=[
  asset('test-5000px-300dpi-repeat.png',noise),
  asset('test-5000px-repeat.jpg',new Uint8Array(500_000)),
  asset('test-2500px-300dpi-repeat.png',new Uint8Array(320_000)),
  asset('test-seamless-tile-300dpi.png',new Uint8Array(240_000))
 ];
 const {accepted,omitted,multipart}=await prepareCustomerArtwork(images,docs);
 assert.deepEqual(omitted,[]);
 assert.equal(accepted.length,4);
 assert.equal(multipart.parts.length,2);
 const groups=await planMultipartArtwork(accepted,docs,multipart);
 assert.equal(groups.length,multipart.parts.length+1,'Existing importer expects numbered ZIPs plus one extras ZIP');
 for(const {entries} of groups){
  assert.ok(packedSize(entries)<=20_000_000);
  for(const doc of docs)assert.ok(entries.some(item=>item.name===doc.name));
  assert.match(new TextDecoder().decode(entries.find(e=>e.name==='README.txt').data),/REBUILD-PNG/);
 }
 const parts=groups.filter(g=>g.role==='png-part').flatMap(g=>g.entries.filter(e=>e.name.endsWith('.pngpart')).map(e=>Buffer.from(e.data)));
 assert.deepEqual(Buffer.concat(parts),Buffer.from(noise),'Full PNG recovery must preserve every byte');
 assert.equal(groups.flatMap(g=>g.entries).filter(e=>e.name==='REBUILD-PNG.html').length,1);
 assert.equal(groups.flatMap(g=>g.entries).filter(e=>e.name==='PNG-REASSEMBLY.json').length,1);
 assert.ok(accepted.some(f=>f.name.endsWith('5000px-repeat.jpg')));
 assert.ok(accepted.some(f=>f.name.endsWith('2500px-300dpi-repeat.png')));
 assert.ok(accepted.some(f=>f.name.endsWith('seamless-tile-300dpi.png')));
 // Companion images may use spare space beside a numbered chunk. No extra
 // attachment or image-quality reduction is needed even with >20 MB extras.
 const largeCompanions=accepted.map(f=>f.name.endsWith('.jpg')?{...f,data:new Uint8Array(15_000_000)}:f.name.includes('2500px')?{...f,data:new Uint8Array(6_500_000)}:f.name.includes('seamless-tile')?{...f,data:new Uint8Array(2_000_000)}:f);
 const full=await planMultipartArtwork(largeCompanions,docs,multipart);
 assert.equal(full.length,3);
 assert.equal(full.flatMap(g=>g.entries).filter(e=>/\.(png|jpg)$/.test(e.name)).length,3);
 assert.ok(full.every(g=>packedSize(g.entries)<=20_000_000));
 const tight=accepted.map(f=>/5000px-repeat\.jpg$|2500px-300dpi-repeat\.png$/.test(f.name)?{...f,data:new Uint8Array(18_800_000)}:f.name.includes('seamless-tile')?{...f,data:new Uint8Array(2_000_000)}:f);
 const more=await planMultipartArtwork(tight,docs,multipart);
 assert.equal(multipart.parts.length,3,'Additional small PNG chunks free room for large companion images');
 assert.equal(more.length,4);
 assert.ok(more.every(g=>packedSize(g.entries)<=20_000_000));
});

test('an oversized required JPG cannot be silently removed or downscaled',async()=>{
 const images=[
  asset('test-5000px-300dpi-repeat.png',new Uint8Array(400_000)),
  asset('test-5000px-repeat.jpg',new Uint8Array(20_000_000)),
  asset('test-2500px-300dpi-repeat.png',new Uint8Array(320_000)),
  asset('test-seamless-tile-300dpi.png',new Uint8Array(240_000))
 ];
 await assert.rejects(prepareCustomerArtwork(images,docs),/remains above Etsy/);
});


test('included-file labels list only packaged digital artwork for three- or four-file exports',()=>{
 const three=[
  asset('test-5000px-repeat.jpg',new Uint8Array(2)),
  asset('test-2500px-300dpi-repeat.png',new Uint8Array(2)),
  asset('test-seamless-tile-300dpi.png',new Uint8Array(2))
 ];
 assert.deepEqual(includedArtworkLabels(three),[
  '5000 x 5000 JPG image','2500 x 2500 PNG image','Seamless tile PNG'
 ]);
 assert.deepEqual(includedArtworkLabels([...three,asset('test-5000px-300dpi-repeat.png',new Uint8Array(2))]),[
  '5000 x 5000 JPG image','5000 x 5000 PNG image','2500 x 2500 PNG image','Seamless tile PNG'
 ]);
 assert.ok(!includedArtworkLabels(three).some(line=>/missing|omitted|not included|original/i.test(line)));
});
