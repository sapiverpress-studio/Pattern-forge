from pathlib import Path

repls = {
  'tests/layer-ui-smoke.mjs': (
'''  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.layerRowName')].some(el => el.textContent === 'Sketch'));''',
'''  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#resumePrompt').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#continuePrevious').click();
  await page.locator('#projectSetupOverlay').waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.layerRowName')].some(el => el.textContent === 'Sketch'));'''),
  'tests/start-again-smoke.mjs': (
'''  await page.reload({waitUntil:'networkidle'});
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);''',
'''  await page.reload({waitUntil:'networkidle'});
  await page.locator('#resumePrompt').waitFor({state:'visible',timeout:5000});
  await page.locator('#continuePrevious').click();
  await page.locator('#projectSetupOverlay').waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>document.querySelectorAll('.assetWrap').length===2);''')
}

for path, (old, new) in repls.items():
    p=Path(path); s=p.read_text()
    if old not in s: raise SystemExit(f'expected autosave reload anchor missing in {path}')
    p.write_text(s.replace(old,new,1))
print('resume-aware Layer and Start-again regressions updated')
