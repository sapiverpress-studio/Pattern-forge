(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = id => document.getElementById(id);
  const icon = id => `<svg aria-hidden="true"><use href="/app/assets/canvas-first-icons.svg#${id}"></use></svg>`;

  function legacyTool(name){
    return $$(`[data-tool="${name}"]`).find(el => !el.closest('#pfLiveShell')) || null;
  }

  function clickLegacyTool(name){
    const target = legacyTool(name);
    if (target) target.click();
  }

  function forwardInput(source, value, eventName = 'input'){
    if (!source) return;
    if (source.type === 'checkbox') source.checked = !!value;
    else source.value = value;
    source.dispatchEvent(new Event(eventName, { bubbles:true }));
    if (eventName !== 'change') source.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function proxyButton(label, onClick, className = ''){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pf-chip ${className}`.trim();
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function proxyRange(sourceId, label){
    const source = byId(sourceId);
    const wrap = document.createElement('label');
    wrap.className = 'pf-range-control';
    const caption = document.createElement('span');
    caption.textContent = label;
    const input = document.createElement('input');
    input.type = 'range';
    if (source) {
      input.min = source.min || '0'; input.max = source.max || '100'; input.step = source.step || '1'; input.value = source.value;
      input.addEventListener('input', () => forwardInput(source, input.value));
      source.addEventListener('input', () => { input.value = source.value; });
    }
    wrap.append(caption, input);
    return wrap;
  }

  function proxySelect(sourceId, label){
    const source = byId(sourceId);
    const wrap = document.createElement('label');
    wrap.className = 'pf-select-control';
    const caption = document.createElement('span');
    caption.textContent = label;
    const select = document.createElement('select');
    if (source) {
      [...source.options].forEach(option => select.add(new Option(option.textContent, option.value)));
      select.value = source.value;
      select.addEventListener('change', () => forwardInput(source, select.value, 'change'));
      source.addEventListener('change', () => { select.value = source.value; });
    }
    wrap.append(caption, select);
    return wrap;
  }

  function proxyCheckbox(sourceId, label){
    const source = byId(sourceId);
    const wrap = document.createElement('label');
    wrap.className = 'pf-check-control';
    const input = document.createElement('input');
    input.type = 'checkbox';
    if (source) {
      input.checked = source.checked;
      input.addEventListener('change', () => forwardInput(source, input.checked, 'change'));
      source.addEventListener('change', () => { input.checked = source.checked; });
    }
    const span = document.createElement('span'); span.textContent = label;
    wrap.append(input, span);
    return wrap;
  }

  function buildShell(){
    if (byId('pfLiveShell') || !byId('stageWrap')) return;

    document.body.classList.add('pf-canvas-first-live');
    const shell = document.createElement('section');
    shell.id = 'pfLiveShell';
    shell.className = 'pf-live-shell';
    shell.innerHTML = `
      <header class="pf-topbar">
        <div class="pf-top-left">
          <a class="pf-icon-button pf-gallery-link" href="/" aria-label="Gallery">${icon('i-gallery')}<span>Gallery</span></a>
          <div class="pf-project-identity"><strong id="pfProjectName">Untitled</strong><span id="pfModeBadge" class="pf-mode-badge">Pattern</span></div>
        </div>
        <div class="pf-top-actions">
          <button class="pf-icon-button" id="pfUndo" type="button" aria-label="Undo">${icon('i-undo')}</button>
          <button class="pf-icon-button" id="pfRedo" type="button" aria-label="Redo">${icon('i-redo')}</button>
          <button class="pf-top-button" id="pfPreview" type="button">${icon('i-preview')}<span>Preview</span></button>
          <button class="pf-top-button primary" id="pfExport" type="button">${icon('i-export')}<span>Export</span></button>
        </div>
      </header>
      <div class="pf-editor-grid">
        <nav class="pf-tool-rail" aria-label="Drawing tools">
          <button class="pf-tool active" type="button" data-pf-tool="select">${icon('i-select')}<span>Select</span></button>
          <button class="pf-tool" type="button" data-pf-tool="brush">${icon('i-brush')}<span>Brush</span></button>
          <button class="pf-tool" type="button" data-pf-tool="eraser">${icon('i-eraser')}<span>Erase</span></button>
          <button class="pf-tool" type="button" data-pf-tool="fill">${icon('i-fill')}<span>Fill</span></button>
          <button class="pf-tool" type="button" data-pf-tool="pan">${icon('i-pan')}<span>Pan</span></button>
          <button class="pf-tool" type="button" data-pf-tool="image">${icon('i-image')}<span>Image</span></button>
          <button class="pf-tool" type="button" data-pf-tool="shape">${icon('i-shape')}<span>Shape</span></button>
        </nav>
        <main class="pf-canvas-column">
          <div class="pf-canvas-info"><span id="pfCanvasHint">Select artwork to move, scale or rotate</span><div><button id="pfFit" type="button">Fit</button><span id="pfZoomReadout">100%</span></div></div>
          <div class="pf-canvas-host" id="pfCanvasHost"></div>
        </main>
        <nav class="pf-quick-dock" aria-label="Project palettes">
          <button class="pf-dock-button" type="button" data-pf-panel="colour">${icon('i-colour')}<span>Colour</span></button>
          <button class="pf-dock-button" type="button" data-pf-panel="layers">${icon('i-layers')}<span>Layers</span></button>
          <button class="pf-dock-button pattern-only" type="button" data-pf-panel="pattern">${icon('i-repeat')}<span>Pattern</span></button>
        </nav>
        <aside class="pf-side-panel" id="pfSidePanel" hidden>
          <div class="pf-panel-head"><strong id="pfPanelTitle">Layers</strong><button id="pfPanelClose" type="button" aria-label="Close panel">${icon('i-close')}</button></div>
          <div class="pf-panel-body" id="pfPanelBody"></div>
        </aside>
      </div>
      <footer class="pf-context-bar" id="pfContextBar"></footer>`;

    const layout = $('.layout');
    layout.parentNode.insertBefore(shell, layout);
    byId('pfCanvasHost').appendChild(byId('stageWrap'));

    byId('pfUndo').addEventListener('click', () => byId('undo')?.click());
    byId('pfRedo').addEventListener('click', () => byId('redo')?.click());
    byId('pfFit').addEventListener('click', () => byId('fit')?.click());
    byId('pfPreview').addEventListener('click', () => byId('repeatPreviewToggle')?.click());
    byId('pfExport').addEventListener('click', () => openPanel('export'));
    byId('pfPanelClose').addEventListener('click', closePanel);

    $$('.pf-tool', shell).forEach(button => button.addEventListener('click', () => activateTool(button.dataset.pfTool)));
    $$('.pf-dock-button', shell).forEach(button => button.addEventListener('click', () => openPanel(button.dataset.pfPanel)));

    byId('zoom')?.addEventListener('input', syncZoomReadout);
    syncIdentity();
    syncZoomReadout();
    new MutationObserver(syncIdentity).observe(document.body, {attributes:true, attributeFilter:['class','data-workspace']});
    const nameSource = byId('projectNameDisplay');
    if (nameSource) new MutationObserver(syncIdentity).observe(nameSource, {childList:true, characterData:true, subtree:true});

    activateTool('select');
  }

  function syncIdentity(){
    const name = byId('projectNameDisplay')?.textContent?.trim() || 'Untitled';
    const badge = byId('pfProjectName'); if (badge) badge.textContent = name;
    const doodle = document.body.classList.contains('doodle-project') || document.body.dataset.workspace === 'doodle';
    const mode = byId('pfModeBadge'); if (mode) mode.textContent = doodle ? 'Doodle' : 'Pattern';
    const shell = byId('pfLiveShell'); if (shell) shell.classList.toggle('is-doodle', doodle);
  }

  function syncZoomReadout(){
    const z = byId('zoomLabel')?.textContent || `${byId('zoom')?.value || 100}%`;
    const out = byId('pfZoomReadout'); if (out) out.textContent = z;
  }

  const hints = {
    select:'Select artwork to move, scale or rotate', brush:'Draw on the active layer', eraser:'Erase from the active layer',
    fill:'Trace a filled area or create a gradient', pan:'Move and zoom around the canvas', image:'Import and place artwork', shape:'Draw lines, rectangles or ellipses'
  };

  function activateTool(tool){
    $$('.pf-tool').forEach(button => button.classList.toggle('active', button.dataset.pfTool === tool));
    const hint = byId('pfCanvasHint'); if (hint) hint.textContent = hints[tool] || '';
    if (tool === 'fill') clickLegacyTool('freefill');
    else if (tool === 'image') byId('files')?.click();
    else if (tool === 'shape') clickLegacyTool('rect');
    else clickLegacyTool(tool);
    renderContext(tool);
  }

  function renderContext(tool){
    const bar = byId('pfContextBar'); if (!bar) return;
    bar.innerHTML = '';
    if (tool === 'brush') {
      bar.append(proxySelect('brushStyle','Brush'), proxyRange('brushSize','Size'), proxyRange('inkOpacity','Opacity'), proxyRange('textureAmount','Texture'));
      bar.append(proxyButton('Eyedropper', () => clickLegacyTool('eyedropper')));
    } else if (tool === 'eraser') {
      bar.append(proxyRange('brushSize','Size'), proxyRange('inkOpacity','Opacity'));
    } else if (tool === 'fill') {
      bar.append(proxyButton('Freehand fill', () => clickLegacyTool('freefill'), 'active'), proxyButton('Gradient', () => clickLegacyTool('gradient')), proxySelect('gradientType','Gradient'));
    } else if (tool === 'pan') {
      bar.append(proxyButton('Fit canvas', () => byId('fit')?.click()), proxyRange('zoom','Zoom'));
    } else if (tool === 'image') {
      bar.append(proxyButton('Add image', () => byId('files')?.click(), 'active'), proxyButton('Selection & layers', () => openPanel('layers')));
    } else if (tool === 'shape') {
      bar.append(proxyButton('Line', () => clickLegacyTool('line')), proxyButton('Rectangle', () => clickLegacyTool('rect'), 'active'), proxyButton('Ellipse', () => clickLegacyTool('ellipse')), proxyCheckbox('shapeFill','Fill shapes'), proxyRange('brushSize','Outline'));
    } else {
      bar.append(proxyButton('Selection & layers', () => openPanel('layers'), 'active'), proxyCheckbox('snapOn','Smart snapping'), proxyButton('Duplicate / transform', () => openPanel('layers')));
    }
    bar.append(proxyButton('Undo', () => byId('undo')?.click()), proxyButton('Redo', () => byId('redo')?.click()));
  }

  function closePanel(){
    const panel = byId('pfSidePanel');
    if (!panel) return;
    panel.hidden = true;
    byId('pfLiveShell')?.classList.remove('panel-open');
    $$('.pf-dock-button').forEach(button => button.classList.remove('active'));
  }

  function moveLegacySection(id, body){
    const node = byId(id);
    if (!node) return false;
    node.open = true;
    body.appendChild(node);
    return true;
  }

  function openPanel(name){
    const panel = byId('pfSidePanel'); const body = byId('pfPanelBody'); const title = byId('pfPanelTitle');
    if (!panel || !body || !title) return;
    body.innerHTML = '';
    title.textContent = name === 'colour' ? 'Colour' : name === 'pattern' ? 'Pattern' : name === 'export' ? 'Export' : 'Layers';
    if (name === 'layers') {
      moveLegacySection('layersDisclosure', body);
    } else if (name === 'pattern') {
      if (!moveLegacySection('previewDisclosure', body)) body.textContent = 'Repeat preview is unavailable.';
      const extras = document.createElement('div'); extras.className = 'pf-panel-custom';
      extras.append(proxyRange('neighborOpacity','Repeat visibility'), proxyCheckbox('showTileBorder','Show centre tile edge'), proxyCheckbox('snapOn','Smart snapping'), proxyButton('Preview repeat', () => byId('repeatPreviewToggle')?.click(), 'active'));
      body.appendChild(extras);
    } else if (name === 'export') {
      moveLegacySection('exportDisclosure', body);
    } else {
      renderColourPanel(body);
    }
    panel.hidden = false;
    byId('pfLiveShell')?.classList.add('panel-open');
    $$('.pf-dock-button').forEach(button => button.classList.toggle('active', button.dataset.pfPanel === name));
  }

  function renderColourPanel(body){
    const section = document.createElement('div'); section.className = 'pf-colour-panel';
    const colourLabel = document.createElement('label'); colourLabel.className = 'pf-colour-picker'; colourLabel.innerHTML = '<span>Current colour</span>';
    const picker = document.createElement('input'); picker.type = 'color'; picker.value = byId('ink')?.value || '#6f89a8';
    picker.addEventListener('input', () => forwardInput(byId('ink'), picker.value));
    colourLabel.appendChild(picker); section.appendChild(colourLabel);
    const heading = document.createElement('div'); heading.className = 'pf-panel-label'; heading.textContent = 'Palette'; section.appendChild(heading);
    const swatches = document.createElement('div'); swatches.className = 'pf-colour-swatches';
    const legacySwatches = $$('#paletteSwatches .swatch');
    if (legacySwatches.length) legacySwatches.forEach(source => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'pf-colour-swatch'; button.style.background = source.dataset.color || source.style.background; button.title = source.dataset.color || 'Palette colour'; button.addEventListener('click', () => source.click()); swatches.appendChild(button);
    });
    section.appendChild(swatches);
    section.append(proxyButton('Eyedropper', () => clickLegacyTool('eyedropper')), proxyButton('Save palette', () => byId('savePalette')?.click()));
    body.appendChild(section);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildShell, {once:true});
  else buildShell();
})();
