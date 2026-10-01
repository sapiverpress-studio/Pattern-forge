import { chromium } from 'playwright';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.waitForFunction(() => document.querySelector('#projectSetupOverlay')?.hidden === true);

  const canvas = page.locator('#editorCanvas');
  const line = page.locator('.toolRow [data-tool="line"]').first();
  const pan = page.locator('.toolRow [data-tool="pan"]').first();
  const eyedropper = page.locator('.toolRow [data-tool="eyedropper"]').first();

  await line.click();
  assert(await line.evaluate(el => el.classList.contains('active')), 'Line was not active before using Eyedropper');

  await eyedropper.click();
  await eyedropper.click();
  assert(await canvas.evaluate(el => getComputedStyle(el).cursor === 'copy'), 'Eyedropper cursor was not active');

  const box = await canvas.boundingBox();
  assert(box, 'Editor canvas was not available');
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.waitForTimeout(100);

  assert(await line.evaluate(el => el.classList.contains('active')), 'Eyedropper did not restore the Line tool');
  assert(await canvas.evaluate(el => getComputedStyle(el).cursor === 'crosshair'), 'Line cursor was not restored after Eyedropper');
  assert((await page.locator('#status').textContent()).includes('Line tool restored.'), 'Status did not confirm the Line tool restoration');
  assert((await page.locator('#ink').inputValue()).toLowerCase() === '#ffffff', 'Eyedropper did not sample the visible white tile colour');

  await pan.click();
  await eyedropper.click();
  const box2 = await canvas.boundingBox();
  assert(box2, 'Editor canvas disappeared before Pan restoration check');
  await canvas.click({ position: { x: box2.width / 2, y: box2.height / 2 } });
  await page.waitForTimeout(100);

  assert(await pan.evaluate(el => el.classList.contains('active')), 'Eyedropper did not restore the Pan tool');
  assert(await canvas.evaluate(el => getComputedStyle(el).cursor === 'grab'), 'Pan cursor was not restored after Eyedropper');
  assert((await page.locator('#status').textContent()).includes('Pan tool restored.'), 'Status did not confirm the Pan tool restoration');

  console.log('Pattern Forge eyedropper return smoke test passed');
} finally {
  await context.close();
  await browser.close();
}
