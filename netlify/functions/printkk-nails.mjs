import {createHmac} from 'node:crypto';
const HOST='https://api.printkk.com';
const PING='/api/v1/general/ping', PRODUCT='/api/v1/product/MQNBX3';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function sign(secret,path,params){
  const canonical=Object.entries(params).filter(([k,v])=>k!=='signature'&&k!=='file'&&v!==null&&v!==undefined&&v!==''&&v!=='null').sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('&');
  return createHmac('sha256',secret).update(`GET\n${path}\n${canonical}`,'utf8').digest('hex');
}
// Only the two fixed, scalar-parameter GET routes are permitted. Never accept user-supplied URLs.
async function read(path,prefix,key,secret,fetcher,now){
  const params={timestamp:now(),recvWindow:5000};
  const signature=sign(secret,path,params);
  const url=new URL(HOST+prefix+path);
  for(const [k,v] of Object.entries({...params,signature}))url.searchParams.set(k,String(v));
  const r=await fetcher(url.toString(),{method:'GET',headers:{'api-key':key,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(2500)});
  const body=await r.json().catch(()=>null);
  const code=Number.isInteger(body?.code)?body.code:null;
  const ok=r.ok&&(body?.success===true||(code===200&&body?.success!==false));
  return {status:r.status,code,ok,data:body?.data,signature};
}
export async function handleRequest(request,{key=process.env.PRINTKK_API_KEY,secret=process.env.PRINTKK_SECRET_KEY,fetcher=fetch,now=Date.now}={}){
  if(request.method!=='GET')return reply({error:'Method not allowed'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return reply({error:'Cross-origin call blocked'},403);
  if(!key||!secret)return reply({error:'PrintKK credentials not configured',accessKeyPresent:!!key,secretKeyPresent:!!secret},503);
  let stage='ping';const attempts=[];
  try{
    let prefix='/pkk-openapi';
    let ping=await read(PING,prefix,key,secret,fetcher,now);
    attempts.push({prefix,status:ping.status,code:ping.code});
    if(ping.status===404){prefix='';ping=await read(PING,prefix,key,secret,fetcher,now);attempts.push({prefix,status:ping.status,code:ping.code});}
    if(!ping.ok)return reply({error:'PrintKK ping not verified',stage,attempts},502);
    stage='product';
    const product=await read(PRODUCT,prefix,key,secret,fetcher,now);
    if(!product.ok)return reply({error:'PrintKK product not verified',stage,ping:true,prefix,upstreamStatus:product.status,code:product.code},502);
    const d=product.data;
    if(!d||typeof d!=='object'||Array.isArray(d))return reply({error:'Unexpected product data',stage,ping:true,prefix},502);
    if(d.productCode&&d.productCode!=='MQNBX3')return reply({error:'Unexpected product code',stage,ping:true,prefix},502);
    const result={ping:true,prefix,productCode:d.productCode??null,fields:Object.keys(d),product:{}};
    for(const field of ['productCode','productName','name','title','printAreas','specifications','variants','skuList','skus','options','attributes','images','mockups','designAreas','productType'])if(Object.hasOwn(d,field))result.product[field]=d[field];
    const raw=JSON.stringify(result);
    if([key,secret,ping.signature,product.signature].some(x=>raw.includes(x)||raw.includes(encodeURIComponent(x))))return reply({error:'Unexpected credential in response'},502);
    if(raw.length>500000)return reply({error:'Product response exceeds diagnostic limit',stage,ping:true,prefix},502);
    return reply(result);
  }catch{return reply({error:'PrintKK request failed',stage,attempts},502);}
}
export default request=>handleRequest(request);
export const config={path:'/api/printkk-nails',method:'GET',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:3600,windowLimit:10}};
