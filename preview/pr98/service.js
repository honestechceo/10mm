// Where's My 10MM?! — Service Bay jobs.
// Grab tools and parts in regular levels: tools go in the tool bag (kept for good),
// parts go on the tool cart (used up by each job). A full kit unlocks a timed job:
// an oil change or a front brake job.
"use strict";
(() => {
  const ITEMS = {
    gloves: { name: "Mechanic gloves", img: "svc-gloves.webp", kind: "tool" },
    pan: { name: "Drain pan", img: "svc-pan.webp", kind: "tool" },
    wrenches: { name: "Wrenches", img: "svc-wrenches.webp", kind: "tool" },
    ratchet: { name: "Flex ratchet", img: "svc-ratchet.webp", kind: "tool" },
    funnel: { name: "Funnel", img: "svc-funnel.webp", kind: "tool" },
    ragblue: { name: "BLUE • Dipstick rag", img: "svc-rag-blue.webp", kind: "tool" },
    ragred: { name: "RED • Spill cleanup rag", img: "svc-rag-red.webp", kind: "tool" },
    jack: { name: "Floor jack", img: "tool-floorjack.webp", kind: "tool" },
    lugwrench: { name: "Lug wrench", img: "svc-lugwrench.webp", kind: "tool" },
    piston: { name: "Caliper piston tool", img: "svc-piston.webp", kind: "tool" },
    brush: { name: "Hub cleaning brush", img: "svc-wrenches.webp", kind: "tool" },
    grease: { name: "Brake pin grease", img: "svc-oil-full.webp", kind: "tool" },
    filter: { name: "Oil filter", img: "svc-filter.webp", kind: "part" },
    oil: { name: "Jug of motor oil", img: "svc-oil-full.webp", kind: "part" },
    brakes: { name: "Rotor & brake pads", img: "svc-brakes-new.webp", kind: "part" },
  };
  // Dedicated matching tool illustrations; no more wrench/oil-jug placeholders.
  const iconSvg = (body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#ff8757"/><stop offset="1" stop-color="#a71b17"/></linearGradient></defs>'+body+'</svg>');
  ITEMS.brush.img = iconSvg('<g transform="rotate(-35 80 80)"><rect x="65" y="70" width="30" height="75" rx="11" fill="url(#g)" stroke="#2d1010" stroke-width="5"/><rect x="56" y="31" width="48" height="48" rx="8" fill="#394b5a" stroke="#cbd8df" stroke-width="5"/>'+Array.from({length:8},(_,i)=>'<path d="M'+(60+i*6)+' 31 V10" stroke="#e8c16d" stroke-width="5" stroke-linecap="round"/>').join('')+'</g>');
  ITEMS.grease.img = iconSvg('<g transform="rotate(-23 80 80)"><path d="M50 36 H110 L118 115 H42Z" fill="#f4f6f8" stroke="#293647" stroke-width="6"/><path d="M49 55 H111 V100 H49Z" fill="url(#g)"/><text x="80" y="75" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="white">BRAKE</text><text x="80" y="93" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="white">GREASE</text><path d="M58 36 L66 15 H94 L102 36Z" fill="#c6d3df" stroke="#293647" stroke-width="5"/><path d="M56 116 H104 L97 145 H63Z" fill="#e3e9ed" stroke="#293647" stroke-width="5"/></g>');
  const JOBS = {
    oil: { name: "OIL CHANGE", short: "Oil change", needs: ["gloves", "pan", "wrenches", "filter", "ratchet", "funnel", "oil", "ragblue", "ragred"], secs: 60 },
    brake: { name: "FRONT BRAKE JOB", short: "Brake job", needs: ["gloves", "jack", "lugwrench", "ratchet", "piston", "brush", "grease", "brakes"], secs: 110 },
  };

  const load = () => { try { return JSON.parse(localStorage.getItem("tenmm-garage")) || {}; } catch (e) { return {}; } };
  const G = Object.assign({ bag: [], cart: {}, done: {} }, load());
  const save = () => { try { localStorage.setItem("tenmm-garage", JSON.stringify(G)); } catch (e) {} };
  const has = (id) => (ITEMS[id].kind === "tool" ? G.bag.includes(id) : (G.cart[id] || 0) > 0);
  const missing = (job) => JOBS[job].needs.filter((id) => !has(id));
  const ready = (job) => missing(job).length === 0;
  function nextNeeded() {
    for (const j of ["oil", "brake"]) { const m = missing(j); if (m.length) return m[0]; }
    // both kits full: keep a spare of each part coming now and then
    return null;
  }
  function addItem(id) {
    const it = ITEMS[id];
    if (it.kind === "tool") { if (!G.bag.includes(id)) G.bag.push(id); }
    else G.cart[id] = Math.min(3, (G.cart[id] || 0) + 1);
    save();
  }

  // sprites for the pickups in levels
  const sprites = {};
  for (const id in ITEMS) { const im = new Image(); im.src = ITEMS[id].img; sprites[id] = im; }
  const svcId = (t) => (typeof t === "string" && t.startsWith("svc:") ? t.slice(4) : null);

  // ---------- hook into levels ----------
  const base = { levelBuilt: FX.levelBuilt, isNewPower: FX.isNewPower, powerSprite: FX.powerSprite, pickup: FX.pickup, pickupText: FX.pickupText };
  FX.levelBuilt = function () {
    base.levelBuilt.apply(this, arguments);
    const mode = window.Feature ? Feature.mode() : "adventure";
    if (mode !== "adventure" || level < 3) return;
    const id = nextNeeded();
    if (!id) return;
    // one service item per level, about halfway in, at power-up height
    powerups.push({ x: Math.floor(world * (0.42 + ((level * 37) % 20) / 100)), y: ground - 108, type: "svc:" + id, taken: false });
  };
  FX.isNewPower = (t) => !!svcId(t) || base.isNewPower(t);
  FX.powerSprite = (t) => { const id = svcId(t); if (!id) return base.powerSprite(t); const im = sprites[id]; return im.complete && im.naturalWidth ? im : null; };
  let lastText = "";
  FX.pickup = function (t, pm) {
    const id = svcId(t);
    if (!id) return base.pickup(t, pm);
    addItem(id);
    sfx("power"); buzz("success");
    const it = ITEMS[id], where = it.kind === "tool" ? "tool bag" : "tool cart";
    const job = JOBS.oil.needs.includes(id) && !ready("oil") ? "oil" : JOBS.brake.needs.includes(id) && !ready("brake") ? "brake" : ready("oil") && JOBS.oil.needs.includes(id) ? "oil" : "brake";
    const n = JOBS[job].needs.length, got = n - missing(job).length;
    lastText = it.name.toUpperCase() + "! Into the " + where + ". " + JOBS[job].short + " kit " + got + "/" + n + ".";
    if (ready(job)) { lastText = JOBS[job].short.toUpperCase() + " KIT COMPLETE! Open the Service Bay on the home screen."; toast(JOBS[job].short + " kit complete! Service Bay is ready.", true); }
    return true;
  };
  FX.pickupText = (t) => (svcId(t) ? lastText : base.pickupText(t));

  // ---------- home screen button ----------
  function svcSummary() {
    const r = ["oil", "brake"].filter(ready);
    if (r.length) return "READY: " + r.map((j) => JOBS[j].short).join(" & ");
    const j = missing("oil").length ? "oil" : "brake", n = JOBS[j].needs.length;
    return JOBS[j].short + " kit " + (n - missing(j).length) + "/" + n + " • find parts in levels";
  }
  const baseShowHome = showHome;
  showHome = function (intro) {
    baseShowHome(intro);
    const b = $("hService");
    if (!b) return;
    $("hServiceSub").textContent = svcSummary();
    b.classList.toggle("ready", ready("oil") || ready("brake"));
    b.onclick = () => { audioReady(); stopMusic(); hideHome(); showGarage(); };
  };

  // ---------- Service Bay screen ----------
  function showGarage() {
    state = "shop";
    hidePanels();
    $("overlay").classList.remove("hidden");
    setArt("toolbox");
    $("eyebrow").textContent = "SERVICE BAY";
    $("message").textContent = "PICK A JOB";
    $("details").textContent = "Grab tools and parts in the levels. Tools stay in your tool bag. Parts on the tool cart get used up by each job.";
    ["menuExtra", "menuSettings", "menuLevels", "menuShop"].forEach((id) => ($(id).style.display = "none"));
    $("go").textContent = "BACK";
    $("go").onclick = showMenu;
    const box = $("shop");
    box.innerHTML = "";
    const stores = document.createElement("div");
    stores.className = "gstores";
    stores.innerHTML = '<div><img src="svc-bag.webp" alt=""><b>TOOL BAG</b><small>' + G.bag.length + " tools</small></div>" +
      '<div><img src="svc-cart.webp" alt=""><b>TOOL CART</b><small>' + Object.values(G.cart).reduce((a, b) => a + b, 0) + " parts</small></div>";
    box.append(stores);
    for (const j of ["oil", "brake"]) {
      const job = JOBS[j], card = document.createElement("div");
      card.className = "gjob";
      card.innerHTML = "<b>" + job.name + "</b><span>" + (G.done[j] ? "Done " + G.done[j] + "× • " : "") + job.secs + " seconds on the clock</span><div class='gitems'>" +
        job.needs.map((id) => '<i class="' + (has(id) ? "got" : "") + '"><img src="' + ITEMS[id].img + '" alt=""><em>' + ITEMS[id].name + "</em></i>").join("") + "</div>";
      const b = document.createElement("button");
      if (ready(j)) { b.textContent = "START " + job.short.toUpperCase(); b.className = "buy"; b.onclick = () => runJob(j); }
      else { b.textContent = "NEED " + missing(j).length + " MORE"; b.className = "no"; b.disabled = true; }
      card.append(b);
      box.append(card);
    }
    box.classList.add("on");
  }

  // ---------- the jobs ----------
  const OIL_STEPS = [
    { say: "Put on your gloves", use: "gloves", scene: "scene-plug.webp" },
    { say: "Slide the drain pan under the engine", use: "pan", scene: "scene-plug.webp", after: (s) => s.showPan(true) },
    { say: "Remove the drain plug to start draining", use: "wrenches", scene: "scene-plug.webp", next: "scene-draining.webp", after: (s) => s.wait("Old oil draining into the pan…", 1800) },
    { say: "Install the new oil filter after draining", use: "filter", consume: "filter", scene: "scene-draining.webp", after: (s) => s.flash("svc-filter.webp") },
    { say: "Reinstall the drain plug", use: "ratchet", scene: "scene-draining.webp", next: "scene-plug.webp", after: (s) => s.showPan(false) },
    { say: "Tap the oil cap to open it", tap: [0.6, 0.41, 0.18, 0.22], scene: "scene-engine-closed.webp", next: "scene-engine-open.webp" },
    { say: "Set the funnel in the fill hole", use: "funnel", scene: "scene-engine-open.webp", after: (s) => s.showFunnel(true) },
    { say: "Tap the oil jug to add the correct amount", pour: true, use: "oil", consume: "oil", scene: "scene-engine-open.webp" },
    { say: "BLUE RAG: Clean the dipstick before checking the oil level", use: "ragblue", scene: "scene-engine-open.webp", after: (s) => s.dip("dip-clean.webp") },
    { say: "Tap CHECK DIPSTICK", check: true, scene: "scene-engine-open.webp" },
    { say: "Tap the oil cap to close it", tap: [0.6, 0.41, 0.18, 0.22], scene: "scene-engine-open.webp", next: "scene-engine-closed.webp", before: (s) => s.showFunnel(false) },
    { say: "RED RAG: Wipe spilled oil around the fill cap", use: "ragred", scene: "scene-engine-closed.webp" },
  ];
  const BRAKE_STEPS = [
    { say: "Put on your gloves", use: "gloves", scene: "car" },
    { say: "Raise the car with the floor jack", use: "jack", scene: "car", after: (s) => s.lift(true) },
    { say: "LUG WRENCH: Remove the wheel to expose the brake assembly", use: "lugwrench", scene: "car", next: "svc-brakes-worn.webp" },
    { say: "RATCHET: Remove the caliper bolts", use: "ratchet", scene: "svc-brakes-worn.webp", after: (s) => s.label("Caliper unbolted; old pads exposed.") },
    { say: "PISTON TOOL: Retract the caliper piston; remove old pads and rotor", use: "piston", scene: "svc-brakes-worn.webp", after: (s) => { s.label("Piston retracted; worn pads and rotor removed."); s.wait("Removing the worn rotor and pads…", 900); } },
    { say: "HUB BRUSH: Clean rust and debris off the hub face", use: "brush", scene: "svc-brakes-worn.webp", after: (s) => s.label("Hub face cleaned for proper rotor seating.") },
    { say: "BRAKE GREASE: Clean and lightly lubricate the caliper slide pins", use: "grease", scene: "svc-brakes-worn.webp", after: (s) => s.label("Slide pins serviced with compatible brake grease; keep grease off friction surfaces.") },
    { say: "NEW PARTS: Remove old rotor and pads; install replacements", use: "brakes", consume: "brakes", scene: "svc-brakes-worn.webp", next: "svc-brakes-new.webp", after: (s) => s.label("New rotor and pads installed.") },
    { say: "RATCHET: Reinstall caliper bolts", use: "ratchet", scene: "svc-brakes-new.webp" },
    { say: "LUG WRENCH: Reinstall wheel and tighten lug nuts", use: "lugwrench", scene: "svc-brakes-new.webp", next: "car" },
    { say: "Lower the car", use: "jack", scene: "car", after: (s) => s.lift(false) },
    { say: "Pump the brake pedal 3 times", pump: 3, scene: "car" },
  ];

  let S = null;
  function runJob(j) {
    if (!window.__pr98Testing) for (const id of JOBS[j].needs) if (!has(id)) return showGarage();
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    let el = $("svc");
    if (!el) { el = document.createElement("div"); el.id = "svc"; document.body.append(el); }
    const steps = j === "oil" ? OIL_STEPS : BRAKE_STEPS, secs = JOBS[j].secs;
    const tools = JOBS[j].needs.slice(); // Keep tools in a stable order.
    el.className = "";
    el.innerHTML = '<div class="sh"><div><b>' + JOBS[j].name + '</b><small id="sStep"></small></div><div id="sTime"></div></div><div class="bbar"><i id="sBar"></i></div>' +
      '<div class="scue" id="sCue" aria-live="polite"></div><div class="sscene" id="sScene"><img id="sImg" alt=""><img id="sCar" class="scar" alt=""><img id="sJack" class="sjack" src="tool-floorjack.webp" alt=""><img id="sPan" class="span" src="svc-pan.webp" alt=""><img id="sFunnel" class="sfunnel" src="svc-funnel.webp" alt=""><img id="sDip" class="sdip" alt=""><div id="sTap" class="stap"></div><div id="sLabel" class="slabel"></div><div id="sMeter" class="smeter"><i></i><span>MAX</span><span>MIN</span></div><button id="sAct" class="sact"></button><div id="sWait" class="swait"><span></span><i></i></div></div>' +
      '<div class="stray"><div class="sl">TOOL BAG</div><div class="srow" id="sBag"></div><div class="sl">TOOL CART</div><div class="srow" id="sCartRow"></div></div>';
    // Unjacked car with wheels ON at the start. The jack is a separate sprite
    // and the car only rises after the player uses it.
    // Shared, unbranded 3D-comic SUV and identical brake geometry in every stage.
    const svgUrl = (markup) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
    const artDefs = '<defs><linearGradient id="blue" x2=".2" y2="1"><stop stop-color="#94dcff"/><stop offset=".27" stop-color="#1766c5"/><stop offset=".65" stop-color="#003f94"/><stop offset="1" stop-color="#071c47"/></linearGradient><linearGradient id="metal" x2=".3" y2="1"><stop stop-color="#f2f6fc"/><stop offset=".5" stop-color="#73899e"/><stop offset="1" stop-color="#26384d"/></linearGradient><radialGradient id="rotor"><stop stop-color="#cad8e5"/><stop offset=".55" stop-color="#7b8c9b"/><stop offset=".8" stop-color="#dae5ee"/><stop offset="1" stop-color="#33485d"/></radialGradient><radialGradient id="rust"><stop stop-color="#81502d"/><stop offset=".5" stop-color="#a45d34"/><stop offset=".8" stop-color="#6d3a26"/><stop offset="1" stop-color="#302b2a"/></radialGradient><linearGradient id="glass" x2=".8" y2="1"><stop stop-color="#c2efff"/><stop offset=".35" stop-color="#3879b0"/><stop offset="1" stop-color="#0b1c35"/></linearGradient></defs>';
    const wheel = (x,y) => '<g transform="translate('+x+' '+y+')"><circle r="75" fill="#0a0e18" stroke="#202a39" stroke-width="9"/><circle r="60" fill="#26384b" stroke="#0a1018" stroke-width="8"/><circle r="49" fill="url(#metal)" stroke="#e4effa" stroke-width="4"/>'+Array.from({length:10},(_,n)=>'<path d="M-7 -43 L7 -43 11 -15 -11 -15Z" fill="#1a2636" transform="rotate('+(n*36)+')"/>').join('')+'<circle r="13" fill="#1b293d" stroke="#b9c9d8" stroke-width="5"/></g>';
    const suvArt = (raised, wheelOff) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 430">'+artDefs+
      '<rect width="800" height="430" fill="#111d2b"/><path d="M0 355 H800" stroke="#ffc72c" stroke-width="5"/><path d="M0 370 H800" stroke="#253546" stroke-width="4"/><ellipse cx="400" cy="365" rx="345" ry="24" fill="#000" opacity=".45"/>'+
      '<g transform="translate(0 '+(raised?-37:0)+')"><path d="M82 207 L153 186 245 102 Q260 86 290 86 H503 Q538 86 558 104 L635 188 709 206 Q752 218 754 254 L744 320 H52 L48 255 Q49 226 82 207Z" fill="url(#blue)" stroke="#081529" stroke-width="12"/>'+
      '<path d="M257 111 H500 Q520 111 534 127 L589 194 H182Z" fill="url(#glass)" stroke="#07172e" stroke-width="10"/><path d="M398 111 V194" stroke="#081a33" stroke-width="10"/><path d="M166 210 H640" stroke="#7acbff" stroke-width="6" opacity=".75"/><path d="M71 263 H735" stroke="#041c45" stroke-width="8"/><path d="M72 233 L161 214 161 246 70 257Z" fill="#e6f9ff" stroke="#193953" stroke-width="6"/><path d="M648 217 L726 233 734 254 650 242Z" fill="#f34b35"/><path d="M64 292 H745" stroke="#2a9ff2" stroke-width="6"/><path d="M317 194 V312 M550 194 V312" stroke="#061a3d" stroke-width="5"/><path d="M536 224 h37" stroke="#d7f5ff" stroke-width="6" stroke-linecap="round"/>'+
      wheel(210,320)+wheel(612,320)+'</g>'+
      (raised?'<g><path d="M320 363 L395 320 470 363Z" fill="#9e1d1a" stroke="#280b10" stroke-width="6"/><rect x="335" y="356" width="142" height="17" rx="6" fill="#e43e2b"/><circle cx="348" cy="374" r="12" fill="#141b27"/><circle cx="462" cy="374" r="12" fill="#141b27"/><path d="M454 347 L532 301" stroke="#fa533a" stroke-width="15" stroke-linecap="round"/></g>':'')+
      '</svg>';
    const brakeArt = (stage) => {
      const fresh = stage >= 7, bare = stage === 5 || stage === 6, noCaliper = stage >= 4 && stage <= 7;
      const rotor = fresh ? 'url(#rotor)' : 'url(#rust)';
      const caliper = fresh ? '#657587' : '#765b4c';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 430">'+artDefs+
        '<rect width="800" height="430" fill="#101c2c"/><path d="M0 40 Q220 0 800 35 V120 Q600 76 450 115 Q180 95 0 150Z" fill="url(#blue)" stroke="#081426" stroke-width="15"/><path d="M0 380 H800" stroke="#ffcb3c" stroke-width="5"/>'+
        '<circle cx="400" cy="242" r="181" fill="#0a1019" stroke="#1c2a3b" stroke-width="19"/><circle cx="400" cy="242" r="154" fill="#25313e" stroke="#56697a" stroke-width="10"/>'+
        (bare ? '' : '<circle cx="400" cy="242" r="137" fill="'+rotor+'" stroke="#18232d" stroke-width="9"/>'+
        (fresh ? Array.from({length:9},(_,n)=>'<path d="M400 113 V140" transform="rotate('+(n*40)+' 400 242)" stroke="#fff" opacity=".28" stroke-width="5"/>').join('') :
        Array.from({length:11},(_,n)=>'<path d="M400 114 Q415 145 400 170" transform="rotate('+(n*32)+' 400 242)" stroke="#db9864" opacity=".6" stroke-width="4" fill="none"/>').join('')))+
        '<circle cx="400" cy="242" r="66" fill="'+(bare?'#7a5742':fresh?'#9caebc':'#795137')+'" stroke="#283646" stroke-width="10"/>'+
        Array.from({length:5},(_,n)=>'<circle cx="'+(400+48*Math.cos(n*2*Math.PI/5))+'" cy="'+(242+48*Math.sin(n*2*Math.PI/5))+'" r="9" fill="#d2d9df" stroke="#263545" stroke-width="4"/>').join('')+
        '<circle cx="400" cy="242" r="17" fill="#1d2a37" stroke="#a7b8c6" stroke-width="5"/>'+
        (!noCaliper?'<g><path d="M218 153 Q175 167 173 206 V291 Q180 333 236 334 H290 Q312 325 312 304 V180 Q301 148 273 150Z" fill="'+caliper+'" stroke="#1a2530" stroke-width="10"/><path d="M195 207 H285 V267 H195Z" fill="#252d37" stroke="#c0a28c" stroke-width="7"/><circle cx="241" cy="177" r="13" fill="#a9b8c6"/><circle cx="241" cy="313" r="13" fill="#a9b8c6"/></g>':'<path d="M194 165 V318 H277" stroke="#6c7984" stroke-width="23" fill="none"/>')+
        (stage===5?'<g stroke="#ffbd3a" stroke-width="6"><path d="M337 195 L490 289 M345 289 L483 187"/></g>':'')+
        (stage===6?'<g><path d="M510 140 L590 100" stroke="#e6b83d" stroke-width="18"/><path d="M530 150 L608 107" stroke="#c3d3de" stroke-width="13"/></g>':'')+
        '<rect x="10" y="375" width="780" height="45" rx="10" fill="#0d1726" stroke="#f3bd33" stroke-width="3"/><text x="400" y="406" font-family="Arial,sans-serif" font-weight="900" font-size="25" text-anchor="middle" fill="#fff">'+(bare?'HUB EXPOSED — CLEAN THE MATING FACE':fresh?'NEW ROTOR • SAME CALIPER DESIGN':'WORN ROTOR • WORN PADS • ORIGINAL CALIPER')+'</text></svg>';
    };
    $("sCar").src = svgUrl(suvArt(false, false));
    const renderBrake = () => {
      if (j !== "brake") return;
      const stage = Math.max(0,i);
      const carView = stage <= 2 || stage >= 10;
      $("sScene").classList.toggle("carview", carView);
      if (carView) {
        $("sCar").src = svgUrl(suvArt(stage===2 || stage===10, false));
        $("sScene").classList.remove("lifted");
        $("sJack").classList.remove("on");
      } else $("sImg").src = svgUrl(brakeArt(stage));
    };
    for (const id of tools) {
      const b = document.createElement("button");
      b.className = "stool"; b.dataset.id = id;
      b.innerHTML = '<img src="' + ITEMS[id].img + '" alt=""><em>' + ITEMS[id].name + "</em>";
      (ITEMS[id].kind === "tool" ? $("sBag") : $("sCartRow")).append(b);
    }
    let left = secs * 1000, last = performance.now(), over = false, raf = 0, i = -1, busy = false, mistakes = 0, oilLvl = 0, pouring = false, pumps = 0, fillTimer = null;
    const upd = () => { $("sTime").textContent = (left / 1000).toFixed(1); $("sTime").className = left < 8000 ? "low" : ""; $("sBar").style.transform = "scaleX(" + Math.max(0, left / (secs * 1000)) + ")"; };
    const pop = (txt, good) => { const p = document.createElement("div"); p.className = "bpop" + (good ? " good" : ""); p.textContent = txt; p.style.left = "50%"; p.style.top = "40%"; p.style.transform = "translateX(-50%)"; $("sScene").append(p); setTimeout(() => p.remove(), 800); };
    const wrong = (txt) => { left -= 2000; mistakes++; sfx("miss"); buzz("medium"); pop(txt || "-2s"); el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
    S = {
      showPan: (v) => $("sPan").classList.toggle("on", v),
      showFunnel: (v) => $("sFunnel").classList.toggle("on", v),
      lift: (v) => { $("sScene").classList.toggle("lifted", v); $("sJack").classList.toggle("on", v); },
      label: (t) => { const l = $("sLabel"); l.textContent = t; l.classList.add("on"); setTimeout(() => l.classList.remove("on"), 1400); },
      dip: (src) => { const d = $("sDip"); d.src = src; d.classList.add("on"); },
      flash: (src) => { const f = document.createElement("img"); f.src = src; f.className = "sflash"; $("sScene").append(f); setTimeout(() => f.remove(), 900); },
      wait: (t, ms) => { busy = true; const w = $("sWait"); w.querySelector("span").textContent = t; w.classList.add("on"); w.querySelector("i").style.transition = "none"; w.querySelector("i").style.transform = "scaleX(0)"; void w.offsetWidth; w.querySelector("i").style.transition = "transform " + ms + "ms linear"; w.querySelector("i").style.transform = "scaleX(1)"; setTimeout(() => { w.classList.remove("on"); busy = false; }, ms); },
    };
    function setScene(src) {
      const isCar = src === "car";
      $("sScene").classList.toggle("carview", isCar);
      if (!isCar) $("sImg").src = src;
    }
    function nextStep() {
      i++;
      if (i >= steps.length) return finish(true);
      const st = steps[i];
      if (st.before) st.before(S);
      setScene(st.scene);
      renderBrake();
      $("sStep").textContent = "STEP " + (i + 1) + "/" + steps.length + ": " + st.say;
      el.querySelectorAll(".stool").forEach((btn) => {
        const active = st.use === btn.dataset.id;
        btn.classList.toggle("needed", active);
        btn.setAttribute("aria-label", ITEMS[btn.dataset.id].name + (active ? ", use this now" : ""));
      });
      const cue = $("sCue");
      if (cue) cue.textContent = st.use ? "USE NOW: " + ITEMS[st.use].name.toUpperCase() :
        st.tap ? "TAP THE HIGHLIGHTED OIL CAP" : st.check ? "CHECK THE DIPSTICK READING" :
        st.pump ? "TAP THE BRAKE PEDAL THREE TIMES" : st.say.toUpperCase();
      const tap = $("sTap"), act = $("sAct"), meter = $("sMeter");
      tap.className = "stap"; act.className = "sact"; meter.classList.toggle("on", !!st.pour); if (st.pour) { oilLvl = 0; meterUpd(); }
      if (st.tap) { const [x, y, w, h] = st.tap; Object.assign(tap.style, { left: x * 100 + "%", top: y * 100 + "%", width: w * 100 + "%", height: h * 100 + "%" }); tap.className = "stap on"; }
      if (st.check) { act.textContent = "CHECK DIPSTICK"; act.className = "sact on"; }
      if (st.pump) { pumps = 0; act.textContent = "PUMP BRAKE PEDAL"; act.className = "sact on"; }
      $("sDip").classList.toggle("on", !!st.check);
    }
    function done(st) {
      if (st.consume && !window.__pr98Testing) { G.cart[st.consume] = Math.max(0, (G.cart[st.consume] || 0) - 1); save(); const b = el.querySelector('.stool[data-id="' + st.consume + '"]'); if (b) b.classList.add("used"); }
      sfx("power"); buzz("light"); pop("✓", true);
      if (st.next) setScene(st.next);
      if (j === "brake") renderBrake();
      if (st.after) st.after(S);
      setTimeout(() => { const go = () => { if (over) return; if (busy) setTimeout(go, 100); else nextStep(); }; go(); }, 350);
    }
    el.querySelectorAll(".stool").forEach((b) => {
      const id = b.dataset.id;
      const press = (e) => {
        e.preventDefault();
        if (over || busy || i < 0) return;
        const st = steps[i];
        if (st.pour && id === "oil") {
          busy = true;
          oilLvl = 0;
          meterUpd();
          b.classList.add("pouring");
          S.wait("Adding fresh oil — watch the meter rise…", 2800);
          const startedAt = performance.now();
          const fill = () => {
            if (over || i < 0 || steps[i] !== st) { b.classList.remove("pouring"); return; }
            oilLvl = Math.min(0.8, (performance.now() - startedAt) / 2800 * 0.8);
            meterUpd();
            if (oilLvl >= 0.8) {
              b.classList.remove("pouring");
              fillTimer = null;
              done(st);
            } else fillTimer = setTimeout(fill, 40);
          };
          fillTimer = setTimeout(fill, 40);
          return;
        }
        if (st.use === id && !st.pour) { busy = true; setTimeout(() => (busy = false), 360); done(st); }
        else if (b.classList.contains("used")) wrong("Already used!");
        else wrong(st.tap || st.check || st.pump ? "Tap the " + (st.tap ? "oil cap" : "button") + "!" : "Wrong tool! -2s");
      };
      b.onpointerdown = press;
      const stop = () => { /* Oil filling is a single tap, not a fragile long press. */ };
      b.onpointerup = stop; b.onpointerleave = stop; b.onpointercancel = stop;
    });
    $("sTap").onpointerdown = (e) => { e.preventDefault(); if (over || busy) return; const st = steps[i]; if (st && st.tap) { $("sTap").className = "stap"; busy = true; setTimeout(() => (busy = false), 360); done(st); } };
    $("sScene").onpointerdown = (e) => { if (e.target.id === "sScene" || e.target.id === "sImg" || e.target.id === "sCar") { const st = steps[i]; if (st && st.tap && !over && !busy) wrong("Not there! Find the oil cap"); } };
    $("sAct").onpointerdown = (e) => {
      e.preventDefault(); if (over || busy) return;
      const st = steps[i];
      if (st.pump) { pumps++; sfx("flap"); buzz("medium"); pop("PUMP " + pumps, true); if (pumps >= st.pump) { $("sAct").className = "sact"; done(st); } return; }
      if (!st.check) return;
      const full = oilLvl >= 0.7 && oilLvl <= 0.9;
      S.dip(oilLvl < 0.7 ? "dip-low.webp" : "dip-full.webp");
      if (full) { S.label("Oil level is right in the safe zone!"); $("sAct").className = "sact"; done(st); }
      else if (oilLvl < 0.7) { S.label("Too low! Pour a little more."); wrong("LOW -2s"); setTimeout(() => { i = OIL_STEPS.findIndex((x) => x.pour) - 1; nextStep(); }, 900); }
      else { S.label("Overfilled! Draining some out…"); wrong("OVERFILLED -2s"); oilLvl = 0.8; meterUpd(); S.wait("Draining the extra oil…", 1500); setTimeout(() => { $("sAct").className = "sact"; done(st); }, 1600); }
    };
    const meterUpd = () => { $("sMeter").querySelector("i").style.transform = "scaleY(" + Math.min(1, oilLvl) + ")"; $("sMeter").classList.toggle("over", oilLvl > 0.9); };
    const loop = (now) => {
      if (over) return;
      const dt = Math.min(100, now - last); last = now; left -= dt;

      if (left <= 0) { left = 0; upd(); sfx("hit"); buzz("heavy"); return finish(false); }
      upd(); raf = requestAnimationFrame(loop);
    };
    function finish(won) {
      if (over) return;
      over = true; cancelAnimationFrame(raf); if (fillTimer !== null) clearTimeout(fillTimer); stopMusic();
      if (won) { sfx("win"); buzz("success"); el.classList.add("won"); }
      setTimeout(() => {
        el.className = "hidden";
        const t = Math.ceil(left / 1000);
        let desc;
        if (window.__pr98Testing) {
          desc = "TEST COMPLETE — " + JOBS[j].name + ". No tools, coins, or progress changed.";
        } else if (won) {
          G.done[j] = (G.done[j] || 0) + 1; save();
          const coinsWon = (j === "oil" ? 120 : 100) + t * 3 - mistakes * 5, pts = 2000 + t * 100;
          totalCoins += Math.max(40, coinsWon); totalScore += pts;
          localStorage.setItem("tenmm-coins", totalCoins); localStorage.setItem("tenmm-score", totalScore);
          desc = JOBS[j].short + " done with " + t + "s left" + (mistakes ? " (" + mistakes + " wrong tool" + (mistakes > 1 ? "s" : "") + ")" : ", no mistakes!") + " +" + Math.max(40, coinsWon) + " coins • +" + pts + " points. " +
            "Your tools stay in the bag. Find new " + JOBS[j].needs.filter((id) => ITEMS[id].kind === "part").map((id) => ITEMS[id].name.toLowerCase()).join(" and ") + " in the levels to do it again.";
        } else {
          desc = "Time's up! The customer is still waiting. Your parts were " + (i > 3 ? "partly used, so grab new ones in the levels." : "saved, so try again from the Service Bay.");
          if (!window.__pr98Testing && i <= 3) for (const st of steps.slice(0, i + 1)) if (st.consume) { G.cart[st.consume] = (G.cart[st.consume] || 0) + 1; save(); }
        }
        popup(won ? "JOB DONE!" : "TIME'S UP!", desc, "SERVICE BAY", showGarage, won ? "win" : "toolbox");
        $("eyebrow").textContent = JOBS[j].name;
        $("menuSettings").style.display = ""; $("menuSettings").textContent = "MAIN MENU"; $("menuSettings").onclick = showMenu;
      }, won ? 1100 : 700);
    }
    upd(); raf = requestAnimationFrame(loop);
    nextStep();
  }

  window.Service = { G, ready, missing, showGarage, runJob, addItem, ITEMS, JOBS };
})();
