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
    lugwrench: { name: "1/2-inch air impact gun", img: "svc-lugwrench.webp", kind: "tool" },
    piston: { name: "Caliper piston tool", img: "svc-piston.webp", kind: "tool" },
    brush: { name: "Hub cleaning brush", img: "svc-wrenches.webp", kind: "tool" },
    grease: { name: "Brake pin grease", img: "svc-oil-full.webp", kind: "tool" },
    filter: { name: "Oil filter", img: "svc-filter.webp", kind: "part" },
    oil: { name: "Jug of motor oil", img: "svc-oil-full.webp", kind: "part" },
    brakes: { name: "Rotor & brake pads", img: "svc-brakes-new.webp", kind: "part" },
    sparkplug: { name: "Spark plug (not needed)", img: "tool-bolt.webp", kind: "tool" },
    battery: { name: "Battery tester (not needed)", img: "svc-piston.webp", kind: "tool" },
    coolant: { name: "Coolant jug (not needed)", img: "svc-oil-full.webp", kind: "tool" },
    pliers: { name: "Pliers (not needed)", img: "svc-wrenches.webp", kind: "tool" },
    belt: { name: "Drive belt (not needed)", img: "svc-brakes-new.webp", kind: "tool" },
  };
  // Dedicated matching tool illustrations; no more wrench/oil-jug placeholders.
  const iconSvg = (body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#ff8757"/><stop offset="1" stop-color="#a71b17"/></linearGradient></defs>'+body+'</svg>');
  ITEMS.brush.img = iconSvg('<g transform="rotate(-35 80 80)"><rect x="65" y="70" width="30" height="75" rx="11" fill="url(#g)" stroke="#2d1010" stroke-width="5"/><rect x="56" y="31" width="48" height="48" rx="8" fill="#394b5a" stroke="#cbd8df" stroke-width="5"/>'+Array.from({length:8},(_,i)=>'<path d="M'+(60+i*6)+' 31 V10" stroke="#e8c16d" stroke-width="5" stroke-linecap="round"/>').join('')+'</g>');
  ITEMS.grease.img = iconSvg('<g transform="rotate(-23 80 80)"><path d="M50 36 H110 L118 115 H42Z" fill="#f4f6f8" stroke="#293647" stroke-width="6"/><path d="M49 55 H111 V100 H49Z" fill="url(#g)"/><text x="80" y="75" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="white">BRAKE</text><text x="80" y="93" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="white">GREASE</text><path d="M58 36 L66 15 H94 L102 36Z" fill="#c6d3df" stroke="#293647" stroke-width="5"/><path d="M56 116 H104 L97 145 H63Z" fill="#e3e9ed" stroke="#293647" stroke-width="5"/></g>');
  // Brake-round wheel tool: realistic pneumatic 1/2-inch impact wrench,
  // replacing the former four-way lug wrench tile.
  ITEMS.lugwrench.img = iconSvg('<defs><linearGradient id="impact" x2="1" y2="1"><stop stop-color="#aebbc8"/><stop offset=".45" stop-color="#596c7f"/><stop offset="1" stop-color="#263545"/></linearGradient></defs><g transform="rotate(-14 80 80)"><path d="M26 45 H48 V32 H117 Q135 32 138 49 V77 Q135 91 118 91 H89 L83 131 Q81 144 68 144 H56 Q46 142 49 128 L55 91 H43 Q29 88 26 76Z" fill="url(#impact)" stroke="#142332" stroke-width="6"/><rect x="12" y="53" width="23" height="25" rx="3" fill="#c7d0d7" stroke="#253746" stroke-width="5"/><rect x="2" y="58" width="13" height="15" rx="2" fill="#778b9b" stroke="#253746" stroke-width="3"/><path d="M55 42 H115 M58 51 H114" stroke="#e8f3fa" stroke-width="4" opacity=".6"/><path d="M94 34 V87 M105 34 V87 M116 35 V86" stroke="#182d40" stroke-width="4"/><path d="M58 91 H83 L79 109 H54Z" fill="#e4a72d" stroke="#243647" stroke-width="4"/><path d="M56 117 H80 L76 136 H52Z" fill="#202d39" stroke="#111c29" stroke-width="4"/><circle cx="65" cy="78" r="6" fill="#f1bd43"/><path d="M62 143 V151" stroke="#b4c0c9" stroke-width="5"/></g>');
  ITEMS.sparkplug.img = iconSvg('<g transform="rotate(28 80 80)"><rect x="66" y="24" width="28" height="33" rx="4" fill="#f1f4f7" stroke="#334352" stroke-width="6"/><path d="M62 57 H98 L108 88 98 102 H62 L52 88Z" fill="#aab9c7" stroke="#243544" stroke-width="6"/><path d="M66 104 H94 V143 H66Z" fill="#c3ccd4" stroke="#243544" stroke-width="5"/><path d="M69 112 H91 M69 123 H91 M69 134 H91" stroke="#566b7e" stroke-width="5"/><path d="M80 24 V9 H99" stroke="#293c4d" stroke-width="6" fill="none"/></g>');
  ITEMS.battery.img = iconSvg('<rect x="24" y="44" width="112" height="91" rx="12" fill="#344d66" stroke="#142536" stroke-width="8"/><rect x="38" y="28" width="23" height="18" rx="4" fill="#e44d3e"/><rect x="99" y="28" width="23" height="18" rx="4" fill="#d6e1e9"/><path d="M39 67 H121 V113 H39Z" fill="#e4ad34"/><path d="M55 90 H75 M65 80 V100 M94 90 H110" stroke="#192638" stroke-width="7"/>');
  ITEMS.coolant.img = iconSvg('<path d="M48 38 H112 L125 126 Q125 139 112 139 H48 Q35 139 35 126Z" fill="#72d7a3" stroke="#24433e" stroke-width="7"/><path d="M55 27 H105 V40 H55Z" fill="#273c4d"/><path d="M45 72 H115 V112 H45Z" fill="#f2f8f3"/><text x="80" y="97" font-family="Arial" font-size="16" font-weight="900" text-anchor="middle" fill="#215e45">COOLANT</text>');
  ITEMS.pliers.img = iconSvg('<g transform="rotate(-25 80 80)"><path d="M61 17 Q45 42 74 72 L53 140" stroke="#d9463b" stroke-width="19" fill="none" stroke-linecap="round"/><path d="M99 17 Q115 42 86 72 L107 140" stroke="#f4b73f" stroke-width="19" fill="none" stroke-linecap="round"/><circle cx="80" cy="73" r="12" fill="#cbd5df" stroke="#283b4e" stroke-width="5"/></g>');
  // Brake-only polished automotive icons; oil-change assets remain unchanged.
  const glossySvg = (body) => iconSvg('<defs><linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".32" stop-color="#a9c1d4"/><stop offset=".67" stop-color="#536b80"/><stop offset="1" stop-color="#edf6ff"/></linearGradient><linearGradient id="red" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff9879"/><stop offset=".45" stop-color="#f03925"/><stop offset="1" stop-color="#771318"/></linearGradient><linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a8eaff"/><stop offset=".45" stop-color="#1679df"/><stop offset="1" stop-color="#102d6b"/></linearGradient></defs>'+body);
  ITEMS.jack.img = glossySvg('<g stroke="#101b2b" stroke-width="5" stroke-linejoin="round"><path d="M22 115 L42 93 115 93 137 120 128 135 H28Z" fill="url(#red)"/><path d="M54 92 L81 58 103 92Z" fill="url(#steel)"/><rect x="72" y="49" width="32" height="12" rx="5" fill="url(#steel)"/><path d="M112 98 L141 27" stroke="#aabed0" stroke-width="9"/><circle cx="44" cy="136" r="12" fill="#1a2839"/><circle cx="118" cy="136" r="12" fill="#1a2839"/><path d="M35 109 H112" stroke="#ffc1a1" stroke-width="5"/></g>');
  ITEMS.battery.img = glossySvg('<g stroke="#142439" stroke-width="5"><path d="M34 34 Q25 34 25 46 V129 Q25 138 37 138 H123 Q135 138 135 126 V44 Q135 34 123 34Z" fill="url(#red)"/><rect x="38" y="47" width="84" height="56" rx="7" fill="#17293b"/><rect x="46" y="55" width="68" height="39" rx="3" fill="#d6e8f3"/><path d="M48 81 L60 69 74 79 86 64 104 72" fill="none" stroke="#38aa74" stroke-width="5"/><rect x="45" y="19" width="20" height="17" rx="4" fill="url(#steel)"/><rect x="98" y="19" width="20" height="17" rx="4" fill="url(#steel)"/><path d="M42 114 H118" stroke="#ffd1c5" stroke-width="4"/></g>');
  ITEMS.pliers.img = glossySvg('<g transform="rotate(-22 80 80)" stroke="#182536" stroke-linecap="round" stroke-linejoin="round"><path d="M70 78 L43 139" stroke-width="20" stroke="#15263a"/><path d="M90 78 L117 139" stroke-width="20" stroke="#15263a"/><path d="M70 78 L43 139 M90 78 L117 139" stroke-width="14" stroke="url(#red)"/><path d="M77 79 Q54 48 59 16 L81 48 100 14 Q112 48 83 79Z" fill="url(#steel)" stroke-width="5"/><circle cx="80" cy="77" r="9" fill="#cbdbe7" stroke-width="5"/></g>');
  ITEMS.brush.img = glossySvg('<g transform="rotate(-32 80 80)" stroke="#1c2b3b" stroke-width="5"><rect x="66" y="75" width="29" height="69" rx="11" fill="url(#red)"/><rect x="53" y="46" width="55" height="35" rx="8" fill="url(#steel)"/>'+Array.from({length:12},(_,i)=>'<path d="M'+(57+i*4)+' 46 V17" stroke="#e7bd57" stroke-width="3"/>').join('')+'<path d="M71 96 V127" stroke="#ffd4c2" stroke-width="4"/></g>');
  ITEMS.coolant.img = glossySvg('<path d="M47 40 H105 L124 57 V126 Q124 139 111 139 H45 Q32 139 32 126 V55Z" fill="#1c9d59" stroke="#132b34" stroke-width="7"/><path d="M58 29 H103 V43 H58Z" fill="#253b4d"/><path d="M48 72 H112 V110 H48Z" fill="#e5fff1" stroke="#12462f" stroke-width="3"/><text x="80" y="96" font-family="Arial" font-weight="900" font-size="15" fill="#17603d" text-anchor="middle">COOLANT</text><path d="M43 53 V126" stroke="#b8ffd1" stroke-width="5" opacity=".7"/>');
  ITEMS.belt.img = iconSvg('<ellipse cx="80" cy="80" rx="57" ry="43" fill="none" stroke="#151d27" stroke-width="23"/><ellipse cx="80" cy="80" rx="57" ry="43" fill="none" stroke="#596574" stroke-width="4" stroke-dasharray="8 6"/>');
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
    { say: "Put on mechanic gloves", use: "gloves", scene: "car" },
    { say: "Raise and securely support the vehicle at approved lift points", use: "jack", scene: "car", after: (s) => s.lift(true) },
    { say: "Use the 1/2-inch air impact gun to remove the front wheel", use: "lugwrench", scene: "car" },
    { say: "Support the caliper and remove its mounting bolts", use: "ratchet", scene: "svc-brakes-worn.webp" },
    { say: "Remove the worn brake pads; inspect the hardware", use: "ratchet", scene: "svc-brakes-worn.webp", after: (s) => s.label("Worn pads removed; caliper safely supported.") },
    { say: "Retract the caliper piston with the proper tool", use: "piston", scene: "svc-brakes-worn.webp" },
    { say: "Remove the old rotor and clean the hub mounting face", use: "brush", scene: "svc-brakes-worn.webp" },
    { say: "Inspect and lubricate the slide pins with compatible brake grease", use: "grease", scene: "svc-brakes-worn.webp", after: (s) => s.label("Keep grease off pads and rotor friction surfaces.") },
    { say: "Install the new rotor on the clean hub", use: "brakes", scene: "svc-brakes-new.webp" },
    { say: "Install new pads and the correct hardware", use: "brakes", consume: "brakes", scene: "svc-brakes-new.webp" },
    { say: "Reinstall caliper and torque fasteners to vehicle specifications", use: "ratchet", scene: "svc-brakes-new.webp" },
    { say: "Reinstall wheel, lower vehicle, torque lug nuts, then pump pedal firm (3 taps) and verify brakes", pump: 3, scene: "car", before: (s) => s.lift(false) },
  ];

  let S = null;
  function runJob(j) {
    if (!window.__pr98Testing) for (const id of JOBS[j].needs) if (!has(id)) return showGarage();
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    let el = $("svc");
    if (!el) { el = document.createElement("div"); el.id = "svc"; document.body.append(el); }
    const steps = j === "oil" ? OIL_STEPS : BRAKE_STEPS;
    // First successful service teaches the player. Later services test their memory.
    const practiceKey = "tenmm-service-trained-" + j;
    const trained = !window.__pr98Testing && ((G.done[j] || 0) > 0 || localStorage.getItem(practiceKey) === "1");
    const secs = JOBS[j].secs + (trained ? 0 : 25);
    // The tool tray is a puzzle, not an ordered checklist. Add distractors and shuffle
    // on every job launch; all required items remain present.
    const distractors = j === "brake" ? ["sparkplug", "battery", "coolant", "pliers"] : ["sparkplug", "battery", "belt", "pliers"];
    const tools = JOBS[j].needs.concat(distractors);
    for (let k = tools.length - 1; k > 0; k--) {
      const swap = Math.floor(Math.random() * (k + 1));
      [tools[k], tools[swap]] = [tools[swap], tools[k]];
    }
    el.className = j === "brake" ? "brake-polish" : "";
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
      '<rect width="800" height="430" fill="#15293b"/><path d="M0 0 H800 V330 H0Z" fill="#1b3246"/><path d="M0 36 H800 M0 118 H800 M0 201 H800" stroke="#3c5264" stroke-width="8" opacity=".55"/><rect x="13" y="40" width="70" height="263" rx="7" fill="#9d2226" stroke="#1a2837" stroke-width="8"/><path d="M23 90 H73 M23 145 H73 M23 200 H73" stroke="#e55b4b" stroke-width="5"/><rect x="729" y="20" width="31" height="318" rx="5" fill="#1762b3" stroke="#102743" stroke-width="7"/><rect x="731" y="95" width="26" height="20" fill="#ffd052"/><path d="M0 339 H800 V430 H0Z" fill="#344450"/><path d="M0 342 H800" stroke="#e6b44b" stroke-width="6"/><path d="M0 70 H800 M0 145 H800 M0 220 H800" stroke="#263d56" stroke-width="5" opacity=".7"/><path d="M55 0 V350 M755 0 V350" stroke="#37495d" stroke-width="13"/><path d="M0 355 H800" stroke="#ffc72c" stroke-width="5"/><path d="M0 370 H800" stroke="#253546" stroke-width="4"/><ellipse cx="400" cy="365" rx="345" ry="24" fill="#000" opacity=".45"/>'+
      '<g transform="translate(0 '+(raised?-37:0)+')"><path d="M82 207 L153 186 245 102 Q260 86 290 86 H503 Q538 86 558 104 L635 188 709 206 Q752 218 754 254 L744 320 H52 L48 255 Q49 226 82 207Z" fill="url(#blue)" stroke="#081529" stroke-width="12"/>'+
      '<path d="M257 111 H500 Q520 111 534 127 L589 194 H182Z" fill="url(#glass)" stroke="#07172e" stroke-width="10"/><path d="M398 111 V194" stroke="#081a33" stroke-width="10"/><path d="M166 210 H640" stroke="#7acbff" stroke-width="6" opacity=".75"/><path d="M71 263 H735" stroke="#041c45" stroke-width="8"/><path d="M72 233 L161 214 161 246 70 257Z" fill="#e6f9ff" stroke="#193953" stroke-width="6"/><path d="M648 217 L726 233 734 254 650 242Z" fill="#f34b35"/><path d="M64 292 H745" stroke="#2a9ff2" stroke-width="6"/><path d="M317 194 V312 M550 194 V312" stroke="#061a3d" stroke-width="5"/><path d="M536 224 h37" stroke="#d7f5ff" stroke-width="6" stroke-linecap="round"/>'+
      (wheelOff ? '<g transform="translate(210 320)"><circle r="75" fill="#0b1724" stroke="#23384c" stroke-width="9"/><circle r="57" fill="#925b36" stroke="#3a302a" stroke-width="8"/><circle r="23" fill="#b2c3d0" stroke="#243a50" stroke-width="7"/></g>' : wheel(210,320))+wheel(612,320)+'</g>'+
      (raised?'<g><path d="M320 363 L395 320 470 363Z" fill="#9e1d1a" stroke="#280b10" stroke-width="6"/><rect x="335" y="356" width="142" height="17" rx="6" fill="#e43e2b"/><circle cx="348" cy="374" r="12" fill="#141b27"/><circle cx="462" cy="374" r="12" fill="#141b27"/><path d="M454 347 L532 301" stroke="#fa533a" stroke-width="15" stroke-linecap="round"/></g>':'')+
      '</svg>';
    const brakeArt = (stage) => {
      const fresh = stage >= 7, bare = stage === 5 || stage === 6, noCaliper = stage >= 4 && stage <= 7;
      const rotor = fresh ? 'url(#rotor)' : 'url(#rust)';
      const caliper = '#765b4c'; // Original caliper stays the same, even after rotor/pad replacement.
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 430">'+artDefs+
        '<rect width="800" height="430" fill="#101c2c"/><path d="M0 65 H800 M0 135 H800 M0 205 H800" stroke="#263a50" stroke-width="5" opacity=".5"/><path d="M0 40 Q220 0 800 35 V120 Q600 76 450 115 Q180 95 0 150Z" fill="url(#blue)" stroke="#081426" stroke-width="15"/><path d="M35 62 Q240 15 690 55" fill="none" stroke="#6ecaff" stroke-width="9" opacity=".55"/><path d="M0 380 H800" stroke="#ffcb3c" stroke-width="5"/>'+
        '<circle cx="400" cy="242" r="181" fill="#0a1019" stroke="#1c2a3b" stroke-width="19"/><circle cx="400" cy="242" r="154" fill="#25313e" stroke="#56697a" stroke-width="10"/><path d="M254 170 Q400 70 551 170" fill="none" stroke="#738ba1" stroke-width="8" opacity=".6"/>' +
        (bare ? '' : '<circle cx="400" cy="242" r="137" fill="'+rotor+'" stroke="#18232d" stroke-width="9"/>'+
        (fresh ? Array.from({length:9},(_,n)=>'<path d="M400 113 V140" transform="rotate('+(n*40)+' 400 242)" stroke="#fff" opacity=".28" stroke-width="5"/>').join('') :
        Array.from({length:11},(_,n)=>'<path d="M400 114 Q415 145 400 170" transform="rotate('+(n*32)+' 400 242)" stroke="#db9864" opacity=".6" stroke-width="4" fill="none"/>').join('')))+
        '<circle cx="400" cy="242" r="66" fill="'+(bare?'#7a5742':fresh?'#9caebc':'#795137')+'" stroke="#283646" stroke-width="10"/>'+
        Array.from({length:5},(_,n)=>'<circle cx="'+(400+48*Math.cos(n*2*Math.PI/5))+'" cy="'+(242+48*Math.sin(n*2*Math.PI/5))+'" r="9" fill="#d2d9df" stroke="#263545" stroke-width="4"/>').join('')+
        '<circle cx="400" cy="242" r="17" fill="#1d2a37" stroke="#a7b8c6" stroke-width="5"/>'+
        (!noCaliper?'<g><path d="M218 153 Q175 167 173 206 V291 Q180 333 236 334 H290 Q312 325 312 304 V180 Q301 148 273 150Z" fill="'+caliper+'" stroke="#1a2530" stroke-width="10"/><path d="M195 207 H285 V267 H195Z" fill="#252d37" stroke="#c0a28c" stroke-width="7"/><circle cx="241" cy="177" r="13" fill="#a9b8c6"/><circle cx="241" cy="313" r="13" fill="#a9b8c6"/></g>':'<path d="M194 165 V318 H277" stroke="#6c7984" stroke-width="23" fill="none"/>')+
        (stage===5?'<g><circle cx="400" cy="242" r="76" fill="none" stroke="#f0b43a" stroke-width="5" stroke-dasharray="12 12"/><path d="M540 170 L493 211" stroke="#ffda57" stroke-width="14" stroke-linecap="round"/><path d="M492 211 L465 225" stroke="#b6cbd9" stroke-width="20" stroke-linecap="round"/></g>':'')+
        (stage===6?'<g><rect x="516" y="135" width="206" height="104" rx="15" fill="#263546" stroke="#e9c14b" stroke-width="5"/><path d="M540 163 H696 M540 209 H696" stroke="#b9c8d5" stroke-width="15" stroke-linecap="round"/><circle cx="553" cy="163" r="9" fill="#d7b15b"/><circle cx="553" cy="209" r="9" fill="#d7b15b"/><path d="M580 164 L647 185" stroke="#f8d351" stroke-width="8" stroke-linecap="round"/><text x="620" y="259" font-size="18" font-family="Arial" font-weight="bold" fill="#ffe076" text-anchor="middle">CLEAN + GREASE PINS</text></g>':'')+
        '<rect x="10" y="375" width="780" height="45" rx="10" fill="#0d1726" stroke="#f3bd33" stroke-width="3"/><text x="400" y="406" font-family="Arial,sans-serif" font-weight="900" font-size="23" text-anchor="middle" fill="#fff">'+(['WHEEL REMOVED • WORN BRAKES','REMOVE CALIPER BOLTS','SUPPORT CALIPER • RETRACT PISTON','CLEAN EXPOSED HUB','CLEAN + GREASE SLIDE PINS','FIT NEW ROTOR + PADS','REINSTALL ORIGINAL CALIPER','REINSTALL WHEEL'][Math.max(0,Math.min(7,stage-2))])+'</text></svg>';
    };
    $("sCar").src = svgUrl(suvArt(false, false));
    // Scene files are intentionally separate from the instructional UI: the
    // original storyboard has baked-in, inconsistent step numbers.
    // When a scene asset is available, use it; retain the playable SVG scene
    // as a fallback so an incomplete upload cannot break the brake job.
    const brakeSceneFiles = Array.from({length:12}, (_,n) =>
      'https://raw.githubusercontent.com/honestechceo/10mm/polish/brake-service-review-20261118/preview/pr98/brake-art/brake_scene_' + String(n+1).padStart(2,'0') + '.webp');
    const brakeSceneCache = brakeSceneFiles.map(src => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      return img;
    });
    const renderBrake = () => {
      if (j !== "brake") return;
      const stage = Math.max(0,i);
      const scene = $("sScene");
      const art = brakeSceneCache[stage];
      // Use the uploaded art as the primary scene. Do not wait for it to
      // finish downloading before switching away from the old SVG car.
      scene.classList.remove("carview", "lifted");
      scene.classList.add("illustrated-brake");
      $("sJack").classList.remove("on");
      $("sCar").style.display = "none";
      $("sImg").style.display = "block";
      $("sImg").src = art.src;
      scene.dataset.brakeStage = String(stage);
      const fallback = () => {
        if (i !== stage || over) return;
        const carView = stage <= 2 || stage >= 10;
        scene.classList.toggle("carview", carView);
        scene.classList.remove("illustrated-brake");
        $("sImg").style.display = "";
        $("sCar").style.display = "";
        if (carView) $("sCar").src = svgUrl(suvArt(stage===2 || stage===10, false));
        else $("sImg").src = svgUrl(brakeArt(stage));
        const cue = $("sCue");
        if (cue) cue.textContent += " • SCENE IMAGE UNAVAILABLE";
      };
      if (art.complete && !art.naturalWidth) fallback();
      else if (!art.complete) art.addEventListener("error", fallback, {once:true});
    };
    for (const id of tools) {
      const b = document.createElement("button");
      b.className = "stool"; b.dataset.id = id;
      b.innerHTML = '<img src="' + ITEMS[id].img + '" alt=""><em>' + ITEMS[id].name + "</em>";
      $("sBag").append(b); // One mixed tray: parts and tools are not separated by step order.
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
        btn.classList.toggle("needed", active && !trained);
        btn.setAttribute("aria-label", ITEMS[btn.dataset.id].name + (active && !trained ? ", use this now" : ""));
      });
      const cue = $("sCue");
      if (cue) cue.textContent = trained && st.use ? "EXPERT MODE • SELECT THE CORRECT TOOL OR PART" : st.use ? "USE NOW: " + ITEMS[st.use].name.toUpperCase() :
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
      if (won) {
        if (!window.__pr98Testing) try { localStorage.setItem(practiceKey, "1"); } catch (e) {}
        sfx("win"); buzz("success"); el.classList.add("won");
      }
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
        popup(won ? "JOB DONE!" : "TIME'S UP!", desc, window.__pr98Testing ? "BACK TO TESTS" : "SERVICE BAY", window.__pr98Testing && window.__pr98ShowTests ? window.__pr98ShowTests : showGarage, won ? "win" : "toolbox");
        $("eyebrow").textContent = JOBS[j].name;
        $("menuSettings").style.display = ""; $("menuSettings").textContent = "MAIN MENU"; $("menuSettings").onclick = showMenu;
      }, won ? 1100 : 700);
    }
    upd(); raf = requestAnimationFrame(loop);
    nextStep();
  }

  window.Service = { G, ready, missing, showGarage, runJob, addItem, ITEMS, JOBS };
})();
