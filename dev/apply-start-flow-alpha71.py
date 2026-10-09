from pathlib import Path

# Patch app/index.html
p=Path('app/index.html')
s=p.read_text()
s=s.replace('''    <div class="status" id="status" role="status" aria-live="polite">Your artwork stays in this browser. Save a project file for a portable backup.</div>''','''    <div class="headerActions">
      <a class="btn headerHome" href="/">Main menu</a>
      <div class="status" id="status" role="status" aria-live="polite">Your artwork stays in this browser. Save a project file for a portable backup.</div>
    </div>''')
anchor='''      <h2 id="projectSetupTitle">Start designing</h2>
      <p id="projectSetupIntro" class="projectSetupIntro">Jump straight into a practice tile, or create a seamless Pattern Project or standalone Doodle Project.</p>'''
replacement='''      <section id="resumePrompt" class="resumePrompt" hidden>
        <p class="brandEyebrow">Saved on this device</p>
        <h2 id="resumePromptTitle">Continue where you left off?</h2>
        <p id="resumePromptDetail" class="projectSetupIntro"></p>
        <div class="resumeActions">
          <button id="continuePrevious" class="btn primary full" type="button">Continue previous project</button>
          <button id="startNewFromResume" class="btn full" type="button">Start new project</button>
          <a class="btn full resumeHome" href="/">Main menu</a>
        </div>
      </section>
      <div id="newProjectSetup">
      <h2 id="projectSetupTitle">Start designing</h2>
      <p id="projectSetupIntro" class="projectSetupIntro">Jump straight into a practice tile, or create a seamless Pattern Project or standalone Doodle Project.</p>'''
if anchor not in s: raise SystemExit('app/index setup anchor missing')
s=s.replace(anchor,replacement,1)
end='''      </section>
    </div>
  </section>'''
rep='''      </section>
      </div>
    </div>
  </section>'''
if end not in s: raise SystemExit('app/index setup end anchor missing')
s=s.replace(end,rep,1)
p.write_text(s)

# Patch editor CSS
p=Path('app/assets/editor.css')
s=p.read_text()
css='''\n.headerActions{display:flex;align-items:flex-end;gap:12px}.headerHome{text-decoration:none;white-space:nowrap}.resumePrompt{text-align:left}.resumeActions{display:grid;gap:9px}.resumeHome{text-align:center;text-decoration:none}.resumePrompt[hidden]{display:none}@media(max-width:760px){header{align-items:flex-start}.headerActions{align-items:flex-end;flex-direction:column}.headerHome{padding:7px 10px;font-size:.78rem}.resumeActions .btn{min-height:48px}}\n'''
if '.resumeActions' not in s: s += css
p.write_text(s)

# Patch editor JS
p=Path('app/js/editor.js')
s=p.read_text()
old='''  async function loadAutosave(){
    try{let json;
      try{const db=await openAutosaveDb();json=await new Promise((resolve,reject)=>{const tx=db.transaction("projects","readonly"),store=tx.objectStore("projects"),req=store.get("current");req.onsuccess=async()=>{
        const current=req.result;if(typeof current==="string"&&current.startsWith("pf-project-")){const get=store.get(current);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);}else resolve(current);
      };req.onerror=()=>reject(req.error);});}
      catch(_){json=localStorage.getItem("patternForgeAutosave");}
      if(!json)return;const data=typeof json==="string"?JSON.parse(json):json;
      await restoreProject(data);$("projectSetupOverlay").hidden=true;setStatus("Your latest autosaved design was reopened from this device.");
    }catch(_){setStatus("The previous autosave could not be reopened. Your other project files are unaffected.");}
  }'''
new='''  let pendingAutosaveData=null;
  function showNewProjectSetup(){
    pendingAutosaveData=null;
    $("resumePrompt").hidden=true;
    $("newProjectSetup").hidden=false;
    $("projectSetupOverlay").hidden=false;
    updateSetupProjectType();
  }
  function showResumePrompt(data){
    pendingAutosaveData=data;
    const project=data?.project||{};
    const type=project.projectType==="doodle"?"Doodle Project":"Pattern Project";
    const title=String(project.title||"Untitled project");
    $("resumePromptDetail").textContent=`${title} · ${type}. Choose whether to continue it or start a new project.`;
    $("newProjectSetup").hidden=true;
    $("resumePrompt").hidden=false;
    $("projectSetupOverlay").hidden=false;
  }
  async function loadAutosave(){
    try{let json;
      try{const db=await openAutosaveDb();json=await new Promise((resolve,reject)=>{const tx=db.transaction("projects","readonly"),store=tx.objectStore("projects"),req=store.get("current");req.onsuccess=async()=>{
        const current=req.result;if(typeof current==="string"&&current.startsWith("pf-project-")){const get=store.get(current);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);}else resolve(current);
      };req.onerror=()=>reject(req.error);});}
      catch(_){json=localStorage.getItem("patternForgeAutosave");}
      if(!json)return;const data=typeof json==="string"?JSON.parse(json):json;
      validateProjectData(data);
      showResumePrompt(data);
      setStatus("A saved project is available on this device.");
    }catch(_){setStatus("The previous autosave could not be reopened. Your other project files are unaffected.");}
  }'''
if old not in s: raise SystemExit('loadAutosave block missing')
s=s.replace(old,new,1)
anchor='''  $("projectMenu").addEventListener("click",showProjectSetup);
  $("startPractice").addEventListener("click",()=>startPracticeMode().catch(err=>setStatus("Could not start practice mode: "+err.message)));'''
replacement='''  $("projectMenu").addEventListener("click",showProjectSetup);
  $("continuePrevious").addEventListener("click",async()=>{
    if(!pendingAutosaveData)return showNewProjectSetup();
    try{const data=pendingAutosaveData;pendingAutosaveData=null;await restoreProject(data);$("projectSetupOverlay").hidden=true;setStatus("Previous project continued from this device.");}
    catch(_){showNewProjectSetup();setStatus("The previous autosave could not be reopened. Start a new project or open a project file instead.");}
  });
  $("startNewFromResume").addEventListener("click",showNewProjectSetup);
  $("startPractice").addEventListener("click",()=>startPracticeMode().catch(err=>setStatus("Could not start practice mode: "+err.message)));'''
if anchor not in s: raise SystemExit('project menu anchor missing')
s=s.replace(anchor,replacement,1)
p.write_text(s)

# Make help wording consistent
p=Path('help/index.html')
s=p.read_text().replace('<a href="/">Home</a>','<a href="/">Main menu</a>')
p.write_text(s)

print('start-flow alpha.7.1 patch applied')
