(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const gallery = $('#galleryView');
  const editor = $('#editorView');
  const sidePanel = $('#sidePanel');
  const panelTitle = $('#panelTitle');
  const panelBody = $('#panelBody');
  const contextBar = $('#contextBar');
  const modePill = $('#modePill');
  const projectName = $('#projectName');
  const workspaceField = $('#workspaceField');
  const canvasHint = $('#canvasHint');
  const selectionBox = $('#selectionBox');

  const toolState = {
    activeTool: 'select',
    mode: 'pattern',
    repeat: 'Straight',
    panel: 'layers'
  };

  const toolHints = {
    select: 'Select artwork to move, scale or rotate',
    brush: 'Draw directly on the active layer',
    eraser: 'Erase from the active layer only',
    fill: 'Fill a closed shape or selected region',
    image: 'Place and arrange imported artwork',
    shape: 'Draw clean vector-style shapes'
  };

  const contextTemplates = {
    select: `
      <div class="context-group"><span class="context-label">Transform</span><button class="control-chip active">Move</button><button class="control-chip">Scale</button><button class="control-chip">Rotate</button></div>
      <div class="context-group"><button class="control-chip">Flip H</button><button class="control-chip">Flip V</button><button class="control-chip">Duplicate</button></div>
      <div class="context-group"><button class="control-chip">Snap</button><button class="control-chip">Delete</button></div>`,
    brush: `
      <div class="context-group"><span class="context-label">Brush</span><button class="control-chip active">Studio Ink</button></div>
      <div class="context-group"><div class="slider-control">Size <span class="fake-slider"></span> 24</div><div class="slider-control">Opacity <span class="fake-slider"></span> 100%</div></div>
      <div class="context-group"><button class="control-chip">Smoothing</button><button class="control-chip">Brush library</button></div>`,
    eraser: `
      <div class="context-group"><span class="context-label">Eraser</span><button class="control-chip active">Soft edge</button></div>
      <div class="context-group"><div class="slider-control">Size <span class="fake-slider"></span> 36</div><div class="slider-control">Opacity <span class="fake-slider"></span> 100%</div></div>`,
    fill: `
      <div class="context-group"><span class="context-label">Fill</span><button class="control-chip active">Solid</button><button class="control-chip">Gradient</button></div>
      <div class="context-group"><button class="control-chip">Current layer</button><button class="control-chip">All visible</button></div>`,
    image: `
      <div class="context-group"><span class="context-label">Image</span><button class="control-chip active">Place</button><button class="control-chip">Replace</button><button class="control-chip">Duplicate</button></div>
      <div class="context-group"><div class="slider-control">Opacity <span class="fake-slider"></span> 100%</div><button class="control-chip">Arrange</button></div>`,
    shape: `
      <div class="context-group"><span class="context-label">Shape</span><button class="control-chip active">Ellipse</button><button class="control-chip">Rectangle</button><button class="control-chip">Line</button></div>
      <div class="context-group"><button class="control-chip">Fill</button><button class="control-chip active">Outline</button><div class="slider-control">Width <span class="fake-slider"></span> 8</div></div>`
  };

  function layersPanel() {
    return `
      <div class="panel-section">
        <div class="panel-label">Artwork layers</div>
        <div class="layer-row active"><div class="layer-thumb"></div><div><strong>Drawing</strong><small>12 marks</small></div><button class="layer-eye">●</button></div>
        <div class="layer-row"><div class="layer-thumb"></div><div><strong>Motifs</strong><small>4 objects</small></div><button class="layer-eye">●</button></div>
        <button class="secondary-button" style="width:100%;margin-top:7px">+ Add layer</button>
      </div>
      <div class="panel-section">
        <div class="panel-label">Selected layer</div>
        <div class="slider-control">Opacity <span class="fake-slider"></span> 100%</div>
      </div>`;
  }

  function colourPanel() {
    return `
      <div class="panel-section"><div class="colour-large"></div><div class="panel-label">Recent colours</div><div class="swatch-row">
        <button class="swatch" style="background:#607b9b"></button><button class="swatch" style="background:#91a5bb"></button><button class="swatch" style="background:#d5dbe2"></button><button class="swatch" style="background:#b89b89"></button><button class="swatch" style="background:#343b45"></button>
      </div></div>
      <div class="panel-section"><button class="secondary-button" style="width:100%">Open palettes</button></div>`;
  }

  function patternPanel() {
    return `
      <div class="panel-section"><div class="panel-label">Repeat</div><div class="repeat-preview-mini"></div></div>
      <div class="panel-section"><button class="control-chip active" style="width:100%;margin-bottom:7px">${toolState.repeat}</button><button class="secondary-button" style="width:100%;margin-bottom:7px">Full repeat preview</button><button class="secondary-button" style="width:100%">Seam check</button></div>`;
  }

  function renderPanel(name = toolState.panel) {
    toolState.panel = name;
    panelTitle.textContent = name === 'colour' ? 'Colour' : name === 'pattern' ? 'Pattern' : 'Layers';
    panelBody.innerHTML = name === 'colour' ? colourPanel() : name === 'pattern' ? patternPanel() : layersPanel();
    sidePanel.hidden = false;
    $$('.dock-button').forEach(btn => btn.classList.toggle('active', btn.dataset.panel === name));
  }

  function setTool(tool) {
    toolState.activeTool = tool;
    $$('.tool-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
    contextBar.innerHTML = contextTemplates[tool];
    canvasHint.textContent = toolHints[tool];
    selectionBox.hidden = tool !== 'select';
  }

  function showEditor(mode = 'pattern', name = mode === 'pattern' ? 'Untitled Pattern' : 'Untitled Doodle') {
    toolState.mode = mode;
    document.body.classList.toggle('doodle-mode', mode === 'doodle');
    gallery.hidden = true;
    editor.hidden = false;
    modePill.textContent = mode === 'pattern' ? 'Pattern' : 'Doodle';
    projectName.textContent = name;
    workspaceField.classList.toggle('pattern-workspace', mode === 'pattern');
    workspaceField.classList.toggle('doodle-workspace', mode === 'doodle');
    renderPanel('layers');
    setTool('select');
  }

  function showGallery() {
    editor.hidden = true;
    gallery.hidden = false;
    document.body.classList.remove('doodle-mode');
  }

  $('[data-action="new-pattern"]').addEventListener('click', () => $('#newPatternModal').hidden = false);
  $('[data-action="new-doodle"]').addEventListener('click', () => showEditor('doodle', 'Untitled Doodle'));
  $('[data-action="open-project"]').addEventListener('click', () => showEditor('pattern', 'Opened Project'));
  $$('.project-card').forEach(card => card.addEventListener('click', () => showEditor(card.dataset.open, $('.project-card-meta strong', card).textContent)));
  $('#galleryButton').addEventListener('click', showGallery);
  $('#exportButton').addEventListener('click', () => $('#exportModal').hidden = false);
  $('#previewButton').addEventListener('click', () => renderPanel(toolState.mode === 'pattern' ? 'pattern' : 'layers'));
  $('#closePanel').addEventListener('click', () => sidePanel.hidden = true);
  $$('.tool-button').forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
  $$('.dock-button').forEach(btn => btn.addEventListener('click', () => renderPanel(btn.dataset.panel)));
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal-backdrop').hidden = true));
  $$('.repeat-choice').forEach(btn => btn.addEventListener('click', () => {
    $$('.repeat-choice').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    toolState.repeat = btn.dataset.repeat;
  }));
  $('#createPatternButton').addEventListener('click', () => {
    $('#newPatternModal').hidden = true;
    showEditor('pattern', `Untitled ${toolState.repeat}`);
  });

  renderPanel('layers');
  setTool('select');
})();
