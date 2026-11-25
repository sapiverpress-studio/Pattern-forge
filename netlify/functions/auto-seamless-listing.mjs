import OpenAI from "openai";

// The AI Gateway injects OpenAI credentials at Netlify Function runtime.
// Never send provider keys to a browser.
const MODEL = "gpt-4o-mini";
const MAX_DATA_URL = 800000;
const disallowed = /\b(surface pattern design|continuous pattern|repeat print|decorative repeat|all over pattern|textile print|bestseller|best seller|trending)\b/i;
const respond=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const clean=x=>String(x??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const validationReasons={
  metadata_object:"Return a JSON object with the requested listing fields.",
  title_missing:"Supply a descriptive title.",
  redbubble_tags:"Supply one main tag and exactly 14 different supporting tags; avoid duplicates and prohibited generic terms.",
  etsy_count:"Supply exactly 13 Etsy tags.",
  etsy_duplicates:"Make all 13 Etsy tags distinct, ignoring case.",
  etsy_length:"Keep every Etsy tag between 3 and 20 characters, counting spaces; rewrite long phrases rather than truncating them.",
  etsy_characters:"Remove markup and control characters from Etsy tags.",
  etsy_phrases:"Use two or more words in at least 11 Etsy tags.",
  description_missing:"Supply a concise description of the visible artwork.",
  response_format:"Return the complete listing as valid JSON, without surrounding commentary."
};
class ListingValidationError extends Error{
  constructor(issues){
    super(issues.map(code=>validationReasons[code]).join(" "));
    this.name="ListingValidationError";this.issues=issues;
  }
}

export function validateListing(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new ListingValidationError(["metadata_object"]);
  const issues=[];
  const title=clean(raw.title).slice(0,110);
  const words=[raw.main_tag,...(Array.isArray(raw.other_tags)?raw.other_tags:[])];
  const tags=[],seen=new Set();
  for(const word of words){
    const tag=clean(word).slice(0,50),key=tag.toLocaleLowerCase("en");
    if(!tag||seen.has(key)||disallowed.test(tag))continue;
    tags.push(tag);seen.add(key);
  }
  if(!title)issues.push("title_missing");
  if(tags.length!==15)issues.push("redbubble_tags");
  // Separate Etsy buyer-intent tags, not a truncated copy of Redbubble descriptors.
  const etsyTags=Array.isArray(raw.etsy_tags)?raw.etsy_tags.map(clean):[];
  const etsySeen=new Set(etsyTags.map(t=>t.toLocaleLowerCase("en")));
  if(etsyTags.length!==13)issues.push("etsy_count");
  if(etsySeen.size!==etsyTags.length)issues.push("etsy_duplicates");
  if(etsyTags.some(t=>t.length<3||t.length>20))issues.push("etsy_length");
  if(etsyTags.some(t=>/[<>\x00-\x1f]/.test(t)))issues.push("etsy_characters");
  if(etsyTags.filter(t=>t.split(/\s+/).length>=2).length<11)issues.push("etsy_phrases");
  const suffix=" Created with the aid of AI.";
  let description=clean(raw.description);
  if(!description)issues.push("description_missing");
  if(!/\bcreated with the aid of AI\b/i.test(description))description=description.slice(0,250-suffix.length).trimEnd()+suffix;
  if(description.length>250)description=description.slice(0,250-suffix.length).trimEnd()+suffix;
  if(issues.length)throw new ListingValidationError(issues);
  return {title,main_tag:tags[0],other_tags:tags.slice(1),etsy_tags:etsyTags,description,visual_subject:clean(raw.visual_subject).slice(0,100),source:"visual-ai",etsy_source:"buyer-intent-suggestions-not-live-keyword-research",live_search_volume:false};
}
const INSTRUCTIONS=[
 "You write accurate, buyer-facing Redbubble listings from the image you are shown. The filename is a weak clue only.",
 "Return one JSON object with: title (string), main_tag (string), other_tags (array of exactly 14 unique Redbubble strings), etsy_tags (array of exactly 13 unique Etsy strings), description (string), visual_subject (string).",
 "Identify the visible subject, imagery, motif, colours, material appearance, style and mood. Distinguish woven cloth, cable knits, Fair Isle motifs, photos and abstract patterns.",
 "For Redbubble use natural shopper vocabulary describing the visible artwork; keep main_tag and other_tags as before.",
 "For etsy_tags target buyers of a DIGITAL SEAMLESS SURFACE DESIGN, not buyers seeking a knitting tutorial, physical fabric or finished cushion. Include a range of natural phrases about the downloadable item, craft use, relevant intended applications and distinctive visible subject/style, not 13 variations of the same phrase.",
 "Use exactly 13 different Etsy phrases, each 3 to 20 characters long; at least 11 should contain two or more words. Examples only when truthful: seamless pattern, floral digital paper, scrapbook background, fabric print design, gift wrap pattern, berry repeat tile, cottagecore floral. Do not copy those if the image lacks the subject.",
 "Avoid promising commercial rights, vector/SVG files, editable patterns, physical goods, seasonal occasions or colourways unless established by visible artwork and supported product information. Never say 'knitting pattern' or 'crochet pattern' unless it actually teaches a stitch.",
 "These etsy_tags are research-informed candidate search phrases, not measured Etsy searches or verified demand.",
 "Never fill tag slots with technical maker language such as seamless repeat, repeating pattern, surface pattern design, repeat print, decorative repeat, textile print or all over pattern.",
 "Use only observable details: never invent animals, snowflakes, seasons, brands, holidays or symbols that are not depicted. Do not make claims about demand, ranking, search volumes or past sales.",
 "No hashtags. Do not insert product categories like phone case, t-shirt or pillow into the tags: the platform handles product filtering.",
 "Make one concise main tag that identifies the image subject. Supply exactly 14 different supporting tags under 50 characters each. Titles should be naturally descriptive; descriptions must be <=220 characters.",
 "Include the exact disclosure 'Created with the aid of AI.' in the description. Use British spelling in prose. Return JSON only."
].join(" ");
export async function analyzeImage(imageDataUrl,filename="",client=null){
  const api=client??new OpenAI({maxRetries:0,timeout:30000});
  // Both attempts share the original 30-second budget, below the browser's 40s deadline.
  const signal=AbortSignal.timeout(30000);
  const messages=[
      {role:"system",content:INSTRUCTIONS},
      {role:"user",content:[
        {type:"text",text:"Analyse the visible artwork and generate the listing. Filename hint: "+clean(filename).slice(0,120)},
        {type:"image_url",image_url:{url:imageDataUrl,detail:"low"}}
      ]}
    ];
  for(let attempt=0;attempt<2;attempt++){
    signal.throwIfAborted();
    // Provider/auth/quota failures are not retried. Only invalid listing output gets one correction.
    const result=await api.chat.completions.create({
      model:MODEL,temperature:0.2,max_tokens:1600,response_format:{type:"json_object"},messages:[...messages]
    },{signal});
    signal.throwIfAborted();
    if(result?.choices?.[0]?.message?.refusal)throw Error("Image analysis unavailable");
    const text=result?.choices?.[0]?.message?.content;
    try{
      if(typeof text!=="string"||!text.trim()||text.length>10000)
        throw new ListingValidationError(["response_format"]);
      let raw;
      try{raw=JSON.parse(text)}catch{throw new ListingValidationError(["response_format"])}
      return validateListing(raw);
    }catch(error){
      if(!(error instanceof ListingValidationError)||attempt===1)throw error;
      console.warn("Vision listing correction",JSON.stringify({issues:error.issues}));
      messages.push(
        {role:"assistant",content:typeof text==="string"?text.slice(0,10000):"{}"},
        {role:"user",content:"Correct the previous listing. These checks failed: "+error.message+
          " Keep the same visible subject and return all requested fields. Do not invent details or use placeholder tags."}
      );
    }
  }
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
    const status=Number(e?.status)||0;
    const timeout=["AbortError","TimeoutError","APIConnectionTimeoutError","APIUserAbortError"].includes(e?.name);
    const code=e instanceof ListingValidationError?"listing_validation_failed":
      timeout?"analysis_timeout":[401,403].includes(status)?"analysis_auth_failed":
      status===429?"analysis_usage_limit":"analysis_upstream_failed";
    // Log fixed categories only: no image, filename, model output, keys or upstream error text.
    console.error("Vision listing failure",JSON.stringify({code,status:status||null,
      issues:e instanceof ListingValidationError?e.issues:[]}));
    const message=code==="listing_validation_failed"?"The AI could not produce valid listing details after one correction attempt.":
      timeout?"Image analysis timed out.":
      code==="analysis_auth_failed"?"The image-analysis service needs its connection checked.":
      code==="analysis_usage_limit"?"The image-analysis service is busy or has reached its usage limit.":
      "Automatic image analysis failed.";
    return respond({error:message+" No generic tags were substituted.",code},status===429?503:502);
  }
}
export default request=>handleRequest(request);
export const config={
  path:"/api/auto-seamless-listing",method:"POST",
  rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:3600,windowLimit:12}
};
