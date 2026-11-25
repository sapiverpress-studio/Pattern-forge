import test from "node:test";
import assert from "node:assert/strict";
import {analyzeImage,validateListing,handleRequest,config} from "../netlify/functions/auto-seamless-listing.mjs";
const base="http://localhost:4185/api/auto-seamless-listing";
const tiny="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+p4QAAAABJRU5ErkJggg==";
const tags=["knitted texture","chunky knit","braided wool","cable stitch","cream","rust","sweater texture","soft wool","cozy","cosy","winter warmth","neutral tones","classic knit","aran style"];
const etsyTags=["seamless pattern","knit digital paper","sweater texture","winter craft paper","scrapbook design","cable knit print","fabric print design","warm neutral paper","rust cream pattern","gift wrap pattern","textile digital art","cozy craft print","knit repeat tile"];
const valid={title:"Cream and Rust Cable Knit Texture",main_tag:"cable knit",other_tags:tags,etsy_tags:etsyTags,description:"Warm braided wool texture with cream and rust cable stitches. Created with the aid of AI.",visual_subject:"cable knit"};
function mock(content=valid){
 const seen=[];
 return {seen,chat:{completions:{create:async q=>{seen.push(q);return {choices:[{message:{content:JSON.stringify(content)}}]}}}}};
}
function req(data,{method="POST",origin="http://localhost:4185"}={}){
 return new Request(base,{method,headers:{"content-type":"application/json","origin":origin},body:method==="POST"?JSON.stringify(data):undefined});
}
test("vision prompt receives thumbnail and returns 15 buyer-language tags",async()=>{
 const client=mock();
 const result=await analyzeImage(tiny,"IMG_0019.png",client);
 assert.equal(client.seen.length,1,"Valid output must not incur a correction request");
 assert.equal(result.title,valid.title);
 assert.equal(result.main_tag,"cable knit");
 assert.equal(result.other_tags.length,14);
 assert.deepEqual(result.etsy_tags,etsyTags);
 assert.equal(result.etsy_source,"buyer-intent-suggestions-not-live-keyword-research");
 assert.equal(new Set([result.main_tag,...result.other_tags]).size,15);
 assert.match(result.description,/aid of AI/);
 assert.equal(result.live_search_volume,false);
 const messages=client.seen[0].messages;
 assert.equal(messages[1].content[1].type,"image_url");
 assert.equal(messages[1].content[1].image_url.url,tiny);
 assert.equal(client.seen[0].model,"gpt-4o-mini");
});
test("AI descriptions always disclose assistance",()=>{
 const out=validateListing({...valid,description:"Braided cable texture in ivory and rust."});
 assert.match(out.description,/aid of AI/);
 assert.ok(out.description.length<=250);
});
test("rejects incomplete and generic false keywords",()=>{
 assert.throws(()=>validateListing({...valid,other_tags:["surface pattern design",...tags.slice(1)]}));
 assert.throws(()=>validateListing({...valid,other_tags:tags.slice(0,8)}));
 assert.throws(()=>validateListing({...valid,etsy_tags:etsyTags.slice(0,12)}));
 assert.throws(()=>validateListing({...valid,etsy_tags:[...etsyTags.slice(0,12),etsyTags[0]]}));
 assert.throws(()=>validateListing({...valid,etsy_tags:[...etsyTags.slice(0,12),"a tag exceeding 20 characters"]}));
});
test("valid same-site POST works without exposing credentials",async()=>{
 const answer=await handleRequest(req({imageDataUrl:tiny,filename:"IMG_0019.png"}),mock());
 assert.equal(answer.status,200);
 const data=await answer.json();
 assert.equal(data.other_tags.length,14);
 assert.equal(answer.headers.get("Cache-Control"),"no-store");
});
test("rejects cross-origin, oversized, wrong-media and GET requests",async()=>{
 assert.equal((await handleRequest(req({imageDataUrl:tiny},{origin:"https://attacker.example"}),mock())).status,403);
 assert.equal((await handleRequest(new Request(base,{method:"GET"}),mock())).status,405);
 assert.equal((await handleRequest(req({imageDataUrl:"data:text/html;base64,PGh0bWw+"}),mock())).status,400);
 assert.equal((await handleRequest(req({imageDataUrl:"data:image/png;base64,"+"A".repeat(900000)}),mock())).status,400);
});
test("upstream failures return no fabricated listing",async()=>{
 const client={chat:{completions:{create:async()=>{throw Error("Simulated service failure")}}}};
 const ans=await handleRequest(req({imageDataUrl:tiny}),client);
 assert.equal(ans.status,502);
 const msg=await ans.json();
 assert.match(msg.error,/no generic tags/i);
 assert.equal(config.rateLimit.windowLimit,12);
});

function sequence(contents){
 const seen=[];
 return {seen,chat:{completions:{create:async(q,options)=>{
  seen.push({request:structuredClone(q),signal:options.signal});
  const value=contents[Math.min(seen.length-1,contents.length-1)];
  if(value instanceof Error)throw value;
  return {choices:[{message:{content:typeof value==="string"?value:JSON.stringify(value)}}]};
 }}}};
}
for(const [reason,invalid] of [
 ["etsy_length",{...valid,etsy_tags:[...etsyTags.slice(0,12),"christmas digital paper"]}],
 ["etsy_duplicates",{...valid,etsy_tags:[...etsyTags.slice(0,12),etsyTags[0].toUpperCase()]}],
 ["etsy_count",{...valid,etsy_tags:etsyTags.slice(0,12)}],
 ["redbubble_tags",{...valid,other_tags:["surface pattern design",...tags.slice(1)]}],
 ["response_format","{incomplete json"],
 ["description_missing",{...valid,description:""}]
])test(`corrects ${reason} once without relaxing validation`,async()=>{
 const client=sequence([invalid,valid]);
 const result=await analyzeImage(tiny,"arbitrary filename.png",client);
 assert.deepEqual(result.etsy_tags,etsyTags);
 assert.equal(client.seen.length,2);
 assert.equal(client.seen[0].request.messages.length,2);
 const correction=client.seen[1].request.messages;
 assert.equal(correction.length,4);
 assert.equal(correction[2].role,"assistant");
 assert.match(correction[3].content,/Correct the previous listing/);
 assert.match(correction[3].content,/Do not invent details/);
 assert.equal(correction[1].content[1].image_url.url,tiny,"Keep correction grounded in the same image");
 assert.equal(client.seen[0].signal,client.seen[1].signal,"Both requests share one deadline");
});
test("stops after one failed correction, with safe diagnostic evidence",async t=>{
 const logs=[];
 t.mock.method(console,"error",(...parts)=>logs.push(parts.join(" ")));
 t.mock.method(console,"warn",(...parts)=>logs.push(parts.join(" ")));
 const invalid={...valid,etsy_tags:[...etsyTags.slice(0,12),"private image subject that exceeds twenty characters"]};
 const client=sequence([invalid,invalid]);
 const response=await handleRequest(req({imageDataUrl:tiny,filename:"private-file.png"}),client);
 assert.equal(response.status,502);
 const data=await response.json();
 assert.equal(data.code,"listing_validation_failed");
 assert.match(data.error,/after one correction attempt/);
 assert.equal(data.etsy_tags,undefined,"Never return a fabricated or invalid fallback");
 assert.equal(client.seen.length,2);
 assert.match(logs.join(" "),/etsy_length/);
 for(const hidden of [tiny,"private-file.png",invalid.etsy_tags[12]]){
  assert.ok(!logs.join(" ").includes(hidden));
  assert.ok(!JSON.stringify(data).includes(hidden));
 }
});
for(const [status,name,code,httpStatus] of [
 [401,"Error","analysis_auth_failed",502],
 [403,"Error","analysis_auth_failed",502],
 [429,"Error","analysis_usage_limit",503],
 [0,"APIConnectionTimeoutError","analysis_timeout",502],
 [0,"APIUserAbortError","analysis_timeout",502],
 [0,"TimeoutError","analysis_timeout",502],
 [500,"Error","analysis_upstream_failed",502]
])test(`provider failure ${status||name} is classified and never retried`,async t=>{
 const logs=[];
 t.mock.method(console,"error",(...parts)=>logs.push(parts.join(" ")));
 const error=Object.assign(Error("SECRET_PROVIDER_DETAIL"),{status,name});
 const client=sequence([error,valid]);
 const response=await handleRequest(req({imageDataUrl:tiny}),client);
 const data=await response.json();
 assert.equal(response.status,httpStatus);
 assert.equal(data.code,code);
 assert.equal(client.seen.length,1);
 assert.ok(!JSON.stringify(data).includes("SECRET_PROVIDER_DETAIL"));
 assert.ok(!logs.join(" ").includes("SECRET_PROVIDER_DETAIL"));
});
