import { chromium } from 'playwright';
import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const baseMark = {
  id: 1,
  layerId: 'layer-drawing',
  type: 'brush',
  color: '#b012b0',
  width: 12,
  fill: false,
  opacity: 1,
  texture: 0,
  brushStyle: 'ink',
  stampShape: 'leaf',
  gradientType: 'linear',
  gradientDirection: 'diagonal',
  endColor: '#ffffff',
  points: [
    { x: 835, y: 410 },
    { x: 875, y: 430 },
    { x: 925, y: 470 },
    { x: 955, y: 505 },
  ],
};

function projectWithMark(mark) {
  const now = '2026-10-01T00:00:00.000Z';
  return {
    format: 'pattern-forge-v4',
    tile: 4000,
    dpi: 300,
    project: { id: 'pf-transform-fixture', title: 'Transform fixture', customer: '', theme: '', variation: '', repeatStyle: 'straight', createdAt: now, updatedAt: now },
    assets: [],
    items: [],
    marks: [mark],
    layers: [
      { id: 'layer-motifs', name: 'Motifs', visible: true, opacity: 1, locked: false, export: true },
      { id: 'layer-drawing', name: 'Drawing', visible: true, opacity: 1, locked: false, export: true },
    ],
    activeLayerId: 'layer-drawing',
    nextId: 2,
    background: '#ffffff',
    transparent: false,
    seed: 'transform-fixture',
    palette: { ink: '#2c5f54', colors: ['#2c5f54', '#b012b0'], saved: [] },
    settings: { gridCount: '16', symmetry: 'off', brushSize: '8', brushStyle: 'ink', stampShape: 'leaf', inkOpacity: '100', textureAmount: '0', gradientType: 'linear', gradientDirection: 'diagonal', gradientEnd: '#ffffff', neighborOpacity: '35', count: '28', minScale: '18', maxScale: '42', rotationAmount: '20', gridOn: false, symmetryGuides: true, snapOn: true, showTileBorder: true },
  };
}

async function downloadText(page, selector) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]);
  const path = await download.path();
  assert(path, `download path missing for ${selector}`);
  return await fs.readFile(path, 'utf8');
}

async function openProject(page, url, project) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#startPractice').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden' });
  await page.locator('#projectFile').setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.waitForFunction(() => document.querySelector('#projectNameDisplay')?.textContent?.includes('Transform fixture'));
  await page.waitForTimeout(200);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 1100 }, acceptDownloads: true });
const errors = [];

try {
  const current = await context.newPage();
  const previous = await context.newPage();
  for (const page of [current, previous]) {
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  }

  const baseProject = projectWithMark({ ...baseMark });
  await openProject(current, 'http://127.0.0.1:4173/app/', baseProject);
  const currentBaseSvg = await downloadText(current, '#exportSvg');

  await openProject(previous, 'http://127.0.0.1:4174/', baseProject);
  const previousBaseSvg = await downloadText(previous, '#exportSvg');
  assert(currentBaseSvg === previousBaseSvg, 'alpha.4 changed SVG output for an untransformed legacy mark');

  const baseCanvas = await current.locator('#editorCanvas').screenshot();
  const transformedProject = projectWithMark({
    ...baseMark,
    transformX: -170,
    transformY: 90,
    transformScale: 1.35,
    transformRotation: Math.PI / 7,
  });
  await current.locator('#projectFile').setInputFiles({ name: 'transformed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(transformedProject)) });
  await current.waitForTimeout(250);

  const transformedCanvas = await current.locator('#editorCanvas').screenshot();
  assert(Buffer.compare(baseCanvas, transformedCanvas) !== 0, 'canvas did not change for transformed mark');

  const transformedSvg = await downloadText(current, '#exportSvg');
  assert(transformedSvg !== currentBaseSvg, 'SVG did not change for transformed mark');
  assert(transformedSvg.includes('scale(1.35)'), 'SVG transform scale missing');
  assert(transformedSvg.includes('rotate(25.714'), 'SVG transform rotation missing');

  const savedText = await downloadText(current, '#saveProject');
  const saved = JSON.parse(savedText);
  const savedMark = saved.marks[0];
  assert(saved.format === 'pattern-forge-v4', 'transformed project did not save as v4');
  assert(savedMark.transformX === -170 && savedMark.transformY === 90, 'mark translation was not retained');
  assert(Math.abs(savedMark.transformScale - 1.35) < 1e-9, 'mark scale was not retained');
  assert(Math.abs(savedMark.transformRotation - Math.PI / 7) < 1e-9, 'mark rotation was not retained');

  assert(errors.length === 0, `browser errors: ${errors.join(' | ')}`);
  console.log('PASS alpha.3/alpha.4 legacy SVG parity and non-destructive transformed mark save/render/export');
} finally {
  await browser.close();
}
