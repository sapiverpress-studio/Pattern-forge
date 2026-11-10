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
const {zip,pack,packedSize,tryLosslessZipCompression,prepareCustomerArtwork}=new Function(
 'status','requestAnimationFrame','CompressionStream','Blob','Response',
 source.slice(a,b)+'\n'+source.slice(c,d)+'\nreturn {zip,pack,packedSize,tryLosslessZipCompression,prepareCustomerArtwork};'
)(status,requestAnimationFrame,CompressionStream,Blob,Response);
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

test('uncompressible over-limit 5000px PNG is omitted transparently, while full-size JPG and two PNGs remain',async()=>{
 const noise=new Uint8Array(20_000_300);randomFillSync(noise);
 const images=[
  asset('test-5000px-300dpi-repeat.png',noise),
  asset('test-5000px-repeat.jpg',new Uint8Array(500_000)),
  asset('test-2500px-300dpi-repeat.png',new Uint8Array(320_000)),
  asset('test-seamless-tile-300dpi.png',new Uint8Array(240_000))
 ];
 const {accepted,omitted}=await prepareCustomerArtwork(images,docs);
 assert.deepEqual(omitted,['test-5000px-300dpi-repeat.png']);
 assert.equal(accepted.length,3);
 const groups=pack(accepted,docs);
 assert.ok(groups.length>=1&&groups.length<=5);
 for(const group of groups){
  assert.ok(packedSize(group)<=20_000_000);
  for(const doc of docs)assert.ok(group.some(item=>item.name===doc.name));
 }
 assert.ok(accepted.some(f=>f.name.endsWith('5000px-repeat.jpg')));
 assert.ok(accepted.some(f=>f.name.endsWith('2500px-300dpi-repeat.png')));
 assert.ok(accepted.some(f=>f.name.endsWith('seamless-tile-300dpi.png')));
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
