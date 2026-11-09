import test from "node:test";
import assert from "node:assert/strict";
import {analyzeImage,validateListing,handleRequest,config} from "../netlify/functions/auto-seamless-listing.mjs";
const base="http://localhost:4185/api/auto-seamless-listing";
const tiny="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+p4QAAAABJRU5ErkJggg==";
const tags=["knitted texture","chunky knit","braided wool","cable stitch","cream","rust","sweater texture","soft wool","cozy","cosy","winter warmth","neutral tones","classic knit","aran style"];
const valid={title:"Cream and Rust Cable Knit Texture",main_tag:"cable knit",other_tags:tags,description:"Warm braided wool texture with cream and rust cable stitches. Created with the aid of AI.",visual_subject:"cable knit"};
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
 assert.equal(result.title,valid.title);
 assert.equal(result.main_tag,"cable knit");
 assert.equal(result.other_tags.length,14);
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
 assert.ok(msg.error.includes("no generic tags"));
 assert.equal(config.rateLimit.windowLimit,12);
});
