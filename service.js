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
    ragblue: { name: "Blue shop rag", img: "svc-rag-blue.webp", kind: "tool" },
    ragred: { name: "Red shop rag", img: "svc-rag-red.webp", kind: "tool" },
    jack: { name: "Floor jack", img: "svc-jack2.webp", kind: "tool" },
    chock: { name: "Wheel chock", img: "svc-chock.webp", kind: "tool" },
    impact: { name: "Impact gun", img: "svc-impact.webp", kind: "tool" },
    prybar: { name: "Pry bar", img: "svc-prybar.webp", kind: "tool" },
    compressor: { name: "Piston compressor", img: "svc-compressor.webp", kind: "tool" },
    mallet: { name: "Rubber mallet", img: "svc-mallet.webp", kind: "tool" },
    cleaner: { name: "Brake cleaner", img: "svc-cleaner.webp", kind: "tool" },
    grease: { name: "Caliper grease", img: "svc-grease.webp", kind: "tool" },
    padlube: { name: "Pad lubricant", img: "svc-padlube.webp", kind: "tool" },
    torque: { name: "Torque wrench", img: "svc-torque.webp", kind: "tool" },
    rotor: { name: "New rotor", img: "svc-rotor.webp", kind: "part" },
    pads: { name: "Brake pads", img: "svc-pads.webp", kind: "part" },
    clips: { name: "Pad clips", img: "svc-clips.webp", kind: "part" },
    lugwrench: { name: "Lug wrench", img: "svc-lugwrench.webp", kind: "tool" },
    piston: { name: "Caliper piston tool", img: "svc-piston.webp", kind: "tool" },
    filter: { name: "Oil filter", img: "svc-filter.webp", kind: "part" },
    oil: { name: "Jug of motor oil", img: "svc-oil-full.webp", kind: "part" },
    brakes: { name: "Rotor & brake pads", img: "svc-brakes-new.webp", kind: "part" },
    valvetool: { name: "Valve core tool", img: "svc-valvetool.webp", kind: "tool" },
    beadbreaker: { name: "Bead breaker", img: "svc-beadbreaker.webp", kind: "tool" },
    tirebar: { name: "Tire bar", img: "svc-tirebar.webp", kind: "tool" },
    wirebrush: { name: "Wire brush", img: "svc-wirebrush.webp", kind: "tool" },
    lube: { name: "Tire lube", img: "svc-lube.webp", kind: "tool" },
    airhose: { name: "Air hose & gauge", img: "svc-airhose.webp", kind: "tool" },
    weighthammer: { name: "Weight hammer", img: "svc-weighthammer.webp", kind: "tool" },
    newtire: { name: "New tire", img: "svc-newtire.webp", kind: "part" },
    weights: { name: "Wheel weights", img: "svc-weights.webp", kind: "part" },
  };
  const JOBS = {
    oil: { name: "OIL CHANGE", short: "Oil change", needs: ["gloves", "pan", "wrenches", "filter", "ratchet", "funnel", "oil", "ragblue", "ragred"], secs: 60 },
    brake: { name: "FRONT BRAKE JOB", short: "Brake job", needs: ["chock", "impact", "jack", "ratchet", "prybar", "compressor", "mallet", "wirebrush", "cleaner", "grease", "padlube", "torque", "rotor", "pads", "clips"], secs: 95 },
    tire: { name: "TIRE REPLACEMENT", short: "Tire job", needs: ["valvetool", "beadbreaker", "tirebar", "wirebrush", "lube", "airhose", "weighthammer", "newtire", "weights"], secs: 85 },
  };
  const tester = () => localStorage.getItem("tenmm-tester") === "1";
  const JOB_IDS = () => ["oil", "brake", "tire"];

  const load = () => { try { return JSON.parse(localStorage.getItem("tenmm-garage")) || {}; } catch (e) { return {}; } };
  const G = Object.assign({ bag: [], cart: {}, done: {} }, load());
  const save = () => { try { localStorage.setItem("tenmm-garage", JSON.stringify(G)); } catch (e) {} };
  const has = (id) => (ITEMS[id].kind === "tool" ? G.bag.includes(id) : (G.cart[id] || 0) > 0);
  const missing = (job) => JOBS[job].needs.filter((id) => !has(id));
  const ready = (job) => missing(job).length === 0;
  function nextNeeded() {
    for (const j of JOB_IDS()) { const m = missing(j); if (m.length) return m[0]; }
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
    const ids = JOB_IDS(), job = ids.find((k) => JOBS[k].needs.includes(id) && !ready(k)) || ids.find((k) => JOBS[k].needs.includes(id)) || "oil";
    const n = JOBS[job].needs.length, got = n - missing(job).length;
    lastText = it.name.toUpperCase() + "! Into the " + where + ". " + JOBS[job].short + " kit " + got + "/" + n + ".";
    if (ready(job)) { lastText = JOBS[job].short.toUpperCase() + " KIT COMPLETE! Open the Service Bay on the home screen."; toast(JOBS[job].short + " kit complete! Service Bay is ready.", true); }
    return true;
  };
  FX.pickupText = (t) => (svcId(t) ? lastText : base.pickupText(t));

  // ---------- home screen button ----------
  function svcSummary() {
    const r = JOB_IDS().filter(ready);
    if (r.length) return "READY: " + r.map((j) => JOBS[j].short).join(" & ");
    const j = JOB_IDS().find((k) => missing(k).length) || "oil", n = JOBS[j].needs.length;
    return JOBS[j].short + " kit " + (n - missing(j).length) + "/" + n + " • find parts in levels";
  }
  const baseShowHome = showHome;
  showHome = function (intro) {
    baseShowHome(intro);
    const b = $("hService");
    if (!b) return;
    $("hServiceSub").textContent = svcSummary();
    b.classList.toggle("ready", JOB_IDS().some(ready));
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
    if (tester()) { for (const j of JOB_IDS()) for (const id of JOBS[j].needs) if (!has(id)) addItem(id); }
    for (const j of JOB_IDS()) {
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
    { say: "Loosen the drain plug", use: "wrenches", scene: "scene-plug.webp", next: "scene-draining.webp", after: (s) => s.wait("Draining the old oil…", 1800) },
    { say: "Swap in the new oil filter", use: "filter", consume: "filter", scene: "scene-draining.webp", after: (s) => s.flash("svc-filter.webp") },
    { say: "Put the drain plug back in", use: "ratchet", scene: "scene-draining.webp", next: "scene-plug.webp", after: (s) => s.showPan(false) },
    { say: "Tap the oil cap to open it", tap: [0.6, 0.41, 0.18, 0.22], scene: "scene-engine-closed.webp", next: "scene-engine-open.webp" },
    { say: "Set the funnel in the fill hole", use: "funnel", scene: "scene-engine-open.webp", after: (s) => s.showFunnel(true) },
    { say: "HOLD the oil jug to pour", pour: true, use: "oil", consume: "oil", scene: "scene-engine-open.webp" },
    { say: "Wipe the dipstick with the blue rag", use: "ragblue", scene: "scene-engine-open.webp", after: (s) => s.dip("dip-clean.webp") },
    { say: "Tap CHECK DIPSTICK", check: true, scene: "scene-engine-open.webp" },
    { say: "Tap the oil cap to close it", tap: [0.6, 0.41, 0.18, 0.22], scene: "scene-engine-open.webp", next: "scene-engine-closed.webp", before: (s) => s.showFunnel(false) },
    { say: "Wipe up the spills with the red rag", use: "ragred", scene: "scene-engine-closed.webp" },
  ];
  // brake view: layered wheel / caliper / pads / bracket / rotor, toggled with classes on #sBrk
  const BK = (s, add, rem) => { const b = document.getElementById("sBrk"); (add || "").split(" ").filter(Boolean).forEach((c) => b.classList.add(c)); (rem || "").split(" ").filter(Boolean).forEach((c) => b.classList.remove(c)); };
  const BP = (n) => "brkp-" + n + ".webp"; // storyboard panels 1-11
  const BRAKE_STEPS = [
    { say: "Chock the rear wheels", use: "chock", scene: "car", after: (s) => s.label("Chocked. It won't roll.") },
    { say: "Raise the car with the floor jack", use: "jack", scene: "car", after: (s) => s.lift(true) },
    { say: "Remove the lug nuts with the impact gun", use: "impact", scene: BP(1), after: (s) => s.wait("BRRRAP! Zip, zip, zip…", 1000) },
    { say: "Pull the wheel off", act: "PULL THE WHEEL OFF", scene: BP(1), next: BP(2), after: (s) => s.label("Worn out! Rusty rotor and hub.") },
    { say: "Remove the caliper bolts", use: "ratchet", scene: BP(2) },
    { say: "Pry the caliper off", use: "prybar", scene: BP(2) },
    { say: "Unbolt the caliper bracket", use: "ratchet", scene: BP(2), next: BP(3), after: (s) => s.label("Caliper and bracket off. Rotor exposed.") },
    { say: "HOLD the piston compressor to push the piston back", use: "compressor", hold: 1400, scene: BP(3), holdText: "Squeezing… keep holding" },
    { say: "Pull out the old pads", act: "PULL OLD PADS", scene: BP(3), next: BP(4), after: (s) => s.label("Pads worn down to the metal!") },
    { say: "Knock the old rotor off with the mallet", use: "mallet", scene: BP(4), next: BP(5) },
    { say: "Spray the caliper and bracket with brake cleaner", use: "cleaner", scene: BP(5), next: BP(6), after: (s) => s.wait("Pssssht! Cleaning off the brake dust…", 1000) },
    { say: "Grease the caliper slide pins", use: "grease", scene: BP(6), after: (s) => s.label("Pins slide nice and smooth.") },
    { say: "HOLD the wire brush to clean the rust off the hub", use: "wirebrush", hold: 1400, scene: BP(7), holdText: "Scrubbing… keep holding" },
    { say: "Install the new rotor", use: "rotor", consume: "rotor", scene: BP(7), next: BP(8), after: (s) => s.label("Shiny new rotor!") },
    { say: "Snap the new pad clips into the bracket", use: "clips", consume: "clips", scene: BP(8) },
    { say: "Put pad lube on the back of the new pads", use: "padlube", scene: BP(8), after: (s) => s.label("No squeaks!") },
    { say: "Install the bracket with the new pads", use: "pads", consume: "pads", scene: BP(8), next: BP(9) },
    { say: "Bolt the caliper bracket on", use: "ratchet", scene: BP(9) },
    { say: "Slide the caliper over the new pads", act: "MOUNT CALIPER", scene: BP(9), next: BP(10) },
    { say: "Torque the caliper and bracket bolts", use: "torque", scene: BP(10), after: (s) => s.wait("Click! Torqued to spec.", 900) },
    { say: "Put the wheel on and run the lug nuts down", use: "impact", scene: BP(10), next: BP(11), after: (s) => s.wait("Snugging them down…", 800) },
    { say: "Lower the car", use: "jack", scene: "car", after: (s) => s.lift(false) },
    { say: "Torque the lug nuts in a star pattern", use: "torque", scene: "car", after: (s) => s.wait("Click… click… click… 100 ft-lb", 1100) },
    { say: "Pump the brake pedal 3 times", pump: 3, scene: "car" },
  ];

  const TS = { flat: "tire-flat.webp", brk: "tire-breaker.webp", mach: "tire-machine.webp", cone: "tire-cone.webp", pry: "tire-pry.webp", dirty: "tire-rim-dirty.webp", clean: "tire-rim-clean.webp", done: "tire-mounted.webp", bal: "tire-balancer.webp" };
  const TIRE_STEPS = [
    { say: "Take out the valve core to let the air out", use: "valvetool", scene: TS.flat, after: (s) => s.wait("Psssssss… air coming out", 1400) },
    { say: "Break the top bead with the bead breaker", use: "beadbreaker", scene: TS.flat, next: TS.brk, after: (s) => s.label("Pop! Top bead is loose.") },
    { say: "Flip it and break the bottom bead", use: "beadbreaker", scene: TS.brk, after: (s) => s.label("Both beads broken loose!") },
    { say: "Put the wheel on the tire machine", act: "PLACE WHEEL ON MACHINE", scene: TS.brk, next: TS.mach },
    { say: "Lock the hold-down in the center", act: "INSTALL HOLD-DOWN", scene: TS.mach, next: TS.cone },
    { say: "Move the arm onto the rim", act: "SWING ARM TO RIM", scene: TS.cone, after: (s) => s.label("Mount head is set on the rim edge.") },
    { say: "HOLD the tire bar to spin off the top bead", use: "tirebar", hold: 1600, scene: TS.pry, holdText: "Spinning… keep holding" },
    { say: "HOLD the tire bar to spin off the bottom bead", use: "tirebar", hold: 1600, scene: TS.pry, next: TS.dirty, holdText: "Spinning… keep holding", after: (s) => s.label("Old tire off. Look at that rust!") },
    { say: "HOLD the wire brush to clean the bead seats", use: "wirebrush", hold: 1500, scene: TS.dirty, next: TS.clean, holdText: "Scrubbing… keep holding", after: (s) => s.label("Bead seats are clean and shiny!") },
    { say: "Lube the rim and the new tire", use: "lube", scene: TS.clean, after: (s) => s.label("Slick! The beads will slide right on.") },
    { say: "HOLD the new tire to spin on the bottom bead", use: "newtire", consume: "newtire", hold: 1500, scene: TS.clean, next: TS.done, holdText: "Spinning on… keep holding" },
    { say: "HOLD the tire bar to spin on the top bead", use: "tirebar", hold: 1500, scene: TS.done, holdText: "Spinning on… keep holding" },
    { say: "HOLD the air hose to seat the beads", use: "airhose", hold: 1700, scene: TS.done, holdText: "Filling… keep holding", after: (s) => s.label("POP! POP! Both beads seated.") },
    { say: "Put the valve core back in", use: "valvetool", scene: TS.done },
    { say: "HOLD the air hose, let go at 35 PSI", use: "airhose", psi: 35, scene: TS.done },
    { say: "Mount the wheel on the balancer", act: "MOUNT ON BALANCER", scene: TS.done, next: TS.bal },
    { say: "Spin it for road force and balance", act: "SPIN BALANCER", scene: TS.bal, after: (s) => { s.wait("Road force & balance…", 1600); setTimeout(() => s.screen(s.bal.read), 1600); } },
    { say: "Hammer on the clip-on weight (outer)", use: "weighthammer", scene: TS.bal, sayFn: (s) => "Hammer on the " + s.bal.o + " oz clip-on weight (outer)", after: (s) => s.label("Clip-on weight tapped on.") },
    { say: "Stick on the inner weight", use: "weights", consume: "weights", scene: TS.bal, sayFn: (s) => "Stick on the " + s.bal.i + " oz weight (inner)", after: (s) => s.label("Stick-on weight pressed in place.") },
    { say: "Spin it again to recheck", act: "RECHECK BALANCE", scene: TS.bal, after: (s) => { s.screen(""); s.wait("Rechecking…", 1300); setTimeout(() => s.screen("OUT 0.00 oz\nIN 0.00 oz\nBALANCED ✓"), 1300); } },
  ];
  let S = null;
  function runJob(j) {
    for (const id of JOBS[j].needs) if (!has(id)) return showGarage();
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("service");
    let el = $("svc");
    if (!el) { el = document.createElement("div"); el.id = "svc"; document.body.append(el); }
    const steps = j === "oil" ? OIL_STEPS : j === "tire" ? TIRE_STEPS : BRAKE_STEPS, secs = JOBS[j].secs;
    const tools = JOBS[j].needs.slice().sort(() => Math.random() - 0.5);
    el.className = "";
    el.innerHTML = '<div class="sh"><div><b>' + JOBS[j].name + '</b><small id="sStep"></small></div><div id="sTime"></div></div><div class="bbar"><i id="sBar"></i></div>' +
      '<div class="sscene" id="sScene"><img id="sImg" alt=""><div id="sBrk"><i class="hub"></i><img class="rotor" src="brk-rotor.webp" alt=""><img class="bracket" src="brk-bracket.webp" alt=""><img class="clips" src="brk-clips.webp" alt=""><img class="pads" src="brk-pads.webp" alt=""><img class="caliper" src="brk-caliper.webp" alt=""><img class="wheel" src="brk-wheel.webp" alt=""></div><img id="sCar" class="scar" alt=""><img id="sJack" class="sjack" src="tool-floorjack.webp" alt=""><img id="sPan" class="span" src="svc-pan.webp" alt=""><img id="sFunnel" class="sfunnel" src="svc-funnel.webp" alt=""><img id="sDip" class="sdip" alt=""><div id="sTap" class="stap"></div><div id="sLabel" class="slabel"></div><div id="sMeter" class="smeter"><i></i><span>MAX</span><span>MIN</span></div><button id="sAct" class="sact"></button><div id="sWait" class="swait"><span></span><i></i></div><div id="sScreen" class="sscreen"></div><div id="sPsi" class="spsi"><b>0</b><small>PSI</small></div><div id="sHold" class="swait"><span></span><i></i></div></div>' +
      '<div class="stray"><div class="sl">TOOL BAG</div><div class="srow" id="sBag"></div><div class="sl">TOOL CART</div><div class="srow" id="sCartRow"></div></div>';
    // the brake job zooms in on a blue sedan with its wheel off, so start with that same sedan
    const carSrc = j === "oil" ? "car-" + (1 + (level % 7)) + ".webp" : "car-7.webp";
    $("sCar").src = carSrc;
    $("sScene").classList.toggle("floor", j === "tire");
    for (const id of tools) {
      const b = document.createElement("button");
      b.className = "stool"; b.dataset.id = id;
      b.innerHTML = '<img src="' + ITEMS[id].img + '" alt=""><em>' + ITEMS[id].name + "</em>";
      (ITEMS[id].kind === "tool" ? $("sBag") : $("sCartRow")).append(b);
    }
    let left = secs * 1000, last = performance.now(), over = false, raf = 0, i = -1, busy = false, mistakes = 0, oilLvl = 0, pouring = false, pumps = 0;
    let holding = null, holdP = 0, psi = 0;
    const amt = () => [0.25, 0.5, 0.75, 1.0, 1.25, 1.5][Math.floor(Math.random() * 6)].toFixed(2);
    const bal = { o: amt(), i: amt() };
    bal.read = "OUT " + bal.o + " oz\nIN " + bal.i + " oz\nROAD FORCE " + (10 + Math.floor(Math.random() * 12)) + " lb OK";
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
      bal,
      screen: (t) => {
        const sc = $("sScreen"), im = $("sImg"), box = $("sScene").getBoundingClientRect(), nw = im.naturalWidth || 540, nh = im.naturalHeight || 360;
        const k = Math.min(box.width / nw, box.height / nh), iw = nw * k, ih = nh * k, ox = (box.width - iw) / 2, oy = (box.height - ih) / 2;
        // the balancer's monitor sits at these fractions of the picture
        Object.assign(sc.style, { left: ox + iw * 0.195 + "px", top: oy + ih * 0.25 + "px", width: iw * 0.24 + "px", height: ih * 0.18 + "px" });
        sc.textContent = t; sc.classList.toggle("on", !!t); sc.classList.toggle("ok", t.includes("✓")); },
      wait: (t, ms) => { busy = true; const w = $("sWait"); w.querySelector("span").textContent = t; w.classList.add("on"); w.querySelector("i").style.transition = "none"; w.querySelector("i").style.transform = "scaleX(0)"; void w.offsetWidth; w.querySelector("i").style.transition = "transform " + ms + "ms linear"; w.querySelector("i").style.transform = "scaleX(1)"; setTimeout(() => { w.classList.remove("on"); busy = false; }, ms); },
    };
    function setScene(src) {
      const isCar = src === "car", isBrk = src === "brk";
      $("sScene").classList.toggle("carview", isCar); $("sScene").classList.toggle("brkview", isBrk);
      if (!isCar && !isBrk) $("sImg").src = src;
    }
    function nextStep() {
      i++;
      if (i >= steps.length) return finish(true);
      const st = steps[i];
      if (st.before) st.before(S);
      setScene(st.scene);
      $("sStep").textContent = "STEP " + (i + 1) + "/" + steps.length + ": " + (st.sayFn ? st.sayFn(S) : st.say);
      holding = null; holdP = 0; $("sHold").classList.remove("on");
      $("sPsi").classList.toggle("on", !!st.psi); if (st.psi) { psi = 0; psiUpd(); }
      if (st.scene !== TS.bal) S.screen("");
      const tap = $("sTap"), act = $("sAct"), meter = $("sMeter");
      tap.className = "stap"; act.className = "sact"; meter.classList.toggle("on", !!st.pour);
      if (st.tap) { const [x, y, w, h] = st.tap; Object.assign(tap.style, { left: x * 100 + "%", top: y * 100 + "%", width: w * 100 + "%", height: h * 100 + "%" }); tap.className = "stap on"; }
      if (st.check) { act.textContent = "CHECK DIPSTICK"; act.className = "sact on"; }
      if (st.pump) { pumps = 0; act.textContent = "PUMP BRAKE PEDAL"; act.className = "sact on"; }
      if (st.act) { act.textContent = st.act; act.className = "sact on"; }
      $("sDip").classList.toggle("on", !!st.check);
    }
    function done(st) {
      if (st.consume) { G.cart[st.consume] = Math.max(0, (G.cart[st.consume] || 0) - 1); save(); const b = el.querySelector('.stool[data-id="' + st.consume + '"]'); if (b) b.classList.add("used"); }
      sfx((window.TOOL_SFX && TOOL_SFX[st.use]) || (st.pump ? "pedal" : "ok")); if (st.use && window.TOOL_SFX && TOOL_SFX[st.use]) setTimeout(() => sfx("ok"), 380); buzz("light"); pop("✓", true);
      if (st.next) setScene(st.next);
      if (st.after) st.after(S);
      setTimeout(() => { const go = () => (busy ? setTimeout(go, 100) : nextStep()); go(); }, 350);
    }
    el.querySelectorAll(".stool").forEach((b) => {
      const id = b.dataset.id;
      const press = (e) => {
        e.preventDefault();
        if (over || busy || i < 0) return;
        const st = steps[i];
        if (st.pour && id === "oil") { pouring = true; b.classList.add("pouring"); return; }
        if ((st.hold || st.psi) && st.use === id) { holding = b; b.classList.add("pouring"); if (st.hold) { const h = $("sHold"); h.querySelector("span").textContent = st.holdText || "Keep holding…"; h.classList.add("on"); } return; }
        if (st.use === id && !st.pour) { busy = true; setTimeout(() => (busy = false), 360); done(st); }
        else if (b.classList.contains("used")) wrong("Already used!");
        else wrong(st.act ? "Tap the yellow button!" : st.tap || st.check || st.pump ? "Tap the " + (st.tap ? "oil cap" : "button") + "!" : "Wrong tool! -2s");
      };
      b.onpointerdown = press;
      const stop = () => {
        if (holding === b) {
          holding = null; b.classList.remove("pouring"); $("sHold").classList.remove("on");
          const st = steps[i];
          if (st && st.psi) {
            if (psi >= st.psi - 2 && psi <= st.psi + 2) { S.label(Math.round(psi) + " PSI. Right on spec!"); busy = true; setTimeout(() => (busy = false), 360); done(st); }
            else if (psi < st.psi - 2) S.label(Math.round(psi) + " PSI. Not enough, hold again!");
            else { wrong("TOO HIGH -2s"); S.label("Too much air! Letting some out…"); psi = 28; psiUpd(); }
          }
        }
        if (pouring) { pouring = false; b.classList.remove("pouring"); const st = steps[i]; if (st && st.pour && oilLvl >= 0.35) { busy = true; setTimeout(() => (busy = false), 360); done(st); } } };
      b.onpointerup = stop; b.onpointerleave = stop; b.onpointercancel = stop;
    });
    $("sTap").onpointerdown = (e) => { e.preventDefault(); if (over || busy) return; const st = steps[i]; if (st && st.tap) { $("sTap").className = "stap"; busy = true; setTimeout(() => (busy = false), 360); done(st); } };
    $("sScene").onpointerdown = (e) => { if (e.target.id === "sScene" || e.target.id === "sImg" || e.target.id === "sCar") { const st = steps[i]; if (st && st.tap && !over && !busy) wrong("Not there! Find the oil cap"); } };
    $("sAct").onpointerdown = (e) => {
      e.preventDefault(); if (over || busy) return;
      const st = steps[i];
      if (st.act) { $("sAct").className = "sact"; done(st); return; }
      if (st.pump) { pumps++; sfx("pedal"); buzz("medium"); pop("PUMP " + pumps, true); if (pumps >= st.pump) { $("sAct").className = "sact"; done(st); } return; }
      if (!st.check) return;
      const full = oilLvl >= 0.7 && oilLvl <= 0.9;
      S.dip(oilLvl < 0.7 ? "dip-low.webp" : "dip-full.webp");
      if (full) { S.label("Oil level is right in the safe zone!"); $("sAct").className = "sact"; done(st); }
      else if (oilLvl < 0.7) { S.label("Too low! Pour a little more."); wrong("LOW -2s"); setTimeout(() => { i = OIL_STEPS.findIndex((x) => x.pour) - 1; nextStep(); }, 900); }
      else { S.label("Overfilled! Draining some out…"); wrong("OVERFILLED -2s"); oilLvl = 0.8; meterUpd(); S.wait("Draining the extra oil…", 1500); setTimeout(() => { $("sAct").className = "sact"; done(st); }, 1600); }
    };
    function psiUpd() { const p = $("sPsi"); p.querySelector("b").textContent = Math.floor(psi); p.classList.toggle("ok", psi >= 33 && psi <= 37); p.classList.toggle("hi", psi > 37); }
    const meterUpd = () => { $("sMeter").querySelector("i").style.transform = "scaleY(" + Math.min(1, oilLvl) + ")"; $("sMeter").classList.toggle("over", oilLvl > 0.9); };
    const loop = (now) => {
      if (over) return;
      const dt = Math.min(100, now - last); last = now; left -= dt;
      if (pouring) { oilLvl = Math.min(1.05, oilLvl + dt / 3200); meterUpd(); }
      if (holding && !busy) {
        const st = steps[i];
        if (st && st.hold) { holdP += dt / st.hold; $("sHold").querySelector("i").style.transform = "scaleX(" + Math.min(1, holdP) + ")"; if (holdP >= 1) { holding.classList.remove("pouring"); holding = null; $("sHold").classList.remove("on"); busy = true; setTimeout(() => (busy = false), 360); done(st); } }
        else if (st && st.psi) { psi += dt * 0.014; psiUpd(); if (psi > st.psi + 12) { holding.classList.remove("pouring"); holding = null; wrong("TOO HIGH -2s"); S.label("Way too much! Letting some out…"); psi = 28; psiUpd(); } }
      }
      if (left <= 0) { left = 0; upd(); sfx("hit"); buzz("heavy"); return finish(false); }
      upd(); raf = requestAnimationFrame(loop);
    };
    function finish(won) {
      if (over) return;
      over = true; cancelAnimationFrame(raf); stopMusic();
      if (won) { sfx("win"); buzz("success"); el.classList.add("won"); }
      setTimeout(() => {
        el.className = "hidden";
        const t = Math.ceil(left / 1000);
        let desc;
        if (won) {
          G.done[j] = (G.done[j] || 0) + 1; save();
          const coinsWon = (j === "oil" ? 120 : j === "tire" ? 150 : 100) + t * 3 - mistakes * 5, pts = 2000 + t * 100;
          totalCoins += Math.max(40, coinsWon); totalScore += pts;
          localStorage.setItem("tenmm-coins", totalCoins); localStorage.setItem("tenmm-score", totalScore);
          desc = JOBS[j].short + " done with " + t + "s left" + (mistakes ? " (" + mistakes + " wrong tool" + (mistakes > 1 ? "s" : "") + ")" : ", no mistakes!") + " +" + Math.max(40, coinsWon) + " coins • +" + pts + " points. " +
            "Your tools stay in the bag. Grab more " + JOBS[j].needs.filter((id) => ITEMS[id].kind === "part").map((id) => ITEMS[id].name.toLowerCase()).join(" and ") + " in the levels to do it again.";
        } else {
          desc = "Time's up! The customer is still waiting. Your parts were " + (i > 3 ? "partly used, so grab new ones in the levels." : "saved, so try again from the Service Bay.");
          if (i <= 3) for (const st of steps.slice(0, i + 1)) if (st.consume) { G.cart[st.consume] = (G.cart[st.consume] || 0) + 1; save(); }
        }
        popup(won ? "JOB DONE!" : "TIME'S UP!", desc, "SERVICE BAY", showGarage, won ? "win" : "toolbox");
        $("eyebrow").textContent = JOBS[j].name;
        $("menuSettings").style.display = ""; $("menuSettings").textContent = "MAIN MENU"; $("menuSettings").onclick = showMenu;
      }, won ? 1100 : 700);
    }
    upd(); raf = requestAnimationFrame(loop);
    nextStep();
  }

  window.Service = { G, ready, missing, showGarage, runJob, addItem, ITEMS, JOBS, TIRE_STEPS, BRAKE_STEPS };
})();
