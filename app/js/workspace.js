(() => {
  const DOODLE_LANDSCAPE_STYLE_ID='doodleLandscapeStyle';
  const DOODLE_LANDSCAPE_GATE_ID='doodleLandscapeGate';

  function ensureDoodleLandscapeGate(){
    if(!document.getElementById(DOODLE_LANDSCAPE_STYLE_ID)){
      const style=document.createElement('style');style.id=DOODLE_LANDSCAPE_STYLE_ID;
      style.textContent=`
        #${DOODLE_LANDSCAPE_GATE_ID}{display:none}
        @media (orientation:portrait){
          body[data-workspace="doodle"] #${DOODLE_LANDSCAPE_GATE_ID},body.doodle-project #${DOODLE_LANDSCAPE_GATE_ID}{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:28px;background:#eef1f4;color:#17202b;text-align:center}
          #${DOODLE_LANDSCAPE_GATE_ID} .doodleLandscapeCard{width:min(420px,100%);padding:30px 24px;border:1px solid #d7dde4;border-radius:22px;background:#fff;box-shadow:0 18px 55px rgba(38,51,68,.16)}
          #${DOODLE_LANDSCAPE_GATE_ID} .doodleLandscapeIcon{width:54px;height:54px;display:grid;place-items:center;margin:0 auto 14px;border-radius:16px;background:#e9eff6;color:#526d8f;font-size:32px;line-height:1}
          #${DOODLE_LANDSCAPE_GATE_ID} h2{margin:0 0 10px;font-size:28px;line-height:1.1}
          #${DOODLE_LANDSCAPE_GATE_ID} p{margin:0 0 20px;font-size:17px;line-height:1.45;color:#687483}
          #${DOODLE_LANDSCAPE_GATE_ID} a{display:inline-flex;min-height:46px;align-items:center;justify-content:center;padding:0 18px;border:1px solid #d1d8e0;border-radius:13px;background:#fff;color:#526d8f;text-decoration:none;font-weight:750}
        }`;
      document.head.appendChild(style);
    }
    if(!document.getElementById(DOODLE_LANDSCAPE_GATE_ID)){
      const gate=document.createElement('section');gate.id=DOODLE_LANDSCAPE_GATE_ID;gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','doodleLandscapeTitle');
      gate.innerHTML=`<div class="doodleLandscapeCard"><div class="doodleLandscapeIcon" aria-hidden="true">↻</div><h2 id="doodleLandscapeTitle">Rotate to landscape</h2><p>Doodle uses a landscape canvas so the drawing tools stay visible without covering your artwork.</p><a href="/">Project home</a></div>`;
      document.body.appendChild(gate);
    }
  }

  function hideFieldFor(id){const el=document.getElementById(id);const field=el?.closest('.field');if(field)field.hidden=true}
  function resolveWorkspace(){const params=new URLSearchParams(location.search),fromQuery=params.get('workspace');if(['pattern','doodle'].includes(fromQuery))return fromQuery;if(location.pathname.includes('/app/doodle/'))return'doodle';if(location.pathname.includes('/app/pattern/'))return'pattern';return null}

  function applyWorkspaceEntry(){
    ensureDoodleLandscapeGate();
    const workspace=resolveWorkspace();if(!workspace)return;
    document.body.dataset.workspace=workspace;
    const typeInput=document.getElementById('projectTypeInput');
    if(typeInput){typeInput.value=workspace;typeInput.dispatchEvent(new Event('change',{bubbles:true}));hideFieldFor('projectTypeInput')}
    const title=document.getElementById('projectTitleInput');if(title){title.value=workspace==='pattern'?'Untitled Pattern':'Untitled Doodle';hideFieldFor('projectTitleInput')}
    ['projectCustomerInput','projectThemeInput','projectVariationInput'].forEach(hideFieldFor);
    const practice=document.getElementById('startPractice');if(practice)practice.hidden=true;
    const divider=document.querySelector('.setupDivider');if(divider)divider.hidden=true;
    const heading=document.getElementById('projectSetupTitle'),intro=document.getElementById('projectSetupIntro'),repeat=document.getElementById('projectRepeatSetup'),create=document.getElementById('createProject');
    if(workspace==='pattern'){
      if(heading)heading.textContent='New Pattern';if(intro)intro.textContent='Choose the repeat structure. You can name the project and add customer details later.';if(repeat)repeat.hidden=false;if(create)create.textContent='Create Pattern';document.title='Sapiver Pattern Forge — Pattern';
    }else{
      if(heading)heading.textContent='New Doodle';if(intro)intro.textContent='Opening a blank transparent drawing canvas…';if(repeat)repeat.hidden=true;if(create)create.textContent='Create Doodle';document.title='Sapiver Pattern Forge — Doodle';
    }
    const cleanPath=workspace==='pattern'?'/app/pattern/':'/app/doodle/';if(location.pathname!==cleanPath||location.search)history.replaceState({workspace},'',cleanPath);
    if(workspace==='doodle')setTimeout(()=>{const overlay=document.getElementById('projectSetupOverlay'),newSetup=document.getElementById('newProjectSetup'),resume=document.getElementById('resumePrompt');if(overlay&&!overlay.hidden&&newSetup&&!newSetup.hidden&&(!resume||resume.hidden))document.getElementById('createProject')?.click()},40);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(applyWorkspaceEntry,0),{once:true});else setTimeout(applyWorkspaceEntry,0);
})();
