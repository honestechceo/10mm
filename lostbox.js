// Where's My 10MM?! — THE LOST TOOLBOX
// A separate 5-level platform adventure. Nothing in the main runner changes; this file only reads
// a few globals (coins, skins, sfx, buzz, music) and adds its own overlay on top.
// Level layouts come from lt/levels.js (built + reachability-checked by lt-tools/levels.py + validate.py).
(function () {
  "use strict";
  const T = 48, ROWS = 13;
  // keep in sync with lt-tools/validate.py
  const P = { MAXV: 260, ACC: 1900, ACC_AIR: 1300, FRIC: 2400, G_HOLD: 1500, G: 2600, JUMP: 640, DJUMP: 560, MAXFALL: 1000, SPRING: 1050 };
  const PW = 30, PH = 44, STEP = 1 / 120;
  const SOLID = "#=CU?RSD<>";
  const SAVE = "tenmm-lt";
  const BG = { garage: "bg-garage.jpg", servicecenter: "bg-servicecenter.jpg", partsstore: "bg-partsstore.jpg", engineshop: "bg-engineshop.jpg", evtech: "bg-evtech.jpg" };
  const PU = { speed: [8, "SPEED BOOST"], slow: [6, "SLOW-MO"], magnet: [10, "COIN MAGNET"], spring: [10, "SUPER JUMP"], shield: [0, "SHIELD"] };

  // ---------- art ----------
  const IMG = {};
  const img = (k) => {
    if (!IMG[k]) { const im = new Image(); im.src = k.includes(".") ? k : "lt/" + k + ".webp"; IMG[k] = im; }
    return IMG[k];
  };
  const ready = (im) => im && im.complete && im.naturalWidth > 0;
  const FR = {
    idle: ["p-idle0", "p-idle1", "p-idle2", "p-idle3"], run: ["p-run0", "p-run1", "p-run2", "p-run3", "p-run4", "p-run5"],
    jump: ["p-jump0", "p-jump1", "p-jump2"], djump: ["p-djump0", "p-djump1", "p-djump2"], fall: ["p-fall0", "p-fall1"],
    land: ["p-land0", "p-land1"], hit: ["p-hit0", "p-hit1", "p-hit2"], win: ["p-win0", "p-win1", "p-win2"],
  };
  function preload() {
    Object.values(FR).flat().forEach(img);
    "t-square t-redbox t-bench t-crate drum qblock usedblk spring pan tire jack creeper toolcart gear hoist screw nut filter magnet coin pu-speed pu-slow pu-magnet pu-spring pu-shield drawer0 drawer1 drawer2 drawer3 chest lift-l star".split(" ").forEach(img);
    img("tool-piston.webp");
  }

  // ---------- save ----------
  const load = () => { try { return Object.assign({ done: [], coins: {}, golden: false }, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch (e) { return { done: [], coins: {}, golden: false }; } };
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
      '<div class="lthud"><span class="lthp" id="ltHp"></span><span class="ltname" id="ltName"></span><span class="ltcoin"><img src="lt/coin.webp" alt="">×<b id="ltCoins">0</b></span><button id="ltPause" aria-label="Pause">II</button></div>' +
      '<div class="ltpow" id="ltPow"></div>' +
      '<div class="ltmsg" id="ltMsg"></div>' +
      '<div class="ltpad"><button class="ltl" data-k="L" aria-label="Move left">◀</button><button class="ltr" data-k="R" aria-label="Move right">▶</button><button class="ltj" data-k="J" aria-label="Jump">JUMP</button></div>' +
      '<div class="ltcard hidden" id="ltCard"></div>';
    document.body.append(root);
    cv = root.querySelector("#ltc"); ctx = cv.getContext("2d"); card = root.querySelector("#ltCard");
    ["Hp", "Name", "Coins", "Pow", "Msg"].forEach((k) => (hud[k] = root.querySelector("#lt" + k)));
    root.querySelector("#ltPause").onclick = () => pauseMenu();
    for (const b of root.querySelectorAll(".ltpad button")) {
      const k = b.dataset.k;
      const on = (e) => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); press(k, true); b.classList.add("on"); };
      const off = (e) => { e.preventDefault(); press(k, false); b.classList.remove("on"); };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    }
    window.addEventListener("keydown", (e) => {
      if (!open) return;
      const k = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", Space: "J", ArrowUp: "J", KeyW: "J", KeyZ: "J" }[e.code];
      if (k) { e.preventDefault(); if (!e.repeat) press(k, true); }
      if (e.code === "Escape" || e.code === "KeyP") pauseMenu();
    });
    window.addEventListener("keyup", (e) => {
      const k = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", Space: "J", ArrowUp: "J", KeyW: "J", KeyZ: "J" }[e.code];
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
    cv.style.height = Math.max(200, Math.min(avail, wrap.width * 1.4)) + "px";
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    scale = cv.height / (ROWS * T);
    viewW = cv.width / scale;
  }

  // ---------- input ----------
  const key = { L: false, R: false, J: false };
  let jumpBuf = 0;
  function press(k, d) {
    if (k === "J" && d && !key.J) jumpBuf = 0.12;
    key[k] = d;
    if (d) { try { window.audioReady && audioReady(); } catch (e) {} }
  }

  // ---------- world ----------
  let open = false, mode = "menu", lvI = 0, grid, W, ents, movers, pl, cam, cp, t, timeScale = 1, raf = 0, last = 0, acc = 0;
  let coinsRun = 0, hp = 3, pow, msgT = 0, fx, drawerT = 0, chase = null, clearInfo = null, bgImg;
  const cell = (cx, cy) => (cy < 0 || cx < 0 || cx >= W ? (cx < 0 || cx >= W ? "#" : ".") : cy >= ROWS ? "." : grid[cy][cx]);
  const isSolid = (ch) => SOLID.includes(ch);

  function startLevel(i, fromCheckpoint) {
    const L = window.LT_LEVELS[i];
    lvI = i;
    grid = L.rows.map((r) => r.split(""));
    W = grid[0].length;
    ents = []; movers = []; fx = [];
    const ext = {};
    for (const [x, y, kw] of L.ext) ext[x + "," + y] = kw;
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
        case "L": movers.push({ k: "lift", x: x * T, y: by - 12, x0: x * T, y0: by - 12, w: 2 * T, dy: (kw.dy || 3) * T, dx: 0, sp: kw.speed || 60, ph: kw.phase || 0, vx: 0, vy: 0 }); grid[y][x] = "."; break;
        case "M": movers.push({ k: "plat", x: x * T, y: by - 12, x0: x * T, y0: by - 12, w: 2 * T, dx: (kw.dx || 3) * T, dy: 0, sp: kw.speed || 60, ph: kw.phase || 0, vx: 0, vy: 0 }); grid[y][x] = "."; break;
        case "U": ext[x + "," + y] = kw; break;
      }
    }
    for (const e of ents) if (e.k === "coin" && collected.has(i + ":" + Math.round(e.x0) + ":" + Math.round(e.y0))) e.alive = false;
    blockKw = ext;
    startPos = { x: start.x * T + T / 2, y: (start.y + 1) * T };
    if (!fromCheckpoint) cp = Object.assign({}, startPos);
    spawnPlayer();
    hud.Name.textContent = "DRAWER " + (i + 1) + " · " + L.name;
    bgImg = img(BG[L.bg] || "bg-garage.jpg");
    timeScale = 1; chase = null; t = 0;
  }
  let blockKw = {}, collected = new Set(), startPos = { x: 0, y: 0 };
  function spawnPlayer() {
    pl = { x: cp.x, y: cp.y, vx: 0, vy: 0, face: 1, ground: true, coyote: 0, jumps: 0, held: false, inv: 1.0, hitT: 0, landT: 0, djT: 0, anim: 0, on: null };
    cam = Math.max(0, Math.min(W * T - viewW, pl.x - viewW * 0.35));
    hp = 3;
    pow = { speed: 0, slow: 0, magnet: 0, spring: 0, shield: pow && pow.shield ? 1 : 0 };
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
      const a = (pl.ground ? P.ACC : P.ACC_AIR) * sp * (Math.sign(pl.vx) === -dir ? 1.6 : 1);
      pl.vx += dir * a * dt;
      if (Math.abs(pl.vx) > maxv) pl.vx = Math.sign(pl.vx) * Math.max(maxv, Math.abs(pl.vx) - P.FRIC * dt);
    } else if (pl.ground) {
      const f = P.FRIC * dt;
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
    pl.ground = false; pl.belt = 0;
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
            if ((isSolid(ch) || ch === "-") && y >= oldY - 0.5 && y <= ny && (top === null || y < top)) { top = y; pl.belt = ch === ">" ? 1 : ch === "<" ? -1 : pl.belt; }
          }
          if (top !== null) break;
        }
        for (const m of movers) {
          if (pl.x + PW / 2 > m.x + 4 && pl.x - PW / 2 < m.x + m.w - 4 && m.y >= oldY - 1 - Math.max(0, -m.vy * dt) && m.y <= ny + Math.max(0, -m.vy * dt) + 1 && (top === null || m.y < top)) { top = m.y; pl.on = m; }
        }
        if (top !== null) {
          ny = top; pl.vy = 0; pl.ground = true;
          if (!wasGround) { pl.landT = 0.14; if (pl.jumps) puff(pl.x, ny, 4, "#d8dde4"); }
          pl.jumps = 0;
        }
      }
    }
    pl.y = ny;
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
  function addCoin(x, y, pop) {
    coinsRun++; hud.Coins.textContent = coinsRun;
    if (pop) fx.push({ k: "coinpop", x, y, t: 0.5 });
    say("grab");
  }
  function hurt(src) {
    if (pl.inv > 0 || mode !== "play") return;
    if (pow.shield) { pow.shield = 0; pl.inv = 1.2; say("hit"); haptic("medium"); toast("Shield saved you!"); return; }
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
      if (e.walker && !e.dead) {
        e.vy = Math.min(900, (e.vy || 0) + 2400 * hd);
        let nx = e.x + e.vx * hd;
        const front = Math.floor((nx + Math.sign(e.vx) * e.w / 2) / T), row = Math.floor((e.y - 4) / T);
        if (isSolid(cell(front, row)) || isSolid(cell(front, row - 1)) || (e.edge && e.onG && !isSolid(cell(front, Math.floor(e.y / T))) && cell(front, Math.floor(e.y / T)) !== "-")) { e.vx = -e.vx; nx = e.x; }
        e.x = nx;
        let ny = e.y + e.vy * hd; e.onG = false;
        const cx = Math.floor(e.x / T);
        for (let cy = Math.floor(e.y / T); cy <= Math.floor(ny / T); cy++) { const ch = cell(cx, cy); if ((isSolid(ch) || ch === "-") && cy * T >= e.y - 1) { ny = cy * T; e.vy = 0; e.onG = true; break; } }
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
          if (isSolid(ch) || ch === "-" || e.y > ROWS * T) { if (e.y < ROWS * T) puff(e.col, Math.floor(e.y / T) * T, 3, "#aaa"); e.falling = false; e.y = -200; }
        }
        e.x = e.col;
      }
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
    if (e.k === "chaseOn") { if (pl.x > e.x && !chase && !e.used) { e.used = 1; chase = { x: cam - 120 }; toast("RUN! The giant magnet is coming!"); say("grab"); haptic("medium"); } return; }
    if (e.k === "chaseOff") { if (pl.x > e.x && chase) { chase = null; toast("You lost the magnet!"); say("win"); } return; }
    const shrink = e.round ? 6 : e.hurt ? 4 : 0;
    if (px1 < b.x0 + shrink || px0 > b.x1 - shrink || py1 < b.y0 + shrink || py0 > b.y1 - shrink) return;
    switch (e.k) {
      case "coin": e.alive = false; collected.add(lvI + ":" + Math.round(e.x0) + ":" + Math.round(e.y0)); addCoin(e.x, e.y); fx.push({ k: "spark", x: e.x, y: e.y - 13, t: 0.3 }); return;
      case "pu": e.alive = false; givePower(e.pu); return;
      case "check": if (!e.on) { ents.forEach((o) => o.k === "check" && (o.on = false)); e.on = true; cp = { x: e.x, y: e.y }; toast("CHECKPOINT!"); say("win"); haptic("success"); } return;
      case "spring": if (pl.vy >= 0 && py1 - b.y0 < 26) { pl.vy = -P.SPRING * (key.J ? 1.1 : 1); pl.jumps = 1; pl.ground = false; pl.on = null; e.squash = 0.2; say("flap"); } return;
      case "exit": if (mode === "play" && px1 > b.x0 + 26 && px0 < b.x1 - 26 && py1 > b.y0 + 30) enterDrawer(e); return;
    }
    // hazards: stomp the stompable ones from above
    const fromAbove = pl.vy > 60 && py1 - b.y0 < 20;
    if ((e.stomp || e.bounce) && fromAbove) {
      pl.vy = -P.JUMP * (key.J ? 0.95 : 0.7); pl.jumps = 1; pl.held = key.J;
      if (e.stomp) { e.dead = 0.6; e.vx = 0; coinsRun++; hud.Coins.textContent = coinsRun; say("hit"); haptic("medium"); fx.push({ k: "spark", x: e.x, y: b.y0, t: 0.35 }); }
      else say("land");
      return;
    }
    if (e.hurt) hurt(e);
  }
  function givePower(k) {
    say("power"); haptic("success");
    if (k === "shield") pow.shield = 1; else pow[k] = PU[k][0];
    toast(PU[k][1] + "!");
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
    if (mode === "play" || mode === "respawn" || mode === "drawer" || mode === "intro") {
      acc += dt;
      while (acc >= STEP) { tick(STEP); acc -= STEP; }
    }
    draw();
  }
  function tick(dt) {
    msgT -= dt;
    if (msgT <= 0 && hud.Msg.classList.contains("on")) hud.Msg.classList.remove("on");
    for (const k of ["speed", "slow", "magnet", "spring"]) if (pow[k] > 0) pow[k] = Math.max(0, pow[k] - dt);
    timeScale = pow.slow > 0 ? 0.5 : 1;
    for (const f of fx) { f.t -= dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 900 * dt; } if (f.k === "coinpop") f.y -= 120 * dt; }
    fx = fx.filter((f) => f.t > 0);
    if (mode === "intro") { drawerT += dt; stepEnts(dt); if (drawerT > 1.1) { mode = "play"; pl.inv = 0.6; } updHud(); return; }
    if (mode === "respawn") { drawerT -= dt; if (drawerT <= 0) { mode = "play"; const s = pow.shield; spawnPlayer(); pow.shield = s; resetHazards(); } updHud(); return; }
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
    // camera: follow, but don't drift back unless the player really heads back
    const lo = cam + viewW * 0.3, hi = cam + viewW * 0.5;
    if (pl.x > hi) cam += (pl.x - hi);
    else if (pl.x < lo) cam -= (lo - pl.x);
    cam = Math.max(0, Math.min(W * T - viewW, cam));
    updHud();
  }
  function resetHazards() {
    // put moving hazards back where they started so a respawn is fair
    for (const e of ents) if (e.walker) { if (!e.dead && e.alive) { e.x = e.x0; e.y = e.y0; e.vy = 0; } }
    for (const e of ents) if (e.k === "chaseOn" && pl.x < e.x) e.used = 0;
    chase = null;
  }
  let hudKey = "";
  function updHud() {
    const k = hp + "|" + pow.shield;
    if (k !== hudKey) { hudKey = k; hud.Hp.innerHTML = "●".repeat(Math.max(0, hp)).split("").map(() => '<i class="on"></i>').join("") + '<i></i>'.repeat(Math.max(0, 3 - hp)) + (pow.shield ? '<img src="lt/pu-shield.webp" alt="shield">' : ""); }
    const list = ["speed", "slow", "magnet", "spring"].filter((p) => pow[p] > 0).map((p) => '<span><img src="lt/pu-' + p + '.webp" alt="">' + Math.ceil(pow[p]) + "</span>").join("");
    if (hud.Pow._v !== list) { hud.Pow.innerHTML = list; hud.Pow._v = list; }
  }
  function toast(m) { hud.Msg.textContent = m; hud.Msg.classList.add("on"); msgT = 1.8; }

  // ---------- drawing ----------
  function draw() {
    if (!ctx || !grid) return;
    const H = ROWS * T;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0d141d"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // background panorama with parallax
    if (ready(bgImg)) {
      // the panorama's own floor line (~76% down) sits behind our ground (row 11), and it's
      // dimmed so nothing in the background reads as something you can touch
      const bh = H * 1.11, bw = (bgImg.naturalWidth / bgImg.naturalHeight) * bh;
      let bx = -(cam * 0.35) % bw;
      for (; bx < viewW; bx += bw) ctx.drawImage(bgImg, bx, 0, bw, bh);
      ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = "rgba(128,128,128,.55)"; ctx.fillRect(0, 0, viewW, H); ctx.restore();
      ctx.fillStyle = "rgba(10,16,28,.64)"; ctx.fillRect(0, 0, viewW, H);
    }
    ctx.save(); ctx.translate(-Math.round(cam), 0);
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(W - 1, Math.ceil((cam + viewW) / T) + 1);
    for (let y = 0; y < ROWS; y++) for (let x = c0; x <= c1; x++) drawCell(x, y, grid[y][x]);
    // the drawer you came out of
    if (Math.abs(startPos.x - cam - viewW / 2) < viewW) { ctx.globalAlpha = 0.9; fitImg(mode === "intro" ? "drawer1" : "drawer3", startPos.x - 6, startPos.y, 92); ctx.globalAlpha = 1; }
    for (const m of movers) drawMover(m);
    for (const e of ents) if (e.alive && e.x > cam - 200 && e.x < cam + viewW + 200) drawEnt(e);
    drawPlayer();
    for (const f of fx) drawFx(f);
    if (chase) drawChase();
    ctx.restore();
    if (mode === "respawn") { ctx.fillStyle = "rgba(0,0,0," + Math.min(0.85, 1 - drawerT) + ")"; ctx.fillRect(0, 0, viewW, H); }
  }
  function drawCell(x, y, ch) {
    if (ch === "." || ch === "H") return;
    const X = x * T, Y = y * T, b = fx.find((f) => f.k === "bump" && f.cx === x && f.cy === y), dy = b ? -8 * Math.sin((b.t / 0.15) * Math.PI) : 0;
    const top = !isSolid(cell(x, y - 1));
    switch (ch) {
      case "#":
        if (top) { const im = img("t-square"); if (ready(im)) ctx.drawImage(im, X, Y, T + 0.5, T + 0.5); }
        else { ctx.fillStyle = (x + y) % 2 ? "#3b424c" : "#363d46"; ctx.fillRect(X, Y, T + 0.5, T + 0.5); ctx.fillStyle = "#2a3038"; ctx.fillRect(X, Y + T - 3, T, 3); }
        return;
      case "=": drawImg("t-redbox", X, Y + dy, T, T); return;
      case "-": { const im = img("t-bench"); if (ready(im)) ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.42, X - 1, Y, T + 2, 18); return; }
      case "C": drawImg("t-crate", X, Y + dy, T, T); return;
      case "?": case "U": drawImg("qblock", X, Y + dy, T, T); return;
      case "S": drawImg("usedblk", X, Y + dy, T, T); return;
      case "D": drawImg("drum", X + 2, Y, T - 4, T); return;
      case ">": case "<": {
        ctx.fillStyle = "#1c2027"; ctx.fillRect(X, Y, T, T); ctx.fillStyle = "#f2c230"; ctx.fillRect(X, Y, T, 5);
        ctx.fillStyle = "#5d6570"; const off = ((t * 95) % 24) * (ch === ">" ? 1 : -1);
        for (let i = -1; i < 3; i++) { const cx = X + i * 24 + off; ctx.beginPath(); const d = ch === ">" ? 1 : -1; ctx.moveTo(cx, Y + 12); ctx.lineTo(cx + 8 * d, Y + 22); ctx.lineTo(cx, Y + 32); ctx.lineWidth = 4; ctx.strokeStyle = "#8e99a6"; ctx.stroke(); }
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(X + 1, Y + 1, T - 2, T - 2);
        return;
      }
    }
  }
  function drawImg(k, x, y, w, h) { const im = img(k); if (ready(im)) ctx.drawImage(im, x, y, w, h); }
  function fitImg(k, cx, by, w) { const im = img(k); if (!ready(im)) return; const h = (w * im.naturalHeight) / im.naturalWidth; ctx.drawImage(im, cx - w / 2, by - h, w, h); }
  function drawMover(m) {
    if (m.k === "lift") { const im = img("lift-l"); if (ready(im)) { ctx.globalAlpha = 0.55; ctx.drawImage(im, m.x0 - 8, m.y0 - m.dy - 40, 30, m.dy + 90); ctx.globalAlpha = 1; } }
    const im = img("t-bench");
    if (ready(im)) ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.42, m.x - 2, m.y, m.w + 4, 20);
    ctx.fillStyle = "#1f6fd6"; ctx.fillRect(m.x + 10, m.y + 18, 8, 6); ctx.fillRect(m.x + m.w - 18, m.y + 18, 8, 6);
  }
  function drawEnt(e) {
    const b = box(e);
    switch (e.k) {
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
      case "pu": { const y = e.y - e.rise * 34; fitImg("pu-" + e.pu, e.x, y + Math.sin(t * 4) * 2, 36); return; }
      case "check": { ctx.fillStyle = "#c8ced6"; ctx.fillRect(e.x - 2, e.y - 64, 4, 64); ctx.fillStyle = e.on ? "#3fd36b" : "#e5402b"; ctx.beginPath(); ctx.moveTo(e.x + 2, e.y - 64); ctx.lineTo(e.x + 30, e.y - 56); ctx.lineTo(e.x + 2, e.y - 46); ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke(); fitImg("coin", e.x + 13, e.y - 49, 12); return; }
      case "spring": { const s = e.squash > 0 ? 0.6 : 1; e.squash = (e.squash || 0) - 1 / 60; const im = img("spring"); if (ready(im)) ctx.drawImage(im, e.x - 24, e.y - 30 * s, 48, 30 * s); return; }
      case "exit": {
        const near = Math.abs(pl.x - e.x) < 260 || mode === "drawer";
        let k = near ? "drawer1" : "drawer0";
        if (mode === "drawer") k = drawerT < 0.5 ? "drawer1" : drawerT < 1.1 ? "drawer2" : "drawer3";
        if (near && mode !== "drawer") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,200,60," + (0.12 + 0.08 * Math.sin(t * 5)) + ")"; ctx.beginPath(); ctx.arc(e.x, e.y - 40, 90, 0, 7); ctx.fill(); ctx.restore(); }
        fitImg(k, e.x, e.y, 112);
        ctx.fillStyle = "#000"; ctx.font = "900 15px system-ui,sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = lvI === 4 ? "#ffd23f" : "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
        const lab = lvI === 4 ? "GOLDEN DRAWER" : "DRAWER " + (lvI + 2);
        ctx.strokeText(lab, e.x, e.y - 112); ctx.fillText(lab, e.x, e.y - 112);
        return;
      }
    }
  }
  function groundBelow(x) { const cx = Math.floor(x / T); for (let y = 0; y < ROWS; y++) { const ch = cell(cx, y); if (isSolid(ch) || ch === "-") return y * T; } return ROWS * T; }
  function drawChase() {
    const im = img("magnet"); const x = chase.x, y = ROWS * T * 0.55 + Math.sin(t * 6) * 10;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,60,60,.12)"; ctx.fillRect(x - 600, 0, 680, ROWS * T); ctx.restore();
    if (ready(im)) { const w = 170, h = (w * im.naturalHeight) / im.naturalWidth; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); }
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
    const w = 94 * s, h = (w * im.naturalHeight) / im.naturalWidth;
    ctx.save(); ctx.translate(pl.x, pl.y + 3);
    if (pl.face < 0) ctx.scale(-1, 1);
    if (pow.shield) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6); ctx.strokeStyle = "#6fd3ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -h * 0.42, 40, 44, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    if (pow.speed > 0) { ctx.globalAlpha = 0.3; ctx.drawImage(im, -w / 2 - 14, -h, w, h); ctx.globalAlpha = 1; }
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.restore();
  }
  function drawFx(f) {
    if (f.k === "chip") { ctx.fillStyle = f.c; const s = f.s || 9; ctx.fillRect(f.x - s / 2, f.y - s / 2, s, s); }
    if (f.k === "coinpop") { ctx.globalAlpha = Math.min(1, f.t * 3); fitImg("coin", f.x, f.y, 26); ctx.globalAlpha = 1; }
    if (f.k === "spark") { ctx.globalAlpha = f.t / 0.35; fitImg("star", f.x, f.y + 14, 30 * (1.4 - f.t)); ctx.globalAlpha = 1; }
  }

  // ---------- screens ----------
  function show(html) { card.innerHTML = html; card.classList.remove("hidden"); }
  function hideCard() { card.classList.add("hidden"); }
  function menu() {
    mode = "menu"; grid = grid || null;
    const s = load(), unlocked = tester() ? 5 : Math.min(5, s.done.length + 1);
    const names = window.LT_LEVELS.map((l) => l.name);
    let h = '<div class="ltlogo">THE LOST TOOLBOX</div><p>Five drawers of platform action. Find the drawer at the end of each level and jump in.</p><div class="ltdrawers">';
    names.forEach((n, i) => {
      const done = s.done.includes(i), lock = i >= unlocked;
      h += '<button class="ltdr' + (done ? " done" : "") + (i === 4 ? " gold" : "") + '"' + (lock ? " disabled" : "") + ' data-i="' + i + '"><b>' + (i === 4 ? "GOLDEN DRAWER" : "DRAWER " + (i + 1)) + "</b><span>" + n + "</span><small>" + (lock ? "LOCKED" : done ? "✓ CLEARED · best " + (s.coins[i] || 0) + " coins" : "PLAY") + "</small></button>";
    });
    h += "</div>" + (s.golden ? '<p class="ltgold">Golden 10MM unlocked! Equip it in the Socket Shop.</p>' : '<p class="ltgold">Clear all 5 drawers to unlock the exclusive <b>Golden 10MM</b> skin.</p>');
    if (tester()) h += '<p class="lttest">Tester mode is on: every drawer is open, but the Golden 10MM is not awarded.</p>';
    h += '<button class="ltbtn" id="ltHow">HOW TO PLAY</button><button class="ltbtn sub" id="ltQuit">BACK TO GARAGE</button>';
    show(h);
    card.querySelectorAll(".ltdr").forEach((b) => (b.onclick = () => play(+b.dataset.i)));
    card.querySelector("#ltQuit").onclick = close;
    card.querySelector("#ltHow").onclick = () => {
      show('<div class="ltlogo">HOW TO PLAY</div><ul class="lthow"><li><b>◀ ▶</b> walk and run. Hold to pick up speed.</li><li><b>JUMP</b>: hold for a higher jump, tap again in the air for a double jump.</li><li>Bonk <b>? blocks</b> and <b>crates</b> from below. Some blocks are invisible.</li><li>Stomp rolling tires, floor jacks and creepers. Pistons, gears, chains and falling parts can\'t be stomped.</li><li>Touch the <b>red flag</b> to save a checkpoint.</li><li>3 hits or a fall sends you back to your last checkpoint.</li><li>Jump into the <b>open drawer</b> to finish the level.</li></ul><button class="ltbtn" id="ltBack">GOT IT</button>');
      card.querySelector("#ltBack").onclick = menu;
    };
  }
  function play(i) {
    hideCard(); collected = new Set(); pow = null; fit();
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
    const c = clearInfo, last5 = lvI === 4;
    let h = '<div class="ltlogo">' + (last5 ? "THE LOST TOOLBOX IS YOURS!" : "DRAWER " + (lvI + 1) + " CLEAR!") + '</div><img class="ltclr" src="lt/' + (last5 ? "p-golden0" : "drawer3") + '.webp" alt=""><p>' + c.coins + (c.coins === 1 ? " coin" : " coins") + " added to your wallet · " + Math.floor(c.time / 60) + ":" + String(Math.floor(c.time % 60)).padStart(2, "0") + "</p>";
    if (c.golden) h += '<div class="ltreward"><img src="socket-golden10.webp" alt="Golden 10MM"><b>GOLDEN 10MM UNLOCKED!</b><span>Equip it in the Socket Shop. It\'s yours for good.</span></div>';
    else if (last5 && tester()) h += '<p class="lttest">Tester mode: the Golden 10MM is only awarded on a real run.</p>';
    h += last5 ? '<button class="ltbtn" id="ltNext">ALL DRAWERS</button>' : '<button class="ltbtn" id="ltNext">OPEN DRAWER ' + (lvI + 2) + '</button><button class="ltbtn sub" id="ltMenu">ALL DRAWERS</button>';
    show(h);
    say("win"); haptic("success");
    card.querySelector("#ltNext").onclick = () => (last5 ? menu() : play(lvI + 1));
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
  function probeSetup(i) { startLevel(i); mode = "play"; return { W, movers: movers.map((m) => ({ x0: m.x0, y0: m.y0, dx: m.dx, dy: m.dy, w: m.w, k: m.k })), rows: grid.map((r) => r.join("")) }; }
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
  window.LostBox = { _probe: probe, _probeSetup: probeSetup, open: openLostBox, close, _dbg: () => ({ pl, ents, movers, cam, mode, hp, pow, lvI, coinsRun, grid, chase, cp, viewW }), _play: play, _press: press, _key: key };
})();
