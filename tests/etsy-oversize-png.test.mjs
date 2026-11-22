import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const exporter=readFileSync(new URL('../app/js/etsy-export.js',import.meta.url),'utf8');
const editor=readFileSync(new URL('../app/js/editor.js',import.meta.url),'utf8');

class FakeBlob {
  constructor(parts=[]){
    this.parts=parts;
    this.size=parts.reduce((total,part)=>total+(typeof part==='string'?part.length:(part?.size||part?.byteLength||0)),0);
  }
}

async function prepareFixture({originalPng=24_000_000,jpgSize=6_000_000,allowSmallerPng=false}={}){
  const statuses=[],zipped=[];
  const canvas=(w=1,h=1)=>({
    width:w,height:h,
    getContext(){return {fillRect(){},drawImage(){},createPattern(){return null;},getImageData:()=>({data:new Uint8Array(this.width*this.height*4)})};},
    toBlob(callback,type){callback({size:type==='image/jpeg'?(this.width===5000?jpgSize:300_000):250_000});}
  });
  const document={
    getElementById:()=>({checked:true,value:'#ffffff'}),
    createElement:()=>canvas()
  };
  const state={
    items:[{id:'a',scale:1}],marks:[],layers:[{id:'layer1'}],
    assets:[{id:'a',src:'data:image/png;base64,x',w:1000,h:1000,vector:false}],
    templateGuide:null,project:null
  };
  const bridge={
    state,getSpec:()=>({wPx:5000,hPx:5000,dpi:300}),
    getRepeatStyle:()=> 'straight',getMultipliers:()=>({x:1,y:1}),isDoodle:()=>false,
    layerForArtwork:()=>({id:'layer1'}),layerIsRenderable:()=>true,assetOf:()=>({vector:false}),
    baseLayerIds:{motifs:'m',drawing:'d'},
    makeTileCanvas:(w,h)=>canvas(w,h),
    renderPNGBlob:async({maxSide}={})=>{
      const d=Math.min(5000,maxSide||5000);
      return {spec:{wPx:d,hPx:d,dpi:300},blob:{size:Math.round(originalPng*(d/5000)**2)}};
    },
    renderSVGBlob:()=>({size:1000}),
    makeZip:async files=>{
      zipped.push(files);
      return {size:files.reduce((size,file)=>size+file.blob.size+200,22)};
    },
    downloadBlob:()=>{},safeName:()=> 'test',setStatus:value=>statuses.push(value)
  };
  const window={PatternForgeEtsyBridge:bridge};
  new Function('window','document','Blob',exporter)(window,document,FakeBlob);
  return {result:await window.PatternForgeEtsy.prepare({download:false,allowSmallerPng}),zipped,statuses};
}

test('ordinary PNG keeps its exact master dimensions and filename',async()=>{
  const {result}=await prepareFixture({originalPng:8_000_000});
  assert.equal(result.success,true);
  assert.equal(result.smallerPngUsed,false);
  assert.deepEqual(result.pngDimensions,{width:5000,height:5000});
  assert.ok(result.buyerFiles.some(file=>file.name==='sapiver-test-seamless-master.png'));
  assert.ok(result.buyerPackages.every(file=>file.size<=20_000_000));
});

test('oversized PNG requires explicit opt-in and does not download a misleading package',async()=>{
  const {result}=await prepareFixture();
  assert.equal(result.success,false);
  assert.match(result.error,/Tick .*Allow smaller PNG/);
});

test('consented fallback keeps full-resolution JPG, includes a fitting PNG and truthful README',async()=>{
  const {result,zipped}=await prepareFixture({allowSmallerPng:true});
  assert.equal(result.success,true);
  assert.equal(result.smallerPngUsed,true);
  assert.equal(result.masterDimensions.width,5000);
  assert.ok(result.pngDimensions.width<5000);
  assert.ok(result.pngDimensions.width>=1000);
  assert.ok(result.buyerPackages.every(file=>file.size<=20_000_000));
  assert.ok(result.buyerFiles.some(file=>file.name==='sapiver-test-seamless-master.jpg'));
  assert.ok(result.buyerFiles.some(file=>file.name.endsWith(result.pngDimensions.width+'x'+result.pngDimensions.height+'.png')));
  const readme=zipped.flat().filter(file=>file.name==='README.txt').at(-1);
  assert.ok(readme);
  const content=readme.blob.parts.join('');
  assert.match(content,new RegExp('PNG seamless tile: '+result.pngDimensions.width+' × '+result.pngDimensions.height+' px'));
  assert.match(content,/JPG seamless master tile: 5000 × 5000 px/);
  assert.ok(!content.includes('PNG seamless tile: 5000 × 5000 px'));
  assert.equal(result.designUnchanged,true);
});

test('oversized full-resolution JPG is not silently substituted',async()=>{
  const {result}=await prepareFixture({allowSmallerPng:true,jpgSize:21_000_000});
  assert.equal(result.success,false);
  assert.match(result.error,/\.jpg cannot fit/);
});

test('PNG size reduction uses original repeat renderer and 300 DPI metadata',async()=>{
  const begin=editor.indexOf('  async function renderPNGBlob(options={}){');
  const end=editor.indexOf('\n  let backgroundExportPending=',begin);
  assert.ok(begin>=0&&end>begin,'PNG rendering source must be locatable');
  const calls=[];
  const render=new Function('getExportSpec','confirm','setStatus','makeTileCanvas','projectRepeatStyle','canvasToPngBlobWithDpi','setTimeout',
    editor.slice(begin,end)+'\nreturn renderPNGBlob;')(
    ()=>({wPx:5000,hPx:5000,dpi:300}),()=>true,()=>{},
    (w,h,bw,bh,style,forExport)=>{calls.push({w,h,bw,bh,style,forExport});return {width:w,height:h};},
    ()=> 'straight',
    async(canvas,dpi)=>{calls.push({dpi});return {size:1000};},
    fn=>{fn();return 0;}
  );
  const full=await render(),small=await render({maxSide:3200});
  assert.deepEqual({w:full.spec.wPx,h:full.spec.hPx,dpi:full.spec.dpi},{w:5000,h:5000,dpi:300});
  assert.deepEqual({w:small.spec.wPx,h:small.spec.hPx,dpi:small.spec.dpi},{w:3200,h:3200,dpi:300});
  assert.equal(calls[0].forExport,true);
  assert.equal(calls[2].forExport,true);
  assert.equal(calls[3].dpi,300);
});
