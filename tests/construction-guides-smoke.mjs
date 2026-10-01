import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`); });

async function downloadBuffer(selector, timeout = 60000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
    page.locator(selector).click(),
  ]);
  const p = await download.path();
  assert(p, `no download path for ${selector}`);
  return await fs.readFile(p);
}

async function setGuide(value) {
  await page.locator('#constructionGuide').selectOption(value);
  await page.waitForTimeout(120);
}

try {
  await page.goto('http://127.0.0.1:4173/app/', { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });

  if (await page.locator('#gridOn').isChecked()) await page.locator('#gridOn').uncheck();
  if (await page.locator('#symmetryGuides').isChecked()) await page.locator('#symmetryGuides').uncheck();
  if (await page.locator('#showTileBorder').isChecked()) await page.locator('#showTileBorder').uncheck();

  const canvas = page.locator('#editorCanvas');
  await setGuide('off');
  const offShot = await canvas.screenshot();

  await setGuide('centre');
  const centreShot = await canvas.screenshot();
  assert(Buffer.compare(offShot, centreShot) !== 0, 'centre guide did not change the editor overlay');

  await setGuide('diagonals');
  const diagonalShot = await canvas.screenshot();
  assert(Buffer.compare(centreShot, diagonalShot) !== 0, 'diagonal guide did not render distinctly');

  await setGuide('diamond');
  const diamondShot = await canvas.screenshot();
  assert(Buffer.compare(diagonalShot, diamondShot) !== 0, 'diamond guide did not render distinctly');

  await setGuide('all');
  await page.locator('#guideOpacity').evaluate(el => {
    el.value = '27';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(120);
  assert((await page.locator('#guideOpacityLabel').textContent()) === '27%', 'guide opacity label did not update');

  const svgWithGuides = await downloadBuffer('#exportSvg');
  await setGuide('off');
  const svgWithoutGuides = await downloadBuffer('#exportSvg');
  assert(Buffer.compare(svgWithGuides, svgWithoutGuides) === 0, 'construction guides leaked into SVG export');

  await setGuide('all');
  const pngWithGuides = await downloadBuffer('#exportPng', 90000);
  await setGuide('off');
  const pngWithoutGuides = await downloadBuffer('#exportPng', 90000);
  assert(Buffer.compare(pngWithGuides, pngWithoutGuides) === 0, 'construction guides leaked into PNG export');

  await setGuide('diamond');
  await page.locator('#guideOpacity').evaluate(el => {
    el.value = '43';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const saved = JSON.parse((await downloadBuffer('#saveProject')).toString('utf8'));
  assert(saved.settings.constructionGuide === 'diamond', 'construction guide choice was not saved');
  assert(saved.settings.guideOpacity === '43', 'construction guide opacity was not saved');

  await page.waitForTimeout(1400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  assert((await page.locator('#constructionGuide').inputValue()) === 'diamond', 'autosave did not restore construction guide choice');
  assert((await page.locator('#guideOpacity').inputValue()) === '43', 'autosave did not restore construction guide opacity');
  assert((await page.locator('#guideOpacityLabel').textContent()) === '43%', 'restored guide opacity label is wrong');

  assert(pageErrors.length === 0, `browser errors: ${pageErrors.join(' | ')}`);
  console.log('PASS construction guides render in-editor, persist, and stay out of SVG/PNG exports');
} finally {
  await browser.close();
}
