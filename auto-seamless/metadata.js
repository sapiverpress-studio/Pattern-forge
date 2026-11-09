'use strict';
/* Redbubble-aware, offline metadata. No fabricated live search volumes. */
(function(){
const E=id=>document.getElementById(id);
const official='Redbubble guidance (2026): up to 15 relevant tags, 50 characters each, and descriptions up to 250 characters. No live demand figures are available offline.';
const categories={
 auto:{label:'Seamless Surface Pattern',main:'seamless pattern',tags:['repeating pattern','surface pattern design','all over pattern','repeat print','patterned textile','decorative repeat','surface design','fabric pattern','pattern design','textile print','home decor pattern','continuous pattern']},
 knit:{label:'Fair Isle Knit Pattern',main:'fair isle pattern',tags:['fair isle knit','knitted texture','knit pattern','cosy knit','sweater print','winter knitwear','traditional knitting','knitted fabric','wool texture','textile design','folk knit pattern','jacquard knit','knitwear motif']},
 snowflake:{label:'Snowflake Winter Pattern',main:'snowflake pattern',tags:['winter snowflakes','snowflake motif','winter pattern','snowflake design','festive textile','cosy winter print','winter decoration','seasonal pattern','scandinavian winter','nordic pattern','holiday textile','winter repeat','snowflake print']},
 floral:{label:'Floral Repeat Pattern',main:'floral pattern',tags:['flower pattern','botanical illustration','floral print','flower repeat','botanical pattern','garden inspired','decorative florals','floral textile','nature pattern','flower design','repeating florals','vintage floral','plant motif']},
 geometric:{label:'Geometric Repeat Pattern',main:'geometric pattern',tags:['geometric design','abstract geometry','geometric textile','geometric shapes','geometric print','graphic pattern','modern geometry','surface design','repeating shapes','structured repeat','decorative geometry','bold geometric','geometric motif']},
 stripes:{label:'Striped Repeat Pattern',main:'striped pattern',tags:['stripes','stripe design','striped textile','striped print','linear pattern','colourful stripes','vertical stripes','horizontal stripes','repeating lines','stripe motif','graphic stripes','simple repeat','modern textile']},
 botanical:{label:'Botanical Repeat Pattern',main:'botanical pattern',tags:['botanical print','leaf pattern','foliage design','plant pattern','nature inspired','leaf repeat','greenery motif','botanical textile','repeating leaves','organic shapes','plant inspired print','leaf motif','garden pattern']},
 dots:{label:'Polka Dot Repeat Pattern',main:'polka dot pattern',tags:['polka dots','dotted print','dot pattern','repeating dots','spot pattern','graphic dots','retro dots','decorative spots','simple geometric','playful pattern','small dots','circle pattern','spotted textile']},
 abstract:{label:'Abstract Repeat Pattern',main:'abstract pattern',tags:['abstract design','abstract textile','contemporary pattern','abstract print','modern decor pattern','decorative abstract','graphic design','colourful abstract','expressive pattern','abstract shapes','modern repeat','artistic texture','surface design']}
};
const subjectHints=[['snowflake',/snowflakes?|winter[-_ ]?flake/i],['knit',/knit|wool|yarn|fair[-_ ]?isle|sweater|jumper/i],['floral',/floral|flowers?|daisy|rose|tulip|blossom/i],['geometric',/geo|diamond|chevron|triangle|hexagon/i],['stripes',/stripes?|pinstripe/i],['botanical',/botanic|leaves?|leaf|foliage|fern/i],['dots',/polka|dots?|spots?/i],['abstract',/abstract|marble|swirl/i]];
const stop=new Set(['img','image','final','master','design','new','upload','file','photo','png','jpg','jpeg','webp','copy','seamless','pattern','repeat','tile','square','5000px','5000','300dpi','300','v1','v2','and','the','for']);
let lastFile='',metadataReady=false;
function clean(s){return String(s||'').replace(/[_-]+/g,' ').replace(/[^a-z0-9 ]/gi,' ').replace(/\s+/g,' ').trim();}
function titleCase(s){return clean(s).toLowerCase().replace(/\b[a-z]/g,m=>m.toUpperCase());}
function inferCategory(name){return (subjectHints.find(x=>x[1].test(name))||['auto'])[0];}
function autoSubject(name){return clean(name).split(' ').filter(x=>x.length>2&&!stop.has(x.toLowerCase())&&!/^\d+$/.test(x)).slice(0,4).join(' ');}
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
  else if(r>g*1.2&&r>b*1.22)name=max<160?'Burgundy':g>85?'Rust':'Red';
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
 const c=categories[category]||categories.auto;
 const colorName=colors.length>1?colors.join(' & '):colors[0];
 const specific=clean(subject),noun=specific?titleCase(specific)+' Pattern':c.label;
 const name=(colorName+' '+noun).slice(0,95);
 const main=c.main;
 const tags=[];
 const add=t=>{t=clean(t).toLowerCase().slice(0,50);if(t&&!tags.some(x=>x.toLowerCase()===t))tags.push(t);};
 add(main);
 if(specific)add(specific.toLowerCase()+' pattern');
 if(colors.length===2)add(colors.join(' and ').toLowerCase()+' pattern');
 else add(colors[0].toLowerCase()+' pattern');
 c.tags.forEach(add);
 ['seamless repeat','repeating pattern','pattern design','all over print','decorative surface','textile pattern','surface pattern','repeat design','fabric design','colour palette','modern print','home decor design','artistic pattern','continuous print'].forEach(add);
 if(tags.length<15)throw Error('Insufficient tags');
 const selected=tags.slice(0,15);
 const observed=category==='auto'?'repeating surface design':c.label.toLowerCase();
 const blurb=(colorName.toLowerCase()+' '+observed+' with a continuous repeat, designed for decorative accessories and home textiles. Created with the aid of AI and refined into a repeatable print.').replace(/\s+/g,' ').trim();
 const description=blurb.slice(0,250);
 return {name,main:selected[0],other:selected.slice(1),description,grade};
}
function parseInputs(){
 const selected=E('metaTheme').value;
 const guessed=inferCategory(lastFile);
 return {category:selected==='auto'?guessed:selected,subject:E('metaSubject').value,colors:getColors(),grade:(E('scoreFact')?.textContent||'').trim()};
}
function generate(){
 if(!state.source){E('metaNotice').textContent='Upload an image to generate its sales details.';return}
 const p=parseInputs(),m=makeData(p.category,p.subject,p.colors,p.grade);
 E('metaName').value=m.name;
 E('metaMain').value=m.main;
 E('metaTags').value=m.other.join(', ');
 E('metaDesc').value=m.description;
 E('metaCount').textContent='14 additional tags · 15 total · '+m.description.length+'/250 description characters';
 E('metaNotice').textContent=p.category==='auto'?
  'Subject could not be identified reliably offline. Colours and repeat are automatic; select a subject for more precise tags.':
  'Draft generated using palette analysis and your subject selection. Review tags against what is actually visible.';
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