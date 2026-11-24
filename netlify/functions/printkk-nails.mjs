// Provisional PrintKK read-only product probe; verify live before relying on schema.
const URL = 'https://api.printkk.com/pkk-openapi/api/v1/product/MQNBX3';
const reply = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleRequest(request, {key=process.env.PRINTKK_API_KEY, fetcher=fetch}={}) {
  if (request.method !== 'GET') return reply({error:'Method not allowed'},405);
  const origin=request.headers.get('origin');
  if (origin && origin !== new globalThis.URL(request.url).origin) return reply({error:'Cross-origin call blocked'},403);
  if (!key) return reply({error:'PrintKK key not configured'},503);
  try {
    const upstream=await fetcher(URL,{method:'GET',headers:{'Api-Key':key,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
    if (!upstream.ok) return reply({error:'PrintKK rejected request',upstreamStatus:upstream.status},502);
    const body=await upstream.json();
    if (body?.success !== true || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return reply({error:'PrintKK response not verified'},502);
    const {productCode,printAreas,specifications}=body.data;
    if (productCode !== 'MQNBX3') return reply({error:'Unexpected product code'},502);
    const result={productCode,printAreas:printAreas??null,specifications:specifications??null};
    if(JSON.stringify(result).includes(key)) return reply({error:'Unexpected credential in response'},502);
    return reply(result);
  } catch { return reply({error:'PrintKK request failed'},502); }
}
export default request=>handleRequest(request);
export const config={path:'/api/printkk-nails',method:'GET',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:3600,windowLimit:10}};
