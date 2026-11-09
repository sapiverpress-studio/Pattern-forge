import OpenAI from "openai";

// The AI Gateway injects OpenAI credentials at Netlify Function runtime.
// Never send provider keys to a browser.
const MODEL = "gpt-4o-mini";
const MAX_DATA_URL = 800000;
const disallowed = /\b(surface pattern design|continuous pattern|repeat print|decorative repeat|all over pattern|textile print|bestseller|best seller|trending)\b/i;
const respond=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const clean=x=>String(x??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();

export function validateListing(raw){
  if(!raw||typeof raw!=="object")throw Error("Invalid metadata object");
  const title=clean(raw.title).slice(0,110);
  const words=[raw.main_tag,...(Array.isArray(raw.other_tags)?raw.other_tags:[])];
  const tags=[],seen=new Set();
  for(const word of words){
    const tag=clean(word).slice(0,50),key=tag.toLocaleLowerCase("en");
    if(!tag||seen.has(key)||disallowed.test(tag))continue;
    tags.push(tag);seen.add(key);
  }
  if(!title||tags.length!==15)throw Error("AI returned incomplete or irrelevant tags");
  const suffix=" Created with the aid of AI.";
  let description=clean(raw.description);
  if(!/\bAI\b/i.test(description))description=description.slice(0,250-suffix.length).trimEnd()+suffix;
  if(description.length>250)description=description.slice(0,250-suffix.length).trimEnd()+suffix;
  if(!description)throw Error("Missing description");
  return {title,main_tag:tags[0],other_tags:tags.slice(1),description,visual_subject:clean(raw.visual_subject).slice(0,100),source:"visual-ai",live_search_volume:false};
}
const INSTRUCTIONS=[
 "You write accurate, buyer-facing Redbubble listings from the image you are shown. The filename is a weak clue only.",
 "Return one JSON object with: title (string), main_tag (string), other_tags (array of exactly 14 unique strings), description (string), visual_subject (string).",
 "Identify the visible subject, imagery, motif, colours, material appearance, style and mood. Distinguish woven cloth, cable knits, Fair Isle motifs, photos and abstract patterns.",
 "Use natural shopper vocabulary that actually describes this image. If it shows cable knitting, terms such as cable knit, braided knit, knitted texture, chunky knit, sweater texture, cream, rust, cosy and cozy can be relevant.",
 "Never fill tag slots with technical maker language such as seamless repeat, repeating pattern, surface pattern design, repeat print, decorative repeat, textile print or all over pattern.",
 "Use only observable details: never invent animals, snowflakes, seasons, brands, holidays or symbols that are not depicted. Do not make claims about demand, ranking, search volumes or past sales.",
 "No hashtags. Do not insert product categories like phone case, t-shirt or pillow into the tags: the platform handles product filtering.",
 "Make one concise main tag that identifies the image subject. Supply exactly 14 different supporting tags under 50 characters each. Titles should be naturally descriptive; descriptions must be <=220 characters.",
 "Include the exact disclosure 'Created with the aid of AI.' in the description. Use British spelling in prose. Return JSON only."
].join(" ");
export async function analyzeImage(imageDataUrl,filename="",client=null){
  const api=client??new OpenAI({maxRetries:0,timeout:30000});
  const result=await api.chat.completions.create({
    model:MODEL,temperature:0.2,max_tokens:850,response_format:{type:"json_object"},
    messages:[
      {role:"system",content:INSTRUCTIONS},
      {role:"user",content:[
        {type:"text",text:"Analyse the visible artwork and generate the listing. Filename hint: "+clean(filename).slice(0,120)},
        {type:"image_url",image_url:{url:imageDataUrl,detail:"low"}}
      ]}
    ]
  });
  const text=result?.choices?.[0]?.message?.content;
  if(typeof text!=="string"||text.length>10000)throw Error("Invalid model response");
  return validateListing(JSON.parse(text));
}
export async function handleRequest(request,client=null){
  if(request.method!=="POST")return respond({error:"Method not allowed"},405);
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return respond({error:"Cross-origin call blocked"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return respond({error:"Content-Type must be application/json"},415);
  if(Number(request.headers.get("content-length")||0)>900000)return respond({error:"Preview too large"},413);
  let data;
  try{data=await request.json()}catch{return respond({error:"Invalid request"},400)}
  const preview=data?.imageDataUrl;
  if(typeof preview!=="string"||preview.length>MAX_DATA_URL||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(preview))
    return respond({error:"Invalid small image preview"},400);
  if(!client&&!process.env.OPENAI_BASE_URL&&!process.env.OPENAI_API_KEY)
    return respond({error:"Image recognition is not configured on this deployment"},503);
  try{
    return respond(await analyzeImage(preview,data.filename,client));
  }catch(e){
    console.error("Vision listing failure",e?.name??"Error",e?.status??"unknown");
    return respond({error:"Automatic image analysis failed. Retry the image; no generic tags were substituted."},502);
  }
}
export default request=>handleRequest(request);
export const config={
  path:"/api/auto-seamless-listing",method:"POST",
  rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:3600,windowLimit:12}
};
