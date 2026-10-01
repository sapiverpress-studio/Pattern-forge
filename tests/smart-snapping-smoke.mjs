import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function near(a, b, tolerance = 1.5) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

async function downloadText(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(selector).click(),
  ]);
  const p = await download.path();
  assert(p, `download path missing for ${selector}`);
  return await fs.readFile(p, 'utf8');
}

async function saveProject(page) {
  return JSON.parse(await downloadText(page, '#saveProject'));
}

async function worldToScreen(page, world) {
  const canvas = page.locator('#editorCanvas');
  await canvas.scrollIntoViewIfNeeded();
  return await canvas.evaluate((el, p) => {
    const rect = el.getBoundingClientRect();
    const scale = 0.38;
    const originX = (el.width - 900 * scale) / 2;
    const originY = (el.height - 900 * scale) / 2;
    return {
      x: rect.left + (originX + p.x * scale) * rect.width / el.width,
      y: rect.top + (originY + p.y * scale) * rect.height / el.height,
    };
  }, world);
}

async function dragWorld(page, from, to, hold = false) {
  const a = await worldToScreen(page, from);
  const b = await worldToScreen(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.waitForTimeout(140);
  if (!hold) {
    await page.mouse.up();
    await page.waitForTimeout(140);
  }
  return b;
}

async function pixelAtWorld(page, world) {
  return await page.locator('#editorCanvas').evaluate((el, p) => {
    const c = el.getContext('2d');
    const scale = 0.38;
    const originX = (el.width - 900 * scale) / 2;
    const originY = (el.height - 900 * scale) / 2;
    const x = Math.round(originX + p.x * scale);
    const y = Math.round(originY + p.y * scale);
    return [...c.getImageData(x, y, 1, 1).data];
  }, world);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

try {
  await page.goto('http://127.0.0.1:4173/app/', { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });
  await page.locator('#symmetry').selectOption('off');
  await page.locator('#gridOn').uncheck();
  await page.locator('#showTileBorder').uncheck();
  await page.locator('#constructionGuide').selectOption('off');
  if (await page.locator('#snapOn').isChecked()) await page.locator('#snapOn').uncheck();

  const tinySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0a84ff"/></svg>';
  await page.locator('#files').setInputFiles({ name: 'snap-motif.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(tinySvg) });
  await page.waitForTimeout(220);
  await page.locator('[data-tool="select"]').first().click();

  let project = await saveProject(page);
  assert(project.items.length === 1, 'imported motif missing');
  let item = project.items[0];

  // Establish an unsnapped starting position.
  await dragWorld(page, { x: item.x, y: item.y }, { x: 300, y: 300 });
  project = await saveProject(page);
  item = project.items[0];
  assert(near(item.x, 300, 2) && near(item.y, 300, 2), `snap-off move changed target unexpectedly: ${item.x}, ${item.y}`);

  await page.locator('#snapOn').check();

  // Snap both axes to the tile centre and inspect the temporary alignment guides while held.
  await dragWorld(page, { x: item.x, y: item.y }, { x: 463, y: 462 }, true);
  const verticalGuidePixel = await pixelAtWorld(page, { x: 450, y: 80 });
  const horizontalGuidePixel = await pixelAtWorld(page, { x: 80, y: 450 });
  assert(verticalGuidePixel[0] > verticalGuidePixel[1] + 35, `vertical temporary alignment guide not visible: ${verticalGuidePixel}`);
  assert(horizontalGuidePixel[0] > horizontalGuidePixel[1] + 35, `horizontal temporary alignment guide not visible: ${horizontalGuidePixel}`);
  await page.mouse.up();
  await page.waitForTimeout(150);

  project = await saveProject(page);
  item = project.items[0];
  assert(near(item.x, 450, 0.2) && near(item.y, 450, 0.2), `centre-line smart snap failed: ${item.x}, ${item.y}`);

  const asset = project.assets.find(a => String(a.id) === String(item.assetId));
  assert(asset, 'motif asset missing');
  const halfW = asset.w * item.scale / 2;
  const halfH = asset.h * item.scale / 2;

  // Snap artwork bounds to left/top tile edges.
  await dragWorld(page, { x: item.x, y: item.y }, { x: halfW + 14, y: halfH + 14 });
  project = await saveProject(page);
  item = project.items[0];
  assert(near(item.x, halfW, 0.2), `left-edge snap failed: expected ${halfW}, got ${item.x}`);
  assert(near(item.y, halfH, 0.2), `top-edge snap failed: expected ${halfH}, got ${item.y}`);

  // Snap artwork bounds to right/bottom tile edges.
  await dragWorld(page, { x: item.x, y: item.y }, { x: 900 - halfW - 14, y: 900 - halfH - 14 });
  project = await saveProject(page);
  item = project.items[0];
  assert(near(item.x, 900 - halfW, 0.2), `right-edge snap failed: expected ${900 - halfW}, got ${item.x}`);
  assert(near(item.y, 900 - halfH, 0.2), `bottom-edge snap failed: expected ${900 - halfH}, got ${item.y}`);

  // Existing grid snapping remains available when no stronger centre/edge target is close.
  await dragWorld(page, { x: item.x, y: item.y }, { x: 329, y: 329 });
  project = await saveProject(page);
  item = project.items[0];
  assert(near(item.x, 337.5, 0.2) && near(item.y, 337.5, 0.2), `grid snapping regressed: ${item.x}, ${item.y}`);

  // Drawn artwork uses the same smart snap engine without rewriting raw points.
  await page.locator('#snapOn').uncheck();
  const drawingRow = page.locator('.layerRow').filter({ hasText: 'Drawing' }).first();
  await drawingRow.click();
  await page.locator('[data-tool="brush"]').first().click();
  await dragWorld(page, { x: 250, y: 650 }, { x: 350, y: 650 });
  project = await saveProject(page);
  assert(project.marks.length === 1, 'drawn mark missing');
  const rawPoints = JSON.stringify(project.marks[0].points);
  const xs = project.marks[0].points.map(p => p.x);
  const ys = project.marks[0].points.map(p => p.y);
  let markCentre = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };

  await page.locator('[data-tool="select"]').first().click();
  await page.locator('#snapOn').check();
  await dragWorld(page, markCentre, { x: 463, y: markCentre.y });
  project = await saveProject(page);
  const mark = project.marks[0];
  const movedX = markCentre.x + Number(mark.transformX || 0);
  assert(near(movedX, 450, 0.25), `drawn mark centre smart snap failed: ${movedX}`);
  assert(JSON.stringify(mark.points) === rawPoints, 'smart snapping rewrote drawn mark raw geometry');

  assert(errors.length === 0, `browser errors: ${errors.join(' | ')}`);
  console.log('PASS smart snap centre/edges/grid, temporary alignment guides and drawn-mark geometry preservation');
} finally {
  await browser.close();
}
