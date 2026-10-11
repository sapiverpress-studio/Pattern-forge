import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Blob,File} from 'node:buffer';

const js=readFileSync(new URL('../app/js/poster-sync.js',import.meta.url),'utf8');
const origin='https://sapiver-poster-gen-auth.netlify.app';
const channel='sapiver-pattern-poster-handoff-v1';
function setup(){
  const messages=[],handlers=new Map(),storage=new Map(),opens=[];
  let latest;
  const win={
    PatternForgeEtsyBridge:{state:{project:{id:'pf-project-mgkk1122-abcd123',title:'Autumn leaves'}},setStatus(){}},
    open(url){opens.push(url);latest={closed:false,postMessage(data,targetOrigin){messages.push({data,targetOrigin});}};return latest;},
    addEventListener(name,fn){handlers.set(name,fn);},
    removeEventListener(name){handlers.delete(name);}
  };
  const doc={body:{appendChild(){}},createElement(){return {click(){},remove(){}};}};
  const objectURL={createObjectURL(){return 'blob:test'},revokeObjectURL(){}};
  runInNewContext(js,{window:win,document:doc,Blob,File,URL:objectURL,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setTimeout(){return 1},clearTimeout(){}});
  const emit=(data,source=latest,from=origin)=>handlers.get('message')?.({data,source,origin:from});
  return {win,emit,messages,storage,opens,get latest(){return latest}};
}
const mkApi=()=>({
  check:()=>[{state:'pass',label:'Ready'}],
  async prepare(opts){
    assert.equal(opts.download,false);assert.equal(opts.returnKit,true);
    return {success:true,kitName:'sapiver-autumn-leaves-etsy-kit.zip',kitBlob:new Blob([Buffer.alloc(128)])};
  }
});
test('transfers to an exact trusted popup and preserves future update ID',async()=>{
  const h=setup(),project='pf-project-mgkk1122-abcd123';
  await h.win.PatternForgePosterSync.send(mkApi());
  assert.equal(h.opens.length,1);
  assert.equal(h.messages.length,0,'Do not send until receiver is ready');
  h.emit({channel,type:'ready',challenge:'a'.repeat(32)},h.latest,'https://attacker.invalid');
  assert.equal(h.messages.length,0,'Untrusted origin must not receive artwork');
  h.emit({channel,type:'ready',challenge:'a'.repeat(32)});
  assert.equal(h.messages.length,1);
  assert.equal(h.messages[0].targetOrigin,origin);
  assert.equal(h.messages[0].data.file.name,'sapiver-autumn-leaves-etsy-kit.zip');
  assert.equal(h.messages[0].data.updateProductId,null);
  h.emit({channel,type:'received',challenge:'a'.repeat(32),projectId:project});
  h.emit({channel,type:'saved',challenge:'a'.repeat(32),projectId:project,productId:'Z'.repeat(32)});
  assert.equal(JSON.parse(h.storage.get('patternForgePosterProduct/v1/'+project)).productId,'Z'.repeat(32));
  await h.win.PatternForgePosterSync.send(mkApi());
  h.emit({channel,type:'ready',challenge:'b'.repeat(32)});
  assert.equal(h.messages[1].data.updateProductId,'Z'.repeat(32));
  h.emit({channel,type:'received',challenge:'b'.repeat(32),projectId:project});
  h.emit({channel,type:'saved',challenge:'b'.repeat(32),projectId:project,productId:'Z'.repeat(32)});
});
test('failed exporter check never opens owner studio',async()=>{
  const h=setup();
  await assert.rejects(h.win.PatternForgePosterSync.send({check:()=>[{state:'fail'}]}),/failed Etsy export checks/);
  assert.equal(h.opens.length,0);
});

test('practice projects cannot become sellable products',async()=>{
  const h=setup();h.win.PatternForgeEtsyBridge.state.project.isPractice=true;
  await assert.rejects(h.win.PatternForgePosterSync.send(mkApi()),/named Pattern Project/);
  assert.equal(h.opens.length,0);
});
