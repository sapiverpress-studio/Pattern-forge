/* Reproducible structured colourwork. These are user-editable starting charts,
 * not copied stock artwork, wool photos, nor physical stitch instructions.
 * Integer-periodic composition lets opposite chart edges meet cleanly. */
export const RANDOM_STYLES=Object.freeze(['surprise','diamonds','chevrons','stripes','snowflakes','checker']);
const fract=n=>n-Math.floor(n);
function rng(seed){
 let s=(Number(seed)>>>0)||0x91e10da5;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
}
const between=(rand,a,b)=>a+Math.floor(rand()*(b-a+1));
const wrap=(x,n)=>((x%n)+n)%n;
const wave=x=>1-2*Math.abs(fract(x)-.5);
function dist(p){return Math.abs(fract(p)-.5);}
function patterns(n,kind,seed){
 const rand=rng(seed);
 const freq=between(rand,1,n>=24?3:2);
 const shift=between(rand,0,n-1);
 const phase=between(rand,0,n-1);
 const band=between(rand,1,Math.max(2,Math.floor(n/7)));
 const accent=rand()>.5?1:2;
 const alt=accent===1?2:1;
 const cells=Array(n*n).fill(0);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(x+.5+shift)/n,v=(y+.5+phase)/n;
  const a=u*freq,c=v*freq;
  let ink=0;
  switch(kind){
   case 'diamonds':{
    const d=dist(a)+dist(c);
    if(d>.29&&d<.40)ink=accent;
    if(d<.13&&dist(a)<.15&&dist(c)<.15)ink=alt;
    break;
   }
   case 'chevrons':{
    // One or two symmetrical zigzag tracks crossing a tile boundary.
    const q=fract(c),zig=Math.abs(2*q-1);
    const wavePhase=a+zig*.82;
    if(dist(wavePhase)<.115)ink=accent;
    else if(dist(wavePhase+.23)<.07)ink=alt;
    break;
   }
   case 'stripes':{
    const period=Math.max(4,Math.floor(n/(freq+1)));
    const at=wrap(y+phase,period);
    if(at<band)ink=accent;
    else if(at===band+1)ink=alt;
    // Small regular stitches across a solid stripe, not random pixel noise.
    if(ink===0&&at===period-1&&(x+shift)%4===0)ink=alt;
    break;
   }
   case 'snowflakes':{
    // A radial Fair-Isle-inspired motif with axial symmetry and dots.
    const ix=Math.min(wrap(x+shift,n),wrap(-x-shift-1,n));
    const iy=Math.min(wrap(y+phase,n),wrap(-y-phase-1,n));
    const m=Math.floor(n/2);
    const dx=Math.abs(ix-Math.floor(m/2)),dy=Math.abs(iy-Math.floor(m/2));
    if((dx===0&&dy<m*.67)||(dy===0&&dx<m*.67)||(dx===dy&&dx<m*.49))ink=accent;
    if((dx+dy)===Math.max(2,Math.floor(m*.62)))ink=alt;
    break;
   }
   case 'checker':{
    const cellX=Math.floor(fract(a)*4),cellY=Math.floor(fract(c)*4);
    if((cellX+cellY)%2===0)ink=accent;
    if(cellX%2===0&&cellY%2===0)ink=alt;
    break;
   }
   default:throw Error('Unknown pattern family');
  }
  cells[y*n+x]=ink;
 }
 return cells;
}
function hashOf(cells){let h=2166136261;for(const v of cells){h^=v+1;h=Math.imul(h,16777619);}return h>>>0;}
export function randomiseKnitChart(cols,style='surprise',seed=0){
 const n=Number(cols);
 if(![12,16,24,32].includes(n))throw Error('Unsupported chart size');
 if(!RANDOM_STYLES.includes(style))throw Error('Unsupported randomiser pattern');
 const num=Number(seed)>>>0;
 const rand=rng(num^0x7182cd3f);
 const chosen=style==='surprise'?RANDOM_STYLES[between(rand,1,RANDOM_STYLES.length-1)]:style;
 const cells=patterns(n,chosen,num);
 // A useful colourwork pattern should not be blank or one large block.
 const tones=new Set(cells);
 if(!tones.has(0)||!tones.has(1)||!tones.has(2)){
  // For very small grids, introduce paired decorative stitches.
  const centre=Math.floor(n/2);
  cells[centre*n+centre]=1;
  cells[(centre-1)*n+centre-1]=2;
  cells[0]=0;
 }
 return {cols:n,rows:n,cells,style:chosen,seed:num,signature:hashOf(cells)};
}
export function makeSeed(){
 if(typeof crypto!=='undefined'&&crypto.getRandomValues){
  return crypto.getRandomValues(new Uint32Array(1))[0]>>>0;
 }
 return Math.floor(Math.random()*4294967296)>>>0;
}
