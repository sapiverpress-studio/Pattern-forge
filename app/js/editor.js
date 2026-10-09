(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("editorCanvas");
  const ctx = canvas.getContext("2d");
  const stageWrap = $("stageWrap");
  const focusControls = $("focusControls");
  const focusRail = $("focusRail");
  const focusToggle = $("focusToggle");
  const toolsToggle = $("toolsToggle");
  const toolsClose = $("toolsClose");
  const selectedPanelNode = $("selectedPanel");
  const qualityPanelNode = $("quality");
  const controlsHome = document.createComment("drawing tools home");
  const selectedPanelHome = document.createComment("selected image panel home");
  const qualityPanelHome = document.createComment("quality panel home");
  let focusZoomBefore = null;
  focusControls.parentNode.insertBefore(controlsHome, focusControls);
  selectedPanelNode.parentNode.insertBefore(selectedPanelHome, selectedPanelNode);
  qualityPanelNode.parentNode.insertBefore(qualityPanelHome, qualityPanelNode);

  function updateToolHighlight(){
    document.documentElement.style.setProperty("--tool-active-color","#173d36");
    document.documentElement.style.setProperty("--tool-active-text","#ffffff");
  }

  function leaveFocus(exitBrowserFullscreen=true){
    if(!stageWrap.classList.contains("focus-mode"))return;
    controlsHome.parentNode.insertBefore(focusControls, controlsHome.nextSibling);
    selectedPanelHome.parentNode.insertBefore(selectedPanelNode, selectedPanelHome.nextSibling);
    qualityPanelHome.parentNode.insertBefore(qualityPanelNode, qualityPanelHome.nextSibling);
    focusRail.hidden = true;
    toolsToggle.setAttribute("aria-expanded","false");
    stageWrap.classList.remove("focus-mode","show-recents","show-info");
    $("recentToggle").setAttribute("aria-expanded","false");
    $("infoToggle").setAttribute("aria-expanded","false");
    document.body.classList.remove("pattern-fullscreen");
    state.focusMode = false;
    state.focusRepeatPreview=false;$("repeatPreviewToggle").setAttribute("aria-pressed","false");$("repeatPreviewToggle").textContent="Preview repeat";
    focusToggle.textContent = "Full screen";
    focusToggle.setAttribute("aria-label","Open full screen workspace");
    if(focusZoomBefore!==null){setZoom(focusZoomBefore);focusZoomBefore=null;}
    if(exitBrowserFullscreen && document.fullscreenElement && document.exitFullscreen){
      document.exitFullscreen().catch(()=>{});
    }
  }
  const landscapeMode=window.matchMedia("(orientation: landscape)");
  function updateFullscreenAvailability(){
    focusToggle.hidden=!landscapeMode.matches;
    focusToggle.title=landscapeMode.matches?"Open the landscape design workspace":"Rotate your device to landscape to use full screen";
    if(!landscapeMode.matches&&stageWrap.classList.contains("focus-mode"))leaveFocus();
  }
  landscapeMode.addEventListener?.("change",updateFullscreenAvailability);
  updateFullscreenAvailability();
  focusToggle.addEventListener("click",async()=>{
    if(!landscapeMode.matches){setStatus("Full screen is designed for landscape orientation. Rotate your device and try again.");return;}
    if(stageWrap.classList.contains("focus-mode")){leaveFocus();return;}
    focusRail.appendChild(focusControls);
    $("focusSelectedSlot").appendChild(selectedPanelNode);
    $("focusQualitySlot").appendChild(qualityPanelNode);
    rebuildFocusRecent();
    updatePrintEligibility();
    focusRail.hidden = true;
    toolsToggle.setAttribute("aria-expanded","false");
    stageWrap.classList.remove("show-recents","show-info");
    $("recentToggle").setAttribute("aria-expanded","false");
    $("infoToggle").setAttribute("aria-expanded","false");
    stageWrap.classList.add("focus-mode");
    document.body.classList.add("pattern-fullscreen");
    state.focusMode = true;
    state.focusRepeatPreview=false;$("repeatPreviewToggle").setAttribute("aria-pressed","false");$("repeatPreviewToggle").textContent="Preview repeat";
    focusZoomBefore = state.zoom;
    setZoom(2.7);
    focusToggle.textContent = "Exit full screen";
    focusToggle.setAttribute("aria-label","Exit full screen workspace");
    const fullScreenTarget = document.documentElement || stageWrap;
    if(fullScreenTarget.requestFullscreen){
      try{await fullScreenTarget.requestFullscreen();}catch(_){/* Keep the expanded in-page workspace. */}
    }
  });
  toolsToggle.addEventListener("click",()=>{
    const opening=focusRail.hidden;closeFocusDrawers();
    if(opening){focusRail.hidden=false;toolsToggle.setAttribute("aria-expanded","true");}
  });
  toolsClose.addEventListener("click",()=>{
    focusRail.hidden = true;
    toolsToggle.setAttribute("aria-expanded","false");
  });
  function closeFocusDrawers(){
    focusRail.hidden=true;toolsToggle.setAttribute("aria-expanded","false");
    stageWrap.classList.remove("show-recents","show-info");
    $("recentToggle").setAttribute("aria-expanded","false");$("infoToggle").setAttribute("aria-expanded","false");
  }
  function toggleFocusSidePanel(panel){
    const alreadyOpen=stageWrap.classList.contains(panel==="recent"?"show-recents":"show-info");
    closeFocusDrawers();
    if(!alreadyOpen){stageWrap.classList.add(panel==="recent"?"show-recents":"show-info");$(panel==="recent"?"recentToggle":"infoToggle").setAttribute("aria-expanded","true");}
  }
  $("recentToggle").addEventListener("click",()=>toggleFocusSidePanel("recent"));
  $("infoToggle").addEventListener("click",()=>toggleFocusSidePanel("info"));
  const helpDialog=$("helpDialog");
  $("helpOpen").addEventListener("click",()=>{if(!helpDialog.open)helpDialog.showModal();});
  $("focusAddImage").addEventListener("click",()=>$ ("files").click());
  document.addEventListener("fullscreenchange",()=>{
    if(!document.fullscreenElement && stageWrap.classList.contains("focus-mode"))leaveFocus(false);
  });
  const TILE = 900;
  function projectType(){return state.project?.projectType==="doodle"?"doodle":"pattern";}
  function isDoodleProject(){return projectType()==="doodle";}
  function projectRepeatStyle(){if(isDoodleProject())return "straight";return ["half-drop","brick"].includes(state.project?.repeatStyle)?state.project.repeatStyle:"straight";}
  function repeatBasis(unitW=TILE,unitH=TILE,style=projectRepeatStyle()){
    if(style==="half-drop")return [{x:unitW,y:0},{x:unitW/2,y:unitH}];
    if(style==="brick")return [{x:unitW,y:unitH/2},{x:0,y:unitH}];
    return [{x:unitW,y:0},{x:0,y:unitH}];
  }
  function exportMultipliers(style=projectRepeatStyle()){
    return style==="half-drop"?{x:1,y:2}:style==="brick"?{x:2,y:1}:{x:1,y:1};
  }
  const BASE_LAYER_IDS = Object.freeze({motifs:"layer-motifs",drawing:"layer-drawing"});
  function defaultLayers(){
    return [
      {id:BASE_LAYER_IDS.motifs,name:"Motifs",visible:true,opacity:1,locked:false,alphaLock:false,export:true,clipToBelow:false},
      {id:BASE_LAYER_IDS.drawing,name:"Drawing",visible:true,opacity:1,locked:false,alphaLock:false,export:true,clipToBelow:false}
    ];
  }
  function normaliseLayers(rawLayers){
    if(!Array.isArray(rawLayers)||!rawLayers.length)return defaultLayers();
    const seen=new Set(),layers=[];
    for(const raw of rawLayers){
      if(!raw||typeof raw!=="object")continue;
      const id=String(raw.id||"").trim();if(!id||seen.has(id))continue;seen.add(id);
      layers.push({id,name:String(raw.name||"Layer").slice(0,80),visible:raw.visible!==false,opacity:clamp(Number.isFinite(Number(raw.opacity))?Number(raw.opacity):1,0,1),locked:!!raw.locked,alphaLock:!!raw.alphaLock,export:raw.export!==false,clipToBelow:!!raw.clipToBelow});
    }
    if(layers.length)layers[0].clipToBelow=false;
    return layers.length?layers:defaultLayers();
  }
  function layerById(id){return state.layers.find(layer=>layer.id===id)||null;}
  function layerForArtwork(artwork,fallbackId){return layerById(artwork?.layerId)||layerById(fallbackId)||state.layers[0]||null;}
  function layerIsRenderable(layer,forExport=false){return !!layer&&layer.visible!==false&&(!forExport||layer.export!==false)&&Number(layer.opacity)>0;}
  function resetLayerState(){state.layers=defaultLayers();state.activeLayerId=BASE_LAYER_IDS.drawing;}

  const state = {
    project: null,
    assets: [],
    items: [],
    marks: [],
    layers: defaultLayers(),
    activeLayerId: BASE_LAYER_IDS.drawing,
    selectedId: null,
    selectedIds: [],
    selectionAddMode: false,
    nextId: 1,
    dragging: false,
    resizeState: null,
    transformState: null,
    dragOffset: {x:0,y:0},
    snapGuides: {x:null,y:null},
    renderQueued: false,
    interactionActive: false,
    interactionKind: null,
    interactionTile: null,
    tool: "select",
    previousTool: "select",
    zoom: 1,
    panX: 0, panY: 0,
    pointers: new Map(),
    gesture: null,
    activeMark: null,
    dragStart: null,
    past: [], future: [],
    recentAssetIds:[], colorPalette:["#2c5f54","#d66a4d","#e8bc52","#20242b"],
    savedPalettes:[],variations:[],focusMode:false,focusRepeatPreview:false,
    templateGuide:null,
    pendingPreview: false, pendingSelected: false
  };

  function normaliseTemplateGuide(raw){
    if(!raw||typeof raw!=="object")return null;
    const count=Number(raw.count),round=Number(raw.round),choice=Number(raw.choice);
    if(!Number.isInteger(count)||count<1||count>30||!Number.isInteger(round)||round<0||round>9999||!Number.isInteger(choice)||choice<0||choice>2||!Array.isArray(raw.slots)||raw.slots.length!==count)return null;
    const slots=[];
    for(let i=0;i<raw.slots.length;i++){
      const slot=raw.slots[i],x=Number(slot?.x),y=Number(slot?.y),scale=Number(slot?.scale),rotation=Number(slot?.rotation||0);
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>TILE||y<0||y>TILE||!Number.isFinite(scale)||scale<.04||scale>.45||!Number.isFinite(rotation)||Math.abs(rotation)>Math.PI*2)return null;
      slots.push({id:i+1,x,y,scale,rotation,role:slot?.role==="hero"?"hero":"filler"});
    }
    return {version:1,count,round,choice,key:String(raw.key||["balanced","flowing","feature"][choice]||"balanced").slice(0,30),name:String(raw.name||"Layout").slice(0,60),visible:raw.visible!==false,slots};
  }

  function newLayerId(){return "layer-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}
  function activeLayer(){return layerById(state.activeLayerId)||state.layers[state.layers.length-1]||null;}
  function motifTargetLayerId(){return layerById(BASE_LAYER_IDS.motifs)?.id||activeLayer()?.id||state.layers[0]?.id||null;}
  function layerArtworkCount(id){return state.items.filter(item=>item.layerId===id).length+state.marks.filter(mark=>mark.layerId===id&&mark.type!=="eraser").length;}
  function rebuildLayerUI(){
    const list=$("layerList");if(!list)return;
    if(!layerById(state.activeLayerId)&&state.layers.length)state.activeLayerId=state.layers[state.layers.length-1].id;
    list.innerHTML="";
    [...state.layers].reverse().forEach(layer=>{
      const button=document.createElement("button");button.type="button";button.className="layerRow"+(layer.id===state.activeLayerId?" active":"");
      const name=document.createElement("span");name.className="layerRowName";name.textContent=layer.name;
      const flags=[];if(layer.visible===false)flags.push("hidden");if(layer.locked)flags.push("locked");if(layer.alphaLock)flags.push("alpha locked");if(layer.export===false)flags.push("no export");if(layer.clipToBelow)flags.push("clipped");
      const meta=document.createElement("span");meta.className="layerRowMeta";meta.textContent=`${layerArtworkCount(layer.id)} item${layerArtworkCount(layer.id)===1?"":"s"}${flags.length?" · "+flags.join(" · "):""}`;
      button.append(name,meta);
      button.addEventListener("click",()=>{state.activeLayerId=layer.id;rebuildLayerUI();scheduleAutosave();setStatus(`“${layer.name}” is the active layer.`);});
      list.appendChild(button);
    });
    const layer=activeLayer(),index=layer?state.layers.indexOf(layer):-1;
    const controls=["layerName","layerOpacity","layerVisible","layerLocked","layerAlphaLock","layerExport","layerClipToBelow","layerDuplicate","layerDelete","layerUp","layerDown"];
    controls.forEach(id=>$(id).disabled=!layer);
    if(!layer)return;
    $("layerName").value=layer.name;$("layerOpacity").value=Math.round(layer.opacity*100);$("layerOpacityValue").textContent=Math.round(layer.opacity*100)+"%";
    $("layerVisible").checked=layer.visible!==false;$("layerLocked").checked=!!layer.locked;$("layerAlphaLock").checked=!!layer.alphaLock;$("layerExport").checked=layer.export!==false;$("layerClipToBelow").checked=!!layer.clipToBelow;$("layerClipToBelow").disabled=index<=0;
    $("layerDelete").disabled=state.layers.length<=1;$("layerUp").disabled=index>=state.layers.length-1;$("layerDown").disabled=index<=0;
    $("layerSummary").textContent=`${layerArtworkCount(layer.id)} artwork item${layerArtworkCount(layer.id)===1?"":"s"}. Layers at the top are rendered in front.`;
  }
  function nextLayerName(){
    let maxNumber=0;
    for(const layer of state.layers){
      const match=/^Layer\s+(\d+)$/i.exec(String(layer.name||"").trim());
      if(match)maxNumber=Math.max(maxNumber,Number(match[1])||0);
    }
    return `Layer ${Math.max(state.layers.length,maxNumber)+1}`;
  }
  function addLayer(){
    saveHistory();const layer={id:newLayerId(),name:nextLayerName(),visible:true,opacity:1,locked:false,alphaLock:false,export:true,clipToBelow:false};
    state.layers.push(layer);state.activeLayerId=layer.id;renderAll();setStatus(`Added “${layer.name}”.`);
  }
  function duplicateActiveLayer(){
    const source=activeLayer();if(!source)return;saveHistory();
    const layer={...source,id:newLayerId(),name:(source.name+" copy").slice(0,80)};const index=state.layers.indexOf(source);state.layers.splice(index+1,0,layer);
    const itemCopies=state.items.filter(item=>item.layerId===source.id).map(item=>({...item,id:state.nextId++,layerId:layer.id}));
    const markCopies=state.marks.filter(mark=>mark.layerId===source.id).map(mark=>({...JSON.parse(JSON.stringify(mark)),id:state.nextId++,layerId:layer.id}));
    state.items.push(...itemCopies);state.marks.push(...markCopies);state.activeLayerId=layer.id;state.selectedId=null;renderAll();setStatus(`Duplicated “${source.name}”.`);
  }
  function deleteActiveLayer(){
    const layer=activeLayer();if(!layer||state.layers.length<=1)return;const count=layerArtworkCount(layer.id);
    if(count&&typeof confirm==="function"&&!confirm(`Delete “${layer.name}” and its ${count} artwork item${count===1?"":"s"}?`))return;
    saveHistory();const index=state.layers.indexOf(layer);state.items=state.items.filter(item=>item.layerId!==layer.id);state.marks=state.marks.filter(mark=>mark.layerId!==layer.id);state.layers.splice(index,1);
    state.activeLayerId=state.layers[Math.min(index,state.layers.length-1)].id;state.selectedId=null;renderAll();setStatus(`Deleted “${layer.name}”.`);
  }
  function moveActiveLayer(direction){
    const layer=activeLayer();if(!layer)return;const index=state.layers.indexOf(layer),next=index+direction;if(next<0||next>=state.layers.length)return;
    saveHistory();[state.layers[index],state.layers[next]]=[state.layers[next],state.layers[index]];renderAll();setStatus(direction>0?"Layer moved up.":"Layer moved down.");
  }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function setInkColour(hex){
    if(!/^#[0-9a-f]{6}$/i.test(hex||""))return;
    $("ink").value=$("inkMobile").value=hex;updateToolHighlight();scheduleAutosave();
  }
  function rebuildPaletteUI(){
    const holder=$("paletteSwatches");holder.innerHTML="";
    state.colorPalette.forEach((hex,index)=>{
      const b=document.createElement("button");b.type="button";b.className="swatch";b.dataset.color=hex;b.style.background=hex;b.title=`Use ${hex}`;b.setAttribute("aria-label",`Use palette colour ${index+1}: ${hex}`);
      b.addEventListener("click",()=>setInkColour(hex));holder.appendChild(b);
    });
    const select=$("savedPaletteSelect"),saved=state.savedPalettes||[];
    select.innerHTML='<option value="default">Forest &amp; clay</option>'+saved.map((p,i)=>`<option value="saved-${i}">${escapeHtml(p.name)}</option>`).join("");
  }
  function loadSavedPalettes(){
    try{const parsed=JSON.parse(localStorage.getItem("patternForgePalettes")||"[]");if(Array.isArray(parsed))state.savedPalettes=parsed.filter(p=>p&&typeof p.name==="string"&&Array.isArray(p.colors));}catch(_){state.savedPalettes=[];}
  }
  function pickCanvasColour(world){
    const x=clamp(Math.floor(world.x),0,TILE-1),y=clamp(Math.floor(world.y),0,TILE-1),tile=makeTileCanvas(TILE,TILE),c=tile.getContext("2d"),d=c.getImageData(x,y,1,1).data;
    if(d[3]<12){setStatus("That spot is transparent. Pick a visible colour.");return;}
    const hex="#"+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("");setInkColour(hex);
    const returnTool=state.previousTool&&state.previousTool!=="eyedropper"?state.previousTool:"select";
    state.tool=returnTool;
    document.querySelectorAll("[data-tool]").forEach(t=>t.classList.toggle("active",t.dataset.tool===returnTool));
    updateToolHighlight();
    canvas.style.cursor=returnTool==="pan"?"grab":returnTool==="select"?"default":"crosshair";
    const toolName={select:"Select",brush:"Brush",pan:"Pan",line:"Line",rect:"Rectangle",ellipse:"Ellipse",freefill:"Freehand fill",bucket:"Bucket fill",gradient:"Gradient fill"}[returnTool]||"Previous";
    setStatus(`Eyedropper picked ${hex}. ${toolName} tool restored.`);
  }
  function hashString(str){
    let h = 2166136261 >>> 0;
    for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
    return h >>> 0;
  }
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function templateBaseScale(count){return clamp(.43/Math.sqrt(Math.max(1,count)),.075,.22);}
  function templateBalancedSlots(count,rand){
    const cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols),base=templateBaseScale(count),slots=[];
    for(let i=0;i<count;i++){
      const row=Math.floor(i/cols),remaining=count-row*cols,rowCount=Math.min(cols,remaining),col=i%cols;
      const x=((col+.5)/rowCount+(rand()-.5)*.13/Math.max(1,rowCount))*TILE;
      const y=((row+.5)/rows+(rand()-.5)*.13/Math.max(1,rows))*TILE;
      slots.push({id:i+1,x:clamp(x,0,TILE),y:clamp(y,0,TILE),scale:base*(.9+rand()*.2),rotation:(rand()-.5)*.28,role:"filler"});
    }
    return slots;
  }
  function templateFlowingSlots(count,rand){
    const base=templateBaseScale(count),phase=rand()*Math.PI*2,slots=[];
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;
      const x=((.04+t*.92+(rand()-.5)*.035)%1+1)%1;
      const y=((.10+t*.76+Math.sin(t*Math.PI*2*1.35+phase)*.13+(rand()-.5)*.045)%1+1)%1;
      slots.push({id:i+1,x:x*TILE,y:y*TILE,scale:base*(.86+rand()*.24),rotation:-.42+rand()*.84,role:"filler"});
    }
    return slots;
  }
  function templateFeatureSlots(count,rand){
    const base=templateBaseScale(count),heroCount=Math.min(count,Math.max(1,Math.min(4,Math.round(count*.25)))),slots=[];
    const shiftX=(rand()-.5)*.12,shiftY=(rand()-.5)*.12,heroes=[[.26,.28],[.73,.34],[.38,.74],[.78,.76]];
    for(let i=0;i<heroCount;i++){
      const p=heroes[i],x=((p[0]+shiftX)%1+1)%1,y=((p[1]+shiftY)%1+1)%1;
      slots.push({id:slots.length+1,x:x*TILE,y:y*TILE,scale:Math.min(.34,base*1.55),rotation:(rand()-.5)*.34,role:"hero"});
    }
    const fillers=count-heroCount,golden=.61803398875,phase=rand();
    for(let i=0;i<fillers;i++){
      const x=((i+.5)/Math.max(1,fillers)+phase*.23)%1,y=((i+1)*golden+phase)%1;
      slots.push({id:slots.length+1,x:x*TILE,y:y*TILE,scale:base*.78,rotation:(rand()-.5)*.72,role:"filler"});
    }
    return slots;
  }
  function templateOptions(count,round=0){
    count=clamp(Math.round(Number(count)||6),1,30);round=Math.max(0,Math.floor(Number(round)||0));
    const seed=String($("seed")?.value||"pattern-01"),makeRand=kind=>mulberry32(hashString(seed+"|template|"+count+"|"+round+"|"+kind));
    return [
      {key:"balanced",name:"Balanced",description:"Even all-over spacing",slots:templateBalancedSlots(count,makeRand("balanced"))},
      {key:"flowing",name:"Flowing",description:"Diagonal organic movement",slots:templateFlowingSlots(count,makeRand("flowing"))},
      {key:"feature",name:"Feature + fill",description:"Larger focal positions with fillers",slots:templateFeatureSlots(count,makeRand("feature"))}
    ].map((option,choice)=>({...option,count,round,choice}));
  }
  function chooseTemplateLayout(count,round,choice){
    if(isDoodleProject()){setStatus("Layout templates are available in Pattern Projects.");return null;}
    const options=templateOptions(count,round),option=options[clamp(Math.floor(Number(choice)||0),0,2)];
    state.templateGuide=normaliseTemplateGuide({...option,visible:true});
    renderAll(false,false);scheduleAutosave();setStatus("Template selected: "+option.name+" · "+option.count+" element"+(option.count===1?"":"s")+".");return JSON.parse(JSON.stringify(state.templateGuide));
  }
  function clearTemplateGuide(){state.templateGuide=null;renderAll(false,false);scheduleAutosave();setStatus("Layout template guide cleared.");}
  function setTemplateGuideVisible(visible){if(!state.templateGuide)return false;state.templateGuide.visible=!!visible;renderAll(false,false);scheduleAutosave();return state.templateGuide.visible;}
  function templateTopLevelElements(){
    const selected=new Set(selectionIds()),limitToSelection=selected.size>0,groups=new Map();
    const records=[...state.items.map(artwork=>({kind:"item",artwork})),...state.marks.filter(mark=>mark.type!=="eraser").map(artwork=>({kind:"mark",artwork}))];
    for(const record of records){
      const layer=layerForArtwork(record.artwork,record.kind==="item"?BASE_LAYER_IDS.motifs:BASE_LAYER_IDS.drawing);
      if(!layerIsRenderable(layer,false)||layer.locked)continue;
      const key=record.artwork.groupId?"group:"+record.artwork.groupId:record.kind+":"+record.artwork.id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(record);
    }
    let elements=[...groups.values()];
    if(limitToSelection)elements=elements.filter(records=>records.some(record=>selected.has(record.artwork.id)));
    return elements;
  }
  function templateElementCenter(records){
    const anchor=artworkCenter(records[0]),points=records.map(record=>{
      const centre=artworkCenter(record),delta=nearestLatticeDelta(centre.x,centre.y,anchor.x,anchor.y);return {x:anchor.x+delta.x,y:anchor.y+delta.y};
    });
    return {x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length};
  }
  function moveTemplateElement(records,slot){
    const centre=templateElementCenter(records),dx=slot.x-centre.x,dy=slot.y-centre.y;
    for(const record of records){
      if(record.kind==="item"){
        const item=record.artwork,pos=canonicalPoint(Number(item.x||0)+dx,Number(item.y||0)+dy);item.x=pos.x;item.y=pos.y;delete item.scatterGenerated;
      }else{
        const mark=record.artwork,t=markTransformValues(mark);mark.transformX=t.x+dx;mark.transformY=t.y+dy;normaliseMarkTranslation(mark);
      }
    }
  }
  function distributeTemplateArtwork(){
    const guide=state.templateGuide;if(!guide){setStatus("Choose a layout template first.");return {placed:0,available:0};}
    const elements=templateTopLevelElements();if(!elements.length){setStatus("Add or select artwork before placing it into the template.");return {placed:0,available:0};}
    saveHistory();const placed=Math.min(elements.length,guide.slots.length);
    for(let i=0;i<placed;i++)moveTemplateElement(elements[i],guide.slots[i]);
    clearSelection();renderAll();setStatus("Placed "+placed+" element"+(placed===1?"":"s")+" into the "+guide.name+" template."+(elements.length>placed?" Extra artwork was left where it was.":""));return {placed,available:elements.length};
  }
  function drawTemplateGuides(c,sc){
    const guide=state.templateGuide;if(isDoodleProject()||!guide?.visible||!Array.isArray(guide.slots))return;
    c.save();c.lineWidth=1.5/sc;c.font=Math.max(9,12/sc)+"px system-ui,sans-serif";c.textAlign="center";c.textBaseline="middle";
    for(const slot of guide.slots){
      const r=clamp(slot.scale*TILE*.55,28,125),copies=latticeCopiesForBounds(slot.x-r,slot.x+r,slot.y-r,slot.y+r,TILE,TILE,repeatBasis());
      for(const copy of copies){
        const x=slot.x+copy.x,y=slot.y+copy.y;c.beginPath();c.setLineDash([7/sc,6/sc]);c.strokeStyle=slot.role==="hero"?"rgba(204,82,62,.72)":"rgba(44,95,84,.64)";c.arc(x,y,r,0,Math.PI*2);c.stroke();c.setLineDash([]);
        if(copy.k===0&&copy.n===0){c.fillStyle="rgba(248,250,251,.82)";c.beginPath();c.arc(x,y,11/sc,0,Math.PI*2);c.fill();c.fillStyle="#243343";c.fillText(String(slot.id),x,y);}
      }
    }
    c.restore();
  }
  window.PatternForgeTemplates={
    options:(count,round)=>templateOptions(count,round).map(option=>JSON.parse(JSON.stringify(option))),
    get active(){return state.templateGuide?JSON.parse(JSON.stringify(state.templateGuide)):null;},
    choose:chooseTemplateLayout,
    clear:clearTemplateGuide,
    setVisible:setTemplateGuideVisible,
    distribute:distributeTemplateArtwork,
    countElements:()=>templateTopLevelElements().length
  };
  function getExportSpec(){
    const mult=exportMultipliers();
    // Pixel dimensions define raster detail. DPI metadata is compatibility data only;
    // Pattern Forge designs do not have a physical size.
    return {dpi:300,wPx:4000*mult.x,hPx:4000*mult.y};
  }
  function updatePixelReadout(){
    const s=getExportSpec();
    $("pixelReadout").textContent=`${s.wPx.toLocaleString()} × ${s.hPx.toLocaleString()}`;
    renderAll();
  }
  function updateSettingReadouts(){
    $("gridCountValue").textContent=$("gridCount").selectedOptions[0]?.textContent.trim()||"16 × 16";
    $("symmetryValue").textContent=$("symmetry").selectedOptions[0]?.textContent.trim()||"Off";
  }

  function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(file);
    });
  }
  async function addFiles(files){
    const candidates=files.filter(file=>/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type));
    if(!candidates.length){setStatus("No supported image was added. Choose a PNG, JPG, WebP or SVG file.");return;}
    const firstNewAssetIndex=state.assets.length;
    for(const file of candidates){
      const src=await fileToDataURL(file);
      const img=new Image();
      await new Promise((resolve,reject)=>{
        img.onload=resolve;img.onerror=()=>reject(new Error(`“${file.name}” could not be decoded as an image.`));img.src=src;
      });
      const assetId=nextAssetId();
      state.assets.push({id:assetId,name:file.name,src,img,w:img.naturalWidth||1000,h:img.naturalHeight||1000,vector:file.type==="image/svg+xml"});
      state.recentAssetIds.unshift(assetId);
    }
    rebuildAssetGrid();
    const firstAdded=state.assets[firstNewAssetIndex];
    if(firstAdded)addAssetInstance(firstAdded);
    renderAll();
    const extra=candidates.length>1?` ${candidates.length-1} more ${candidates.length===2?"image is":"images are"} ready in your image list.`:"";
    setStatus(`“${firstAdded?.name||candidates[0].name}” was added and placed on the tile.${extra} Tap a thumbnail to place another copy.`);
  }
  function nextAssetId(){
    const used=new Set(state.assets.map(asset=>String(asset.id)));
    let max=0;
    for(const id of used){const match=/^a(\d+)$/i.exec(id);if(match)max=Math.max(max,Number(match[1])||0);}
    let n=max+1;while(used.has(`a${n}`))n++;return `a${n}`;
  }
  function removeAssetFromLibrary(asset){
    const placed=state.items.filter(item=>String(item.assetId)===String(asset.id));
    if(placed.length){
      const copies=`${placed.length} placed cop${placed.length===1?"y":"ies"}`;
      if(!confirm(`Remove “${asset.name}” from the image library and remove ${copies} from this project?`))return;
    }
    state.items=state.items.filter(item=>String(item.assetId)!==String(asset.id));
    if(placed.some(item=>item.id===state.selectedId))state.selectedId=null;
    state.assets=state.assets.filter(candidate=>String(candidate.id)!==String(asset.id));
    state.recentAssetIds=state.recentAssetIds.filter(id=>String(id)!==String(asset.id));
    rebuildAssetGrid();
    renderAll();
    const removedCopies=placed.length?` and ${placed.length} placed cop${placed.length===1?"y":"ies"}`:"";
    setStatus(`Removed “${asset.name}” from the image library${removedCopies}.`);
  }
  function rebuildAssetGrid(){
    const g=$("assetGrid");
    g.innerHTML="";
    state.assets.forEach(a=>{
      const wrap=document.createElement("div");wrap.className="assetWrap";
      const d=document.createElement("button");
      d.type="button";d.className="asset";d.title=`Add ${a.name}`;d.setAttribute("aria-label",`Add ${a.name}`);
      const im=document.createElement("img");im.src=a.src;im.alt="";
      const sp=document.createElement("span");sp.textContent=a.name;
      d.append(im,sp);
      d.addEventListener("click",()=>addAssetInstance(a));
      const remove=document.createElement("button");
      remove.type="button";remove.className="assetRemove";remove.textContent="×";remove.title=`Remove ${a.name} from image library`;remove.setAttribute("aria-label",`Remove ${a.name} from image library`);
      remove.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();removeAssetFromLibrary(a);});
      wrap.append(d,remove);
      g.appendChild(wrap);
    });
    rebuildFocusRecent();
  }
  function rebuildFocusRecent(){
    const grid=$("focusRecentGrid"),empty=$("focusRecentEmpty");
    if(!grid||!empty)return;
    grid.innerHTML="";
    const ids=[...new Set(state.recentAssetIds)];
    const assets=ids.map(id=>state.assets.find(a=>a.id===id)).filter(Boolean).slice(0,9);
    empty.hidden=assets.length>0;
    for(const asset of assets){
      const button=document.createElement("button");
      button.type="button";button.className="focusRecentItem";button.title=`Add another ${asset.name}`;
      const img=document.createElement("img");img.src=asset.src;img.alt="";
      const name=document.createElement("span");name.textContent=asset.name;
      button.append(img,name);
      button.addEventListener("click",()=>addAssetInstance(asset));
      grid.appendChild(button);
    }
  }
  function addAssetInstance(asset){
    state.recentAssetIds=[asset.id,...state.recentAssetIds.filter(id=>id!==asset.id)].slice(0,20);
    rebuildFocusRecent();
    const minDim=TILE;
    const maxNatural=Math.max(asset.w,asset.h)||1;
    const target=minDim*.25;
    const scale=target/maxNatural;
    const item={
      id:state.nextId++, assetId:asset.id, layerId:motifTargetLayerId(),
      x:TILE/2,y:TILE/2,
      scale, rotation:0, opacity:1
    };
    saveHistory();
    state.items.push(item);
    state.selectedId=item.id;
    renderAll();
  }
  function assetOf(item){ return state.assets.find(a=>a.id===item.assetId); }
  function selectedItem(){ return state.items.find(i=>i.id===state.selectedId)||null; }
  function selectedMark(){ return state.marks.find(m=>m.id===state.selectedId)||null; }
  function artworkRecord(id){
    const item=state.items.find(i=>i.id===id);if(item)return {kind:"item",artwork:item,layer:layerForArtwork(item,BASE_LAYER_IDS.motifs)};
    const mark=state.marks.find(m=>m.id===id);if(mark)return {kind:"mark",artwork:mark,layer:layerForArtwork(mark,BASE_LAYER_IDS.drawing)};
    return null;
  }
  function selectableArtworkRecord(id){
    const record=artworkRecord(id);if(!record||(record.kind==="mark"&&record.artwork.type==="eraser"))return null;
    if(!layerIsRenderable(record.layer,false)||record.layer.locked)return null;
    return record;
  }
  function selectionIds(){
    if(state.selectedId===null||state.selectedId===undefined)return [];
    const raw=Array.isArray(state.selectedIds)&&state.selectedIds.includes(state.selectedId)?state.selectedIds:[state.selectedId],seen=new Set(),ids=[];
    for(const id of raw){if(seen.has(id)||!selectableArtworkRecord(id))continue;seen.add(id);ids.push(id);}
    if(!ids.includes(state.selectedId))state.selectedId=ids[0]??null;
    state.selectedIds=ids;
    return ids;
  }
  function selectedArtwork(){return selectionIds().map(artworkRecord).filter(Boolean);}
  function isSelected(id){return selectionIds().includes(id);}
  function setSelection(ids,primaryId=null){
    const unique=[],seen=new Set();
    for(const id of ids||[]){if(seen.has(id)||!selectableArtworkRecord(id))continue;seen.add(id);unique.push(id);}
    state.selectedIds=unique;
    state.selectedId=unique.includes(primaryId)?primaryId:(unique.at(-1)??null);
  }
  function clearSelection(){state.selectedId=null;state.selectedIds=[];}
  function newGroupId(){return "group-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}
  function groupMembers(groupId){
    if(!groupId)return [];
    return [...state.items,...state.marks].filter(artwork=>artwork.groupId===groupId).map(artwork=>selectableArtworkRecord(artwork.id)).filter(Boolean);
  }
  function expandedArtworkIds(artwork){
    if(!artwork)return [];
    const grouped=groupMembers(artwork.groupId);return grouped.length?grouped.map(record=>record.artwork.id):[artwork.id];
  }
  function selectAllArtwork(){
    setSelection([...state.items,...state.marks].map(artwork=>artwork.id));
    renderAll();setStatus(selectionIds().length?"Selected "+selectionIds().length+" artwork items.":"There is no selectable artwork on visible unlocked layers.");
  }
  function groupSelectedArtwork(){
    const records=selectedArtwork();if(records.length<2){setStatus("Select two or more artwork items to make a group.");return;}
    saveHistory();const groupId=newGroupId();for(const record of records)record.artwork.groupId=groupId;
    setSelection(records.map(record=>record.artwork.id),state.selectedId);renderAll();setStatus("Grouped "+records.length+" artwork items.");
  }
  function ungroupSelectedArtwork(){
    const records=selectedArtwork(),groups=new Set(records.map(record=>record.artwork.groupId).filter(Boolean));if(!groups.size){setStatus("The current selection is not grouped.");return;}
    saveHistory();for(const artwork of [...state.items,...state.marks])if(groups.has(artwork.groupId))delete artwork.groupId;
    setSelection(records.map(record=>record.artwork.id),state.selectedId);renderAll();setStatus(groups.size===1?"Group released.":"Groups released.");
  }
  function duplicateSelectedArtwork(){
    const records=selectedArtwork();if(!records.length)return;saveHistory();
    const copiedIds=[],groupMap=new Map();
    for(const record of records){
      const original=record.artwork,copy=JSON.parse(JSON.stringify(original));copy.id=state.nextId++;delete copy.scatterGenerated;
      if(original.groupId){if(!groupMap.has(original.groupId))groupMap.set(original.groupId,newGroupId());copy.groupId=groupMap.get(original.groupId);}
      if(record.kind==="item"){
        const pos=canonicalPoint(Number(original.x)+40,Number(original.y)+40);copy.x=pos.x;copy.y=pos.y;state.items.push(copy);
      }else{
        const base=markTransformValues(original);copy.transformX=base.x+40;copy.transformY=base.y+40;copy.transformScale=base.scale;copy.transformRotation=base.rotation;state.marks.push(copy);
      }
      copiedIds.push(copy.id);
    }
    setSelection(copiedIds,copiedIds.at(-1));renderAll();setStatus("Duplicated "+records.length+" artwork item"+(records.length===1?"":"s")+".");
  }
  function deleteSelectedArtwork(){
    const ids=new Set(selectionIds());if(!ids.size)return;saveHistory();
    state.items=state.items.filter(item=>!ids.has(item.id));state.marks=state.marks.filter(mark=>!ids.has(mark.id));clearSelection();renderAll();setStatus("Deleted "+ids.size+" artwork item"+(ids.size===1?"":"s")+".");
  }
  function normaliseHexColour(value){
    const raw=String(value||"").trim();return /^#[0-9a-f]{6}$/i.test(raw)?raw.toLowerCase():null;
  }
  function colourDistance(a,b){
    const ca=normaliseHexColour(a),cb=normaliseHexColour(b);if(!ca||!cb)return Infinity;
    const nums=hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
    const [ar,ag,ab]=nums(ca),[br,bg,bb]=nums(cb);return Math.hypot(ar-br,ag-bg,ab-bb);
  }
  function selectedRecolourableMarks(){return selectedArtwork().filter(record=>record.kind==="mark"&&record.artwork.type!=="eraser").map(record=>record.artwork);}
  function recolourSelectedMarks(colour){
    const next=normaliseHexColour(colour),marks=selectedRecolourableMarks();if(!next||!marks.length)return 0;
    saveHistory();for(const mark of marks)mark.color=next;const panel=$("selectedPanel");if(panel)panel.dataset.selectionColour=next;renderAll();setStatus("Recoloured "+marks.length+" editable mark"+(marks.length===1?"":"s")+".");return marks.length;
  }
  function replaceMatchingMarkColour(fromColour,toColour,tolerance=0){
    const from=normaliseHexColour(fromColour),to=normaliseHexColour(toColour),limit=clamp(Number(tolerance)||0,0,100)*4.42;
    if(!from||!to)return 0;
    const matches=state.marks.filter(mark=>mark.type!=="eraser"&&normaliseHexColour(mark.color)&&colourDistance(mark.color,from)<=limit);
    if(!matches.length){setStatus("No editable marks matched that colour.");return 0;}
    saveHistory();for(const mark of matches)mark.color=to;renderAll();setStatus("Recoloured "+matches.length+" matching mark"+(matches.length===1?"":"s")+" across this project.");return matches.length;
  }
  function artworkCenter(record){
    if(record.kind==="item")return {x:Number(record.artwork.x)||0,y:Number(record.artwork.y)||0};
    const b=markPrimaryBounds(record.artwork);return {x:b.cx,y:b.cy};
  }
  function selectionTransformGeometry(){
    const records=selectedArtwork();if(records.length<2)return null;
    const primary=records.find(record=>record.artwork.id===state.selectedId)||records[0],anchor=artworkCenter(primary),members=[];
    for(const record of records){
      const centre=artworkCenter(record),delta=nearestLatticeDelta(centre.x,centre.y,anchor.x,anchor.y),unwrapped={x:anchor.x+delta.x,y:anchor.y+delta.y};
      members.push({record,centre,unwrapped});
    }
    const center=members.reduce((sum,member)=>({x:sum.x+member.unwrapped.x,y:sum.y+member.unwrapped.y}),{x:0,y:0});
    center.x/=members.length;center.y/=members.length;
    return {members,center};
  }
  function scaleSelectedArtwork(factor){
    factor=Number(factor);if(!Number.isFinite(factor)||factor<=0)return;
    const geometry=selectionTransformGeometry();if(!geometry)return;
    for(const member of geometry.members){
      const target={x:geometry.center.x+(member.unwrapped.x-geometry.center.x)*factor,y:geometry.center.y+(member.unwrapped.y-geometry.center.y)*factor};
      if(member.record.kind==="item"){
        const item=member.record.artwork,pos=isDoodleProject()?target:canonicalPoint(target.x,target.y);item.x=pos.x;item.y=pos.y;item.scale=clamp(item.scale*factor,.01,60);
      }else{
        const mark=member.record.artwork,t=markTransformValues(mark);mark.transformX=t.x+(target.x-member.unwrapped.x);mark.transformY=t.y+(target.y-member.unwrapped.y);mark.transformScale=clamp(t.scale*factor,.01,60);
      }
    }
    renderAll(false,false);
  }
  function rotateSelectedArtwork(deltaRadians){
    deltaRadians=Number(deltaRadians);if(!Number.isFinite(deltaRadians)||Math.abs(deltaRadians)<1e-12)return;
    const geometry=selectionTransformGeometry();if(!geometry)return;const cos=Math.cos(deltaRadians),sin=Math.sin(deltaRadians);
    for(const member of geometry.members){
      const dx=member.unwrapped.x-geometry.center.x,dy=member.unwrapped.y-geometry.center.y,target={x:geometry.center.x+dx*cos-dy*sin,y:geometry.center.y+dx*sin+dy*cos};
      if(member.record.kind==="item"){
        const item=member.record.artwork,pos=isDoodleProject()?target:canonicalPoint(target.x,target.y);item.x=pos.x;item.y=pos.y;item.rotation+=deltaRadians;
      }else{
        const mark=member.record.artwork,t=markTransformValues(mark);mark.transformX=t.x+(target.x-member.unwrapped.x);mark.transformY=t.y+(target.y-member.unwrapped.y);mark.transformRotation=t.rotation+deltaRadians;
      }
    }
    renderAll(false,false);
  }
  function flipSelectedArtwork(axis){
    const records=selectedArtwork();if(!records.length)return 0;saveHistory();
    const geometry=records.length>1?selectionTransformGeometry():{members:records.map(record=>({record,unwrapped:artworkCenter(record)})),center:artworkCenter(records[0])};
    for(const member of geometry.members){
      const target=axis==="horizontal"?{x:2*geometry.center.x-member.unwrapped.x,y:member.unwrapped.y}:{x:member.unwrapped.x,y:2*geometry.center.y-member.unwrapped.y};
      if(member.record.kind==="item"){
        const item=member.record.artwork,pos=isDoodleProject()?target:canonicalPoint(target.x,target.y);item.x=pos.x;item.y=pos.y;item.rotation=-Number(item.rotation||0);if(axis==="horizontal")item.flipX=!item.flipX;else item.flipY=!item.flipY;delete item.scatterGenerated;
      }else{
        const mark=member.record.artwork,t=markTransformValues(mark);mark.transformX=t.x+(target.x-member.unwrapped.x);mark.transformY=t.y+(target.y-member.unwrapped.y);mark.transformRotation=-t.rotation;if(axis==="horizontal")mark.transformFlipX=!t.flipX;else mark.transformFlipY=!t.flipY;
      }
    }
    renderAll();setStatus("Flipped "+records.length+" selected artwork item"+(records.length===1?"":"s")+" "+(axis==="horizontal"?"horizontally.":"vertically."));return records.length;
  }
  window.PatternForgeSelection={
    get count(){return selectionIds().length;},
    get addMode(){return !!state.selectionAddMode;},
    toggleAddMode(){state.selectionAddMode=!state.selectionAddMode;renderAll();setStatus(state.selectionAddMode?"Add-to-selection mode on. Tap artwork to add or remove it.":"Add-to-selection mode off.");return state.selectionAddMode;},
    selectAll:selectAllArtwork,
    clear(){clearSelection();renderAll();setStatus("Selection cleared.");},
    group:groupSelectedArtwork,
    ungroup:ungroupSelectedArtwork,
    duplicate:duplicateSelectedArtwork,
    delete:deleteSelectedArtwork,
    beginTransform(){if(selectionIds().length>1)saveHistory();},
    scaleBy:scaleSelectedArtwork,
    rotateByDegrees(degrees){rotateSelectedArtwork(Number(degrees)*Math.PI/180);},
    flipHorizontal(){return flipSelectedArtwork("horizontal");},
    flipVertical(){return flipSelectedArtwork("vertical");},
    recolour:recolourSelectedMarks,
    replaceMatching:replaceMatchingMarkColour
  };
  function latticeCoordinates(x,y,basis){
    const [a,b]=basis,det=a.x*b.y-a.y*b.x;
    return {k:(x*b.y-y*b.x)/det,n:(a.x*y-a.y*x)/det};
  }
  function latticeCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,basis){
    const corners=[[-maxX,-maxY],[clipW-minX,-maxY],[-maxX,clipH-minY],[clipW-minX,clipH-minY]].map(([x,y])=>latticeCoordinates(x,y,basis));
    const ks=corners.map(p=>p.k),ns=corners.map(p=>p.n);
    const k0=Math.floor(Math.min(...ks))-1,k1=Math.ceil(Math.max(...ks))+1;
    const n0=Math.floor(Math.min(...ns))-1,n1=Math.ceil(Math.max(...ns))+1;
    const copies=[];
    for(let n=n0;n<=n1;n++)for(let k=k0;k<=k1;k++){
      const x=k*basis[0].x+n*basis[1].x,y=k*basis[0].y+n*basis[1].y;
      if(maxX+x>=0&&minX+x<=clipW&&maxY+y>=0&&minY+y<=clipH)copies.push({k,n,x,y});
    }
    return copies;
  }
  function artworkCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,basis){
    if(isDoodleProject())return maxX>=0&&minX<=clipW&&maxY>=0&&minY<=clipH?[{k:0,n:0,x:0,y:0}]:[];
    return latticeCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,basis);
  }
  function nearestLatticeDelta(x,y,cx,cy){
    if(isDoodleProject()){const dx=x-cx,dy=y-cy;return {x:dx,y:dy,distance:dx*dx+dy*dy};}
    const basis=repeatBasis(),coeff=latticeCoordinates(x-cx,y-cy,basis),k0=Math.round(coeff.k),n0=Math.round(coeff.n);
    let best={x:x-cx,y:y-cy,distance:Infinity};
    for(let n=n0-2;n<=n0+2;n++)for(let k=k0-2;k<=k0+2;k++){
      const dx=x-(cx+k*basis[0].x+n*basis[1].x),dy=y-(cy+k*basis[0].y+n*basis[1].y),distance=dx*dx+dy*dy;
      if(distance<best.distance)best={x:dx,y:dy,distance};
    }
    return best;
  }
  function nearestLatticePoint(x,y,refX,refY){
    const delta=nearestLatticeDelta(refX,refY,x,y);return {x:refX-delta.x,y:refY-delta.y};
  }
  function canonicalPoint(x,y){
    if(isDoodleProject())return {x,y};
    const style=projectRepeatStyle();
    if(style==="half-drop"){
      const n=Math.floor(y/TILE);y-=n*TILE;x-=n*TILE/2;
      const k=Math.floor(x/TILE);x-=k*TILE;
    }else if(style==="brick"){
      const k=Math.floor(x/TILE);x-=k*TILE;y-=k*TILE/2;
      const n=Math.floor(y/TILE);y-=n*TILE;
    }else{x=((x%TILE)+TILE)%TILE;y=((y%TILE)+TILE)%TILE;}
    return {x,y};
  }

  // Draws every periodic copy needed to cover the target rectangle.
  // Unlike a fixed 3×3 wrap, this also works when a motif is larger than the tile.
  function drawWrapped(targetCtx,item,W,H,showSelection=false,basis=repeatBasis(W,H),layerOpacity=1){
    const a=assetOf(item); if(!a) return;
    const iw=a.w*item.scale, ih=a.h*item.scale;
    const c=Math.abs(Math.cos(item.rotation)), s=Math.abs(Math.sin(item.rotation));
    const halfW=(iw*c+ih*s)/2, halfH=(iw*s+ih*c)/2;

    const copies=artworkCopiesForBounds(item.x-halfW,item.x+halfW,item.y-halfH,item.y+halfH,W,H,basis);

    targetCtx.save();
    targetCtx.globalAlpha=item.opacity*layerOpacity;
    for(const copy of copies){
        const px=item.x+copy.x, py=item.y+copy.y;
        targetCtx.save();
        targetCtx.translate(px,py);
        targetCtx.rotate(item.rotation);
        targetCtx.scale(item.flipX?-1:1,item.flipY?-1:1);
        targetCtx.drawImage(a.img,-iw/2,-ih/2,iw,ih);
        if(showSelection && item.id===state.selectedId){
          targetCtx.globalAlpha=1;
          targetCtx.strokeStyle="#2c5f54";
          targetCtx.lineWidth=2;
          targetCtx.setLineDash([7,5]);
          targetCtx.strokeRect(-iw/2,-ih/2,iw,ih);
          targetCtx.setLineDash([]);
        }
        targetCtx.restore();
    }
    targetCtx.restore();
  }

  function viewScale(){ return .38*state.zoom; }
  function viewOrigin(){
    const sc=viewScale();
    return {x:(canvas.width-TILE*sc)/2+state.panX,y:(canvas.height-TILE*sc)/2+state.panY};
  }
  function worldPoint(p){ const o=viewOrigin(),s=viewScale();return {x:(p.x-o.x)/s,y:(p.y-o.y)/s}; }
  function setZoom(value,anchor={x:canvas.width/2,y:canvas.height/2}){
    const before=worldPoint(anchor);
    state.zoom=clamp(value,.5,4);
    const after=worldPoint(anchor),s=viewScale();
    state.panX+=(after.x-before.x)*s;
    state.panY+=(after.y-before.y)*s;
    $("zoom").value=Math.round(state.zoom*100);
    $("zoomLabel").textContent=Math.round(state.zoom*100)+"%";
    renderAll(false,false);
  }
  function fitCanvasView(){
    const availableWidth=canvas.width,availableHeight=canvas.height;
    const fitScale=Math.min(availableWidth,availableHeight)*.92/(TILE*.38);
    state.panX=state.panY=0;setZoom(fitScale);
  }
  const LIVE_TILE_SIZE=540;
  window.PatternForgeInteractionMetrics={interactiveFrames:0,fullFrames:0,deferredWorkFrames:0,lastInteractiveTileSize:null,coalescedSamples:0,active:false,kind:null};
  function beginInteraction(kind){
    state.interactionActive=true;state.interactionKind=kind;
    if(kind==="view"&&!state.interactionTile)state.interactionTile=makeTileCanvas(TILE,TILE,TILE,TILE);
    const metrics=window.PatternForgeInteractionMetrics;metrics.active=true;metrics.kind=kind;
  }
  function finishInteraction(){
    state.interactionActive=false;state.interactionKind=null;state.interactionTile=null;
    const metrics=window.PatternForgeInteractionMetrics;metrics.active=false;metrics.kind=null;
  }
  function drawEditor(){
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle="#e9e4da";ctx.fillRect(0,0,W,H);
    let tile,tileSize=TILE;
    if(state.interactionActive&&state.interactionKind==="view"&&state.interactionTile){
      tile=state.interactionTile;
    }else{
      tileSize=state.interactionActive?LIVE_TILE_SIZE:TILE;
      tile=makeTileCanvas(tileSize,tileSize,tileSize,tileSize);
    }
    const metrics=window.PatternForgeInteractionMetrics;
    if(state.interactionActive){metrics.interactiveFrames++;metrics.lastInteractiveTileSize=tileSize;}
    else metrics.fullFrames++;
    const o=viewOrigin(),sc=viewScale();
    ctx.save();ctx.translate(o.x,o.y);ctx.scale(sc,sc);
    const repeatReach=isDoodleProject()?0:(state.focusMode&&!state.focusRepeatPreview?0:2);
    const basis=repeatBasis();
    for(let n=-repeatReach;n<=repeatReach;n++)for(let k=-repeatReach;k<=repeatReach;k++){
      const x=k*basis[0].x+n*basis[1].x,y=k*basis[0].y+n*basis[1].y;
      ctx.save();ctx.globalAlpha=(k===0&&n===0)?1:(parseInt($("neighborOpacity").value,10)||35)/100;
      ctx.drawImage(tile,x,y,TILE,TILE);
      ctx.restore();
    }
    if($("showTileBorder").checked){ctx.strokeStyle="#173d36";ctx.lineWidth=2/sc;ctx.strokeRect(0,0,TILE,TILE);}
    if($("gridOn").checked){
      const n=parseInt($("gridCount").value,10)||16;
      ctx.beginPath();
      for(let i=1;i<n;i++){
        const q=i*TILE/n;ctx.moveTo(q,0);ctx.lineTo(q,TILE);ctx.moveTo(0,q);ctx.lineTo(TILE,q);
      }
      ctx.strokeStyle="rgba(28,60,56,.24)";ctx.lineWidth=1/sc;ctx.stroke();
    }
    drawConstructionGuides(ctx,sc);
    drawSymmetryGuides(ctx,sc);
    drawSnapGuides(ctx,sc);
    drawTemplateGuides(ctx,sc);
    const selection=selectedArtwork(),showHandles=selection.length===1;
    for(const record of selection){
      if(record.kind==="item"){
        const item=record.artwork,a=assetOf(item);if(!a)continue;const iw=a.w*item.scale,ih=a.h*item.scale;
        ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation);
        ctx.setLineDash([7/sc,5/sc]);ctx.strokeStyle="#cc523e";ctx.lineWidth=2/sc;
        ctx.strokeRect(-iw/2,-ih/2,iw,ih);ctx.setLineDash([]);
        if(showHandles){
          for(const [x,y] of [[-iw/2,-ih/2],[iw/2,-ih/2],[iw/2,ih/2],[-iw/2,ih/2]]){
            ctx.beginPath();ctx.arc(x,y,8/sc,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
            ctx.strokeStyle="#173d36";ctx.lineWidth=2/sc;ctx.stroke();
          }
          drawImageTransformHandle(ctx,0,-ih/2-22/sc,"rotate",sc);
          drawImageTransformHandle(ctx,0,ih/2+22/sc,"move",sc);
        }
        ctx.restore();
      }else if(record.kind==="mark"){
        if(layerIsRenderable(record.layer,false)&&!record.layer.locked)drawSelectedMarkOverlay(ctx,record.artwork,sc,showHandles);
      }
    }
    ctx.restore();
  }

    function drawImageTransformHandle(c,x,y,mode,sc){
    const r=13/sc;
    c.save();c.translate(x,y);c.setLineDash([]);c.lineWidth=2/sc;
    c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle="#fff";c.fill();
    c.strokeStyle="#173d36";c.stroke();c.strokeStyle="#173d36";c.fillStyle="#173d36";
    if(mode==="rotate"){
      c.beginPath();c.arc(0,0,6/sc,-Math.PI*.72,Math.PI*.92);c.stroke();
      c.beginPath();c.moveTo(5/sc,5/sc);c.lineTo(9/sc,5/sc);c.lineTo(8/sc,1/sc);c.closePath();c.fill();
    }else{
      const d=5/sc;
      c.beginPath();c.moveTo(-d,0);c.lineTo(d,0);c.moveTo(0,-d);c.lineTo(0,d);c.stroke();
      for(const [ax,ay] of [[-1,0],[1,0],[0,-1],[0,1]]){
        c.beginPath();c.moveTo(ax*9/sc,ay*9/sc);c.lineTo(ax*5/sc-ay*3/sc,ay*5/sc-ax*3/sc);c.lineTo(ax*5/sc+ay*3/sc,ay*5/sc+ax*3/sc);c.closePath();c.fill();
      }
    }
    c.restore();
  }

  function drawSelectedMarkOverlay(c,m,sc,showHandles=true){
    const b=markPrimaryBounds(m),w=Math.max(1,b.maxX-b.minX),h=Math.max(1,b.maxY-b.minY);
    c.save();c.setLineDash([7/sc,5/sc]);c.strokeStyle="#cc523e";c.lineWidth=2/sc;c.strokeRect(b.minX,b.minY,w,h);c.setLineDash([]);
    if(showHandles){
      for(const [x,y] of [[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]]){
        c.beginPath();c.arc(x,y,8/sc,0,Math.PI*2);c.fillStyle="#fff";c.fill();c.strokeStyle="#173d36";c.lineWidth=2/sc;c.stroke();
      }
      drawImageTransformHandle(c,b.cx,b.minY-22/sc,"rotate",sc);drawImageTransformHandle(c,b.cx,b.maxY+22/sc,"move",sc);
    }
    c.restore();
  }
  function markHandleAt(m,x,y){
    const b=markPrimaryBounds(m),limit=20/viewScale();
    if(Math.hypot(x-b.cx,y-(b.minY-22/viewScale()))<=limit)return "rotate";
    if(Math.hypot(x-b.cx,y-(b.maxY+22/viewScale()))<=limit)return "move";
    return null;
  }
  function markResizeHandleHit(m,x,y){
    const b=markPrimaryBounds(m),limit=25/viewScale();
    return [[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]].some(([cx,cy])=>Math.hypot(x-cx,y-cy)<=limit);
  }

  function symmetryTransforms(){
    const mode=$("symmetry").value;
    if(mode==="vertical")return [[false,false,0],[true,false,0]];
    if(mode==="horizontal")return [[false,false,0],[false,true,0]];
    if(mode==="quadrant")return [[false,false,0],[true,false,0],[false,true,0],[true,true,0]];
    if(mode==="radial")return Array.from({length:8},(_,i)=>[[false,false,i*Math.PI/4],[true,false,i*Math.PI/4]]).flat();
    return [[false,false,0]];
  }
  function reflectPoint(p,mirrorX,mirrorY,angle){
    let x=p.x-TILE/2,y=p.y-TILE/2;
    if(mirrorX)x=-x;if(mirrorY)y=-y;
    const c=Math.cos(angle),s=Math.sin(angle);
    return {...p,x:TILE/2+x*c-y*s,y:TILE/2+x*s+y*c};
  }
  function drawConstructionGuides(c,sc){
    const mode=$("constructionGuide")?.value||"off";if(mode==="off")return;
    const alpha=clamp((parseInt($("guideOpacity")?.value,10)||55)/100,.1,1);
    const centre=mode==="centre"||mode==="all",diagonals=mode==="diagonals"||mode==="all",diamond=mode==="diamond"||mode==="all";
    c.save();c.strokeStyle=`rgba(44,95,84,${alpha})`;c.fillStyle=`rgba(44,95,84,${alpha})`;c.lineWidth=1.5/sc;c.setLineDash([8/sc,6/sc]);c.beginPath();
    if(centre){c.moveTo(TILE/2,0);c.lineTo(TILE/2,TILE);c.moveTo(0,TILE/2);c.lineTo(TILE,TILE/2);}
    if(diagonals){c.moveTo(0,0);c.lineTo(TILE,TILE);c.moveTo(TILE,0);c.lineTo(0,TILE);}
    if(diamond){c.moveTo(TILE/2,0);c.lineTo(TILE,TILE/2);c.lineTo(TILE/2,TILE);c.lineTo(0,TILE/2);c.closePath();}
    c.stroke();c.setLineDash([]);
    if(centre||diamond){c.beginPath();c.arc(TILE/2,TILE/2,4/sc,0,Math.PI*2);c.fill();}
    c.restore();
  }

  function drawSymmetryGuides(c,sc){
    if(!$("symmetryGuides").checked)return;
    const mode=$("symmetry").value;if(mode==="off")return;
    c.save();c.strokeStyle="rgba(193,75,53,.72)";c.lineWidth=1.5/sc;c.setLineDash([6/sc,5/sc]);
    c.beginPath();
    if(["vertical","quadrant","radial"].includes(mode)){c.moveTo(TILE/2,0);c.lineTo(TILE/2,TILE);}
    if(["horizontal","quadrant","radial"].includes(mode)){c.moveTo(0,TILE/2);c.lineTo(TILE,TILE/2);}
    if(mode==="radial"){
      for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/4,dx=Math.cos(a)*TILE,dy=Math.sin(a)*TILE;c.moveTo(TILE/2-dx,TILE/2-dy);c.lineTo(TILE/2+dx,TILE/2+dy);}
    }
    c.stroke();c.restore();
  }

  function markPointSets(m){
    if(m?.type==="bucket"&&Array.isArray(m.paths))return m.paths.filter(path=>Array.isArray(path)&&path.length);
    return [Array.isArray(m?.points)?m.points:[]];
  }
  function markAllPoints(m){return markPointSets(m).flat();}
  function markGeometryBounds(m){
    const points=markAllPoints(m);if(!points.length)return {minX:0,maxX:0,minY:0,maxY:0,cx:0,cy:0};
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    return {minX,maxX,minY,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function markTransformValues(m){
    const rawScale=Number(m?.transformScale),rawRotation=Number(m?.transformRotation),rawX=Number(m?.transformX),rawY=Number(m?.transformY);
    return {x:Number.isFinite(rawX)?rawX:0,y:Number.isFinite(rawY)?rawY:0,scale:Number.isFinite(rawScale)?clamp(rawScale,.01,60):1,rotation:Number.isFinite(rawRotation)?rawRotation:0,flipX:!!m?.transformFlipX,flipY:!!m?.transformFlipY};
  }
  function markHasTransform(m){const t=markTransformValues(m);return Math.abs(t.x)>1e-9||Math.abs(t.y)>1e-9||Math.abs(t.scale-1)>1e-9||Math.abs(t.rotation)>1e-9||t.flipX||t.flipY;}
  function markTransformPoint(p,m){
    const b=markGeometryBounds(m),t=markTransformValues(m),dx=(p.x-b.cx)*t.scale*(t.flipX?-1:1),dy=(p.y-b.cy)*t.scale*(t.flipY?-1:1),c=Math.cos(t.rotation),s=Math.sin(t.rotation);
    return {x:b.cx+t.x+dx*c-dy*s,y:b.cy+t.y+dx*s+dy*c};
  }
  function markTransformedBounds(m,mirrorX=false,mirrorY=false,angle=0){
    const b=markGeometryBounds(m),pad=Math.max(.5,Number(m.width)||0),corners=[
      {x:b.minX-pad,y:b.minY-pad},{x:b.maxX+pad,y:b.minY-pad},{x:b.maxX+pad,y:b.maxY+pad},{x:b.minX-pad,y:b.maxY+pad}
    ].map(p=>reflectPoint(markTransformPoint(p,m),mirrorX,mirrorY,angle));
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of corners){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    return {minX,maxX,minY,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function applyMarkTransformContext(c,m){
    const b=markGeometryBounds(m),t=markTransformValues(m);if(!markHasTransform(m))return;
    c.translate(b.cx+t.x,b.cy+t.y);c.rotate(t.rotation);c.scale(t.scale*(t.flipX?-1:1),t.scale*(t.flipY?-1:1));c.translate(-b.cx,-b.cy);
  }
  function applySymmetryContext(c,mirrorX,mirrorY,angle){
    c.translate(TILE/2,TILE/2);c.rotate(angle);c.scale(mirrorX?-1:1,mirrorY?-1:1);c.translate(-TILE/2,-TILE/2);
  }
  function markSvgTransform(m){
    const b=markGeometryBounds(m),t=markTransformValues(m),deg=t.rotation*180/Math.PI;
    return `translate(${b.cx+t.x} ${b.cy+t.y}) rotate(${deg}) scale(${t.scale*(t.flipX?-1:1)} ${t.scale*(t.flipY?-1:1)}) translate(${-b.cx} ${-b.cy})`;
  }
  function inverseMarkTransformPoint(p,m){
    const b=markGeometryBounds(m),t=markTransformValues(m),dx=p.x-(b.cx+t.x),dy=p.y-(b.cy+t.y),c=Math.cos(-t.rotation),s=Math.sin(-t.rotation);
    return {x:b.cx+(dx*c-dy*s)/(t.scale*(t.flipX?-1:1)),y:b.cy+(dx*s+dy*c)/(t.scale*(t.flipY?-1:1))};
  }
  function unreflectPoint(p,mirrorX,mirrorY,angle){
    let x=p.x-TILE/2,y=p.y-TILE/2;const c=Math.cos(-angle),s=Math.sin(-angle),rx=x*c-y*s,ry=x*s+y*c;x=mirrorX?-rx:rx;y=mirrorY?-ry:ry;
    return {x:TILE/2+x,y:TILE/2+y};
  }
  function normaliseMarkTranslation(m){
    if(isDoodleProject())return;
    const b=markGeometryBounds(m),t=markTransformValues(m),centre={x:b.cx+t.x,y:b.cy+t.y},canonical=canonicalPoint(centre.x,centre.y);
    m.transformX=t.x+canonical.x-centre.x;m.transformY=t.y+canonical.y-centre.y;
  }
  function markPrimaryBounds(m){
    const b=markTransformedBounds(m),canonical=canonicalPoint(b.cx,b.cy),dx=canonical.x-b.cx,dy=canonical.y-b.cy;
    return {minX:b.minX+dx,maxX:b.maxX+dx,minY:b.minY+dy,maxY:b.maxY+dy,cx:b.cx+dx,cy:b.cy+dy};
  }

  function pointerPressure(e,fallback=.5){
    if(e?.pointerType!=="pen")return 1;
    const pressure=Number(e.pressure);return Number.isFinite(pressure)&&pressure>0?clamp(pressure,.01,1):clamp(Number(fallback)||.5,.01,1);
  }
  function pressureScale(m,value){
    const min=clamp(Number(m?.pressureMin??18)/100,.05,.8),sensitivity=clamp(Number(m?.pressureSensitivity??100)/100,0,1),pressure=clamp(Number.isFinite(Number(value))?Number(value):1,.01,1);
    const response=1-(1-pressure)*sensitivity;
    return min+(1-min)*response;
  }
  function brushWidthAtPressure(m,style,pressure){
    const styleFactor=style==="pencil"?.72:style==="marker"?1.8:1;
    return m.width*styleFactor*(m.pressureWidth?pressureScale(m,pressure):1);
  }
  function stabilisePressure(previous,raw){
    const factor={off:1,light:.82,medium:.64,strong:.48}[$("strokeStabilisation")?.value||"off"]||1;
    const prior=clamp(Number(previous)||Number(raw)||.5,.01,1),next=clamp(Number(raw)||prior,.01,1);
    return prior+(next-prior)*factor;
  }
  function strokeStabilisationBase(){
    return {off:1,light:.76,medium:.56,strong:.38}[$("strokeStabilisation")?.value||"off"]||1;
  }
  function stabiliseStrokePoint(last,raw){
    const base=strokeStabilisationBase();if(base>=.999)return raw;
    const distance=Math.hypot(raw.x-last.x,raw.y-last.y),factor=clamp(base+Math.min(.34,distance/95),base,.9);
    return {x:last.x+(raw.x-last.x)*factor,y:last.y+(raw.y-last.y)*factor};
  }
  function drawMark(c,m,alphaMultiplier=1){
    const pts=m.points;if(!pts.length)return;
    const opacity=clamp(Number(m.opacity??1),.05,1)*clamp(Number(alphaMultiplier??1),0,1),style=m.brushStyle||"ink";
    c.save();c.strokeStyle=m.color;c.fillStyle=m.color;c.lineWidth=m.width;
    c.lineCap="round";c.lineJoin="round";c.globalAlpha=opacity;
    if(m.type==="eraser"){
      c.globalCompositeOperation="destination-out";c.globalAlpha=1;c.lineWidth=m.width;
      c.beginPath();c.moveTo(pts[0].x,pts[0].y);if(pts.length===1)c.lineTo(pts[0].x+.01,pts[0].y+.01);else for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);c.stroke();c.restore();return;
    }
    if(m.type==="bucket"){
      c.beginPath();
      for(const path of markPointSets(m)){
        if(path.length<3)continue;c.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)c.lineTo(path[i].x,path[i].y);c.closePath();
      }
      c.fill("evenodd");c.restore();return;
    }
    if(m.type==="rect"||m.type==="ellipse"){
      const a=pts[0],b=pts[pts.length-1];
      c.beginPath();
      if(m.type==="rect") c.rect(a.x,a.y,b.x-a.x,b.y-a.y);
      else c.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(.1,Math.abs(b.x-a.x)/2),Math.max(.1,Math.abs(b.y-a.y)/2),0,0,Math.PI*2);
      if(m.fill)c.fill();else c.stroke();
    }else if(m.type==="gradient"){
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const p of pts){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}
      let gradient;
      if(m.gradientType==="radial")gradient=c.createRadialGradient((left+right)/2,(top+bottom)/2,0,(left+right)/2,(top+bottom)/2,Math.max(1,Math.hypot(right-left,bottom-top)/2));
      else{let x0=left,y0=top,x1=right,y1=bottom;const direction=m.gradientDirection||"diagonal";if(direction==="horizontal"){y0=y1=(top+bottom)/2;}if(direction==="vertical"){x0=x1=(left+right)/2;}gradient=c.createLinearGradient(x0,y0,x1===x0?x1+1:x1,y1===y0?y1+1:y1);}
      gradient.addColorStop(0,m.color);gradient.addColorStop(1,m.endColor||"#ffffff");c.fillStyle=gradient;
      c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);c.closePath();c.fill();
    }else{
      const path=()=>{c.beginPath();c.moveTo(pts[0].x,pts[0].y);if(pts.length===1)c.lineTo(pts[0].x+.01,pts[0].y+.01);else if(m.type==="line")c.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);else for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);};
      if(m.type==="freefill"){path();c.closePath();c.fill();}
      else if(m.type==="brush"&&style==="stamp"){
        const spacing=Math.max(4,m.width*1.65),shape=m.stampShape||"leaf";let carry=spacing;
        const stamp=(x,y,angle)=>{c.save();c.translate(x,y);c.rotate(angle);const r=Math.max(1,m.width*.46);c.beginPath();
          if(shape==="dot"){c.arc(0,0,r,0,Math.PI*2);}
          else if(shape==="star"){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();}
          else{c.ellipse(0,0,r*.52,r,0,0,Math.PI*2);c.moveTo(0,-r);c.lineTo(0,r);}
          c.fill();c.restore();};
        stamp(pts[0].x,pts[0].y,0);
        for(let i=1;i<pts.length;i++){let x1=pts[i-1].x,y1=pts[i-1].y,dx=pts[i].x-x1,dy=pts[i].y-y1,len=Math.hypot(dx,dy),dist=carry;while(dist<=len){const t=dist/len;stamp(x1+dx*t,y1+dy*t,Math.atan2(dy,dx));dist+=spacing;}carry=dist-len;}
      }else{
        c.lineWidth=style==="pencil"?m.width*.72:style==="marker"?m.width*1.8:m.width;
        if(style==="pencil")c.globalAlpha=opacity*.68;
        if(style==="marker"){c.globalAlpha=opacity*.36;c.globalCompositeOperation="multiply";}
        if(m.pressureWidth&&m.type==="brush"){
          if(pts.length===1){
            c.beginPath();c.arc(pts[0].x,pts[0].y,brushWidthAtPressure(m,style,pts[0].p)/2,0,Math.PI*2);c.fill();
          }else{
            for(let i=1;i<pts.length;i++){
              const a=pts[i-1],b=pts[i],pressure=((Number(a.p)||1)+(Number(b.p)||1))/2;
              c.lineWidth=brushWidthAtPressure(m,style,pressure);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
            }
          }
        }else{path();c.stroke();}
        if(style==="texture"&&Number(m.texture||0)>0){
          const amount=clamp(Number(m.texture)||0,0,1),rng=mulberry32(hashString(String(m.id)+"texture")),step=Math.max(4,m.width*(1.4-amount));
          c.globalCompositeOperation="source-over";c.globalAlpha=opacity*(.3+amount*.55);c.fillStyle=m.color;
          for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],len=Math.hypot(b.x-a.x,b.y-a.y),count=Math.min(80,Math.ceil(len/step));for(let j=0;j<count;j++){const t=(j+rng())/Math.max(1,count),x=a.x+(b.x-a.x)*t+(rng()-.5)*m.width*.6,y=a.y+(b.y-a.y)*t+(rng()-.5)*m.width*.6,pressure=(Number(a.p)||1)*(1-t)+(Number(b.p)||1)*t,r=Math.max(.45,m.width*(m.pressureWidth?pressureScale(pressure):1)*(.035+amount*.07)*rng());c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}}
        }
      }
    }
    c.restore();
  }
  function drawOneMarkWrappedLogical(c,m,clipW,clipH,basis,effectiveOpacity=1){
    for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
      if(!markHasTransform(m)){
        const transformedPaths=m.type==="bucket"?markPointSets(m).map(path=>path.map(p=>reflectPoint(p,mirrorX,mirrorY,angle))):null;
        const transformed={...m,points:m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle)),...(transformedPaths?{paths:transformedPaths}:{})};
        const bounds=markGeometryBounds(transformed),pad=Math.max(0,Number(m.width)||0);
        const copies=artworkCopiesForBounds(bounds.minX-pad,bounds.maxX+pad,bounds.minY-pad,bounds.maxY+pad,clipW,clipH,basis);
        for(const copy of copies){c.save();c.translate(copy.x,copy.y);drawMark(c,transformed,effectiveOpacity);c.restore();}
      }else{
        const bounds=markTransformedBounds(m,mirrorX,mirrorY,angle),copies=artworkCopiesForBounds(bounds.minX,bounds.maxX,bounds.minY,bounds.maxY,clipW,clipH,basis);
        for(const copy of copies){
          c.save();c.translate(copy.x,copy.y);applySymmetryContext(c,mirrorX,mirrorY,angle);applyMarkTransformContext(c,m);drawMark(c,m,effectiveOpacity);c.restore();
        }
      }
    }
  }
  function drawSingleMarkWrapped(c,W,H,baseW,baseH,style,m,effectiveOpacity=1){
    const sx=baseW/TILE,sy=baseH/TILE,clipW=W/sx,clipH=H/sy,basis=repeatBasis(TILE,TILE,style);
    c.save();c.scale(sx,sy);drawOneMarkWrappedLogical(c,m,clipW,clipH,basis,effectiveOpacity);c.restore();
  }
  function drawMarksWrapped(c,W,H,baseW=TILE,baseH=TILE,style=projectRepeatStyle(),layerId=null,layerOpacity=1,forExport=false){
    for(const m of state.marks){
      const layer=layerForArtwork(m,BASE_LAYER_IDS.drawing);
      if((layerId&&layer?.id!==layerId)||!layerIsRenderable(layer,forExport)||!m.points.length)continue;
      drawSingleMarkWrapped(c,W,H,baseW,baseH,style,m,layerId?layerOpacity:layer.opacity);
    }
  }
  function renderLayerSurface(W,H,baseW,baseH,style,layer,mappedItems,basis,forExport=false){
    const surface=document.createElement("canvas");surface.width=W;surface.height=H;const lc=surface.getContext("2d");
    for(const item of mappedItems)if(layerForArtwork(item,BASE_LAYER_IDS.motifs)?.id===layer.id)drawWrapped(lc,item,W,H,false,basis,1);
    for(const mark of state.marks){
      if(layerForArtwork(mark,BASE_LAYER_IDS.drawing)?.id!==layer.id||!mark.points?.length)continue;
      if(mark.alphaLocked&&mark.type!=="eraser"){
        const paint=document.createElement("canvas");paint.width=W;paint.height=H;const pc=paint.getContext("2d");
        drawSingleMarkWrapped(pc,W,H,baseW,baseH,style,mark,1);
        lc.save();lc.globalCompositeOperation="source-atop";lc.drawImage(paint,0,0);lc.restore();
        paint.width=1;paint.height=1;
      }else drawSingleMarkWrapped(lc,W,H,baseW,baseH,style,mark,1);
    }
    return surface;
  }

  function makeTileCanvas(W,H,baseW=W,baseH=H,style=projectRepeatStyle(),forExport=false){
    const out=document.createElement("canvas"); out.width=W; out.height=H;
    const c=out.getContext("2d");
    if(!$("transparent").checked){ c.fillStyle=$("bg").value; c.fillRect(0,0,W,H); }

    // Keep the legacy direct-render path on layers without erasers so existing brush
    // blending is byte-for-byte unchanged. Only layers with eraser strokes are isolated.
    const sx=baseW/TILE, sy=baseH/TILE;
    const uniform=Math.sqrt(sx*sy);
    const mapped=state.items.map(it=>({...it,x:it.x*sx,y:it.y*sy,scale:it.scale*uniform}));
    const basis=repeatBasis(baseW,baseH,style);
    let clipBaseSurface=null;
    for(let layerIndex=0;layerIndex<state.layers.length;layerIndex++){
      const layer=state.layers[layerIndex],renderable=layerIsRenderable(layer,forExport);
      if(!renderable){if(!layer.clipToBelow)clipBaseSurface=null;continue;}
      const hasEraser=state.marks.some(m=>m.type==="eraser"&&layerForArtwork(m,BASE_LAYER_IDS.drawing)?.id===layer.id&&m.points?.length);
      const hasAlphaLocked=state.marks.some(m=>m.alphaLocked&&m.type!=="eraser"&&layerForArtwork(m,BASE_LAYER_IDS.drawing)?.id===layer.id&&m.points?.length);
      const nextLayer=state.layers[layerIndex+1],needsClipBase=!!nextLayer?.clipToBelow;
      const needsSurface=hasEraser||hasAlphaLocked||layer.clipToBelow||needsClipBase;
      if(!needsSurface){
        for(const item of mapped){if(layerForArtwork(item,BASE_LAYER_IDS.motifs)?.id===layer.id)drawWrapped(c,item,W,H,false,basis,layer.opacity);}
        drawMarksWrapped(c,W,H,baseW,baseH,style,layer.id,layer.opacity,forExport);
        clipBaseSurface=null;
        continue;
      }
      const surface=renderLayerSurface(W,H,baseW,baseH,style,layer,mapped,basis,forExport),lc=surface.getContext("2d");
      if(layer.clipToBelow){
        if(!clipBaseSurface)continue;
        lc.save();lc.globalCompositeOperation="destination-in";lc.drawImage(clipBaseSurface,0,0);lc.restore();
      }
      c.save();c.globalAlpha=layer.opacity;c.drawImage(surface,0,0);c.restore();
      if(!layer.clipToBelow)clipBaseSurface=surface;
    }
    return out;
  }

  const BUCKET_SAMPLE_SIZE=1800;
  let bucketBusy=false;
  function makeBucketSampleCanvas(size,layerId,sampleVisible){
    if(sampleVisible)return makeTileCanvas(size,size,size,size,projectRepeatStyle(),false);
    const scale=size/TILE,basis=repeatBasis(size,size,projectRepeatStyle()),layer=layerById(layerId);
    const mapped=state.items.map(item=>({...item,x:item.x*scale,y:item.y*scale,scale:item.scale*scale}));
    if(!layer){const out=document.createElement("canvas");out.width=size;out.height=size;return out;}
    return renderLayerSurface(size,size,size,size,projectRepeatStyle(),layer,mapped,basis,false);
  }
  function bucketPixelDistance(data,index,target){
    const a=data[index+3],ta=target[3],af=a/255,taf=ta/255;
    const dr=data[index]*af-target[0]*taf,dg=data[index+1]*af-target[1]*taf,db=data[index+2]*af-target[2]*taf,da=(a-ta)*1.5;
    return Math.hypot(dr,dg,db,da)/(255*Math.sqrt(5.25))*100;
  }
  function bucketNeighbourIndex(x,y,dx,dy,w,h,wrap,style){
    let nx=x+dx,ny=y+dy;
    if(!wrap){
      if(nx<0||nx>=w||ny<0||ny>=h)return -1;
      return ny*w+nx;
    }
    if(style==="half-drop"){
      if(nx<0)nx+=w;else if(nx>=w)nx-=w;
      if(ny<0){ny+=h;nx=(nx+w/2)%w;}
      else if(ny>=h){ny-=h;nx=(nx-w/2+w)%w;}
    }else if(style==="brick"){
      if(ny<0)ny+=h;else if(ny>=h)ny-=h;
      if(nx<0){nx+=w;ny=(ny+h/2)%h;}
      else if(nx>=w){nx-=w;ny=(ny-h/2+h)%h;}
    }else{
      nx=(nx+w)%w;ny=(ny+h)%h;
    }
    return ny*w+nx;
  }
  function floodBucketMask(imageData,seedX,seedY,tolerance,wrap,style){
    const w=imageData.width,h=imageData.height,data=imageData.data,n=w*h,states=new Uint8Array(n),queue=new Uint32Array(n);
    const seed=seedY*w+seedX,target=[data[seed*4],data[seed*4+1],data[seed*4+2],data[seed*4+3]],limit=clamp(Number(tolerance)||0,0,100);
    let head=0,tail=0;states[seed]=1;queue[tail++]=seed;
    while(head<tail){
      const index=queue[head++],x=index%w,y=Math.floor(index/w);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const next=bucketNeighbourIndex(x,y,dx,dy,w,h,wrap,style);if(next<0||states[next])continue;
        const matches=bucketPixelDistance(data,next*4,target)<=limit;states[next]=matches?1:2;if(matches)queue[tail++]=next;
      }
    }
    return {mask:states,count:tail,target};
  }
  function bucketBoundarySide(mask,w,h,x,y,side){
    const index=y*w+x;if(mask[index]!==1)return false;
    if(side===0)return y===0||mask[(y-1)*w+x]!==1;
    if(side===1)return x===w-1||mask[y*w+x+1]!==1;
    if(side===2)return y===h-1||mask[(y+1)*w+x]!==1;
    return x===0||mask[y*w+x-1]!==1;
  }
  function bucketEdgeStart(x,y,side){
    if(side===0)return {x,y};if(side===1)return {x:x+1,y};if(side===2)return {x:x+1,y:y+1};return {x,y:y+1};
  }
  function bucketEdgeEnd(x,y,side){
    if(side===0)return {x:x+1,y};if(side===1)return {x:x+1,y:y+1};if(side===2)return {x,y:y+1};return {x,y};
  }
  function bucketOutgoingEdges(mask,visited,w,h,vx,vy){
    const candidates=[[vx,vy,0],[vx-1,vy,1],[vx-1,vy-1,2],[vx,vy-1,3]],out=[];
    for(const [x,y,side] of candidates){
      if(x<0||x>=w||y<0||y>=h)continue;const index=y*w+x,bit=1<<side;
      if(bucketBoundarySide(mask,w,h,x,y,side)&&!(visited[index]&bit))out.push({x,y,side,dir:side});
    }
    return out;
  }
  function bucketRdp(points,epsilon){
    if(points.length<=2)return points.slice();const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]];
    while(stack.length){
      const [start,end]=stack.pop(),a=points[start],b=points[end],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;let best=-1,bestDist=-1;
      for(let i=start+1;i<end;i++){const p=points[i],t=len2?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len2,0,1):0,qx=a.x+t*dx,qy=a.y+t*dy,d=Math.hypot(p.x-qx,p.y-qy);if(d>bestDist){bestDist=d;best=i;}}
      if(best>start&&best<end&&bestDist>epsilon){keep[best]=1;stack.push([start,best],[best,end]);}
    }
    return points.filter((_,i)=>keep[i]);
  }
  function bucketSimplifyClosed(points,epsilon){
    if(points.length>1&&points[0].x===points.at(-1).x&&points[0].y===points.at(-1).y)points=points.slice(0,-1);
    if(points.length<=4)return points;
    let far=1,farDist=0;for(let i=1;i<points.length;i++){const d=(points[i].x-points[0].x)**2+(points[i].y-points[0].y)**2;if(d>farDist){farDist=d;far=i;}}
    const a=bucketRdp(points.slice(0,far+1),epsilon),b=bucketRdp(points.slice(far).concat([points[0]]),epsilon);
    return a.slice(0,-1).concat(b.slice(0,-1));
  }
  function bucketPolygonArea(points){
    let area=0;for(let i=0,j=points.length-1;i<points.length;j=i++)area+=points[j].x*points[i].y-points[i].x*points[j].y;return area/2;
  }
  function bucketContours(mask,w,h){
    const visited=new Uint8Array(w*h),paths=[],scaleX=TILE/w,scaleY=TILE/h,epsilon=Math.max(.75,Math.max(scaleX,scaleY)*1.8);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const index=y*w+x;if(mask[index]!==1)continue;
      for(let side=0;side<4;side++){
        const bit=1<<side;if((visited[index]&bit)||!bucketBoundarySide(mask,w,h,x,y,side))continue;
        let edge={x,y,side,dir:side},start=bucketEdgeStart(x,y,side),loop=[],closed=false,safety=0;
        while(edge&&safety++<w*h*2){
          const edgeIndex=edge.y*w+edge.x,edgeBit=1<<edge.side;if(visited[edgeIndex]&edgeBit)break;visited[edgeIndex]|=edgeBit;
          if(!loop.length)loop.push(bucketEdgeStart(edge.x,edge.y,edge.side));
          const end=bucketEdgeEnd(edge.x,edge.y,edge.side);loop.push(end);
          if(end.x===start.x&&end.y===start.y){closed=true;break;}
          const choices=bucketOutgoingEdges(mask,visited,w,h,end.x,end.y);if(!choices.length)break;
          const priority=delta=>delta===1?0:delta===0?1:delta===3?2:3;
          choices.sort((a,b)=>priority((a.dir-edge.dir+4)%4)-priority((b.dir-edge.dir+4)%4));edge=choices[0];
        }
        if(!closed||loop.length<4)continue;
        const logical=loop.map(p=>({x:p.x*scaleX,y:p.y*scaleY})),simplified=bucketSimplifyClosed(logical,epsilon);
        if(simplified.length>=3&&Math.abs(bucketPolygonArea(simplified))>.08)paths.push(simplified);
      }
    }
    return paths;
  }
  async function bucketFillAt(world,drawLayer){
    if(bucketBusy){setStatus("Bucket fill is already analysing a region.");return;}
    bucketBusy=true;state.dragStart=null;setStatus("Detecting bucket fill region…");
    await new Promise(resolve=>requestAnimationFrame(resolve));
    try{
      const size=BUCKET_SAMPLE_SIZE,sampleVisible=$("bucketSampleVisible").checked,tolerance=Number($("bucketTolerance").value)||0,started=performance.now();
      const source=makeBucketSampleCanvas(size,drawLayer.id,sampleVisible),sample=source.getContext("2d",{willReadFrequently:true}).getImageData(0,0,size,size);
      source.width=1;source.height=1;
      const point=isDoodleProject()?{x:clamp(world.x,0,TILE-.0001),y:clamp(world.y,0,TILE-.0001)}:canonicalPoint(world.x,world.y);
      const seedX=clamp(Math.floor(point.x/TILE*size),0,size-1),seedY=clamp(Math.floor(point.y/TILE*size),0,size-1);
      const result=floodBucketMask(sample,seedX,seedY,tolerance,!isDoodleProject(),projectRepeatStyle());
      const paths=bucketContours(result.mask,size,size),totalPoints=paths.reduce((sum,path)=>sum+path.length,0);
      if(!paths.length)throw new Error("No fillable region was found at that point.");
      if(totalPoints>25000)throw new Error("That region boundary is too complex to keep editable. Increase tolerance slightly or simplify the source artwork.");
      saveHistory();
      const points=paths.flat().map(p=>({...p})),mark={id:state.nextId++,layerId:drawLayer.id,type:"bucket",alphaLocked:!!drawLayer.alphaLock,color:$("ink").value,width:0,fill:true,opacity:(parseInt($("inkOpacity").value,10)||100)/100,points,paths,bucketTolerance:tolerance,bucketSampleVisible:sampleVisible};
      state.marks.push(mark);setSelection([mark.id],mark.id);renderAll();
      const pct=Math.round(result.count/(size*size)*1000)/10,elapsed=Math.round(performance.now()-started),estimatedWorkingBytes=size*size*10;
      window.PatternForgeBucketMetrics={sampleSize:size,estimatedWorkingBytes,elapsedMs:elapsed,filledPixels:result.count,fillRatio:result.count/(size*size),targetRgba:[...result.target],contours:paths.length,points:totalPoints};
      setStatus(`Bucket filled ${pct}% of the tile as editable vector contours in ${elapsed} ms.`);
    }catch(err){setStatus(err?.message||"Bucket fill could not analyse that region.");}
    finally{bucketBusy=false;}
  }

  const masterPreviewData=()=>{
    const mult=exportMultipliers(),base=360,thumb=makeTileCanvas(base*mult.x,base*mult.y,base,base,projectRepeatStyle(),true);
    return {dataUrl:thumb.toDataURL("image/png"),repeatWidthUnits:mult.x,repeatHeightUnits:mult.y,style:projectRepeatStyle(),wPx:4000*mult.x,hPx:4000*mult.y};
  };
  window.PatternForgeMasterPreview=masterPreviewData;
  window.PatternForgeProductPreview=masterPreviewData; // compatibility alias
  function renderPreview(){
    const mult=exportMultipliers(),base=450,thumb=makeTileCanvas(base*mult.x,base*mult.y,base,base,projectRepeatStyle(),true);
    const data=thumb.toDataURL("image/png");
    const p=$("preview");
    p.style.backgroundImage=`url("${data}")`;
    const sc=parseInt($("previewScale").value)||33;
    $("previewScaleLabel").textContent=sc+"%";
    p.style.backgroundSize=`${sc}% auto`;
  }

  function updateQuality(){
    const box=$("quality");
    if(state.items.length===0){
      box.className="warning ok";
      box.textContent=state.marks.length?"Drawn lines and shapes render directly at the master raster resolution.":"Add artwork to check raster-source enlargement.";
      return;
    }
    const spec=getExportSpec(),sx=spec.wPx/TILE,sy=spec.hPx/TILE,uniform=Math.sqrt(sx*sy);
    let maxUpscale=1,rasterCount=0,vectorCount=0;
    for(const item of state.items){
      const layer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item);if(!a||!layerIsRenderable(layer,true))continue;
      if(a.vector){vectorCount++;continue;}
      rasterCount++;
      const renderedW=a.w*item.scale*uniform,renderedH=a.h*item.scale*uniform;
      maxUpscale=Math.max(maxUpscale,renderedW/Math.max(1,a.w),renderedH/Math.max(1,a.h));
    }
    if(rasterCount===0){
      box.className="warning ok";
      box.textContent="All "+vectorCount+" placed motif"+(vectorCount===1?" is":"s are")+" vector source"+(vectorCount===1?"":"s")+". SVG output is resolution-independent.";
      return;
    }
    if(maxUpscale<=1.05){
      box.className="warning ok";
      box.textContent="Raster sources are used at native size or reduced in the master raster."+(vectorCount?" "+vectorCount+" SVG motif"+(vectorCount===1?" is":"s are")+" resolution-independent.":"");
    }else if(maxUpscale<=2){
      box.className="warning";
      box.innerHTML="Largest raster-source enlargement: <strong>"+maxUpscale.toFixed(1)+"×</strong>. Inspect sharpness in the master raster before distributing the design.";
    }else{
      box.className="warning";
      box.innerHTML="Largest raster-source enlargement: <strong>"+maxUpscale.toFixed(1)+"×</strong>. The design remains adaptable, but the raster master may soften at this enlargement; replace that source or use vector artwork if available.";
    }
  }

  function updatePrintEligibility(){
    // Legacy function name retained for project/backward compatibility.
    const readout=$("focusPrintReadout"),list=$("platformChecks"),spec=getExportSpec(),doodle=isDoodleProject();
    if(readout)readout.textContent=(doodle?"Master raster canvas: ":"Complete master repeat cell: ")+spec.wPx.toLocaleString()+" × "+spec.hPx.toLocaleString()+" px.";
    if(list)list.innerHTML='<div class="platformCheck good"><strong>Adaptable master design</strong> No physical size is assigned here. Choose scale later in the software, printer or production workflow where the design is used.</div>';
  }

  function rebuildSelectedPanel(){
    const panel=$("selectedPanel"),selected=selectedArtwork(),item=selectedItem(),mark=selectedMark();
    panel.dataset.selectionCount=String(selected.length);
    panel.dataset.selectionAddMode=state.selectionAddMode?"true":"false";
    const groupIds=new Set(selected.map(record=>record.artwork.groupId).filter(Boolean));
    const grouped=selected.length>1&&groupIds.size===1&&selected.every(record=>record.artwork.groupId);
    panel.dataset.selectionGrouped=grouped?"true":"false";
    const recolourable=selected.filter(record=>record.kind==="mark"&&record.artwork.type!=="eraser").map(record=>record.artwork);
    panel.dataset.recolourableCount=String(recolourable.length);
    panel.dataset.selectionColour=recolourable[0]?.color||"";
    if(selected.length>1){
      panel.innerHTML='<div class="field"><label>Selection</label><div class="mini"><strong>'+selected.length+' artwork items</strong>'+(grouped?' · grouped':'')+'</div><p class="help">Drag any selected artwork to move the selection together. Use Add selection in the UX2 toolbar to add or remove artwork.</p></div><div class="btns"><button id="duplicateSel" class="btn">Duplicate selection</button><button id="deleteSel" class="btn danger">Delete selection</button>'+(grouped?'<button id="ungroupSel" class="btn">Ungroup</button>':'<button id="groupSel" class="btn">Group</button>')+'</div>';
      $("duplicateSel").onclick=duplicateSelectedArtwork;
      $("deleteSel").onclick=deleteSelectedArtwork;
      if($("groupSel"))$("groupSel").onclick=groupSelectedArtwork;
      if($("ungroupSel"))$("ungroupSel").onclick=ungroupSelectedArtwork;
      return;
    }
    if(mark){
      const t=markTransformValues(mark),pct=Math.round(t.scale*100),rawDeg=t.rotation*180/Math.PI,deg=Math.round(((rawDeg+180)%360+360)%360-180),layer=layerForArtwork(mark,BASE_LAYER_IDS.drawing);
      const typeName={brush:"Brush stroke",line:"Line",rect:"Rectangle",ellipse:"Ellipse",freefill:"Freehand fill",bucket:"Bucket fill",gradient:"Gradient fill"}[mark.type]||"Drawn mark";
      panel.innerHTML=`
        <div class="field">
          <label>Artwork</label>
          <div class="mini"><strong>${typeName}</strong> · ${escapeHtml(layer?.name||"Drawing")}</div>
          <p class="help">Drag the mark to move it, use the curved-arrow handle to rotate, or a corner dot to resize. The original stroke points remain intact for seamless wrapping.</p>
        </div>
        <div class="field"><label for="selScale">Resize <span id="selScaleLabel">${pct}%</span></label><input id="selScale" type="range" min="1" max="600" value="${clamp(pct,1,600)}"></div>
        <div class="field"><label for="selRot">Rotation <span id="selRotLabel">${deg}°</span></label><input id="selRot" type="range" min="-180" max="180" value="${clamp(deg,-180,180)}"></div>
        <div class="field"><label for="selOpacity">Opacity <span id="selOpacityLabel">${Math.round((mark.opacity??1)*100)}%</span></label><input id="selOpacity" type="range" min="5" max="100" value="${Math.round((mark.opacity??1)*100)}"></div>
        <div class="btns"><button id="duplicateSel" class="btn">Duplicate</button><button id="deleteSel" class="btn danger">Delete</button><button id="frontSel" class="btn">Bring front</button><button id="backSel" class="btn">Send back</button></div>`;
      $("selScale").addEventListener("input",e=>{mark.transformScale=clamp(parseFloat(e.target.value)/100,.01,60);$("selScaleLabel").textContent=e.target.value+"%";renderAll(false);});
      $("selRot").addEventListener("input",e=>{mark.transformRotation=parseFloat(e.target.value)*Math.PI/180;$("selRotLabel").textContent=e.target.value+"°";renderAll(false);});
      $("selOpacity").addEventListener("input",e=>{mark.opacity=parseFloat(e.target.value)/100;$("selOpacityLabel").textContent=e.target.value+"%";renderAll(false);});
      $("duplicateSel").onclick=()=>{saveHistory();const base=markTransformValues(mark),copy={...JSON.parse(JSON.stringify(mark)),id:state.nextId++,transformX:base.x+40,transformY:base.y+40,transformScale:base.scale,transformRotation:base.rotation};state.marks.push(copy);state.selectedId=copy.id;renderAll();};
      $("deleteSel").onclick=()=>{saveHistory();state.marks=state.marks.filter(m=>m.id!==mark.id);state.selectedId=null;renderAll();};
      $("frontSel").onclick=()=>{saveHistory();state.marks=state.marks.filter(m=>m.id!==mark.id);state.marks.push(mark);renderAll();};
      $("backSel").onclick=()=>{saveHistory();state.marks=state.marks.filter(m=>m.id!==mark.id);state.marks.unshift(mark);renderAll();};
      return;
    }
    if(!item){ panel.innerHTML='<div class="empty">Select an imported motif or drawn mark to move, resize, rotate or delete it.</div>'; return; }
    const a=assetOf(item);
    const pct=Math.round(item.scale*1000)/10;
    const deg=Math.round(item.rotation*180/Math.PI);
    panel.innerHTML=`
      <div class="field">
        <label>Artwork</label>
        <div class="mini"><strong>${escapeHtml(a?.name||"motif")}</strong></div>
        <p class="help">On the tile, drag the four-arrow handle to move, the curved-arrow handle to rotate, or a corner dot to resize.</p>
      </div>
      <div class="field">
        <label for="selScale">Resize · drag a corner or use slider <span id="selScaleLabel">${pct}%</span></label>
        <input id="selScale" type="range" min="1" max="600" value="${clamp(Math.round(item.scale*100),1,600)}">
      </div>
      <div class="field">
        <label for="selRot">Rotation <span id="selRotLabel">${deg}°</span></label>
        <input id="selRot" type="range" min="-180" max="180" value="${clamp(deg,-180,180)}">
      </div>
      <div class="field">
        <label for="selOpacity">Opacity <span id="selOpacityLabel">${Math.round(item.opacity*100)}%</span></label>
        <input id="selOpacity" type="range" min="5" max="100" value="${Math.round(item.opacity*100)}">
      </div>
      <div class="btns">
        <button id="duplicateSel" class="btn">Duplicate</button>
        <button id="deleteSel" class="btn danger">Delete</button>
        <button id="frontSel" class="btn">Bring front</button>
        <button id="backSel" class="btn">Send back</button>
      </div>`;
    $("selScale").addEventListener("input",e=>{
      item.scale=parseFloat(e.target.value)/100;
      $("selScaleLabel").textContent=e.target.value+"%"; renderAll(false);
    });
    $("selRot").addEventListener("input",e=>{
      item.rotation=parseFloat(e.target.value)*Math.PI/180;
      $("selRotLabel").textContent=e.target.value+"°"; renderAll(false);
    });
    $("selOpacity").addEventListener("input",e=>{
      item.opacity=parseFloat(e.target.value)/100;
      $("selOpacityLabel").textContent=e.target.value+"%"; renderAll(false);
    });
    $("duplicateSel").onclick=()=>{
      saveHistory();
      const copy={...item,id:state.nextId++,x:(item.x+40)%TILE,y:(item.y+40)%TILE};delete copy.scatterGenerated;
      state.items.push(copy);state.selectedId=copy.id;renderAll();
    };
    $("deleteSel").onclick=()=>{
      saveHistory();state.items=state.items.filter(i=>i.id!==item.id);state.selectedId=null;renderAll();
    };
    $("frontSel").onclick=()=>{
      saveHistory();state.items=state.items.filter(i=>i.id!==item.id);state.items.push(item);renderAll();
    };
    $("backSel").onclick=()=>{
      saveHistory();state.items=state.items.filter(i=>i.id!==item.id);state.items.unshift(item);renderAll();
    };
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

  function renderAll(rebuildSelected=true,refreshPreview=true){
    state.pendingPreview ||= refreshPreview;
    state.pendingSelected ||= rebuildSelected;
    if(!state.interactionActive)scheduleAutosave();
    if(state.renderQueued) return;
    state.renderQueued=true;
    requestAnimationFrame(()=>{
      state.renderQueued=false;
      drawEditor();
      if(state.interactionActive){
        window.PatternForgeInteractionMetrics.deferredWorkFrames++;
        return;
      }
      if(state.pendingPreview)renderPreview();
      updateQuality();
      if(state.pendingSelected){rebuildSelectedPanel();rebuildLayerUI();}
      state.pendingPreview=false;state.pendingSelected=false;
    });
  }

  function scatterRadius(item){
    const asset=assetOf(item);if(!asset)return 0;
    return Math.hypot(asset.w*item.scale,asset.h*item.scale)/2;
  }
  function scatterCandidateFits(candidate,existing,minSpacing,allowOverlap){
    for(const other of existing){
      const delta=nearestLatticeDelta(candidate.x,candidate.y,other.x,other.y),distance=Math.sqrt(delta.distance);
      const required=minSpacing+(allowOverlap?0:scatterRadius(candidate)+scatterRadius(other));
      if(distance<required)return false;
    }
    return true;
  }
  function freezeScatter(){
    const generated=state.items.filter(item=>item.scatterGenerated);if(!generated.length){setStatus("There are no generated scatter items to freeze.");return;}
    saveHistory();for(const item of generated)delete item.scatterGenerated;renderAll();setStatus("Frozen "+generated.length+" scatter item"+(generated.length===1?"":"s")+" as ordinary editable artwork.");
  }
  function generate(){
    if(isDoodleProject()){setStatus("Image scatter is available in Pattern Projects. Doodle Projects keep one standalone canvas.");return;}
    if(state.assets.length===0){ setStatus("Add at least one drawing first."); return; }
    const n=clamp(parseInt($("count").value)||28,1,500);
    let lo=Math.max(1,parseFloat($("minScale").value)||18)/100;
    let hi=Math.max(1,parseFloat($("maxScale").value)||42)/100;
    if(hi<lo)[lo,hi]=[hi,lo];
    const rot=clamp(parseFloat($("rotationAmount").value)||0,0,180)*Math.PI/180;
    const minSpacing=TILE*clamp(parseFloat($("scatterSpacing").value)||0,0,50)/100;
    const allowOverlap=$("scatterOverlap").checked,preserveManual=$("scatterPreserveManual").checked;
    const rand=mulberry32(hashString($("seed").value||"pattern"));
    saveHistory();
    state.items=preserveManual?state.items.filter(item=>!item.scatterGenerated):[];
    const protectedCount=state.items.length;
    let placed=0;
    for(let i=0;i<n;i++){
      const a=state.assets[Math.floor(rand()*state.assets.length)];
      const base=TILE/Math.max(a.w,a.h),normalized=base*(lo+(hi-lo)*rand());
      let accepted=null;
      for(let attempt=0;attempt<140;attempt++){
        const candidate={id:state.nextId++,assetId:a.id,layerId:motifTargetLayerId(),x:rand()*TILE,y:rand()*TILE,scale:normalized,rotation:(rand()*2-1)*rot,opacity:1,scatterGenerated:true};
        if(scatterCandidateFits(candidate,state.items,minSpacing,allowOverlap)){accepted=candidate;break;}
      }
      if(!accepted)continue;
      state.items.push(accepted);placed++;
    }
    clearSelection();
    const constrained=placed<n?(" Placed "+placed+" of "+n+" because the spacing/overlap limits are tight."):"";
    const protectedNote=preserveManual&&protectedCount?(" Preserved "+protectedCount+" hand-positioned item"+(protectedCount===1?"":"s")+"."):"";
    setStatus("Generated "+placed+" wrapped motif cop"+(placed===1?"y":"ies")+"."+protectedNote+constrained);
    renderAll();
  }

  function setStatus(msg){ $("status").textContent=msg; }

  function pointerPos(e){
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};
  }
  function historySnapshot(){
    return {
      items:state.items,marks:state.marks,layers:state.layers,activeLayerId:state.activeLayerId,nextId:state.nextId,
      appearance:{background:$("bg").value,transparent:$("transparent").checked,palette:[...state.colorPalette],ink:$("ink").value,
        settings:{neighborOpacity:$("neighborOpacity").value,count:$("count").value,minScale:$("minScale").value,maxScale:$("maxScale").value,rotationAmount:$("rotationAmount").value,scatterSpacing:$("scatterSpacing").value,scatterOverlap:$("scatterOverlap").checked,scatterPreserveManual:$("scatterPreserveManual").checked,focusPrintSize:$("focusPrintSize").value,focusPrintUnit:$("focusPrintUnit").value}}
    };
  }
  function saveHistory(){
    state.past.push(JSON.stringify(historySnapshot()));
    if(state.past.length>40)state.past.shift();
    state.future=[];
  }
  function applyHistoryAppearance(appearance){
    if(!appearance)return;
    if(typeof appearance.background==="string")$("bg").value=appearance.background;
    if(appearance.transparent!==undefined)$("transparent").checked=isDoodleProject()?true:!!appearance.transparent;
    if(Array.isArray(appearance.palette))state.colorPalette=[...appearance.palette];
    if(typeof appearance.ink==="string")setInkColour(appearance.ink);
    const s=appearance.settings||{};
    for(const id of ["neighborOpacity","count","minScale","maxScale","rotationAmount","scatterSpacing"])if(s[id]!==undefined)$(id).value=s[id];
    for(const id of ["scatterOverlap","scatterPreserveManual"])if(s[id]!==undefined)$(id).checked=!!s[id];
    rebuildPaletteUI();updateSettingReadouts();
  }
  function restoreHistory(from,to){
    if(!from.length)return;
    to.push(JSON.stringify(historySnapshot()));
    const s=JSON.parse(from.pop());
    state.items=s.items;state.marks=s.marks;state.layers=normaliseLayers(s.layers);state.activeLayerId=layerById(s.activeLayerId)?.id||layerById(BASE_LAYER_IDS.drawing)?.id||state.layers[state.layers.length-1]?.id||state.layers[0]?.id||"";state.nextId=s.nextId;
    applyHistoryAppearance(s.appearance);clearSelection();state.activeMark=null;renderAll();
  }
  function startAgain(){
    const itemCount=state.items.length;
    const markCount=state.marks.length;
    if(!itemCount&&!markCount){setStatus("Nothing to clear — the canvas is already empty.");return;}
    const parts=[];
    if(itemCount)parts.push(`${itemCount} placed image${itemCount===1?"":"s"}`);
    if(markCount)parts.push(`${markCount} drawing mark${markCount===1?"":"s"}`);
    const summary=parts.join(" and ");
    if(!confirm(`Start again and clear ${summary}? Project setup, imported images, layers and settings will be kept. You can restore this once with Undo.`))return;
    saveHistory();
    state.items=[];
    state.marks=[];
    state.selectedId=null;
    state.activeMark=null;
    state.dragging=false;
    state.resizeState=null;
    state.transformState=null;
    state.dragStart=null;
    state.snapGuides={x:null,y:null};
    renderAll();
    setStatus(`Started again — cleared ${summary}. Project setup and image library kept.`);
  }
  function clearSnapGuides(){state.snapGuides={x:null,y:null};}
  function smartSnapAxis(v,halfExtent){
    if(!$("snapOn").checked)return {value:v,guide:null};
    const strongLimit=18/viewScale(),gridLimit=10/viewScale();
    const strong=[{value:TILE/2,guide:TILE/2}];
    if(halfExtent<=TILE/2){strong.push({value:halfExtent,guide:0},{value:TILE-halfExtent,guide:TILE});}
    let best=null;
    for(const candidate of strong){
      const distance=Math.abs(candidate.value-v);
      if(distance<=strongLimit&&(!best||distance<best.distance))best={...candidate,distance};
    }
    if(best)return {value:best.value,guide:best.guide};
    const step=TILE/(parseInt($("gridCount").value,10)||16),gridTarget=Math.round(v/step)*step;
    return Math.abs(gridTarget-v)<=gridLimit?{value:gridTarget,guide:null}:{value:v,guide:null};
  }
  function smartSnapPosition(x,y,halfW=0,halfH=0){
    const sx=smartSnapAxis(x,Math.max(0,halfW)),sy=smartSnapAxis(y,Math.max(0,halfH));
    state.snapGuides={x:sx.guide,y:sy.guide};
    return {x:sx.value,y:sy.value};
  }
  function itemSnapHalfExtents(item){
    const a=assetOf(item);if(!a)return {x:0,y:0};
    const iw=a.w*item.scale,ih=a.h*item.scale,c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation));
    return {x:(iw*c+ih*s)/2,y:(iw*s+ih*c)/2};
  }
  function drawSnapGuides(c,sc){
    const guides=state.snapGuides||{};if(!Number.isFinite(guides.x)&&!Number.isFinite(guides.y))return;
    c.save();c.strokeStyle="rgba(204,82,62,.92)";c.lineWidth=2/sc;c.setLineDash([5/sc,4/sc]);c.beginPath();
    if(Number.isFinite(guides.x)){c.moveTo(guides.x,0);c.lineTo(guides.x,TILE);}
    if(Number.isFinite(guides.y)){c.moveTo(0,guides.y);c.lineTo(TILE,guides.y);}
    c.stroke();c.restore();
  }
  function wrappedDelta(a,b,size){
    let d=a-b;
    d=((d+size/2)%size+size)%size-size/2;
    return d;
  }
  function pointSegmentDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(len2<1e-9)return Math.hypot(p.x-a.x,p.y-a.y);
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len2,0,1),x=a.x+t*dx,y=a.y+t*dy;return Math.hypot(p.x-x,p.y-y);
  }
  function pointInPolygon(p,points){
    let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j],cross=((a.y>p.y)!=(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/((b.y-a.y)||1e-9)+a.x);if(cross)inside=!inside;
    }return inside;
  }
  function rawMarkHit(m,p,tolerance){
    const pts=m.points||[];if(!pts.length)return false;const first=pts[0],last=pts[pts.length-1],brush=m.brushStyle||"ink",strokeFactor=m.type==="brush"?(brush==="marker"?1.8:brush==="pencil"?.72:1):1,strokeRadius=Math.max(tolerance,(Number(m.width)||1)*strokeFactor/2);
    if(m.type==="rect"){
      const left=Math.min(first.x,last.x),right=Math.max(first.x,last.x),top=Math.min(first.y,last.y),bottom=Math.max(first.y,last.y),inside=p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;if(m.fill)return inside;
      return (p.x>=left-tolerance&&p.x<=right+tolerance&&(Math.abs(p.y-top)<=strokeRadius||Math.abs(p.y-bottom)<=strokeRadius))||(p.y>=top-tolerance&&p.y<=bottom+tolerance&&(Math.abs(p.x-left)<=strokeRadius||Math.abs(p.x-right)<=strokeRadius));
    }
    if(m.type==="ellipse"){
      const cx=(first.x+last.x)/2,cy=(first.y+last.y)/2,rx=Math.max(.1,Math.abs(last.x-first.x)/2),ry=Math.max(.1,Math.abs(last.y-first.y)/2),q=Math.sqrt(((p.x-cx)/rx)**2+((p.y-cy)/ry)**2);if(m.fill)return q<=1;return Math.abs(q-1)*Math.min(rx,ry)<=strokeRadius;
    }
    if(m.type==="bucket"){let inside=false;for(const path of markPointSets(m))if(path.length>=3&&pointInPolygon(p,path))inside=!inside;return inside;}
    if(m.type==="freefill"||m.type==="gradient")return pts.length>=3&&pointInPolygon(p,pts);
    if(pts.length===1)return Math.hypot(p.x-first.x,p.y-first.y)<=strokeRadius;
    for(let i=1;i<pts.length;i++)if(pointSegmentDistance(p,pts[i-1],pts[i])<=strokeRadius)return true;return false;
  }
  function markHitTest(m,x,y){
    const t=markTransformValues(m),base=markGeometryBounds(m),transformedCentre=markTransformPoint({x:base.cx,y:base.cy},m),tolerance=Math.max(7/viewScale()/t.scale,(Number(m.width)||1)/2);
    for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
      const centre=reflectPoint(transformedCentre,mirrorX,mirrorY,angle),delta=nearestLatticeDelta(x,y,centre.x,centre.y),periodicPoint={x:centre.x+delta.x,y:centre.y+delta.y},unsym=unreflectPoint(periodicPoint,mirrorX,mirrorY,angle),raw=inverseMarkTransformPoint(unsym,m);
      if(rawMarkHit(m,raw,tolerance))return true;
    }
    return false;
  }
  function hitTestArtwork(x,y){
    for(let layerIndex=state.layers.length-1;layerIndex>=0;layerIndex--){
      const layer=state.layers[layerIndex];if(!layerIsRenderable(layer,false)||layer.locked)continue;
      for(let idx=state.marks.length-1;idx>=0;idx--){const mark=state.marks[idx];if(mark.type!=="eraser"&&layerForArtwork(mark,BASE_LAYER_IDS.drawing)?.id===layer.id&&markHitTest(mark,x,y))return {kind:"mark",artwork:mark};}
      for(let idx=state.items.length-1;idx>=0;idx--){
        const item=state.items[idx],itemLayer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item);if(!a||itemLayer?.id!==layer.id)continue;
        const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y,cos=Math.cos(-item.rotation),sin=Math.sin(-item.rotation),lx=dx*cos-dy*sin,ly=dx*sin+dy*cos,iw=a.w*item.scale,ih=a.h*item.scale;
        if(Math.abs(lx)<=iw/2&&Math.abs(ly)<=ih/2)return {kind:"item",artwork:item};
      }
    }
    return null;
  }
  function resizeHandleHit(item,x,y){
    const a=assetOf(item);if(!a)return false;
    const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y;
    const c=Math.cos(-item.rotation),s=Math.sin(-item.rotation);
    const lx=dx*c-dy*s,ly=dx*s+dy*c;
    const hw=a.w*item.scale/2,hh=a.h*item.scale/2,limit=25/viewScale();
    return Math.hypot(Math.abs(lx)-hw,Math.abs(ly)-hh)<limit;
  }
  function imageHandleAt(item,x,y){
    const a=assetOf(item);if(!a)return null;
    const delta=nearestLatticeDelta(x,y,item.x,item.y),dx=delta.x,dy=delta.y;
    const c=Math.cos(-item.rotation),s=Math.sin(-item.rotation);
    const lx=dx*c-dy*s,ly=dx*s+dy*c;
    const hw=a.w*item.scale/2,hh=a.h*item.scale/2,limit=20/viewScale();
    const r=Math.hypot(lx,ly+hh+22/viewScale());
    if(r<=limit)return "rotate";
    const m=Math.hypot(lx,ly-hh-22/viewScale());
    if(m<=limit)return "move";
    return null;
  }
  function gestureInfo(){
    const [a,b]=[...state.pointers.values()];
    return {distance:Math.hypot(a.x-b.x,a.y-b.y),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
  }
  function startSelectionMove(ids,w){
    const members=(ids||[]).map(id=>{
      const record=selectableArtworkRecord(id);if(!record)return null;
      if(record.kind==="item"){delete record.artwork.scatterGenerated;return {kind:"item",id,x:Number(record.artwork.x)||0,y:Number(record.artwork.y)||0};}
      const t=markTransformValues(record.artwork);return {kind:"mark",id,x:t.x,y:t.y};
    }).filter(Boolean);
    state.transformState={kind:"selection",mode:"move",startPointer:{x:w.x,y:w.y},members};
    state.dragging=false;state.resizeState=null;
  }
  canvas.addEventListener("pointerdown",e=>{
    e.preventDefault();canvas.setPointerCapture(e.pointerId);
    const p=pointerPos(e);state.pointers.set(e.pointerId,p);
    if(state.pointers.size===2){
      state.activeMark=null;state.dragging=false;state.dragStart=null;beginInteraction("view");
      const g=gestureInfo();state.gesture={...g,zoom:state.zoom};renderAll();return;
    }
    if(state.pointers.size>2)return;
    state.dragStart=p;
    if(state.tool==="pan" || e.button===1){beginInteraction("view");return;}
    const w=worldPoint(p);
    if(state.tool==="eyedropper"){pickCanvasColour(w);state.dragStart=null;return;}
    if(state.tool==="select"){
      const currentIds=selectionIds(),singleSelection=currentIds.length===1;
      let current=singleSelection?selectedItem():null,currentMark=singleSelection?selectedMark():null;
      const currentLayer=current?layerForArtwork(current,BASE_LAYER_IDS.motifs):currentMark?layerForArtwork(currentMark,BASE_LAYER_IDS.drawing):null;
      if((current||currentMark)&&(!layerIsRenderable(currentLayer,false)||currentLayer.locked)){clearSelection();current=null;currentMark=null;}
      const markHandle=currentMark&&markHandleAt(currentMark,w.x,w.y);
      if(markHandle){
        saveHistory();const t=markTransformValues(currentMark),bounds=markPrimaryBounds(currentMark);
        if(markHandle==="rotate")state.transformState={kind:"mark",mode:"rotate",id:currentMark.id,startRotation:t.rotation,startAngle:Math.atan2(w.y-bounds.cy,w.x-bounds.cx),center:{x:bounds.cx,y:bounds.cy}};
        else state.transformState={kind:"mark",mode:"move",id:currentMark.id,startX:t.x,startY:t.y,startPointer:{x:w.x,y:w.y},baseCenter:{x:markGeometryBounds(currentMark).cx+t.x,y:markGeometryBounds(currentMark).cy+t.y}};
        state.dragging=false;state.resizeState=null;beginInteraction("edit");renderAll();return;
      }
      if(currentMark&&markResizeHandleHit(currentMark,w.x,w.y)){
        const t=markTransformValues(currentMark),bounds=markPrimaryBounds(currentMark);saveHistory();state.resizeState={kind:"mark",id:currentMark.id,scale:t.scale,startDistance:Math.max(1,Math.hypot(w.x-bounds.cx,w.y-bounds.cy)),center:{x:bounds.cx,y:bounds.cy}};state.dragging=false;beginInteraction("edit");renderAll();return;
      }
      const handle=current&&imageHandleAt(current,w.x,w.y);
      if(handle){
        saveHistory();
        if(handle==="rotate"){
          delete current.scatterGenerated;const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);
          state.transformState={kind:"item",mode:"rotate",id:current.id,startRotation:current.rotation,startAngle:Math.atan2(delta.y,delta.x)};
        }else state.transformState={kind:"item",mode:"move",id:current.id,offset:{x:w.x-current.x,y:w.y-current.y}};
        state.dragging=false;state.resizeState=null;beginInteraction("edit");renderAll();return;
      }
      if(current&&resizeHandleHit(current,w.x,w.y)){
        delete current.scatterGenerated;const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);saveHistory();state.resizeState={kind:"item",id:current.id,scale:current.scale,startDistance:Math.max(1,Math.hypot(delta.x,delta.y))};state.dragging=false;beginInteraction("edit");renderAll();return;
      }
      const hit=hitTestArtwork(w.x,w.y),additive=state.selectionAddMode||e.shiftKey||e.ctrlKey||e.metaKey;
      if(additive){
        if(hit){
          const hitIds=expandedArtworkIds(hit.artwork),next=new Set(currentIds),allSelected=hitIds.every(id=>next.has(id));
          if(allSelected)for(const id of hitIds)next.delete(id);else for(const id of hitIds)next.add(id);
          setSelection([...next],allSelected?([...next].at(-1)??null):hit.artwork.id);
        }
        renderAll();return;
      }
      if(hit&&currentIds.length>1&&currentIds.includes(hit.artwork.id)){
        saveHistory();startSelectionMove(currentIds,w);beginInteraction("edit");renderAll();return;
      }
      const hitIds=hit?expandedArtworkIds(hit.artwork):[];
      if(hitIds.length>1){
        setSelection(hitIds,hit.artwork.id);saveHistory();startSelectionMove(hitIds,w);beginInteraction("edit");renderAll();return;
      }
      setSelection(hit?[hit.artwork.id]:[],hit?.artwork?.id??null);state.dragging=hit?.kind==="item";
      if(hit?.kind==="item"){saveHistory();delete hit.artwork.scatterGenerated;state.dragOffset=nearestLatticeDelta(w.x,w.y,hit.artwork.x,hit.artwork.y);}
      else if(hit?.kind==="mark"){
        saveHistory();const t=markTransformValues(hit.artwork),b=markGeometryBounds(hit.artwork);state.transformState={kind:"mark",mode:"move",id:hit.artwork.id,startX:t.x,startY:t.y,startPointer:{x:w.x,y:w.y},baseCenter:{x:b.cx+t.x,y:b.cy+t.y}};
      }
      if(hit)beginInteraction("edit");
      renderAll();return;
    }
    const drawLayer=activeLayer();
    if(!drawLayer||drawLayer.visible===false||drawLayer.locked){setStatus(!drawLayer?"Choose an active layer before drawing.":drawLayer.locked?`“${drawLayer.name}” is locked. Unlock it to draw.`:`“${drawLayer.name}” is hidden. Make it visible to draw.`);state.dragStart=null;return;}
    if(state.tool==="bucket"){void bucketFillAt(w,drawLayer);return;}
    saveHistory();
    const markStart=canonicalPoint(w.x,w.y),pressureEnabled=state.tool==="brush"&&$("pressureWidth").checked;
    if(pressureEnabled)markStart.p=pointerPressure(e);
    const mark={id:state.nextId++,layerId:drawLayer.id,type:state.tool,alphaLocked:state.tool!=="eraser"&&!!drawLayer.alphaLock,color:$("ink").value,width:Math.max(.45,parseInt($("brushSize").value,10)*TILE/4000),fill:$("shapeFill").checked,opacity:state.tool==="eraser"?1:(parseInt($("inkOpacity").value,10)||100)/100,texture:(parseInt($("textureAmount").value,10)||0)/100,brushStyle:$("brushStyle").value,pressureWidth:pressureEnabled,pressureMin:Number($("pressureMin").value)||18,pressureSensitivity:Number($("pressureSensitivity").value)||100,stampShape:$("stampShape").value,gradientType:$("gradientType").value,gradientDirection:$("gradientDirection").value,endColor:$("gradientEnd").value,points:[markStart]};
    state.marks.push(mark);state.activeMark=mark;state.selectedId=null;beginInteraction("draw");
    renderAll(false,false);
  });
  canvas.addEventListener("pointermove",e=>{
    if(!state.pointers.has(e.pointerId))return;
    const p=pointerPos(e),old=state.pointers.get(e.pointerId);
    state.pointers.set(e.pointerId,p);
    if(state.pointers.size===2){
      const g=gestureInfo();
      if(state.gesture){
        state.panX+=g.mid.x-state.gesture.mid.x;
        state.panY+=g.mid.y-state.gesture.mid.y;
        setZoom(state.gesture.zoom*g.distance/Math.max(1,state.gesture.distance),g.mid);
        state.gesture={...g,zoom:state.zoom};
      }
      return;
    }
    if(state.pointers.size!==1||!state.dragStart)return;
    if(state.tool==="pan" || e.buttons===4){
      state.panX+=p.x-old.x;state.panY+=p.y-old.y;renderAll(false,false);return;
    }
    const w=worldPoint(p);
    if(state.transformState){
      if(state.transformState.kind==="selection"){
        const dx=w.x-state.transformState.startPointer.x,dy=w.y-state.transformState.startPointer.y;
        for(const member of state.transformState.members){
          const record=artworkRecord(member.id);if(!record)continue;
          if(member.kind==="item"){
            const next={x:member.x+dx,y:member.y+dy},pos=isDoodleProject()?next:canonicalPoint(next.x,next.y);record.artwork.x=pos.x;record.artwork.y=pos.y;
          }else{
            record.artwork.transformX=member.x+dx;record.artwork.transformY=member.y+dy;
          }
        }
      }else if(state.transformState.kind==="mark"){
        const mark=state.marks.find(m=>m.id===state.transformState.id);if(!mark)return;
        if(state.transformState.mode==="move"){
          const dx=w.x-state.transformState.startPointer.x,dy=w.y-state.transformState.startPointer.y,bounds=markPrimaryBounds(mark),snapped=smartSnapPosition(state.transformState.baseCenter.x+dx,state.transformState.baseCenter.y+dy,(bounds.maxX-bounds.minX)/2,(bounds.maxY-bounds.minY)/2);
          mark.transformX=state.transformState.startX+snapped.x-state.transformState.baseCenter.x;mark.transformY=state.transformState.startY+snapped.y-state.transformState.baseCenter.y;
        }else mark.transformRotation=state.transformState.startRotation+Math.atan2(w.y-state.transformState.center.y,w.x-state.transformState.center.x)-state.transformState.startAngle;
      }else{
        const item=state.items.find(i=>i.id===state.transformState.id);if(!item)return;
        if(state.transformState.mode==="move"){
          const extents=itemSnapHalfExtents(item),snapped=smartSnapPosition(w.x-state.transformState.offset.x,w.y-state.transformState.offset.y,extents.x,extents.y),pos=canonicalPoint(snapped.x,snapped.y);item.x=pos.x;item.y=pos.y;
        }else{
          const delta=nearestLatticeDelta(w.x,w.y,item.x,item.y),angle=Math.atan2(delta.y,delta.x);item.rotation=state.transformState.startRotation+angle-state.transformState.startAngle;
        }
      }
      renderAll(false,false);return;
    }
    if(state.resizeState){
      if(state.resizeState.kind==="mark"){
        const mark=state.marks.find(m=>m.id===state.resizeState.id);if(!mark)return;const dist=Math.hypot(w.x-state.resizeState.center.x,w.y-state.resizeState.center.y);mark.transformScale=clamp(state.resizeState.scale*dist/state.resizeState.startDistance,.01,60);
      }else{
        const item=state.items.find(i=>i.id===state.resizeState.id);if(!item)return;const delta=nearestLatticeDelta(w.x,w.y,item.x,item.y),dist=Math.hypot(delta.x,delta.y);item.scale=clamp(state.resizeState.scale*dist/state.resizeState.startDistance,.01,60);
      }
      renderAll(false,false);return;
    }
    if(state.activeMark){
      const m=state.activeMark;
      if(m.type==="brush"||m.type==="eraser"||m.type==="freefill"||m.type==="gradient"){
        const coalesced=typeof e.getCoalescedEvents==="function"?e.getCoalescedEvents():[],samples=[...coalesced];
        if(!samples.length||samples.at(-1).clientX!==e.clientX||samples.at(-1).clientY!==e.clientY)samples.push(e);
        if(coalesced.length)window.PatternForgeInteractionMetrics.coalescedSamples+=coalesced.length;
        for(const sample of samples){
          const sampleWorld=worldPoint(pointerPos(sample)),last=m.points[m.points.length-1],raw=nearestLatticePoint(sampleWorld.x,sampleWorld.y,last.x,last.y),next=m.type==="brush"?stabiliseStrokePoint(last,raw):raw;
          if(m.pressureWidth&&m.type==="brush"){const rawPressure=pointerPressure(sample,last.p??.5);next.p=stabilisePressure(last.p??rawPressure,rawPressure);}
          if(Math.hypot(next.x-last.x,next.y-last.y)>1.2)m.points.push(next);
        }
      }else m.points[1]=nearestLatticePoint(w.x,w.y,m.points[0].x,m.points[0].y);
      renderAll(false,false);return;
    }
    if(state.dragging){
      const item=selectedItem();if(!item)return;
      const extents=itemSnapHalfExtents(item),snapped=smartSnapPosition(w.x-state.dragOffset.x,w.y-state.dragOffset.y,extents.x,extents.y);
      item.x=isDoodleProject()?snapped.x:((snapped.x%TILE)+TILE)%TILE;
      item.y=isDoodleProject()?snapped.y:((snapped.y%TILE)+TILE)%TILE;
      renderAll(false,false);
    }
  });
  function endDrag(e){
    if(state.activeMark?.type==="brush"&&strokeStabilisationBase()<.999&&state.activeMark.points.length){
      const last=state.activeMark.points[state.activeMark.points.length-1],w=worldPoint(pointerPos(e)),end=nearestLatticePoint(w.x,w.y,last.x,last.y);
      if(state.activeMark.pressureWidth){const rawPressure=pointerPressure(e,last.p??.5);end.p=stabilisePressure(last.p??rawPressure,rawPressure);}
      if(Math.hypot(end.x-last.x,end.y-last.y)>.5)state.activeMark.points.push(end);
    }
    state.pointers.delete(e.pointerId);if(state.pointers.size<2)state.gesture=null;
    if(state.transformState?.kind==="selection"){
      for(const member of state.transformState.members||[]){if(member.kind==="mark"){const mark=state.marks.find(m=>m.id===member.id);if(mark)normaliseMarkTranslation(mark);}}
    }else{
      const transformedMarkId=state.transformState?.kind==="mark"?state.transformState.id:state.resizeState?.kind==="mark"?state.resizeState.id:null;if(transformedMarkId){const mark=state.marks.find(m=>m.id===transformedMarkId);if(mark)normaliseMarkTranslation(mark);}
    }
    state.dragging=false;state.resizeState=null;state.transformState=null;state.activeMark=null;state.dragStart=null;clearSnapGuides();finishInteraction();renderAll();
  }
  canvas.addEventListener("pointerup",endDrag);
  canvas.addEventListener("pointercancel",endDrag);
  canvas.addEventListener("wheel",e=>{
    e.preventDefault();setZoom(state.zoom*(e.deltaY<0?1.12:1/1.12),pointerPos(e));
  },{passive:false});

  // PNG DPI writer: inserts a pHYs chunk after IHDR.
  const crcTable=(()=>{
    const t=new Uint32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
      t[n]=c>>>0;
    }
    return t;
  })();
  function crc32(bytes){
    let c=0xFFFFFFFF;
    for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function u32be(n){ return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]); }
  function concatArrays(arrays){
    const len=arrays.reduce((s,a)=>s+a.length,0),out=new Uint8Array(len);
    let o=0;for(const a of arrays){out.set(a,o);o+=a.length;}return out;
  }
  async function canvasToPngBlobWithDpi(c,dpi){
    const blob=await new Promise(res=>c.toBlob(res,"image/png"));
    if(!blob)throw Error("Browser could not encode PNG");
    const src=new Uint8Array(await blob.arrayBuffer());
    if(src.length<33)throw Error("Browser could not encode PNG");
    const sig=src.slice(0,8);
    const ihdrLen=4+4+13+4; // length + type + data + crc
    const ihdr=src.slice(8,8+ihdrLen);
    const rest=[];
    for(let pos=8+ihdrLen;pos<src.length;){
      const len=new DataView(src.buffer,src.byteOffset+pos,4).getUint32(0);
      const end=pos+12+len;
      if(end>src.length)throw Error("Invalid PNG chunk");
      const type=String.fromCharCode(...src.slice(pos+4,pos+8));
      if(type!=="pHYs")rest.push(src.slice(pos,end));
      pos=end;
    }
    const ppm=Math.round(dpi/0.0254);
    const type=new TextEncoder().encode("pHYs");
    const data=concatArrays([u32be(ppm),u32be(ppm),new Uint8Array([1])]);
    const crc=u32be(crc32(concatArrays([type,data])));
    const chunk=concatArrays([u32be(9),type,data,crc]);
    return new Blob([sig,ihdr,chunk,...rest],{type:"image/png"});
  }
  function downloadBlob(blob,name){
    const u=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),2000);
  }
  function safeName(){
    const label=state.project?.title||$("seed").value||"pattern";
    return label.replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||"pattern";
  }
  function exportFileStem(){return isDoodleProject()?"artwork":"seamless";}
  async function renderPNGBlob(){
    const spec=getExportSpec();
    if(spec.wPx*spec.hPx>100_000_000 && !confirm("This export is over 100 megapixels and may exceed your browser's memory. Continue?")) return null;
    setStatus(`Rendering ${spec.wPx} × ${spec.hPx}px PNG…`);
    await new Promise(r=>setTimeout(r,40));
    const out=makeTileCanvas(spec.wPx,spec.hPx,4000,4000,projectRepeatStyle(),true);
    const blob=await canvasToPngBlobWithDpi(out,spec.dpi);
    return {blob,spec};
  }
  async function exportPNG(){
    const result=await renderPNGBlob();if(!result)return;
    const {blob,spec}=result;
    downloadBlob(blob,`${safeName()}-${exportFileStem()}-master.png`);
    setStatus(isDoodleProject()?`Standalone master PNG exported at ${spec.wPx} × ${spec.hPx}px with transparency. No physical size is assigned.`:`Seamless master PNG exported at ${spec.wPx} × ${spec.hPx}px. No physical size is assigned.`);
  }

  function svgEscape(s){ return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function renderSVGBlob(){
    const spec=getExportSpec();
    const W=spec.wPx,H=spec.hPx,sx=4000/TILE,sy=4000/TILE,uniform=Math.sqrt(sx*sy),clipW=W/sx,clipH=H/sy;
    const itemBasis=repeatBasis(4000,4000),markBasis=repeatBasis();
    let body="",gradientDefs="",assetDefs="";
    const embeddedAssets=new Map();
    if(!$("transparent").checked) body+=`<rect width="${W}" height="${H}" fill="${$("bg").value}"/>`;
    let gradientId=0;
    let maskIndex=0;
    let clipBaseSvg="";
    for(const layer of state.layers){
      if(!layerIsRenderable(layer,true)){if(!layer.clipToBelow)clipBaseSvg="";continue;}
      let layerBody="";
      for(const srcItem of state.items){
      if(layerForArtwork(srcItem,BASE_LAYER_IDS.motifs)?.id!==layer.id)continue;
      const a=assetOf(srcItem);if(!a)continue;
      let assetRef=embeddedAssets.get(a.src);
      if(!assetRef){
        assetRef=`pf-asset-${embeddedAssets.size+1}`;
        embeddedAssets.set(a.src,assetRef);
        const sourceW=Math.max(1,Number(a.w)||1),sourceH=Math.max(1,Number(a.h)||1);
        assetDefs+=`<symbol id="${assetRef}" viewBox="0 0 ${sourceW} ${sourceH}" preserveAspectRatio="none"><image href="${svgEscape(a.src)}" x="0" y="0" width="${sourceW}" height="${sourceH}" preserveAspectRatio="none"/></symbol>`;
      }
      const item={...srcItem,x:srcItem.x*sx,y:srcItem.y*sy,scale:srcItem.scale*uniform};
      const iw=a.w*item.scale,ih=a.h*item.scale;
      const c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation));
      const halfW=(iw*c+ih*s)/2,halfH=(iw*s+ih*c)/2;
      const deg=item.rotation*180/Math.PI;
      const copies=artworkCopiesForBounds(item.x-halfW,item.x+halfW,item.y-halfH,item.y+halfH,W,H,itemBasis);
      for(const copy of copies){
        const x=item.x+copy.x,y=item.y+copy.y;
        layerBody+=`<use href="#${assetRef}" xlink:href="#${assetRef}" x="${-iw/2}" y="${-ih/2}" width="${iw}" height="${ih}" opacity="${item.opacity*layer.opacity}" transform="translate(${x} ${y}) rotate(${deg}) scale(${item.flipX?-1:1} ${item.flipY?-1:1})"/>`;
      }
      }
      for(const m of state.marks){
      if(layerForArtwork(m,BASE_LAYER_IDS.drawing)?.id!==layer.id||!m.points?.length)continue;
      const first=m.points[0],last=m.points[m.points.length-1];
      let shape="";
      if(m.type==="rect")shape=`<rect x="${Math.min(first.x,last.x)}" y="${Math.min(first.y,last.y)}" width="${Math.abs(last.x-first.x)}" height="${Math.abs(last.y-first.y)}"/>`;
      else if(m.type==="ellipse")shape=`<ellipse cx="${(first.x+last.x)/2}" cy="${(first.y+last.y)/2}" rx="${Math.max(.1,Math.abs(last.x-first.x)/2)}" ry="${Math.max(.1,Math.abs(last.y-first.y)/2)}"/>`;
      else if(m.type==="bucket")shape=`<path d="${markPointSets(m).map(path=>path.length?`M ${path.map(p=>`${p.x} ${p.y}`).join(" L ")} Z`:"").join(" ")}"/>`;
      else shape=`<path d="M ${m.points.map(p=>`${p.x} ${p.y}`).join(" L ")}${m.points.length===1?` L ${first.x+.01} ${first.y+.01}`:""}${m.type==="freefill"?" Z":""}"/>`;
      if(m.type==="brush"&&(m.brushStyle||"ink")==="stamp"){
        const spacing=Math.max(4,m.width*1.65),r=Math.max(1,m.width*.46),parts=[];let carry=spacing;
        const stamp=(x,y,angle)=>{if((m.stampShape||"leaf")==="dot")parts.push(`<circle cx="${x}" cy="${y}" r="${r}"/>`);else if(m.stampShape==="star"){let d="";for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;d+=`${i?"L":"M"}${x+Math.cos(a)*rr} ${y+Math.sin(a)*rr} `;}parts.push(`<path d="${d}Z"/>`);}else parts.push(`<ellipse cx="${x}" cy="${y}" rx="${r*.52}" ry="${r}" transform="rotate(${angle*180/Math.PI} ${x} ${y})"/>`);};
        stamp(first.x,first.y,0);for(let i=1;i<m.points.length;i++){const a=m.points[i-1],b=m.points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);for(let d=carry;d<=len;d+=spacing){const t=d/len;stamp(a.x+dx*t,a.y+dy*t,Math.atan2(dy,dx));}carry=((carry-len)%spacing+spacing)%spacing||spacing;}
        shape=parts.join("");
      }
      if(m.type==="brush"&&m.pressureWidth&&(m.brushStyle||"ink")!=="stamp"){
        const pressureStyle=m.brushStyle||"ink",segments=[];
        if(m.points.length===1){
          const width=brushWidthAtPressure(m,pressureStyle,m.points[0].p);segments.push(`<circle cx="${m.points[0].x}" cy="${m.points[0].y}" r="${width/2}" fill="${svgEscape(m.color)}" stroke="none"/>`);
        }else{
          for(let i=1;i<m.points.length;i++){
            const a=m.points[i-1],b=m.points[i],pressure=((Number(a.p)||1)+(Number(b.p)||1))/2,width=brushWidthAtPressure(m,pressureStyle,pressure);
            segments.push(`<path d="M ${a.x} ${a.y} L ${b.x} ${b.y}" stroke-width="${width}" fill="none"/>`);
          }
        }
        shape=segments.join("");
      }
      if(m.type==="brush"&&(m.brushStyle||"")==="texture"&&Number(m.texture||0)>0){
        const amount=clamp(Number(m.texture)||0,0,1),rng=mulberry32(hashString(String(m.id)+"texture")),step=Math.max(4,m.width*(1.4-amount)),dots=[];
        for(let i=1;i<m.points.length;i++){const a=m.points[i-1],b=m.points[i],len=Math.hypot(b.x-a.x,b.y-a.y),count=Math.min(80,Math.ceil(len/step));for(let j=0;j<count;j++){const t=(j+rng())/Math.max(1,count),x=a.x+(b.x-a.x)*t+(rng()-.5)*m.width*.6,y=a.y+(b.y-a.y)*t+(rng()-.5)*m.width*.6,r=Math.max(.45,m.width*(.035+amount*.07)*rng());dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${svgEscape(m.color)}" stroke="none" opacity="${.3+amount*.55}"/>`);}}
        if(dots.length)shape=`<g>${shape}${dots.join("")}</g>`;
      }
      let style;
      if(m.type==="eraser")style=`stroke="#000" stroke-width="${m.width}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="1"`;
      else if(m.type==="gradient"){
        const id=`tile-gradient-${++gradientId}`;
        const dir=m.gradientDirection||"diagonal",x1=dir==="horizontal"?"0%":"0%",y1=dir==="vertical"?"0%":"0%",x2=dir==="vertical"?"0%":"100%",y2=dir==="horizontal"?"0%":"100%";
        gradientDefs+=m.gradientType==="radial"?`<radialGradient id="${id}" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${svgEscape(m.color)}"/><stop offset="100%" stop-color="${svgEscape(m.endColor||"#ffffff")}"/></radialGradient>`:`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${svgEscape(m.color)}"/><stop offset="100%" stop-color="${svgEscape(m.endColor||"#ffffff")}"/></linearGradient>`;
        shape=shape.replace(/"\/>$/,' Z"/>');style=`fill="url(#${id})" stroke="none" opacity="${(m.opacity??1)*layer.opacity}"`;
      }else{
        const brush=m.brushStyle||"ink",width=m.type==="brush"?(brush==="marker"?m.width*1.8:brush==="pencil"?m.width*.72:m.width):m.width;
        const opacity=(m.opacity??1)*layer.opacity*(brush==="marker"?.36:brush==="pencil"?.68:1),fill=m.type==="freefill"||m.type==="bucket"||(m.fill&&(m.type==="rect"||m.type==="ellipse"))||brush==="stamp"?svgEscape(m.color):"none";
        style=m.type==="brush"&&m.pressureWidth&&brush!=="stamp"
          ?`stroke="${svgEscape(m.color)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity}"`
          :`stroke="${svgEscape(m.color)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="${fill}"${m.type==="bucket"?' fill-rule="evenodd"':''} opacity="${opacity}"`;
      }
      let eraserNodes="",markNodes="";
      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        const transform=`translate(${TILE/2} ${TILE/2}) rotate(${angle*180/Math.PI}) scale(${mirrorX?-1:1} ${mirrorY?-1:1}) translate(${-TILE/2} ${-TILE/2})`;
        if(!markHasTransform(m)){
          const transformedPoints=m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle));
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
          for(const p of transformedPoints){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
          minX-=m.width;maxX+=m.width;minY-=m.width;maxY+=m.width;
          const copies=artworkCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,markBasis);
          for(const copy of copies){const node=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}" ${style}>${shape}</g></g>`;if(m.type==="eraser")eraserNodes+=node;else markNodes+=node;}
        }else{
          const bounds=markTransformedBounds(m,mirrorX,mirrorY,angle),copies=artworkCopiesForBounds(bounds.minX,bounds.maxX,bounds.minY,bounds.maxY,clipW,clipH,markBasis),markTransform=markSvgTransform(m);
          for(const copy of copies){const node=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}"><g transform="${markTransform}" ${style}>${shape}</g></g></g>`;if(m.type==="eraser")eraserNodes+=node;else markNodes+=node;}
        }
      }
      if(m.type==="eraser"&&eraserNodes){
        const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${eraserNodes}</mask>`;layerBody=`<g mask="url(#${maskId})">${layerBody}</g>`;
      }else if(markNodes){
        if(m.alphaLocked){
          if(layerBody){
            const alphaMaskId=`pf-alpha-lock-${++maskIndex}`;
            gradientDefs+=`<mask id="${alphaMaskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:alpha">${layerBody}</mask>`;
            layerBody+=`<g mask="url(#${alphaMaskId})">${markNodes}</g>`;
          }
        }else layerBody+=markNodes;
      }
      }
      if(layer.clipToBelow){
        if(!clipBaseSvg)continue;
        const clipMaskId=`pf-clip-${++maskIndex}`;
        gradientDefs+=`<mask id="${clipMaskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:alpha">${clipBaseSvg}</mask>`;
        body+=`<g mask="url(#${clipMaskId})">${layerBody}</g>`;
      }else{
        body+=layerBody;
        clipBaseSvg=layerBody;
      }
    }
    const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${spec.wIn}in" height="${spec.hIn}in" viewBox="0 0 ${W} ${H}"><defs><clipPath id="tile"><rect width="${W}" height="${H}"/></clipPath>${assetDefs}${gradientDefs}</defs><g clip-path="url(#tile)">${body}</g></svg>`;
    return new Blob([svg],{type:"image/svg+xml"});
  }
  function exportSVG(){
    const blob=renderSVGBlob();
    downloadBlob(blob,`${safeName()}-${exportFileStem()}.svg`);
    setStatus(isDoodleProject()?"Standalone SVG exported. Drawn marks remain vector; imported raster images stay raster.":"Repeat SVG exported. Drawn marks remain vector; imported raster images stay raster.");
  }

  function projectBlob(){
    return new Blob([JSON.stringify(compactProjectData())],{type:"application/json"});
  }
  function newProjectId(){return "pf-project-"+(Date.now().toString(36))+"-"+Math.random().toString(36).slice(2,9);}
  function setProjectBadge(){
    const p=state.project;
    const styles={straight:"Straight", "half-drop":"Half-drop",brick:"Brick"},doodle=p?.projectType==="doodle";
    $("projectNameDisplay").textContent=p?.isPractice?"Practice mode":p?(doodle?"Doodle":`${p.title} · ${styles[p.repeatStyle]||"Straight"}`):"Tile editor";
    $("projectNameDisplay").title=p?[doodle?"Doodle":p.title,p.customer,p.theme,p.variation,doodle?"Standalone canvas":styles[p.repeatStyle]||"Straight repeat"].filter(Boolean).join(" · "):"";
  }
  function updateSetupProjectType(){
    const doodle=$("projectTypeInput").value==="doodle";
    $("projectRepeatSetup").hidden=doodle;
    $("createProject").textContent=doodle?"Create doodle project":"Create pattern project";
  }
  function updateProjectModeUi(){
    const doodle=isDoodleProject();
    document.body.classList.toggle("doodle-project",doodle);
    if(doodle){$("transparent").checked=true;state.focusRepeatPreview=false;$("repeatPreviewToggle").setAttribute("aria-pressed","false");$("repeatPreviewToggle").textContent="Preview repeat";}
    $("transparent").disabled=doodle;$("bg").disabled=doodle;
    $("patternScatterDisclosure").hidden=doodle;$("repeatControls").hidden=doodle;$("repeatPreviewToggle").hidden=doodle;
    $("repeatPreviewHeading").hidden=doodle;$("preview").hidden=doodle;$("previewScaleField").hidden=doodle;$("backgroundSettingsRow").hidden=doodle;
    $("stageDescription").textContent=doodle?"4000 px standalone artwork canvas · transparent":"4000 px master tile · seamless repeat preview";
    $("drawingHelp").textContent=doodle?"Choose a brush style, then adjust size, opacity and texture. Eraser removes pixels from the active unlocked layer and reveals layers underneath. Bucket fill colours a tapped region; freehand and gradient fill colour a closed area you trace. Artwork stays where you draw it; canvas edges do not repeat. Two fingers zoom and move.":"Choose a brush style, then adjust size, opacity and texture. Eraser removes pixels from the active unlocked layer and reveals layers underneath. Freehand and gradient fill colour a closed area you trace. Draw across edges to wrap. Two fingers zoom and move.";
    $("tileSettingsSummary").textContent=doodle?"Canvas and placement settings":"Tile and placement settings";
    $("snapHelp").textContent=doodle?"Smart snapping uses the grid plus canvas centre lines and canvas edges. Temporary alignment guides appear while moved artwork is snapped. Grid visibility and snapping remain independent.":"Smart snapping uses the grid plus tile centre lines and tile edges. Temporary alignment guides appear while moved artwork is snapped. Grid visibility and snapping remain independent.";
    $("assetPlacementHelp").textContent=doodle?"The first selected image is placed on the canvas automatically. Tap a thumbnail to add another copy, then drag, scale or rotate it.":"The first selected image is placed on the tile automatically. Tap a thumbnail to add another copy, then drag, scale or rotate it.";
    $("focusRecentEmpty").textContent=doodle?"Choose Add image. The first image will be placed on the canvas; tap a thumbnail here to add another copy.":"Choose Add image. The first image will be placed on the tile; tap a thumbnail here to add another copy.";
    $("focusPrintHeading").textContent="Master output";
    $("focusPrintSizeLabel").textContent="Legacy physical scale (ignored)";
    $("focusInfoPrintNote").textContent=doodle?"The pixel dimensions describe the reusable raster master only. Pattern Forge does not assign a physical size to the artwork.":"The repeat-cell pixel dimensions describe the reusable raster master only. Pattern Forge does not assign a physical size to the design.";
    $("tileBorderLabelText").textContent=doodle?"Show canvas edge":"Show centre tile edge";
    $("stageHelpHint").textContent=doodle?"Use Pan or two fingers to move the view. Mouse wheel zooms. Export contains the standalone artwork without guides.":"Use Pan or two fingers to move the view. Mouse wheel zooms. Export contains the full repeat swatch, without guides or faded neighbours.";
    canvas.setAttribute("aria-label",doodle?"Doodle artwork canvas":"Pattern tile editor");
    $("exportFilesTitle").textContent=doodle?"Artwork files":"Pattern files";
    $("exportPng").textContent=doodle?"Export artwork as PNG":"Export pattern as PNG";
    $("exportSvg").textContent=doodle?"Export artwork as SVG":"Export pattern as SVG";
    $("exportDimensionsHelp").textContent=doodle?"Doodle exports are one transparent 4000 × 4000 px raster master. That pixel size does not assign a physical size. SVG remains resolution-independent; raster artwork inside an SVG remains raster.":"PNG and SVG use the complete repeat-cell dimensions shown at left. Straight uses a 4000 × 4000 px raster master; half-drop and brick use the required rectangular repeat cell. Pixel dimensions describe raster detail, not a physical product size. SVG itself is resolution-independent; raster artwork inside an SVG remains raster.";
  }
  function showProjectSetup(){
    pendingAutosaveData=null;
    $("resumePrompt").hidden=true;
    $("newProjectSetup").hidden=false;
    const overlay=$("projectSetupOverlay");overlay.hidden=false;
    $("cancelProjectSetup").hidden=false;
    $("cancelProjectSetup").textContent="Cancel";
    $("projectSetupIntro").textContent=state.project?.isPractice?"Turn your current practice artwork into a named Pattern Project. Your drawing is kept and its straight repeat stays in place.":"Create a new Pattern Project or Doodle Project, or open another saved project from this device.";
    $("localProjectsSection").hidden=false;
    $("projectTitleInput").value="";$("projectCustomerInput").value="";$("projectThemeInput").value="";$("projectVariationInput").value="";
    $("projectTypeInput").value="pattern";$("projectTypeInput").disabled=!!state.project?.isPractice;
    $("projectRepeatStyle").value="straight";
    $("projectRepeatStyle").disabled=!!state.project?.isPractice;updateSetupProjectType();
    refreshLocalProjects();
  }
  async function refreshLocalProjects(){
    const list=$("localProjectList"),empty=$("localProjectsEmpty");list.innerHTML="";
    let records=[];
    try{
      const db=await openAutosaveDb();
      records=await new Promise((resolve,reject)=>{const tx=db.transaction("projects","readonly"),store=tx.objectStore("projects"),req=store.getAllKeys();req.onsuccess=async()=>{
        const keys=req.result.filter(k=>typeof k==="string"&&k.startsWith("pf-project-"));
        try{const rows=await Promise.all(keys.map(key=>new Promise((res,rej)=>{const get=store.get(key);get.onsuccess=()=>res(get.result);get.onerror=()=>rej(get.error);})));resolve(rows.map(raw=>{try{return typeof raw==="string"?JSON.parse(raw):raw;}catch(_){return null;}}).filter(x=>x?.project));}catch(err){reject(err);}
      };req.onerror=()=>reject(req.error);});
    }catch(_){records=[];}
    records.sort((a,b)=>String(b.project.updatedAt||"").localeCompare(String(a.project.updatedAt||"")));
    for(const data of records){
      const p=data.project;if(p.id===state.project?.id)continue;
      const button=document.createElement("button");button.type="button";button.className="btn localProjectButton";
      const title=document.createElement("span");title.textContent=p.title||"Untitled project";
      const detail=document.createElement("small");detail.textContent=p.isPractice?`Practice session · ${new Date(p.updatedAt||Date.now()).toLocaleString()}`:[p.customer,p.theme,p.variation,p.projectType==="doodle"?"Doodle Project":p.repeatStyle||"straight"].filter(Boolean).join(" · ");title.appendChild(detail);
      const action=document.createElement("b");action.textContent="Open";button.append(title,action);
      button.addEventListener("click",async()=>{try{await saveAutosave();await restoreProject(data);$("projectSetupOverlay").hidden=true;setStatus(`Opened “${p.title||"Untitled project"}”.`);}catch(err){setStatus("Could not open saved project: "+err.message);}});
      list.appendChild(button);
    }
    empty.hidden=records.some(r=>r.project.id!==state.project?.id);
    empty.textContent=typeof indexedDB==="undefined"?"Saved project listing needs browser device storage. Open a JSON project or ZIP instead.":"No other saved projects on this device yet.";
  }
  function createProjectFromSetup(event){
    event.preventDefault();
    const title=$("projectTitleInput").value.trim();if(!title){$("projectTitleInput").focus();return;}
    const begin=()=>{
      const now=new Date().toISOString(),promotePractice=!!state.project?.isPractice,requestedType=promotePractice?"pattern":($("projectTypeInput").value==="doodle"?"doodle":"pattern");
      state.project={id:newProjectId(),title,customer:$("projectCustomerInput").value.trim(),theme:$("projectThemeInput").value.trim(),variation:$("projectVariationInput").value.trim(),projectType:requestedType,repeatStyle:requestedType==="doodle"?"straight":(promotePractice?"straight":$("projectRepeatStyle").value),createdAt:promotePractice?(state.project.createdAt||now):now,updatedAt:now};
      if(!promotePractice&&requestedType==="pattern"){
        // New pattern projects begin with a visible construction grid. More detailed
        // grid, mirror, snapping and palette choices live in the editor's Design setup.
        $("gridOn").checked=true;
        updateSettingReadouts();
      }
      if(!promotePractice){state.assets=[];state.items=[];state.marks=[];resetLayerState();state.templateGuide=null;state.nextId=1;state.selectedId=null;state.past=[];state.future=[];state.recentAssetIds=[];}
      if(requestedType==="doodle")$("transparent").checked=true;
      $("projectSetupOverlay").hidden=true;setProjectBadge();updateProjectModeUi();rebuildAssetGrid();updatePixelReadout();updatePrintEligibility();scheduleAutosave();
      setStatus(promotePractice?`Practice artwork saved as “${title}”. Its straight repeat is now a Pattern Project.`:requestedType==="doodle"?`Doodle is ready. The 4000 px canvas is transparent and does not wrap at its edges.`:`Pattern Project “${title}” saved on this device. Draw and colour your seamless tile.`);
    };
    if(state.project)saveAutosave().then(begin);else begin();
  }
  async function startPracticeMode(){
    if(state.project)await saveAutosave();
    const now=new Date().toISOString();
    state.project={id:newProjectId(),title:"Practice mode",customer:"",theme:"",variation:"",projectType:"pattern",repeatStyle:"straight",isPractice:true,createdAt:now,updatedAt:now};
    state.assets=[];state.items=[];state.marks=[];resetLayerState();state.templateGuide=null;state.nextId=1;state.selectedId=null;state.past=[];state.future=[];state.recentAssetIds=[];
    $("projectSetupOverlay").hidden=true;setProjectBadge();updateProjectModeUi();rebuildAssetGrid();updatePixelReadout();updatePrintEligibility();
    await saveAutosave();
    setStatus("Practice mode started. Your practice work autosaves on this device; save it as a named Pattern Project when you’re ready.");
  }
  function variationSnapshot(){
    return {
      background:$("bg").value,transparent:$("transparent").checked,palette:[...state.colorPalette],ink:$("ink").value,
      items:state.items.map(item=>({id:item.id,x:item.x,y:item.y,scale:item.scale,rotation:item.rotation,opacity:item.opacity,scatterGenerated:!!item.scatterGenerated})),
      marks:state.marks.map(mark=>({id:mark.id,color:mark.color,endColor:mark.endColor,opacity:mark.opacity,transformX:mark.transformX,transformY:mark.transformY,transformScale:mark.transformScale,transformRotation:mark.transformRotation})),
      settings:{neighborOpacity:$("neighborOpacity").value,count:$("count").value,minScale:$("minScale").value,maxScale:$("maxScale").value,rotationAmount:$("rotationAmount").value,scatterSpacing:$("scatterSpacing").value,scatterOverlap:$("scatterOverlap").checked,scatterPreserveManual:$("scatterPreserveManual").checked}
    };
  }
  function saveVariation(name){
    const title=String(name||"").trim().slice(0,80);if(!title){setStatus("Give the variation a name.");return null;}
    const now=new Date().toISOString(),variation={id:"variation-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),name:title,createdAt:now,updatedAt:now,snapshot:variationSnapshot()};
    state.variations.unshift(variation);if(state.variations.length>30)state.variations.length=30;scheduleAutosave();setStatus("Saved variation “"+title+"”.");return variation;
  }
  function applyVariationSnapshot(snap,options={}){
    if(!snap||typeof snap!=="object")return false;
    if(options.history!==false)saveHistory();
    const itemMap=new Map((snap.items||[]).map(item=>[String(item.id),item])),markMap=new Map((snap.marks||[]).map(mark=>[String(mark.id),mark]));
    for(const item of state.items){const saved=itemMap.get(String(item.id));if(!saved)continue;for(const key of ["x","y","scale","rotation","opacity"])if(saved[key]!==undefined)item[key]=saved[key];if(saved.scatterGenerated)item.scatterGenerated=true;else delete item.scatterGenerated;}
    for(const mark of state.marks){const saved=markMap.get(String(mark.id));if(!saved)continue;for(const key of ["color","endColor","opacity","transformX","transformY","transformScale","transformRotation"])if(saved[key]!==undefined)mark[key]=saved[key];}
    if(typeof snap.background==="string")$("bg").value=snap.background;$("transparent").checked=isDoodleProject()?true:!!snap.transparent;
    if(Array.isArray(snap.palette))state.colorPalette=[...snap.palette];if(typeof snap.ink==="string"){$("ink").value=$("inkMobile").value=snap.ink;}
    const s=snap.settings||{};for(const key of ["neighborOpacity","count","minScale","maxScale","rotationAmount","scatterSpacing"])if(s[key]!==undefined)$(key).value=s[key];
    for(const key of ["scatterOverlap","scatterPreserveManual"])if(s[key]!==undefined)$(key).checked=!!s[key];
    rebuildPaletteUI();updateSettingReadouts();
    if(options.render!==false)renderAll();
    return true;
  }
  function applyVariation(id){
    const variation=state.variations.find(v=>v.id===id);if(!variation?.snapshot){setStatus("That variation is unavailable.");return false;}
    applyVariationSnapshot(variation.snapshot,{history:true,render:true});
    if(state.project)state.project.variation=variation.name;
    setStatus("Applied variation “"+variation.name+"”.");return true;
  }
  function renameVariation(id,name){
    const variation=state.variations.find(v=>v.id===id),title=String(name||"").trim().slice(0,80);
    if(!variation||!title){setStatus(!variation?"That variation is unavailable.":"Give the variation a name.");return false;}
    const previous=variation.name;variation.name=title;variation.updatedAt=new Date().toISOString();if(state.project?.variation===previous)state.project.variation=title;scheduleAutosave();setStatus("Renamed variation to “"+title+"”.");return true;
  }
  function duplicateVariation(id,name){
    const source=state.variations.find(v=>v.id===id);if(!source?.snapshot){setStatus("That variation is unavailable.");return null;}
    const title=String(name||("Copy of "+source.name)).trim().slice(0,80)||("Copy of "+source.name).slice(0,80),now=new Date().toISOString();
    const copy={id:"variation-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),name:title,createdAt:now,updatedAt:now,snapshot:JSON.parse(JSON.stringify(source.snapshot))};
    state.variations.unshift(copy);if(state.variations.length>30)state.variations.length=30;scheduleAutosave();setStatus("Duplicated variation as “"+title+"”.");return copy;
  }
  function compareVariation(id){
    const variation=state.variations.find(v=>v.id===id);if(!variation?.snapshot)return {changes:-1,summary:"Variation unavailable"};
    const current=variationSnapshot(),snap=variation.snapshot;let changes=0,sections=[];
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    if(current.background!==snap.background||current.transparent!==snap.transparent){changes++;sections.push("background");}
    if(!same(current.palette,snap.palette)||current.ink!==snap.ink){changes++;sections.push("palette");}
    const itemMap=new Map((current.items||[]).map(item=>[String(item.id),item]));let itemChanges=0;
    for(const saved of snap.items||[]){const now=itemMap.get(String(saved.id));if(!now||!same(now,saved))itemChanges++;}
    if(itemChanges){changes+=itemChanges;sections.push(itemChanges+" motif transform"+(itemChanges===1?"":"s"));}
    const markMap=new Map((current.marks||[]).map(mark=>[String(mark.id),mark]));let markChanges=0;
    for(const saved of snap.marks||[]){const now=markMap.get(String(saved.id));if(!now||!same(now,saved))markChanges++;}
    if(markChanges){changes+=markChanges;sections.push(markChanges+" drawn mark"+(markChanges===1?"":"s"));}
    const settingKeys=new Set([...Object.keys(current.settings||{}),...Object.keys(snap.settings||{})]),settingChanges=[...settingKeys].filter(key=>!same(current.settings?.[key],snap.settings?.[key])).length;
    if(settingChanges){changes+=settingChanges;sections.push(settingChanges+" setting"+(settingChanges===1?"":"s"));}
    return {changes,summary:changes?sections.join(" · "):"Matches current design"};
  }
  function deleteVariation(id){
    const before=state.variations.length;state.variations=state.variations.filter(v=>v.id!==id);if(state.variations.length===before)return false;scheduleAutosave();setStatus("Variation deleted.");return true;
  }
  function variationFilename(name,index){
    const stem=String(name||("Variation-"+(index+1))).replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"")||("Variation-"+(index+1));
    return String(index+1).padStart(2,"0")+"-"+stem;
  }
  async function exportVariationSet(){
    if(!state.variations.length){setStatus("Save at least one named variation before exporting a colourway set.");return false;}
    const working=variationSnapshot(),projectVariation=state.project?.variation||"",base=safeName(),editableProject=projectBlob(),files=[];
    try{
      for(let i=0;i<state.variations.length;i++){
        const variation=state.variations[i];setStatus("Rendering colourway "+(i+1)+" of "+state.variations.length+": "+variation.name+"…");
        applyVariationSnapshot(variation.snapshot,{history:false,render:false});if(state.project)state.project.variation=variation.name;
        const png=await renderPNGBlob();if(!png)throw new Error("Colourway PNG export was cancelled.");
        const stem=variationFilename(variation.name,i);
        files.push({name:`${base}-${stem}-master.png`,blob:png.blob},{name:`${base}-${stem}.svg`,blob:renderSVGBlob()});
      }
      files.push({name:`${base}-editable-project.json`,blob:editableProject});
      setStatus("Packaging "+state.variations.length+" saved colourways…");
      const zip=await makeZip(files);downloadBlob(zip,`${base}-colourways.zip`);setStatus("Colourway ZIP downloaded with "+state.variations.length+" saved variation"+(state.variations.length===1?"":"s")+", each as PNG and SVG.");return true;
    }catch(err){setStatus("Colourway export failed: "+err.message);return false;}
    finally{
      applyVariationSnapshot(working,{history:false,render:true});if(state.project)state.project.variation=projectVariation;rebuildPaletteUI();updateSettingReadouts();scheduleAutosave();
    }
  }
  window.PatternForgeVariations={
    list:()=>state.variations.map(v=>({id:v.id,name:v.name,createdAt:v.createdAt,updatedAt:v.updatedAt,comparison:compareVariation(v.id)})),
    save:saveVariation,apply:applyVariation,rename:renameVariation,duplicate:duplicateVariation,compare:compareVariation,remove:deleteVariation,exportSet:exportVariationSet
  };
  function projectData(){
    if(state.project)state.project.updatedAt=new Date().toISOString();
    return {format:"pattern-forge-v4",tile:4000,dpi:300,scaleModel:"adaptable-master-v1",
      project:state.project?{...state.project}:null,
      templateGuide:state.templateGuide?JSON.parse(JSON.stringify(state.templateGuide)):null,
      background:$("bg").value,transparent:$("transparent").checked,
      palette:{colors:state.colorPalette,saved:state.savedPalettes,ink:$("ink").value},
      seed:$("seed").value,settings:{gridCount:$("gridCount").value,gridOn:$("gridOn").checked,symmetry:$("symmetry").value,symmetryGuides:$("symmetryGuides").checked,constructionGuide:$("constructionGuide").value,guideOpacity:$("guideOpacity").value,snapOn:$("snapOn").checked,showTileBorder:$("showTileBorder").checked,neighborOpacity:$("neighborOpacity").value,brushSize:$("brushSize").value,brushStyle:$("brushStyle").value,strokeStabilisation:$("strokeStabilisation").value,pressureWidth:$("pressureWidth").checked,pressureMin:$("pressureMin").value,pressureSensitivity:$("pressureSensitivity").value,bucketTolerance:$("bucketTolerance").value,bucketSampleVisible:$("bucketSampleVisible").checked,stampShape:$("stampShape").value,inkOpacity:$("inkOpacity").value,textureAmount:$("textureAmount").value,gradientType:$("gradientType").value,gradientDirection:$("gradientDirection").value,gradientEnd:$("gradientEnd").value,count:$("count").value,minScale:$("minScale").value,maxScale:$("maxScale").value,rotationAmount:$("rotationAmount").value,scatterSpacing:$("scatterSpacing").value,scatterOverlap:$("scatterOverlap").checked,scatterPreserveManual:$("scatterPreserveManual").checked,focusPrintSize:$("focusPrintSize").value,focusPrintUnit:$("focusPrintUnit").value},
      assets:state.assets.map(({id,name,src,w,h,vector})=>({id,name,src,w,h,vector})),
      layers:state.layers.map(layer=>({...layer})),activeLayerId:state.activeLayerId,
      items:state.items,marks:state.marks,variations:state.variations,nextId:state.nextId};
  }
  function compactProjectData(){
    const data=projectData(),usedIds=new Set(data.items.map(item=>String(item.assetId))),assetBySource=new Map(),assetIdMap=new Map(),assets=[];
    for(const asset of data.assets){
      const oldId=String(asset.id);if(!usedIds.has(oldId))continue;
      let kept=assetBySource.get(asset.src);
      if(!kept){kept={...asset};assetBySource.set(asset.src,kept);assets.push(kept);}
      assetIdMap.set(oldId,kept.id);
    }
    data.assets=assets;
    data.items=data.items.map(item=>({...item,assetId:assetIdMap.get(String(item.assetId))??item.assetId}));
    return data;
  }
  let autosaveTimer=null,autosaveMaxTimer=null,autosaveDbPromise=null;
  function openAutosaveDb(){
    if(autosaveDbPromise)return autosaveDbPromise;
    autosaveDbPromise=new Promise((resolve,reject)=>{
      if(typeof indexedDB==="undefined"){reject(new Error("Local project storage is not supported here."));return;}
      const req=indexedDB.open("pattern-forge-local",2);
      req.onupgradeneeded=()=>{
        if(!req.result.objectStoreNames.contains("projects"))req.result.createObjectStore("projects");
        if(!req.result.objectStoreNames.contains("motifs"))req.result.createObjectStore("motifs",{keyPath:"id"});
      };
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Could not open local project storage."));
    });return autosaveDbPromise;
  }
  function motifLibraryTransaction(mode="readonly"){
    return openAutosaveDb().then(db=>{
      if(!db.objectStoreNames.contains("motifs"))throw new Error("Motif library is unavailable.");
      return db.transaction("motifs",mode);
    });
  }
  async function listSavedMotifs(){
    const tx=await motifLibraryTransaction("readonly");
    return await new Promise((resolve,reject)=>{const req=tx.objectStore("motifs").getAll();req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)));req.onerror=()=>reject(req.error);});
  }
  async function saveSelectionAsMotif(name){
    const records=selectedArtwork();if(!records.length)throw new Error("Select artwork before saving a motif.");
    const title=String(name||"").trim().slice(0,80);if(!title)throw new Error("Give the motif a name.");
    const geometry=records.length>1?selectionTransformGeometry():null,origin=geometry?.center||artworkCenter(records[0]);
    const assetIds=new Set(records.filter(record=>record.kind==="item").map(record=>String(record.artwork.assetId)));
    const assets=state.assets.filter(asset=>assetIds.has(String(asset.id))).map(({id,name,src,w,h,vector})=>({id,name,src,w,h,vector}));
    const ids=new Set(records.map(record=>record.artwork.id));
    const now=new Date().toISOString(),motif={
      id:"motif-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
      name:title,createdAt:now,updatedAt:now,origin,
      assets,
      items:state.items.filter(item=>ids.has(item.id)).map(item=>JSON.parse(JSON.stringify(item))),
      marks:state.marks.filter(mark=>ids.has(mark.id)).map(mark=>JSON.parse(JSON.stringify(mark)))
    };
    const tx=await motifLibraryTransaction("readwrite");
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error("Could not save motif."));tx.objectStore("motifs").put(motif);});
    window.dispatchEvent(new CustomEvent("patternforge:motifs-changed"));
    setStatus("Saved “"+title+"” to My Motifs.");return motif;
  }
  async function deleteSavedMotif(id){
    const tx=await motifLibraryTransaction("readwrite");
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error("Could not delete motif."));tx.objectStore("motifs").delete(id);});
    window.dispatchEvent(new CustomEvent("patternforge:motifs-changed"));setStatus("Motif removed from this device.");
  }
  async function decodeMotifAsset(asset){
    const existing=state.assets.find(candidate=>candidate.src===asset.src);if(existing)return existing;
    const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("A saved motif image could not be decoded."));img.src=asset.src;});
    const added={...asset,id:nextAssetId(),img,w:Number(asset.w)||img.naturalWidth||1000,h:Number(asset.h)||img.naturalHeight||1000};
    state.assets.push(added);state.recentAssetIds.unshift(added.id);return added;
  }
  async function insertSavedMotif(id){
    const tx=await motifLibraryTransaction("readonly");
    const motif=await new Promise((resolve,reject)=>{const req=tx.objectStore("motifs").get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    if(!motif)throw new Error("That motif is no longer in the library.");
    const assetMap=new Map();for(const asset of motif.assets||[])assetMap.set(String(asset.id),(await decodeMotifAsset(asset)).id);
    saveHistory();
    const target=worldPoint({x:canvas.width/2,y:canvas.height/2}),origin=motif.origin||{x:TILE/2,y:TILE/2},dx=target.x-origin.x,dy=target.y-origin.y,newIds=[],groupId=newGroupId();
    for(const original of motif.items||[]){
      const copy=JSON.parse(JSON.stringify(original)),pos=isDoodleProject()?{x:Number(original.x)+dx,y:Number(original.y)+dy}:canonicalPoint(Number(original.x)+dx,Number(original.y)+dy);
      copy.id=state.nextId++;copy.assetId=assetMap.get(String(original.assetId))??original.assetId;copy.layerId=motifTargetLayerId();copy.groupId=groupId;copy.x=pos.x;copy.y=pos.y;state.items.push(copy);newIds.push(copy.id);
    }
    const markLayer=layerById(BASE_LAYER_IDS.drawing)?.id||activeLayer()?.id||state.layers[0]?.id;
    for(const original of motif.marks||[]){
      const copy=JSON.parse(JSON.stringify(original)),t=markTransformValues(copy);copy.id=state.nextId++;copy.layerId=markLayer;copy.groupId=groupId;copy.transformX=t.x+dx;copy.transformY=t.y+dy;state.marks.push(copy);newIds.push(copy.id);
    }
    rebuildAssetGrid();setSelection(newIds,newIds.at(-1));renderAll();setStatus("Inserted “"+String(motif.name||"motif")+"” as an editable group.");return newIds.length;
  }
  window.PatternForgeMotifs={list:listSavedMotifs,saveSelection:saveSelectionAsMotif,insert:insertSavedMotif,remove:deleteSavedMotif};
  function scheduleAutosave(){
    if(autosaveTimer)clearTimeout(autosaveTimer);
    if(!autosaveMaxTimer)autosaveMaxTimer=setTimeout(()=>{if(autosaveTimer)clearTimeout(autosaveTimer);autosaveTimer=null;autosaveMaxTimer=null;saveAutosave();},5000);
    autosaveTimer=setTimeout(()=>{autosaveTimer=null;if(autosaveMaxTimer)clearTimeout(autosaveMaxTimer);autosaveMaxTimer=null;saveAutosave();},900);
  }
  async function saveAutosave(){
    autosaveTimer=null;
    if(!state.project)return;
    try{const db=await openAutosaveDb(),data=projectData(),json=JSON.stringify(data);
      await new Promise((resolve,reject)=>{const tx=db.transaction("projects","readwrite"),store=tx.objectStore("projects");tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error("Local autosave failed."));store.put(json,data.project.id);store.put(data.project.id,"current");});
      try{localStorage.removeItem("patternForgeAutosave");}catch(_){}
      setStatus("Autosaved on this device.");
    }catch(err){try{const json=JSON.stringify(projectData());if(json.length>3_500_000)throw err;localStorage.setItem("patternForgeAutosave",json);setStatus("Autosaved on this device.");}catch(_){setStatus("Automatic device save is unavailable. Export a project ZIP to keep a portable copy.");}}
  }
  let pendingAutosaveData=null;
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
    let available=false,projectType=null;
    window.PatternForgeAutosaveState={status:"pending",available:false,projectType:null};
    try{let json;
      try{const db=await openAutosaveDb();json=await new Promise((resolve,reject)=>{const tx=db.transaction("projects","readonly"),store=tx.objectStore("projects"),req=store.get("current");req.onsuccess=async()=>{
        const current=req.result;if(typeof current==="string"&&current.startsWith("pf-project-")){const get=store.get(current);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);}else resolve(current);
      };req.onerror=()=>reject(req.error);});}
      catch(_){/* The fallback may contain a newer save after a failed transaction. */}
      let fallback=null;try{fallback=localStorage.getItem("patternForgeAutosave");}catch(_){}
      if(!json&&!fallback)return;
      const candidates=[];
      for(const raw of [json,fallback]){
        if(!raw)continue;
        try{const value=typeof raw==="string"?JSON.parse(raw):raw;validateProjectData(value);candidates.push(value);}catch(_){}
      }
      if(!candidates.length)throw new Error("No valid autosave could be reopened.");
      candidates.sort((a,b)=>(Date.parse(b.project?.updatedAt)||0)-(Date.parse(a.project?.updatedAt)||0));
      const data=candidates[0];
      projectType=data.project?.projectType==="doodle"?"doodle":"pattern";
      const directDoodle=location.pathname.includes("/app/doodle/");
      if(directDoodle){
        available=true;
        if(projectType==="doodle"){
          await restoreProject(data);
          $("projectSetupOverlay").hidden=true;
          setStatus("Doodle restored on this device.");
        }
        return;
      }
      showResumePrompt(data);
      available=true;
      setStatus("A saved project is available on this device.");
    }catch(_){setStatus("The previous autosave could not be reopened. Your other project files are unaffected.");}
    finally{
      window.PatternForgeAutosaveState={status:"complete",available,projectType};
      window.dispatchEvent(new CustomEvent("patternforge:autosave-checked",{detail:{available,projectType}}));
    }
  }
  function validateProjectData(data){
    if(!data||typeof data!=="object"||!["pattern-forge-v1","pattern-forge-v2","pattern-forge-v3","pattern-forge-v4"].includes(data.format)||!Array.isArray(data.assets)||!Array.isArray(data.items)||!Array.isArray(data.marks))throw new Error("wrong-format");
    if(data.assets.length>500||data.items.length>10000||data.marks.length>10000||(Array.isArray(data.layers)&&data.layers.length>100))throw new Error("too-large");
    if(data.variations!==undefined&&(!Array.isArray(data.variations)||data.variations.length>30||data.variations.some(v=>!v||typeof v.id!=="string"||typeof v.name!=="string"||!v.snapshot||typeof v.snapshot!=="object")))throw new Error("wrong-format");
    if(data.templateGuide!==undefined&&data.templateGuide!==null&&!normaliseTemplateGuide(data.templateGuide))throw new Error("invalid-template");
    if(data.format==="pattern-forge-v4"){
      if(!Array.isArray(data.layers)||!data.layers.length)throw new Error("invalid-layers");
      const layerIds=new Set();
      for(const layer of data.layers){
        const id=String(layer?.id||"").trim(),opacity=Number(layer?.opacity);
        if(!id||layerIds.has(id)||!Number.isFinite(opacity)||opacity<0||opacity>1||(layer.alphaLock!==undefined&&typeof layer.alphaLock!=="boolean"))throw new Error("invalid-layers");
        layerIds.add(id);
      }
      if(data.activeLayerId!==undefined&&!layerIds.has(String(data.activeLayerId)))throw new Error("invalid-layers");
      if(data.items.some(item=>item?.layerId!==undefined&&!layerIds.has(String(item.layerId)))||data.marks.some(mark=>mark?.layerId!==undefined&&!layerIds.has(String(mark.layerId))))throw new Error("invalid-layers");
    }
    const assetIds=new Set();
    for(const a of data.assets){
      if(!a||a.id===undefined||assetIds.has(String(a.id))||typeof a.src!=="string"||!a.src.startsWith("data:image/")||!Number.isFinite(Number(a.w))||!Number.isFinite(Number(a.h))||Number(a.w)<=0||Number(a.h)<=0)throw new Error("invalid-assets");
      assetIds.add(String(a.id));
    }
    for(const item of data.items){
      if(!item||item.id===undefined||!assetIds.has(String(item.assetId))||![item.x,item.y,item.scale].every(v=>Number.isFinite(Number(v)))||Number(item.scale)<=0)throw new Error("invalid-items");
      if(item.groupId!==undefined&&item.groupId!==null&&(typeof item.groupId!=="string"||item.groupId.length>100))throw new Error("invalid-items");
      if((item.flipX!==undefined&&typeof item.flipX!=="boolean")||(item.flipY!==undefined&&typeof item.flipY!=="boolean"))throw new Error("invalid-items");
    }
    const markTypes=new Set(["brush","eraser","line","rect","ellipse","freefill","bucket","gradient"]);
    if(data.marks.some(mark=>{
      const badPoint=point=>!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||(point.p!==undefined&&(!Number.isFinite(Number(point.p))||Number(point.p)<0||Number(point.p)>1));
      const badBucket=mark?.type==="bucket"&&(!Array.isArray(mark.paths)||mark.paths.length>512||mark.paths.some(path=>!Array.isArray(path)||path.length<3||path.some(badPoint))||mark.paths.reduce((sum,path)=>sum+path.length,0)>25000);
      return !mark||typeof mark!=="object"||!markTypes.has(mark.type)||!Array.isArray(mark.points)||mark.points.some(badPoint)||badBucket||(mark.groupId!==undefined&&mark.groupId!==null&&(typeof mark.groupId!=="string"||mark.groupId.length>100))||(mark.transformFlipX!==undefined&&typeof mark.transformFlipX!=="boolean")||(mark.transformFlipY!==undefined&&typeof mark.transformFlipY!=="boolean")||(mark.pressureWidth!==undefined&&typeof mark.pressureWidth!=="boolean")||(mark.pressureMin!==undefined&&(!Number.isFinite(Number(mark.pressureMin))||Number(mark.pressureMin)<5||Number(mark.pressureMin)>80))||(mark.pressureSensitivity!==undefined&&(!Number.isFinite(Number(mark.pressureSensitivity))||Number(mark.pressureSensitivity)<0||Number(mark.pressureSensitivity)>100))||(mark.alphaLocked!==undefined&&typeof mark.alphaLocked!=="boolean");
    }))throw new Error("invalid-marks");
  }
  function projectOpenErrorMessage(err){
    const code=err?.message||"";
    if(code==="wrong-format")return "That file is not a Pattern Forge project. Choose a JSON project or ZIP exported by Pattern Forge. Your current work is unchanged.";
    if(code==="too-large")return "That project is larger than Pattern Forge can open. Your current work is unchanged.";
    if(code==="invalid-assets"||code==="invalid-items"||code==="invalid-marks"||code==="invalid-layers"||code==="invalid-template"||code==="Invalid image in project")return "This Pattern Forge project appears incomplete or damaged. Your current work is unchanged.";
    if(err instanceof SyntaxError)return "This file is not valid project JSON. Choose a Pattern Forge JSON file or exported project ZIP. Your current work is unchanged.";
    return "Pattern Forge could not open that project. Check that the file is a complete JSON project or ZIP exported by the app. Your current work is unchanged.";
  }
  async function restoreProject(data,options={}){
    validateProjectData(data);
    const assets=[];for(const a of data.assets){if(typeof a.src!=="string"||!a.src.startsWith("data:image/"))throw Error("Invalid image in project");const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=a.src;});assets.push({...a,img});}
    const incoming=data.project&&typeof data.project==="object"?data.project:{};
    state.project={id:options.asCopy?newProjectId():(typeof incoming.id==="string"&&incoming.id.startsWith("pf-project-")?incoming.id:newProjectId()),title:String(incoming.title||data.seed||"Untitled project").slice(0,80),customer:String(incoming.customer||"").slice(0,80),theme:String(incoming.theme||"").slice(0,60),variation:String(incoming.variation||"").slice(0,60),projectType:incoming.projectType==="doodle"?"doodle":"pattern",repeatStyle:incoming.projectType==="doodle"?"straight":(["straight","half-drop","brick"].includes(incoming.repeatStyle)?incoming.repeatStyle:"straight"),isPractice:options.asCopy?false:!!incoming.isPractice,createdAt:incoming.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    state.templateGuide=isDoodleProject()?null:normaliseTemplateGuide(data.templateGuide);
    state.layers=normaliseLayers(data.layers);
    const validLayerIds=new Set(state.layers.map(layer=>layer.id));
    const motifsFallback=validLayerIds.has(BASE_LAYER_IDS.motifs)?BASE_LAYER_IDS.motifs:state.layers[0].id;
    const drawingFallback=validLayerIds.has(BASE_LAYER_IDS.drawing)?BASE_LAYER_IDS.drawing:state.layers[state.layers.length-1].id;
    state.activeLayerId=validLayerIds.has(String(data.activeLayerId))?String(data.activeLayerId):drawingFallback;
    state.assets=assets;state.items=data.items.map(item=>({...item,groupId:typeof item.groupId==="string"?item.groupId:null,layerId:validLayerIds.has(String(item.layerId))?String(item.layerId):motifsFallback}));state.marks=data.marks.map(m=>({opacity:1,texture:0,brushStyle:"ink",stampShape:"leaf",...m,groupId:typeof m.groupId==="string"?m.groupId:null,layerId:validLayerIds.has(String(m.layerId))?String(m.layerId):drawingFallback}));
    state.recentAssetIds=assets.slice(-9).reverse().map(a=>a.id);state.variations=Array.isArray(data.variations)?data.variations.slice(0,30):[];state.nextId=Math.max(1,Number(data.nextId)||1);clearSelection();state.past=[];state.future=[];
    $("bg").value=data.background||"#ffffff";$("transparent").checked=isDoodleProject()?true:!!data.transparent;if(typeof data.seed==="string")$("seed").value=data.seed;const s=data.settings||{};
    for(const [id,key] of [["gridCount","gridCount"],["symmetry","symmetry"],["constructionGuide","constructionGuide"],["guideOpacity","guideOpacity"],["brushSize","brushSize"],["brushStyle","brushStyle"],["strokeStabilisation","strokeStabilisation"],["pressureMin","pressureMin"],["pressureSensitivity","pressureSensitivity"],["bucketTolerance","bucketTolerance"],["stampShape","stampShape"],["inkOpacity","inkOpacity"],["textureAmount","textureAmount"],["gradientType","gradientType"],["gradientDirection","gradientDirection"],["gradientEnd","gradientEnd"],["neighborOpacity","neighborOpacity"],["count","count"],["minScale","minScale"],["maxScale","maxScale"],["rotationAmount","rotationAmount"],["scatterSpacing","scatterSpacing"],["focusPrintSize","focusPrintSize"],["focusPrintUnit","focusPrintUnit"]])if(s[key]!==undefined)$(id).value=s[key];
    for(const [id,key] of [["gridOn","gridOn"],["symmetryGuides","symmetryGuides"],["snapOn","snapOn"],["showTileBorder","showTileBorder"],["scatterOverlap","scatterOverlap"],["scatterPreserveManual","scatterPreserveManual"],["pressureWidth","pressureWidth"],["bucketSampleVisible","bucketSampleVisible"]])if(s[key]!==undefined)$(id).checked=!!s[key];
    if(data.palette){state.colorPalette=Array.isArray(data.palette.colors)?data.palette.colors:[...state.colorPalette];state.savedPalettes=Array.isArray(data.palette.saved)?data.palette.saved:state.savedPalettes;setInkColour(data.palette.ink||"#2c5f54");rebuildPaletteUI();}
    $("brushSizeLabel").textContent=$("brushSize").value;$("pressureMinLabel").textContent=$("pressureMin").value+"%";$("pressureSensitivityLabel").textContent=$("pressureSensitivity").value+"%";$("inkOpacityLabel").textContent=$("inkOpacity").value+"%";$("textureLabel").textContent=$("textureAmount").value+"%";$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";
    updateProjectModeUi();rebuildAssetGrid();renderAll();setProjectBadge();updatePixelReadout();updateSettingReadouts();updatePrintEligibility();saveAutosave();
  }
  function uint16LE(n){return new Uint8Array([n&255,(n>>>8)&255]);}
  function uint32LE(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
  async function makeZip(files){
    const encoder=new TextEncoder(),localParts=[],centralParts=[];
    let offset=0;
    const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2);
    const dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    for(const file of files){
      const name=encoder.encode(file.name),data=new Uint8Array(await file.blob.arrayBuffer());
      if(data.length>0xffffffff)throw Error(`${file.name} exceeds the ZIP size limit.`);
      let method=0,packed=data;
      if(/\.(?:svg|json|txt|xml|csv|html)$/i.test(file.name)&&typeof CompressionStream!="undefined"){
        try{const stream=new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw")),compressed=new Uint8Array(await new Response(stream).arrayBuffer());if(compressed.length<data.length){method=8;packed=compressed;}}
        catch(_){/* Keep the ZIP compatible when raw DEFLATE is unavailable. */}
      }
      const crc=crc32(data),flags=0x0800;
      const local=concatArrays([uint32LE(0x04034b50),uint16LE(20),uint16LE(flags),uint16LE(method),uint16LE(dosTime),uint16LE(dosDate),uint32LE(crc),uint32LE(packed.length),uint32LE(data.length),uint16LE(name.length),uint16LE(0),name]);
      const central=concatArrays([uint32LE(0x02014b50),uint16LE(20),uint16LE(20),uint16LE(flags),uint16LE(method),uint16LE(dosTime),uint16LE(dosDate),uint32LE(crc),uint32LE(packed.length),uint32LE(data.length),uint16LE(name.length),uint16LE(0),uint16LE(0),uint16LE(0),uint16LE(0),uint32LE(0),uint32LE(offset),name]);
      localParts.push(local,packed);centralParts.push(central);offset+=local.length+packed.length;
      if(offset>0xffffffff)throw Error("The ZIP is larger than the standard ZIP format supports.");
    }
    const centralDirectory=concatArrays(centralParts);
    const end=concatArrays([uint32LE(0x06054b50),uint16LE(0),uint16LE(0),uint16LE(files.length),uint16LE(files.length),uint32LE(centralDirectory.length),uint32LE(offset),uint16LE(0)]);
    return new Blob([...localParts,centralDirectory,end],{type:"application/zip"});
  }
  async function projectFromZip(file){
    const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder();let offset=0;
    while(offset+30<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
      const method=view.getUint16(offset+8,true),compressed=view.getUint32(offset+18,true),nameLen=view.getUint16(offset+26,true),extraLen=view.getUint16(offset+28,true),nameStart=offset+30,name=decoder.decode(bytes.slice(nameStart,nameStart+nameLen)),dataStart=nameStart+nameLen+extraLen,dataEnd=dataStart+compressed;
      if(dataEnd>bytes.length)throw Error("ZIP is incomplete or damaged.");
      if(name.endsWith("-editable-project.json")||name==="editable-project.json"){
        let content=bytes.slice(dataStart,dataEnd);
        if(method===8){if(typeof DecompressionStream==="undefined")throw Error("This browser cannot open compressed project ZIPs. Try the ZIP exported directly from this app.");const stream=new Blob([content]).stream().pipeThrough(new DecompressionStream("deflate-raw"));content=new Uint8Array(await new Response(stream).arrayBuffer());}
        else if(method!==0)throw Error("This ZIP uses an unsupported compression method.");
        return JSON.parse(decoder.decode(content));
      }
      if(method!==0&&method!==8)throw Error("This ZIP uses an unsupported compression method.");offset=dataEnd;
    }
    throw Error("No editable Pattern Forge project was found inside that ZIP.");
  }
  async function shareOrDownloadZip(blob,name){
    try{
      if(typeof navigator!=="undefined"&&navigator.share&&typeof File!=="undefined"){
        const file=new File([blob],name,{type:"application/zip"});
        if(!navigator.canShare||navigator.canShare({files:[file]})){
          try{await navigator.share({files:[file],title:"Pattern project",text:"Editable seamless pattern project and PNG/SVG exports."});setStatus("ZIP sent to the selected app. It contains the editable project, PNG and SVG.");return;}
          catch(err){if(err?.name==="AbortError"){setStatus("Sharing cancelled. Choose Download project bundle (ZIP) again to select a destination.");return;}throw err;}
        }
      }
    }catch(err){if(err?.name==="AbortError")return;}
    downloadBlob(blob,name);setStatus("ZIP downloaded. Find it in Downloads, then use your device’s file manager or sharing tools to move it.");
  }
  async function exportZIP(){
    try{
      setStatus("Preparing PNG, SVG and editable project for ZIP…");
      const png=await renderPNGBlob();if(!png){setStatus("ZIP export cancelled.");return;}
      const base=safeName();
      const files=[
        {name:`${base}-${exportFileStem()}-master.png`,blob:png.blob},
        {name:`${base}-${exportFileStem()}.svg`,blob:renderSVGBlob()},
        {name:`${base}-editable-project.json`,blob:projectBlob()}
      ];
      setStatus("Packaging the editable project, PNG and SVG into a ZIP…");
      const zip=await makeZip(files);
      await shareOrDownloadZip(zip,`${base}-${isDoodleProject()?"doodle":"pattern"}-project.zip`);
    }catch(err){setStatus("ZIP export failed: "+err.message);}
  }


  window.PatternForgeEtsyBridge=Object.freeze({
    get state(){return state;},
    getSpec:getExportSpec,
    getRepeatStyle:projectRepeatStyle,
    getMultipliers:exportMultipliers,
    makeTileCanvas,
    renderPNGBlob,
    renderSVGBlob,
    makeZip,
    downloadBlob,
    safeName,
    setStatus,
    isDoodle:isDoodleProject,
    assetOf,
    layerForArtwork,
    layerIsRenderable,
    baseLayerIds:BASE_LAYER_IDS
  });

  $("drop").addEventListener("click",()=>$("files").click());
  $("files").addEventListener("click",e=>e.stopPropagation());
  $("files").addEventListener("change",e=>addFiles([...e.target.files]).catch(()=>setStatus("The selected image could not be opened. Choose a PNG, JPG, WebP or SVG file and try again.")));
  ["dragenter","dragover"].forEach(ev=>$("drop").addEventListener(ev,e=>{e.preventDefault();$("drop").classList.add("drag");}));
  ["dragleave","drop"].forEach(ev=>$("drop").addEventListener(ev,e=>{e.preventDefault();$("drop").classList.remove("drag");}));
  $("drop").addEventListener("drop",e=>addFiles([...e.dataTransfer.files]).catch(()=>setStatus("The dropped image could not be opened. Choose a PNG, JPG, WebP or SVG file and try again.")));

  $("generate").onclick=generate;
  $("freezeScatter").onclick=freezeScatter;
  $("shuffle").onclick=()=>{$("seed").value="pattern-"+Math.random().toString(36).slice(2,8);generate();};
  $("clear").onclick=()=>{saveHistory();state.items=[];state.marks=[];state.selectedId=null;renderAll();setStatus("Artwork cleared. Uploaded images remain available.");};
  $("exportPng").onclick=()=>exportPNG().catch(err=>setStatus("PNG export failed: "+err.message));
  $("exportSvg").onclick=exportSVG;
  $("exportZip").onclick=exportZIP;
  $("previewScale").addEventListener("input",renderPreview);
  $("rotationAmount").addEventListener("input",()=>{$("rotationLabel").textContent=$("rotationAmount").value+"°";});
  $("bucketTolerance").addEventListener("input",()=>{$("bucketToleranceLabel").textContent=$("bucketTolerance").value+"%";scheduleAutosave();});
  $("bucketSampleVisible").addEventListener("change",scheduleAutosave);
  $("strokeStabilisation").addEventListener("change",scheduleAutosave);
  $("pressureMin").addEventListener("input",()=>{$("pressureMinLabel").textContent=$("pressureMin").value+"%";scheduleAutosave();});
  $("pressureSensitivity").addEventListener("input",()=>{$("pressureSensitivityLabel").textContent=$("pressureSensitivity").value+"%";scheduleAutosave();});
  $("pressureWidth").addEventListener("change",scheduleAutosave);
  ["scatterSpacing","scatterOverlap","scatterPreserveManual"].forEach(id=>$(id).addEventListener("change",scheduleAutosave));
  ["bg","transparent","gridOn","gridCount","showTileBorder","symmetry","symmetryGuides","constructionGuide"].forEach(id=>$(id).addEventListener("input",()=>renderAll()));
  $("guideOpacity").addEventListener("input",()=>{$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";renderAll();});
  $("snapOn").addEventListener("change",()=>{if(!$("snapOn").checked)clearSnapGuides();renderAll(false,false);});
  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    const nextTool=b.dataset.tool;
    if(nextTool==="eyedropper"){
      if(state.tool!=="eyedropper")state.previousTool=state.tool;
    }else state.previousTool=nextTool;
    state.tool=nextTool;
    document.querySelectorAll("[data-tool]").forEach(t=>t.classList.toggle("active",t.dataset.tool===state.tool));
    updateToolHighlight();
    canvas.style.cursor=state.tool==="pan"?"grab":state.tool==="select"?"default":state.tool==="eyedropper"?"copy":"crosshair";
    setStatus(`${b.textContent} tool active.`);
  }));
  $("layerAdd").addEventListener("click",addLayer);
  $("layerDuplicate").addEventListener("click",duplicateActiveLayer);
  $("layerDelete").addEventListener("click",deleteActiveLayer);
  $("layerUp").addEventListener("click",()=>moveActiveLayer(1));
  $("layerDown").addEventListener("click",()=>moveActiveLayer(-1));
  let layerNameEditStart="";
  let layerNameEditDirty=false;
  $("layerName").addEventListener("focus",()=>{
    const layer=activeLayer();
    layerNameEditStart=layer?.name||"";
    layerNameEditDirty=false;
  });
  $("layerName").addEventListener("input",()=>{
    const layer=activeLayer();if(!layer)return;
    if(!layerNameEditDirty){saveHistory();layerNameEditDirty=true;}
    const value=$("layerName").value.slice(0,80);
    layer.name=value;
    const activeName=document.querySelector(".layerRow.active .layerRowName");
    if(activeName)activeName.textContent=value.trim()||"Untitled layer";
  });
  $("layerName").addEventListener("blur",()=>{
    const layer=activeLayer();if(!layer||!layerNameEditDirty)return;
    const name=$("layerName").value.trim();
    layer.name=(name||layerNameEditStart||nextLayerName()).slice(0,80);
    $("layerName").value=layer.name;
    layerNameEditDirty=false;
    renderAll();
    setStatus(`Layer renamed to “${layer.name}”.`);
  });
  $("layerName").addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();$("layerName").blur();}
  });
  $("layerOpacity").addEventListener("input",()=>{$("layerOpacityValue").textContent=$("layerOpacity").value+"%";});
  $("layerOpacity").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.opacity=clamp(Number($("layerOpacity").value)/100,0,1);renderAll();});
  $("layerVisible").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.visible=$("layerVisible").checked;const selectedLayerId=selectedItem()?.layerId||selectedMark()?.layerId;if(!layer.visible&&selectedLayerId===layer.id)state.selectedId=null;renderAll();});
  $("layerLocked").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.locked=$("layerLocked").checked;const selectedLayerId=selectedItem()?.layerId||selectedMark()?.layerId;if(layer.locked&&selectedLayerId===layer.id)state.selectedId=null;renderAll();});
  $("layerAlphaLock").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.alphaLock=$("layerAlphaLock").checked;renderAll();setStatus(layer.alphaLock?`Alpha Lock enabled on “${layer.name}”. New paint stays inside existing layer transparency.`:`Alpha Lock disabled on “${layer.name}”.`);});
  $("layerExport").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.export=$("layerExport").checked;renderAll();});
  $("layerClipToBelow").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;const index=state.layers.indexOf(layer);if(index<=0){$("layerClipToBelow").checked=false;setStatus("The bottom layer cannot be clipped because there is no layer below it.");return;}saveHistory();layer.clipToBelow=$("layerClipToBelow").checked;renderAll();setStatus(layer.clipToBelow?"Layer clipped to the transparency of the layer below.":"Layer clipping removed.");});
  rebuildLayerUI();
  loadSavedPalettes();rebuildPaletteUI();
  $("savedPaletteSelect").addEventListener("change",e=>{
    const value=e.target.value;
    if(value==="default")state.colorPalette=["#2c5f54","#d66a4d","#e8bc52","#20242b"];
    else{const p=state.savedPalettes[Number(value.slice(6))];if(p)state.colorPalette=[...p.colors];}
    rebuildPaletteUI();scheduleAutosave();
  });
  $("addPaletteColour").addEventListener("click",()=>{
    const color=$("ink").value;if(!state.colorPalette.includes(color))state.colorPalette.push(color);
    rebuildPaletteUI();scheduleAutosave();setStatus(`${color} added to the current palette.`);
  });
  $("savePalette").addEventListener("click",()=>{
    const name=typeof prompt==="function"?prompt("Name this palette:","My palette"):"My palette";if(!name||!name.trim())return;
    state.savedPalettes.push({name:name.trim(),colors:[...state.colorPalette]});
    try{localStorage.setItem("patternForgePalettes",JSON.stringify(state.savedPalettes));}catch(_){setStatus("Palette saved for this session, but device storage is full.");return;}
    rebuildPaletteUI();$("savedPaletteSelect").value=`saved-${state.savedPalettes.length-1}`;setStatus(`Palette “${name.trim()}” saved on this device.`);
  });
  $("mobileAdd").onclick=()=>$("files").click();
  $("inkMobile").addEventListener("input",()=>setInkColour($("inkMobile").value));
  $("ink").addEventListener("input",()=>setInkColour($("ink").value));
  $("brushSize").addEventListener("input",()=>{$("brushSizeLabel").textContent=$("brushSize").value;scheduleAutosave();});
  $("inkOpacity").addEventListener("input",()=>{$("inkOpacityLabel").textContent=$("inkOpacity").value+"%";scheduleAutosave();});
  $("textureAmount").addEventListener("input",()=>{$("textureLabel").textContent=$("textureAmount").value+"%";scheduleAutosave();});
  ["brushStyle","stampShape","gradientType","gradientDirection","gradientEnd"].forEach(id=>$(id).addEventListener("input",scheduleAutosave));
  $("undo").onclick=()=>restoreHistory(state.past,state.future);
  $("redo").onclick=()=>restoreHistory(state.future,state.past);
  $("startAgain").onclick=startAgain;
  $("zoom").addEventListener("input",()=>setZoom(parseInt($("zoom").value,10)/100));
  $("neighborOpacity").addEventListener("input",()=>{$("neighborLabel").textContent=$("neighborOpacity").value+"%";renderAll(false,false);});
  $("zoomOut").onclick=()=>setZoom(state.zoom/1.25);
  $("zoomIn").onclick=()=>setZoom(state.zoom*1.25);
  $("fit").onclick=fitCanvasView;
  $("focusPrintSize").addEventListener("input",()=>{updatePrintEligibility();scheduleAutosave();});
  $("repeatPreviewToggle").addEventListener("click",()=>{
    if(isDoodleProject()){setStatus("Doodle Projects use one standalone canvas and do not have a repeat preview.");return;}
    state.focusRepeatPreview=!state.focusRepeatPreview;
    $("repeatPreviewToggle").setAttribute("aria-pressed",String(state.focusRepeatPreview));
    $("repeatPreviewToggle").textContent=state.focusRepeatPreview?"Tile only":"Preview repeat";
    setStatus(state.focusRepeatPreview?"Repeat preview on. Tap again to return to the full-size tile.":"Full-size tile view restored.");renderAll(false,false);
  });
  let lastPrintUnit=$("focusPrintUnit").value;
  $("focusPrintUnit").addEventListener("change",()=>{
    const nextUnit=$("focusPrintUnit").value,value=Number($("focusPrintSize").value);
    if(Number.isFinite(value)&&value>0&&nextUnit!==lastPrintUnit){
      $("focusPrintSize").value=(nextUnit==="cm"?value*2.54:value/2.54).toFixed(3);
    }
    lastPrintUnit=nextUnit;updatePrintEligibility();scheduleAutosave();
  });
  updatePrintEligibility();
  updateToolHighlight();
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&stageWrap.classList.contains("focus-mode")&&!helpDialog.open){leaveFocus();return;}
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
      e.preventDefault();restoreHistory(e.shiftKey?state.future:state.past,e.shiftKey?state.past:state.future);
    }
  });

  $("saveProject").onclick=()=>{
    downloadBlob(projectBlob(),`${safeName()}-editable-project.json`);
    setStatus("Editable project JSON downloaded. Use Download project bundle (ZIP) for the JSON, PNG and SVG together.");
  };
  $("projectMenu").addEventListener("click",showProjectSetup);
  $("continuePrevious").addEventListener("click",async()=>{
    if(!pendingAutosaveData)return showNewProjectSetup();
    try{const data=pendingAutosaveData;pendingAutosaveData=null;await restoreProject(data);$("projectSetupOverlay").hidden=true;setStatus("Previous project continued from this device.");}
    catch(_){showNewProjectSetup();setStatus("The previous autosave could not be reopened. Start a new project or open a project file instead.");}
  });
  $("startNewFromResume").addEventListener("click",showNewProjectSetup);
  $("startPractice").addEventListener("click",()=>startPracticeMode().catch(err=>setStatus("Could not start practice mode: "+err.message)));
  $("projectSetupForm").addEventListener("submit",createProjectFromSetup);
  $("projectTypeInput").addEventListener("change",updateSetupProjectType);
  $("cancelProjectSetup").addEventListener("click",()=>{
    if(state.project){$("projectSetupOverlay").hidden=true;return;}
    window.location.assign("/");
  });
  $("openProject").onclick=()=>$("projectFile").click();
  $("projectFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const data=/\.zip$/i.test(file.name)?await projectFromZip(file):JSON.parse(await file.text());
      await saveAutosave();await restoreProject(data,{asCopy:true});$("projectSetupOverlay").hidden=true;setStatus("Project opened as a separate design. Save a project file to keep a portable copy.");
    }catch(err){setStatus(projectOpenErrorMessage(err));}
    e.target.value="";
  });

  const mobileLayoutQuery=window.matchMedia("(max-width:760px)");
  const mobileDisclosureIds=["drawingControlsDisclosure","imagesDisclosure","layersDisclosure","previewDisclosure","exportDisclosure"];
  function setMobileSection(targetId="stageWrap"){
    if(!mobileLayoutQuery.matches)return;
    mobileDisclosureIds.forEach(id=>{const disclosure=$(id);if(disclosure)disclosure.open=false;});
    $("tileSettingsDisclosure").open=false;
    if(targetId==="drop")$("imagesDisclosure").open=true;
    else if(targetId==="tileSettingsDisclosure"){$("drawingControlsDisclosure").open=true;$("tileSettingsDisclosure").open=true;}
    else if(targetId==="exportSection")$("exportDisclosure").open=true;
  }
  setMobileSection();
  document.querySelectorAll("[data-mobile-jump]").forEach(button=>button.addEventListener("click",()=>{
    const targetId=button.dataset.mobileJump;
    setMobileSection(targetId);
    document.querySelectorAll("[data-mobile-jump]").forEach(item=>item.removeAttribute("aria-current"));
    button.setAttribute("aria-current","page");
    requestAnimationFrame(()=>$(targetId).scrollIntoView({behavior:"smooth",block:"start"}));
  }));
  ["gridCount","symmetry"].forEach(id=>$(id).addEventListener("change",updateSettingReadouts));
  updatePixelReadout();
  updateSettingReadouts();
  renderAll();
  loadAutosave();
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveAutosave();});
})();
