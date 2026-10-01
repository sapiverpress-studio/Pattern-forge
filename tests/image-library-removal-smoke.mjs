import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition,message){if(!condition)throw new Error(message);}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

const svg=(fill)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="${fill}"/></svg>`);
async function projectJson(){
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProject').click()]);
  const path=await download.path();assert(path,'project download path missing');
  return JSON.parse(await fs.readFile(path,'utf8'));
}

try{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden'});
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.2.0-alpha.6.4','wrong app version');

  await page.locator('#files').setInputFiles([
    {name:'alpha.svg',mimeType:'image/svg+xml',buffer:svg('#e53935')},
    {name:'beta.svg',mimeType:'image/svg+xml',buffer:svg('#43a047')},
    {name:'gamma.svg',mimeType:'image/svg+xml',buffer:svg('#1e88e5')},
  ]);
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===3);
  let project=await projectJson();
  assert(project.assets.length===3,'three imported assets were not stored');
  assert(project.items.length===1,'first imported image should be auto-placed once');
  const alpha=project.assets.find(a=>a.name==='alpha.svg');
  const beta=project.assets.find(a=>a.name==='beta.svg');
  const gamma=project.assets.find(a=>a.name==='gamma.svg');
  assert(alpha&&beta&&gamma,'imported asset names missing');

  // Remove an unused library image. No confirmation should be necessary and placed artwork must remain.
  await page.getByRole('button',{name:'Remove beta.svg from image library'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  project=await projectJson();
  assert(!project.assets.some(a=>a.name==='beta.svg'),'unused image stayed in library after removal');
  assert(project.items.length===1 && String(project.items[0].assetId)===String(alpha.id),'removing unused image changed placed artwork');

  // Import after a deletion: IDs must remain unique and must not collide with the surviving gamma asset.
  await page.locator('#files').setInputFiles({name:'delta.svg',mimeType:'image/svg+xml',buffer:svg('#8e24aa')});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===3);
  project=await projectJson();
  const ids=project.assets.map(a=>String(a.id));
  assert(new Set(ids).size===ids.length,`asset ID collision after removal/reimport: ${ids.join(', ')}`);
  const delta=project.assets.find(a=>a.name==='delta.svg');
  assert(delta && String(delta.id)!==String(gamma.id),'new import reused a surviving asset ID');

  // Removing a used image must warn and remove every placed copy that depends on it.
  let warning='';
  page.once('dialog',async dialog=>{warning=dialog.message();await dialog.accept();});
  await page.getByRole('button',{name:'Remove alpha.svg from image library'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  assert(warning.includes('1 placed copy'),`used-image removal warning did not state affected copies: ${warning}`);
  project=await projectJson();
  assert(!project.assets.some(a=>a.name==='alpha.svg'),'used image stayed in library after confirmed removal');
  assert(!project.items.some(item=>String(item.assetId)===String(alpha.id)),'placed copy survived after its library image was removed');
  const validIds=new Set(project.assets.map(a=>String(a.id)));
  assert(project.items.every(item=>validIds.has(String(item.assetId))),'orphaned item references remain after removal');

  // Autosave/reload must preserve the removal.
  await page.waitForTimeout(1300);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  const visibleNames=await page.locator('.asset span').allTextContents();
  assert(!visibleNames.includes('alpha.svg')&&!visibleNames.includes('beta.svg'),`removed images returned after reload: ${visibleNames.join(', ')}`);
  assert(visibleNames.includes('gamma.svg')&&visibleNames.includes('delta.svg'),'surviving images missing after reload');

  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  console.log('PASS image library removal: unused removal, used-copy warning/removal, unique future IDs, autosave reload');
}finally{
  await browser.close();
}
