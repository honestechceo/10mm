// Where's My 10MM?! — "Drain the Oil" bonus round (match-and-drop style).
// Old oil sits in the engine's oil pan at the top. Tap 2+ touching matching parts to clear them;
// parts above drop down. Open a channel so the oil pours into the drain pan before your moves run out.
// Big groups make power parts: 6-7 = TORQUE ROCKET (clears its column), 8+ = OIL BLAST (clears around it).
"use strict";
(() => {
  const LW = 350, LH = 640, C = 5, GW = LW / C, GH = LH / C;
  const COLS = 7, ROWS = 8, T = 50, BX = 0, BY = 162, TCELL = T / C;
  const PAN_TOP = 146;
  // retro look: the board is drawn on a low-res canvas and blown up with hard pixels.
  // PX = logical units per pixel: 2.5 = chunky 16-bit, 1.25 = finer 32-bit.
  const PX = window.__drainPX || 1.25;
  // tiny 5x7 bitmap font so text looks like an old console game (each glyph = 35 bits, row by row)
  const FONT = {"A":15621670449,"B":32801506878,"C":16660316687,"D":32801080894,"E":33840644639,"F":33840644624,"G":16660547119,"H":18842895921,"I":33424543903,"J":7585466956,"K":18879369809,"L":17734058527,"M":19182306865,"N":19115132465,"O":15621211694,"P":32801505808,"Q":15621215821,"R":32801509969,"S":16660235326,"T":33424543876,"U":18842437166,"V":18842436932,"W":18842572458,"X":18834663985,"Y":18834657412,"Z":33321787935,"0":15692654126,"1":4701950094,"2":15603929375,"3":32247317566,"4":2359917634,"5":33854359086,"6":15587034670,"7":33321787656,"8":15621113390,"9":15621129262,"!":4433514500,"?":15604060164,".":4,"%":27718197619,"+":139432064,"-":1015808,"'":4437573632};
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
    const n = Math.round(level / 10), moves = Math.max(14, 22 - Math.floor(n / 4));
    popup("BONUS ROUND!", "DRAIN THE OIL: tap 2 or more matching parts that touch. Parts above drop down. Open a path so the old oil pours into the drain pan in " + moves + " moves! Clear 6+ for a Torque Rocket, 8+ for an Oil Blast.", "START", () => runDrain(done, moves, n), "toolbox");
    $("eyebrow").textContent = "BONUS ROUND " + n + " OF " + MAX_LEVEL / 10;
  };

  function runDrain(done, maxMoves, n) {
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    let el = $("drn");
    if (!el) { el = document.createElement("div"); el.id = "drn"; document.body.append(el); }
    el.className = "";
    el.innerHTML = '<div class="bhead"><div>DRAIN THE OIL<small>Tap 2+ matching parts. Parts above drop down.</small></div><div class="dmoves"><span>MOVES</span><b id="dMoves">0</b></div></div>' +
      '<div class="dwrap" id="dWrap"><canvas id="dCan"></canvas></div><div class="dmeter"><span>DRAIN PAN</span><div><i id="dFill"></i></div><b id="dPct">0%</b></div>';
    const wrap = $("dWrap"), can = $("dCan"), out = can.getContext("2d");
    const lowCan = document.createElement("canvas"); lowCan.width = Math.round(LW / PX); lowCan.height = Math.round(LH / PX);
    const g = lowCan.getContext("2d"); g.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
    let texts = [];
    // text is drawn crisp on top of the pixel art so it stays readable
    const txt = (t, x, y, size, fill, align, stroke) => texts.push([t, x, y, size, fill, align || "center", stroke === undefined ? "#000" : stroke]);
    const fit = () => {
      const s = Math.min(wrap.clientWidth / LW, wrap.clientHeight / LH), dpr = window.devicePixelRatio || 1;
      can.style.width = LW * s + "px"; can.style.height = LH * s + "px";
      can.width = Math.round(LW * s * dpr); can.height = Math.round(LH * s * dpr);
    };
    const textW = (t, u) => t.length * 6 * u - u;
    function bitText(t, x, y, u, fill, align, stroke) {
      let sx = align === "center" ? x - textW(t, u) / 2 : align === "right" ? x - textW(t, u) : x;
      const top = y - 7 * u;
      const paint = (col, ox, oy, grow) => {
        out.fillStyle = col;
        for (let i = 0; i < t.length; i++) {
          const bits = FONT[t[i]]; if (!bits) continue;
          const gx = sx + i * 6 * u;
          for (let k = 0; k < 35; k++) if (Math.floor(bits / 2 ** (34 - k)) % 2) out.fillRect(gx + (k % 5) * u + ox - grow, top + Math.floor(k / 5) * u + oy - grow, u + grow * 2, u + grow * 2);
        }
      };
      if (stroke) { paint(stroke, u * 0.6, u * 0.6, u * 0.6); paint(stroke, 0, 0, u * 0.6); }
      paint(fill, 0, 0, 0);
    }
    function present() {
      out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false;
      out.clearRect(0, 0, can.width, can.height);
      out.drawImage(lowCan, 0, 0, can.width, can.height);
      const k = can.width / LW; out.setTransform(k, 0, 0, k, 0, 0);
      for (const [t, x, y, u, fill, align, stroke] of texts) bitText(t.toUpperCase(), x, y, u, fill, align, stroke);
      out.globalAlpha = 1; texts = [];
    }
    fit();

    // board: each tile has a type and an animated y so it can drop into place
    const ntypes = n < 6 ? 4 : 5;
    const grid = [];
    for (let r = 0; r < ROWS; r++) { grid.push([]); for (let c = 0; c < COLS; c++) grid[r].push({ t: Math.floor(Math.random() * ntypes), y: BY + r * T - 260 - (ROWS - r) * 30, vy: 0, pop: 0 }); }
    const steelCount = Math.min(8, 2 + Math.floor(n / 3));
    for (let k = 0; k < steelCount; k++) grid[3 + Math.floor(Math.random() * (ROWS - 3))][Math.floor(Math.random() * COLS)].t = STEEL;

    // liquid grid
    const cell = new Uint8Array(GW * GH), shade = new Uint8Array(GW * GH), solid = new Uint8Array(GW * GH);
    const idx = (x, y) => y * GW + x;
    let total = 0;
    for (let y = Math.floor(72 / C); y < Math.floor(PAN_TOP / C); y++) for (let x = 2; x < GW - 2; x++) if (Math.random() < 0.94) { cell[idx(x, y)] = 1; shade[idx(x, y)] = Math.random() * 255; total++; }
    const target = Math.floor(total * 0.6), PAN_Y = Math.floor((LH - 34) / C);
    let inPan = 0, moved = 0, started = false;
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
    };
    function fire(r, c, kind) {
      grid[r][c] = null; burst(r, c, "#ffd23f");
      const hit = (rr, cc) => { const t = grid[rr][cc]; if (t && (t.t === ROCKET || t.t === BLAST)) fire(rr, cc, t.t); else remove(rr, cc); };
      if (kind === ROCKET) { for (let rr = 0; rr < ROWS; rr++) hit(rr, c); pops.push({ x: BX + c * T + T / 2, y: BY + 20, t: "ROCKET!", life: 50 }); flash = { x: BX + c * T, life: 14 }; }
      else { for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) hit(rr, cc); pops.push({ x: BX + c * T + T / 2, y: BY + r * T, t: "OIL BLAST!", life: 50 }); shake = 12; }
    }

    // parts fall into gaps; steel plates stay bolted in place
    function gravity() {
      for (let c = 0; c < COLS; c++) {
        let write = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          const tl = grid[r][c];
          if (tl && tl.t === STEEL) { write = r - 1; continue; }
          if (!tl) continue;
          if (write !== r) { grid[write][c] = tl; grid[r][c] = null; }
          write--;
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
      if (tl.t === ROCKET || tl.t === BLAST) { moves--; fire(r, c, tl.t); sfx("power"); buzz("heavy"); after(); return; }
      const gp = group(r, c);
      if (gp.length < 2) { sfx("miss"); buzz("light"); pops.push({ x, y, t: "Needs a match", life: 40, bad: 1 }); tl.pop = 8; return; }
      moves--;
      for (const [rr, cc] of gp) remove(rr, cc);
      if (gp.length >= 6) for (const [rr, cc] of gp) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = rr + dr, b = cc + dc; if (a >= 0 && a < ROWS && b >= 0 && b < COLS && grid[a][b] && grid[a][b].t === STEEL) remove(a, b); }
      if (gp.length >= 6) { grid[r][c] = { t: gp.length >= 8 ? BLAST : ROCKET, y: BY + r * T, vy: 0, pop: 14 }; pops.push({ x, y, t: gp.length >= 8 ? "OIL BLAST MADE!" : "TORQUE ROCKET!", life: 50 }); }
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
          if (y >= PAN_Y) { cell[k] = 0; inPan++; moved++; continue; }
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
      g.fillStyle = "#2a3038"; g.fillRect(0, 0, LW, LH);
      g.strokeStyle = "#20252c"; g.lineWidth = 2;
      for (let y = 0, row = 0; y < LH; y += 22, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); for (let x = (row % 2) * 24; x < LW; x += 48) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
      if (ready(engImg)) { g.save(); g.globalAlpha = 0.6; const w = LW * 1.2, h = (w * engImg.naturalHeight) / engImg.naturalWidth; g.drawImage(engImg, (LW - w) / 2, 64 - h * 0.92, w, h); g.restore(); }
      const pg = g.createLinearGradient(0, 56, 0, PAN_TOP + 10); pg.addColorStop(0, "#6a747e"); pg.addColorStop(1, "#2b3138");
      g.fillStyle = "#59636d"; g.fillRect(-6, 56, LW + 12, PAN_TOP - 48); g.fillStyle = "#8a96a2"; g.fillRect(-6, 56, LW + 12, 5); g.fillStyle = "#2b3138"; g.fillRect(-6, PAN_TOP + 3, LW + 12, 5);
      g.fillStyle = "#14181d"; g.fillRect(10, 68, LW - 20, PAN_TOP - 68);
      g.fillStyle = "#9aa6b2"; for (let x = 18; x < LW; x += 38) g.fillRect(x - 3, 59, 6, 6);
      txt("ENGINE OIL PAN", 12, 52, 1.25, "#e6edf3", "left");
      // board frame like a tool chest drawer
      g.fillStyle = "#b52a20"; g.fillRect(BX - 1, BY - 8, COLS * T + 2, ROWS * T + 14); g.fillStyle = "#e0503f"; g.fillRect(BX - 1, BY - 8, COLS * T + 2, 3);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.fillStyle = (r + c) % 2 ? "#1b232c" : "#202933"; g.fillRect(BX + c * T, BY + r * T, T, T); }
      g.fillStyle = "#3b4048"; g.fillRect(0, FLOOR + 6, LW, LH - FLOOR);
      g.fillStyle = "#ffd23f"; g.fillRect(0, FLOOR + 14, LW, 4);
    }
    function drawOil() {
      const px = oilImg.data, t = performance.now() * 0.002;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const k = idx(x, y), o = k * 4;
        if (cell[k] !== 1) { px[o + 3] = 0; continue; }
        const top = y === 0 || cell[idx(x, y - 1)] !== 1, sh = Math.sin(t + x * 0.35 + y * 0.2) * 12 + (shade[k] - 128) * 0.07;
        if (top) { px[o] = 255; px[o + 1] = 214; px[o + 2] = 110; }
        else { const b = sh > 4 ? 1 : sh < -4 ? -1 : 0; px[o] = 168 + b * 22; px[o + 1] = 98 + b * 16; px[o + 2] = 12; }
        px[o + 3] = 250;
      }
      oilCtx.putImageData(oilImg, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(oilCan, 0, 0, LW, LH);
      g.imageSmoothingEnabled = true;
    }
    // retro block: flat color, light top-left bevel, dark bottom-right bevel, black outline
    function block(x, y, w, hi, mid, lo) {
      const e = Math.max(2, PX * 1.6);
      g.fillStyle = "#000"; g.fillRect(x - PX, y - PX, w + PX * 2, w + PX * 2);
      g.fillStyle = lo; g.fillRect(x, y, w, w);
      g.fillStyle = hi; g.fillRect(x, y, w - e, w - e);
      g.fillStyle = mid; g.fillRect(x + e, y + e, w - e * 2, w - e * 2);
    }
    function drawTile(tl, x, y, glow) {
      const s = 1 - Math.max(0, tl.pop) * 0.015, w = Math.round(((T - 6) * s) / PX) * PX, x0 = Math.round((x + (T - w) / 2) / PX) * PX, y0 = Math.round((y + (T - w) / 2) / PX) * PX;
      if (tl.t === STEEL) {
        block(x0, y0, w, "#e1e7ed", "#9aa6b1", "#4b545e");
        g.fillStyle = "#3e4750"; for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.fillRect(x0 + 7 + a * (w - 20), y0 + 7 + b * (w - 20), 6, 6);
        return;
      }
      let a = "#ffe27a", b = "#e08a00";
      if (typeof tl.t === "number") { a = TYPES[tl.t].a; b = TYPES[tl.t].b; }
      if (glow) { g.fillStyle = "#fff8c0"; g.fillRect(x0 - PX * 2, y0 - PX * 2, w + PX * 4, w + PX * 4); }
      block(x0, y0, w, "#ffffffcc", a, b);
      g.fillStyle = a; g.fillRect(x0 + 4, y0 + 4, w - 8, w - 8);
      g.fillStyle = b; g.fillRect(x0 + 4, y0 + w * 0.55, w - 8, w * 0.45 - 4);
      if (typeof tl.t === "number") fitImg(imgs[tl.t], x0 + w / 2, y0 + w / 2 + 1, w - 10);
      else {
        fitImg(tl.t === ROCKET ? rocketImg : blastImg, x0 + w / 2, y0 + w / 2, w - 6);
        if (Math.floor(performance.now() / 160) % 2) { g.fillStyle = "#fff"; g.fillRect(x0, y0, w, PX); g.fillRect(x0, y0 + w - PX, w, PX); g.fillRect(x0, y0, PX, w); g.fillRect(x0 + w - PX, y0, PX, w); }
      }
    }
    let heroCache = null;
    const heroImg = () => { if (!heroCache) heroCache = load(typeof skinSrc === "function" ? skinSrc() : "socket-chrome.webp"); return heroCache; };
    function draw() {
      g.clearRect(0, 0, LW, LH);
      drawBack();
      const hl = new Set();
      if (hover && grid[hover[0]][hover[1]] && typeof grid[hover[0]][hover[1]].t === "number") { const gp = group(hover[0], hover[1]); if (gp.length >= 2) gp.forEach(([r, c]) => hl.add(r * COLS + c)); }
      const hint = idle > 300 && moves > 0 ? new Set(bestGroup().map(([r, c]) => r * COLS + c)) : null;
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
      const panW = LW - 30, panX = 15, panY = LH - 58;
      const f = Math.min(1, inPan / target);
      if (f > 0) { const h = 6 + f * 22, x = panX + 26, y = panY + 44 - h, w = panW - 52; g.fillStyle = "#6b3a05"; g.fillRect(x, y, w, h); g.fillStyle = "#c27a12"; g.fillRect(x, y, w, h * 0.6); g.fillStyle = "#ffcf6e"; g.fillRect(x, y, w, 3); }
      if (ready(panImg)) g.drawImage(panImg, panX - 4, panY, panW + 8, ((panW + 8) * panImg.naturalHeight) / panImg.naturalWidth);
      const hero = heroImg();
      if (ready(hero)) {
        const bob = Math.sin(performance.now() / 260) * 2, w = 74, hx = LW - w - 4, hy = 8 + bob;
        g.drawImage(hero, hx, hy, w, (w * hero.naturalHeight) / hero.naturalWidth);
        const say = f >= 1 ? "YES!!" : f > 0.6 ? "ALMOST!" : moves <= 3 && moves > 0 ? "HURRY!" : "DRAIN IT!";
        const tw = textW(say, 1.25) + 12, bx = hx - tw - 6, by = hy + 6;
        g.fillStyle = "#000"; g.fillRect(bx - 2, by - 2, tw + 4, 22); g.fillStyle = "#fff"; g.fillRect(bx, by, tw, 18); g.fillRect(bx + tw, by + 6, 6, 6);
        txt(say, bx + tw / 2, by + 13.5, 1.25, f >= 1 ? "#1d8f3c" : "#1a2630", "center", null);
      }
      if (flash && flash.life > 0) { g.save(); g.globalAlpha = flash.life / 14; g.fillStyle = "#fff6c0"; g.fillRect(flash.x + T * 0.3, BY - 10, T * 0.4, ROWS * T + 20); g.restore(); flash.life--; }
      for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life--; g.globalAlpha = Math.max(0, p.life / 32); g.fillStyle = p.color; g.fillRect(Math.round(p.x / PX) * PX, Math.round(p.y / PX) * PX, Math.max(PX, Math.round(p.s / PX) * PX), Math.max(PX, Math.round(p.s / PX) * PX)); }
      g.globalAlpha = 1;
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      for (const p of pops) { const yy = p.y - (50 - p.life) * 0.8, xx = Math.max(80, Math.min(LW - 80, p.x)); if (p.life > 6 || p.life % 2) txt(p.t, xx, yy, 2, p.bad ? "#ff6b5b" : "#ffd23f"); p.life--; }
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
    }

    const upd = () => {
      $("dMoves").textContent = moves; $("dMoves").className = moves <= 3 ? "low" : "";
      const pct = Math.min(100, Math.floor((inPan / target) * 100));
      $("dFill").style.width = pct + "%"; $("dPct").textContent = pct + "%";
    };
    const loop = () => {
      if (over) return;
      if (busyT > 0) busyT--;
      idle++;
      markSolids();
      moved = 0; stepOil(); stepOil(); stepOil();
      if (shake > 0) { shake--; can.style.transform = "translateX(" + (shake % 2 ? 4 : -4) + "px)"; } else can.style.transform = "";
      draw(); present(); upd();
      if (inPan >= target) return finish(true);
      if (moves <= 0) { settleT = moved > 2 ? 0 : settleT + 1; if (settleT > 75) return finish(false); }
      raf = requestAnimationFrame(loop);
    };
    function finish(won) {
      if (over) return;
      over = true; cancelAnimationFrame(raf); stopMusic();
      if (won) { sfx("win"); buzz("success"); } else { sfx("hit"); buzz("heavy"); }
      setTimeout(() => {
        el.className = "hidden";
        bonusResult(won, moves * 2, done);
        $("details").textContent = $("details").textContent.replace(/^Found with [\d.]+s left!/, "Drained with " + moves + " move" + (moves === 1 ? "" : "s") + " to spare!");
        $("message").textContent = won ? "OIL DRAINED!" : "OUT OF MOVES!";
        if (!won) $("details").textContent = "The drain pan didn't fill up in time. Keep going to reach the next bonus round.";
      }, won ? 1000 : 700);
    }
    window.addEventListener("resize", () => { if (!over) fit(); });
    upd(); raf = requestAnimationFrame(loop);
    window.__drain = { grid, group, bestGroup, get inPan() { return inPan; }, target, get moves() { return moves; }, get started() { return started; } };
  }
})();
