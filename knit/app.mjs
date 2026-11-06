import {DEFAULTS,normalize,renderKnit,renderPreview,exportPng} from './engine.mjs';
const $=id=>document.getElementById(id), tile=document.createElement('canvas'), preview=$('preview');
const STORAGE='sapiver-knitted-fabric-settings-v3';
const palettes={cream:['#e2d2b7','#9b403b'],sage:['#809b85','#f2e2c3'],denim:['#506f91','#edcaa7'],berry:['#7a3748','#f2d9bc']};
let repeat=false,waiting=false;
let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}
const settings=normalize({...DEFAULTS,...saved});
function controlsFromState(){
  $('knitStyle').value=settings.style;$('gauge').value=settings.gauge;
  $('yarn').value=settings.yarn;$('contrast').value=settings.contrast;
  if(typeof saved.name==='string')$('designName').value=saved.name.slice(0,70);
}
function stateFromControls(){return normalize({style:$('knitStyle').value,gauge:$('gauge').value,yarn:$('yarn').value,contrast:$('contrast').value,seed:settings.seed});}
function status(msg){$('message').textContent=msg}
function paint(){
  Object.assign(settings,stateFromControls());
  renderKnit(tile,settings);
  renderPreview(tile,preview,repeat);
  try{localStorage.setItem(STORAGE,JSON.stringify({...settings,name:$('designName').value}))}catch{}
}
let scheduled=false;
function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;try{paint();status('Connected stitches updated. Check 3 × 3 repeat.')}catch(e){status('Cannot render: '+e.message)}});
}
controlsFromState();
try{paint();status('Stitch-based knitting engine ready.')}catch(e){status('Render failed: '+e.message)}
for(const key of ['knitStyle','gauge','yarn','contrast','designName'])$(key).addEventListener('input',schedule);
$('cosyPreset').addEventListener('click',()=>{
  Object.assign(settings,{style:'stockinette',gauge:'superchunky',yarn:'#e2d2b7',contrast:'#9b403b'});
  controlsFromState();setRepeat(false);schedule();status('Cosy super chunky wool selected.');
});
document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{
  const colours=palettes[b.dataset.palette];$('yarn').value=colours[0];$('contrast').value=colours[1];schedule();
}));
$('variation').addEventListener('click',()=>{settings.seed=settings.seed>=9999?1:settings.seed+1;schedule()});
function setRepeat(next){
  repeat=next;$('repeatView').setAttribute('aria-pressed',String(next));$('singleView').setAttribute('aria-pressed',String(!next));
  renderPreview(tile,preview,repeat);
}
$('repeatView').addEventListener('click',()=>setRepeat(true));
$('singleView').addEventListener('click',()=>setRepeat(false));
function filename(s,ext){const name=(s||'knitted-fabric').trim().replace(/[^a-z0-9 -]/gi,'').replace(/\s+/g,'-').toLowerCase().slice(0,65);return (name||'knitted-fabric')+ext;}
function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
$('downloadPng').addEventListener('click',async()=>{
  if(waiting)return;waiting=true;const button=$('downloadPng');button.disabled=true;status('Rendering 5000 × 5000 PNG…');
  try{
    // yield once to paint the progress message before a large export
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    const blob=await exportPng(tile);
    download(blob,filename($('designName').value,'.png'));
    status('PNG prepared: 5000 × 5000 px with 300 DPI metadata.');
  }catch(e){status('Export failed: '+e.message)}
  finally{waiting=false;button.disabled=false}
});
$('saveSettings').addEventListener('click',()=>{
  const data={format:'sapiver-knit-v1',name:$('designName').value,...stateFromControls()};
  download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),filename(data.name,'.knit.json'));
  status('Editable knitting settings saved.');
});
$('loadSettings').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>32768)throw new Error('Settings file too large.');
    const data=JSON.parse(await file.text());
    if(data.format!=='sapiver-knit-v1')throw new Error('Not a Knitted Fabric settings file.');
    Object.assign(settings,normalize(data));
    saved={name:typeof data.name==='string'?data.name:''};
    controlsFromState();schedule();status('Settings loaded.');
  }catch(err){status('Could not load settings: '+err.message)}
  finally{e.target.value=''}
});