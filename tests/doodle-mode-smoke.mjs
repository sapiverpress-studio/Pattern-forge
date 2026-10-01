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
  await page.waitForTimeout(180);
}

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function download(page, selector) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]);
  const path = await d.path();
  assert(path, `download path missing for ${selector}`);
  return { path, filename: d.suggestedFilename() };
}

async function downloadJson(page) {
  const d = await download(page, '#saveProject');
  return { ...d, json: JSON.parse(await fs.readFile(d.path, 'utf8')) };
}

async function samplePng(page, filePath, x, y) {
  const base64 = (await fs.readFile(filePath)).toString('base64');
  return await page.evaluate(async ({ base64, x, y }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    return { size: [img.width, img.height], rgba: Array.from(cx.getImageData(x, y, 1, 1).data) };
  }, { base64, x, y });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });

  await page.locator('#projectTypeInput').selectOption('doodle');
  assert(await page.locator('#projectRepeatSetup').isHidden(), 'repeat setup should hide for Doodle Project');
  assert((await page.locator('#createProject').textContent()).toLowerCase().includes('doodle'), 'create button did not switch to Doodle Project');
  await page.locator('#projectTitleInput').fill('Doodle Edge Test');
  await page.locator('#projectSetupForm').evaluate(form => form.requestSubmit());
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });

  assert((await page.locator('#projectNameDisplay').textContent()).includes('Doodle'), 'project badge does not identify Doodle');
  assert(await page.locator('#transparent').isChecked(), 'Doodle Project did not force transparency');
  assert(await page.locator('#transparent').isDisabled(), 'Doodle transparency can be disabled');
  assert(await page.locator('#bg').isDisabled(), 'Doodle background colour should be disabled');
  for (const selector of ['#patternScatterDisclosure','#repeatControls','#repeatPreviewToggle','#repeatPreviewHeading','#preview','#previewScaleField']) {
    assert(await page.locator(selector).isHidden(), `${selector} should be hidden in Doodle Mode`);
  }
  assert((await page.locator('#stageDescription').textContent()).includes('standalone'), 'stage does not describe standalone Doodle canvas');
  assert((await page.locator('#exportPng').textContent()).includes('artwork'), 'PNG export label is not Doodle-specific');
  assert((await page.locator('#exportSvg').textContent()).includes('artwork'), 'SVG export label is not Doodle-specific');

  await page.locator('#symmetry').selectOption('off');
  if (await page.locator('#gridOn').isChecked()) await page.locator('#gridOn').uncheck();
  if (await page.locator('#snapOn').isChecked()) await page.locator('#snapOn').uncheck();
  await setRange(page, '#brushSize', 80);
  await page.locator('[data-tool="brush"]').first().click();
  await drawWorld(page, { x: 820, y: 450 }, { x: 940, y: 450 }, 18);

  const saved = await downloadJson(page);
  assert(saved.json.format === 'pattern-forge-v4', 'Doodle save is not v4');
  assert(saved.json.project?.projectType === 'doodle', 'Doodle projectType not saved');
  assert(saved.json.project?.repeatStyle === 'straight', 'Doodle repeatStyle should be straight internally');
  assert(saved.json.transparent === true, 'Doodle save is not transparent');
  const brush = saved.json.marks.find(m => m.type === 'brush');
  assert(brush, 'Doodle brush stroke missing');
  assert(brush.points.some(p => Number(p.x) > 900), 'Doodle stroke was canonicalized/wrapped instead of remaining standalone');

  const png = await download(page, '#exportPng');
  assert(png.filename.includes('-artwork-300dpi.png'), `unexpected Doodle PNG filename: ${png.filename}`);
  const right = await samplePng(page, png.path, 3950, 2000);
  const left = await samplePng(page, png.path, 80, 2000);
  assert(right.size[0] === 4000 && right.size[1] === 4000, `unexpected Doodle PNG dimensions ${right.size}`);
  assert(right.rgba[3] > 150, `right-edge authored stroke missing from Doodle PNG: ${right.rgba}`);
  assert(left.rgba[3] < 10, `Doodle artwork wrapped to left edge: ${left.rgba}`);

  const svg = await download(page, '#exportSvg');
  assert(svg.filename.includes('-artwork.svg'), `unexpected Doodle SVG filename: ${svg.filename}`);
  const svgText = await fs.readFile(svg.path, 'utf8');
  assert(svgText.includes('viewBox="0 0 4000 4000"'), 'Doodle SVG is not 4000 × 4000');
  assert(!svgText.includes('<rect width="4000" height="4000" fill='), 'Doodle SVG incorrectly contains background rectangle');

  await page.waitForTimeout(1300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  const reopened = await downloadJson(page);
  assert(reopened.json.project?.projectType === 'doodle', 'autosave/reload lost Doodle projectType');
  assert(reopened.json.transparent === true, 'autosave/reload lost Doodle transparency');
  const reopenedBrush = reopened.json.marks.find(m => m.type === 'brush');
  assert(reopenedBrush?.points.some(p => Number(p.x) > 900), 'autosave/reload wrapped or lost Doodle edge-crossing geometry');
  assert(await page.locator('#transparent').isDisabled(), 'restored Doodle project did not restore mode UI');

  assert(errors.length === 0, `browser errors: ${errors.join(' | ')}`);
  console.log('PASS Doodle Mode: project choice, transparent standalone canvas, no edge wrapping, PNG/SVG export and autosave/reload');
} finally {
  await browser.close();
}
