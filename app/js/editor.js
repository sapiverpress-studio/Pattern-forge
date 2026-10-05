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
      {id:BASE_LAYER_IDS.motifs,name:"Motifs",visible:true,opacity:1,locked:false,export:true},
      {id:BASE_LAYER_IDS.drawing,name:"Drawing",visible:true,opacity:1,locked:false,export:true}
    ];
  }
  function normaliseLayers(rawLayers){
    if(!Array.isArray(rawLayers)||!rawLayers.length)return defaultLayers();
    const seen=new Set(),layers=[];
    for(const raw of rawLayers){
      if(!raw||typeof raw!=="object")continue;
      const id=String(raw.id||"").trim();if(!id||seen.has(id))continue;seen.add(id);
      layers.push({id,name:String(raw.name||"Layer").slice(0,80),visible:raw.visible!==false,opacity:clamp(Number.isFinite(Number(raw.opacity))?Number(raw.opacity):1,0,1),locked:!!raw.locked,export:raw.export!==false});
    }
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
    savedPalettes:[],focusMode:false,focusRepeatPreview:false,
    pendingPreview: false, pendingSelected: false
  };

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
      const flags=[];if(layer.visible===false)flags.push("hidden");if(layer.locked)flags.push("locked");if(layer.export===false)flags.push("no export");
      const meta=document.createElement("span");meta.className="layerRowMeta";meta.textContent=`${layerArtworkCount(layer.id)} item${layerArtworkCount(layer.id)===1?"":"s"}${flags.length?" · "+flags.join(" · "):""}`;
      button.append(name,meta);
      button.addEventListener("click",()=>{state.activeLayerId=layer.id;rebuildLayerUI();scheduleAutosave();setStatus(`“${layer.name}” is the active layer.`);});
      list.appendChild(button);
    });
    const layer=activeLayer(),index=layer?state.layers.indexOf(layer):-1;
    const controls=["layerName","layerOpacity","layerVisible","layerLocked","layerExport","layerDuplicate","layerDelete","layerUp","layerDown"];
    controls.forEach(id=>$(id).disabled=!layer);
    if(!layer)return;
    $("layerName").value=layer.name;$("layerOpacity").value=Math.round(layer.opacity*100);$("layerOpacityValue").textContent=Math.round(layer.opacity*100)+"%";
    $("layerVisible").checked=layer.visible!==false;$("layerLocked").checked=!!layer.locked;$("layerExport").checked=layer.export!==false;
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
    saveHistory();const layer={id:newLayerId(),name:nextLayerName(),visible:true,opacity:1,locked:false,export:true};
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
    const toolName={select:"Select",brush:"Brush",pan:"Pan",line:"Line",rect:"Rectangle",ellipse:"Ellipse",freefill:"Freehand fill",gradient:"Gradient fill"}[returnTool]||"Previous";
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
  function getExportSpec(){
    const mult=exportMultipliers();
    return {dpi:300,wIn:4000*mult.x/300,hIn:4000*mult.y/300,wPx:4000*mult.x,hPx:4000*mult.y};
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
      const original=record.artwork,copy=JSON.parse(JSON.stringify(original));copy.id=state.nextId++;
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
    saveHistory();for(const mark of marks)mark.color=next;renderAll();setStatus("Recoloured "+marks.length+" editable mark"+(marks.length===1?"":"s")+".");return marks.length;
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
  function drawEditor(){
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle="#e9e4da";ctx.fillRect(0,0,W,H);
    const tile=makeTileCanvas(TILE,TILE,TILE,TILE);
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
    return {x:TILE/2+x*c-y*s,y:TILE/2+x*s+y*c};
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

  function markGeometryBounds(m){
    if(!m?.points?.length)return {minX:0,maxX:0,minY:0,maxY:0,cx:0,cy:0};
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of m.points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    return {minX,maxX,minY,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function markTransformValues(m){
    const rawScale=Number(m?.transformScale),rawRotation=Number(m?.transformRotation),rawX=Number(m?.transformX),rawY=Number(m?.transformY);
    return {x:Number.isFinite(rawX)?rawX:0,y:Number.isFinite(rawY)?rawY:0,scale:Number.isFinite(rawScale)?clamp(rawScale,.01,60):1,rotation:Number.isFinite(rawRotation)?rawRotation:0};
  }
  function markHasTransform(m){const t=markTransformValues(m);return Math.abs(t.x)>1e-9||Math.abs(t.y)>1e-9||Math.abs(t.scale-1)>1e-9||Math.abs(t.rotation)>1e-9;}
  function markTransformPoint(p,m){
    const b=markGeometryBounds(m),t=markTransformValues(m),dx=(p.x-b.cx)*t.scale,dy=(p.y-b.cy)*t.scale,c=Math.cos(t.rotation),s=Math.sin(t.rotation);
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
    c.translate(b.cx+t.x,b.cy+t.y);c.rotate(t.rotation);c.scale(t.scale,t.scale);c.translate(-b.cx,-b.cy);
  }
  function applySymmetryContext(c,mirrorX,mirrorY,angle){
    c.translate(TILE/2,TILE/2);c.rotate(angle);c.scale(mirrorX?-1:1,mirrorY?-1:1);c.translate(-TILE/2,-TILE/2);
  }
  function markSvgTransform(m){
    const b=markGeometryBounds(m),t=markTransformValues(m),deg=t.rotation*180/Math.PI;
    return `translate(${b.cx+t.x} ${b.cy+t.y}) rotate(${deg}) scale(${t.scale}) translate(${-b.cx} ${-b.cy})`;
  }
  function inverseMarkTransformPoint(p,m){
    const b=markGeometryBounds(m),t=markTransformValues(m),dx=p.x-(b.cx+t.x),dy=p.y-(b.cy+t.y),c=Math.cos(-t.rotation),s=Math.sin(-t.rotation);
    return {x:b.cx+(dx*c-dy*s)/t.scale,y:b.cy+(dx*s+dy*c)/t.scale};
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
        path();c.stroke();
        if(style==="texture"&&Number(m.texture||0)>0){
          const amount=clamp(Number(m.texture)||0,0,1),rng=mulberry32(hashString(String(m.id)+"texture")),step=Math.max(4,m.width*(1.4-amount));
          c.globalCompositeOperation="source-over";c.globalAlpha=opacity*(.3+amount*.55);c.fillStyle=m.color;
          for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],len=Math.hypot(b.x-a.x,b.y-a.y),count=Math.min(80,Math.ceil(len/step));for(let j=0;j<count;j++){const t=(j+rng())/Math.max(1,count),x=a.x+(b.x-a.x)*t+(rng()-.5)*m.width*.6,y=a.y+(b.y-a.y)*t+(rng()-.5)*m.width*.6,r=Math.max(.45,m.width*(.035+amount*.07)*rng());c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}}
        }
      }
    }
    c.restore();
  }
  function drawMarksWrapped(c,W,H,baseW=TILE,baseH=TILE,style=projectRepeatStyle(),layerId=null,layerOpacity=1,forExport=false){
    const sx=baseW/TILE,sy=baseH/TILE,clipW=W/sx,clipH=H/sy,basis=repeatBasis(TILE,TILE,style);
    c.save();c.scale(sx,sy);
    for(const m of state.marks){
      const layer=layerForArtwork(m,BASE_LAYER_IDS.drawing);
      if((layerId&&layer?.id!==layerId)||!layerIsRenderable(layer,forExport)||!m.points.length)continue;
      const effectiveOpacity=layerId?layerOpacity:layer.opacity;
      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        if(!markHasTransform(m)){
          const transformed={...m,points:m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle))};
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
          for(const p of transformed.points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
          const pad=m.width;minX-=pad;maxX+=pad;minY-=pad;maxY+=pad;
          const copies=artworkCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,basis);
          for(const copy of copies){c.save();c.translate(copy.x,copy.y);drawMark(c,transformed,effectiveOpacity);c.restore();}
        }else{
          const bounds=markTransformedBounds(m,mirrorX,mirrorY,angle),copies=artworkCopiesForBounds(bounds.minX,bounds.maxX,bounds.minY,bounds.maxY,clipW,clipH,basis);
          for(const copy of copies){
            c.save();c.translate(copy.x,copy.y);applySymmetryContext(c,mirrorX,mirrorY,angle);applyMarkTransformContext(c,m);drawMark(c,m,effectiveOpacity);c.restore();
          }
        }
      }
    }
    c.restore();
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
    for(const layer of state.layers){
      if(!layerIsRenderable(layer,forExport))continue;
      const hasEraser=state.marks.some(m=>m.type==="eraser"&&layerForArtwork(m,BASE_LAYER_IDS.drawing)?.id===layer.id&&m.points?.length);
      if(!hasEraser){
        for(const item of mapped){if(layerForArtwork(item,BASE_LAYER_IDS.motifs)?.id===layer.id)drawWrapped(c,item,W,H,false,basis,layer.opacity);}
        drawMarksWrapped(c,W,H,baseW,baseH,style,layer.id,layer.opacity,forExport);
        continue;
      }
      const surface=document.createElement("canvas");surface.width=W;surface.height=H;const lc=surface.getContext("2d");
      for(const item of mapped){if(layerForArtwork(item,BASE_LAYER_IDS.motifs)?.id===layer.id)drawWrapped(lc,item,W,H,false,basis,1);}
      drawMarksWrapped(lc,W,H,baseW,baseH,style,layer.id,1,forExport);
      c.save();c.globalAlpha=layer.opacity;c.drawImage(surface,0,0);c.restore();
    }
    return out;
  }

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
      box.textContent=state.marks.length?"Drawn lines and shapes render at the full 4000 px export size.":"Add artwork to calculate effective raster resolution.";
      return;
    }
    const spec=getExportSpec();
    const sx=spec.wPx/TILE, sy=spec.hPx/TILE;
    const uniform=Math.sqrt(sx*sy);
    let worst=Infinity, rasterCount=0, vectorCount=0;
    for(const item of state.items){
      const layer=layerForArtwork(item,BASE_LAYER_IDS.motifs),a=assetOf(item); if(!a||!layerIsRenderable(layer,true)) continue;
      if(a.vector){ vectorCount++; continue; }
      rasterCount++;
      const drawW=a.w*item.scale*uniform;
      const drawH=a.h*item.scale*uniform;
      const physicalW=drawW/spec.dpi;
      const physicalH=drawH/spec.dpi;
      const effX=a.w/Math.max(.0001,physicalW);
      const effY=a.h/Math.max(.0001,physicalH);
      worst=Math.min(worst,effX,effY);
    }
    if(rasterCount===0){
      box.className="warning ok";
      box.innerHTML=`All ${vectorCount} placed motifs are SVG sources. Export scaling is not limited by raster DPI.`;
      return;
    }
    const rounded=Math.round(worst);
    if(worst>=300){
      box.className="warning ok";
      box.innerHTML=`Lowest effective raster resolution: <strong>${rounded} DPI</strong>. Good for a 300-DPI export.${vectorCount?` ${vectorCount} SVG motif(s) are resolution-independent.`:""}`;
    }else if(worst>=220){
      box.className="warning";
      box.innerHTML=`Lowest effective raster resolution: <strong>${rounded} DPI</strong>. Usually usable, but below a true 300-DPI source standard. Reduce motif scale or use a higher-resolution original.`;
    }else{
      box.className="warning";
      box.innerHTML=`Lowest effective raster resolution: <strong>${rounded} DPI</strong>. Likely soft in print. The PNG can be tagged 300 DPI, but the source artwork does not contain enough pixels at its current scale.`;
    }
  }

  function updatePrintEligibility(){
    const size=Number($("focusPrintSize").value);
    const unit=$("focusPrintUnit").value;
    const inches=unit==="cm"?size/2.54:size;
    const readout=$("focusPrintReadout"),list=$("platformChecks");
    if(!Number.isFinite(inches)||inches<=0){readout.textContent="Enter a valid tile width.";list.innerHTML="";return;}
    const dpi=Math.floor(4000/inches);
    const cm=inches*2.54;
    const spec=getExportSpec();
    readout.textContent=`Base tile: 4000 px at ${inches.toFixed(2)} in (${cm.toFixed(1)} cm) = ${dpi} DPI. Export swatch: ${spec.wPx} × ${spec.hPx} px.`;
    const profiles=[
      {name:"Print Shrimp · posters",minimum:150,target:300,low:"Below 150 DPI guidance.",mid:"150 DPI is often fine; below the 300-DPI recommendation.",high:"Meets the 300-DPI recommendation."},
      {name:"Spoonflower · fabric",minimum:150,target:150,low:"Below Spoonflower’s 150-DPI sizing guidance.",mid:"Matches Spoonflower’s 150-DPI workflow.",high:"Above Spoonflower’s 150-DPI print workflow."},
      {name:"Printful · paper",minimum:150,target:300,low:"Below the general 150-DPI minimum.",mid:"Meets general minimum; paper prints recommend 300 DPI.",high:"Meets the 300-DPI paper recommendation."},
      {name:"Printful · apparel",minimum:150,target:300,low:"Below the general 150-DPI minimum.",mid:"Meets the general minimum; finer details may benefit from 300 DPI.",high:"Meets the 300-DPI detailed-artwork target."},
      {name:"Printify · standard products",minimum:0,target:300,low:"Below the common 300-DPI recommendation; product tools may accept less.",mid:"Below the common 300-DPI recommendation; check the product template.",high:"Meets the common 300-DPI recommendation."},
      {name:"Printify · large textiles",minimum:120,target:150,low:"Below the 120–150-DPI range cited for some large textiles.",mid:"Within the 120–150-DPI range for some large textiles.",high:"Meets the 150-DPI large-textile target."}
    ];
    list.innerHTML=profiles.map(p=>{
      const status=dpi<p.minimum?p.low:dpi<p.target?p.mid:p.high;
      const cls=dpi<p.minimum?"low":dpi<p.target?"warn":"good";
      return `<div class="platformCheck ${cls}"><strong>${p.name}</strong>${status}</div>`;
    }).join("");
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
      const typeName={brush:"Brush stroke",line:"Line",rect:"Rectangle",ellipse:"Ellipse",freefill:"Freehand fill",gradient:"Gradient fill"}[mark.type]||"Drawn mark";
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
      const copy={...item,id:state.nextId++,x:(item.x+40)%TILE,y:(item.y+40)%TILE};
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
    scheduleAutosave();
    if(state.renderQueued) return;
    state.renderQueued=true;
    requestAnimationFrame(()=>{
      state.renderQueued=false;
      drawEditor();
      if(state.pendingPreview)renderPreview();
      updateQuality();
      if(state.pendingSelected){rebuildSelectedPanel();rebuildLayerUI();}
      state.pendingPreview=false;state.pendingSelected=false;
    });
  }

  function generate(){
    if(isDoodleProject()){setStatus("Image scatter is available in Pattern Projects. Doodle Projects keep one standalone canvas.");return;}
    if(state.assets.length===0){ setStatus("Add at least one drawing first."); return; }
    const n=clamp(parseInt($("count").value)||28,1,500);
    let lo=Math.max(1,parseFloat($("minScale").value)||18)/100;
    let hi=Math.max(1,parseFloat($("maxScale").value)||42)/100;
    if(hi<lo)[lo,hi]=[hi,lo];
    const rot=clamp(parseFloat($("rotationAmount").value)||0,0,180)*Math.PI/180;
    const rand=mulberry32(hashString($("seed").value||"pattern"));
    saveHistory();state.items=[];
    for(let i=0;i<n;i++){
      const a=state.assets[Math.floor(rand()*state.assets.length)];
      const base=TILE/Math.max(a.w,a.h);
      const normalized=base*(lo+(hi-lo)*rand());
      state.items.push({
        id:state.nextId++,assetId:a.id,layerId:motifTargetLayerId(),
        x:rand()*TILE,y:rand()*TILE,
        scale:normalized,rotation:(rand()*2-1)*rot,opacity:1
      });
    }
    state.selectedId=null;
    setStatus(`Generated ${n} wrapped motif copies. The tile edges are mathematically periodic.`);
    renderAll();
  }

  function setStatus(msg){ $("status").textContent=msg; }

  function pointerPos(e){
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};
  }
  function saveHistory(){
    state.past.push(JSON.stringify({items:state.items,marks:state.marks,layers:state.layers,activeLayerId:state.activeLayerId,nextId:state.nextId}));
    if(state.past.length>40)state.past.shift();
    state.future=[];
  }
  function restoreHistory(from,to){
    if(!from.length)return;
    to.push(JSON.stringify({items:state.items,marks:state.marks,layers:state.layers,activeLayerId:state.activeLayerId,nextId:state.nextId}));
    const s=JSON.parse(from.pop());
    state.items=s.items;state.marks=s.marks;state.layers=normaliseLayers(s.layers);state.activeLayerId=layerById(s.activeLayerId)?.id||layerById(BASE_LAYER_IDS.drawing)?.id||state.layers[state.layers.length-1]?.id||state.layers[0]?.id||"";state.nextId=s.nextId;
    state.selectedId=null;state.activeMark=null;renderAll();
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
      if(record.kind==="item")return {kind:"item",id,x:Number(record.artwork.x)||0,y:Number(record.artwork.y)||0};
      const t=markTransformValues(record.artwork);return {kind:"mark",id,x:t.x,y:t.y};
    }).filter(Boolean);
    state.transformState={kind:"selection",mode:"move",startPointer:{x:w.x,y:w.y},members};
    state.dragging=false;state.resizeState=null;
  }
  canvas.addEventListener("pointerdown",e=>{
    e.preventDefault();canvas.setPointerCapture(e.pointerId);
    const p=pointerPos(e);state.pointers.set(e.pointerId,p);
    if(state.pointers.size===2){
      state.activeMark=null;state.dragging=false;state.dragStart=null;
      const g=gestureInfo();state.gesture={...g,zoom:state.zoom};renderAll();return;
    }
    if(state.pointers.size>2)return;
    state.dragStart=p;
    if(state.tool==="pan" || e.button===1)return;
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
        state.dragging=false;state.resizeState=null;renderAll();return;
      }
      if(currentMark&&markResizeHandleHit(currentMark,w.x,w.y)){
        const t=markTransformValues(currentMark),bounds=markPrimaryBounds(currentMark);saveHistory();state.resizeState={kind:"mark",id:currentMark.id,scale:t.scale,startDistance:Math.max(1,Math.hypot(w.x-bounds.cx,w.y-bounds.cy)),center:{x:bounds.cx,y:bounds.cy}};state.dragging=false;renderAll();return;
      }
      const handle=current&&imageHandleAt(current,w.x,w.y);
      if(handle){
        saveHistory();
        if(handle==="rotate"){
          const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);
          state.transformState={kind:"item",mode:"rotate",id:current.id,startRotation:current.rotation,startAngle:Math.atan2(delta.y,delta.x)};
        }else state.transformState={kind:"item",mode:"move",id:current.id,offset:{x:w.x-current.x,y:w.y-current.y}};
        state.dragging=false;state.resizeState=null;renderAll();return;
      }
      if(current&&resizeHandleHit(current,w.x,w.y)){
        const delta=nearestLatticeDelta(w.x,w.y,current.x,current.y);saveHistory();state.resizeState={kind:"item",id:current.id,scale:current.scale,startDistance:Math.max(1,Math.hypot(delta.x,delta.y))};state.dragging=false;renderAll();return;
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
        saveHistory();startSelectionMove(currentIds,w);renderAll();return;
      }
      const hitIds=hit?expandedArtworkIds(hit.artwork):[];
      if(hitIds.length>1){
        setSelection(hitIds,hit.artwork.id);saveHistory();startSelectionMove(hitIds,w);renderAll();return;
      }
      setSelection(hit?[hit.artwork.id]:[],hit?.artwork?.id??null);state.dragging=hit?.kind==="item";
      if(hit?.kind==="item"){saveHistory();state.dragOffset=nearestLatticeDelta(w.x,w.y,hit.artwork.x,hit.artwork.y);}
      else if(hit?.kind==="mark"){
        saveHistory();const t=markTransformValues(hit.artwork),b=markGeometryBounds(hit.artwork);state.transformState={kind:"mark",mode:"move",id:hit.artwork.id,startX:t.x,startY:t.y,startPointer:{x:w.x,y:w.y},baseCenter:{x:b.cx+t.x,y:b.cy+t.y}};
      }
      renderAll();return;
    }
    const drawLayer=activeLayer();
    if(!drawLayer||drawLayer.visible===false||drawLayer.locked){setStatus(!drawLayer?"Choose an active layer before drawing.":drawLayer.locked?`“${drawLayer.name}” is locked. Unlock it to draw.`:`“${drawLayer.name}” is hidden. Make it visible to draw.`);state.dragStart=null;return;}
    saveHistory();
    const markStart=canonicalPoint(w.x,w.y);
    const mark={id:state.nextId++,layerId:drawLayer.id,type:state.tool,color:$("ink").value,width:Math.max(.45,parseInt($("brushSize").value,10)*TILE/4000),fill:$("shapeFill").checked,opacity:state.tool==="eraser"?1:(parseInt($("inkOpacity").value,10)||100)/100,texture:(parseInt($("textureAmount").value,10)||0)/100,brushStyle:$("brushStyle").value,stampShape:$("stampShape").value,gradientType:$("gradientType").value,gradientDirection:$("gradientDirection").value,endColor:$("gradientEnd").value,points:[markStart]};
    state.marks.push(mark);state.activeMark=mark;state.selectedId=null;
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
        const last=m.points[m.points.length-1],raw=nearestLatticePoint(w.x,w.y,last.x,last.y),next=m.type==="brush"?stabiliseStrokePoint(last,raw):raw;
        if(Math.hypot(next.x-last.x,next.y-last.y)>1.2)m.points.push(next);
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
      if(Math.hypot(end.x-last.x,end.y-last.y)>.5)state.activeMark.points.push(end);
    }
    state.pointers.delete(e.pointerId);if(state.pointers.size<2)state.gesture=null;
    if(state.transformState?.kind==="selection"){
      for(const member of state.transformState.members||[]){if(member.kind==="mark"){const mark=state.marks.find(m=>m.id===member.id);if(mark)normaliseMarkTranslation(mark);}}
    }else{
      const transformedMarkId=state.transformState?.kind==="mark"?state.transformState.id:state.resizeState?.kind==="mark"?state.resizeState.id:null;if(transformedMarkId){const mark=state.marks.find(m=>m.id===transformedMarkId);if(mark)normaliseMarkTranslation(mark);}
    }
    state.dragging=false;state.resizeState=null;state.transformState=null;state.activeMark=null;state.dragStart=null;clearSnapGuides();renderAll();
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
    downloadBlob(blob,`${safeName()}-${exportFileStem()}-${spec.dpi}dpi.png`);
    setStatus(isDoodleProject()?`Standalone PNG exported at ${spec.wPx} × ${spec.hPx}px with transparency and ${spec.dpi}-DPI metadata.`:`Repeat PNG exported at ${spec.wPx} × ${spec.hPx}px with ${spec.dpi}-DPI metadata.`);
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
    for(const layer of state.layers){
      if(!layerIsRenderable(layer,true))continue;
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
        layerBody+=`<use href="#${assetRef}" xlink:href="#${assetRef}" x="${-iw/2}" y="${-ih/2}" width="${iw}" height="${ih}" opacity="${item.opacity*layer.opacity}" transform="translate(${x} ${y}) rotate(${deg})"/>`;
      }
      }
      for(const m of state.marks){
      if(layerForArtwork(m,BASE_LAYER_IDS.drawing)?.id!==layer.id||!m.points?.length)continue;
      const first=m.points[0],last=m.points[m.points.length-1];
      let shape="";
      if(m.type==="rect")shape=`<rect x="${Math.min(first.x,last.x)}" y="${Math.min(first.y,last.y)}" width="${Math.abs(last.x-first.x)}" height="${Math.abs(last.y-first.y)}"/>`;
      else if(m.type==="ellipse")shape=`<ellipse cx="${(first.x+last.x)/2}" cy="${(first.y+last.y)/2}" rx="${Math.max(.1,Math.abs(last.x-first.x)/2)}" ry="${Math.max(.1,Math.abs(last.y-first.y)/2)}"/>`;
      else shape=`<path d="M ${m.points.map(p=>`${p.x} ${p.y}`).join(" L ")}${m.points.length===1?` L ${first.x+.01} ${first.y+.01}`:""}${m.type==="freefill"?" Z":""}"/>`;
      if(m.type==="brush"&&(m.brushStyle||"ink")==="stamp"){
        const spacing=Math.max(4,m.width*1.65),r=Math.max(1,m.width*.46),parts=[];let carry=spacing;
        const stamp=(x,y,angle)=>{if((m.stampShape||"leaf")==="dot")parts.push(`<circle cx="${x}" cy="${y}" r="${r}"/>`);else if(m.stampShape==="star"){let d="";for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;d+=`${i?"L":"M"}${x+Math.cos(a)*rr} ${y+Math.sin(a)*rr} `;}parts.push(`<path d="${d}Z"/>`);}else parts.push(`<ellipse cx="${x}" cy="${y}" rx="${r*.52}" ry="${r}" transform="rotate(${angle*180/Math.PI} ${x} ${y})"/>`);};
        stamp(first.x,first.y,0);for(let i=1;i<m.points.length;i++){const a=m.points[i-1],b=m.points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);for(let d=carry;d<=len;d+=spacing){const t=d/len;stamp(a.x+dx*t,a.y+dy*t,Math.atan2(dy,dx));}carry=((carry-len)%spacing+spacing)%spacing||spacing;}
        shape=parts.join("");
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
        const opacity=(m.opacity??1)*layer.opacity*(brush==="marker"?.36:brush==="pencil"?.68:1),fill=m.type==="freefill"||(m.fill&&(m.type==="rect"||m.type==="ellipse"))||brush==="stamp"?svgEscape(m.color):"none";
        style=`stroke="${svgEscape(m.color)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="${fill}" opacity="${opacity}"`;
      }
      let eraserNodes="";
      for(const [mirrorX,mirrorY,angle] of symmetryTransforms()){
        const transform=`translate(${TILE/2} ${TILE/2}) rotate(${angle*180/Math.PI}) scale(${mirrorX?-1:1} ${mirrorY?-1:1}) translate(${-TILE/2} ${-TILE/2})`;
        if(!markHasTransform(m)){
          const transformedPoints=m.points.map(p=>reflectPoint(p,mirrorX,mirrorY,angle));
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
          for(const p of transformedPoints){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
          minX-=m.width;maxX+=m.width;minY-=m.width;maxY+=m.width;
          const copies=artworkCopiesForBounds(minX,maxX,minY,maxY,clipW,clipH,markBasis);
          for(const copy of copies){const node=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}" ${style}>${shape}</g></g>`;if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;}
        }else{
          const bounds=markTransformedBounds(m,mirrorX,mirrorY,angle),copies=artworkCopiesForBounds(bounds.minX,bounds.maxX,bounds.minY,bounds.maxY,clipW,clipH,markBasis),markTransform=markSvgTransform(m);
          for(const copy of copies){const node=`<g transform="scale(${sx} ${sy}) translate(${copy.x} ${copy.y})"><g transform="${transform}"><g transform="${markTransform}" ${style}>${shape}</g></g></g>`;if(m.type==="eraser")eraserNodes+=node;else layerBody+=node;}
        }
      }
      if(m.type==="eraser"&&eraserNodes){const maskId=`pf-erase-${++maskIndex}`;gradientDefs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:luminance"><rect width="${W}" height="${H}" fill="#fff"/>${eraserNodes}</mask>`;layerBody=`<g mask="url(#${maskId})">${layerBody}</g>`;}
      }
      body+=layerBody;
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
    $("drawingHelp").textContent=doodle?"Choose a brush style, then adjust size, opacity and texture. Eraser removes pixels from the active unlocked layer and reveals layers underneath. Freehand and gradient fill colour a closed area you trace. Artwork stays where you draw it; canvas edges do not repeat. Two fingers zoom and move.":"Choose a brush style, then adjust size, opacity and texture. Eraser removes pixels from the active unlocked layer and reveals layers underneath. Freehand and gradient fill colour a closed area you trace. Draw across edges to wrap. Two fingers zoom and move.";
    $("tileSettingsSummary").textContent=doodle?"Canvas and placement settings":"Tile and placement settings";
    $("snapHelp").textContent=doodle?"Smart snapping uses the grid plus canvas centre lines and canvas edges. Temporary alignment guides appear while moved artwork is snapped. Grid visibility and snapping remain independent.":"Smart snapping uses the grid plus tile centre lines and tile edges. Temporary alignment guides appear while moved artwork is snapped. Grid visibility and snapping remain independent.";
    $("assetPlacementHelp").textContent=doodle?"The first selected image is placed on the canvas automatically. Tap a thumbnail to add another copy, then drag, scale or rotate it.":"The first selected image is placed on the tile automatically. Tap a thumbnail to add another copy, then drag, scale or rotate it.";
    $("focusRecentEmpty").textContent=doodle?"Choose Add image. The first image will be placed on the canvas; tap a thumbnail here to add another copy.":"Choose Add image. The first image will be placed on the tile; tap a thumbnail here to add another copy.";
    $("focusPrintHeading").textContent=doodle?"Artwork size & DPI":"Tile size & DPI";
    $("focusPrintSizeLabel").textContent=doodle?"Printed artwork width":"Printed base-tile width";
    $("focusInfoPrintNote").textContent=doodle?"Guide only. Product templates can set different print areas and requirements. DPI uses the 4000 px artwork canvas; original raster quality is checked above.":"Guide only. Product templates can set different print areas and requirements. DPI uses the 4000 px base tile; original raster quality is checked above.";
    $("tileBorderLabelText").textContent=doodle?"Show canvas edge":"Show centre tile edge";
    $("stageHelpHint").textContent=doodle?"Use Pan or two fingers to move the view. Mouse wheel zooms. Export contains the standalone artwork without guides.":"Use Pan or two fingers to move the view. Mouse wheel zooms. Export contains the full repeat swatch, without guides or faded neighbours.";
    canvas.setAttribute("aria-label",doodle?"Doodle artwork canvas":"Pattern tile editor");
    $("exportFilesTitle").textContent=doodle?"Artwork files":"Pattern files";
    $("exportPng").textContent=doodle?"Export artwork as PNG":"Export pattern as PNG";
    $("exportSvg").textContent=doodle?"Export artwork as SVG":"Export pattern as SVG";
    $("exportDimensionsHelp").textContent=doodle?"Doodle exports are one transparent 4000 × 4000 px canvas. PNG carries 300-DPI metadata. SVG remains resolution-independent; raster artwork inside an SVG remains raster.":"PNG and SVG exports use the repeat swatch dimensions shown at left. The base drawing tile is 4000 × 4000 px; half-drop and brick swatches are rectangular. SVG itself is resolution-independent; raster artwork inside an SVG remains raster.";
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
      if(!promotePractice){state.assets=[];state.items=[];state.marks=[];resetLayerState();state.nextId=1;state.selectedId=null;state.past=[];state.future=[];state.recentAssetIds=[];}
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
    state.assets=[];state.items=[];state.marks=[];resetLayerState();state.nextId=1;state.selectedId=null;state.past=[];state.future=[];state.recentAssetIds=[];
    $("projectSetupOverlay").hidden=true;setProjectBadge();updateProjectModeUi();rebuildAssetGrid();updatePixelReadout();updatePrintEligibility();
    await saveAutosave();
    setStatus("Practice mode started. Your practice work autosaves on this device; set up a print project when you’re ready.");
  }
  function projectData(){
    if(state.project)state.project.updatedAt=new Date().toISOString();
    return {format:"pattern-forge-v4",tile:4000,dpi:300,
      project:state.project?{...state.project}:null,
      background:$("bg").value,transparent:$("transparent").checked,
      palette:{colors:state.colorPalette,saved:state.savedPalettes,ink:$("ink").value},
      seed:$("seed").value,settings:{gridCount:$("gridCount").value,gridOn:$("gridOn").checked,symmetry:$("symmetry").value,symmetryGuides:$("symmetryGuides").checked,constructionGuide:$("constructionGuide").value,guideOpacity:$("guideOpacity").value,snapOn:$("snapOn").checked,showTileBorder:$("showTileBorder").checked,neighborOpacity:$("neighborOpacity").value,brushSize:$("brushSize").value,brushStyle:$("brushStyle").value,strokeStabilisation:$("strokeStabilisation").value,stampShape:$("stampShape").value,inkOpacity:$("inkOpacity").value,textureAmount:$("textureAmount").value,gradientType:$("gradientType").value,gradientDirection:$("gradientDirection").value,gradientEnd:$("gradientEnd").value,count:$("count").value,minScale:$("minScale").value,maxScale:$("maxScale").value,rotationAmount:$("rotationAmount").value},
      assets:state.assets.map(({id,name,src,w,h,vector})=>({id,name,src,w,h,vector})),
      layers:state.layers.map(layer=>({...layer})),activeLayerId:state.activeLayerId,
      items:state.items,marks:state.marks,nextId:state.nextId};
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
    if(data.format==="pattern-forge-v4"){
      if(!Array.isArray(data.layers)||!data.layers.length)throw new Error("invalid-layers");
      const layerIds=new Set();
      for(const layer of data.layers){
        const id=String(layer?.id||"").trim(),opacity=Number(layer?.opacity);
        if(!id||layerIds.has(id)||!Number.isFinite(opacity)||opacity<0||opacity>1)throw new Error("invalid-layers");
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
    }
    const markTypes=new Set(["brush","eraser","line","rect","ellipse","freefill","gradient"]);
    if(data.marks.some(mark=>!mark||typeof mark!=="object"||!markTypes.has(mark.type)||!Array.isArray(mark.points)||mark.points.some(point=>!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))||(mark.groupId!==undefined&&mark.groupId!==null&&(typeof mark.groupId!=="string"||mark.groupId.length>100))))throw new Error("invalid-marks");
  }
  function projectOpenErrorMessage(err){
    const code=err?.message||"";
    if(code==="wrong-format")return "That file is not a Pattern Forge project. Choose a JSON project or ZIP exported by Pattern Forge. Your current work is unchanged.";
    if(code==="too-large")return "That project is larger than Pattern Forge can open. Your current work is unchanged.";
    if(code==="invalid-assets"||code==="invalid-items"||code==="invalid-marks"||code==="invalid-layers"||code==="Invalid image in project")return "This Pattern Forge project appears incomplete or damaged. Your current work is unchanged.";
    if(err instanceof SyntaxError)return "This file is not valid project JSON. Choose a Pattern Forge JSON file or exported project ZIP. Your current work is unchanged.";
    return "Pattern Forge could not open that project. Check that the file is a complete JSON project or ZIP exported by the app. Your current work is unchanged.";
  }
  async function restoreProject(data,options={}){
    validateProjectData(data);
    const assets=[];for(const a of data.assets){if(typeof a.src!=="string"||!a.src.startsWith("data:image/"))throw Error("Invalid image in project");const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=a.src;});assets.push({...a,img});}
    const incoming=data.project&&typeof data.project==="object"?data.project:{};
    state.project={id:options.asCopy?newProjectId():(typeof incoming.id==="string"&&incoming.id.startsWith("pf-project-")?incoming.id:newProjectId()),title:String(incoming.title||data.seed||"Untitled project").slice(0,80),customer:String(incoming.customer||"").slice(0,80),theme:String(incoming.theme||"").slice(0,60),variation:String(incoming.variation||"").slice(0,60),projectType:incoming.projectType==="doodle"?"doodle":"pattern",repeatStyle:incoming.projectType==="doodle"?"straight":(["straight","half-drop","brick"].includes(incoming.repeatStyle)?incoming.repeatStyle:"straight"),isPractice:options.asCopy?false:!!incoming.isPractice,createdAt:incoming.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    state.layers=normaliseLayers(data.layers);
    const validLayerIds=new Set(state.layers.map(layer=>layer.id));
    const motifsFallback=validLayerIds.has(BASE_LAYER_IDS.motifs)?BASE_LAYER_IDS.motifs:state.layers[0].id;
    const drawingFallback=validLayerIds.has(BASE_LAYER_IDS.drawing)?BASE_LAYER_IDS.drawing:state.layers[state.layers.length-1].id;
    state.activeLayerId=validLayerIds.has(String(data.activeLayerId))?String(data.activeLayerId):drawingFallback;
    state.assets=assets;state.items=data.items.map(item=>({...item,groupId:typeof item.groupId==="string"?item.groupId:null,layerId:validLayerIds.has(String(item.layerId))?String(item.layerId):motifsFallback}));state.marks=data.marks.map(m=>({opacity:1,texture:0,brushStyle:"ink",stampShape:"leaf",...m,groupId:typeof m.groupId==="string"?m.groupId:null,layerId:validLayerIds.has(String(m.layerId))?String(m.layerId):drawingFallback}));
    state.recentAssetIds=assets.slice(-9).reverse().map(a=>a.id);state.nextId=Math.max(1,Number(data.nextId)||1);clearSelection();state.past=[];state.future=[];
    $("bg").value=data.background||"#ffffff";$("transparent").checked=isDoodleProject()?true:!!data.transparent;if(typeof data.seed==="string")$("seed").value=data.seed;const s=data.settings||{};
    for(const [id,key] of [["gridCount","gridCount"],["symmetry","symmetry"],["constructionGuide","constructionGuide"],["guideOpacity","guideOpacity"],["brushSize","brushSize"],["brushStyle","brushStyle"],["strokeStabilisation","strokeStabilisation"],["stampShape","stampShape"],["inkOpacity","inkOpacity"],["textureAmount","textureAmount"],["gradientType","gradientType"],["gradientDirection","gradientDirection"],["gradientEnd","gradientEnd"],["neighborOpacity","neighborOpacity"],["count","count"],["minScale","minScale"],["maxScale","maxScale"],["rotationAmount","rotationAmount"]])if(s[key]!==undefined)$(id).value=s[key];
    for(const [id,key] of [["gridOn","gridOn"],["symmetryGuides","symmetryGuides"],["snapOn","snapOn"],["showTileBorder","showTileBorder"]])if(s[key]!==undefined)$(id).checked=!!s[key];
    if(data.palette){state.colorPalette=Array.isArray(data.palette.colors)?data.palette.colors:[...state.colorPalette];state.savedPalettes=Array.isArray(data.palette.saved)?data.palette.saved:state.savedPalettes;setInkColour(data.palette.ink||"#2c5f54");rebuildPaletteUI();}
    $("brushSizeLabel").textContent=$("brushSize").value;$("inkOpacityLabel").textContent=$("inkOpacity").value+"%";$("textureLabel").textContent=$("textureAmount").value+"%";$("guideOpacityLabel").textContent=$("guideOpacity").value+"%";
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
        {name:`${base}-${exportFileStem()}-${png.spec.dpi}dpi.png`,blob:png.blob},
        {name:`${base}-${exportFileStem()}.svg`,blob:renderSVGBlob()},
        {name:`${base}-editable-project.json`,blob:projectBlob()}
      ];
      setStatus("Packaging the editable project, PNG and SVG into a ZIP…");
      const zip=await makeZip(files);
      await shareOrDownloadZip(zip,`${base}-${isDoodleProject()?"doodle":"pattern"}-project.zip`);
    }catch(err){setStatus("ZIP export failed: "+err.message);}
  }

  $("drop").addEventListener("click",()=>$("files").click());
  $("files").addEventListener("click",e=>e.stopPropagation());
  $("files").addEventListener("change",e=>addFiles([...e.target.files]).catch(()=>setStatus("The selected image could not be opened. Choose a PNG, JPG, WebP or SVG file and try again.")));
  ["dragenter","dragover"].forEach(ev=>$("drop").addEventListener(ev,e=>{e.preventDefault();$("drop").classList.add("drag");}));
  ["dragleave","drop"].forEach(ev=>$("drop").addEventListener(ev,e=>{e.preventDefault();$("drop").classList.remove("drag");}));
  $("drop").addEventListener("drop",e=>addFiles([...e.dataTransfer.files]).catch(()=>setStatus("The dropped image could not be opened. Choose a PNG, JPG, WebP or SVG file and try again.")));

  $("generate").onclick=generate;
  $("shuffle").onclick=()=>{$("seed").value="pattern-"+Math.random().toString(36).slice(2,8);generate();};
  $("clear").onclick=()=>{saveHistory();state.items=[];state.marks=[];state.selectedId=null;renderAll();setStatus("Artwork cleared. Uploaded images remain available.");};
  $("exportPng").onclick=()=>exportPNG().catch(err=>setStatus("PNG export failed: "+err.message));
  $("exportSvg").onclick=exportSVG;
  $("exportZip").onclick=exportZIP;
  $("previewScale").addEventListener("input",renderPreview);
  $("rotationAmount").addEventListener("input",()=>{$("rotationLabel").textContent=$("rotationAmount").value+"°";});
  $("strokeStabilisation").addEventListener("change",scheduleAutosave);
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
  $("layerExport").addEventListener("change",()=>{const layer=activeLayer();if(!layer)return;saveHistory();layer.export=$("layerExport").checked;renderAll();});
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
  $("focusPrintSize").addEventListener("input",updatePrintEligibility);
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
    lastPrintUnit=nextUnit;updatePrintEligibility();
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
