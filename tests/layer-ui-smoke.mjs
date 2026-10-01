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

async function layerNames() {
  return await page.locator('.layerRowName').allTextContents();
}

async function selectLayer(name) {
  const row = page.locator('.layerRow').filter({ has: page.locator('.layerRowName', { hasText: name }) }).first();
  await row.click();
  await page.waitForTimeout(80);
}

async function drawStroke() {
  const canvas = page.locator('#editorCanvas');
  const box = await canvas.boundingBox();
  assert(box, 'editor canvas did not have a bounding box');
  const x1 = box.x + box.width * 0.42;
  const y1 = box.y + box.height * 0.46;
  const x2 = box.x + box.width * 0.58;
  const y2 = box.y + box.height * 0.54;
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);
}

async function downloadText(buttonSelector) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(buttonSelector).click(),
  ]);
  const downloadPath = await download.path();
  assert(downloadPath, `no download path for ${buttonSelector}`);
  return await fs.readFile(downloadPath, 'utf8');
}

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });

  assert((await layerNames()).join('|') === 'Drawing|Motifs', 'default layer order was not Drawing over Motifs');

  await page.locator('#layerAdd').click();
  assert((await page.locator('.layerRow').count()) === 3, 'adding a layer did not create a third layer');
  await page.locator('#layerName').fill('Sketch');
  await page.locator('#layerName').press('Tab');
  await page.waitForTimeout(120);
  assert((await layerNames())[0] === 'Sketch', 'new Sketch layer was not topmost');

  await page.locator('#layerLocked').check();
  await page.locator('[data-tool="brush"]').first().click();
  await drawStroke();
  assert((await page.locator('#layerSummary').textContent()).includes('0 artwork items'), 'locked layer accepted drawing');

  await page.locator('#layerLocked').uncheck();
  await page.locator('#ink').fill('#b012b0');
  await drawStroke();
  assert((await page.locator('#layerSummary').textContent()).includes('1 artwork item'), 'unlocked layer did not receive the brush stroke');

  const editorBeforeNoExport = await page.locator('#editorCanvas').screenshot();
  await page.locator('#layerExport').uncheck();
  await page.waitForTimeout(120);
  const editorAfterNoExport = await page.locator('#editorCanvas').screenshot();
  assert(Buffer.compare(editorBeforeNoExport, editorAfterNoExport) === 0, 'export=false changed editor visibility');

  const excludedSvg = await downloadText('#exportSvg');
  assert(!excludedSvg.includes('#b012b0'), 'export=false layer still appeared in SVG');
  await page.locator('#layerExport').check();
  const includedSvg = await downloadText('#exportSvg');
  assert(includedSvg.includes('#b012b0'), 'export-enabled Sketch layer was missing from SVG');

  await page.locator('#layerOpacity').fill('30');
  await page.locator('#layerOpacity').press('ArrowRight');
  await page.locator('#layerOpacity').press('ArrowLeft');
  await page.locator('#layerOpacity').evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForTimeout(120);
  assert((await page.locator('#layerOpacityValue').textContent()) === '30%', 'layer opacity control did not retain 30%');

  const projectJson = await downloadText('#saveProject');
  const project = JSON.parse(projectJson);
  assert(project.format === 'pattern-forge-v4', 'saved project is not pattern-forge-v4');
  const sketch = project.layers.find(layer => layer.name === 'Sketch');
  assert(sketch, 'Sketch layer missing from saved project');
  assert(Math.abs(sketch.opacity - 0.30) < 0.001, 'Sketch layer opacity missing from saved project');
  assert(project.marks.filter(mark => mark.layerId === sketch.id).length === 1, 'Sketch mark did not retain its layerId');

  await page.waitForTimeout(1300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(200);
  assert((await layerNames()).includes('Sketch'), 'IndexedDB autosave did not restore the Sketch layer after reload');
  await selectLayer('Sketch');
  assert((await page.locator('#layerOpacityValue').textContent()) === '30%', 'autosave did not restore layer opacity');

  await page.locator('#layerDuplicate').click();
  let names = await layerNames();
  assert(names[0] === 'Sketch copy' && names[1] === 'Sketch', 'duplicate layer order/name was incorrect');
  assert((await page.locator('#layerSummary').textContent()).includes('1 artwork item'), 'duplicate layer did not copy its artwork');

  await page.locator('#layerDown').click();
  names = await layerNames();
  assert(names[0] === 'Sketch' && names[1] === 'Sketch copy', 'Move down did not change layer order');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#layerDelete').click();
  names = await layerNames();
  assert(!names.includes('Sketch copy') && names.includes('Sketch'), 'deleting duplicate layer removed the wrong layer');

  const tinySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0a84ff"/></svg>';
  await page.locator('#files').setInputFiles({ name: 'test-motif.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(tinySvg) });
  await page.waitForTimeout(250);
  assert(!(await page.locator('#selectedPanel').textContent()).includes('Select an imported image'), 'uploaded motif was not selected');
  await selectLayer('Motifs');
  await page.locator('#layerLocked').check();
  await page.waitForTimeout(120);
  assert((await page.locator('#selectedPanel').textContent()).includes('Select an imported image'), 'locking Motifs did not clear the selected motif');

  await page.locator('[data-tool="select"]').first().click();
  const canvas = page.locator('#editorCanvas');
  const box = await canvas.boundingBox();
  assert(box, 'canvas missing for locked motif hit test');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  assert((await page.locator('#selectedPanel').textContent()).includes('Select an imported image'), 'locked motif could still be selected/transformed');

  assert(pageErrors.length === 0, `browser errors: ${pageErrors.join(' | ')}`);
  console.log('PASS layer UI, export filtering, save/load, IndexedDB autosave, duplicate/reorder/delete and lock smoke tests');
} finally {
  await browser.close();
}
