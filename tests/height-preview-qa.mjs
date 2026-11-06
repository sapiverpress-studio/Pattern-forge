import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:1100,height:850}});
const base=process.env.PF_TEST_BASE_URL||'http://127.0.0.1:4173';
await page.goto(base+'/knit/preview-height.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('updated'),null,{timeout:45000});
for(const style of ['stockinette','rib','seed','cable','fairisle']){
 await page.locator('#kind').selectOption(style);
 for(const gauge of ['superchunky','medium']){
  await page.locator('#size').selectOption(gauge);
  await page.locator('#tile').screenshot({path:'height-'+style+'-'+gauge+'.png'});
  await page.locator('#repeat').screenshot({path:'height-repeat-'+style+'-'+gauge+'.png'});
 }
}
const px=await page.locator('#tile').evaluate(el=>{const d=el.getContext('2d').getImageData(0,0,1000,1000).data;let a=0,b=0;
for(let i=0;i<1000;i++)for(let k=0;k<3;k++){a+=Math.abs(d[i*1000*4+k]-d[(i*1000+999)*4+k]);b+=Math.abs(d[i*4+k]-d[(999*1000+i)*4+k])}
return {h:a/3000,v:b/3000};});
console.log('Map outer seam delta',px);
assert(px.h<24&&px.v<24,'seam jump unexpectedly high');
}finally{await browser.close()}