import { chromium } from 'playwright';
function assert(value,message){if(!value)throw Error(message);}
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const image=(colour)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="18" fill="'+colour+'"/></svg>');
try{
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  await page.locator('#projectTitleInput').fill('Mobile Design');
  await page.locator('#createProject').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('#ux2Editor').isVisible(),'Canvas-first editor did not mount on mobile');
  await page.locator('[data-ux2-panel="pattern"]').click();
  assert(await page.locator('#ux2ObjectSnapOn').isChecked(),'Magnetic motif control missing from design setup');
  assert(await page.locator('#ux2SpacingSnapOn').isChecked(),'Even spacing control missing from design setup');
  await page.locator('#ux2ObjectSnapOn').uncheck();
  assert(!await page.locator('#objectSnapOn').isChecked(),'Design setup magnet switch not wired');
  await page.locator('#ux2ObjectSnapOn').check();
  await page.locator('#ux2SpacingSnapOn').uncheck();
  assert(!await page.locator('#spacingSnapOn').isChecked(),'Design setup spacing switch not wired');
  await page.locator('#ux2SpacingSnapOn').check();
  await page.locator('#files').setInputFiles([
    {name:'first.svg',mimeType:'image/svg+xml',buffer:image('#539587')},
    {name:'second.svg',mimeType:'image/svg+xml',buffer:image('#e7af69')}
  ]);
  await page.waitForFunction(()=>window.PatternForgeImageLibrary?.list().length===2);
  await page.evaluate(()=>{
    const library=window.PatternForgeImageLibrary.list();
    window.PatternForgeImageLibrary.place(library[1].id);
    const items=window.PatternForgeEtsyBridge.state.items;
    items[0].y=250;items[1].y=600;
    window.PatternForgeSelection.selectAll();
  });
  await page.waitForFunction(()=>document.querySelectorAll('#ux2Context [data-pf-align]').length>=8);
  await page.locator('#ux2Context [data-pf-align="centreY"]').click();
  const aligned=await page.evaluate(()=>window.PatternForgeEtsyBridge.state.items.map(item=>item.y));
  assert(Math.abs(aligned[0]-aligned[1])<.01,'Mobile centre-align button did not align motifs');
  // Selection actions close the setup drawer; reopen it before using Remix.
  await page.locator('[data-ux2-panel="pattern"]').click();
  await page.locator('#ux2RemixOpen').click();
  assert(await page.locator('#motifSwapDialog').isVisible(),'Remix dialog failed to open from mobile design setup');
  await page.locator('#motifSwapClose').click();
  assert(!await page.locator('#motifSwapDialog').isVisible(),'Remix dialog did not close');
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('PASS mobile canvas-first setup switches, selected alignment and remix entry.');
}finally{await browser.close();}
