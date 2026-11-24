import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../netlify/functions/printkk-nails.mjs';
const req=(method='GET',origin)=>new Request('https://example.netlify.app/api/printkk-nails',{method,headers:origin?{origin}:{}});
const key='mock-secret-only';
const data={productCode:'MQNBX3',printAreas:[{example:'mock'}],specifications:[]};
const ok=()=>Response.json({success:true,data});
const cases=[
 ['only fixed GET with key and redirect blocked', async()=>{const r=await handleRequest(req(),{key,fetcher:async(url,opts)=>{assert.equal(url,'https://api.printkk.com/pkk-openapi/api/v1/product/MQNBX3');assert.equal(opts.method,'GET');assert.equal(opts.headers['Api-Key'],key);assert.equal(opts.redirect,'error');return ok()}});assert.equal(r.status,200);assert.deepEqual(await r.json(),data);assert.equal(r.headers.get('cache-control'),'no-store')}],
 ['no mutation',async()=>assert.equal((await handleRequest(req('POST'),{key,fetcher:()=>assert.fail()})).status,405)],
 ['cross origin blocked',async()=>assert.equal((await handleRequest(req('GET','https://other.example'),{key,fetcher:()=>assert.fail()})).status,403)],
 ['missing key',async()=>assert.equal((await handleRequest(req(),{key:'',fetcher:()=>assert.fail()})).status,503)],
 ['upstream auth failure',async()=>{const r=await handleRequest(req(),{key,fetcher:()=>new Response(key,{status:401})});assert.equal(r.status,502);assert.equal((await r.json()).upstreamStatus,401)}],
 ['application failure',async()=>assert.equal((await handleRequest(req(),{key,fetcher:()=>Response.json({success:false,msg:key})})).status,502)],
 ['wrong product',async()=>assert.equal((await handleRequest(req(),{key,fetcher:()=>Response.json({success:true,data:{productCode:'wrong'}})})).status,502)],
 ['unexpected echoed secret blocked',async()=>assert.equal((await handleRequest(req(),{key,fetcher:()=>Response.json({success:true,data:{...data,printAreas:[key]}})})).status,502)],
 ['network error sanitised',async()=>{const r=await handleRequest(req(),{key,fetcher:()=>{throw Error(key)}});assert.equal(r.status,502);assert.equal((await r.text()).includes(key),false)}]
];
for(const [name,run] of cases)test(name,run);
