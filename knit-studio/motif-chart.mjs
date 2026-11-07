/* Original, user-drawn knit colour charts; no stock motif library. */
export const GRID_SIZES=Object.freeze([12,16,24,32]);
export const PAINT_COLORS=Object.freeze(['Main wool','Second wool','Third wool']);
export function blankChart(cols=16){
 if(!GRID_SIZES.includes(Number(cols)))throw Error('Unsupported chart size');
 return {cols:Number(cols),rows:Number(cols),cells:Array(Number(cols)**2).fill(0)};
}
export function normalizeChart(input){
 const cols=GRID_SIZES.includes(Number(input?.cols))?Number(input.cols):16;
 const raw=input?.cells;
 const cells=Array.isArray(raw)&&raw.length===cols*cols?
  raw.map(n=>[0,1,2].includes(Number(n))?Number(n):0):Array(cols*cols).fill(0);
 return {cols,rows:cols,cells};
}
export function resizeChart(source,cols){
 const old=normalizeChart(source),out=blankChart(cols);
 for(let y=0;y<out.rows;y++)for(let x=0;x<out.cols;x++){
  const oy=Math.min(old.rows-1,Math.floor((y+.5)*old.rows/out.rows));
  const ox=Math.min(old.cols-1,Math.floor((x+.5)*old.cols/out.cols));
  out.cells[y*out.cols+x]=old.cells[oy*old.cols+ox];
 }
 return out;
}
export function paintCell(chart,x,y,ink,mirror=false){
 if(![0,1,2].includes(ink)||x<0||x>=chart.cols||y<0||y>=chart.rows)return false;
 const key=y*chart.cols+x;
 const before=chart.cells[key];
 chart.cells[key]=ink;
 if(mirror)chart.cells[y*chart.cols+(chart.cols-1-x)]=ink;
 return before!==ink;
}
export function chartTextureData(chart){
 const x=normalizeChart(chart),data=new Uint8Array(x.cells.length*4);
 for(let i=0;i<x.cells.length;i++){
  const v=x.cells[i]===0?0:x.cells[i]===1?127:255;
  data[i*4]=v;data[i*4+1]=v;data[i*4+2]=v;data[i*4+3]=255;
 }
 return {cols:x.cols,rows:x.rows,data};
}
function shade(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function drawChart(canvas,chart,inks,brush=1,mirrored=false){
 const x=normalizeChart(chart),ctx=canvas.getContext('2d');
 const w=canvas.width,h=canvas.height,cw=w/x.cols,ch=h/x.rows;
 const colors=inks.map(shade);
 ctx.clearRect(0,0,w,h);
 for(let j=0;j<x.rows;j++)for(let i=0;i<x.cols;i++){
  const ink=x.cells[j*x.cols+i],c=colors[ink];
  const px=i*cw,py=j*ch;
  ctx.fillStyle='rgb('+c.join(',')+')';ctx.fillRect(px,py,cw+0.2,ch+0.2);
  // Distinct stitch-shaped indicator, not claiming to be the final wool render.
  const bright=(c[0]*.3+c[1]*.59+c[2]*.11)>126;
  ctx.strokeStyle=bright?'rgba(25,30,33,.66)':'rgba(255,250,243,.84)';
  ctx.lineWidth=Math.max(1.1,cw*.083);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(px+cw*.20,py+ch*.19);ctx.lineTo(px+cw*.50,py+ch*.77);ctx.lineTo(px+cw*.80,py+ch*.19);
  ctx.stroke();
 }
 ctx.lineWidth=1;ctx.strokeStyle='rgba(0,0,0,.26)';
 for(let i=0;i<=x.cols;i++){ctx.beginPath();ctx.moveTo(i*cw+.5,0);ctx.lineTo(i*cw+.5,h);ctx.stroke();}
 for(let j=0;j<=x.rows;j++){ctx.beginPath();ctx.moveTo(0,j*ch+.5);ctx.lineTo(w,j*ch+.5);ctx.stroke();}
 if(mirrored){
  ctx.strokeStyle='rgba(25,63,122,.85)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
 }
}
export function cellFromPointer(canvas,event,cols){
 const bounds=canvas.getBoundingClientRect();
 const x=Math.floor((event.clientX-bounds.left)/bounds.width*cols);
 const y=Math.floor((event.clientY-bounds.top)/bounds.height*cols);
 return {x,y};
}
