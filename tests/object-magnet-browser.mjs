import { chromium } from 'playwright';
function assert(p,m){if(!p)throw Error(m);}
const svg=(c)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="42" fill="'+c+'"/></svg>');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1200},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
async function screen(world){
  return page.locator('#editorCanvas').evaluate((el,p)=>{
    const r=el.getBoundingClientRect(),sc=.38;
    const ox=(el.width-900*sc)/2,oy=(el.height-900*sc)/2;
    return {x:r.left+(ox+p.x*sc)*r.width/el.width,y:r.top+(oy+p.y*sc)*r.height/el.height};
  },world);
}
try{
  await page.goto('http://127.0.0.1:4173/app/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('#files').setInputFiles([
    {name:'first.svg',mimeType:'image/svg+xml',buffer:svg('#187e88')},
    {name:'second.svg',mimeType:'image/svg+xml',buffer:svg('#e99444')}
  ]);
  await page.waitForFunction(()=>window.PatternForgeImageLibrary?.list().length===2);
  await page.evaluate(()=>{
    const library=window.PatternForgeImageLibrary.list();
    window.PatternForgeImageLibrary.place(library[1].id);
    const items=window.PatternForgeEtsyBridge.state.items;
    items[0].x=295;items[0].y=210;
    items[1].x=615;items[1].y=550;
    document.getElementById('gridOn').dispatchEvent(new Event('change',{bubbles:true}));
  });
  const a=await screen({x:615,y:550}),b=await screen({x:304,y:550});
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:16});await page.waitForTimeout(180);
  const held=await page.evaluate(()=>({
    x:window.PatternForgeEtsyBridge.state.items[1].x,
    guide:window.PatternForgeEtsyBridge.state.snapGuides.x,
    kind:window.PatternForgeEtsyBridge.state.snapGuideKinds?.x
  }));
  assert(held.kind==='object','expected an object guide, got '+JSON.stringify(held));
  assert(Math.abs(held.x-295)<1.5,'object magnet did not click in while dragging: '+held.x);
  await page.mouse.up();
  await page.waitForTimeout(140);
  const actual=await page.evaluate(()=>window.PatternForgeEtsyBridge.state.items[1].x);
  assert(Math.abs(actual-295)<1.5,'Released motif was not aligned with first motif: '+actual);
  assert(errors.length===0,'Browser errors '+errors.join(' | '));
  console.log('PASS object centre magnet engages live after deliberate drag and stays aligned on release.');
}finally{await browser.close();}
