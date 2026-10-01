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
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.2.0-alpha.6.4','wrong app version');

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
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  console.log('PASS layer UX: live rename works and default layer numbers never duplicate after rename/delete');
}finally{
  await browser.close();
}
