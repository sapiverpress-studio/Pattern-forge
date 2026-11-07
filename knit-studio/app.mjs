import {STYLES,PALETTES,DEFAULTS,normalize,getRenderer,exportPng} from './engine.mjs';
import {normalizeChart,blankChart,resizeChart,paintCell,drawChart,cellFromPointer} from './motif-chart.mjs';
import {randomiseKnitChart,makeSeed} from './pattern-randomiser.mjs';
const $=id=>document.getElementById(id);
const STORAGE='sapiver-wool-seamless-settings-v1';
const tile=document.createElement('canvas');
const canvas=$('preview'),ctx=canvas.getContext('2d',{alpha:false});
const mini=$('miniPreview').getContext('2d',{alpha:false});
let view='tile',renderer=null,scheduleId=0,requestId=0,exporting=false;
let chart=blankChart(16),activeInk=1,mirrored=false,painting=false;
const undoStack=[],redoStack=[],chartCanvas=$('motifCanvas');
let lastGeneratedSignature=null;
function announce(message){$('editNotice').textContent=message;}
function snapshot(){return {cols:chart.cols,cells:chart.cells.slice(),motifActive:$('motifActive').checked};}
function updateActionButtons(){
 $('undoMotif').disabled=undoStack.length===0;
 $('redoMotif').disabled=redoStack.length===0;
 $('clearMotif').disabled=!chart.cells.some(v=>v!==0);
}
function restoreSnapshot(x){
 chart=normalizeChart(x);
 $('chartCols').value=String(chart.cols);
 $('motifActive').checked=x.motifActive;
}
function useRandomiser(){
 const selected=$('randomStyle').value;
 const old=chart.cells.join(',');
 let generated;
 // Discard a duplicate reroll; otherwise every press creates a fresh design.
 for(let attempt=0;attempt<10;attempt++){
  generated=randomiseKnitChart(chart.cols,selected,makeSeed());
  if(generated.signature!==lastGeneratedSignature&&generated.cells.join(',')!==old)break;
 }
 if(generated.cells.join(',')===old){announce('Try another pattern family for a different look.');return;}
 saveUndo();
 chart=normalizeChart(generated);
 $('motifActive').checked=true;
 lastGeneratedSignature=generated.signature;
 changed();
 const type=generated.style==='checker'?'Geometric checks':generated.style==='snowflakes'?'Snowflake motifs':
  generated.style==='chevrons'?'Zigzags':generated.style==='diamonds'?'Diamonds':'Stripes and borders';
 announce(type+' created. Edit any stitch, or press Another version.');
}
$('randomiseMotif').addEventListener('click',useRandomiser);
$('rerollMotif').addEventListener('click',useRandomiser);
$('randomStyle').addEventListener('change',()=>announce('Ready to generate '+$('randomStyle').selectedOptions[0].text.toLowerCase()+'.'));

function updatePaintStatus(){
 const used=chart.cells.filter(n=>n!==0).length;
 $('paintStatus').textContent=used?used+' coloured stitches in this repeat.':'Blank chart — draw or randomise a motif.';
}
function updateChartView(){
 const colours=[$('colour').value,$('contrast').value,$('third').value];
 drawChart(chartCanvas,chart,colours,activeInk,mirrored);
 document.querySelectorAll('[data-ink]').forEach(b=>{
  b.style.setProperty('--brush-yarn',colours[Number(b.dataset.ink)]);
 });
 updatePaintStatus();
 updateActionButtons();
}
function saveUndo(){
 undoStack.push(snapshot());
 if(undoStack.length>40)undoStack.shift();
 redoStack.length=0;
 updateActionButtons();
}
function setInk(value){
 activeInk=Number(value);
 document.querySelectorAll('[data-ink]').forEach(b=>
  b.setAttribute('aria-pressed',String(Number(b.dataset.ink)===activeInk)));
 announce('Painting with '+['main wool','second wool','third wool'][activeInk]+'. Drag across the chart to draw.');
}
document.querySelectorAll('[data-ink]').forEach(b=>b.addEventListener('click',()=>setInk(b.dataset.ink)));
$('mirrorMotif').addEventListener('change',e=>{
 mirrored=e.target.checked;updateChartView();
 announce(mirrored?'Mirrored drawing on — both sides change together.':'Mirrored drawing off.');
});
$('motifActive').addEventListener('change',()=>{
 changed();announce($('motifActive').checked?'Your original stitch pattern is on.':'Your stitch pattern is hidden. Untick again to show it.');
});
$('chartCols').addEventListener('change',()=>{
 const next=Number($('chartCols').value);
 if(next===chart.cols)return;
 saveUndo();chart=resizeChart(chart,next);changed();
 announce('Grid changed to '+next+' × '+next+'. Use Undo to restore the previous grid.');
});
$('undoMotif').addEventListener('click',()=>{
 if(!undoStack.length){announce('Nothing to undo.');return;}
 redoStack.push(snapshot());restoreSnapshot(undoStack.pop());changed();announce('Undone. Use Redo to bring it back.');
});
$('redoMotif').addEventListener('click',()=>{
 if(!redoStack.length){announce('Nothing to redo.');return;}
 undoStack.push(snapshot());restoreSnapshot(redoStack.pop());changed();announce('Redone.');
});
$('clearMotif').addEventListener('click',()=>{
 if(!chart.cells.some(n=>n!==0)){announce('The stitch chart is already blank.');return;}
 saveUndo();chart.cells.fill(0);changed();
 announce('Chart cleared. Undo will restore your design.');
});
function paintPointer(e){
 const {x,y}=cellFromPointer(chartCanvas,e,chart.cols);
 if(x<0||x>=chart.cols||y<0||y>=chart.rows)return;
 const changedCell=paintCell(chart,x,y,activeInk,mirrored);
 if(changedCell){
  $('motifActive').checked=true;
  changed();
  announce('Stitch painted. Drag to draw; Undo is available.');
 }
}
chartCanvas.addEventListener('pointerdown',e=>{
 if(e.button!==0&&e.pointerType==='mouse')return;
 e.preventDefault();chartCanvas.setPointerCapture(e.pointerId);
 painting=true;saveUndo();paintPointer(e);
});
chartCanvas.addEventListener('pointermove',e=>{
 if(painting&&e.isPrimary){e.preventDefault();paintPointer(e);}
});
function endPaint(){painting=false;}
chartCanvas.addEventListener('pointerup',endPaint);
chartCanvas.addEventListener('pointercancel',endPaint);
chartCanvas.addEventListener('lostpointercapture',endPaint);
const labels={tile:'Single tile',repeat:'3 × 3 repeat',close:'Wool close-up'};
function read(){return normalize({
 name:$('designName').value,style:$('style').value,gauge:$('gauge').value,
 colour:$('colour').value,contrast:$('contrast').value,third:$('third').value,
 variation:Number($('variation').value),fibres:Number($('fibres').value),
 angle:Number($('angle').value),
 motifActive:$('motifActive').checked,chartCols:chart.cols,chartCells:chart.cells.slice()
});}
function setInputs(s,preserveUndo=false){
 const x=normalize(s);
 $('designName').value=x.name;$('style').value=x.style;$('gauge').value=x.gauge;
 $('colour').value=x.colour;$('contrast').value=x.contrast;$('third').value=x.third;
 $('variation').value=String(x.variation);$('fibres').value=String(x.fibres);
 $('angle').value=String(x.angle);
 $('motifActive').checked=x.motifActive;
 chart=normalizeChart({cols:x.chartCols,cells:x.chartCells});
 $('chartCols').value=String(chart.cols);
 if(!preserveUndo){undoStack.length=0;redoStack.length=0;}
 changed();
}
function status(s){$('status').textContent=s;}
function updateVisibility(){
 const fair=$('style').value==='fairisle'||$('motifActive').checked;
 $('contrastWrap').hidden=!fair;$('thirdWrap').hidden=!fair;
 $('variationValue').textContent=$('variation').value+'%';
 $('fibresValue').textContent=$('fibres').value+'%';
 $('motifCanvas').setAttribute('aria-label','Edit your original '+chart.cols+' × '+chart.rows+' knitted stitch chart');
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
 updateChartView();
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
$('reset').addEventListener('click',()=>{
 saveUndo();setInputs(DEFAULTS,true);
 announce('Design reset to blank. Undo restores your previous stitch chart.');
});
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
 const file=new Blob([JSON.stringify({format:'sapiver-wool-stitch-chart-v2',...s},null,2)],{type:'application/json'});
 download(file,filename(s.name,'.wool.json'));
 status('Editable wool design saved.');
 announce('Saved your editable stitch pattern as JSON.');
});
$('loadSettings').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>32768)throw Error('Settings file too large.');
  const data=JSON.parse(await f.text());
  if(data.format==='sapiver-knit-v1'){
   setInputs({style:data.style,gauge:data.gauge==='megachunky'?'mega':data.gauge==='superchunky'?'super':data.gauge,
     colour:data.yarn,contrast:data.contrast,third:data.navy,name:data.name});
  }else if(data.format==='sapiver-wool-seamless-v1'||data.format==='sapiver-wool-stitch-chart-v2')setInputs(data);
  else throw Error('Unrecognised wool settings file.');
  status('Saved design loaded — edit or inspect its repeat.');
  announce('Saved chart loaded — all stitches remain editable.');
 }catch(err){status('Could not load: '+err.message);}
 finally{e.target.value='';}
});
$('downloadPng').addEventListener('click',async()=>{
 if(exporting||!renderer)return;
 exporting=true;++requestId;
 const button=$('downloadPng');button.disabled=true;
 const originalLabel=button.textContent;button.textContent='Rendering PNG…';
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
  exporting=false;button.disabled=false;button.textContent=originalLabel;
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
