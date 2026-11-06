const $=id=>document.getElementById(id);
let timer=null,controller=null,active=false;
function reset(){
 $('download').hidden=true;$('download').removeAttribute('href');$('artwork').hidden=true;$('artwork').removeAttribute('src');$('empty').hidden=false;
}
function finish(message){active=false;$('generate').disabled=false;$('status').textContent=message;if(timer){clearInterval(timer);timer=null;}}
async function send(path,init={}){
 const response=await fetch('/api/knit-render'+path,{...init,signal:controller.signal,headers:{'Accept':'application/json',...(init.body?{'Content-Type':'application/json'}:{})}});
 const body=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw Error(body.error||`Render service error ${response.status}`);
 return body;
}
async function poll(id){
 try{
  const job=await send('/'+id);
  if(job.status==='queued')$('status').textContent='Queued on the 3D wool rendering server…';
  else if(job.status==='rendering')$('status').textContent='Blender is rendering the actual wool fibres…';
  else if(job.status==='ready'){
   if(!/^https:\/\//.test(job.download_url||''))throw Error('Render completed but download URL is missing');
   $('artwork').src=job.download_url;$('artwork').hidden=false;$('empty').hidden=true;
   $('download').href=job.download_url;$('download').hidden=false;
   finish(`${job.size} × ${job.size} px render ready at 300 DPI. Download your PNG below.`);
  }else if(job.status==='error')finish(job.message||'Render failed. Try again with a smaller size.');
  else throw Error('Unknown render status');
 }catch(e){finish(`Unable to check the render: ${e.message}`);}
}
$('generate').addEventListener('click',async()=>{
 if(active)return;active=true;reset();controller=new AbortController();$('generate').disabled=true;
 $('status').textContent='Requesting actual 3D render…';
 const settings={style:'stockinette',gauge:$('gauge').value,colour:$('colour').value,
    yarn_type:$('yarnType').value,size:Number($('size').value),samples:12};
 try{
  const job=await send('',{method:'POST',body:JSON.stringify(settings)});
  if(!/^[a-f0-9]{32}$/.test(job.id||''))throw Error('Renderer did not return a job ID');
  $('status').textContent='Render queued. You can leave this tab open while the yarn is generated.';
  await poll(job.id);
  if(active)timer=setInterval(()=>poll(job.id),8000);
 }catch(e){finish(`Cannot generate: ${e.message}`);}
});
