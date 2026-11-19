// Where's My 10MM?! — "Drain the Oil" bonus round (match-and-drop style).
// Old oil sits in the engine's oil pan at the top. Tap 2+ touching matching parts to clear them;
// parts above drop down. Open a channel so the oil pours into the drain pan before your moves run out.
// Big groups make power parts: 6-7 = TORQUE ROCKET (clears its column), 8+ = OIL BLAST (clears around it).
"use strict";
(() => {
  const LW = 350, LH = 640, C = 2, GW = LW / C, GH = LH / C;
  const COLS = 7, ROWS = 8, T = 50, BX = 0, BY = 162, TCELL = T / C;
  const PAN_TOP = 146;
  const FLOOR = BY + ROWS * T;
  const TYPES = [
    { img: "tool-wrench.webp", a: "#4aa3ff", b: "#1c5fbf" },
    { img: "tool-nut.webp", a: "#ffd54a", b: "#d68a00" },
    { img: "svc-filter.webp", a: "#ff8a3c", b: "#c84a0c" },
    { img: "svc-funnel.webp", a: "#ff5d6c", b: "#b3122a" },
    { img: "tool-bolt.webp", a: "#5ee07a", b: "#1d8f3c" },
  ];
  const STEEL = "steel", ROCKET = "rocket", BLAST = "blast";
  const load = (s) => { const i = new Image(); i.src = s; return i; };
  const imgs = TYPES.map((t) => load(t.img));
  const rocketImg = load("power-rocket.webp"), blastImg = load("power-oil.webp"), panImg = load("svc-pan.webp"), engImg = load("scene-engine-closed.webp");
  const ready = (im) => im && im.complete && im.naturalWidth;

  window.runDrainIntro = function (done) {
    const n = Math.round(level / 10), moves = 180;
    popup("BONUS ROUND!", "DRAIN THE OIL: tap 2 or more matching parts that touch. Cleared spaces stay open. Open a path so the old oil pours into the drain pan before the " + moves + "-second timer expires! Clear 6+ for a Torque Rocket, 8+ for an Oil Blast.", "START", () => runDrain(done, moves, n), "toolbox");
    $("eyebrow").textContent = "BONUS ROUND " + n + " OF " + MAX_LEVEL / 10;
  };

  function runDrain(done, maxMoves, n) {
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    let el = $("drn");
    if (!el) { el = document.createElement("div"); el.id = "drn"; document.body.append(el); }
    el.className = "";
    el.innerHTML = '<div class="bhead"><div>DRAIN THE OIL<small>Tap groups of 2+ matching parts to open a path.</small></div><div class="dmoves"><span>TIME</span><b id="dMoves">0</b></div></div>' +
      '<div class="dhint">MATCH 2+ • NEW PARTS DROP • FILL THE PAN</div><div class="dwrap" id="dWrap"><canvas id="dCan"></canvas></div><div class="dmeter"><span>OIL COLLECTED</span><div><i id="dFill"></i></div><b id="dPct">0%</b></div>';
    const wrap = $("dWrap"), can = $("dCan"), g = can.getContext("2d");
    const fit = () => {
      const s = Math.min(wrap.clientWidth / LW, wrap.clientHeight / LH), dpr = window.devicePixelRatio || 1;
      can.style.width = LW * s + "px"; can.style.height = LH * s + "px";
      can.width = Math.round(LW * s * dpr); can.height = Math.round(LH * s * dpr);
      g.setTransform((LW * s * dpr) / LW, 0, 0, (LH * s * dpr) / LH, 0, 0);
    };
    fit();

    // board: each tile has a type and an animated y so it can drop into place
    const ntypes = n < 12 ? 3 : 4;
    const grid = [];
    const channels = new Uint8Array(ROWS * COLS); // Cleared passages never refill.
    for (let r = 0; r < ROWS; r++) { grid.push([]); for (let c = 0; c < COLS; c++) grid[r].push({ t: Math.floor(Math.random() * ntypes), y: BY + r * T - 260 - (ROWS - r) * 30, vy: 0, pop: 0 }); }
    const steelCount = n < 6 ? 0 : Math.min(3, Math.floor(n / 8));
    for (let k = 0; k < steelCount; k++) grid[3 + Math.floor(Math.random() * (ROWS - 3))][Math.floor(Math.random() * COLS)].t = STEEL;

    // liquid grid
    const cell = new Uint8Array(GW * GH), shade = new Uint8Array(GW * GH), solid = new Uint8Array(GW * GH);
    const idx = (x, y) => y * GW + x;
    let total = 0;
    for (let y = Math.floor(72 / C); y < Math.floor(PAN_TOP / C); y++) for (let x = 2; x < GW - 2; x++) if (Math.random() < 0.94) { cell[idx(x, y)] = 1; shade[idx(x, y)] = Math.random() * 255; total++; }
    const target = Math.max(1, Math.floor(total * 0.0192)), PAN_Y = Math.floor((LH - 34) / C);
    // Catch zone spans the full playable board, including the far-left and far-right columns.
    const PAN_LEFT = 7, PAN_RIGHT = LW - 7, PAN_RIM = LH - 49;
    let missedOil = 0;
    let inPan = 0, displayedPan = 0, moved = 0, started = false;
    const isSolid = (x, y) => x < 0 || x >= GW || y < 0 || y >= GH || cell[idx(x, y)] !== 0 || solid[idx(x, y)];

    // tiles block oil where they are drawn; oil caught under a falling tile is pushed up
    function markSolids() {
      solid.fill(0);
      for (let y = Math.floor(60 / C); y < Math.floor(PAN_TOP / C); y++) solid[idx(0, y)] = solid[idx(1, y)] = solid[idx(GW - 1, y)] = solid[idx(GW - 2, y)] = 1;
      // until the parts have landed, the engine's drain plug is in
      if (!started) for (let x = 0; x < GW; x++) solid[idx(x, Math.floor(PAN_TOP / C))] = 1;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const tl = grid[r][c];
        if (!tl || tl.y + T < BY - 20) continue;
        const x0 = Math.floor((BX + c * T) / C), y0 = Math.max(0, Math.floor(tl.y / C));
        for (let y = y0; y < Math.min(GH, y0 + TCELL); y++) for (let x = x0; x < x0 + TCELL; x++) {
          const k = idx(x, y);
          solid[k] = 1;
          if (cell[k]) { cell[k] = 0; for (let yy = y - 1; yy >= 0; yy--) { const kk = idx(x, yy); if (!cell[kk] && !solid[kk]) { cell[kk] = 1; shade[kk] = shade[k]; break; } } }
        }
      }
    }

    // matching
    const same = (a, b) => a && b && typeof a.t === "number" && a.t === b.t;
    const group = (r0, c0) => {
      const seen = new Set([r0 * COLS + c0]), q = [[r0, c0]];
      while (q.length) {
        const [r, c] = q.pop();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || seen.has(rr * COLS + cc) || !same(grid[rr][cc], grid[r0][c0])) continue;
          seen.add(rr * COLS + cc); q.push([rr, cc]);
        }
      }
      return [...seen].map((k) => [Math.floor(k / COLS), k % COLS]);
    };
    const parts = [], pops = [];
    let moves = maxMoves, over = false, raf = 0, shake = 0, hover = null, settleT = 0, busyT = 0, flash = null, idle = 0;
    const burst = (r, c, color) => { for (let i = 0; i < 10; i++) parts.push({ x: BX + c * T + T / 2, y: BY + r * T + T / 2, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 1, life: 32, color, s: 3 + Math.random() * 4 }); };
    const remove = (r, c) => {
      const tl = grid[r][c];
      if (!tl) return;
      burst(r, c, tl.t === STEEL ? "#c9d3dc" : typeof tl.t === "number" ? TYPES[tl.t].a : "#ffd23f");
      grid[r][c] = null;
      channels[r * COLS + c] = 1;
    };
    function fire(r, c, kind) {
      grid[r][c] = null; channels[r * COLS + c] = 1; burst(r, c, "#ffd23f");
      const hit = (rr, cc) => { const t = grid[rr][cc]; if (t && (t.t === ROCKET || t.t === BLAST)) fire(rr, cc, t.t); else remove(rr, cc); };
      if (kind === ROCKET) { for (let rr = 0; rr < ROWS; rr++) hit(rr, c); pops.push({ x: BX + c * T + T / 2, y: BY + 20, t: "ROCKET!", life: 50 }); flash = { x: BX + c * T, life: 14 }; }
      else { for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) hit(rr, cc); pops.push({ x: BX + c * T + T / 2, y: BY + r * T, t: "OIL BLAST!", life: 50 }); shake = 12; }
    }

    // parts fall into gaps; steel plates stay bolted in place
    // Drain puzzle: a removed part must leave a lasting opening. Falling pieces
    // previously resealed the channel, making the objective effectively impossible.
    function gravity() {
      for (let c = 0; c < COLS; c++) {
        let bottom = ROWS - 1;
        while (bottom >= 0) {
          if (grid[bottom][c] && grid[bottom][c].t === STEEL) { bottom--; continue; }
          let top = bottom;
          while (top >= 0 && !(grid[top][c] && grid[top][c].t === STEEL)) top--;
          const survivors = [];
          for (let r = bottom; r > top; r--) if (!channels[r * COLS + c] && grid[r][c]) survivors.push(grid[r][c]);
          for (let r = bottom; r > top; r--) {
            if (channels[r * COLS + c]) { grid[r][c] = null; continue; }
            grid[r][c] = survivors.shift() || { t: Math.floor(Math.random()*ntypes), y: BY - T * 2, vy: 0, pop: 0 };
          }
          bottom = top - 1;
        }
      }
    }
    const hasMove = () => { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = grid[r][c]; if (!t || t.t === STEEL) continue; if (t.t === ROCKET || t.t === BLAST || group(r, c).length >= 2) return true; } return false; };
    function reshuffleIfStuck() {
      if (hasMove()) return;
      const spots = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] && grid[r][c].t !== STEEL) spots.push(grid[r][c]);
      if (!spots.length) return;
      for (let tries = 0; tries < 40 && !hasMove(); tries++) for (const t of spots) t.t = Math.floor(Math.random() * ntypes);
      if (!hasMove()) spots[spots.length - 1].t = ROCKET;
      pops.push({ x: LW / 2, y: BY - 6, t: "SHUFFLED!", life: 50 });
    }
    function bestGroup() {
      let best = null;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = grid[r][c]; if (!t || typeof t.t !== "number") continue; const gp = group(r, c); if (gp.length >= 2 && (!best || gp.length > best.length)) best = gp; }
      return best || [];
    }

    const toCell = (e) => { const rc = can.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width) * LW, y = ((e.clientY - rc.top) / rc.height) * LH; return [Math.floor((y - BY) / T), Math.floor((x - BX) / T), x, y]; };
    can.onpointerdown = (e) => {
      e.preventDefault();
      if (over || moves <= 0 || busyT > 0 || !started) return;
      const [r, c, x, y] = toCell(e);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      const tl = grid[r][c];
      if (!tl) return;
      idle = 0;
      if (tl.t === STEEL) { sfx("miss"); buzz("light"); pops.push({ x, y, t: "STEEL! Blast it", life: 40, bad: 1 }); shake = 8; return; }
      if (tl.t === ROCKET || tl.t === BLAST) { fire(r, c, tl.t); sfx("power"); buzz("heavy"); after(); return; }
      const gp = group(r, c);
      if (gp.length < 2) { sfx("miss"); buzz("light"); pops.push({ x, y, t: "Needs a match", life: 40, bad: 1 }); tl.pop = 8; return; }
      
      if (gp.length >= 5) moves = Math.min(210, moves + (gp.length >= 8 ? 10 : 5));
      for (const [rr, cc] of gp) remove(rr, cc);
      if (gp.length >= 6) for (const [rr, cc] of gp) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = rr + dr, b = cc + dc; if (a >= 0 && a < ROWS && b >= 0 && b < COLS && grid[a][b] && grid[a][b].t === STEEL) remove(a, b); }
      if (gp.length >= 6) { /* Cleared channel stays open; power effects activate immediately. */  pops.push({ x, y, t: gp.length >= 8 ? "OIL BLAST!" : "TORQUE ROCKET!", life: 50 }); }
      else if (gp.length >= 4) pops.push({ x, y, t: gp.length === 5 ? "GREAT!" : "NICE!", life: 40 });
      sfx(gp.length >= 6 ? "power" : "coin"); buzz(gp.length >= 6 ? "medium" : "light");
      after();
    };
    can.onpointermove = (e) => { const [r, c] = toCell(e); hover = r >= 0 && r < ROWS && c >= 0 && c < COLS ? [r, c] : null; };
    can.onpointerleave = () => (hover = null);
    function after() { gravity(); reshuffleIfStuck(); busyT = 8; }

    // liquid
    let flip = 0;
    function stepOil() {
      flip ^= 1;
      for (let y = GH - 1; y >= 0; y--) {
        const ltr = (y + flip) & 1;
        for (let i = 0; i < GW; i++) {
          const x = ltr ? i : GW - 1 - i, k = idx(x, y);
          if (cell[k] !== 1) continue;
          if (y >= PAN_Y) {
            cell[k] = 0;
            const landingX = (x + .5) * C;
            if (landingX >= PAN_LEFT && landingX <= PAN_RIGHT && y * C >= PAN_RIM) inPan++;
            else missedOil++;
            moved++;
            continue;
          }
          const d = ltr ? 1 : -1;
          let nx = -1, ny = -1;
          if (!isSolid(x, y + 1)) { nx = x; ny = y + 1; }
          else if (!isSolid(x + d, y + 1)) { nx = x + d; ny = y + 1; }
          else if (!isSolid(x - d, y + 1)) { nx = x - d; ny = y + 1; }
          else if (!isSolid(x + d, y)) { nx = x + d; ny = y; if (!isSolid(x + 2 * d, y) && Math.random() < 0.6) nx = x + 2 * d; }
          else if (!isSolid(x - d, y)) { nx = x - d; ny = y; }
          if (nx >= 0) { const nk = idx(nx, ny); cell[nk] = 1; shade[nk] = shade[k]; cell[k] = 0; if (ny > y) moved++; }
        }
      }
    }

    // drawing
    const oilCan = document.createElement("canvas"); oilCan.width = GW; oilCan.height = GH;
    const oilCtx = oilCan.getContext("2d"), oilImg = oilCtx.createImageData(GW, GH);
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function fitImg(im, cx, cy, box) { if (!ready(im)) return; const a = im.naturalWidth / im.naturalHeight, w = a > 1 ? box : box * a, h = a > 1 ? box / a : box; g.drawImage(im, cx - w / 2, cy - h / 2, w, h); }
    function drawBack() {
      g.fillStyle = "#18222e"; g.fillRect(0, 0, LW, LH);
      g.strokeStyle = "#20252c"; g.lineWidth = 2;
      for (let y = 0, row = 0; y < LH; y += 22, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); for (let x = (row % 2) * 24; x < LW; x += 48) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
      if (ready(engImg)) { g.save(); g.globalAlpha = 0.6; const w = LW * 1.2, h = (w * engImg.naturalHeight) / engImg.naturalWidth; g.drawImage(engImg, (LW - w) / 2, 64 - h * 0.92, w, h); g.restore(); }
      const pg = g.createLinearGradient(0, 56, 0, PAN_TOP + 10); pg.addColorStop(0, "#6a747e"); pg.addColorStop(1, "#2b3138");
      g.fillStyle = pg; rr(-6, 56, LW + 12, PAN_TOP - 48, 14); g.fill();
      g.fillStyle = "#14181d"; g.fillRect(10, 68, LW - 20, PAN_TOP - 68);
      g.fillStyle = "#9aa6b2"; for (let x = 18; x < LW; x += 38) { g.beginPath(); g.arc(x, 62, 3, 0, 7); g.fill(); }
      g.font = "900 11px system-ui,sans-serif"; g.fillStyle = "#e6edf3"; g.textAlign = "left"; g.lineWidth = 3; g.strokeStyle = "#000a"; g.strokeText("ENGINE OIL PAN", 12, 52); g.fillText("ENGINE OIL PAN", 12, 52);
      // board frame like a tool chest drawer
      g.fillStyle = "#526c80"; rr(BX - 1, BY - 8, COLS * T + 2, ROWS * T + 14, 10); g.fill();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.fillStyle = (r + c) % 2 ? "#1b232c" : "#202933"; g.fillRect(BX + c * T, BY + r * T, T, T); }
      g.fillStyle = "#3b4048"; g.fillRect(0, FLOOR + 6, LW, LH - FLOOR);
      g.fillStyle = "#ffd23f"; g.fillRect(0, FLOOR + 14, LW, 4);
    }
    function drawOil() {
      // Render the physics particles as a single smooth, dark amber liquid.
      // Do not highlight every exposed pixel: that produced the striped stair-step
      // pattern when oil moved down the narrow channels.
      const px = oilImg.data, time = performance.now() * .0015;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const k = idx(x, y), o = k * 4;
        if (cell[k] !== 1) { px[o] = 0; px[o+1] = 0; px[o+2] = 0; px[o+3] = 0; continue; }
        const variation = Math.sin(x * .075 + y * .035 - time) * 8 + (shade[k] - 128) * .022;
        const nearSurface = y > 1 && cell[idx(x, y-1)] === 0 &&
          y + 2 < GH && cell[idx(x, y+1)] === 1 && cell[idx(x, y+2)] === 1;
        px[o] = Math.max(0, Math.min(255, 132 + variation + (nearSurface ? 18 : 0)));
        px[o+1] = Math.max(0, Math.min(255, 72 + variation * .55 + (nearSurface ? 14 : 0)));
        px[o+2] = Math.max(0, Math.min(255, 18 + variation * .16));
        px[o+3] = 255;
      }
      oilCtx.putImageData(oilImg, 0, 0);
      g.save();
      g.imageSmoothingEnabled = true;
      g.filter = "blur(3.4px)";
      g.drawImage(oilCan, 0, 0, LW, LH);
      g.restore();
    }
    function drawTile(tl, x, y, glow) {
      const s = 1 - Math.max(0, tl.pop) * 0.015, cx = x + T / 2, cy = y + T / 2, w = (T - 4) * s;
      g.save(); g.translate(cx, cy);
      if (tl.t === STEEL) {
        const gr = g.createLinearGradient(-w / 2, -w / 2, w / 2, w / 2); gr.addColorStop(0, "#e1e7ed"); gr.addColorStop(0.5, "#9aa6b1"); gr.addColorStop(1, "#5b6570");
        g.fillStyle = gr; rr(-w / 2, -w / 2, w, w, 7); g.fill(); g.strokeStyle = "#3b434c"; g.lineWidth = 2; g.stroke();
        g.fillStyle = "#3e4750"; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(a * (w / 2 - 8), b * (w / 2 - 8), 3.2, 0, 7); g.fill(); }
        g.restore(); return;
      }
      if (glow) { g.shadowColor = "#fff8c0"; g.shadowBlur = 14; }
      g.fillStyle = "#0007"; rr(-w / 2 + 1, -w / 2 + 3, w, w, 10); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = "#dceaf4"; rr(-w / 2, -w / 2, w, w, 10); g.fill();
      let a = "#ffe27a", b = "#e08a00";
      if (typeof tl.t === "number") { a = TYPES[tl.t].a; b = TYPES[tl.t].b; }
      const gr = g.createLinearGradient(0, -w / 2, 0, w / 2); gr.addColorStop(0, a); gr.addColorStop(1, b);
      g.fillStyle = gr; rr(-w / 2 + 4, -w / 2 + 4, w - 8, w - 8, 8); g.fill();
      g.fillStyle = "#ffffff70"; rr(-w / 2 + 6, -w / 2 + 6, w - 12, (w - 12) * 0.36, 6); g.fill();
      if (typeof tl.t === "number") fitImg(imgs[tl.t], 0, 1, w - 14);
      else { fitImg(tl.t === ROCKET ? rocketImg : blastImg, 0, 0, w - 8); g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.globalAlpha = 0.6 + Math.sin(performance.now() / 150) * 0.4; rr(-w / 2 + 1, -w / 2 + 1, w - 2, w - 2, 10); g.stroke(); }
      g.restore();
    }
    let heroCache = null;
    const heroImg = () => { if (!heroCache) heroCache = load(typeof skinSrc === "function" ? skinSrc() : "socket-chrome.webp"); return heroCache; };
    function draw() {
      g.clearRect(0, 0, LW, LH);
      drawBack();
      const hl = new Set();
      if (hover && grid[hover[0]][hover[1]] && typeof grid[hover[0]][hover[1]].t === "number") { const gp = group(hover[0], hover[1]); if (gp.length >= 2) gp.forEach(([r, c]) => hl.add(r * COLS + c)); }
      const hint = idle > 135 && moves > 0 ? new Set(bestGroup().map(([r, c]) => r * COLS + c)) : null;
      let landing = true;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const tl = grid[r][c];
        if (!tl) continue;
        const ty = BY + r * T;
        if (tl.y < ty) { landing = false; tl.vy = Math.min(16, tl.vy + 1.4); tl.y = Math.min(ty, tl.y + tl.vy); if (tl.y === ty) { tl.vy = 0; tl.pop = 4; } }
        else tl.y = ty;
        if (tl.pop > 0) tl.pop -= 1;
        const k = r * COLS + c, wig = hint && hint.has(k) ? Math.sin(performance.now() / 90) * 2.5 : 0;
        if (tl.y > BY - T) { g.save(); g.beginPath(); g.rect(0, BY - 8, LW, LH); g.clip(); drawTile(tl, BX + c * T + wig, tl.y - (hl.has(k) ? 3 : 0), hl.has(k)); g.restore(); }
      }
      if (landing && !started) started = true;
      drawOil();
      // The liquid visible in the cleared cells is the ONLY source of collected oil.
      // No cosmetic shortcut stream can bypass the blocks.
      const panW = LW, panX = 0, panY = LH - 62;
      const f = Math.min(1, displayedPan / target);
      // Full-width drain trough, with the rim and liquid visible above the floor.
      g.save();
      const steel = g.createLinearGradient(0, panY, 0, LH);
      steel.addColorStop(0, "#e6f0f6"); steel.addColorStop(.22, "#6b8499"); steel.addColorStop(.65, "#263d51"); steel.addColorStop(1, "#101c2a");
      g.fillStyle = steel; g.beginPath(); g.moveTo(0, PAN_RIM); g.lineTo(LW, PAN_RIM);
      g.lineTo(LW - 10, LH - 4); g.quadraticCurveTo(LW / 2, LH + 9, 10, LH - 4); g.closePath(); g.fill();
      g.strokeStyle = "#e4eff8"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, PAN_RIM); g.lineTo(LW, PAN_RIM); g.stroke();
      g.fillStyle = "#0b151d"; g.fillRect(4, PAN_RIM + 4, LW - 8, 11);
      // Visible tank interior: the amber surface rises toward the rim as oil is caught.
      // Draw the oil over the interior, not hidden below the bottom edge.
      if (f > 0) {
        const t = performance.now() * .004;
        const bottom = LH - 7, top = bottom - (8 + f * 40);
        g.save();
        g.beginPath(); g.rect(7, PAN_RIM + 5, LW - 14, LH - PAN_RIM - 11); g.clip();
        const og = g.createLinearGradient(0, top, 0, bottom);
        og.addColorStop(0, "#f7c16b"); og.addColorStop(.12, "#b87522");
        og.addColorStop(.55, "#794014"); og.addColorStop(1, "#351b09");
        g.fillStyle = og;
        g.beginPath(); g.moveTo(7, top);
        for (let x = 7; x <= LW - 7; x += 5) g.lineTo(x, top + Math.sin(x * .044 + t) * 1.8 + Math.sin(x * .087 - t * .8));
        g.lineTo(LW - 7, bottom); g.lineTo(7, bottom); g.closePath(); g.fill();
        g.strokeStyle = "rgba(255,223,143,.85)"; g.lineWidth = 2;
        g.beginPath();
        for (let x = 7; x <= LW - 7; x += 5) {
          const y = top + Math.sin(x * .044 + t) * 1.8 + Math.sin(x * .087 - t * .8);
          if (x === 7) g.moveTo(x,y); else g.lineTo(x,y);
        }
        g.stroke();
        g.restore();
      }
      g.restore();
      const hero = heroImg();
      if (ready(hero)) {
        const bob = Math.sin(performance.now() / 260) * 2, w = 74, hx = LW - w - 4, hy = 8 + bob;
        g.drawImage(hero, hx, hy, w, (w * hero.naturalHeight) / hero.naturalWidth);
        const say = f >= 1 ? "YES!!" : f > 0.6 ? "ALMOST!" : moves <= 3 && moves > 0 ? "HURRY!" : "DRAIN IT!";
        g.font = "900 12px system-ui,sans-serif"; g.textAlign = "center";
        const tw = g.measureText(say).width + 14, bx = hx - tw - 4, by = hy + 6; g.fillStyle = "#fff"; rr(bx, by, tw, 18, 9); g.fill(); g.beginPath(); g.moveTo(bx + tw - 2, by + 6); g.lineTo(bx + tw + 6, by + 10); g.lineTo(bx + tw - 2, by + 13); g.fill();
        g.fillStyle = f >= 1 ? "#1d8f3c" : "#1a2630"; g.fillText(say, bx + tw / 2, by + 13);
      }
      if (flash && flash.life > 0) { g.save(); g.globalAlpha = flash.life / 14; g.fillStyle = "#fff6c0"; g.fillRect(flash.x + T * 0.3, BY - 10, T * 0.4, ROWS * T + 20); g.restore(); flash.life--; }
      for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life--; g.globalAlpha = Math.max(0, p.life / 32); g.fillStyle = p.color; g.fillRect(p.x, p.y, p.s, p.s); }
      g.globalAlpha = 1;
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      for (const p of pops) { g.globalAlpha = Math.min(1, p.life / 20); g.font = "900 17px system-ui,sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#000"; g.fillStyle = p.bad ? "#ff6b5b" : "#ffd23f"; const yy = p.y - (50 - p.life) * 0.8, xx = Math.max(70, Math.min(LW - 70, p.x)); g.strokeText(p.t, xx, yy); g.fillText(p.t, xx, yy); g.globalAlpha = 1; p.life--; }
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
    }

    const upd = () => {
      $("dMoves").textContent = Math.ceil(moves) + "s"; $("dMoves").className = moves <= 3 ? "low" : "";
      const pct = Math.min(100, Math.floor((displayedPan / target) * 100));
      $("dFill").style.width = pct + "%"; $("dPct").textContent = pct + "%";
    };
    let lastFrame = 0;
    const loop = (now = 0) => {
      if (over) return;
      if (!lastFrame) lastFrame = now;
      const dt = Math.min(0.1, Math.max(0, (now-lastFrame)/1000));
      lastFrame = now;
      if (started) moves = Math.max(0, moves-dt);
      if (busyT > 0) busyT--;
      idle++;
      markSolids();
      moved = 0; for (let i = 0; i < 6; i++) stepOil();
      if (shake > 0) { shake--; can.style.transform = "translateX(" + (shake % 2 ? 4 : -4) + "px)"; } else can.style.transform = "";
      // Animate the displayed level without ever crediting oil that hasn't landed.
      displayedPan += Math.min(Math.max(0, inPan - displayedPan), Math.max(0.3, target * dt * .4));
      draw(); upd();
      if (inPan >= target && displayedPan >= target - .5) return finish(true);
      if (moves <= 0) return finish(false);
      raf = requestAnimationFrame(loop);
    };
    function finish(won) {
      if (over) return;
      over = true; cancelAnimationFrame(raf); stopMusic();
      if (won) { sfx("win"); buzz("success"); } else { sfx("hit"); buzz("heavy"); }
      setTimeout(() => {
        el.className = "hidden";
        const encountered = inPan + missedOil;
        const efficiency = encountered ? inPan / encountered : 0;
        const stars = !won ? 0 : efficiency >= .98 && moves >= 60 ? 3 : efficiency >= .8 ? 2 : 1;
        bonusResult(won, Math.ceil(moves) * 2, done);
        const starsLabel = "★".repeat(stars) + "☆".repeat(3 - stars);
        $("details").textContent = "Oil caught: " + Math.round(efficiency * 100) + "% • " + starsLabel + " (" + stars + "/3 stars)";
        $("message").textContent = won ? "OIL DRAINED!" : "TIME IS UP!";
        if (!won) $("details").textContent = "The drain pan didn't fill up in time. Keep going to reach the next bonus round.";
      }, won ? 1000 : 700);
    }
    window.addEventListener("resize", () => { if (!over) fit(); });
    upd(); raf = requestAnimationFrame(loop);
    window.__drain = { grid, channels, group, bestGroup, get inPan() { return inPan; }, target, get moves() { return moves; }, get started() { return started; } };
  }
})();
