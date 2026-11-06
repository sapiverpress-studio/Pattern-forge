import {DEFAULTS,normalize,stylePalette,renderKnit,renderPreview,exportPng,loadStyle} from './engine.mjs';
const $=id=>document.getElementById(id), tile=document.createElement('canvas'), preview=$('preview');
const STORAGE='sapiver-knitted-fabric-settings-v5';
const palettes={cream:['#e9d7b6','#ab7656','#40576a'],sage:['#9cb396','#ead7be','#3d614d'],denim:['#729ac6','#ead7b4','#24344f'],berry:['#88312d','#ead7b4','#19263d']};
let repeat=false,waiting=false,loadError=null;
let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}
const settings=normalize({...DEFAULTS,...saved});
function controlsFromState(){
  $('knitStyle').value=settings.style;$('gauge').value=settings.gauge;
  $('yarn').value=settings.yarn;$('contrast').value=settings.contrast;$('navy').value=settings.navy;
  if(typeof saved.name==='string')$('designName').value=saved.name.slice(0,70);
}
function stateFromControls(){return normalize({style:$('knitStyle').value,gauge:$('gauge').value,yarn:$('yarn').value,contrast:$('contrast').value,navy:$('navy').value,seed:settings.seed});}
function status(msg){$('message').textContent=msg}
function paint(){
  if(loadError)throw loadError;
  loadError=null;
  Object.assign(settings,stateFromControls());
  renderKnit(tile,settings);
  renderPreview(tile,preview,repeat);
  try{localStorage.setItem(STORAGE,JSON.stringify({...settings,name:$('designName').value}))}catch{}
}
let scheduled=false,sequence=0,photosReady=Promise.resolve();
async function draw(){
  const current=++sequence,style=$('knitStyle').value;
  status('Loading '+style+' knitted material…');
  try{
    photosReady=loadStyle(style);
    await photosReady;
    if(current!==sequence)return;
    paint();
    status('Material ready — inspect the close-up and 3 × 3 repeat.');
  }catch(e){if(current===sequence){loadError=e;status('Material error: '+e.message);}}
}
function schedule(){if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;draw();});
}
controlsFromState();
draw();
$('knitStyle').addEventListener('change',()=>{
  const palette=stylePalette($('knitStyle').value);
  $('yarn').value=palette[0];$('contrast').value=palette[1];$('navy').value=palette[2];
  $('navyWrap').hidden=$('knitStyle').value!=='fairisle';
  loadError=null;schedule();
});
$('navyWrap').hidden=$('knitStyle').value!=='fairisle';
for(const key of ['gauge','yarn','contrast','navy','designName'])
  $(key).addEventListener('input',schedule);
$('cosyPreset').addEventListener('click',()=>{
  Object.assign(settings,{style:'stockinette',gauge:'superchunky',yarn:'#e9d7b6',contrast:'#9b403b',navy:'#27394c'});
  controlsFromState();$('navyWrap').hidden=true;setRepeat(false);schedule();
});
document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{
  const vals=palettes[b.dataset.palette];
  $('yarn').value=vals[0];$('contrast').value=vals[1];$('navy').value=vals[2];schedule();
}));
$('variation').addEventListener('click',()=>{
  // Rotate the colour palette, not the photographed knit geometry.
  const c=$('yarn').value,n=$('contrast').value;
  $('yarn').value=n;$('contrast').value=c;
  schedule();status('Yarn colours exchanged.');
});
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
    await photosReady;
    paint();
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
    controlsFromState();$('navyWrap').hidden=settings.style!=='fairisle';schedule();status('Settings loaded.');
  }catch(err){status('Could not load settings: '+err.message)}
  finally{e.target.value=''}
});