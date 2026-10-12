/* Raised pigment geometry shared by the canvas renderer and true-vector SVG export.
   All ridges use the editable stroke centreline, pressure and deterministic relief.
   This is a 2D impasto illustration, not a 3D height map or photographed texture. */
(function(){
  "use strict";
  const styles=new Set(["impasto","piped","knife"]);
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const round=v=>Number(v.toFixed(3));
  function rgb(hex){
    const x=/^#([\da-f]{6})$/i.exec(String(hex||""));
    return x?[parseInt(x[1].slice(0,2),16),parseInt(x[1].slice(2,4),16),parseInt(x[1].slice(4,6),16)]:[160,95,56];
  }
  function shade(base,amount){
    return "#"+base.map(n=>Math.round(clamp(amount>=0?n+(255-n)*amount:n*(1+amount),0,255)).toString(16).padStart(2,"0")).join("");
  }
  function seedValue(v){
    let h=2166136261;
    for(const ch of String(v??0)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
    return (h>>>0)%8192;
  }
  function relativeWidth(m,p){
    if(!m.pressureWidth)return 1;
    const min=clamp(Number(m.pressureMin??18)/100,.05,.8);
    const response=clamp(Number(m.pressureSensitivity??100)/100,0,1);
    const pressure=clamp(Number(p??1),.01,1);
    return min+(1-min)*(1-(1-pressure)*response);
  }
  function geometry(m){
    const raw=Array.isArray(m.points)?m.points:[];
    if(!raw.length)return [];
    const style=m.brushStyle||"impasto";
    const base=Math.max(.45,Number(m.width)||1)*(style==="knife"?1.3:style==="piped"?1.12:1.18);
    let distance=0;
    for(let i=1;i<raw.length;i++)distance+=Math.hypot(raw[i].x-raw[i-1].x,raw[i].y-raw[i-1].y);
    const step=Math.max(.6,Math.min(12,base*.21),distance/800);
    const samples=[{x:raw[0].x,y:raw[0].y,p:relativeWidth(m,raw[0].p)}];
    for(let i=1;i<raw.length;i++){
      const a=raw[i-1],b=raw[i],length=Math.hypot(b.x-a.x,b.y-a.y);
      if(length<.01)continue;
      const n=Math.max(1,Math.ceil(length/step));
      for(let j=1;j<=n;j++){
        const t=j/n;
        samples.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
          p:relativeWidth(m,(Number(a.p??1)*(1-t)+Number(b.p??1)*t))});
      }
    }
    if(samples.length===1)samples.push({...samples[0],x:samples[0].x+.01});
    const seed=seedValue(m.id),amount=clamp(Number(m.texture??.7),0,1);
    for(let i=0;i<samples.length;i++){
      const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(.001,Math.hypot(dx,dy)),sample=samples[i];
      sample.nx=-dy/len;sample.ny=dx/len;sample.width=base*sample.p;
      sample.wave=(Math.sin(i*.47+seed*.03)*.014+Math.sin(i*1.27+seed*.021)*.007)*amount;
    }
    return samples;
  }
  function ribbons(m){
    if(!styles.has(m.brushStyle))return null;
    const base=rgb(m.color),amount=clamp(Number(m.texture??.7),0,1);
    const depth=.22+amount*.78;
    const band=(lo,hi,tint,alpha=1,dx=0,dy=0,rough=1)=>({
      lo,hi,color:shade(base,tint*depth),alpha,dx,dy,rough
    });
    const bands=[
      band(-.54,.54,-.62,.52,.035,.10,1),
      band(-.52,.52,-.26),
      band(-.47,.46,.055),
      band(.34,.48,-.28,.84),
      band(-.47,-.34,.26,.88)
    ];
    if(m.brushStyle==="piped"){
      // Extruded paint: three rounded relief peaks separated by narrow furrows.
      bands.push(band(-.32,-.22,-.35,.85));
      bands.push(band(-.17,-.055,.42));
      bands.push(band(.045,.16,-.30,.85));
      bands.push(band(.18,.30,.39));
      bands.push(band(-.42,-.39,.52,.8));
      bands.push(band(.31,.335,.24,.77));
    }else if(m.brushStyle==="knife"){
      // Flat-sided thick paint laid with a palette knife: scraped highlights
      // and one strong dark knife-edge, not evenly spaced smooth tubes.
      bands.push(band(-.44,-.28,.35,.91,0,0,2));
      bands.push(band(-.27,-.245,-.24,.72,0,0,2));
      bands.push(band(-.19,.025,.11,.92,0,0,2));
      bands.push(band(.06,.09,-.4,.6,0,0,2));
      bands.push(band(.13,.26,.30,.72,0,0,2));
      bands.push(band(.3,.35,-.26,.7,0,0,2));
    }else{
      // Natural irregular oil paint impasto with bristle-raked crest lines.
      bands.push(band(-.38,-.24,.36,.91));
      bands.push(band(-.22,-.18,-.32,.75));
      bands.push(band(-.12,-.025,.39,.95));
      bands.push(band(.09,.135,-.31,.82));
      bands.push(band(.16,.26,.27,.77));
      bands.push(band(.27,.30,.42,.86));
    }
    return {samples:geometry(m),bands};
  }
  function coordinates(samples,band,side){
    return samples.map(p=>{
      const offset=(side+band.rough*p.wave)*p.width;
      return {x:p.x+offset*p.nx+band.dx*p.width,y:p.y+offset*p.ny+band.dy*p.width};
    });
  }
  function bandPath(samples,band){
    const left=coordinates(samples,band,band.lo),right=coordinates(samples,band,band.hi);
    return {left,right};
  }
  function caps(samples,band){
    return [samples[0],samples[samples.length-1]].map(p=>{
      const r=Math.max(.02,(band.hi-band.lo)*p.width/2),middle=(band.lo+band.hi)/2+band.rough*p.wave;
      return {x:p.x+middle*p.width*p.nx+band.dx*p.width,y:p.y+middle*p.width*p.ny+band.dy*p.width,r};
    });
  }
  function draw(ctx,m){
    const shape=ribbons(m);if(!shape)return false;
    const original=ctx.globalAlpha;ctx.save();
    for(const band of shape.bands){
      const {left,right}=bandPath(shape.samples,band);
      ctx.globalAlpha=original*band.alpha;ctx.fillStyle=band.color;
      ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);
      for(let i=1;i<left.length;i++)ctx.lineTo(left[i].x,left[i].y);
      for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y);
      ctx.closePath();ctx.fill();
      for(const cap of caps(shape.samples,band)){
        ctx.beginPath();ctx.arc(cap.x,cap.y,cap.r,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();return true;
  }
  function toSVG(m){
    const shape=ribbons(m);if(!shape)return null;
    return shape.bands.map(b=>{
      const {left,right}=bandPath(shape.samples,b),out=[...left,...right.reverse()];
      const d=out.map((p,i)=>(i?"L":"M")+round(p.x)+" "+round(p.y)).join(" ")+" Z";
      const circles=caps(shape.samples,b).map(p=>'<circle cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="'+round(p.r)+'"/>').join("");
      return '<g fill="'+b.color+'"'+(b.alpha<1?' fill-opacity="'+round(b.alpha)+'"':'')+'><path d="'+d+'"/>'+circles+'</g>';
    }).join("");
  }
  window.PatternForgeRaisedPaint=Object.freeze({styles:["impasto","piped","knife"],draw,toSVG});
})();
