(()=>{
"use strict";
const textEncoder=new TextEncoder();
const MAX_PNG_PART_BYTES=18_500_000;
const hex=bytes=>Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("");
async function sha256(data){
  if(!crypto?.subtle?.digest)throw Error("This browser cannot verify the full-size PNG. Use an updated secure Chrome browser.");
  return hex(await crypto.subtle.digest("SHA-256",data));
}
function rebuildHtml(manifest){
  // Completely self-contained buyer tool: no servers, external scripts, cookies or accounts.
  const template=String.raw`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<title>Restore your original PNG – Sapiver Prints</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:660px;margin:6vh auto;padding:0 22px;background:#f8f7f3;color:#273b37}h1{font-size:25px}button,input{font:inherit;margin:12px 0;padding:12px}button{background:#234e44;color:white;border:0;border-radius:8px}button:disabled{opacity:.55}#status{white-space:pre-wrap}small{color:#546963}</style>
<h1>Restore your full-resolution PNG</h1>
<p>Your artwork has not been reduced or re-encoded. Etsy limits individual downloads to 20 MB, so the original PNG was divided into numbered pieces. This tool combines them back into the exact original file, entirely on your device.</p>
<p><strong>Step 1:</strong> Download every ZIP labelled "png-part" from your Etsy order.<br>
<strong>Step 2:</strong> Select all those ZIPs below, then press Restore PNG.<br>
<strong>Step 3:</strong> Save the complete PNG. You do not need to extract the numbered parts.</p>
<input id="files" type="file" accept=".zip" multiple aria-label="Select every numbered PNG ZIP"><br>
<button id="build" type="button">Restore original PNG</button>
<p role="status" id="status">Nothing leaves your device.</p>
<small>Do not select the JPG-and-extras ZIP. If the browser cannot open a local HTML document, try Chrome on your phone or computer.</small>
<script>
"use strict";
const manifest=__SAPIVER_MANIFEST__;
const decoder=new TextDecoder();
const status=document.getElementById("status"),picker=document.getElementById("files");
function findPart(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let pos=0;
  while(pos+30<=bytes.byteLength&&view.getUint32(pos,true)===0x04034b50){
    const method=view.getUint16(pos+8,true),size=view.getUint32(pos+18,true);
    const nameLength=view.getUint16(pos+26,true),extraLength=view.getUint16(pos+28,true);
    const name=decoder.decode(bytes.subarray(pos+30,pos+30+nameLength));
    const start=pos+30+nameLength+extraLength;
    if(start+size>bytes.byteLength)throw Error("ZIP is incomplete or damaged.");
    if(name.endsWith(".pngpart")){
      if(method!==0)throw Error("This ZIP uses an unexpected compression method.");
      return {name,bytes:bytes.subarray(start,start+size)};
    }
    pos=start+size;
  }
  throw Error("This ZIP did not contain a numbered PNG part.");
}
function hex(bytes){return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function sha(data){
  if(!crypto.subtle)throw Error("This browser cannot verify downloads from a local HTML file. Try current Chrome.");
  return hex(await crypto.subtle.digest("SHA-256",data));
}
document.getElementById("build").onclick=async()=>{
  const button=document.getElementById("build");button.disabled=true;
  try{
    const files=Array.from(picker.files||[]);
    if(files.length!==manifest.parts.length)throw Error("Select all "+manifest.parts.length+" numbered PNG ZIPs, not the JPG ZIP.");
    const found=new Map();
    for(const f of files){
      const part=findPart(new Uint8Array(await f.arrayBuffer()));
      if(found.has(part.name))throw Error("A numbered ZIP has been selected twice.");
      found.set(part.name,part.bytes);
    }
    const pieces=[];
    for(const part of manifest.parts){
      const bytes=found.get(part.name);
      if(!bytes||bytes.length!==part.bytes)throw Error("Missing or damaged part: "+part.name);
      if((await sha(bytes))!==part.sha256)throw Error("Part checksum mismatch: "+part.name);
      pieces.push(bytes);
    }
    const png=new Blob(pieces,{type:"image/png"});
    if(png.size!==manifest.bytes||await sha(await png.arrayBuffer())!==manifest.sha256)throw Error("The reconstructed file does not match the original.");
    const url=URL.createObjectURL(png),a=document.createElement("a");
    a.href=url;a.download=manifest.filename;document.body.append(a);a.click();a.remove();
    status.textContent="Verified full-resolution PNG: "+manifest.width+" × "+manifest.height+" pixels, "+png.size+" bytes. Save the download.";
  }catch(error){status.textContent="Could not restore PNG: "+(error?.message||String(error));}
  finally{button.disabled=false;}
};
</script></html>`;
  return template.replace("__SAPIVER_MANIFEST__",JSON.stringify(manifest).replace(/</g,"\\u003c"));
}
async function makeParts(originalBlob,originalName,spec){
  if(!(originalBlob instanceof Blob)||originalBlob.size<1)throw Error("PNG input is missing.");
  if(!/^[a-z0-9_-]+\.png$/i.test(originalName))throw Error("Unsafe PNG filename.");
  const bytes=new Uint8Array(await originalBlob.arrayBuffer());
  if(bytes.length<24||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw Error("Original PNG is invalid.");
  const wholeSha=await sha256(bytes);
  const stem=originalName.slice(0,-4),parts=[];
  for(let start=0;start<bytes.length;start+=MAX_PNG_PART_BYTES){
    const data=bytes.subarray(start,Math.min(bytes.length,start+MAX_PNG_PART_BYTES));
    const name=stem+"-png-part-"+String(parts.length+1).padStart(2,"0")+".pngpart";
    parts.push({name,blob:new Blob([data],{type:"application/octet-stream"}),bytes:data.length,sha256:await sha256(data)});
  }
  if(parts.length<2||parts.length>4)throw Error("This full-resolution PNG needs "+parts.length+" parts; Etsy's five-file limit leaves room for at most four PNG parts plus extras. No image was resized.");
  const manifest={format:"sapiver-full-png-parts",version:1,filename:originalName,bytes:bytes.length,sha256:wholeSha,width:spec.wPx,height:spec.hPx,dpi:spec.dpi,parts:parts.map(({name,bytes,sha256})=>({name,bytes,sha256}))};
  return {parts,manifest,html:new Blob([rebuildHtml(manifest)],{type:"text/html"})};
}
window.PatternForgeMultipart=Object.freeze({makeParts,rebuildHtml,maxPartBytes:MAX_PNG_PART_BYTES});
})();