const $=id=>document.getElementById(id);
const STORAGE='sapiver-real-knit-designer-v1';
const defaults=Object.freeze({name:'Cosy Wool Knit',style:'stockinette',gauge:'mega',colour:'#ead7b6',yarn_type:'roving',size:5000});
const styles=new Set(['stockinette']),gauges=new Set(['chunky','super','mega']),yarns=new Set(['roving','twisted']),sizes=new Set([720,1500,5000]);
const pic=new Image(),canvas=$('livePreview'),ctx=canvas.getContext('2d',{alpha:false}),buffer=document.createElement('canvas');
let imageReady=false,renderedSignature=null,active=false,timer=null,controller=null,previewScheduled=false;
const normalize=x=>({
 name:typeof x.name==='string'?x.name.replace(/[\\<>]/g,'').slice(0,70):defaults.name,
 style:styles.has(x.style)?x.style:defaults.style,
 gauge:gauges.has(x.gauge)?x.gauge:defaults.gauge,
 colour:/^#[0-9a-f]{6}$/i.test(x.colour||'')?x.colour:defaults.colour,
 yarn_type:yarns.has(x.yarn_type)?x.yarn_type:defaults.yarn_type,
 size:sizes.has(Number(x.size))?Number(x.size):defaults.size
});
function read(){return normalize({name:$('designName').value,style:$('style').value,gauge:$('gauge').value,colour:$('colour').value,yarn_type:$('yarnType').value,size:$('size').value});}
function apply(x){const a=normalize(x);$('designName').value=a.name;$('style').value=a.style;$('gauge').value=a.gauge;$('colour').value=a.colour;$('yarnType').value=a.yarn_type;$('size').value=String(a.size);changed();}
function stamp(x){return [x.style,x.gauge,x.colour,x.yarn_type,x.size].join('|');}
function changed(){
 const s=read();
 try{localStorage.setItem(STORAGE,JSON.stringify(s));}catch{}
 $('yarnPreviewNote').textContent=s.yarn_type==='twisted'?'Twisted ply structure is applied to the final 3D render; the fast live study still shows the roving sample.':'The fast live study is based on actual roving wool. The full render is created separately.';
 if(renderedSignature!==null){$('renderNote').textContent=renderedSignature===stamp(s)?'This 3D render matches your current selections.':'You have changed the design. This is your PREVIOUS render; press Render again for the new settings.';}
 if(!previewScheduled){previewScheduled=true;requestAnimationFrame(()=>{previewScheduled=false;drawPreview();});}
}
function drawPreview(){
 if(!ctx)return;
 const side=720,s=read();
 canvas.width=canvas.height=side;
 ctx.fillStyle='#efece5';ctx.fillRect(0,0,side,side);
 if(!imageReady)return;
 const pixels=buffer.getContext('2d',{willReadFrequently:true});
 buffer.width=pic.naturalWidth;buffer.height=pic.naturalHeight;
 pixels.drawImage(pic,0,0);
 const d=pixels.getImageData(0,0,buffer.width,buffer.height);
 const tint=[1,3,5].map(i=>parseInt(s.colour.slice(i,i+2),16));
 for(let i=0;i<d.data.length;i+=4){
  const lum=.299*d.data[i]+.587*d.data[i+1]+.114*d.data[i+2],shade=Math.max(.24,Math.min(1.65,(lum+10)/213));
  for(let k=0;k<3;k++)d.data[i+k]=Math.max(0,Math.min(255,Math.round((tint[k]*.93+12)*shade)));
 }
 pixels.putImageData(d,0,0);
 const zoom={chunky:1,super:1.27,mega:1.63}[s.gauge],crop=buffer.width/zoom,origin=(buffer.width-crop)/2;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(buffer,origin,origin,crop,crop,0,0,side,side);
 const quick=$('quickPreview'),mini=quick?.getContext('2d',{alpha:false});
 if(mini){mini.clearRect(0,0,quick.width,quick.height);mini.drawImage(canvas,0,0,quick.width,quick.height);}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}
let saved=defaults;try{saved=normalize({...defaults,...JSON.parse(localStorage.getItem(STORAGE)||'{}')})}catch{}
apply(saved);
pic.onload=()=>{imageReady=true;$('previewError').hidden=true;drawPreview();};
pic.onerror=()=>{$('previewError').textContent='The wool sample could not load. The server render has not been requested.';$('previewError').hidden=false;};
pic.src='./assets/stockinette-reference.png';
for(const id of ['designName','style','gauge','colour','yarnType','size'])$(id).addEventListener('input',changed);
document.querySelectorAll('[data-colour]').forEach(b=>b.addEventListener('click',()=>{$('colour').value=b.dataset.colour;changed();}));
$('resetDesign').addEventListener('click',()=>apply(defaults));
$('saveSettings').addEventListener('click',()=>{
 const s=read(),name=(s.name||'cosy-wool-knit').replace(/[^a-z0-9 -]/gi,'').trim().replace(/\s+/g,'-').toLowerCase()||'knit';
 download(new Blob([JSON.stringify({format:'sapiver-real-knit-design-v1',...s},null,2)],{type:'application/json'}),name+'.knit.json');
});
$('loadSettings').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>32768)throw Error('File is too large');const json=JSON.parse(await file.text());
 if(json.format==='sapiver-knit-v1'){
   if(json.style!=='stockinette')throw Error('That knit style is currently supported in the existing /knit/ studio, not the 3D renderer.');
   json.gauge=json.gauge==='megachunky'?'mega':json.gauge==='superchunky'?'super':'chunky';
   json.colour=json.yarn;
   json.yarn_type='roving';
   json.size=5000;
 }else if(json.format!=='sapiver-real-knit-design-v1')throw Error('Unsupported design settings');
 apply(json);$('status').textContent='Design settings loaded. Edit and inspect your preview.';}
 catch(err){$('status').textContent='Could not open design: '+err.message;}finally{e.target.value='';}
});
function finish(message){active=false;$('generate').disabled=false;$('status').textContent=message;if(timer){clearTimeout(timer);timer=null;}}
async function send(path,init={}){
 const response=await fetch('/api/knit-render'+path,{...init,signal:controller.signal,headers:{Accept:'application/json',...(init.body?{'Content-Type':'application/json'}:{})}});
 const body=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw Error(body.error||'Render service error '+response.status);return body;
}
async function poll(id){
 if(!active)return;
 try{
 const job=await send('/'+id);
 if(job.status==='queued')$('status').textContent='Your 3D wool render is queued…';
 else if(job.status==='rendering')$('status').textContent='Blender is building the actual wool fibres…';
 else if(job.status==='ready'){
  if(!/^https:\/\//.test(job.download_url||''))throw Error('Missing completed image URL');
  $('renderedPanel').hidden=false;$('artwork').src=job.download_url;$('artwork').hidden=false;$('empty').hidden=true;
  $('download').href=job.download_url;$('download').hidden=false;
  $('renderNote').textContent=renderedSignature===stamp(read())?'This 3D render matches your current selections.':'Your design changed during rendering. This is the previous selection; render again for your new settings.';
  finish(job.size+' × '+job.size+' px 3D render completed at 300 DPI.');
  return;
 }else if(job.status==='error'){finish(job.message||'Render failed. Try a smaller size.');return;}
 else throw Error('Unknown render status');
 timer=setTimeout(()=>poll(id),8000);
 }catch(e){finish('Unable to check the render: '+e.message);}
}
$('generate').addEventListener('click',async()=>{
 if(active)return;active=true;controller=new AbortController();$('generate').disabled=true;
 const s=read();renderedSignature=stamp(s);
 $('status').textContent='Requesting a new 3D render from your current design…';
 try{
  const job=await send('',{method:'POST',body:JSON.stringify({style:s.style,gauge:s.gauge,colour:s.colour,yarn_type:s.yarn_type,size:s.size,samples:12})});
  if(!/^[a-f0-9]{32}$/.test(job.id||''))throw Error('Renderer did not return a job ID');
  await poll(job.id);
 }catch(e){renderedSignature=null;finish('Cannot generate: '+e.message);}
});
