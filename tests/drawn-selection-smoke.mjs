import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(120);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });
  await page.locator('#snapOn').uncheck();

  await page.locator('[data-tool="brush"]').first().click();
  const canvas = page.locator('#editorCanvas');
  const box = await canvas.boundingBox();
  assert(box, 'editor canvas has no bounding box');
  const x1 = box.x + box.width * 0.43;
  const y1 = box.y + box.height * 0.50;
  const x2 = box.x + box.width * 0.57;
  const y2 = box.y + box.height * 0.52;
  const xm = (x1 + x2) / 2;
  const ym = (y1 + y2) / 2;
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(180);

  const initial = JSON.parse(await downloadText(page, '#saveProject'));
  assert(initial.marks.length === 1, `expected one drawn mark, found ${initial.marks.length}`);
  const originalPoints = JSON.stringify(initial.marks[0].points);
  const originalId = initial.marks[0].id;

  await page.locator('[data-tool="select"]').first().click();
  await page.mouse.move(xm, ym);
  await page.mouse.down();
  await page.mouse.move(xm + 52, ym + 34, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(180);

  await page.waitForFunction(() => document.querySelector('#selectedPanel')?.textContent?.includes('Brush stroke'));
  assert(await page.locator('#selScale').count() === 1, 'drawn mark scale control did not appear');
  assert(await page.locator('#selRot').count() === 1, 'drawn mark rotation control did not appear');
  assert(await page.locator('#selOpacity').count() === 1, 'drawn mark opacity control did not appear');

  const afterDrag = JSON.parse(await downloadText(page, '#saveProject'));
  assert(afterDrag.marks.length === 1, 'drag changed mark count');
  const dragged = afterDrag.marks[0];
  assert(dragged.id === originalId, 'drag replaced the authored mark instead of transforming it');
  assert(JSON.stringify(dragged.points) === originalPoints, 'direct drag rewrote raw stroke points');
  assert(Math.abs(Number(dragged.transformX || 0)) > 0.01 || Math.abs(Number(dragged.transformY || 0)) > 0.01, 'direct drag did not create translation metadata');

  const movedX = xm + 52, movedY = ym + 34;
  const drawingRow = page.locator('.layerRow').filter({ hasText: 'Drawing' }).first();
  await drawingRow.click();
  await page.locator('#layerLocked').check();
  await page.waitForTimeout(140);
  assert((await page.locator('#selectedPanel').textContent()).includes('Select an imported motif or drawn mark'), 'locking Drawing did not clear drawn-mark selection');
  await page.mouse.click(movedX, movedY);
  await page.waitForTimeout(120);
  assert((await page.locator('#selectedPanel').textContent()).includes('Select an imported motif or drawn mark'), 'locked drawn mark could still be selected');

  await page.locator('#layerLocked').uncheck();
  await page.mouse.click(movedX, movedY);
  await page.waitForTimeout(140);
  await page.waitForFunction(() => document.querySelector('#selectedPanel')?.textContent?.includes('Brush stroke'));

  await drawingRow.click();
  await page.locator('#layerVisible').uncheck();
  await page.waitForTimeout(140);
  assert((await page.locator('#selectedPanel').textContent()).includes('Select an imported motif or drawn mark'), 'hiding Drawing did not clear drawn-mark selection');
  await page.mouse.click(movedX, movedY);
  await page.waitForTimeout(120);
  assert((await page.locator('#selectedPanel').textContent()).includes('Select an imported motif or drawn mark'), 'hidden drawn mark could still be selected');

  await page.locator('#layerVisible').check();
  await page.mouse.click(movedX, movedY);
  await page.waitForTimeout(140);
  await page.waitForFunction(() => document.querySelector('#selectedPanel')?.textContent?.includes('Brush stroke'));

  await setRange(page, '#selScale', 145);
  await setRange(page, '#selRot', 32);
  await setRange(page, '#selOpacity', 61);
  const transformed = JSON.parse(await downloadText(page, '#saveProject'));
  const tm = transformed.marks[0];
  assert(JSON.stringify(tm.points) === originalPoints, 'scale/rotation/opacity rewrote raw stroke points');
  assert(Math.abs(tm.transformScale - 1.45) < 1e-9, `expected 1.45 scale, got ${tm.transformScale}`);
  assert(Math.abs(tm.transformRotation - 32 * Math.PI / 180) < 1e-9, 'rotation metadata incorrect');
  assert(Math.abs(tm.opacity - 0.61) < 1e-9, 'mark opacity metadata incorrect');

  await page.locator('#duplicateSel').click();
  await page.waitForTimeout(160);
  const duplicated = JSON.parse(await downloadText(page, '#saveProject'));
  assert(duplicated.marks.length === 2, 'duplicate did not create a second mark');
  const copy = duplicated.marks.find(mark => mark.id !== originalId);
  assert(copy, 'duplicate did not receive a new ID');
  assert(JSON.stringify(copy.points) === originalPoints, 'duplicate altered raw geometry');
  assert(Math.abs(copy.transformScale - 1.45) < 1e-9, 'duplicate lost scale metadata');
  assert(Math.abs(copy.transformRotation - 32 * Math.PI / 180) < 1e-9, 'duplicate lost rotation metadata');

  await page.locator('#deleteSel').click();
  await page.waitForTimeout(140);
  let saved = JSON.parse(await downloadText(page, '#saveProject'));
  assert(saved.marks.length === 1 && saved.marks[0].id === originalId, 'delete removed the wrong drawn mark');
  assert(JSON.stringify(saved.marks[0].points) === originalPoints, 'duplicate/delete workflow changed source raw points');

  await page.waitForTimeout(1300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(220);
  const reloaded = JSON.parse(await downloadText(page, '#saveProject'));
  assert(reloaded.marks.length === 1, 'autosave/reload lost the drawn mark');
  const rm = reloaded.marks[0];
  assert(JSON.stringify(rm.points) === originalPoints, 'autosave/reload changed raw stroke points');
  assert(Math.abs(rm.transformScale - 1.45) < 1e-9, 'autosave/reload lost scale metadata');
  assert(Math.abs(rm.transformRotation - 32 * Math.PI / 180) < 1e-9, 'autosave/reload lost rotation metadata');
  assert(Math.abs(rm.opacity - 0.61) < 1e-9, 'autosave/reload lost opacity');

  assert(errors.length === 0, `browser errors: ${errors.join(' | ')}`);
  console.log('PASS drawn mark selection/drag, lock/hide, scale, rotation, opacity, duplicate/delete, raw-point preservation and autosave reload');
} finally {
  await browser.close();
}
