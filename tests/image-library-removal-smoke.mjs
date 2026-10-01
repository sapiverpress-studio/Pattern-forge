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
  const path=await download.path();
  assert(path,'saved project download path missing');
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
  let visibleNames=await page.locator('.asset span').allTextContents();
  assert(visibleNames.includes('alpha.svg')&&visibleNames.includes('beta.svg')&&visibleNames.includes('gamma.svg'),'three imported images were not visible in the library');

  // First image is auto-placed. Removing an unused image must not disturb that placed copy.
  let project=await savedProject();
  assert(project.items.length===1,'first imported image should be auto-placed once');
  const alpha=project.assets.find(a=>a.name==='alpha.svg');
  assert(alpha,'auto-placed alpha asset missing from saved project');

  await page.getByRole('button',{name:'Remove beta.svg from image library'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  visibleNames=await page.locator('.asset span').allTextContents();
  assert(!visibleNames.includes('beta.svg'),'unused image stayed visible after removal');
  project=await savedProject();
  assert(project.items.length===1 && project.assets.some(a=>a.name==='alpha.svg'),'removing unused image changed the placed alpha artwork');

  // Import after deletion. Delta is auto-placed by the normal import flow; add gamma once so all surviving assets are used.
  await page.locator('#files').setInputFiles({name:'delta.svg',mimeType:'image/svg+xml',buffer:svg('#8e24aa')});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===3);
  await page.getByRole('button',{name:'Add gamma.svg'}).click();
  project=await savedProject();
  assert(project.assets.length===3,`expected three used assets after placement, got ${project.assets.length}`);
  assert(project.items.length===3,'expected alpha, auto-placed delta and manually placed gamma before alpha removal');
  const ids=project.assets.map(a=>String(a.id));
  assert(new Set(ids).size===ids.length,`asset ID collision after removal/reimport: ${ids.join(', ')}`);
  const gamma=project.assets.find(a=>a.name==='gamma.svg');
  const delta=project.assets.find(a=>a.name==='delta.svg');
  assert(gamma&&delta&&String(gamma.id)!==String(delta.id),'new import reused the surviving gamma asset ID');

  // Removing a used image must warn and remove its placed copy, while other artwork survives.
  let warning='';
  page.once('dialog',async dialog=>{warning=dialog.message();await dialog.accept();});
  await page.getByRole('button',{name:'Remove alpha.svg from image library'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  assert(warning.includes('1 placed copy'),`used-image removal warning did not state affected copies: ${warning}`);
  project=await savedProject();
  assert(!project.assets.some(a=>a.name==='alpha.svg'),'used image stayed in saved project after confirmed removal');
  assert(project.assets.some(a=>a.name==='gamma.svg')&&project.assets.some(a=>a.name==='delta.svg'),'surviving images disappeared after removing alpha');
  assert(project.items.length===2,'removing alpha did not leave exactly the gamma and delta placed copies');
  const validIds=new Set(project.assets.map(a=>String(a.id)));
  assert(project.items.every(item=>validIds.has(String(item.assetId))),'orphaned item references remain after removal');

  // Autosave/reload must preserve the library removal.
  await page.waitForTimeout(1300);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);
  visibleNames=await page.locator('.asset span').allTextContents();
  assert(!visibleNames.includes('alpha.svg')&&!visibleNames.includes('beta.svg'),`removed images returned after reload: ${visibleNames.join(', ')}`);
  assert(visibleNames.includes('gamma.svg')&&visibleNames.includes('delta.svg'),'surviving images missing after reload');

  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  console.log('PASS image library removal: unused removal, used-copy warning/removal, unique future IDs, autosave reload');
}finally{
  await browser.close();
}
