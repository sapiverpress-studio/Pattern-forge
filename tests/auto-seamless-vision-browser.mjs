import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[],calls=[];
page.on("pageerror",e=>errors.push(e.message));
let mode="success";
const response={
 title:"Cream and Rust Cable Knit Texture",
 main_tag:"cable knit",
 other_tags:["knitted texture","chunky knit","braided wool","aran knit","cable stitch","cream","rust","sweater texture","soft wool","cozy","cosy","winter warmth","warm neutrals","textured yarn"],
 description:"A cosy cable-knit texture with warm rust and creamy knitted stitches. Created with the aid of AI.",
 visual_subject:"cream and rust cable knitted stitches",source:"visual-ai",live_search_volume:false
};
await page.route("**/api/auto-seamless-listing",async route=>{
 const data=route.request().postDataJSON();
 calls.push(data);
 if(mode==="fail")await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"AI Gateway temporarily unavailable"})});
 else await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(response)});
});
await page.goto("http://127.0.0.1:4185/auto-seamless/",{waitUntil:"load"});
assert.equal(await page.locator("#metaTheme").count(),0,"Manual category selector must be removed");
assert.equal(await page.locator("#metaSubject").count(),0,"Manual subject selector must be removed");
assert.equal(await page.locator("#metaName").inputValue(),"","Do not invent details before analysing image");
await page.locator("#upload").setInputFiles(path.resolve("knit-preview/assets/knitted-wool-720.png"));
await page.waitForFunction(()=>document.querySelector("#metaMain")?.value==="cable knit",null,{timeout:100000});
assert.equal(calls.length,1,"Exactly one vision call per upload");
assert.ok(calls[0].imageDataUrl.startsWith("data:image/jpeg;base64,"),"Only resized JPEG should leave browser");
assert.ok(calls[0].imageDataUrl.length<800000,"Thumbnail should have bounded size");
assert.ok(calls[0].filename.endsWith(".png"));
const fields={
 name:await page.locator("#metaName").inputValue(),
 main:await page.locator("#metaMain").inputValue(),
 tags:await page.locator("#metaTags").inputValue(),
 description:await page.locator("#metaDesc").inputValue()
};
assert.equal(fields.name,response.title);
assert.equal(fields.main,response.main_tag);
assert.equal(fields.tags.split(",").length,14);
assert.ok(fields.description.includes("aid of AI"));
assert.equal(await page.locator("#copy-all").isDisabled(),false);
assert.equal(await page.locator("#download5000").isDisabled(),false,"Existing pattern export must survive");
await page.screenshot({path:"auto-seamless-ai-metadata-mobile.png",fullPage:true});
const downloadPromise=page.waitForEvent("download");
await page.locator("#saveMeta").click();
const metadata=await downloadPromise;
assert.ok(metadata.suggestedFilename().endsWith("-redbubble-listing.txt"));
const saved=await fs.readFile(await metadata.path(),"utf8");
assert.ok(saved.includes(response.title)&&saved.includes("14 other tags"));
assert.ok(saved.includes("keyword demand and search volumes are not measured"));

mode="fail";
await page.locator("#metaGenerate").click();
await page.waitForFunction(()=>document.querySelector("#metaNotice")?.textContent.includes("temporarily unavailable"),null,{timeout:10000});
assert.equal(await page.locator("#metaName").inputValue(),"","No made-up fallback on AI failure");
assert.equal(await page.locator("#copy-all").isDisabled(),true);
mode="success";
await page.locator("#metaGenerate").click();
await page.waitForFunction(()=>document.querySelector("#metaMain")?.value==="cable knit",null,{timeout:15000});
assert.equal(calls.length,3,"One initial request and two explicit retries");
assert.deepEqual(errors,[],"No browser JS errors");
await browser.close();
console.log("PASS: mobile upload -> AI -> 15 metadata tags -> TXT; error and retry; pre-existing image export remains available.");
