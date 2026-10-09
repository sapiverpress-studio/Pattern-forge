import { chromium } from 'playwright';

function assert(condition, message){ if(!condition) throw new Error(message); }

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1200}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

async function names(){ return await page.locator('.layerRowName').allTextContents(); }
async function selectLayer(name){
  await page.locator('.layerRow').filter({hasText:name}).first().click();
  await page.waitForFunction(expected=>document.querySelector('.layerRow.active .layerRowName')?.textContent===expected,name);
}

try{
  await page.goto('http://127.0.0.1:4173/app/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.3.0-ux2-alpha.1','wrong app version');

  await page.locator('#layerAdd').click();
  await page.waitForFunction(()=>document.querySelectorAll('.layerRow').length===3);
  let layerNames=await names();
  assert(layerNames[0]==='Layer 3',`first added layer should be Layer 3 with the two base layers present, got ${layerNames[0]}`);

  const nameInput=page.locator('#layerName');
  await nameInput.click();
  await nameInput.fill('Ink outline');
  await page.waitForFunction(()=>document.querySelector('.layerRow.active .layerRowName')?.textContent==='Ink outline');
  assert((await names())[0]==='Ink outline','layer list did not rename live while typing');
  await nameInput.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#layerName')?.value==='Ink outline');

  await page.locator('#layerAdd').click();
  await page.waitForFunction(()=>document.querySelectorAll('.layerRow').length===4);
  layerNames=await names();
  assert(layerNames[0]==='Layer 4',`next layer should be Layer 4 after renaming the previous layer, got ${layerNames[0]}`);

  await selectLayer('Ink outline');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#layerDelete').click();
  await page.waitForFunction(()=>document.querySelectorAll('.layerRow').length===3);
  assert(!(await names()).includes('Ink outline'),'renamed layer was not deleted');

  await selectLayer('Layer 4');
  await page.locator('#layerAdd').click();
  await page.waitForFunction(()=>document.querySelectorAll('.layerRow').length===4);
  layerNames=await names();
  assert(layerNames[0]==='Layer 5',`new layer after deleting an earlier layer should advance to Layer 5, got ${layerNames[0]}`);
  assert(new Set(layerNames).size===layerNames.length,`duplicate layer names found: ${layerNames.join(' | ')}`);

  // UX2 is a proxy shell over the legacy editor controls. Verify that its
  // layer field commits through focus/input/blur instead of only firing a
  // change event that leaves the underlying model unchanged.
  await page.waitForTimeout(1300);
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  await page.locator('#continuePrevious').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  await page.locator('[data-ux2-panel="layers"]').click();
  await page.locator('#ux2Palette').waitFor({state:'visible'});
  const ux2Before=await page.locator('.ux2-layer-row').count();
  await page.locator('#ux2AddLayer').click();
  await page.waitForFunction(expected=>document.querySelectorAll('.ux2-layer-row').length===expected,ux2Before+1);
  await page.locator('#ux2LayerName').fill('UX2 ink outline');
  await page.locator('#ux2LayerName').press('Tab');
  await page.waitForFunction(()=>document.querySelector('.layerRow.active .layerRowName')?.textContent==='UX2 ink outline');
  await page.locator('#ux2PaletteClose').click();
  await page.locator('[data-ux2-panel="layers"]').click();
  assert(await page.locator('#ux2LayerName').inputValue()==='UX2 ink outline','UX2 layer rename did not persist after closing and reopening the panel');
  assert((await page.locator('.ux2-layer-row').first().innerText()).includes('UX2 ink outline'),'UX2 layer list did not refresh after add/rename');
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  console.log('PASS layer UX: legacy and UX2 rename/add flows persist and default layer numbers never duplicate after rename/delete');
}finally{
  await browser.close();
}
