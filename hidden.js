// Where's My 10MM?! — hidden-object bonus round.
// A big scene of the current location packed with the game's tools and parts.
// Find everything on the list (the 10mm is always on it). Drag to look around, pinch to zoom.
"use strict";
(() => {
  const ART = {
    wrench: "tool-wrench.webp", ratchet: "tool-ratchet.webp", phillips: "tool-phillips.webp", flathead: "tool-flathead.webp",
    prybar: "tool-prybar.webp", bolt: "tool-bolt.webp", nut: "tool-nut.webp", screw: "tool-screw.webp", meter: "tool-meter.webp",
    flashlight: "tool-flashlight.webp", jack: "tool-jack.webp", floorjack: "tool-floorjack.webp", drainpan: "tool-drainpan.webp",
    cone: "tool-cone.webp", tire: "tool-tire.webp", wetsign: "tool-wetsign.webp", ball: "tool-ball.webp",
    gloves: "svc-gloves.webp", funnel: "svc-funnel.webp", filter: "svc-filter.webp", oiljug: "svc-oil-full.webp",
    ragblue: "svc-rag-blue.webp", ragred: "svc-rag-red.webp", flexratchet: "svc-ratchet.webp", wrenches: "svc-wrenches.webp",
    brakes: "svc-brakes-new.webp", lugwrench: "svc-lugwrench.webp", piston: "svc-piston.webp", pan: "svc-pan.webp", oilcan: "power-oil.webp", torque: "power-rocket.webp",
    shield: "power-shield.webp", stopwatch: "power-slow.webp", spring: "power-spring.webp", magnet: "power-magnet.webp", coin: "coin.webp",
    d8: "socket-decoy-8.webp", d9: "socket-decoy-9.webp", d11: "socket-decoy-11.webp", d12: "socket-decoy-12.webp", d13: "socket-decoy-13.webp", d14: "socket-decoy-14.webp",
  };
  const NAMES = {
    wrench: "Wrench", ratchet: "Ratchet", phillips: "Phillips screwdriver", flathead: "Flathead", prybar: "Pry bar", bolt: "Bolt", nut: "Nut", screw: "Screw",
    meter: "Multimeter", flashlight: "Flashlight", jack: "Bottle jack", floorjack: "Floor jack", drainpan: "Drain pan", cone: "Cone", tire: "Tire", wetsign: "Wet floor sign",
    ball: "Basketball", gloves: "Gloves", funnel: "Funnel", filter: "Oil filter", oiljug: "Oil jug", ragblue: "Blue rag", ragred: "Red rag", flexratchet: "Flex ratchet",
    wrenches: "Wrench set", brakes: "Brake rotor", lugwrench: "Lug wrench", piston: "Piston tool", pan: "Spill pan", oilcan: "Penetrating oil", torque: "Torque rocket", shield: "Shield", stopwatch: "Stopwatch",
    spring: "Spring", magnet: "Magnet", coin: "Coin",
  };
  const SIZE = { tire: 1.25, floorjack: 1.5, cone: 1.1, wetsign: 1.15, brakes: 1.3, oiljug: 1.05, pan: 1.3, drainpan: 1.3, nut: 0.6, bolt: 0.7, screw: 0.7, coin: 0.55, wrenches: 1.1 };
  const findable = Object.keys(NAMES);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  window.runHiddenIntro = function (done) {
    const n = level / 10, secs = Math.max(40, 70 - n * 2), finds = n < 8 ? 4 : n < 15 ? 5 : 6;
    popup("BONUS ROUND!", "HIDDEN 10MM: the 10mm and " + (finds - 1) + " other items are hidden in this scene. Find them all in " + secs + " seconds! Drag to look around and pinch to zoom.", "START", () => runHidden(done, secs, finds), "toolbox");
    $("eyebrow").textContent = "BONUS ROUND " + n + " OF 20";
  };

  function runHidden(done, secs, finds) {
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    let el = $("hid");
    if (!el) { el = document.createElement("div"); el.id = "hid"; document.body.append(el); }
    el.className = "";
    el.innerHTML = '<div class="bhead"><div>HIDDEN 10MM<small>Find every item on the list</small></div><div id="hTime">0</div></div><div class="bbar"><i id="hBar"></i></div>' +
      '<div class="hview" id="hView"><div class="hworld" id="hWorld"></div><div class="hzoom">Pinch to zoom</div></div><div class="hlist" id="hList"></div>';
    const view = $("hView"), world = $("hWorld");
    const others = findable.slice().sort(() => Math.random() - 0.5).slice(0, finds - 1);
    const want = ["ten", ...others];
    const list = $("hList"), slotsByKey = {};
    want.forEach((k) => {
      const d = document.createElement("div");
      d.innerHTML = '<img src="' + (k === "ten" ? "socket-find-10.webp" : ART[k]) + '" alt=""><em>' + (k === "ten" ? "10MM SOCKET" : NAMES[k]) + "</em>";
      if (k === "ten") d.className = "ten";
      slotsByKey[k] = d; list.append(d);
    });
    const hb = document.createElement("button"); hb.id = "hHint"; hb.textContent = "HINT -5s"; list.append(hb);
    const key = themeOf(level).key, n = Math.round(level / 10);
    const bgSrc = "ho-" + ({ junkyard: "junkyard", partsstore: "partsstore", pitlane: "pitlane" }[key] || ["garage", "garage2", "garage3"][n % 3]) + ".jpg";
    const VH = view.clientHeight, VW = view.clientWidth;
    // the scene is the location art, full height of the view and wider than the screen
    const H0 = VH, W0 = Math.max(VW * 1.4, H0 * 1.5);
    world.style.cssText = "width:" + W0 + "px;height:" + H0 + "px;background:url(" + bgSrc + ") center/cover";
    const base = H0 * 0.072;

    // what to find
    const clutterKinds = Object.keys(ART).filter((k) => !others.includes(k));
    const items = [];
    const cols = Math.ceil(Math.sqrt((W0 / H0) * 260)), rows = Math.ceil(260 / cols), cw = W0 / cols, ch = H0 / rows, slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([(c + 0.5) * cw, (r + 0.5) * ch]);
    slots.sort(() => Math.random() - 0.5);
    const add = (key, src, mul) => {
      const s = slots.length ? slots.pop() : [rnd(0, W0), rnd(0, H0)];
      const w = base * mul * (SIZE[key] || 1) * rnd(0.85, 1.15);
      const x = Math.max(4, Math.min(W0 - w - 4, s[0] - w / 2 + rnd(-0.35, 0.35) * cw)), y = Math.max(4, Math.min(H0 - w - 4, s[1] - w / 2 + rnd(-0.35, 0.35) * ch));
      const im = document.createElement("img");
      im.src = src; im.alt = ""; im.draggable = false;
      const rot = rnd(-40, 40) * (["tire", "cone", "wetsign", "floorjack", "oiljug"].includes(key) ? 0.3 : 1);
      im.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + w + "px;transform:rotate(" + rot + "deg);filter:drop-shadow(1px 2px 2px #000a) brightness(" + rnd(0.82, 1).toFixed(2) + ")";
      const it = { key, im, x, y, w, h: w, z: 0 };
      im.onload = () => { it.h = (w * im.naturalHeight) / im.naturalWidth; };
      items.push(it); return it;
    };
    const targets = want.map((k) => add(k, k === "ten" ? "socket-find-10.webp" : ART[k], k === "ten" ? 0.5 : 0.75));
    targets.forEach((t) => (t.find = true));
    const clutter = Math.min(240, 170 + level / 3);
    for (let i = 0; i < clutter; i++) { const k = pick(clutterKinds); add(k, ART[k], k.startsWith("d") ? 0.5 : 0.75); }
    items.sort(() => Math.random() - 0.5).forEach((it, i) => (it.z = i + 1));
    // a found item must stay findable: nothing may cover its middle
    for (const t of targets) {
      const cx = t.x + t.w / 2, cy = t.y + t.w / 2;
      for (const it of items) if (it !== t && it.z > t.z && cx > it.x + it.w * 0.2 && cx < it.x + it.w * 0.8 && cy > it.y + it.w * 0.2 && cy < it.y + it.w * 0.8) it.z = Math.max(0, t.z - 1);
    }
    for (const it of items) { it.im.style.zIndex = it.z; world.append(it.im); }

    targets.forEach((t) => (t.slot = slotsByKey[t.key]));

    // pan + pinch zoom
    let sc = 1, tx = -(W0 - VW) / 2, ty = 0;
    const MAXS = 3;
    const clamp = () => { const VW = view.clientWidth, VH = view.clientHeight; tx = Math.min(0, Math.max(VW - W0 * sc, tx)); ty = Math.min(0, Math.max(VH - H0 * sc, ty)); };
    const apply = () => { clamp(); world.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + sc + ")"; };
    apply();
    const pts = new Map();
    let moved = 0, downAt = 0, pinch = null;
    const local = (e) => { const r = view.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    view.onpointerdown = (e) => {
      if (e.target.id === "hHint") return;
      e.preventDefault(); view.setPointerCapture && view.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) { moved = 0; downAt = performance.now(); }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: sc, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, tx, ty }; moved = 99; }
    };
    view.onpointermove = (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = local(e);
      pts.set(e.pointerId, cur);
      if (pts.size === 1 && !pinch) { tx += cur[0] - prev[0]; ty += cur[1] - prev[1]; moved += Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]); apply(); }
      else if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const ns = Math.max(1, Math.min(MAXS, (pinch.s * d) / pinch.d));
        const wx = (pinch.mx - pinch.tx) / pinch.s, wy = (pinch.my - pinch.ty) / pinch.s;
        sc = ns; tx = pinch.mx - wx * sc; ty = pinch.my - wy * sc; apply();
      }
    };
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0 && moved < 10 && performance.now() - downAt < 600) tapAt(p[0], p[1]);
    };
    view.onpointerup = up; view.onpointercancel = (e) => { pts.delete(e.pointerId); pinch = null; };
    view.addEventListener("wheel", (e) => { e.preventDefault(); const [mx, my] = local(e), wx = (mx - tx) / sc, wy = (my - ty) / sc; sc = Math.max(1, Math.min(MAXS, sc * (e.deltaY < 0 ? 1.15 : 0.87))); tx = mx - wx * sc; ty = my - wy * sc; apply(); }, { passive: false });

    let left = secs * 1000, last = performance.now(), over = false, raf = 0, found = 0;
    const upd = () => { $("hTime").textContent = (left / 1000).toFixed(1); $("hTime").className = left < 8000 ? "low" : ""; $("hBar").style.transform = "scaleX(" + Math.max(0, left / (secs * 1000)) + ")"; };
    const pop = (x, y, txt, good) => { const p = document.createElement("div"); p.className = "bpop" + (good ? " good" : ""); p.textContent = txt; p.style.left = Math.max(4, Math.min(VW - 150, x - 30)) + "px"; p.style.top = y - 30 + "px"; view.append(p); setTimeout(() => p.remove(), 800); };
    function tapAt(vx, vy) {
      if (over) return;
      const wx = (vx - tx) / sc, wy = (vy - ty) / sc, minR = 24 / sc;
      let hit = null;
      for (const t of targets) {
        if (t.done) continue;
        const cx = t.x + t.w / 2, cy = t.y + t.h / 2, r = Math.max(minR, Math.max(t.w, t.h) * 0.55);
        if ((wx - cx) ** 2 + (wy - cy) ** 2 < r * r) { hit = t; break; }
      }
      if (hit) {
        hit.done = true; found++;
        sfx(found === targets.length ? "win" : "power"); buzz("success");
        pop(vx, vy, hit.key === "ten" ? "THE 10MM!" : "FOUND!", true);
        hit.im.classList.remove("hhint"); hit.im.classList.add("hfound"); hit.slot.classList.add("got");
        if (found === targets.length) finish(true);
      } else { left -= 1000; sfx("miss"); buzz("light"); pop(vx, vy, "-1s"); }
    }
    $("hHint").onclick = () => {
      if (over) return;
      const t = targets.find((x) => !x.done);
      if (!t) return;
      left -= 5000; sfx("grab");
      // bring it into view and pulse it
      sc = Math.max(sc, 1.6); tx = VW / 2 - (t.x + t.w / 2) * sc; ty = VH / 2 - (t.y + t.h / 2) * sc; world.style.transition = "transform .4s"; apply();
      setTimeout(() => (world.style.transition = ""), 420);
      world.querySelectorAll(".hhint").forEach((x) => x.classList.remove("hhint")); void t.im.offsetWidth; t.im.classList.add("hhint");
    };
    const loop = (now) => { if (over) return; left -= Math.min(100, now - last); last = now; if (left <= 0) { left = 0; upd(); sfx("hit"); buzz("heavy"); return finish(false); } upd(); raf = requestAnimationFrame(loop); };
    function finish(won) {
      if (over) return;
      over = true; cancelAnimationFrame(raf); stopMusic();
      if (!won) targets.filter((t) => !t.done).forEach((t) => t.im.classList.add("hhint"));
      setTimeout(() => { el.className = "hidden"; bonusResult(won, left / 1000, done); }, won ? 1200 : 1600);
    }
    upd(); raf = requestAnimationFrame(loop);
  }
})();
