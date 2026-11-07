/** Same-origin, fail-closed gateway to the Blender rendering container.
 * Backend token stays in Netlify Functions, never in browser JavaScript.
 */
export default async function handler(request) {
  const url = new URL(request.url);
  const matches = url.pathname.match(/^\/api\/knit-render(?:\/([a-f0-9]{32}))?\/?$/i);
  if (!matches) return Response.json({error:'Unknown route'},{status:404});
  const id=matches[1]||null;
  const method=request.method.toUpperCase();
  if ((method==='POST'&&id)||(method==='GET'&&!id)||!['POST','GET'].includes(method))
    return Response.json({error:'Unsupported operation'},{status:405});
  const backend=Netlify.env.get('KNIT_RENDER_SERVICE_URL');
  const token=Netlify.env.get('KNIT_RENDER_TOKEN');
  if (!backend || !/^https:\/\/[a-z0-9.-]+(?::443)?\/?$/i.test(backend) || !token || token.length<24)
    return Response.json({error:'The 3D wool renderer is not yet connected. No image was generated.'},{status:503});
  let jsonBody;
  if(method==='POST'){
    if(Number(request.headers.get('content-length')||0)>2048)
      return Response.json({error:'Request too large'},{status:413});
    try { const body=await request.text();if(body.length>2048)throw Error('Too large');jsonBody=JSON.parse(body); }
    catch{return Response.json({error:'Invalid settings'},{status:400});}
    if(!jsonBody || typeof jsonBody!=='object' || Array.isArray(jsonBody))
      return Response.json({error:'Settings must be a JSON object'},{status:400});
  }
  const api=backend.replace(/\/$/,'')+'/v1/renders'+(id?'/'+id:'');
  try{
    const response=await fetch(api,{
      method,
      headers:{'Authorization':'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},
      body:method==='POST'?JSON.stringify(jsonBody):undefined,
      signal:AbortSignal.timeout(25000),
      redirect:'error'
    });
    let payload;
    try{payload=await response.json();}catch{payload={error:'Renderer returned an invalid response'};}
    if(!response.ok){
      const msg=typeof payload.detail==='string'?payload.detail:'Renderer temporarily unavailable';
      return Response.json({error:msg},{status:response.status>=400&&response.status<600?response.status:502});
    }
    if(method==='POST'){
      if(!/^[a-f0-9]{32}$/.test(payload.id||''))return Response.json({error:'Invalid renderer job ID'},{status:502});
      return Response.json({id:payload.id,status:'queued'},{status:202,headers:{'Cache-Control':'no-store'}});
    }
    return Response.json(payload,{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({error:'Renderer connection failed. No download is available.'},{status:502});
  }
}
export const config={path:['/api/knit-render','/api/knit-render/:id']};
