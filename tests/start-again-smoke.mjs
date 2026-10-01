import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition,message){if(!condition)throw new Error(message);}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1200},acceptDownloads:true});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

const svg=(fill)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="${fill}"/></svg>`);
async function savedProject(){
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProject').click()]);
  const path=await download.path();assert(path,'saved project download path missing');
  return JSON.parse(await fs.readFile(path,'utf8'));
}
async function layerNames(){return await page.locator('.layerRowName').allTextContents();}
async function assetNames(){return await page.locator('.asset span').allTextContents();}

try{
  await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'networkidle'});
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.2.0-alpha.7.0','wrong app version');
  assert(await page.locator('#startAgain').isVisible(),'Start again button is not visible');

  // Preserve-state fixtures: custom layer, setting, two imported images, two placed images and one brush mark.
  await page.locator('#layerAdd').click();
  await page.waitForFunction(()=>document.querySelectorAll('.layerRow').length===3);
  await page.locator('#layerName').fill('Keep layer');
  await page.locator('#layerName').press('Enter');
  await page.locator('#gridCount').selectOption('16');

  await page.locator('#files').setInputFiles([
    {name:'alpha.svg',mimeType:'image/svg+xml',buffer:svg('#e53935')},
    {name:'beta.svg',mimeType:'image/svg+xml',buffer:svg('#1e88e5')},
  ]);
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  await page.getByRole('button',{name:'Add beta.svg'}).click();

  await page.locator('[data-tool="brush"]').first().click();
  const box=await page.locator('#editorCanvas').boundingBox();
  assert(box,'editor canvas has no bounding box');
  await page.mouse.move(box.x+box.width*.43,box.y+box.height*.50);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.57,box.y+box.height*.52,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(180);

  let project=await savedProject();
  assert(project.items.length===2,`expected two placed images before reset, got ${project.items.length}`);
  assert(project.marks.length===1,`expected one drawing mark before reset, got ${project.marks.length}`);
  const beforeLayers=await layerNames();
  const beforeAssets=await assetNames();
  const beforeBadge=await page.locator('#projectNameDisplay').textContent();
  assert(beforeLayers.includes('Keep layer'),'custom layer fixture missing');
  assert(beforeAssets.includes('alpha.svg')&&beforeAssets.includes('beta.svg'),'imported image fixtures missing');
  assert(await page.locator('#gridCount').inputValue()==='16','grid fixture was not set');

  // Cancel must be safe and leave artwork untouched.
  let cancelWarning='';
  page.once('dialog',async dialog=>{cancelWarning=dialog.message();await dialog.dismiss();});
  await page.locator('#startAgain').click();
  assert(cancelWarning.includes('2 placed images')&&cancelWarning.includes('1 drawing mark'),`reset warning did not describe affected artwork: ${cancelWarning}`);
  project=await savedProject();
  assert(project.items.length===2&&project.marks.length===1,'cancelling Start again changed artwork');

  // Accept clears artwork only.
  let warning='';
  page.once('dialog',async dialog=>{warning=dialog.message();await dialog.accept();});
  await page.locator('#startAgain').click();
  assert(warning.includes('Project setup, imported images, layers and settings will be kept'),'reset warning did not explain preserved project data');
  project=await savedProject();
  assert(project.items.length===0,'Start again did not clear placed images');
  assert(project.marks.length===0,'Start again did not clear drawing marks');
  assert(JSON.stringify(await layerNames())===JSON.stringify(beforeLayers),'Start again changed the layer structure');
  assert(JSON.stringify(await assetNames())===JSON.stringify(beforeAssets),'Start again changed the imported image library');
  assert(await page.locator('#gridCount').inputValue()==='16','Start again changed tile/settings state');
  assert(await page.locator('#projectNameDisplay').textContent()===beforeBadge,'Start again changed the project setup/badge');

  // Undo immediately after reset restores the entire cleared artwork snapshot.
  await page.locator('#undo').click();
  project=await savedProject();
  assert(project.items.length===2,`Undo after Start again restored ${project.items.length} placed images instead of 2`);
  assert(project.marks.length===1,`Undo after Start again restored ${project.marks.length} drawing marks instead of 1`);

  // Reset once more and prove the blank artwork state survives autosave/reload while library/layers/settings survive.
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#startAgain').click();
  await page.waitForTimeout(1400);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  assert(JSON.stringify(await layerNames())===JSON.stringify(beforeLayers),'layers changed after reset autosave/reload');
  assert(JSON.stringify(await assetNames())===JSON.stringify(beforeAssets),'image library changed after reset autosave/reload');
  assert(await page.locator('#gridCount').inputValue()==='16','settings changed after reset autosave/reload');
  project=await savedProject();
  assert(project.items.length===0&&project.marks.length===0,'cleared artwork returned after autosave/reload');

  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  console.log('PASS Start again: cancel safety, artwork-only reset, Undo restoration, preserved setup/library/layers/settings, autosave reload');
}finally{
  await browser.close();
}
