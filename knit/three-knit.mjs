// Dedicated PBR knitting prototype; no photograph repeats and no 2D motif overlays.
// Three.js MIT; yarn centreline reference: Keenan Crane (MIT code / CC BY 4.0 note).
import * as THREE from './vendor/three.module.js';
const TAU=Math.PI*2,mod=(n,d)=>((n%d)+d)%d;
const styles=['stockinette','rib','seed','cable','fairisle'];
const gauges={superchunky:8,chunky:12,medium:20,fine:28};
const fair=['...##...','..#..#..','.#....#.','#......#','#......#','.#....#.','..#..#..','...##...'];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function typeFor(style,r,c){return style==='rib'&&mod(c,4)>=2?'purl':style==='seed'&&mod(r+c,2)?'purl':'knit'}
function yarnFor(style,r,c,main,contrast){return style==='fairisle'&&fair[mod(r,8)][mod(c,8)]==='#'?contrast:main;}
function point(style,type,row,col,t){
 const a=1.5,h=4,d=.30,theta=col*TAU+t;
 let x=(theta+a*Math.sin(theta*2))/TAU;
 let y=row+.5-h/4.5*Math.cos(t);
 let z=d*Math.cos(t*2);
 if(type==='purl'){z=-z;y+=.14*Math.sin(t*.5)**2;}
 if(style==='cable'&&mod(col,8)>=2&&mod(col,8)<=5){
  const g=mod(col,8)<=3?1:-1,phase=(mod(row,8)+.5)*Math.PI/4;
  const ramp=Math.sin(t/2)**2;
  x+=g*.52*Math.sin(phase)*ramp;
  z+=g*.26*Math.cos(phase)*ramp;
 }
 return new THREE.Vector3(x,y,z);
}
function makeBumpTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256),px=data.data;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const phase=x*.21+y*.35+.7*Math.sin(x*.031+y*.06);
  const ripple=Math.sin(phase)*18+Math.sin(phase*2.4)*8;
  const random=((Math.imul(x+127,73856093)^Math.imul(y+211,19349663))>>>8)%19-9;
  const v=Math.round(clamp(128+ripple+random,0,255)),i=(y*256+x)*4;
  px[i]=px[i+1]=px[i+2]=v;px[i+3]=255;
 }
 ctx.putImageData(data,0,0);
 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(7,3);
 return texture;
}
function mergeGeometries(parts){
 const pos=[],normal=[],uv=[],idx=[];let offset=0;
 for(const geo of parts){
  const p=geo.getAttribute('position'),n=geo.getAttribute('normal'),u=geo.getAttribute('uv'),ind=geo.getIndex();
  for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(u.getX(i),u.getY(i));}
  for(let j=0;j<ind.count;j++)idx.push(ind.getX(j)+offset);
  offset+=p.count;geo.dispose();
 }
 const result=new THREE.BufferGeometry();
 result.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 result.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
 result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 result.setIndex(idx);
 return result;
}
export async function render3d(canvas,{style='stockinette',gauge='superchunky',main='#e2d2b7',contrast='#9b403b',side='back'}={}){
 if(!styles.includes(style))style='stockinette';
 const n=gauges[gauge]||8;
 const scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false,powerPreference:'default'});
 renderer.setPixelRatio(1);renderer.setSize(720,720,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.98;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const camera=new THREE.OrthographicCamera(-n/2,n/2,n/2,-n/2,.1,100);
 const front=side!=='back';camera.position.set(n/2,n/2,front?40:-40);camera.lookAt(n/2,n/2,0);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(n+6,n+6),
   new THREE.MeshStandardMaterial({color:new THREE.Color(main).multiplyScalar(.54),emissive:new THREE.Color(main).multiplyScalar(.10),roughness:1}));
 ground.position.set(n/2,n/2,front?-1.15:1.15);ground.receiveShadow=true;scene.add(ground);
 scene.add(new THREE.HemisphereLight(0xffffff,0x584b47,1.10));
 const key=new THREE.DirectionalLight(0xfff2e1,2.7);
 key.position.set(-n*.45,n*.85,front?n*.95:-n*.95);
 key.castShadow=true;key.shadow.mapSize.set(2048,2048);
 Object.assign(key.shadow.camera,{left:-n*.9,right:n*.9,top:n*.9,bottom:-n*.9,near:.5,far:70});
 key.shadow.bias=-0.00008;key.shadow.radius=3;scene.add(key);
 const fill=new THREE.DirectionalLight(0xc1ddff,.95);fill.position.set(n*1.5,-n*.4,front?n*.7:-n*.7);scene.add(fill);
 const bump=makeBumpTexture();
 const geos=new Map([[main,[]],[contrast,[]]]);
 const fibres=new Map([[main,[]],[contrast,[]]]);
 const segments=gauge==='fine'?16:gauge==='medium'?19:gauge==='chunky'?25:32;
 const radius=gauge==='superchunky'?.225:.195;
 for(let row=-2;row<n+2;row++)for(let col=-2;col<n+2;col++){
  const type=typeFor(style,row,col),colour=yarnFor(style,row,col,main,contrast);
  const pts=[];
  for(let k=0;k<=segments;k++)pts.push(point(style,type,row,col,k*TAU/segments));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.45);
  const geo=new THREE.TubeGeometry(curve,segments,radius,gauge==='fine'?6:9,false);
  geos.get(colour).push(geo);
  // Three very thin plies twist continuously around the surface of each yarn.
  // Unlike stamped bitmap fibres, these strands follow the actual 3D loops.
  const plyCount=gauge==='fine'?1:gauge==='medium'?2:3;
  for(let ply=0;ply<plyCount;ply++){
    const strand=[];
    for(let k=0;k<=segments;k++){
      const here=pts[k],prev=pts[Math.max(k-1,0)],next=pts[Math.min(k+1,segments)];
      const T=next.clone().sub(prev).normalize();
      const B=new THREE.Vector3(-T.y,T.x,0).normalize();
      if(B.lengthSq()<.5)B.set(1,0,0);
      const N=T.clone().cross(B).normalize();
      const angle=6*TAU*k/segments+ply*TAU/plyCount;
      strand.push(here.clone().addScaledVector(B,radius*.94*Math.cos(angle)).addScaledVector(N,radius*.94*Math.sin(angle)));
    }
    const thin=new THREE.CatmullRomCurve3(strand,false,'centripetal',.3);
    fibres.get(colour).push(new THREE.TubeGeometry(thin,segments,gauge==='fine'?.009:.014,3,false));
  }
 }
 for(const [hex,parts] of geos){
  if(!parts.length)continue;
  const geometry=mergeGeometries(parts);
  const material=new THREE.MeshStandardMaterial({color:hex,roughness:.92,metalness:0,bumpMap:bump,bumpScale:.12});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
  const strands=fibres.get(hex);
  if(strands?.length){
    const fibreMesh=new THREE.Mesh(mergeGeometries(strands),
       new THREE.MeshStandardMaterial({color:new THREE.Color(hex).multiplyScalar(1.07),roughness:1,metalness:0}));
    fibreMesh.castShadow=false;fibreMesh.receiveShadow=false;scene.add(fibreMesh);
  }
 }
 renderer.render(scene,camera);
 const output=canvas;
 // Ensure no persistent WebGL contexts on low-memory Android while keeping canvas pixels.
 return {canvas:output,scene,renderer,texture:bump};
}
export function cleanup(run){
 if(!run)return;
 run.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()});
 run.texture.dispose();run.renderer.dispose();
}
