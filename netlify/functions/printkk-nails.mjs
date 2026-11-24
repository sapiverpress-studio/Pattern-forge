import {createHmac} from 'node:crypto';
const HOST='https://api.printkk.com';
const PING='/api/v1/general/ping', PRODUCT='/api/v1/product/MQNBX3';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function sign(secret,path,params){
  const canonical=Object.entries(params).filter(([k,v])=>k!=='signature'&&k!=='file'&&v!==null&&v!==undefined&&v!==''&&v!=='null').sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('&');
  return createHmac('sha256',secret).update(`GET\n${path}\n${canonical}`,'utf8').digest('hex');
}
// Never return arbitrary upstream strings, even if they look harmless.
export function classify(msg){
  if(typeof msg!=='string'||!msg.trim())return 'no_message';
  const s=msg.slice(0,4096).toLowerCase();
  if(/\bkyc\b|identity|real.name|account verification|verify (your )?account|certification|实名认证/.test(s))return 'account_verification';
  if(/timestamp|recvwindow|clock|time window|request time|time skew/.test(s))return 'timestamp';
  if(/signature|hmac|signing|签名/.test(s))return 'signature';
  if(/\bip\b|whitelist|allowlist|white list|blacklist/.test(s))return 'ip_restriction';
  if(/expir/.test(s))return 'expired';
  if(/api.?key|access.?key|credential|secret.?key|authentication|unauthenticated/.test(s))return 'credential';
  if(/permission|scope|privilege|authoriz|forbidden|access denied|not allowed/.test(s))return 'permission_or_access';
  if(/not found|does not exist|no such/.test(s))return 'not_found';
  if(/rate limit|too many/.test(s))return 'rate_limit';
  return 'unclassified';
}
// Retain only a controlled vocabulary of error terms, never arbitrary text or identifiers.
const words=new Set('a an the your this that is are was were be been being not no has have had to for of from in on with by and or as at please must may can cannot could should need required require complete completed incomplete finish first before after again try contact support customer service account identity verification verify verified unverified kyc real name certification api key access secret authentication authenticated unauthenticated authorization authorized unauthorized authorisation authorised unauthorised signature signing hmac invalid incorrect wrong missing expired expiration expire disabled inactive revoked forbidden denied denied permission permissions scope insufficient allowed allow restriction restricted whitelist allowlist ip address timestamp time server request window recvwindow clock skew outside limit exceeded too many rate found exist exists does failed failure error rejected blocked open enabled enable user status product resource method unsupported unavailable business security risk abnormal format parameter parameters illegal valid success successful'.split(' '));
export function safeMessage(msg,credentials=[]){
  if(typeof msg!=='string'||!msg.trim())return null;
  let s=msg.slice(0,1000);
  for(const value of credentials.filter(Boolean))for(const token of [value,encodeURIComponent(value)])s=s.split(token).join(' [redacted] ');
  return s.toLowerCase().split(/[^a-z]+/).filter(Boolean).slice(0,50).map(w=>words.has(w)?w:'[redacted]').join(' ').replace(/(?:\[redacted\] ){2,}/g,'[redacted] ');
}
async function read(path,key,secret,fetcher,now){
  const params={timestamp:now(),recvWindow:5000};
  const signature=sign(secret,path,params);
  const url=new URL(HOST+path);
  for(const [k,v] of Object.entries({...params,signature}))url.searchParams.set(k,String(v));
  const r=await fetcher(url.toString(),{method:'GET',headers:{'api-key':key,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(3500)});
  const body=await r.json().catch(()=>null);
  const code=Number.isInteger(body?.code)?body.code:null;
  const ok=r.ok&&(body?.success===true||(code===200&&body?.success!==false));
  return {status:r.status,code,ok,data:body?.data,signature,reason:classify(body?.msg),message:safeMessage(body?.msg,[key,secret,signature])};
}
export async function handleRequest(request,{key=process.env.PRINTKK_API_KEY,secret=process.env.PRINTKK_SECRET_KEY,fetcher=fetch,now=Date.now}={}){
  if(request.method!=='GET')return reply({error:'Method not allowed'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return reply({error:'Cross-origin call blocked'},403);
  if(!key||!secret)return reply({error:'PrintKK credentials not configured',accessKeyPresent:!!key,secretKeyPresent:!!secret},503);
  let stage='ping';
  try{
    const ping=await read(PING,key,secret,fetcher,now);
    if(!ping.ok)return reply({error:'PrintKK ping not verified',stage,upstreamStatus:ping.status,code:ping.code,reason:ping.reason,message:ping.message},502);
    stage='product';
    const product=await read(PRODUCT,key,secret,fetcher,now);
    if(!product.ok)return reply({error:'PrintKK product not verified',stage,ping:true,upstreamStatus:product.status,code:product.code,reason:product.reason,message:product.message},502);
    const d=product.data;
    if(!d||typeof d!=='object'||Array.isArray(d))return reply({error:'Unexpected product data',stage,ping:true},502);
    if(d.productCode&&d.productCode!=='MQNBX3')return reply({error:'Unexpected product code',stage,ping:true},502);
    const result={ping:true,productCode:d.productCode??null,fields:Object.keys(d),product:{}};
    for(const field of ['productCode','productName','name','title','printAreas','specifications','variants','skuList','skus','options','attributes','images','mockups','designAreas','productType'])if(Object.hasOwn(d,field))result.product[field]=d[field];
    const raw=JSON.stringify(result);
    if([key,secret,ping.signature,product.signature].some(x=>raw.includes(x)||raw.includes(encodeURIComponent(x))))return reply({error:'Unexpected credential in response'},502);
    if(raw.length>500000)return reply({error:'Product response exceeds diagnostic limit',stage,ping:true},502);
    return reply(result);
  }catch{return reply({error:'PrintKK request failed',stage},502);}
}
export default request=>handleRequest(request);
export const config={path:'/api/printkk-nails',method:'GET',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:3600,windowLimit:10}};
