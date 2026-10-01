(() => {
  const DOODLE_LANDSCAPE_STYLE_ID = 'doodleLandscapeStyle';
  const DOODLE_LANDSCAPE_GATE_ID = 'doodleLandscapeGate';

  function ensureDoodleLandscapeGate(){
    if (!document.getElementById(DOODLE_LANDSCAPE_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = DOODLE_LANDSCAPE_STYLE_ID;
      style.textContent = `
        #${DOODLE_LANDSCAPE_GATE_ID}{display:none;}
        @media (orientation:portrait){
          body[data-workspace="doodle"] #${DOODLE_LANDSCAPE_GATE_ID},
          body.doodle-project #${DOODLE_LANDSCAPE_GATE_ID}{
            position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
            padding:28px;background:#f4f1e9;color:#183d35;text-align:center;
          }
          #${DOODLE_LANDSCAPE_GATE_ID} .doodleLandscapeCard{
            width:min(420px,100%);padding:30px 24px;border:1px solid #d7d2c7;border-radius:22px;background:#fff;
            box-shadow:0 18px 55px rgba(23,61,54,.16);
          }
          #${DOODLE_LANDSCAPE_GATE_ID} .doodleLandscapeIcon{font-size:42px;line-height:1;margin-bottom:12px;}
          #${DOODLE_LANDSCAPE_GATE_ID} h2{margin:0 0 10px;font-size:28px;line-height:1.1;}
          #${DOODLE_LANDSCAPE_GATE_ID} p{margin:0 0 20px;font-size:17px;line-height:1.45;color:#5f665f;}
          #${DOODLE_LANDSCAPE_GATE_ID} a{display:inline-flex;min-height:46px;align-items:center;justify-content:center;padding:0 18px;border:1px solid #cfc9bd;border-radius:13px;background:#fff;color:#173d36;text-decoration:none;font-weight:700;}
        }
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById(DOODLE_LANDSCAPE_GATE_ID)) {
      const gate = document.createElement('section');
      gate.id = DOODLE_LANDSCAPE_GATE_ID;
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      gate.setAttribute('aria-labelledby', 'doodleLandscapeTitle');
      gate.innerHTML = `
        <div class="doodleLandscapeCard">
          <div class="doodleLandscapeIcon" aria-hidden="true">↻</div>
          <h2 id="doodleLandscapeTitle">Rotate to landscape</h2>
          <p>Doodle uses a landscape workspace so there is more room for the canvas and drawing controls.</p>
          <a href="/">Main menu</a>
        </div>
      `;
      document.body.appendChild(gate);
    }
  }

  function applyWorkspaceEntry(){
    ensureDoodleLandscapeGate();
    const params = new URLSearchParams(location.search);
    const workspace = params.get('workspace');
    if (!['pattern','doodle'].includes(workspace)) return;
    document.body.dataset.workspace = workspace;
    const typeInput = document.getElementById('projectTypeInput');
    if (typeInput) {
      typeInput.value = workspace;
      typeInput.dispatchEvent(new Event('change', { bubbles:true }));
      const field = typeInput.closest('.field');
      if (field) field.hidden = true;
    }
    const heading = document.getElementById('projectSetupTitle');
    const intro = document.getElementById('projectSetupIntro');
    if (heading) heading.textContent = workspace === 'pattern' ? 'New Pattern Project' : 'New Doodle';
    if (intro) intro.textContent = workspace === 'pattern'
      ? 'Set up a seamless pattern project, or open one you already started.'
      : 'Set up standalone transparent artwork, or open one you already started.';
    document.title = workspace === 'pattern' ? 'Sapiver Pattern Forge — Pattern' : 'Sapiver Pattern Forge — Doodle';
    const cleanPath = workspace === 'pattern' ? '/app/pattern/' : '/app/doodle/';
    if (location.pathname !== cleanPath) history.replaceState({workspace}, '', cleanPath);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(applyWorkspaceEntry, 0), {once:true});
  else setTimeout(applyWorkspaceEntry, 0);
})();
