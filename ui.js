// Where's My 10MM?! — screens: bonus round, home, ready card, web audio/haptics, toast
const BONUS_AR = {
    wrench: 0.43,
    ratchet: 0.44,
    phillips: 1.3,
    flathead: 1.44,
    prybar: 0.43,
    bolt: 0.94,
    nut: 0.93,
    screw: 1.34,
    meter: 0.9,
    flashlight: 0.42,
    evilsocket: 0.89,
  },
  BONUS_TOOLS = Object.keys(BONUS_AR),
  BONUS_DECOYS = [8, 9, 11, 12, 13, 14];
let bonus = null;
function bonusIntro(done) {
  const n = level / 10,
    secs = Math.max(10, 20 - n);
  popup(
    "BONUS ROUND!",
    "The 10mm is hiding in a messy tool drawer. Find it in " +
      secs +
      " seconds! Other sockets look alike, so check the size. Wrong taps cost time.",
    "START",
    () => runBonus(done),
    "toolbox",
  );
  $("eyebrow").textContent = "BONUS ROUND " + n + " OF " + MAX_LEVEL / 10;
}
function bonusRand(a, b) {
  return a + Math.random() * (b - a);
}
function runBonus(done) {
  hidePanels();
  $("overlay").classList.add("hidden");
  stopMusic();
  state = "bonus";
  startMusic("bonus");
  const n = level / 10,
    secs = Math.max(10, 20 - n),
    count = Math.min(46, 28 + 2 * n),
    decoys = Math.min(14, 3 + n);
  const box = $("bonus"),
    dr = $("drawer");
  box.classList.remove("hidden");
  dr.innerHTML = "";
  dr.className = "drawer";
  const W = dr.clientWidth,
    H = dr.clientHeight,
    cols = W > H ? 6 : 4,
    rows = Math.ceil(count / cols),
    cw = W / cols,
    ch = H / rows,
    base = Math.max(52, Math.min(cw * 1.05, ch * 1.6)),
    items = [],
    slots = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) slots.push([(c + 0.5) * cw, (r + 0.5) * ch]);
  const add = (src, kind, w, ar) => {
    const im = document.createElement("img");
    im.src = src;
    im.alt = "";
    im.draggable = false;
    const h = w * ar;
    const c = slots.length
        ? slots.splice(Math.floor(Math.random() * slots.length), 1)[0]
        : [bonusRand(0, W), bonusRand(0, H)],
      x = Math.max(
        2,
        Math.min(W - w - 2, c[0] - w / 2 + bonusRand(-0.3, 0.3) * cw),
      ),
      y = Math.max(
        2,
        Math.min(H - h - 2, c[1] - h / 2 + bonusRand(-0.3, 0.3) * ch),
      ),
      r = kind === "tool" ? bonusRand(-170, 170) : bonusRand(-45, 45);
    im.style.cssText =
      "left:" +
      x +
      "px;top:" +
      y +
      "px;width:" +
      w +
      "px;transform:rotate(" +
      r +
      "deg)";
    const it = { im, kind, x, y, w, h, z: 0 };
    items.push(it);
    return it;
  };
  for (let i = 0; i < count - decoys; i++) {
    const t = BONUS_TOOLS[Math.floor(Math.random() * BONUS_TOOLS.length)];
    add(
      "tool-" + t + ".webp",
      "tool",
      (base * bonusRand(0.95, 1.3) * 0.78) / Math.sqrt(BONUS_AR[t]),
      BONUS_AR[t],
    );
  }
  for (let i = 0; i < decoys; i++) {
    add(
      "socket-decoy-" + BONUS_DECOYS[i % BONUS_DECOYS.length] + ".webp",
      "decoy",
      base * bonusRand(0.46, 0.58),
      1.2,
    );
  }
  const target = add(
    "socket-find-10.webp",
    "target",
    base * bonusRand(0.46, 0.58),
    1.2,
  );
  items.sort(() => Math.random() - 0.5);
  items.forEach((it, i) => {
    it.z = i + 1;
  });
  // keep the 10mm findable: nothing may sit on top of its middle
  const cx = target.x + target.w / 2,
    cy = target.y + target.h / 2;
  const tx0 = target.x + target.w * 0.38,
    tx1 = target.x + target.w * 0.62,
    ty0 = target.y + target.h * 0.4,
    ty1 = target.y + target.h * 0.6;
  for (const it of items)
    if (
      it !== target &&
      it.z > target.z &&
      it.x + it.w * 0.15 < tx1 &&
      it.x + it.w * 0.85 > tx0 &&
      it.y + it.h * 0.15 < ty1 &&
      it.y + it.h * 0.85 > ty0
    )
      it.z = Math.max(0, target.z - 1);
  for (const it of items) {
    it.im.style.zIndex = it.z;
    dr.append(it.im);
  }
  let left = secs * 1000,
    last = performance.now(),
    over = false;
  const pop = (x, y, txt, good) => {
    const p = document.createElement("div");
    p.className = "bpop" + (good ? " good" : "");
    p.textContent = txt;
    p.style.left = Math.max(4, Math.min(W - 150, x - 20)) + "px";
    p.style.top = y - 30 + "px";
    dr.append(p);
    setTimeout(() => p.remove(), 800);
  };
  const finish = (won) => {
    if (over) return;
    over = true;
    stopMusic();
    cancelAnimationFrame(bonus && bonus.raf);
    dr.onpointerdown = null;
    if (won) {
      target.im.classList.add("bfound");
      target.im.style.zIndex = 998;
    }
    setTimeout(
      () => {
        box.classList.add("hidden");
        bonusResult(won, left / 1000, done);
      },
      won ? 1300 : 900,
    );
  };
  dr.onpointerdown = (e) => {
    if (over) return;
    e.preventDefault();
    const r = dr.getBoundingClientRect(),
      x = e.clientX - r.left - dr.clientLeft,
      y = e.clientY - r.top - dr.clientTop;
    const tdx = x - (target.x + target.w / 2),
      tdy = y - (target.y + target.h / 2);
    if (tdx * tdx + tdy * tdy < (Math.max(target.w, target.h) * 0.62) ** 2) {
      sfx("win");
      buzz("success");
      pop(x, y, "FOUND IT!", true);
      finish(true);
      return;
    }
    let hit = null;
    for (const it of items)
      if (
        x > it.x &&
        x < it.x + it.w &&
        y > it.y &&
        y < it.y + it.h &&
        (!hit || it.z > hit.z)
      )
        hit = it;
    const pen = hit && hit.kind === "decoy" ? 2000 : 1000;
    left -= pen;
    sfx("miss");
    buzz("medium");
    pop(
      x,
      y,
      (hit && hit.kind === "decoy" ? "WRONG SIZE " : "") +
        "-" +
        pen / 1000 +
        "s",
    );
    dr.classList.remove("shake");
    void dr.offsetWidth;
    dr.classList.add("shake");
  };
  const tickB = (now) => {
    if (over) return;
    left -= Math.min(100, now - last);
    last = now;
    if (left <= 0) {
      left = 0;
      upd();
      sfx("hit");
      buzz("heavy");
      finish(false);
      return;
    }
    upd();
    bonus.raf = requestAnimationFrame(tickB);
  };
  const upd = () => {
    $("bTime").textContent = (left / 1000).toFixed(1);
    $("bTime").className = left < 4000 ? "low" : "";
    $("bBar").style.transform =
      "scaleX(" + Math.max(0, left / (secs * 1000)) + ")";
  };
  bonus = { raf: 0 };
  upd();
  last = performance.now();
  bonus.raf = requestAnimationFrame(tickB);
}
function bonusResult(won, t, done) {
  let desc,
    art = "toolbox";
  if (won) {
    const coinsWon = 10 + Math.ceil(t) * 2,
      pts = 1000 + Math.round(t * 100);
    totalCoins += coinsWon;
    totalScore += pts;
    localStorage.setItem("tenmm-coins", totalCoins);
    localStorage.setItem("tenmm-score", totalScore);
    $("coinsCount").textContent = totalCoins;
    $("scoreCount").textContent = totalScore;
    desc =
      "Found with " +
      t.toFixed(1) +
      "s left! +" +
      coinsWon +
      " coins • +" +
      pts +
      " points.";
    let doneList = [];
    try {
      doneList = JSON.parse(localStorage.getItem("tenmm-bonus-done") || "[]");
    } catch (e) {}
    if (!doneList.includes(level)) {
      doneList.push(level);
      localStorage.setItem("tenmm-bonus-done", JSON.stringify(doneList));
      const wins = doneList.length,
        own = ownedSkins();
      for (const sk of SKINS)
        if (sk.bonus && wins >= sk.bonus && !own.includes(sk.id)) {
          own.push(sk.id);
          localStorage.setItem("tenmm-skins", JSON.stringify(own));
          desc +=
            " NEW FINISH UNLOCKED: " +
            sk.name +
            "! Equip it in the Socket Shop.";
          art = "hero";
        }
      const nextSk = SKINS.find((sk) => sk.bonus && wins < sk.bonus);
      if (nextSk && art !== "hero")
        desc +=
          " Bonus wins: " +
          wins +
          "/" +
          nextSk.bonus +
          " for " +
          nextSk.name +
          ".";
    }
  } else
    desc =
      "Time ran out! The 10mm got away this time. Keep going to reach the next bonus round.";
  popup(
    won ? "FOUND IT!" : "TIME'S UP!",
    desc,
    level === MAX_LEVEL ? "PLAY AGAIN" : "NEXT LEVEL",
    done,
    won ? (art === "hero" ? "hero" : "win") : "toolbox",
  );
  $("eyebrow").textContent = "BONUS ROUND " + level / 10 + " OF " + MAX_LEVEL / 10;
}

let homeTimers = [];
function hideHome() {
  const h = document.getElementById("home");
  if (h) h.className = "hidden";
  homeTimers.forEach(clearTimeout);
  homeTimers = [];
}
function showHome(intro) {
  const h = $("home");
  homeTimers.forEach(clearTimeout);
  homeTimers = [];
  const skin = skinSrc();
  h.querySelectorAll(".hposter img,.hfly,.hhero").forEach(
    (im) => (im.src = skin),
  );
  let bw = 0;
  try {
    bw = JSON.parse(localStorage.getItem("tenmm-bonus-done") || "[]").length;
  } catch (e) {}
  $("hCoins").textContent = totalCoins;
  $("hBest").textContent = best;
  $("hStars").textContent = window.Feature ? Feature.starsTotal() : 0;
  const v = (document.querySelector("header small") || {}).textContent || "";
  $("hVer").textContent = (v.split("•")[1] || "").trim();
  const lv = Math.max(best, level);
  $("hPlay").textContent = best > 1 ? "CONTINUE • LEVEL " + lv : "PLAY";
  const run = (fn) => () => {
    audioReady();
    stopMusic();
    hideHome();
    fn();
  };
  $("hPlay").onclick = run(() => {
    level = lv;
    if (!storySeen) showStory();
    else if (!tutorialSeen) showTutorial();
    else start();
  });
  $("hLevels").onclick = run(showLevels);
  const lb = $("hLost");
  if (lb && window.LostBox) {
    let ls = {}; try { ls = JSON.parse(localStorage.getItem("tenmm-lt") || "{}"); } catch (e) {}
    const d = (ls.done || []).length;
    $("hLostSub").textContent = ls.golden ? "Golden 10MM earned! Replay any drawer" : d ? d + " of " + ((window.LT_LEVELS || []).length || 10) + " drawers cleared" : "NEW! 15-drawer platform adventure";
    lb.onclick = () => { audioReady(); stopMusic(); window.LostBox.open(); };
  }
  $("hShop").onclick = run(() => showShop("shop"));
  if ($("hGarage")) $("hGarage").onclick = run(() => showShop("garage"));
  $("hSettings").onclick = run(showSettings);
  $("hHow").onclick = run(showTutorial);
  if (window.Feature) {
    const dd = Feature.isDailyDone(), ds = Feature.dailyState();
    $("hDaily").className = dd ? "done" : "";
    $("hDailySub").textContent = dd ? "Done! Streak " + ds.streak + " • back tomorrow" : ds.streak && ds.last === Feature.today() - 1 ? "Keep your " + ds.streak + "-day streak!" : "Today: " + Feature.twistOfDay().name;
    $("hDaily").onclick = run(Feature.startDaily);
    const el = best >= 26;
    $("hEndless").className = el ? "" : "locked";
    $("hEndlessSub").textContent = el ? "Best: " + Feature.endlessBest() + " m" : "Beat level 25 to unlock";
    $("hEndless").onclick = el ? run(Feature.startEndless) : () => toast("Beat level 25 to unlock Endless mode!", false);
    $("hUpg").onclick = run(Feature.showUpgrades);
    $("hShare").onclick = () => Feature.share("level", best);
    $("hGC").style.display = window.GC && GC.on ? "" : "none";
    $("hGC").onclick = () => GC.show("leaderboards");
  }
  $("overlay").classList.add("hidden");
  const toHome = () => {
    h.onpointerdown = null;
    h.className = "home";
    startMusic("title");
    if (window.Feature) Feature.giftCheck();
  };
  if (!intro) {
    toHome();
    return;
  }
  h.className = "intro";
  $("hTap").classList.remove("on");
  const at = (ms, f) => homeTimers.push(setTimeout(f, ms));
  at(650, () => {
    h.classList.add("t2");
    sfx("flap");
  });
  at(1350, () => sfx("grab"));
  at(2000, () => {
    h.classList.add("t1");
    sfx("win");
    buzz("light");
  });
  at(2600, () => $("hTap").classList.add("on"));
  h.onpointerdown = (e) => {
    e.preventDefault();
    audioReady();
    startMusic("title");
    if (!h.classList.contains("t1")) {
      h.classList.add("t1", "t2");
      homeTimers.forEach(clearTimeout);
      homeTimers = [];
      $("hTap").classList.add("on");
      return;
    }
    toHome();
  };
}

function showReady() {
  const r = $("ready");
  $("rTheme").textContent = themeOf(level).name.toUpperCase();
  $("rLevel").textContent = "LEVEL " + level;
  $("rGoal").textContent = $("tip").textContent;
  r.classList.remove("hidden");
  // start on finger lift: iPhone only lets sound start on touchend/click, so music and effects begin right away
  r.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  r.onpointerup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== "ready") return;
    r.classList.add("hidden");
    r.onpointerup = null;
    unlockAudio();
    state = "running";
    last = 0;
    startMusic();
    rafId = requestAnimationFrame(tick);
  };
  // MAIN MENU on the ready card: leave the level without starting it
  const m = $("rMenu");
  m.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  m.onpointerup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== "ready") return;
    r.classList.add("hidden");
    r.onpointerup = null;
    showMenu();
  };
}

// iPhone Safari has no vibration API. Since iOS 18, toggling a switch control gives a light tap of haptics,
// but only during a real tap, so this covers jumps and button presses (not crashes).
let webTickEl = null;
function webTick(n) {
  try {
    if (!webTickEl) {
      const l = document.createElement("label"),
        i = document.createElement("input");
      i.type = "checkbox";
      i.setAttribute("switch", "");
      l.append(i);
      l.style.cssText =
        "position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
      document.body.append(l);
      webTickEl = l;
    }
    webTickEl.click();
    if (n > 1) setTimeout(() => webTickEl.click(), 60);
  } catch (e) {}
}
// iPhone Safari only unlocks Web Audio on touchend/click (not touchstart/pointerdown), and can suspend or
// "interrupt" it after the screen locks or a call. Retry on every real tap until it's running.
function unlockAudio() {
  if (!soundOn && !settings.music) return;
  audioReady();
  if (!audioCtx) return;
  try {
    const b = audioCtx.createBuffer(1, 1, 22050),
      src = audioCtx.createBufferSource();
    src.buffer = b;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch (e) {}
}
["touchend", "pointerup", "click", "keydown"].forEach((ev) =>
  document.addEventListener(ev, unlockAudio, { capture: true, passive: true }),
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  // coming back to the game: the old sound engine is often dead on iPhone, so build a fresh one
  if (audioCtx && window.audioReset) audioReset();
});

function toast(m, ok) {
  const t = document.getElementById("toast");
  if (!t || !m) return;
  t.textContent = m;
  t.className = ok ? "on" : "on bad";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = ok ? "" : "bad"), 4000);
}
