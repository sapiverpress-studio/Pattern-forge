import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app/js/etsy-export.js',import.meta.url),'utf8');

class FakeBlob {
  constructor(parts=[]){
    this.parts=parts;
    this.size=parts.reduce((n,p)=>n+(typeof p==='string'?p.length:(p?.size||p?.byteLength||0)),0);
  }
}

async function prepareFixture({originalPng=24_000_000,jpgSize=6_000_000,allowMultipartPng=false}={}){
  const groups=[],renderCalls=[],statuses=[];
  const canvas=(w=1,h=1)=>({width:w,height:h,
    getContext(){return {fillRect(){},drawImage(){},createPattern(){return null},getImageData:()=>({data:new Uint8Array(this.width*this.height*4)})};},
    toBlob(callback,type){callback({size:type==='image/jpeg'?(this.width===5000?jpgSize:300_000):250_000});}
  });
  const state={items:[{id:'a',scale:1}],marks:[],layers:[{id:'layer'}],assets:[{id:'a',src:'data:png',w:5000,h:5000,vector:false}],project:null,templateGuide:null};
  const bridge={state,getSpec:()=>({wPx:5000,hPx:5000,dpi:300}),getRepeatStyle:()=> 'straight',
    getMultipliers:()=>({x:1,y:1}),isDoodle:()=>false,layerForArtwork:()=>({id:'layer'}),
    layerIsRenderable:()=>true,assetOf:()=>({vector:false}),baseLayerIds:{motifs:'m',drawing:'d'},
    makeTileCanvas:(w,h)=>canvas(w,h),renderPNGBlob:async options=>{
      renderCalls.push(options);
      return {spec:{wPx:5000,hPx:5000,dpi:300},blob:{size:originalPng},alphaStats:{clear:10000,partial:0,total:36864,clearPercent:27.1}};
    },
    renderSVGBlob:()=>({size:1000}),makeZip:async files=>{
      groups.push(files);return {size:files.reduce((n,f)=>n+f.blob.size+200,22)};
    },downloadBlob(){},safeName:()=> 'train',setStatus:v=>statuses.push(v)};
  const multipart={
    makeParts:async(blob,name,spec)=>{
      assert.equal(blob.size,originalPng);
      assert.equal(spec.wPx,5000);
      const parts=[
        {name:name.slice(0,-4)+'-png-part-01.pngpart',blob:{size:18_500_000},bytes:18_500_000,sha256:'a'.repeat(64)},
        {name:name.slice(0,-4)+'-png-part-02.pngpart',blob:{size:originalPng-18_500_000},bytes:originalPng-18_500_000,sha256:'b'.repeat(64)}
      ];
      return {parts,manifest:{format:'sapiver-full-png-parts',version:1,filename:name,bytes:originalPng,width:5000,height:5000,dpi:300,sha256:'c'.repeat(64),parts:parts.map(p=>({name:p.name,bytes:p.bytes,sha256:p.sha256}))},html:new FakeBlob(['<!doctype html>'])};
    }
  };
  const window={PatternForgeEtsyBridge:bridge,PatternForgeMultipart:multipart},document={getElementById:()=>({checked:true,value:'#ffffff'}),createElement:()=>canvas()};
  new Function('window','document','Blob',source)(window,document,FakeBlob);
  const result=await window.PatternForgeEtsy.prepare({download:false,allowMultipartPng});
  return {result,groups,renderCalls,statuses};
}

test('ordinary PNG is delivered complete at 5000 px in exactly two ZIPs',async()=>{
  const {result,renderCalls}=await prepareFixture({originalPng:8_000_000});
  assert.equal(result.success,true);
  assert.equal(result.multipartPngUsed,false);
  assert.equal(result.buyerPackages.length,2);
  assert.ok(result.buyerFiles.some(f=>f.name==='sapiver-train-seamless-master.png'));
  assert.deepEqual(result.pngDimensions,{width:5000,height:5000});
  assert.deepEqual(renderCalls,[{backgroundMode:'transparent'}]);
});

test('oversized original PNG cannot be silently reduced or repackaged without consent',async()=>{
  const {result,renderCalls}=await prepareFixture();
  assert.equal(result.success,false);
  assert.match(result.error,/Enable .*Preserve original PNG/);
  assert.deepEqual(renderCalls,[{backgroundMode:'transparent'}]);
});

test('approved multipart export keeps all bytes, exact pixel size and includes recovery tool',async()=>{
  const {result,groups,renderCalls}=await prepareFixture({allowMultipartPng:true});
  assert.equal(result.success,true,JSON.stringify(result));
  assert.equal(result.multipartPngUsed,true);
  assert.equal(result.multipartCount,2);
  assert.equal(result.originalPngBytes,24_000_000);
  assert.deepEqual(result.pngDimensions,{width:5000,height:5000});
  assert.equal(result.buyerPackages.length,3);
  assert.ok(result.buyerPackages.every(f=>f.size<20_000_000));
  assert.ok(result.buyerFiles.some(f=>f.name.endsWith('png-part-01.pngpart')));
  assert.ok(result.buyerFiles.some(f=>f.name.endsWith('png-part-02.pngpart')));
  assert.ok(result.buyerFiles.some(f=>f.name==='PNG-REASSEMBLY.json'));
  assert.ok(result.buyerFiles.some(f=>f.name==='REBUILD-PNG.html'));
  const archives=groups.filter(group=>group.some(f=>f.name==='LICENSE.txt')).slice(-3);
  assert.equal(archives.length,3);
  assert.equal(archives[0].filter(f=>f.name.endsWith('.pngpart')).length,1);
  assert.equal(archives[1].filter(f=>f.name.endsWith('.pngpart')).length,1);
  assert.ok(archives[2].some(f=>f.name.endsWith('-seamless-master.jpg')));
  for(const group of archives){
    for(const doc of ['README.txt','LICENSE.txt','ABOUT-SAPIVER-PRINTS.txt'])assert.ok(group.some(f=>f.name===doc));
    assert.ok(!group.some(f=>f.name==='QUALITY-CHECK.txt'));
  }
  assert.deepEqual(renderCalls,[{backgroundMode:'transparent'}],'PNG must not be re-rendered smaller');
  assert.equal(result.designUnchanged,true);
});

test('oversized mandatory JPG still blocks the package',async()=>{
  const {result}=await prepareFixture({allowMultipartPng:true,jpgSize:21_000_000});
  assert.equal(result.success,false);
  assert.match(result.error,/JPG-and-extras ZIP exceeds Etsy/);
});

test('Etsy renderer requests actual transparency independently of the normal Export PNG switch',async()=>{
  const {result,renderCalls}=await prepareFixture({originalPng:7_000_000});
  assert.equal(result.success,true);
  assert.equal(result.alphaStats.clearPercent,27.1);
  assert.deepEqual(renderCalls,[{backgroundMode:'transparent'}]);
});
