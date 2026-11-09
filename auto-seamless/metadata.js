'use strict';
/* Redbubble-aware, offline metadata. No fabricated live search volumes. */
(function(){
const E=id=>document.getElementById(id);
const official='Tag principles: Redbubble Help updated Jan 2026; buyer terms cross-checked against existing Redbubble listings. These are qualitative examples, NOT measured search volumes or guaranteed sales.';
const categories={
 cable:{label:'Cable Knit Texture',main:'cable knit',terms:['knitted texture','chunky knit','braided knit','sweater','knitwear','aran knit','cosy','cozy','winter','wool texture','sweater weather','cottagecore','hygge','autumn','rustic','knitted look','soft texture','warm and cosy'],detail:'a braided-stitch sweater look',mood:'cosy, textured style'},
 knit:{label:'Fair Isle Knit',main:'fair isle',terms:['fair isle sweater','knitwear','knitted texture','sweater','winter','traditional knit','cosy','cozy','winter sweater','wool texture','folk knit','colourwork','sweater weather','patterned sweater','heritage knit','yarn texture','cold weather'],detail:'a classic knitted colourwork look',mood:'winter-ready character'},
 snowflake:{label:'Snowflake Winter Design',main:'snowflakes',terms:['snowflake','winter','festive','snow','wintertime','christmas','holiday season','frosty','winter wonderland','cosy winter','cozy winter','snow day','seasonal','winter decor','snowy','christmas snowflakes','holiday'],detail:'snowflake motifs',mood:'a festive winter feeling'},
 floral:{label:'Floral Design',main:'floral',terms:['flowers','flower','botanical','garden','bloom','petals','flower art','spring','summer','nature','romantic','cottagecore','florals','flower lover','botanical art','garden flowers','pretty florals'],detail:'a flower-inspired look',mood:'gentle garden-inspired character'},
 botanical:{label:'Botanical Leaves',main:'botanical',terms:['leaves','foliage','leaf','plants','greenery','nature','botanical art','plant lover','leafy','garden','nature lover','natural','plant art','organic','green leaves','leaf design','foliage art'],detail:'leaf and botanical motifs',mood:'a natural, leafy feeling'},
 geometric:{label:'Geometric Shapes',main:'geometric',terms:['geometric art','abstract geometry','shapes','graphic','modern','abstract','geometry','symmetry','contemporary','lines','minimalist','graphic shapes','bold geometry','colour blocking','modern shapes','geometric print','shape art'],detail:'structured geometric shapes',mood:'a graphic, modern look'},
 stripes:{label:'Striped Design',main:'stripes',terms:['striped','stripe','linear','lines','classic stripes','graphic','minimalist','modern','bold','timeless','clean lines','retro','simple stripes','striped art','stripe design','colour stripes','line art'],detail:'clean repeating stripes',mood:'a classic graphic feel'},
 dots:{label:'Polka Dot Design',main:'polka dots',terms:['polka dot','dots','spotted','spotty','spots','retro','playful','cute','classic polka dots','graphic','circle','whimsical','fun','dotted','vintage feel','polka','dots and spots'],detail:'playful dots',mood:'a cheerful retro-inspired feel'},
 abstract:{label:'Abstract Artwork',main:'abstract',terms:['abstract art','modern','contemporary','graphic','colourful','colorful','artistic','abstract shapes','modern art','expressive','bold','creative','colour palette','modern decor','art lover','artistic style','abstract colour'],detail:'an abstract composition',mood:'a modern decorative feel'}
};
const subjectHints=[
 ['cable',/cable[-_ ]?knit|braided[-_ ]?knit|aran[-_ ]?knit|chunky[-_ ]?knit/i],
 ['snowflake',/snowflake|winter[-_ ]?flake/i],
 ['knit',/knit|wool|yarn|fair[-_ ]?isle|sweater|jumper/i],
 ['floral',/floral|flowers?|daisy|rose|tulip|blossom/i],
 ['botanical',/botanic|leaves?|leaf|foliage|fern/i],
 ['geometric',/geo|diamond|chevron|triangle|hexagon/i],
 ['stripes',/stripes?|pinstripe/i],
 ['dots',/polka|dots?|spots?/i],
 ['abstract',/abstract|marble|swirl/i]
];
const stop=new Set(['img','image','final','master','design','new','upload','file','photo','png','jpg','jpeg','webp','copy','seamless','pattern','repeat','tile','square','5000px','5000','300dpi','300','v1','v2','and','the','for']);
let lastFile='',metadataReady=false;
function clean(s){return String(s||'').replace(/[_-]+/g,' ').replace(/[^a-z0-9 ]/gi,' ').replace(/\s+/g,' ').trim();}
function titleCase(s){return clean(s).toLowerCase().replace(/\b[a-z]/g,m=>m.toUpperCase());}
function inferCategory(name){return (subjectHints.find(x=>x[1].test(name))||['auto'])[0];}
function autoSubject(name){return clean(name).split(' ').filter(x=>x.length>2&&!stop.has(x.toLowerCase())&&!/^(cream|rust|beige|ivory|brown|white|black|grey|gray|blue|green|red|orange|yellow|purple|pink|colour|color|warm|neutral)$/i.test(x)&&!/^\d+$/.test(x)).slice(0,4).join(' ');}
function getColors(){
 const c=sourceCanvas;if(!c.width||!c.height)return ['Colourful'];
 const t=document.createElement('canvas');t.width=72;t.height=72;
 const cx=t.getContext('2d',{willReadFrequently:true});cx.drawImage(c,0,0,72,72);
 const data=cx.getImageData(0,0,72,72).data;
 const bins=new Map();
 for(let i=0;i<data.length;i+=16){
  if(data[i+3]<150)continue;
  const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let name='';
  if(max<47)name='Charcoal';
  else if(d<23){name=max>235?'White':max>194?'Ivory':max>130?'Grey':'Charcoal';}
  else if(max>185&&min>136&&d<92&&r>=b&&g>=b)name='Cream';
  else if(r>g*1.2&&r>b*1.22){if(r>210&&g>115&&b<g*.7)name='Orange';else if(r<145&&g<55)name='Burgundy';else if(g>38&&b<Math.max(62,g*.85)&&g<r*.7)name='Rust';else name='Red';}
  else if(r>g*1.2&&g>b*1.2)name='Terracotta';
  else if(r>155&&g>104&&b<105)name='Ochre';
  else if(g>r*1.22&&g>b*1.14)name='Green';
  else if(b>r*1.25&&b>g*1.15)name='Blue';
  else if(r>g*1.22&&b>g*1.22)name='Purple';
  else if(r>153&&g>118&&b>95)name='Sand';
  else name='Multicolour';
  bins.set(name,(bins.get(name)||0)+1);
 }
 const selected=[...bins.entries()].sort((a,b)=>b[1]-a[1]).filter(x=>x[0]!=='Multicolour');
 return selected.slice(0,2).map(x=>x[0]).length?selected.slice(0,2).map(x=>x[0]):['Colourful'];
}
function makeData(category,subject,colors,grade){
 const c=categories[category];
 // Offline pixel colours cannot identify what an image depicts. Never fill 15 slots
 // with irrelevant 'surface pattern' terms when the subject cannot be established.
 if(!c)return null;
 const specific=clean(subject),palette=(colors||[]).filter(x=>x&&x!=='Colourful').slice(0,2);
 const colorText=palette.join(' & ');
 const likelySame=specific&&new RegExp('\\b'+c.main.split(' ')[0]+'\\b','i').test(specific);
 const titleParts=[colorText,(!likelySame&&specific?titleCase(specific)+' — ':'')+c.label];
 const name=titleParts.filter(Boolean).join(' ').slice(0,110);
 const tags=[],seen=new Set();
 const add=t=>{
  const v=clean(t).toLowerCase().slice(0,50);
  if(!v||seen.has(v))return;
  seen.add(v);tags.push(v);
 };
 add(c.main);
 if(specific&&!likelySame)add(specific);
 c.terms.slice(0,2).forEach(add);
 palette.forEach(add);
 if(palette.length===2){
  const pair=palette.join(' and ').toLowerCase();
  add(pair);
  if(palette.every(x=>/cream|ivory|rust|terracotta|sand|ochre|burgundy/i.test(x)))add('warm neutrals');
 }
 c.terms.slice(2).forEach(add);
 const selected=tags.slice(0,15);
 // Product names deliberately omitted from tags; Redbubble has product filters.
 const colourPhrase=colorText?colorText.toLowerCase()+' ':'';
 const lead=colourPhrase+c.label.toLowerCase()+' artwork with '+c.detail+'.';
 const finish=' '+c.mood.charAt(0).toUpperCase()+c.mood.slice(1)+' for everyday accessories and home décor. Created with the aid of AI.';
 let description=(lead+finish).replace(/\s+/g,' ').trim();
 if(description.length>250)description=description.slice(0,250-29).trimEnd()+' Made with the aid of AI.';
 return {name,main:selected[0],other:selected.slice(1),description,grade,tagCount:selected.length};
}
function parseInputs(){
 const selected=E('metaTheme').value;
 const guessed=inferCategory(lastFile);
 return {category:selected==='auto'?(guessed!=='auto'?guessed:inferCategory(E('metaSubject').value)):selected,subject:E('metaSubject').value,colors:getColors(),grade:(E('scoreFact')?.textContent||'').trim()};
}
function generate(){
 if(!state.source){E('metaNotice').textContent='Upload an image to generate its sales details.';return}
 const p=parseInputs(),m=makeData(p.category,p.subject,p.colors,p.grade);
 if(!m){
  ['metaName','metaMain','metaTags','metaDesc'].forEach(id=>E(id).value='');
  E('metaCount').textContent='0 tags · Subject identification required';
  E('metaNotice').textContent='I can detect colours but cannot recognise this image’s subject offline. Choose what you can actually see from the subject menu. No generic filler tags will be invented.';
  metadataReady=false;return;
 }
 E('metaName').value=m.name;
 E('metaMain').value=m.main;
 E('metaTags').value=m.other.join(', ');
 E('metaDesc').value=m.description;
 E('metaCount').textContent=m.other.length+' additional tags · '+m.tagCount+' total · '+m.description.length+'/250 description characters';
 E('metaNotice').textContent='Buyer-facing keywords based on Redbubble guidance and comparable listing wording, NOT live search-volume data. Check the pictured subject and colours before uploading.';
 metadataReady=true;
}
function prepare(){
 if(!metadataReady)return null;
 let desc=E('metaDesc').value.trim().slice(0,250);
 if(!/\bAI\b/i.test(desc)){
  const suffix=' Made with the aid of AI.';
  desc=desc.slice(0,250-suffix.length).trimEnd()+suffix;
  E('metaDesc').value=desc;
 }
 const title=E('metaName').value.trim(),main=E('metaMain').value.trim().slice(0,50);
 const tags=E('metaTags').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,14).map(x=>x.slice(0,50));
 return {title,main,tags,description:desc};
}
function textFor(which){
 const d=prepare();if(!d)return '';
 if(which==='name')return d.title;
 if(which==='main')return d.main;
 if(which==='tags')return d.tags.join(', ');
 if(which==='desc')return d.description;
 return 'Title: '+d.title+'\nMain tag: '+d.main+'\n14 other tags: '+d.tags.join(', ')+'\nDescription: '+d.description+'\n\nResearch basis: '+official;
}
async function copy(which){
 const t=textFor(which);if(!t)return;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(t)}else{
 const input=document.createElement('textarea');input.value=t;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();
 }E('metaNotice').textContent='Copied '+(which==='all'?'all sales details':which)+'.';}
 catch(_){E('metaNotice').textContent='Copy blocked by the browser. Select the field text and copy it manually.';}
}
function save(){
 const t=textFor('all');if(!t)return;
 const blob=new Blob([t],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=(state.fileName||'pattern')+'-redbubble-metadata.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
}
E('metaTheme').addEventListener('change',generate);
E('metaSubject').addEventListener('input',generate);
E('metaGenerate').addEventListener('click',generate);
for(const x of ['name','main','tags','desc','all'])E('copy-'+x).addEventListener('click',()=>copy(x));
E('saveMeta').addEventListener('click',save);
E('metaDesc').addEventListener('input',()=>{E('metaCount').textContent='14 additional tags · 15 total · '+E('metaDesc').value.length+'/250 description characters'});
const formerLoad=loadFile;
loadFile=async function(file){lastFile=(file&&file.name)||'';metadataReady=false;await formerLoad(file);if(state.source){E('metaSubject').value=autoSubject(lastFile);generate()}};
window.PatternForgeMetadata={makeData,inferCategory,autoSubject};
})();