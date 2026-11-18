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
    filter: { name: "Oil filter", img: "svc-filter.webp", kind: "part" },
    oil: { name: "Jug of motor oil", img: "svc-oil-full.webp", kind: "part" },
    brakes: { name: "Rotor & brake pads", img: "svc-brakes-new.webp", kind: "part" },
  };
  const JOBS = {
    oil: { name: "OIL CHANGE", short: "Oil change", needs: ["gloves", "pan", "wrenches", "filter", "ratchet", "funnel", "oil", "ragblue", "ragred"], secs: 60 },
    brake: { name: "FRONT BRAKE JOB", short: "Brake job", needs: ["gloves", "jack", "lugwrench", "ratchet", "piston", "brakes"], secs: 50 },
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
    { say: "PISTON TOOL: Retract the caliper piston", use: "piston", scene: "svc-brakes-worn.webp", after: (s) => s.label("Piston retracted for the new pads.") },
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
    const carSrc = "svc-car-jack.webp";
    $("sCar").src = carSrc;
    for (const id of tools) {
      const b = document.createElement("button");
      b.className = "stool"; b.dataset.id = id;
      b.innerHTML = '<img src="' + ITEMS[id].img + '" alt=""><em>' + ITEMS[id].name + "</em>";
      (ITEMS[id].kind === "tool" ? $("sBag") : $("sCartRow")).append(b);
    }
    let left = secs * 1000, last = performance.now(), over = false, raf = 0, i = -1, busy = false, mistakes = 0, oilLvl = 0, pouring = false, pumps = 0;
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
      tap.className = "stap"; act.className = "sact"; meter.classList.toggle("on", !!st.pour);
      if (st.tap) { const [x, y, w, h] = st.tap; Object.assign(tap.style, { left: x * 100 + "%", top: y * 100 + "%", width: w * 100 + "%", height: h * 100 + "%" }); tap.className = "stap on"; }
      if (st.check) { act.textContent = "CHECK DIPSTICK"; act.className = "sact on"; }
      if (st.pump) { pumps = 0; act.textContent = "PUMP BRAKE PEDAL"; act.className = "sact on"; }
      $("sDip").classList.toggle("on", !!st.check);
    }
    function done(st) {
      if (st.consume && !window.__pr98Testing) { G.cart[st.consume] = Math.max(0, (G.cart[st.consume] || 0) - 1); save(); const b = el.querySelector('.stool[data-id="' + st.consume + '"]'); if (b) b.classList.add("used"); }
      sfx("power"); buzz("light"); pop("✓", true);
      if (st.next) setScene(st.next);
      if (st.after) st.after(S);
      setTimeout(() => { const go = () => { if (over) return; if (busy) setTimeout(go, 100); else nextStep(); }; go(); }, 350);
    }
    el.querySelectorAll(".stool").forEach((b) => {
      const id = b.dataset.id;
      const press = (e) => {
        e.preventDefault();
        if (over || busy || i < 0) return;
        const st = steps[i];
        if (st.pour && id === "oil") { busy = true; pouring = false; oilLvl = 0.8; meterUpd(); b.classList.add("pouring"); S.wait("Adding the correct amount of fresh oil…", 1300); setTimeout(() => { b.classList.remove("pouring"); done(st); }, 1350); return; }
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
      over = true; cancelAnimationFrame(raf); stopMusic();
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
