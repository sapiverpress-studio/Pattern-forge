import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function worldToScreen(page, world) {
  return await page.locator('#editorCanvas').evaluate((el, p) => {
    const rect = el.getBoundingClientRect();
    const sc = 0.38;
    const ox = (el.width - 900 * sc) / 2;
    const oy = (el.height - 900 * sc) / 2;
    return {
      x: rect.left + (ox + p.x * sc) * rect.width / el.width,
      y: rect.top + (oy + p.y * sc) * rect.height / el.height,
    };
  }, world);
}

async function drawWorld(page, from, to, steps = 12) {
  const a = await worldToScreen(page, from);
  const b = await worldToScreen(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
  await page.waitForTimeout(160);
}

async function setColour(page, value) {
  await page.locator('#ink').evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(80);
}

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(80);
}

async function sampleEditor(page, world) {
  return await page.locator('#editorCanvas').evaluate((el, p) => {
    const sc = 0.38;
    const ox = (el.width - 900 * sc) / 2;
    const oy = (el.height - 900 * sc) / 2;
    return Array.from(el.getContext('2d').getImageData(Math.round(ox + p.x * sc), Math.round(oy + p.y * sc), 1, 1).data);
  }, world);
}

async function downloadPath(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(selector).click(),
  ]);
  const p = await download.path();
  assert(p, `download path missing for ${selector}`);
  return p;
}

async function downloadJson(page) {
  const p = await downloadPath(page, '#saveProject');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function samplePng(page, filePath, x, y) {
  const base64 = (await fs.readFile(filePath)).toString('base64');
  return await page.evaluate(async ({ base64, x, y }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    return { size: [img.width, img.height], rgba: Array.from(cx.getImageData(x, y, 1, 1).data) };
  }, { base64, x, y });
}

function nearRed(rgba) { return rgba[0] > 190 && rgba[1] < 90 && rgba[2] < 90 && rgba[3] > 200; }
function nearBlue(rgba) { return rgba[2] > 190 && rgba[0] < 90 && rgba[1] < 90 && rgba[3] > 200; }
function nearGreen(rgba) { return rgba[1] > 150 && rgba[0] < 120 && rgba[2] < 120 && rgba[3] > 200; }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });
  await page.locator('#symmetry').selectOption('off');
  await page.locator('#gridOn').uncheck();
  await page.locator('#snapOn').uncheck();

  // Bottom red rectangle on Drawing layer.
  await setColour(page, '#ff0000');
  await page.locator('[data-tool="rect"]').first().click();
  await drawWorld(page, { x: 300, y: 300 }, { x: 600, y: 600 }, 2);

  // New upper layer with matching blue rectangle.
  await page.locator('#layerAdd').click();
  await setColour(page, '#0000ff');
  await page.locator('[data-tool="rect"]').first().click();
  await drawWorld(page, { x: 300, y: 300 }, { x: 600, y: 600 }, 2);

  // Erase a vertical stripe from upper layer only.
  await setRange(page, '#brushSize', 400);
  await page.locator('[data-tool="eraser"]').first().click();
  await drawWorld(page, { x: 450, y: 330 }, { x: 450, y: 570 }, 18);

  const erasedCentre = await sampleEditor(page, { x: 450, y: 450 });
  const upperBlue = await sampleEditor(page, { x: 380, y: 450 });
  assert(nearRed(erasedCentre), `eraser did not reveal lower red layer: ${erasedCentre}`);
  assert(nearBlue(upperBlue), `upper blue layer was damaged away from eraser: ${upperBlue}`);

  let saved = await downloadJson(page);
  const erasers = saved.marks.filter(m => m.type === 'eraser');
  assert(erasers.length === 1, `expected one eraser action, found ${erasers.length}`);
  assert(erasers[0].points.length > 2, 'eraser was not recorded as a freehand stroke');

  // Locked active layer must reject erasing.
  await page.locator('#layerLocked').check();
  await drawWorld(page, { x: 520, y: 330 }, { x: 520, y: 570 }, 8);
  saved = await downloadJson(page);
  assert(saved.marks.filter(m => m.type === 'eraser').length === 1, 'locked layer accepted a new eraser stroke');
  await page.locator('#layerLocked').uncheck();

  // Drawing after an eraser must remain visible above the erased region.
  await setColour(page, '#00aa00');
  await setRange(page, '#brushSize', 300);
  await page.locator('[data-tool="brush"]').first().click();
  await drawWorld(page, { x: 360, y: 450 }, { x: 540, y: 450 }, 14);
  const afterDraw = await sampleEditor(page, { x: 450, y: 450 });
  assert(nearGreen(afterDraw), `post-erase drawing was incorrectly erased: ${afterDraw}`);

  // SVG must use a vector mask and place later green drawing after the masked group.
  const svgPath = await downloadPath(page, '#exportSvg');
  const svg = await fs.readFile(svgPath, 'utf8');
  assert(svg.includes('mask-type:luminance'), 'SVG eraser mask missing');
  assert(svg.includes('pf-erase-'), 'SVG eraser mask id missing');
  const maskUse = svg.indexOf('mask="url(#pf-erase-');
  const green = svg.lastIndexOf('#00aa00');
  assert(maskUse >= 0 && green > maskUse, 'SVG post-erase drawing order is incorrect');

  // Autosave/reload must preserve the eraser action and later mark.
  await page.waitForTimeout(1300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(220);
  const reloaded = await downloadJson(page);
  assert(reloaded.marks.filter(m => m.type === 'eraser').length === 1, 'autosave/reload lost eraser stroke');

  // Transparent export must contain true alpha where a single-layer drawing is erased.
  await page.locator('#clear').click();
  await page.locator('#transparent').check();
  await setColour(page, '#0000ff');
  await page.locator('[data-tool="rect"]').first().click();
  await drawWorld(page, { x: 300, y: 300 }, { x: 600, y: 600 }, 2);
  await setRange(page, '#brushSize', 400);
  await page.locator('[data-tool="eraser"]').first().click();
  await drawWorld(page, { x: 450, y: 330 }, { x: 450, y: 570 }, 18);
  const pngPath = await downloadPath(page, '#exportPng');
  const centrePng = await samplePng(page, pngPath, 2000, 2000);
  const bluePng = await samplePng(page, pngPath, Math.round(380 / 900 * 4000), 2000);
  assert(centrePng.size[0] === 4000 && centrePng.size[1] === 4000, `unexpected PNG dimensions ${centrePng.size}`);
  assert(centrePng.rgba[3] < 10, `erased PNG centre is not transparent: ${centrePng.rgba}`);
  assert(nearBlue(bluePng.rgba), `non-erased PNG area lost artwork: ${bluePng.rgba}`);

  // Eraser must be available in both desktop and mobile tool surfaces.
  assert(await page.locator('.toolRow [data-tool="eraser"]').count() === 1, 'desktop eraser button missing');
  assert(await page.locator('.mobileTools [data-tool="eraser"]').count() === 1, 'mobile eraser button missing');
  assert(errors.length === 0, `browser errors: ${errors.join(' | ')}`);
  console.log('PASS real eraser: layer-local reveal, lock protection, post-erase drawing order, SVG mask, autosave, transparent PNG alpha and mobile access');
} finally {
  await browser.close();
}
