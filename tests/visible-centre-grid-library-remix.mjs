import { chromium } from 'playwright';
import fs from 'node:fs/promises';
function assert(ok,why){if(!ok)throw Error(why);}
const first=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect x="100" y="10" width="50" height="80" fill="#224466"/></svg>');
const centred=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect x="75" y="10" width="50" height="80" fill="#da9950"/></svg>');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1250,height:950},acceptDownloads:true}),errors=[];
page.on('pageerror',err=>errors.push(String(err)));
async function saved(){
  const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProject').evaluate(el=>el.click())]);
  return JSON.parse(await fs.readFile(await file.path(),'utf8'));
}
try{
  await page.goto('http://127.0.0.1:4173/app/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Visible alpha grid');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('#files').setInputFiles([
    {name:'offcentre.svg',mimeType:'image/svg+xml',buffer:first},
    {name:'centred.svg',mimeType:'image/svg+xml',buffer:centred}
  ]);
  await page.waitForFunction(()=>window.PatternForgeImageLibrary?.list().length===2);
  await page.evaluate(()=>{
    const list=window.PatternForgeImageLibrary.list();
    window.PatternForgeImageLibrary.place(list[1].id);
    const st=window.PatternForgeEtsyBridge.state;
    st.items[0].x=517;st.items[0].y=610;
    st.items[1].x=690;st.items[1].y=610;
    st.selectedIds=[st.items[0].id];st.selectedId=st.items[0].id;
    document.getElementById('gridOn').dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert(await page.evaluate(()=>window.PatternForgeSelection.gridCentre()),'Centre to grid rejected');
  let st=await page.evaluate(()=>window.PatternForgeEtsyBridge.state.items.map(i=>({id:i.id,x:i.x,y:i.y,assetId:i.assetId})));
  // First image has 25px off-centre alpha, enlarged by 5 => visible centre = x+125.
  const tile=900,divisions=16,step=tile/divisions,alphaOffset=25*(tile*.25/200);
  const gridX=Math.round((517+alphaOffset)/step)*step,gridY=Math.round(610/step)*step;
  assert(Math.abs(st[0].x+alphaOffset-gridX)<.7,'Alpha-visible centre did not land on grid: '+st[0].x);
  assert(Math.abs(st[0].y-gridY)<.7,'Centre Y did not land on grid: '+st[0].y);
  assert(await page.evaluate(()=>window.PatternForgeSelection.gridStep(1,0)),'Next X grid failed');
  assert(await page.evaluate(()=>window.PatternForgeSelection.gridStep(0,-1)),'Previous Y grid failed');
  st=await page.evaluate(()=>window.PatternForgeEtsyBridge.state.items.map(i=>({id:i.id,x:i.x,y:i.y,assetId:i.assetId})));
  assert(Math.abs(st[0].x+alphaOffset-(gridX+step))<.7,'Next X line not reached: '+st[0].x);
  assert(Math.abs(st[0].y-(gridY-step))<.7,'Previous Y line not reached: '+st[0].y);
  await page.evaluate(()=>{
    const st=window.PatternForgeEtsyBridge.state;
    st.selectedIds=st.items.map(i=>i.id);st.selectedId=st.items[0].id;
  });
  assert(await page.evaluate(()=>window.PatternForgeSelection.align('centreX')),'Visible-centre alignment rejected');
  st=await page.evaluate(()=>window.PatternForgeEtsyBridge.state.items.map(i=>({x:i.x,y:i.y})));
  assert(Math.abs(st[0].x+alphaOffset-st[1].x)<.7,'Align X used PNG box centre instead of visible alpha centre: '+JSON.stringify(st));
  const original=await saved();
  await page.locator('#motifSwapOpen').evaluate(el=>el.click());
  await page.locator('#motifSwapDialog').waitFor({state:'visible'});
  assert(await page.locator('#motifSwapMode').inputValue()==='library','Library swap should be the default with alternative images imported');
  assert(await page.locator('#motifSwapLibraryMapping select').count()===2,'Expected original and library replacement selectors');
  const from=await page.locator('#motifSwapLibraryMapping select').nth(0).inputValue();
  const to=await page.locator('#motifSwapLibraryMapping select').nth(1).inputValue();
  assert(from!==to,'Library defaults swapped an image for itself');
  await page.locator('#motifSwapName').fill('Same Layout New Pieces');
  await page.locator('#motifSwapApply').click();
  await page.locator('#motifSwapDialog').waitFor({state:'hidden',timeout:20000});
  const copied=await saved();
  assert(copied.project.id!==original.project.id,'Copied layout overwrote original');
  assert(copied.items.length===original.items.length,'Placed item count changed in copied layout');
  assert(String(copied.items[0].assetId)===to,'Original motif was not swapped to imported image');
  assert(Math.abs(copied.items[0].x-original.items[0].x-alphaOffset)<.7,'Visible centre moved when swapping to differently padded image');
  assert(copied.items[0].y===original.items[0].y,'Unrelated coordinate shifted');
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('PASS: visible alpha centre, exact grid intersection/steps, visual alignment, imported-library layout remix and original isolation.');
}finally{await browser.close();}
