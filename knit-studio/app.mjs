import {STYLES,PALETTES,DEFAULTS,normalize,getRenderer,exportPng} from './engine.mjs';
const $=id=>document.getElementById(id);
const STORAGE='sapiver-wool-seamless-settings-v1';
const tile=document.createElement('canvas');
const canvas=$('preview'),ctx=canvas.getContext('2d',{alpha:false});
const mini=$('miniPreview').getContext('2d',{alpha:false});
let view='tile',renderer=null,scheduleId=0,requestId=0,exporting=false;
const labels={tile:'Single tile',repeat:'3 × 3 repeat',close:'Wool close-up'};
function read(){return normalize({
 name:$('designName').value,style:$('style').value,gauge:$('gauge').value,
 colour:$('colour').value,contrast:$('contrast').value,third:$('third').value,
 variation:Number($('variation').value),fibres:Number($('fibres').value),
 angle:Number($('angle').value)
});}
function setInputs(s){
 const x=normalize(s);
 $('designName').value=x.name;$('style').value=x.style;$('gauge').value=x.gauge;
 $('colour').value=x.colour;$('contrast').value=x.contrast;$('third').value=x.third;
 $('variation').value=String(x.variation);$('fibres').value=String(x.fibres);
 $('angle').value=String(x.angle);
 changed();
}
function status(s){$('status').textContent=s;}
function updateVisibility(){
 const fair=$('style').value==='fairisle';
 $('contrastWrap').hidden=!fair;$('thirdWrap').hidden=!fair;
 $('variationValue').textContent=$('variation').value+'%';
 $('fibresValue').textContent=$('fibres').value+'%';
}
function paintView(){
 if(!tile.width||!ctx)return;
 const n=720;
 canvas.width=canvas.height=n;ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality='high';
 if(view==='tile'){
  ctx.drawImage(tile,0,0,n,n);
 }else if(view==='repeat'){
  const step=n/3;
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)
   ctx.drawImage(tile,x*step,y*step,step,step);
 }else{
  const z=n*.46,s=(n-z)/2;
  ctx.drawImage(tile,s,s,z,z,0,0,n,n);
 }
 const miniCanvas=$('miniPreview');
 mini.clearRect(0,0,miniCanvas.width,miniCanvas.height);
 mini.drawImage(tile,0,0,miniCanvas.width,miniCanvas.height);
}
async function refreshPreview(){
 if(exporting)return;
 const seq=++requestId;
 if(!renderer)return;
 try{
  const settings=read();
  await renderer.renderTile(tile,settings,720);
  if(seq!==requestId||exporting)return;
  paintView();status('Seamless tile ready — inspect the repeat or download.');
 }catch(e){if(seq===requestId)status('Cannot show this wool pattern: '+e.message);}
}
function changed(){
 updateVisibility();
 try{localStorage.setItem(STORAGE,JSON.stringify(read()));}catch{}
 if(exporting)return;
 if(scheduleId)cancelAnimationFrame(scheduleId);
 scheduleId=requestAnimationFrame(()=>{scheduleId=0;refreshPreview();});
}
function selectView(next){
 view=next;
 for(const v of ['tile','repeat','close'])
  $(v+'View').setAttribute('aria-pressed',String(v===view));
 paintView();
}
for(const v of ['tile','repeat','close'])$(v+'View').addEventListener('click',()=>selectView(v));
for(const id of ['style','gauge','colour','contrast','third','variation','fibres','angle','designName'])
 $(id).addEventListener(id==='designName'?'change':'input',()=>{
  if(id==='style'){
    const p={stockinette:'denim',rib:'cream',seed:'sage',cable:'cream',fairisle:'berry'}[$('style').value];
    const vals=PALETTES[p];
    $('colour').value=vals[0];$('contrast').value=vals[1];$('third').value=vals[2];
  }
  changed();
 });
document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{
 const x=PALETTES[b.dataset.palette];
 $('colour').value=x[0];$('contrast').value=x[1];$('third').value=x[2];changed();
}));
$('reset').addEventListener('click',()=>setInputs(DEFAULTS));
function filename(name,ext){
 const clean=(name||'wool-pattern').trim().replace(/[^a-z0-9 -]/gi,'')
  .replace(/\s+/g,'-').toLowerCase().slice(0,64);
 return (clean||'wool-pattern')+ext;
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
$('saveSettings').addEventListener('click',()=>{
 const s=read();
 const file=new Blob([JSON.stringify({format:'sapiver-wool-seamless-v1',...s},null,2)],{type:'application/json'});
 download(file,filename(s.name,'.wool.json'));
 status('Editable wool design saved.');
});
$('loadSettings').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>32768)throw Error('Settings file too large.');
  const data=JSON.parse(await f.text());
  if(data.format==='sapiver-knit-v1'){
   setInputs({style:data.style,gauge:data.gauge==='megachunky'?'mega':data.gauge==='superchunky'?'super':data.gauge,
     colour:data.yarn,contrast:data.contrast,third:data.navy,name:data.name});
  }else if(data.format==='sapiver-wool-seamless-v1')setInputs(data);
  else throw Error('Unrecognised wool settings file.');
  status('Saved design loaded — edit or inspect its repeat.');
 }catch(err){status('Could not load: '+err.message);}
 finally{e.target.value='';}
});
$('downloadPng').addEventListener('click',async()=>{
 if(exporting||!renderer)return;
 exporting=true;++requestId;
 const button=$('downloadPng');button.disabled=true;
 const settings=read();
 status('Rendering genuine 5000 × 5000 seamless tile… 0%');
 try{
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const blob=await exportPng(renderer,settings,pct=>{
   if(Math.round(pct*100)%8===0)status('Rendering seamless tile… '+Math.round(pct*100)+'%');
  });
  download(blob,filename(settings.name,'-5000px-300dpi.png'));
  status('Downloaded one 5000 × 5000 px seamless PNG tile (300 DPI).');
 }catch(e){status('Export failed: '+e.message);}
 finally{
  exporting=false;button.disabled=false;
  // Do not replace the genuine download/error status with a preview status.
  // Only re-render if the user changed controls during the long export.
  if(JSON.stringify(read())!==JSON.stringify(settings)){
   changed();status('Your controls changed during the export. Previewing those newer settings.');
  }
 }
});
try{
 const stored=JSON.parse(localStorage.getItem(STORAGE)||'null');
 setInputs(stored?normalize(stored):DEFAULTS);
}catch{setInputs(DEFAULTS);}
try{
 renderer=await getRenderer();
 await refreshPreview();
}catch(e){status('Renderer unavailable: '+e.message);$('downloadPng').disabled=true;}
