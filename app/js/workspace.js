(() => {
  const DOODLE_LANDSCAPE_STYLE_ID='doodleLandscapeStyle';
  const DOODLE_LANDSCAPE_GATE_ID='doodleLandscapeGate';

  function ensureWorkspaceStyles(){
    if(document.getElementById(DOODLE_LANDSCAPE_STYLE_ID))return;
    const style=document.createElement('style');style.id=DOODLE_LANDSCAPE_STYLE_ID;
    style.textContent=`
      .ux2-dock[hidden]{display:none!important}
      .workspaceRepeatCards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0 4px}
      .workspaceRepeatCard{appearance:none;border:1px solid #cfd7df;background:#fff;border-radius:14px;padding:14px 11px;text-align:left;color:#263442;cursor:pointer;min-height:92px;transition:border-color .15s,background .15s,box-shadow .15s}
      .workspaceRepeatCard:hover{border-color:#aab9c9;background:#f8fafc}.workspaceRepeatCard.active{border-color:#92a8bd;background:#e9eff6;box-shadow:inset 0 0 0 1px #b7c6d5}
      .workspaceRepeatCard strong{display:block;font-size:14px;margin:0 0 4px}.workspaceRepeatCard span{display:block;font-size:11px;line-height:1.35;color:#687483}
      .workspaceRepeatDiagram{display:grid!important;width:34px;height:28px;margin:0 0 9px!important;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:3px}
      .workspaceRepeatDiagram i{display:block;border:1.5px solid #6f89a8;border-radius:3px;background:#edf2f7}
      .workspaceRepeatCard[data-repeat="half-drop"] .workspaceRepeatDiagram i:nth-child(2),.workspaceRepeatCard[data-repeat="half-drop"] .workspaceRepeatDiagram i:nth-child(4){transform:translateY(5px)}
      .workspaceRepeatCard[data-repeat="brick"] .workspaceRepeatDiagram i:nth-child(3),.workspaceRepeatCard[data-repeat="brick"] .workspaceRepeatDiagram i:nth-child(4){transform:translateX(5px)}
      .workspaceRepeatNative{position:absolute!important;inline-size:1px!important;block-size:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}
      .workspaceStartNote{margin:10px 0 0;color:#687483;font-size:12px;line-height:1.45}
      #${DOODLE_LANDSCAPE_GATE_ID}{display:none}
      @media (orientation:portrait){
        body[data-workspace="doodle"] #${DOODLE_LANDSCAPE_GATE_ID},body.doodle-project #${DOODLE_LANDSCAPE_GATE_ID}{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:28px;background:#eef1f4;color:#17202b;text-align:center}
        #${DOODLE_LANDSCAPE_GATE_ID} .doodleLandscapeCard{width:min(420px,100%);padding:30px 24px;border:1px solid #d7dde4;border-radius:22px;background:#fff;box-shadow:0 18px 55px rgba(38,51,68,.16)}
        #${DOODLE_LANDSCAPE_GATE_ID} .doodleLandscapeIcon{width:54px;height:54px;display:grid;place-items:center;margin:0 auto 14px;border-radius:16px;background:#e9eff6;color:#526d8f;font-size:32px;line-height:1}
        #${DOODLE_LANDSCAPE_GATE_ID} h2{margin:0 0 10px;font-size:28px;line-height:1.1}
        #${DOODLE_LANDSCAPE_GATE_ID} p{margin:0 0 20px;font-size:17px;line-height:1.45;color:#687483}
        #${DOODLE_LANDSCAPE_GATE_ID} a{display:inline-flex;min-height:46px;align-items:center;justify-content:center;padding:0 18px;border:1px solid #d1d8e0;border-radius:13px;background:#fff;color:#526d8f;text-decoration:none;font-weight:750}
      }
      @media(max-width:560px){.workspaceRepeatCards{grid-template-columns:1fr}.workspaceRepeatCard{min-height:72px;display:grid;grid-template-columns:44px 1fr;column-gap:9px;align-items:center}.workspaceRepeatDiagram{grid-row:1/3;margin:0!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureDoodleLandscapeGate(){
    ensureWorkspaceStyles();
    if(document.getElementById(DOODLE_LANDSCAPE_GATE_ID))return;
    const gate=document.createElement('section');gate.id=DOODLE_LANDSCAPE_GATE_ID;gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','doodleLandscapeTitle');
    gate.innerHTML=`<div class="doodleLandscapeCard"><div class="doodleLandscapeIcon" aria-hidden="true">↻</div><h2 id="doodleLandscapeTitle">Rotate to landscape</h2><p>Doodle uses a landscape canvas so the drawing tools stay visible without covering your artwork.</p><a href="/">Project home</a></div>`;
    document.body.appendChild(gate);
  }

  function hideFieldFor(id){const el=document.getElementById(id);const field=el?.closest('.field');if(field)field.hidden=true}
  function resolveWorkspace(){const params=new URLSearchParams(location.search),fromQuery=params.get('workspace');if(['pattern','doodle'].includes(fromQuery))return fromQuery;if(location.pathname.includes('/app/doodle/'))return'doodle';if(location.pathname.includes('/app/pattern/'))return'pattern';return null}

  function buildRepeatCards(){
    const select=document.getElementById('projectRepeatStyle'),host=document.getElementById('projectRepeatSetup');
    if(!select||!host||document.getElementById('workspaceRepeatCards'))return;
    select.closest('.field')?.classList.add('workspaceRepeatNative');
    const note=host.querySelector('.repeatLockNote');if(note)note.hidden=true;
    const cards=document.createElement('div');cards.id='workspaceRepeatCards';cards.className='workspaceRepeatCards';cards.setAttribute('role','radiogroup');cards.setAttribute('aria-label','Repeat style');
    const choices=[['straight','Straight','Square repeat grid'],['half-drop','Half-drop','Alternate rows offset sideways'],['brick','Brick','Alternate columns offset vertically']];
    for(const [value,label,help] of choices){
      const button=document.createElement('button');button.type='button';button.className='workspaceRepeatCard';button.dataset.repeat=value;button.setAttribute('role','radio');
      button.innerHTML=`<span class="workspaceRepeatDiagram" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong>${label}</strong><span>${help}</span>`;
      button.addEventListener('click',()=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));syncRepeatCards()});cards.appendChild(button);
    }
    host.prepend(cards);
    const info=document.createElement('p');info.className='workspaceStartNote';info.textContent='Repeat structure is fixed for this project. Name, customer, theme and variation can be added later.';host.appendChild(info);
    select.addEventListener('change',syncRepeatCards);syncRepeatCards();
  }
  function syncRepeatCards(){
    const value=document.getElementById('projectRepeatStyle')?.value||'straight';
    document.querySelectorAll('.workspaceRepeatCard').forEach(button=>{const active=button.dataset.repeat===value;button.classList.toggle('active',active);button.setAttribute('aria-checked',String(active))});
  }

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
      if(heading)heading.textContent='New Pattern';if(intro)intro.textContent='Choose how the artwork repeats, then start designing.';if(repeat)repeat.hidden=false;if(create)create.textContent='Create Pattern';document.title='Sapiver Pattern Forge — Pattern';buildRepeatCards();
    }else{
      if(heading)heading.textContent='New Doodle';if(intro)intro.textContent='Opening a blank transparent drawing canvas…';if(repeat)repeat.hidden=true;if(create)create.textContent='Create Doodle';document.title='Sapiver Pattern Forge — Doodle';
    }
    const cleanPath=workspace==='pattern'?'/app/pattern/':'/app/doodle/';if(location.pathname!==cleanPath||location.search)history.replaceState({workspace},'',cleanPath);
    if(workspace==='doodle')setTimeout(()=>{const overlay=document.getElementById('projectSetupOverlay'),newSetup=document.getElementById('newProjectSetup'),resume=document.getElementById('resumePrompt');if(overlay&&!overlay.hidden&&newSetup&&!newSetup.hidden&&(!resume||resume.hidden))document.getElementById('createProject')?.click()},40);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(applyWorkspaceEntry,0),{once:true});else setTimeout(applyWorkspaceEntry,0);
})();
