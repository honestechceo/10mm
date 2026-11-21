// Where's My 10MM?! — THE LOST TOOLBOX
// A separate 5-level platform adventure. Nothing in the main runner changes; this file only reads
// a few globals (coins, skins, sfx, buzz, music) and adds its own overlay on top.
// Level layouts come from lt/levels.js (built + reachability-checked by lt-tools/levels.py + validate.py).
(function () {
  "use strict";
  const T = 48, ROWS = 13;
  const NLV = () => window.LT_LEVELS.length;
  // keep in sync with lt-tools/validate.py
  const P = { MAXV: 260, ACC: 1900, ACC_AIR: 1300, FRIC: 2400, G_HOLD: 1500, G: 2600, JUMP: 640, DJUMP: 560, MAXFALL: 1000, SPRING: 1050 };
  const PW = 30, PH = 44, STEP = 1 / 120;
  const SOLID = "#=CU?RSD<>i";
  const SEMI = "-q"; // land from above only (q crumbles)
  const SAVE = "tenmm-lt";
  const BG = { garage: "bg-garage.jpg", servicecenter: "bg-servicecenter.jpg", partsstore: "bg-partsstore.jpg", engineshop: "bg-engineshop.jpg", evtech: "bg-evtech.jpg", carwash: "bg-carwash.jpg", salvage: "bg-salvage.jpg", pitlane: "bg-pitlane.jpg", snow: "bg-snow.jpg", repairshop: "bg-repairshop.jpg" };
  const SLICK = { carwash: ["rgba(120,200,255,.45)", "#e8f6ff"], snow: ["rgba(190,230,255,.55)", "#ffffff"] };
  const BOSS_ART = { walker: "filter", charger: "jack", flyer: "meter", roller: "gear", magnet: "magnet" };
  const PU = { speed: [8, "SPEED BOOST"], slow: [6, "SLOW-MO"], magnet: [10, "COIN MAGNET"], spring: [10, "SUPER JUMP"], shield: [0, "SHIELD! Blocks the next hit, no time limit"], torque: [10, "TORQUE STAR! Smash through anything"],
    wrench: [12, "WRENCH TOSS! Tap THROW to hit enemies and bosses"], pound: [12, "GROUND POUND! Jump, then tap POUND to slam down"],
    air: [12, "AIR COMPRESSOR! Hold JUMP while falling to float"], lucky: [15, "LUCKY SOCKET! Double coins"], heart: [0, "EXTRA HEART! 4 hit points this drawer"] };
  const TIMED = ["speed", "slow", "magnet", "spring", "torque", "wrench", "pound", "air", "lucky"];

  // ---------- art ----------
  const IMG = {};
  const img = (k) => {
    if (!IMG[k]) { const im = new Image(); im.src = k.includes(".") ? k : "lt/" + k + ".webp"; IMG[k] = im; }
    return IMG[k];
  };
  const ready = (im) => im && im.complete && im.naturalWidth > 0;
  // upright socket animation (Juan's 12-pose sheet); every frame shares one scale and a bottom-center anchor
  const FR = {
    idle: ["u-idle_01", "u-idle_01", "u-idle_02", "u-idle_02"], run: ["u-run_01", "u-run_02", "u-run_03", "u-run_04", "u-run_03", "u-run_02"],
    jump: ["u-jump", "u-jump", "u-jump"], djump: ["u-double_jump", "u-double_jump", "u-double_jump"], fall: ["u-fall", "u-fall"],
    land: ["u-land", "u-land"], hit: ["u-hurt", "u-hurt", "u-hurt"], win: ["u-victory", "u-victory", "u-victory"],
  };
  function preload() {
    Object.values(FR).flat().forEach(img);
    "t-square t-redbox t-bench t-crate drum qblock usedblk spring pan tire jack creeper toolcart gear hoist screw nut filter magnet coin pu-speed pu-slow pu-magnet pu-spring pu-shield drawer0 drawer1 drawer2 drawer3 chest lift-l star warp warpback chest-gold pu-torque pu-air pu-pound pu-wrench pu-lucky pu-heart wrench fx-air fx-pound".split(" ").forEach(img);
    img("tool-piston.webp");
    "fly-nut fly-drone fly-screw ob-conveyor ob-ledge ob-ledge-cracked ob-zap-on ob-zap-off ob-scissor ob-flag-red ob-flag-green ob-chain logo bossa-filter bossa-jack bossa-meter bossa-gear bossa-magnet bossb-filter bossb-jack bossb-meter bossb-gear bossb-magnet".split(" ").forEach(img);
  }

  // ---------- save ----------
  const load = () => { try { return Object.assign({ done: [], coins: {}, golden: false, stars: {}, starPaid: 0, rooms: [] }, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch (e) { return { done: [], coins: {}, golden: false, stars: {}, starPaid: 0, rooms: [] }; } };
  // stars: 5 hidden in every drawer, kept for good once found. Every STAR_STEP stars pays coins into the shop wallet.
  const STAR_STEP = 10, STAR_PAY = 250;
  const starTotal = (s) => Object.values(s.stars || {}).reduce((n, a) => n + a.length, 0);
  const store = (s) => { try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch (e) {} };
  const tester = () => localStorage.getItem("tenmm-tester") === "1";
  const say = (n) => { try { window.sfx && sfx(n); } catch (e) {} };
  const haptic = (n) => { try { window.buzz && buzz(n); } catch (e) {} };

  // ---------- DOM ----------
  let root, cv, ctx, card, hud = {}, dpr = 1, scale = 1, viewW = 400;
  function build() {
    if (root) return;
    root = document.createElement("div");
    root.id = "ltbox";
    root.className = "hidden";
    root.innerHTML =
      '<canvas id="ltc"></canvas>' +
      '<div class="lthud"><span class="lthp" id="ltHp"></span><span class="ltname" id="ltName"></span><span class="ltcoin"><img src="lt/coin.webp" alt="">×<b id="ltCoins">0</b></span><span class="ltcoin ltstar"><img src="lt/star.webp" alt="">×<b id="ltStars">0/5</b></span><button id="ltPause" aria-label="Pause">II</button></div>' +
      '<div class="ltpow" id="ltPow"></div><div class="ltboss" id="ltBoss"></div>' +
      '<div class="ltmsg" id="ltMsg"></div>' +
      '<div class="ltpad"><button class="ltl" data-k="L" aria-label="Move left">◀</button><button class="ltr" data-k="R" aria-label="Move right">▶</button><button class="lta" data-k="A" aria-label="Use power"><img alt=""><span>THROW</span></button><button class="ltj" data-k="J" aria-label="Jump">JUMP</button></div>' +
      '<div class="ltcard hidden" id="ltCard"></div>';
    document.body.append(root);
    cv = root.querySelector("#ltc"); ctx = cv.getContext("2d"); card = root.querySelector("#ltCard");
    ["Hp", "Name", "Coins", "Stars", "Pow", "Msg"].forEach((k) => (hud[k] = root.querySelector("#lt" + k)));
    root.querySelector("#ltPause").onclick = () => pauseMenu();
    // Touch: every finger is tracked by where it is right now, so sliding a thumb from ◀ to ▶
    // switches direction, and lifting any finger can never leave a direction stuck on.
    const pad = root.querySelector(".ltpad"), btns = [...pad.querySelectorAll("button")];
    const zoneAt = (x, y) => {
      for (const b of btns) { if (b.offsetParent === null) continue; const r = b.getBoundingClientRect(); if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 30 && y <= r.bottom + 30) return b.dataset.k; }
      return null;
    };
    const syncTouches = (e) => {
      e.preventDefault();
      const held = { L: false, R: false, J: false, A: false };
      for (const tch of e.touches) { const k = zoneAt(tch.clientX, tch.clientY); if (k) held[k] = true; }
      for (const k of ["L", "R", "J", "A"]) if (held[k] !== key[k]) press(k, held[k]);
      btns.forEach((b) => b.classList.toggle("on", held[b.dataset.k]));
    };
    ["touchstart", "touchmove", "touchend", "touchcancel"].forEach((ev) => pad.addEventListener(ev, syncTouches, { passive: false }));
    // mouse (simulator / desktop)
    for (const b of btns) {
      const k = b.dataset.k;
      b.addEventListener("mousedown", (e) => { e.preventDefault(); press(k, true); b.classList.add("on"); });
      const up = () => { if (key[k]) { press(k, false); b.classList.remove("on"); } };
      b.addEventListener("mouseup", up); b.addEventListener("mouseleave", up);
    }
    window.addEventListener("blur", () => { key.L = key.R = key.J = key.A = false; btns.forEach((b) => b.classList.remove("on")); });
    window.addEventListener("keydown", (e) => {
      if (!open) return;
      const k = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", Space: "J", ArrowUp: "J", KeyW: "J", KeyZ: "J", KeyX: "A", ArrowDown: "A", KeyF: "A" }[e.code];
      if (k) { e.preventDefault(); if (!e.repeat) press(k, true); }
      if (e.code === "Escape" || e.code === "KeyP") pauseMenu();
    });
    window.addEventListener("keyup", (e) => {
      const k = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", Space: "J", ArrowUp: "J", KeyW: "J", KeyZ: "J", KeyX: "A", ArrowDown: "A", KeyF: "A" }[e.code];
      if (k) press(k, false);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && open && mode === "play") pauseMenu(); });
    window.addEventListener("resize", fit);
  }
  function fit() {
    if (!cv) return;
    dpr = Math.min(3, window.devicePixelRatio || 1);
    // a wide-ish window onto the level: never taller than 1.15x its width, so you can see what's coming
    const wrap = cv.parentElement.getBoundingClientRect(), pad = root.querySelector(".ltpad").getBoundingClientRect().height;
    const avail = wrap.height - pad - 56;
    cv.style.height = Math.max(200, Math.min(avail, wrap.width * 1.6)) + "px";
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    // always show about 11.5 tiles across; any extra height becomes headroom above the level
    scale = Math.min(cv.height / (ROWS * T), cv.width / (11.5 * T));
    viewW = cv.width / scale;
  }

  // ---------- input ----------
  const key = { L: false, R: false, J: false, A: false };
  let jumpBuf = 0;
  function press(k, d) {
    if (k === "J" && d && !key.J) jumpBuf = 0.12;
    if (k === "A" && d && !key.A) action();
    key[k] = d;
    if (d) { try { window.audioReady && audioReady(); } catch (e) {} }
  }

  // ---------- world ----------
  let open = false, mode = "menu", lvI = 0, grid, W, ents, movers, pl, cam, cp, t, timeScale = 1, raf = 0, last = 0, acc = 0;
  let coinsRun = 0, hp = 3, maxHp = 3, shakeT = 0, pow, msgT = 0, fx, drawerT = 0, chase = null, clearInfo = null, bgImg;
  const cell = (cx, cy) => (cy < 0 || cx < 0 || cx >= W ? (cx < 0 || cx >= W ? "#" : ".") : cy >= ROWS ? "." : grid[cy][cx]);
  const isSolid = (ch) => SOLID.includes(ch);

  function startLevel(i, fromCheckpoint, roomRows) {
    const L = window.LT_LEVELS[i];
    lvI = i;
    if (!roomRows) maxHp = 3;
    grid = (roomRows || L.rows).map((r) => r.split(""));
    W = grid[0].length;
    ents = []; movers = []; fx = [];
    const ext = {};
    if (!roomRows) for (const [x, y, kw] of L.ext) ext[x + "," + y] = kw;
    let start = { x: 2, y: 10 };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) {
      const ch = grid[y][x], kw = ext[x + "," + y] || {}, cx = x * T + T / 2, by = (y + 1) * T;
      const e = (o) => ents.push(Object.assign({ x0: cx, y0: by, x: cx, y: by, alive: true, ph: (x * 0.37) % 1 }, o));
      switch (ch) {
        case "@": start = { x, y }; grid[y][x] = "."; break;
        case "o": e({ k: "coin", w: 26, h: 26, y: by - 11 }); grid[y][x] = "."; break;
        case "P": e({ k: "pan", w: 40, h: 18, hurt: 1 }); grid[y][x] = "."; break;
        case "T": e({ k: "tire", w: 34, h: 34, vx: -80, walker: 1, stomp: 1, hurt: 1 }); grid[y][x] = "."; break;
        case "J": e({ k: "jack", w: 44, h: 30, vx: -70, walker: 1, edge: 1, stomp: 1, hurt: 1 }); grid[y][x] = "."; break;
        case "K": e({ k: "creeper", w: 46, h: 20, vx: -140, walker: 1, edge: 1, stomp: 1, hurt: 1 }); grid[y][x] = "."; break;
        case "k": e({ k: "toolcart", w: 52, h: 52, vx: -60, walker: 1, edge: 1, bounce: 1, hurt: 1 }); grid[y][x] = "."; break;
        case "p": e({ k: "piston", w: 30, h: 60, hurt: 1 }); grid[y][x] = "."; break;
        case "g": e({ k: "gear", w: 40, h: 40, y: by - 4, hurt: 1, round: 1 }); grid[y][x] = "."; break;
        case "c": e({ k: "chain", w: 46, h: 38, len: (kw.len || 3) * T, ph: kw.phase || 0, ax: cx, ay: y * T, hurt: 1 }); grid[y][x] = "."; break;
        case "f": e({ k: "drop", w: 26, h: 26, col: cx, ph: (x * 0.23) % 1, hurt: 1 }); grid[y][x] = "."; break;
        case "!": e({ k: "check", w: 30, h: 60, on: false }); grid[y][x] = "."; break;
        case "X": e({ k: "exit", w: 96, h: 96, x: x * T + T, y: by }); grid[y][x] = "."; break;
        case "W": e({ k: "chaseOn", w: 20, h: 600 }); grid[y][x] = "."; break;
        case "w": e({ k: "chaseOff", w: 20, h: 600 }); grid[y][x] = "."; break;
        case "Z": e({ k: "spring", w: 44, h: 26 }); grid[y][x] = "."; break;
        case "e": e({ k: "zap", w: T, h: 16, hurt: 1, ph: (x % 3) * 0.33 }); grid[y][x] = "."; break;
        case "b": e({ k: "nut", w: 34, h: 30, y: by - T / 2 + 15, cy: by - T / 2, vx: -70, fly: 1, stomp: 1, hurt: 1 }); grid[y][x] = "."; break;
        case "h": e({ k: "drone", w: 46, h: 40, y: by - T / 2 + 20, cy: by - T / 2, vx: -90, fly: 1, stomp: 1, hurt: 1 }); grid[y][x] = "."; break;
        case "v": e({ k: "diver", w: 26, h: 44, y: by, hy: by, st: "hover", hurt: 1 }); grid[y][x] = "."; break;
        case "B": e(Object.assign({ k: "boss", st: "wait", hp: kw.hp || 3, max: kw.hp || 3, spd: kw.spd || 1, kind: kw.boss || "walker", name: kw.name || "BOSS", w: 78, h: 78, vx: 0, vy: 0, face: -1, tt: 0, hurt: 1 }, kw.boss === "flyer" || kw.boss === "magnet" ? { y: 4 * T, hy: 4 * T, gy: by, w: 92, h: 70 } : { gy: by })); grid[y][x] = "."; break;
        case "L": movers.push({ k: "lift", x: x * T, y: by - 12, x0: x * T, y0: by - 12, w: 2 * T, dy: (kw.dy || 3) * T, dx: 0, sp: kw.speed || 60, ph: kw.phase || 0, vx: 0, vy: 0 }); grid[y][x] = "."; break;
        case "M": movers.push({ k: "plat", x: x * T, y: by - 12, x0: x * T, y0: by - 12, w: 2 * T, dx: (kw.dx || 3) * T, dy: 0, sp: kw.speed || 60, ph: kw.phase || 0, vx: 0, vy: 0 }); grid[y][x] = "."; break;
        case "U": ext[x + "," + y] = kw; break;
        case "*": e({ k: "star", w: 34, h: 34, y: by - 7, sid: x + "," + y }); grid[y][x] = "."; break;
        case "Y": e({ k: "warp", w: 60, h: 60 }); grid[y][x] = "."; break;
        case "y": e({ k: "warpback", w: 60, h: 60 }); grid[y][x] = "."; break;
        case "Q": e({ k: "gchest", w: 56, h: 50 }); grid[y][x] = "."; break;
      }
    }
    crumbles = []; boss = ents.find((e) => e.k === "boss") || null; arena = null;
    if (boss) { boss.home = { x: boss.x, y: boss.y }; arena = { l: boss.x - 6 * T - T / 2, r: boss.x + 6 * T + T / 2, on: false, done: false }; }
    const tag = roomRows ? "r" : "";
    for (const e of ents) if (e.k === "coin" && collected.has(tag + i + ":" + Math.round(e.x0) + ":" + Math.round(e.y0))) e.alive = false;
    const sv = load(), got = (sv.stars && sv.stars[i]) || [];
    for (const e of ents) if (e.k === "star" && got.includes(e.sid)) e.ghost = 1;   // already found: shows faded, still worth nothing
    for (const e of ents) if (e.k === "gchest" && collected.has("chest" + i)) e.open = 1;
    blockKw = ext;
    startPos = { x: start.x * T + T / 2, y: (start.y + 1) * T };
    if (!fromCheckpoint) cp = Object.assign({}, startPos);
    spawnPlayer();
    hud.Name.textContent = roomRows ? "SECRET ROOM" : "DRAWER " + (i + 1) + " · " + L.name;
    bgImg = img(roomRows ? "room-bg" : BG[L.bg] || "bg-garage.jpg");
    inRoom = !!roomRows; starHud();
    timeScale = 1; chase = null; t = 0;
  }
  let zoom = 1, inRoom = false, stash = null;
  function starHud() {
    if (!hud.Stars) return;
    const s = load(), n = ((s.stars && s.stars[lvI]) || []).length;
    hud.Stars.textContent = n + "/5";
  }
  function grabStar(e) {
    e.alive = false; fx.push({ k: "spark", x: e.x, y: e.y - 17, t: 0.45 });
    if (e.ghost) { say("grab"); return; }
    const s = load(); s.stars = s.stars || {}; const a = (s.stars[lvI] = s.stars[lvI] || []);
    if (!a.includes(e.sid)) a.push(e.sid);
    const tot = starTotal(s), due = Math.floor(tot / STAR_STEP);
    let paid = 0;
    if (due > (s.starPaid || 0)) { paid = (due - (s.starPaid || 0)) * STAR_PAY; s.starPaid = due; }
    store(s);
    say("power"); haptic("success"); starHud();
    if (paid) {
      try { totalCoins += paid; localStorage.setItem("tenmm-coins", totalCoins); const cc = document.getElementById("coinsCount"); if (cc) cc.textContent = totalCoins; } catch (x) {}
      toast("★ " + tot + " STARS! +" + paid + " COINS to your wallet");
    } else toast(a.length === 5 ? "ALL 5 STARS IN THIS DRAWER!" : "★ STAR " + a.length + "/5 · " + (STAR_STEP - (tot % STAR_STEP)) + " more for " + STAR_PAY + " coins");
  }
  // ---- secret rooms: a blue toolbox drops you underground; the box at the far end brings you back ----
  function enterRoom(e) {
    stash = { grid, W, ents, movers, crumbles, boss, arena, blockKw, startPos, cp, chase, back: { x: e.x + T * 1.5, y: e.y } };
    const L = window.LT_LEVELS[lvI], keep = { hp, pow };
    startLevel(lvI, false, L.room);
    hp = keep.hp; pow = keep.pow;
    mode = "intro"; drawerT = 0; say("power"); haptic("success"); toast("SECRET ROOM!");
    const s = load(); if (!s.rooms.includes(lvI)) { s.rooms.push(lvI); store(s); }
  }
  function leaveRoom() {
    if (!stash) return;
    const keep = { hp, pow }, S = stash; stash = null;
    ({ grid, W, ents, movers, crumbles, boss, arena, blockKw, startPos, cp, chase } = S);
    inRoom = false;
    const L = window.LT_LEVELS[lvI];
    hud.Name.textContent = "DRAWER " + (lvI + 1) + " · " + L.name;
    pl.x = S.back.x; pl.y = S.back.y; pl.vx = 0; pl.vy = -300; pl.ground = false; pl.on = null; pl.inv = 1.2;
    hp = keep.hp; pow = keep.pow; fx = [];
    cam = Math.max(0, Math.min(W * T - VW(), pl.x - VW() * 0.35));
    mode = "play"; say("grab"); haptic("medium");
    if (pow.torqueBank) { pow.torqueBank = 0; givePower("torque"); }
  }
  const VW = () => viewW / zoom;
  let blockKw = {}, collected = new Set(), startPos = { x: 0, y: 0 }, crumbles = [], arena = null, boss = null;
  function crumble(cx, cy) {
    if (crumbles.some((c) => c.cx === cx && c.cy === cy)) return;
    // a whole run of crumbling tiles goes together
    let a = cx, b = cx;
    while (cell(a - 1, cy) === "q") a--;
    while (cell(b + 1, cy) === "q") b++;
    for (let x = a; x <= b; x++) if (!crumbles.some((c) => c.cx === x && c.cy === cy)) crumbles.push({ cx: x, cy, t: 0.55, back: 0 });
  }
  function stepCrumbles(dt) {
    for (const c of crumbles) {
      if (c.t > 0) { c.t -= dt; if (c.t <= 0) { grid[c.cy][c.cx] = "."; c.back = 3.2; puff(c.cx * T + T / 2, c.cy * T + 10, 3, "#b8a07a"); } }
      else if (c.back > 0) {
        c.back -= dt;
        if (c.back <= 0) {
          const inside = pl.x + PW / 2 > c.cx * T && pl.x - PW / 2 < (c.cx + 1) * T && pl.y > c.cy * T && pl.y - PH < (c.cy + 1) * T;
          if (inside) c.back = 0.3; else { grid[c.cy][c.cx] = "q"; c.done = 1; }
        }
      }
    }
    crumbles = crumbles.filter((c) => !c.done);
  }
  function spawnPlayer() {
    pl = { x: cp.x, y: cp.y, vx: 0, vy: 0, face: 1, ground: true, coyote: 0, jumps: 0, held: false, inv: 1.0, hitT: 0, landT: 0, djT: 0, anim: 0, on: null };
    zoom = 1;
    cam = Math.max(0, Math.min(W * T - viewW, pl.x - viewW * 0.35));
    hp = maxHp;
    pow = { speed: 0, slow: 0, magnet: 0, spring: 0, torque: 0, wrench: 0, pound: 0, air: 0, lucky: 0, shield: pow && pow.shield ? 1 : 0, torqueBank: pow && pow.torqueBank ? 1 : 0 };
  }

  // ---------- physics ----------
  function overlapSolid(x, y) { // player box with feet at y
    const x0 = Math.floor((x - PW / 2) / T), x1 = Math.floor((x + PW / 2 - 0.01) / T);
    const y0 = Math.floor((y - PH) / T), y1 = Math.floor((y - 0.01) / T);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (isSolid(cell(cx, cy))) return { cx, cy };
    return null;
  }
  function stepPlayer(dt) {
    const sp = pow.speed > 0 ? 1.35 : 1, dir = (key.R ? 1 : 0) - (key.L ? 1 : 0);
    const maxv = P.MAXV * sp;
    if (dir) {
      pl.face = dir;
      const a = (pl.ground ? P.ACC * (pl.wasSlick ? 0.35 : 1) : P.ACC_AIR) * sp * (Math.sign(pl.vx) === -dir ? (pl.wasSlick ? 1 : 1.6) : 1);
      pl.vx += dir * a * dt;
      if (Math.abs(pl.vx) > maxv) pl.vx = Math.sign(pl.vx) * Math.max(maxv, Math.abs(pl.vx) - P.FRIC * dt);
    } else if (pl.ground) {
      const f = P.FRIC * (pl.wasSlick ? 0.12 : 1) * dt;
      pl.vx = Math.abs(pl.vx) <= f ? 0 : pl.vx - Math.sign(pl.vx) * f;
    } else pl.vx *= 1 - 0.8 * dt;
    // conveyors push whatever stands on them
    if (pl.ground && pl.belt) pl.x += pl.belt * 95 * dt;
    // jump: buffer + coyote time, double jump in the air
    jumpBuf -= dt; pl.coyote -= dt;
    const jm = pow.spring > 0 ? 1.22 : 1;
    if (jumpBuf > 0) {
      if (pl.ground || pl.coyote > 0) { pl.vy = -P.JUMP * jm; pl.ground = false; pl.coyote = 0; pl.jumps = 1; pl.held = true; jumpBuf = 0; say("jump"); pl.on = null; }
      else if (pl.jumps < 2) { pl.vy = -P.DJUMP * jm; pl.jumps = 2; pl.held = true; jumpBuf = 0; pl.djT = 0.4; say("flap"); puff(pl.x, pl.y, 6, "#ffffff"); }
    }
    if (!key.J) pl.held = false;
    const g = pl.held && pl.vy < 0 ? P.G_HOLD : P.G;
    pl.vy = Math.min(P.MAXFALL, pl.vy + g * dt);
    pl.gliding = pow.air > 0 && key.J && pl.vy > 0 && !pl.pounding && !pl.ground;
    if (pl.gliding) pl.vy = Math.min(pl.vy, 130);
    if (pl.pounding) { pl.vy = 1150; pl.vx = 0; }
    // ride movers (and step off when you walk past the edge)
    if (pl.on) {
      pl.x += pl.on.vx * dt; pl.y = pl.on.y;
      if (pl.x + PW / 2 < pl.on.x + 4 || pl.x - PW / 2 > pl.on.x + pl.on.w - 4) pl.on = null;
    }
    // horizontal move + walls
    let nx = pl.x + pl.vx * dt;
    const hitX = overlapSolid(nx, pl.y);
    if (hitX) {
      nx = pl.vx > 0 ? hitX.cx * T - PW / 2 : (hitX.cx + 1) * T + PW / 2;
      pl.vx = 0;
    }
    pl.x = Math.max(PW / 2, Math.min(W * T - PW / 2, nx));
    // vertical
    const wasGround = pl.ground, oldY = pl.y;
    let ny = pl.y + pl.vy * dt;
    pl.ground = false; pl.belt = 0; pl.slick = false;
    if (pl.on && pl.vy >= 0) { ny = pl.on.y; pl.ground = true; pl.vy = 0; }
    else pl.on = null;
    if (!pl.ground) {
      if (pl.vy < 0) {
        const x0 = Math.floor((pl.x - PW / 2 + 2) / T), x1 = Math.floor((pl.x + PW / 2 - 2) / T), cy = Math.floor((ny - PH) / T);
        for (let cx = x0; cx <= x1; cx++) {
          const ch = cell(cx, cy);
          if (isSolid(ch) || ch === "H") { ny = (cy + 1) * T + PH; pl.vy = 0; bonk(cx, cy, ch); break; }
        }
      } else {
        let top = null;
        const x0 = Math.floor((pl.x - PW / 2 + 1) / T), x1 = Math.floor((pl.x + PW / 2 - 1) / T);
        for (let cy = Math.floor(oldY / T); cy <= Math.floor(ny / T); cy++) {
          for (let cx = x0; cx <= x1; cx++) {
            const ch = cell(cx, cy), y = cy * T;
            if ((isSolid(ch) || SEMI.includes(ch)) && y >= oldY - 0.5 && y <= ny && (top === null || y < top)) { top = y; pl.belt = ch === ">" ? 1 : ch === "<" ? -1 : pl.belt; pl.slick = ch === "i"; if (ch === "q") crumble(cx, cy); }
          }
          if (top !== null) break;
        }
        for (const m of movers) {
          if (pl.x + PW / 2 > m.x + 4 && pl.x - PW / 2 < m.x + m.w - 4 && m.y >= oldY - 1 - Math.max(0, -m.vy * dt) && m.y <= ny + Math.max(0, -m.vy * dt) + 1 && (top === null || m.y < top)) { top = m.y; pl.on = m; }
        }
        if (top !== null) {
          ny = top; pl.vy = 0; pl.ground = true;
          if (!wasGround) { pl.landT = 0.14; if (pl.jumps) puff(pl.x, ny, 4, "#d8dde4"); if (pl.pounding) { pl.y = ny; poundImpact(); } }
          pl.jumps = 0;
        }
      }
    }
    pl.y = ny;
    if (pl.ground) pl.wasSlick = pl.slick; 
    // arena walls: once the boss fight starts you can't walk back out
    if (arena && arena.on) {
      if (pl.x - PW / 2 < arena.l) { pl.x = arena.l + PW / 2; pl.vx = Math.max(0, pl.vx); }
      if (pl.x + PW / 2 > arena.r) { pl.x = arena.r - PW / 2; pl.vx = Math.min(0, pl.vx); }
    }
    // the head can still be inside a block after riding a lift up: push out
    const stuck = overlapSolid(pl.x, pl.y);
    if (stuck && !pl.on) pl.y = stuck.cy * T;
    if (wasGround && !pl.ground && pl.vy >= 0) pl.coyote = 0.08;
    if (pl.ground) pl.jumps = 0;
    if (pl.y > ROWS * T + 80) die("pit");
  }
  function bonk(cx, cy, ch) {
    if (ch === "?") { grid[cy][cx] = "S"; addCoin(cx * T + T / 2, cy * T - 20, true); fx.push({ k: "bump", cx, cy, t: 0.15 }); say("grab"); }
    else if (ch === "U") {
      grid[cy][cx] = "S"; fx.push({ k: "bump", cx, cy, t: 0.15 }); say("power");
      const kind = (blockKw[cx + "," + cy] || {}).pu || "shield";
      ents.push({ k: "pu", pu: kind, x: cx * T + T / 2, y: cy * T, x0: 0, y0: 0, w: 34, h: 34, alive: true, rise: 0 });
    } else if (ch === "C") {
      grid[cy][cx] = "."; say("hit"); haptic("light");
      for (let i = 0; i < 6; i++) fx.push({ k: "chip", x: cx * T + T / 2, y: cy * T + T / 2, vx: (Math.random() - 0.5) * 360, vy: -200 - Math.random() * 260, t: 0.9, c: i % 2 ? "#e39a2c" : "#a5641a" });
      if ((cx * 7 + cy * 3) % 3 === 0) addCoin(cx * T + T / 2, cy * T, true);
    } else if (ch === "H") { grid[cy][cx] = "S"; addCoin(cx * T + T / 2, cy * T - 20, true); fx.push({ k: "bump", cx, cy, t: 0.15 }); say("grab"); toast("Hidden block!"); }
    else fx.push({ k: "bump", cx, cy, t: 0.08 });
  }
  function gain(n) { coinsRun += n * (pow && pow.lucky > 0 ? 2 : 1); hud.Coins.textContent = coinsRun; }
  function addCoin(x, y, pop) {
    gain(1);
    if (pop) fx.push({ k: "coinpop", x, y, t: 0.5 });
    say("grab");
  }
  function hurt(src) {
    if (pl.inv > 0 || mode !== "play" || pow.torque > 0) return;
    if (pow.shield) { pow.shield = 0; pl.inv = 1.2; say("hit"); haptic("medium"); toast("Shield saved you! It's used up."); return; }
    hp--; pl.inv = 1.4; pl.hitT = 0.45; say("hit"); haptic("heavy");
    pl.vy = -420; pl.vx = (pl.x < (src ? src.x : pl.x) ? -1 : 1) * 220; pl.ground = false; pl.on = null;
    if (hp <= 0) die("hp");
  }
  function die(why) {
    if (mode !== "play") return;
    mode = "respawn"; drawerT = 0.9; say("miss"); haptic("heavy");
    toast(why === "pit" ? "Down the service pit! Back to the checkpoint." : "Ouch! Back to the checkpoint.");
  }

  // ---------- entities ----------
  function stepEnts(dt) {
    const hd = dt * timeScale; t += dt;
    for (const m of movers) {
      // ease back and forth over its range; one-way trip takes dist / speed seconds
      const ox = m.x, oy = m.y;
      m.mt = (m.mt || 0) + hd;
      const f = (1 - Math.cos(((m.mt * m.sp) / Math.max(m.dx, m.dy) + m.ph) * Math.PI)) / 2;
      m.x = m.x0 + m.dx * f; m.y = m.y0 - m.dy * f;
      m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt;
    }
    for (const e of ents) {
      if (!e.alive) continue;
      if (e.k === "wrench") { wrenchStep(e, hd); continue; }
      if (e.walker && !e.dead) {
        e.vy = Math.min(900, (e.vy || 0) + 2400 * hd);
        let nx = e.x + e.vx * hd;
        const front = Math.floor((nx + Math.sign(e.vx) * e.w / 2) / T), row = Math.floor((e.y - 4) / T);
        if (isSolid(cell(front, row)) || isSolid(cell(front, row - 1)) || (e.edge && e.onG && !isSolid(cell(front, Math.floor(e.y / T))) && !SEMI.includes(cell(front, Math.floor(e.y / T))))) { e.vx = -e.vx; nx = e.x; }
        e.x = nx;
        let ny = e.y + e.vy * hd; e.onG = false;
        const cx = Math.floor(e.x / T);
        for (let cy = Math.floor(e.y / T); cy <= Math.floor(ny / T); cy++) { const ch = cell(cx, cy); if ((isSolid(ch) || SEMI.includes(ch)) && cy * T >= e.y - 1) { ny = cy * T; e.vy = 0; e.onG = true; break; } }
        e.y = ny; e.rot = (e.rot || 0) + (e.vx * hd) / 17;
        if (e.y > ROWS * T + 100) e.alive = false;
      }
      if (e.dead) { e.dead -= dt; e.y += 300 * dt; if (e.dead <= 0) e.alive = false; continue; }
      if (e.k === "piston") e.y = e.y0 - (0.5 - 0.5 * Math.cos((t * timeScale * 2.4 + e.ph * 6.28))) * 2.6 * T;
      if (e.k === "gear") { e.rot = (e.rot || 0) + 3 * hd; e.y = e.y0 - 4 + Math.sin(t * 2 + e.ph * 6) * 6; }
      if (e.k === "chain") { e.ang = 0.95 * Math.sin(t * timeScale * 1.7 + e.ph * 6.28); e.x = e.ax + Math.sin(e.ang) * e.len; e.y = e.ay + Math.cos(e.ang) * e.len + e.h / 2; }
      if (e.k === "drop") {
        e.cyc = ((t * timeScale) / 2.4 + e.ph) % 1;
        if (e.cyc < 0.3) { e.falling = false; e.warn = e.cyc > 0.05; }
        else {
          if (!e.falling) { e.falling = true; e.y = -20; e.vy = 0; e.kind = ["screw", "nut", "filter"][Math.floor(Math.random() * 3)]; }
          e.vy += 1500 * hd; e.y += e.vy * hd;
          const ch = cell(Math.floor(e.col / T), Math.floor(e.y / T));
          if (isSolid(ch) || SEMI.includes(ch) || e.y > ROWS * T) { if (e.y < ROWS * T) puff(e.col, Math.floor(e.y / T) * T, 3, "#aaa"); e.falling = false; e.y = -200; }
        }
        e.x = e.col;
      }
      if (e.fly && !e.dead) {
        // flyers patrol back and forth, turning at walls or after a few tiles, bobbing as they go
        e.x += e.vx * hd;
        if (Math.abs(e.x - e.x0) > (e.k === "drone" ? 4 : 3) * T || isSolid(cell(Math.floor((e.x + Math.sign(e.vx) * e.w / 2) / T), Math.floor(e.cy / T)))) { e.vx = -e.vx; e.x += e.vx * hd * 2; }
        e.y = e.cy + e.h / 2 + Math.sin(t * (e.k === "nut" ? 4 : 2.2) + e.ph * 6) * (e.k === "nut" ? 26 : 10);
        e.rot = (e.rot || 0) + hd * 6;
      }
      if (e.k === "diver") {
        // hangs from the ceiling; drops when you walk under it, then winds back up
        if (e.st === "hover") { e.y = e.hy + Math.sin(t * 3 + e.ph * 6) * 4; if (Math.abs(pl.x - e.x) < 70 && pl.y > e.y && mode === "play") { e.st = "warn"; e.tt = 0.32; } }
        else if (e.st === "warn") { e.tt -= hd; e.shake = 1; if (e.tt <= 0) { e.st = "dive"; e.vy = 0; e.shake = 0; } }
        else if (e.st === "dive") {
          e.vy = Math.min(1100, (e.vy || 0) + 2600 * hd); const ny = e.y + e.vy * hd, cy = Math.floor(ny / T), ch = cell(Math.floor(e.x / T), cy);
          if (isSolid(ch) || SEMI.includes(ch) || ny > ROWS * T) { e.y = Math.min(ny, cy * T); e.st = "stuck"; e.tt = 0.7; puff(e.x, e.y, 5, "#ccc"); say("land"); } else e.y = ny;
        } else if (e.st === "stuck") { e.tt -= hd; if (e.tt <= 0) e.st = "up"; }
        else if (e.st === "up") { e.y -= 160 * hd; if (e.y <= e.hy) { e.y = e.hy; e.st = "hover"; } }
      }
      if (e.k === "zap") { e.cyc = ((t * timeScale) / 2.8 + e.ph) % 1; e.on = e.cyc > 0.55; e.warn = e.cyc > 0.42 && !e.on; }
      if (e.k === "bolt") { e.vy = Math.min(900, e.vy + 1400 * hd); e.y += e.vy * hd; e.x += (e.vx || 0) * hd; const ch = cell(Math.floor(e.x / T), Math.floor(e.y / T)); if (isSolid(ch) || e.y > ROWS * T) { e.alive = false; puff(e.x, Math.floor(e.y / T) * T, 4, "#7ad7ff"); } }
      if (e.k === "boss") { stepBoss(e, hd, dt); }
      if (e.k === "pu" && e.rise < 1) { e.rise = Math.min(1, e.rise + dt * 3); }
      if (e.k === "coin" && pow.magnet > 0) {
        const dx = pl.x - e.x, dy = pl.y - PH / 2 - (e.y - 13), d = Math.hypot(dx, dy);
        if (d < 190) { e.x += (dx / d) * 420 * dt; e.y += (dy / d) * 420 * dt; }
      }
      collide(e, dt);
    }
    if (chase) {
      // steady and beatable: it only speeds up to keep within ~60% of a screen behind you
      const target = pl.x - viewW * 0.6;
      chase.x += (120 + Math.max(0, target - chase.x) * 1.5) * dt * timeScale;
      if (chase.x + 70 > pl.x - PW / 2 && mode === "play") { toast("The magnet got you!"); chase.x = pl.x - 400; die("magnet"); }
    }
  }
  function box(e) {
    const y = e.k === "pu" ? e.y - e.rise * 34 : e.y;
    return { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: y - e.h, y1: y };
  }
  function collide(e, dt) {
    const b = box(e), px0 = pl.x - PW / 2, px1 = pl.x + PW / 2, py0 = pl.y - PH, py1 = pl.y;
    if (e.k === "drop" && !e.falling) return;
    if (e.k === "zap" && !e.on) return;
    if (e.k === "boss" && (e.st === "wait" || e.st === "dead")) return;
    if (e.k === "chaseOn") { if (pl.x > e.x && !chase && !e.used) { e.used = 1; chase = { x: cam - 120 }; toast("RUN! The giant magnet is coming!"); say("grab"); haptic("medium"); } return; }
    if (e.k === "chaseOff") { if (pl.x > e.x && chase) { chase = null; toast("You lost the magnet!"); say("win"); } return; }
    const shrink = e.round ? 6 : e.hurt ? 4 : 0;
    if (px1 < b.x0 + shrink || px0 > b.x1 - shrink || py1 < b.y0 + shrink || py0 > b.y1 - shrink) return;
    switch (e.k) {
      case "coin": e.alive = false; collected.add((inRoom ? "r" : "") + lvI + ":" + Math.round(e.x0) + ":" + Math.round(e.y0)); addCoin(e.x, e.y); fx.push({ k: "spark", x: e.x, y: e.y - 13, t: 0.3 }); return;
      case "pu": e.alive = false; givePower(e.pu); return;
      case "star": grabStar(e); return;
      case "warp": if (mode === "play" && pl.ground && Math.abs(pl.x - e.x) < 18) { mode = "warp"; drawerT = 0; exitEnt = e; pl.vx = 0; say("grab"); } return;
      case "warpback": if (mode === "play" && Math.abs(pl.x - e.x) < 22) { mode = "warp"; drawerT = 0; exitEnt = e; pl.vx = 0; say("grab"); } return;
      case "gchest": if (!e.open) { e.open = 1; collected.add("chest" + lvI); fx.push({ k: "spark", x: e.x, y: e.y - 40, t: 0.5 }); for (let k = 0; k < 20; k++) addCoin(e.x, e.y - 40, k % 4 === 0); pow.torqueBank = 1; say("power"); haptic("success"); toast("TORQUE STAR saved! It kicks in when you go back up"); } return;
      case "check": if (!e.on) { ents.forEach((o) => o.k === "check" && (o.on = false)); e.on = true; cp = { x: e.x, y: e.y }; toast("CHECKPOINT!"); say("win"); haptic("success"); } return;
      case "spring": if (pl.vy >= 0 && py1 - b.y0 < 26) { pl.vy = -P.SPRING * (key.J ? 1.1 : 1); pl.jumps = 1; pl.ground = false; pl.on = null; e.squash = 0.2; say("flap"); } return;
      case "exit": if (arena && !arena.done) return; if (mode === "play" && px1 > b.x0 + 26 && px0 < b.x1 - 26 && py1 > b.y0 + 30) enterDrawer(e); return;
    }
    // torque star: plow through anything that walks, flies or rolls (bosses just can't hurt you)
    if (pow.torque > 0) {
      if (e.k !== "boss" && (e.stomp || e.walker || e.fly || e.bounce) && !e.dead) { e.dead = 0.6; e.vx = 0; gain(1); say("hit"); fx.push({ k: "spark", x: e.x, y: b.y0, t: 0.35 }); return; }
      if (e.k === "boss" && pl.vy > 60 && py1 - b.y0 < 30 && e.inv <= 0 && bossStompable(e)) { bossHit(e); return; }
      return;
    }
    // hazards: stomp the stompable ones from above
    const fromAbove = pl.vy > 60 && py1 - b.y0 < (e.k === "boss" ? 30 : 20);
    if (e.k === "boss") {
      if (fromAbove && e.inv <= 0 && bossStompable(e)) { bossHit(e); return; }
      // stunned, dazed or overheated bosses don't hurt you
      if (e.st === "stun" || e.st === "dazed" || e.st === "hot" || e.inv > 0) { if (fromAbove) { pl.vy = -P.JUMP * 0.7; pl.jumps = 1; } return; }
      hurt(e); return;
    }
    if ((e.stomp || e.bounce) && fromAbove) {
      pl.vy = -P.JUMP * (key.J ? 0.95 : 0.7); pl.jumps = 1; pl.held = key.J;
      if (e.stomp) { e.dead = 0.6; e.vx = 0; gain(1); say("hit"); haptic("medium"); fx.push({ k: "spark", x: e.x, y: b.y0, t: 0.35 }); }
      else say("land");
      return;
    }
    if (e.hurt) hurt(e);
  }
  // ---------- bosses ----------
  function bossStompable(e) { return e.kind === "roller" ? e.st === "hot" : true; }
  function bossHit(e, ranged) {
    e.hp--; e.inv = 0.9; if (!ranged) { pl.vy = -P.JUMP * 0.95; pl.jumps = 1; pl.held = key.J; } say("hit"); haptic("heavy");
    for (let i = 0; i < 6; i++) fx.push({ k: "chip", x: e.x, y: e.y - e.h / 2, vx: (Math.random() - 0.5) * 400, vy: -200 - Math.random() * 300, t: 0.6, c: i % 2 ? "#ffd23f" : "#fff", s: 7 });
    if (e.hp <= 0) {
      e.st = "dead"; e.tt = 1.2; say("win"); haptic("success");
      for (let i = 0; i < 10; i++) ents.push({ k: "coin", x: e.x + (i - 4.5) * 20, y: e.y - 40 - (i % 3) * 18, x0: -1, y0: -1, w: 26, h: 26, alive: true, ph: 0 });
      arena.on = false; arena.done = true; toast("DRAWER UNLOCKED!");
    } else { e.st = "stun"; e.tt = 0.7; toast(e.hp === 1 ? "One more hit!" : e.hp + " hits to go!"); }
  }
  function startBoss() {
    arena.on = true; boss.st = "intro"; boss.tt = 1.1; boss.inv = 0;
    toast(boss.name + "!"); say("grab"); haptic("medium");
    const tip = { walker: "Stomp it on the head!", charger: "Jump over its charge, stomp it when it stops!", flyer: "Dodge the sparks. Stomp it when it swoops down!", roller: "Stay away until it overheats, then stomp!", magnet: "Don't get pulled in! Stomp it when it swoops!" }[boss.kind];
    setTimeout(() => mode === "play" && arena && arena.on && toast(tip), 1300);
  }
  function stepBoss(e, hd, dt) {
    if (arena && !arena.on && !arena.done && e.st === "wait" && pl.x > arena.l + 2 * T && mode === "play") startBoss();
    if (e.st === "wait") { e.y = (e.hy || e.home.y) + Math.sin(t * 2) * (e.hy ? 6 : 0); return; }
    if (e.st === "dead") { e.tt -= dt; e.y += 90 * dt; e.rot = (e.rot || 0) + dt * 6; if (e.tt <= 0) e.alive = false; return; }
    e.inv = Math.max(0, (e.inv || 0) - dt);
    const sp = e.spd * (1 + (e.max - e.hp) * 0.12), L0 = arena.l + T, R0 = arena.r - T;
    const ground = () => { e.vy = Math.min(1000, e.vy + 2400 * hd); e.y += e.vy * hd; if (e.y >= e.home.y) { const hard = e.vy > 380; e.y = e.home.y; e.vy = 0; return hard ? 2 : 1; } return 0; };
    const walls = () => { if (e.x < L0) { e.x = L0; return -1; } if (e.x > R0) { e.x = R0; return 1; } return 0; };
    e.tt -= hd;
    if (e.st === "intro") { if (e.tt <= 0) { e.st = "move"; e.tt = 1.2; } return; }
    if (e.st === "stun") { if (e.kind === "flyer" || e.kind === "magnet") { e.y = Math.max(e.y - 120 * hd, e.hy); } else ground(); if (e.tt <= 0) { e.st = "move"; e.tt = 1.0; } return; }
    e.face = pl.x < e.x ? -1 : 1;
    switch (e.kind) {
      case "walker": // waddles at you, hops now and then
        e.x += e.face * 95 * sp * hd; walls();
        if (ground() && e.tt <= 0) { e.vy = -760; e.tt = 1.7 / sp; puff(e.x, e.y, 4, "#ddd"); }
        break;
      case "charger": // stares, shakes, then charges across the arena and smacks the wall
        ground();
        if (e.st === "move") { if (e.tt <= 0) { e.st = "wind"; e.tt = 0.55; e.dir = e.face; } }
        else if (e.st === "wind") { e.shake = 1; if (e.tt <= 0) { e.st = "charge"; e.shake = 0; } }
        else if (e.st === "charge") { e.x += e.dir * 430 * sp * hd; if (walls()) { e.st = "dazed"; e.tt = 1.3; say("hit"); haptic("medium"); puff(e.x + e.dir * 30, e.y - 30, 8, "#fff"); } }
        else if (e.st === "dazed") { if (e.tt <= 0) { e.st = "move"; e.tt = 0.9 / sp; } }
        break;
      case "flyer": case "magnet": // hovers high and drops sparks; every few seconds swoops down low
        if (e.kind === "magnet" && e.st !== "swoop") { const d = e.x - pl.x; if (Math.abs(d) < 9 * T && pl.ground) pl.x += Math.sign(d) * 70 * sp * dt; }
        if (e.st === "move") {
          e.x += ((Math.sin(t * 0.9 * sp) * 0.5 + 0.5) * (R0 - L0) + L0 - e.x) * 2 * hd; e.y = e.hy + Math.sin(t * 3) * 10;
          e.drop = (e.drop || 1.2) - hd;
          if (e.drop <= 0) { e.drop = (e.kind === "magnet" ? 1.1 : 1.5) / sp; ents.push({ k: "bolt", x: e.x, y: e.y, vx: (pl.x - e.x) * 0.25, vy: 0, w: 22, h: 22, x0: 0, y0: 0, alive: true, hurt: 1, art: e.kind === "magnet" ? "screw" : "nut" }); }
          if (e.tt <= 0) { e.st = "swoop"; e.tx = Math.max(L0, Math.min(R0, pl.x)); e.tt = 2.2; }
        } else if (e.st === "swoop") {
          const low = e.gy - 8; e.x += (e.tx - e.x) * 3 * hd; e.y += (low - e.y) * 3.2 * hd;
          if (e.tt <= 0) { e.st = "rise"; }
        } else if (e.st === "rise") { e.y += (e.hy - e.y) * 3 * hd; if (Math.abs(e.y - e.hy) < 6) { e.st = "move"; e.tt = 3.4 / sp; } }
        break;
      case "roller": // bounces around the arena; after a while it overheats and sits still: stomp it then
        if (e.st === "move") {
          if (!e.vx) e.vx = e.face * 260;
          e.x += e.vx * sp * hd; const w = walls(); if (w) { e.vx = -w * 260; say("land"); }
          const g = ground(); if (g === 2) e.vy = -520; else if (g && Math.random() < hd * 1.2) e.vy = -650;
          e.rot = (e.rot || 0) + e.vx * hd / 30;
          if (e.tt <= -2.8 / sp) { e.st = "hot"; e.tt = 2.8; e.vx = 0; toast("It's overheating! Stomp it!"); }
        } else if (e.st === "hot") { ground(); e.shake = 1; if (e.tt <= 0) { e.st = "move"; e.tt = 0; e.shake = 0; } }
        break;
    }
  }
  function givePower(k) {
    say("power"); haptic("success");
    if (k === "shield") pow.shield = 1;
    else if (k === "heart") { maxHp = 4; hp = Math.min(maxHp, hp + 1); hudKey = ""; }
    else {
      // only one action power at a time: the button does one thing
      if (k === "wrench") pow.pound = 0; if (k === "pound") pow.wrench = 0;
      pow[k] = PU[k][0];
    }
    toast(PU[k][1] + (PU[k][1].endsWith("!") ? "" : "!"));
  }
  // ---- action button: wrench toss / ground pound ----
  let throwCD = 0, actKey = "";
  function actBtn() {
    const k = pow && pow.wrench > 0 ? "wrench" : pow && pow.pound > 0 ? "pound" : "";
    if (k === actKey || !root) return;
    actKey = k;
    const b = root.querySelector(".lta"), pad = root.querySelector(".ltpad");
    pad.classList.toggle("act", !!k);
    if (k) { b.querySelector("img").src = "lt/pu-" + k + ".webp"; b.querySelector("span").textContent = k === "wrench" ? "THROW" : "POUND"; }
    else key.A = false;
  }
  function action() {
    if (mode !== "play" || !pow) return;
    if (pow.wrench > 0 && throwCD <= 0) {
      throwCD = 0.28; say("flap"); haptic("light");
      ents.push({ k: "wrench", x: pl.x + pl.face * 20, y: pl.y - 26, vx: pl.face * 640 + pl.vx * 0.3, vy: -140, w: 30, h: 30, alive: true, life: 1.1, rot: 0, x0: 0, y0: 0 });
    } else if (pow.pound > 0 && !pl.ground && !pl.pounding) {
      pl.pounding = true; pl.vx = 0; pl.vy = 1150; say("hit");
    }
  }
  function wrenchStep(e, dt) {
    e.life -= dt; e.rot += dt * 18 * Math.sign(e.vx || 1);
    e.vy += 500 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.life <= 0 || isSolid(cell(Math.floor(e.x / T), Math.floor(e.y / T)))) { e.alive = false; fx.push({ k: "spark", x: e.x, y: e.y, t: 0.25 }); return; }
    for (const o of ents) {
      if (!o.alive || o === e || o.dead) continue;
      const b = { x0: o.x - o.w / 2, x1: o.x + o.w / 2, y0: o.y - o.h, y1: o.y };
      if (e.x < b.x0 - 10 || e.x > b.x1 + 10 || e.y < b.y0 - 10 || e.y > b.y1 + 10) continue;
      if (o.k === "boss") { if (o.st !== "wait" && o.st !== "dead" && (o.inv || 0) <= 0 && bossStompable(o)) { bossHit(o, true); e.alive = false; } continue; }
      if (o.stomp || o.walker || o.fly || o.bounce) { o.dead = 0.6; o.vx = 0; gain(1); say("hit"); fx.push({ k: "spark", x: o.x, y: b.y0, t: 0.35 }); e.alive = false; return; }
    }
  }
  function poundImpact() {
    pl.pounding = false; shakeT = 0.3; say("hit"); haptic("heavy");
    fx.push({ k: "pound", x: pl.x, y: pl.y, t: 0.45 });
    for (const o of ents) {
      if (!o.alive || o.dead) continue;
      const near = Math.abs(o.x - pl.x) < 3 * T && Math.abs(o.y - pl.y) < 1.5 * T;
      if (!near) continue;
      if (o.k === "boss") { if (o.st !== "wait" && o.st !== "dead" && (o.inv || 0) <= 0 && bossStompable(o)) bossHit(o, true); continue; }
      if (o.stomp || o.walker || o.bounce) { o.dead = 0.6; o.vx = 0; gain(1); fx.push({ k: "spark", x: o.x, y: o.y - o.h, t: 0.35 }); }
    }
    const cy = Math.floor(pl.y / T), cx = Math.floor(pl.x / T);
    for (let x = cx - 1; x <= cx + 1; x++) for (const y of [cy, cy - 1]) { const ch = cell(x, y); if (ch === "C") bonk(x, y, ch); }
  }
  function puff(x, y, n, c) { for (let i = 0; i < n; i++) fx.push({ k: "chip", x, y: y - 4, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 90, t: 0.35, c, s: 5 }); }

  // ---------- drawer sequence ----------
  let exitEnt = null;
  function enterDrawer(e) {
    mode = "drawer"; drawerT = 0; exitEnt = e; pl.vx = 0; say("grab"); haptic("success");
    chase = null;
  }
  function finishLevel() {
    const s = load(), first = !s.done.includes(lvI);
    if (first) s.done.push(lvI);
    s.coins[lvI] = Math.max(s.coins[lvI] || 0, coinsRun);
    let golden = false;
    if (lvI === 4 && !tester() && !s.golden) {
      s.golden = true; golden = true;
      try {
        const own = JSON.parse(localStorage.getItem("tenmm-skins") || '["chrome"]');
        if (!own.includes("golden10")) own.push("golden10");
        localStorage.setItem("tenmm-skins", JSON.stringify(own));
      } catch (e) {}
    }
    store(s);
    // coins go into the main wallet
    try { totalCoins += coinsRun; localStorage.setItem("tenmm-coins", totalCoins); const cc = document.getElementById("coinsCount"); if (cc) cc.textContent = totalCoins; } catch (e) {}
    clearInfo = { first, golden, coins: coinsRun, time: t };
    showClear();
  }

  // ---------- loop ----------
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (mode === "play" || mode === "respawn" || mode === "drawer" || mode === "intro" || mode === "warp") {
      acc += dt;
      while (acc >= STEP) { tick(STEP); acc -= STEP; }
    }
    draw();
  }
  function tick(dt) {
    msgT -= dt;
    if (msgT <= 0 && hud.Msg.classList.contains("on")) hud.Msg.classList.remove("on");
    for (const k of TIMED) if (pow[k] > 0) pow[k] = Math.max(0, pow[k] - dt);
    throwCD -= dt; if (shakeT > 0) shakeT -= dt;
    actBtn();
    timeScale = pow.slow > 0 ? 0.5 : 1;
    for (const f of fx) { f.t -= dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 900 * dt; } if (f.k === "coinpop") f.y -= 120 * dt; }
    fx = fx.filter((f) => f.t > 0);
    if (mode === "intro") { drawerT += dt; stepEnts(dt); if (drawerT > 1.1) { mode = "play"; pl.inv = 0.6; } updHud(); return; }
    if (mode === "respawn") { drawerT -= dt; if (drawerT <= 0) { mode = "play"; const s = pow.shield; spawnPlayer(); pow.shield = s; resetHazards(); } updHud(); return; }
    if (mode === "warp") {
      drawerT += dt;
      const e = exitEnt;
      pl.x += (e.x - pl.x) * 0.15; pl.y += (e.y - 20 - pl.y) * 0.15;
      if (drawerT > 0.7) { if (e.k === "warp") enterRoom(e); else leaveRoom(); }
      updHud(); return;
    }
    if (mode === "drawer") {
      drawerT += dt;
      const e = exitEnt, tx = e.x, ty = e.y - 28;
      if (drawerT < 0.45) { pl.x += (tx - pl.x) * 0.12; pl.y += (ty - pl.y) * 0.12; }
      if (drawerT > 2.0) { mode = "clear"; finishLevel(); }
      updHud(); return;
    }
    pl.inv -= dt; pl.hitT -= dt; pl.landT -= dt; pl.djT -= dt;
    stepPlayer(dt);
    stepEnts(dt);
    // camera: follow, but don't drift back unless the player really heads back.
    // In a boss fight it zooms out a little and frames the whole arena.
    const zT = arena && arena.on ? Math.max(0.74, Math.min(1, viewW / (arena.r - arena.l + T / 2))) : 1;
    zoom += (zT - zoom) * Math.min(1, dt * 3);
    const vw = VW();
    if (arena && arena.on) cam += ((arena.l + arena.r) / 2 - vw / 2 - cam) * Math.min(1, dt * 4);
    else {
      const lo = cam + vw * 0.3, hi = cam + vw * 0.5;
      if (pl.x > hi) cam += (pl.x - hi);
      else if (pl.x < lo) cam -= (lo - pl.x);
    }
    cam = Math.max(0, Math.min(W * T - vw, cam));
    stepCrumbles(dt);
    updHud();
  }
  function resetHazards() {
    // put moving hazards back where they started so a respawn is fair
    for (const e of ents) if (e.walker) { if (!e.dead && e.alive) { e.x = e.x0; e.y = e.y0; e.vy = 0; } }
    for (const e of ents) if (e.k === "chaseOn" && pl.x < e.x) e.used = 0;
    chase = null;
    ents = ents.filter((e) => e.k !== "bolt");
    for (const e of ents) if (e.k === "diver") { e.st = "hover"; e.y = e.hy; }
    if (boss && arena && !arena.done) { Object.assign(boss, { st: "wait", hp: boss.max, x: boss.home.x, y: boss.hy || boss.home.y, vx: 0, vy: 0, inv: 0, tt: 0, shake: 0, alive: true }); arena.on = false; }
  }
  let hudKey = "";
  function updHud() {
    const k = hp + "|" + pow.shield;
    if (k !== hudKey) { hudKey = k; hud.Hp.innerHTML = "●".repeat(Math.max(0, hp)).split("").map(() => '<i class="on"></i>').join("") + '<i></i>'.repeat(Math.max(0, maxHp - hp)) + (pow.shield ? '<span class="ltshield"><img src="lt/pu-shield.webp" alt="shield">1 HIT</span>' : ""); }
    const list = TIMED.filter((p) => pow[p] > 0).map((p) => { const f = Math.round(Math.min(1, pow[p] / PU[p][0]) * 25) * 4, n = Math.ceil(pow[p]); return '<span class="pw' + (n <= 2 ? " low" : "") + '" style="--p:' + f + '%"><img src="lt/pu-' + p + '.webp" alt=""><b>' + n + "</b></span>"; }).join("");
    if (hud.Pow._v !== list) { hud.Pow.innerHTML = list; hud.Pow._v = list; }
    const bb = root.querySelector("#ltBoss"), showB = boss && arena && arena.on && boss.st !== "dead";
    bb.classList.toggle("on", !!showB);
    if (showB) { const k2 = boss.name + boss.hp; if (bb._v !== k2) { bb._v = k2; bb.innerHTML = "<b>" + boss.name + "</b><span>" + '<i class="on"></i>'.repeat(boss.hp) + "<i></i>".repeat(boss.max - boss.hp) + "</span>"; } }
  }
  function toast(m) { hud.Msg.textContent = m; hud.Msg.classList.add("on"); msgT = 1.8; }

  // ---------- drawing ----------
  function draw() {
    if (!ctx || !grid) return;
    const H = ROWS * T;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0d141d"; ctx.fillRect(0, 0, cv.width, cv.height);
    const vw = VW(), oy = cv.height / (scale * zoom) - H;
    ctx.setTransform(scale * zoom, 0, 0, scale * zoom, 0, 0);
    ctx.translate(0, oy);
    // background panorama with parallax
    if (ready(bgImg)) {
      // the panorama's own floor line (~76% down) sits behind our ground (row 11), and it's
      // dimmed so nothing in the background reads as something you can touch
      const bh = (H + oy) * 1.11, bw = (bgImg.naturalWidth / bgImg.naturalHeight) * bh;
      let bx = -(cam * 0.35) % bw;
      for (; bx < vw; bx += bw) ctx.drawImage(bgImg, bx, -oy, bw, bh);
      ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = inRoom ? "rgba(128,128,128,.3)" : "rgba(128,128,128,.55)"; ctx.fillRect(0, -oy, vw, H + oy); ctx.restore();
      ctx.fillStyle = inRoom ? "rgba(14,8,4,.5)" : "rgba(10,16,28,.64)"; ctx.fillRect(0, -oy, vw, H + oy);
    }
    ctx.save(); ctx.translate(-Math.round(cam) + (shakeT > 0 ? (Math.random() - 0.5) * 12 : 0), shakeT > 0 ? (Math.random() - 0.5) * 10 : 0);
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(W - 1, Math.ceil((cam + vw) / T) + 1);
    for (let y = 0; y < ROWS; y++) for (let x = c0; x <= c1; x++) drawCell(x, y, grid[y][x]);
    // the drawer you came out of
    if (!inRoom && Math.abs(startPos.x - cam - vw / 2) < vw) { ctx.globalAlpha = 0.9; fitImg(mode === "intro" ? "drawer1" : "drawer3", startPos.x - 6, startPos.y, 92); ctx.globalAlpha = 1; }
    for (const m of movers) drawMover(m);
    for (const e of ents) if (e.alive && e.x > cam - 200 && e.x < cam + vw + 200) drawEnt(e);
    drawPlayer();
    for (const f of fx) drawFx(f);
    if (chase) drawChase();
    if (inRoom) { // pipe ceiling over the secret room (falls back to plain rock until the art loads)
      const ci = img("room-ceil"), S = 4 * T, x0 = Math.floor(cam / S) * S;
      ctx.fillStyle = "#1b120b"; ctx.fillRect(cam - 2, -oy - 2, vw + 4, oy + 2 * T + 2);
      if (ready(ci)) for (let y = 2 * T - S; y > -oy - S; y -= S) for (let x = x0; x < cam + vw; x += S) ctx.drawImage(ci, x, y, S + 0.5, S + 0.5);
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(cam - 2, 2 * T - 4, vw + 4, 4);
      // on wide screens the room is narrower than the view: solid rock past the back wall
      if (cam + vw > W * T) { ctx.fillStyle = "#1b120b"; ctx.fillRect(W * T, 2 * T, cam + vw - W * T + 2, H - 2 * T); ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(W * T, 2 * T, 6, H - 2 * T); }
    }
    ctx.restore();
    if (mode === "respawn") { ctx.fillStyle = "rgba(0,0,0," + Math.min(0.85, 1 - drawerT) + ")"; ctx.fillRect(0, -oy, vw, H + oy); }
  }
  function drawCell(x, y, ch) {
    if (ch === "." || ch === "H") return;
    const X = x * T, Y = y * T, b = fx.find((f) => f.k === "bump" && f.cx === x && f.cy === y), dy = b ? -8 * Math.sin((b.t / 0.15) * Math.PI) : 0;
    const top = !isSolid(cell(x, y - 1));
    switch (ch) {
      case "#":
        if (inRoom && y >= ROWS - 2) { // secret room floor: one wet-concrete strip, yellow line down the middle, repeating every 4 cells
          const fl = img("room-floor");
          if (ready(fl)) { const n = fl.naturalWidth / 4; ctx.drawImage(fl, (x % 4) * n, fl.naturalHeight / 4 + (y - (ROWS - 2)) * n, n, n, X, Y, T + 0.5, T + 0.5); return; }
        }
        if (top) { const im = img("t-square"); if (ready(im)) ctx.drawImage(im, X, Y, T + 0.5, T + 0.5); }
        else { ctx.fillStyle = (x + y) % 2 ? "#3b424c" : "#363d46"; ctx.fillRect(X, Y, T + 0.5, T + 0.5); ctx.fillStyle = "#2a3038"; ctx.fillRect(X, Y + T - 3, T, 3); }
        return;
      case "=": drawImg("t-redbox", X, Y + dy, T, T); return;
      case "-": { const im = img("t-bench"); if (ready(im)) ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.42, X - 1, Y, T + 2, 18); return; }
      case "C": drawImg("t-crate", X, Y + dy, T, T); return;
      case "?": case "U": drawImg("qblock", X, Y + dy, T, T); return;
      case "S": drawImg("usedblk", X, Y + dy, T, T); return;
      case "i": {
        const im = img("t-square"); if (top && ready(im)) ctx.drawImage(im, X, Y, T + 0.5, T + 0.5); else { ctx.fillStyle = "#363d46"; ctx.fillRect(X, Y, T + 0.5, T + 0.5); }
        const c = SLICK[window.LT_LEVELS[lvI].bg] || ["rgba(40,20,0,.55)", "#ffcf6e"];
        if (top) { ctx.fillStyle = c[0]; ctx.fillRect(X, Y, T + 0.5, 12); ctx.fillStyle = c[1]; ctx.globalAlpha = 0.7; ctx.fillRect(X + ((x * 13) % 30), Y + 3, 10, 2); ctx.globalAlpha = 1; }
        return;
      }
      case "q": {
        const cr = crumbles.find((k) => k.cx === x && k.cy === y), sh = cr && cr.t > 0 ? (Math.random() - 0.5) * 4 : 0;
        runImg(cr && cr.t > 0 ? "ob-ledge-cracked" : "ob-ledge", x, y, "q", X + sh, Y - 2, 30);
        return;
      }
      case "D": drawImg("drum", X + 2, Y, T - 4, T); return;
      case ">": case "<": {
        ctx.fillStyle = "#2a3038"; ctx.fillRect(X, Y + 18, T, T - 18);
        runImg("ob-conveyor", x, y, ch, X, Y - 2, 30);
        { ctx.save(); ctx.beginPath(); ctx.rect(X, Y, T, 12); ctx.clip(); ctx.fillStyle = "rgba(255,210,63,.85)"; const off = ((t * 95) % 16) * (ch === ">" ? 1 : -1); for (let i = -1; i < 4; i++) { const cx = X + i * 16 + off, d = ch === ">" ? 1 : -1; ctx.beginPath(); ctx.moveTo(cx, Y + 3); ctx.lineTo(cx + 5 * d, Y + 6); ctx.lineTo(cx, Y + 9); ctx.fill(); } ctx.restore(); }
        return;
      }
    }
  }
  // draw one tile of a run using left cap / middle / right cap slices of a wide piece of art
  function runImg(k, x, y, ch, X, Y, h) {
    const im = img(k); if (!ready(im)) return;
    const same = (c) => c === ch || (ch === ">" && c === "<") || (ch === "<" && c === ">");
    const l = !same(cell(x - 1, y)), r = !same(cell(x + 1, y)), iw = im.naturalWidth, ih = im.naturalHeight, cap = iw * 0.22;
    const sx = l && r ? 0 : l ? 0 : r ? iw - cap * 1.6 : cap, sw = l && r ? iw : l || r ? cap * 1.6 : iw - cap * 2;
    ctx.drawImage(im, sx, 0, sw, ih, X, Y, T + 0.5, h);
  }
  function drawImg(k, x, y, w, h) { const im = img(k); if (ready(im)) ctx.drawImage(im, x, y, w, h); }
  function fitImg(k, cx, by, w) { const im = img(k); if (!ready(im)) return; const h = (w * im.naturalHeight) / im.naturalWidth; ctx.drawImage(im, cx - w / 2, by - h, w, h); }
  function drawMover(m) {
    const im = img("ob-scissor"); if (!ready(im)) return;
    const iw = im.naturalWidth, ih = im.naturalHeight, topH = ih * 0.3;
    if (m.k === "lift") {
      // scissor legs stretch down from the deck to its base below
      const base = m.y0 + 40, legH = Math.max(10, base - m.y - 22);
      ctx.drawImage(im, 0, topH, iw, ih * 0.5, m.x + 8, m.y + 18, m.w - 16, legH);
      ctx.drawImage(im, 0, ih * 0.8, iw, ih * 0.2, m.x + 2, m.y + 18 + legH - 4, m.w - 4, 14);
    }
    ctx.drawImage(im, 0, 0, iw, topH, m.x - 3, m.y - 2, m.w + 6, 24);
  }
  function drawEnt(e) {
    const b = box(e);
    switch (e.k) {
      case "star": { const im = img("star"); if (!ready(im)) return; const bob = Math.sin(t * 3 + e.x0) * 4, w = 34;
        ctx.save(); ctx.globalAlpha = e.ghost ? 0.35 : 1; ctx.translate(e.x, e.y - 17 + bob); ctx.rotate(Math.sin(t * 2 + e.x0) * 0.15);
        if (!e.ghost) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 5); ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.drawImage(im, -w / 2, -w / 2, w, w); ctx.restore(); return; }
      case "warp": case "warpback": {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.25 * pulse; ctx.fillStyle = "#6fb6ff"; ctx.beginPath(); ctx.ellipse(e.x, e.y - 30, 46, 40, 0, 0, 7); ctx.fill(); ctx.restore();
        fitImg(e.k === "warp" ? "warp" : "warpback", e.x, e.y + 2, e.k === "warp" ? 70 : 66);
        if (e.k === "warpback") { ctx.fillStyle = "#cfe8ff"; ctx.font = "900 13px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.fillText("▲", e.x, e.y - 72 - pulse * 5); }
        return; }
      case "gchest": {
        if (!e.open) { ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 5); ctx.fillStyle = "#ffd34d"; ctx.beginPath(); ctx.ellipse(e.x, e.y - 26, 44, 34, 0, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.save(); if (e.open) ctx.globalAlpha = 0.55; fitImg("chest-gold", e.x, e.y + 2, 60); ctx.restore(); return; }
      case "coin": { const s = Math.abs(Math.cos(t * 3 + e.x0 * 0.01)); const im = img("coin"); if (ready(im)) ctx.drawImage(im, e.x - 13 * Math.max(0.25, s), e.y - 26, 26 * Math.max(0.25, s), 26); return; }
      case "pan": fitImg("pan", e.x, e.y + 2, 46); return;
      case "tire": case "jack": case "creeper": case "toolcart": {
        const k = e.k, w = { tire: 38, jack: 54, creeper: 56, toolcart: 58 }[k];
        ctx.save(); ctx.translate(e.x, e.y);
        if (e.dead) { ctx.scale(1, 0.4); ctx.globalAlpha = Math.max(0, e.dead / 0.6); }
        if (k === "tire") { ctx.translate(0, -17); ctx.rotate(e.rot || 0); fitImg("tire", 0, 19, w); }
        else { if (e.vx > 0) ctx.scale(-1, 1); fitImg(k, 0, 2, w); }
        ctx.restore(); return;
      }
      case "piston": { const im = img("tool-piston.webp"); ctx.fillStyle = "#6d7682"; ctx.fillRect(e.x - 6, e.y, 12, e.y0 - e.y); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(e.x - 6, e.y, 12, e.y0 - e.y); if (ready(im)) { ctx.save(); ctx.translate(e.x, e.y - 30); ctx.rotate(-Math.PI / 2); const w = 70, h = (w * im.naturalHeight) / im.naturalWidth; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); } return; }
      case "gear": { const im = img("gear"); if (ready(im)) { ctx.save(); ctx.translate(e.x, e.y - 20); ctx.rotate(e.rot || 0); ctx.drawImage(im, -24, -24, 48, 48); ctx.restore(); } return; }
      case "chain": {
        ctx.strokeStyle = "#9aa3ad"; ctx.lineWidth = 4; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(e.ax, e.ay); ctx.lineTo(e.x, e.y - e.h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#545c66"; ctx.fillRect(e.ax - 14, e.ay - 8, 28, 10);
        fitImg("hoist", e.x, e.y + 4, 54); return;
      }
      case "drop": {
        if (e.warn && !e.falling) { const gy = groundBelow(e.col); ctx.fillStyle = "rgba(255,60,40," + (0.25 + 0.25 * Math.sin(t * 20)) + ")"; ctx.beginPath(); ctx.ellipse(e.col, gy - 3, 20, 6, 0, 0, 7); ctx.fill(); }
        if (e.falling) fitImg(e.kind || "nut", e.x, e.y, 30);
        return;
      }
      case "nut": case "drone": {
        ctx.save(); ctx.translate(e.x, e.y - e.h / 2);
        if (e.dead) { ctx.scale(1, 0.5); ctx.globalAlpha = Math.max(0, e.dead / 0.6); }
        if (e.k === "nut") ctx.rotate(Math.sin(e.rot) * 0.3); else if (e.vx > 0) ctx.scale(-1, 1);
        ctx.scale(1, 1 + Math.sin(t * 40) * 0.015);
        fitImg(e.k === "nut" ? "fly-nut" : "fly-drone", 0, e.h / 2 + 6, e.k === "nut" ? 50 : 64);
        ctx.restore(); return;
      }
      case "diver": {
        const sx = e.shake ? (Math.random() - 0.5) * 5 : 0;
        { const im = img("fly-screw"); if (ready(im)) { const w = 30, h = (w * im.naturalHeight) / im.naturalWidth;
          ctx.strokeStyle = "#7d858f"; ctx.lineWidth = 4; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(e.x, -40); ctx.lineTo(e.x, e.y - h + 4); ctx.stroke(); ctx.setLineDash([]);
          ctx.drawImage(im, e.x + sx - w / 2, e.y - h, w, h); } }
        if (e.st === "hover" && Math.abs(pl.x - e.x) < 160) { ctx.fillStyle = "rgba(255,60,40,.22)"; ctx.fillRect(e.x - 18, e.y, 36, groundBelow(e.x) - e.y); }
        return;
      }
      case "zap": {
        const y = e.y, x0 = e.x - T / 2;
        { const on = e.on, im = img(on ? "ob-zap-on" : "ob-zap-off"); if (ready(im)) { const w = T + 2, h = (w * im.naturalHeight) / im.naturalWidth; ctx.drawImage(im, x0 - 1, y - h + (on ? 4 : 2), w, h); } }
        if (e.warn) {
          ctx.strokeStyle = e.on ? "#bfe9ff" : "rgba(120,190,255,.5)"; ctx.lineWidth = e.on ? 3 : 2; ctx.beginPath();
          for (let k = 0; k < (e.on ? 3 : 1); k++) { let px = x0 + 4, py = y - 4; ctx.moveTo(px, py); for (let s2 = 0; s2 < 6; s2++) { px += (T - 8) / 6; py = y - 4 - Math.random() * (e.on ? 26 : 10); ctx.lineTo(px, py); } }
          ctx.stroke();
          if (e.on) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(90,170,255,.25)"; ctx.fillRect(x0, y - 30, T, 30); ctx.restore(); }
        }
        return;
      }
      case "bolt": fitImg(e.art || "nut", e.x, e.y + 11, 24); return;
      case "boss": {
        const art = (lvI >= 5 ? "bossb-" : "bossa-") + BOSS_ART[e.kind], sh = e.shake || e.st === "wind" || e.st === "hot" ? (Math.random() - 0.5) * 6 : 0;
        if (e.st === "wait" && !(arena && arena.on)) { ctx.globalAlpha = 0.95; }
        ctx.save(); ctx.translate(e.x + sh, e.y);
        if (e.inv > 0 && Math.floor(e.inv * 16) % 2) ctx.globalAlpha = 0.4;
        if (e.st === "hot") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,80,30," + (0.3 + 0.2 * Math.sin(t * 20)) + ")"; ctx.beginPath(); ctx.arc(0, -e.h / 2, e.w * 0.75, 0, 7); ctx.fill(); ctx.restore(); }
        if (e.kind === "roller") { ctx.translate(0, -e.h / 2); ctx.rotate(Math.sin(e.rot || 0) * 0.35); fitImg(art, 0, e.h / 2 + 8, e.w + 62); }
        else if (e.kind === "flyer" || e.kind === "magnet") { ctx.rotate(Math.sin(t * 2) * 0.08); fitImg(art, 0, 12, e.w + 62); }
        else { if (e.face > 0 && e.kind === "charger") ctx.scale(-1, 1); if (e.st === "dead") ctx.rotate(e.rot || 0); fitImg(art, 0, 4, e.w + 62); }
        ctx.restore(); ctx.globalAlpha = 1;
        if (e.st === "stun" || e.st === "dazed") for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; fitImg("star", e.x + Math.cos(a) * 34, e.y - e.h - 6 + Math.sin(a) * 8, 18); }
        return;
      }
      case "wrench": { const im = img("wrench"); if (!ready(im)) return; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.drawImage(im, -24, -16, 48, 32); ctx.restore(); return; }
      case "pu": { const y = e.y - e.rise * 34; fitImg("pu-" + e.pu, e.x, y + Math.sin(t * 4) * 2, 36); return; }
      case "check": fitImg(e.on ? "ob-flag-green" : "ob-flag-red", e.x + 14, e.y + 2, 62); return;
      case "spring": { const s = e.squash > 0 ? 0.6 : 1; e.squash = (e.squash || 0) - 1 / 60; const im = img("spring"); if (ready(im)) ctx.drawImage(im, e.x - 24, e.y - 30 * s, 48, 30 * s); return; }
      case "exit": {
        const near = Math.abs(pl.x - e.x) < 260 || mode === "drawer";
        let k = near ? "drawer1" : "drawer0";
        if (mode === "drawer") k = drawerT < 0.5 ? "drawer1" : drawerT < 1.1 ? "drawer2" : "drawer3";
        if (near && mode !== "drawer") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,200,60," + (0.12 + 0.08 * Math.sin(t * 5)) + ")"; ctx.beginPath(); ctx.arc(e.x, e.y - 40, 90, 0, 7); ctx.fill(); ctx.restore(); }
        const locked = arena && !arena.done;
        if (locked) k = "drawer0";
        fitImg(k, e.x, e.y, 112);
        if (locked && ready(img("ob-chain"))) fitImg("ob-chain", e.x, e.y - 22, 118);
        else if (locked) { ctx.strokeStyle = "#2b2f35"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(e.x - 52, e.y - 90); ctx.lineTo(e.x + 52, e.y - 20); ctx.moveTo(e.x + 52, e.y - 90); ctx.lineTo(e.x - 52, e.y - 20); ctx.stroke(); ctx.strokeStyle = "#c9ced4"; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#ffd23f"; ctx.fillRect(e.x - 12, e.y - 64, 24, 20); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(e.x - 12, e.y - 64, 24, 20); ctx.beginPath(); ctx.arc(e.x, e.y - 64, 8, Math.PI, 0); ctx.stroke(); }
        ctx.fillStyle = "#000"; ctx.font = "900 15px system-ui,sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = lvI === 3 ? "#ffd23f" : "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
        const lab = arena && !arena.done ? "BEAT THE BOSS" : lvI === 3 ? "GOLDEN DRAWER" : lvI === NLV() - 1 ? "THE GRAND CHEST" : "DRAWER " + (lvI + 2);
        ctx.strokeText(lab, e.x, e.y - 112); ctx.fillText(lab, e.x, e.y - 112);
        return;
      }
    }
  }
  function groundBelow(x) { const cx = Math.floor(x / T); for (let y = 0; y < ROWS; y++) { const ch = cell(cx, y); if (isSolid(ch) || SEMI.includes(ch)) return y * T; } return ROWS * T; }
  function drawChase() {
    const im = img("magnet"); const x = chase.x, y = ROWS * T * 0.55 + Math.sin(t * 6) * 10;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,60,60,.12)"; ctx.fillRect(x - 600, 0, 680, ROWS * T); ctx.restore();
    if (ready(im)) { const w = 170, h = (w * im.naturalHeight) / im.naturalWidth; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); }
  }
  // face-look anchors per upright frame (frame px): eyes x,y  mouth x,y  top x,y,w  side x,y
  const UFACE = {
    "u-idle_01": [160, 134, 155, 160, 148, 50, 105, 204, 120],
    "u-idle_02": [162, 131, 152, 160, 137, 50, 112, 201, 117],
    "u-run_01": [165, 138, 160, 168, 150, 63, 110, 211, 128],
    "u-run_02": [167, 135, 154, 168, 147, 60, 110, 210, 123],
    "u-run_03": [165, 142, 155, 172, 155, 52, 110, 211, 130],
    "u-run_04": [170, 145, 160, 172, 147, 57, 105, 211, 132],
    "u-jump": [152, 138, 150, 168, 132, 63, 112, 198, 128],
    "u-double_jump": [155, 140, 155, 168, 128, 82, 100, 193, 133],
    "u-fall": [165, 132, 155, 160, 148, 52, 110, 208, 117],
    "u-land": [167, 162, 157, 192, 142, 77, 112, 211, 150],
    "u-hurt": [150, 143, 150, 168, 120, 68, 105, 191, 128],
    "u-victory": [165, 98, 162, 128, 140, 28, 110, 201, 88]
  };
  const UTILT = { "u-double_jump": -0.15, "u-hurt": -0.3 }; // radians, socket leans back on these frames
  function lookAnchors(name) {
    const a = UFACE[name]; if (!a) return null;
    return { eyes: [a[0], a[1], 88], mouth: [a[2], a[3], 68], top: [a[4], a[5], a[6]], side: [a[7], a[8], 80], body: [150, 150, 200] };
  }
  function wornLooks() {
    if (typeof LOOKS === "undefined" || typeof equippedLooks !== "function") return [];
    const eq = equippedLooks();
    return Object.values(eq).map((id) => LOOKS.find((l) => l.id === id)).filter((L) => L && lookImgs[L.id] && lookImgs[L.id].naturalWidth);
  }
  function drawLooks(name, k, w, h, aura) {
    const F = lookAnchors(name); if (!F) return;
    for (const L of wornLooks()) {
      if ((L.slot === "aura") !== aura) continue;
      const im = lookImgs[L.id];
      if (aura) {
        const [cx, cy, bh] = F.body, ph = bh * L.at[1] * k, pw = (im.naturalWidth * ph) / im.naturalHeight;
        ctx.drawImage(im, -w / 2 + cx * k + ph / 2 - pw, -h + cy * k - ph / 2, pw, ph);
        continue;
      }
      const [an, ws, dy, md] = L.at, [ax, ay, aw] = F[an];
      const pw = aw * ws * k, ph = (im.naturalHeight * pw) / im.naturalWidth, cy = -h + (ay + dy * aw) * k;
      const tilt = UTILT[name] || 0;
      if (tilt) { const px = -w / 2 + ax * k, py = cy; ctx.save(); ctx.translate(px, py); ctx.rotate(tilt); ctx.translate(-px, -py); }
      ctx.drawImage(im, -w / 2 + ax * k - pw / 2, md === "c" ? cy - ph / 2 : md === "b" ? cy - ph : cy, pw, ph);
      if (tilt) ctx.restore();
    }
  }
  function drawPlayer() {
    if (mode === "drawer" && drawerT > 0.5) return;
    if (pl.inv > 0 && mode === "play" && Math.floor(pl.inv * 14) % 2) return;
    let set = "idle", fi = 0;
    pl.anim += 1 / 60;
    if (mode === "intro") { set = "win"; fi = Math.min(2, Math.floor(drawerT * 4)); }
    else if (mode === "drawer") { set = "jump"; fi = 2; }
    else if (pl.hitT > 0) { set = "hit"; fi = Math.floor((0.45 - pl.hitT) * 7) % 3; }
    else if (!pl.ground) {
      if (pl.djT > 0) { set = "djump"; fi = Math.min(2, Math.floor((0.4 - pl.djT) * 8)); }
      else if (pl.vy < -150) { set = "jump"; fi = pl.vy < -450 ? 0 : 1; }
      else if (pl.vy < 150) { set = "jump"; fi = 2; }
      else { set = "fall"; fi = Math.floor(pl.anim * 8) % 2; }
    } else if (pl.landT > 0) { set = "land"; fi = pl.landT > 0.07 ? 0 : 1; }
    else if (Math.abs(pl.vx) > 25) { set = "run"; pl.rp = (pl.rp || 0) + Math.abs(pl.vx) / 60 / 26; fi = Math.floor(pl.rp) % 6; }
    else { set = "idle"; fi = Math.floor(pl.anim * 5) % 4; }
    const im = img(FR[set][fi]);
    if (!ready(im)) return;
    let s = 1;
    if (mode === "intro") s = Math.min(1, drawerT * 2.2);
    if (mode === "warp") s = Math.max(0.05, 1 - drawerT * 1.5);
    const w = 94 * s, h = (w * im.naturalHeight) / im.naturalWidth;
    ctx.save(); ctx.translate(pl.x, pl.y + 3);
    if (pl.face < 0) ctx.scale(-1, 1);
    if (pl.gliding) { ctx.save(); ctx.globalAlpha = 0.85; const pw = w * 0.9, iy = img("fx-air"); if (ready(iy)) ctx.drawImage(iy, -pw / 2, -8 + Math.sin(t * 20) * 2, pw, pw * iy.naturalHeight / iy.naturalWidth); ctx.restore(); }
    if (pow.torque > 0) { ctx.save(); ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 14); ctx.fillStyle = "hsl(" + ((t * 360) % 360) + ",100%,60%)"; ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w * 0.62, h * 0.55, 0, 0, 7); ctx.fill(); ctx.restore(); }
    if (pow.shield) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6); ctx.strokeStyle = "#6fd3ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -h * 0.42, 40, 44, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    const fk = w / im.naturalWidth, fname = FR[set][fi];
    drawLooks(fname, fk, w, h, true);
    if (pow.speed > 0) { ctx.globalAlpha = 0.3; ctx.drawImage(im, -w / 2 - 14, -h, w, h); ctx.globalAlpha = 1; }
    ctx.drawImage(im, -w / 2, -h, w, h);
    drawLooks(fname, fk, w, h, false);
    ctx.restore();
  }
  function drawFx(f) {
    if (f.k === "chip") { ctx.fillStyle = f.c; const s = f.s || 9; ctx.fillRect(f.x - s / 2, f.y - s / 2, s, s); }
    if (f.k === "coinpop") { ctx.globalAlpha = Math.min(1, f.t * 3); fitImg("coin", f.x, f.y, 26); ctx.globalAlpha = 1; }
    if (f.k === "pound") { ctx.globalAlpha = Math.min(1, f.t / 0.25); const w = 150 * (1.25 - f.t * 0.6); fitImg("fx-pound", f.x, f.y + 14, w); ctx.globalAlpha = 1; }
    if (f.k === "spark") { ctx.globalAlpha = f.t / 0.35; fitImg("star", f.x, f.y + 14, 30 * (1.4 - f.t)); ctx.globalAlpha = 1; }
  }

  // ---------- screens ----------
  function show(html) { card.innerHTML = html; card.classList.remove("hidden"); }
  function hideCard() { card.classList.add("hidden"); }
  function menu() {
    mode = "menu"; grid = grid || null;
    const s = load(), n = NLV();
    // a drawer opens once the one before it is cleared
    const open = (i) => tester() || i === 0 || s.done.includes(i - 1);
    const names = window.LT_LEVELS.map((l) => l.name);
    let h = '<img class="ltlogoimg" src="lt/logo.webp" alt="Where\'s My 10MM?! The Lost Toolbox"><p>' + n + ' drawers of platform action. Beat the boss guarding each drawer, then jump in.</p><div class="ltdrawers">';
    names.forEach((nm, i) => {
      const done = s.done.includes(i), lock = !open(i);
      if (i === 5) h += '<div class="ltpart">PART 2 · THE DEEP DRAWERS</div>';
      h += '<button class="ltdr' + (done ? " done" : "") + (i === 4 ? " gold" : "") + '"' + (lock ? " disabled" : "") + ' data-i="' + i + '"><b>' + (i === 4 ? "GOLDEN DRAWER" : "DRAWER " + (i + 1)) + "</b><span>" + nm + "</span><small>" + (lock ? "LOCKED" : done ? "✓ CLEARED · best " + (s.coins[i] || 0) + " coins" : "PLAY") + "</small></button>";
    });
    h += "</div>" + (s.golden ? '<p class="ltgold">Golden 10MM unlocked! Equip it in the Socket Shop.</p>' : '<p class="ltgold">Clear the first 5 drawers to unlock the exclusive <b>Golden 10MM</b> skin.</p>');
    if (tester()) h += '<p class="lttest">Tester mode is on: every drawer is open, but the Golden 10MM is not awarded.</p>';
    h += '<button class="ltbtn" id="ltHow">HOW TO PLAY</button><button class="ltbtn sub" id="ltQuit">BACK TO GARAGE</button>';
    show(h);
    card.querySelectorAll(".ltdr").forEach((b) => (b.onclick = () => play(+b.dataset.i)));
    card.querySelector("#ltQuit").onclick = close;
    card.querySelector("#ltHow").onclick = () => {
      show('<div class="ltlogo">HOW TO PLAY</div><ul class="lthow"><li><b>◀ ▶</b> walk and run. Hold to pick up speed.</li><li><b>JUMP</b>: hold for a higher jump, tap again in the air for a double jump.</li><li>Bonk <b>? blocks</b> and <b>crates</b> from below. Some blocks are invisible.</li><li>Stomp rolling tires, floor jacks and creepers. Pistons, gears, chains and falling parts can\'t be stomped.</li><li>Flying nuts and meters can be stomped. Hanging screws drop when you walk under them, so keep moving.</li><li>Shiny floors are slippery, cracked wood ledges crumble, and blue floor strips zap when they spark.</li><li>A <b>boss</b> guards every drawer. Stomp it to unlock the drawer.</li><li>Touch the <b>red flag</b> to save a checkpoint.</li><li>3 hits or a fall sends you back to your last checkpoint.</li><li>Jump into the <b>open drawer</b> to finish the level.</li><li>New power-ups: <b>Wrench Toss</b> and <b>Ground Pound</b> add a button next to JUMP. <b>Air Compressor</b>: hold JUMP while falling to float. <b>Lucky Socket</b> doubles coins. <b>Extra Heart</b> gives a 4th hit point for that drawer.</li><li>The <b>shield</b> has no timer. It stays on until it blocks one hit, and it shows next to your hearts.</li><li>Every drawer hides <b>5 stars</b>. Every 10 stars you find pays <b>250 coins</b> to your shop wallet.</li><li>Walk into a <b>blue toolbox</b> to drop into a secret room. Open the gold chest for a <b>Torque Star</b>. It starts when you climb back up: 10 seconds of smashing through anything.</li></ul><button class="ltbtn" id="ltBack">GOT IT</button>');
      card.querySelector("#ltBack").onclick = menu;
    };
  }
  function play(i) {
    hideCard(); collected = new Set(); pow = null; stash = null; inRoom = false; fit();
    startLevel(i); coinsRun = 0; hud.Coins.textContent = 0;
    mode = "intro"; drawerT = 0;
    try { window.stopMusic && stopMusic(); window.startMusic && startMusic("level"); } catch (e) {}
  }
  function pauseMenu() {
    if (mode !== "play") return;
    mode = "pause"; key.L = key.R = key.J = false;
    show('<div class="ltlogo">PAUSED</div><button class="ltbtn" id="ltRes">RESUME</button><button class="ltbtn sub" id="ltRe">RESTART DRAWER</button><button class="ltbtn sub" id="ltMenu">ALL DRAWERS</button>');
    card.querySelector("#ltRes").onclick = () => { hideCard(); mode = "play"; last = performance.now(); };
    card.querySelector("#ltRe").onclick = () => play(lvI);
    card.querySelector("#ltMenu").onclick = menu;
  }
  function showClear() {
    const c = clearInfo, last5 = lvI === 4, fin = lvI === NLV() - 1;
    let h = '<div class="ltlogo">' + (fin ? "ALL " + NLV() + " DRAWERS CLEARED!" : last5 ? "THE LOST TOOLBOX IS YOURS!" : "DRAWER " + (lvI + 1) + " CLEAR!") + '</div><img class="ltclr" src="lt/' + (last5 ? "golden-racer" : fin ? "u-victory" : "drawer3") + '.webp" alt=""><p>' + c.coins + (c.coins === 1 ? " coin" : " coins") + " added to your wallet · " + Math.floor(c.time / 60) + ":" + String(Math.floor(c.time % 60)).padStart(2, "0") + "</p>";
    if (c.golden) h += '<div class="ltreward"><img src="socket-golden10.webp" alt="Golden 10MM"><b>GOLDEN 10MM UNLOCKED!</b><span>Equip it in the Socket Shop. It\'s yours for good.</span></div>';
    else if (last5 && tester()) h += '<p class="lttest">Tester mode: the Golden 10MM is only awarded on a real run.</p>';
    if (last5) h += '<p>Part 2 is open: 5 deeper drawers with tougher bosses.</p>';
    h += fin ? '<button class="ltbtn" id="ltNext">ALL DRAWERS</button>' : '<button class="ltbtn" id="ltNext">OPEN DRAWER ' + (lvI + 2) + '</button><button class="ltbtn sub" id="ltMenu">ALL DRAWERS</button>';
    show(h);
    say("win"); haptic("success");
    card.querySelector("#ltNext").onclick = () => (fin ? menu() : play(lvI + 1));
    const m = card.querySelector("#ltMenu"); if (m) m.onclick = menu;
  }
  function openLostBox() {
    build(); preload();
    root.classList.remove("hidden"); open = true;
    try { window.hideHome && hideHome(); } catch (e) {}
    fit(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    if (!grid) { startLevel(0); mode = "menu"; }
    menu();
  }
  function close() {
    open = false; cancelAnimationFrame(raf); root.classList.add("hidden"); hideCard(); grid = null;
    try { window.stopMusic && stopMusic(); } catch (e) {}
    try { window.showHome && showHome(false); } catch (e) {}
  }
  // ---- test hooks: run the real player physics with hazards off and movers frozen at a fraction of their path ----
  function probeSetup(i, room) { startLevel(i, false, room ? window.LT_LEVELS[i].room : undefined); mode = "play"; return { W, movers: movers.map((m) => ({ x0: m.x0, y0: m.y0, dx: m.dx, dy: m.dy, w: m.w, k: m.k })), rows: grid.map((r) => r.join("")) }; }
  function probe(x, y, dir, da, vy0, fr) {
    movers.forEach((m, k) => { const f = fr[k] || 0; m.x = m.x0 + m.dx * f; m.y = m.y0 - m.dy * f; m.vx = m.vy = 0; });
    mode = "play"; pl.x = x; pl.y = y; pl.vx = dir * P.MAXV; pl.vy = vy0; pl.ground = vy0 === 0 && dir === 0; pl.jumps = vy0 < 0 ? 1 : 0; pl.inv = 99; pl.on = null; pl.coyote = 0;
    key.L = dir < 0; key.R = dir > 0; key.J = vy0 < 0; pl.held = vy0 < 0; jumpBuf = 0;
    let tt = 0;
    for (let n = 0; n < 480; n++) {
      tt += STEP;
      if (da != null && pl.jumps === 1 && tt >= da) { key.J = true; jumpBuf = 0.1; }
      stepPlayer(STEP);
      if (pl.ground && tt > 0.03) break;
      if (mode !== "play") break;
    }
    key.L = key.R = key.J = false;
    return { x: pl.x, y: pl.y, ground: pl.ground, on: pl.on ? movers.indexOf(pl.on) : -1, mode };
  }
  // test hook: stand under a block, jump (and double jump if needed) and report whether it opened
  function probeBlock(i, cx, cy) {
    startLevel(i); mode = "play";
    let fy = cy + 1; while (fy < ROWS && !isSolid(cell(cx, fy)) && cell(cx, fy) !== "-") fy++;
    for (const dbl of [false, true]) {
      startLevel(i); mode = "play";
      Object.assign(pl, { x: cx * T + T / 2, y: fy * T, vx: 0, vy: 0, ground: true, jumps: 0, inv: 99, on: null });
      key.J = true; jumpBuf = 0.1;
      for (let n = 0; n < 240; n++) { if (dbl && n === 30) jumpBuf = 0.1; stepPlayer(STEP); if (grid[cy][cx] !== window.LT_LEVELS[i].rows[cy][cx]) { key.J = false; return true; } }
      key.J = false;
    }
    return false;
  }
  window.LostBox = { _run: (n) => { for (let i = 0; i < n; i++) tick(STEP); }, _probeBlock: probeBlock, _probe: probe, _probeSetup: probeSetup, open: openLostBox, close, _dbg: () => ({ pl, ents, movers, cam, mode, hp, pow, lvI, coinsRun, grid, chase, cp, viewW, zoom, scale, cvh: cv.height, cvw: cv.width }), _play: play, _press: press, _key: key };
})();
