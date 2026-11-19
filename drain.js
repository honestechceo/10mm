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
  // PX = logical units per pixel (2.5 = chunky Terraria-style pixels).
  const PX = window.__drainPX || 2.5;
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
          // diagonal only through an open side, so oil can't squeeze between parts that touch at the corners
          else if (!isSolid(x + d, y + 1) && !isSolid(x + d, y)) { nx = x + d; ny = y + 1; }
          else if (!isSolid(x - d, y + 1) && !isSolid(x - d, y)) { nx = x - d; ny = y + 1; }
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
    // ---- Terraria-style pixel textures, built once at low resolution ----
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const TB = Math.round(T / PX); // block size in pixels
    function makeTex(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); fn(x, w, h); return c; }
    const px1 = (x, col, i, j, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(i, j, w, h); };
    const shades = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g2 = (n >> 8) & 255, b = n & 255, m = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return "rgb(" + m(r) + "," + m(g2) + "," + m(b) + ")"; };
    // ore-style block per part type: noisy base, darker rim, bright ore specks
    const blockTex = TYPES.map((tp) => makeTex(TB, TB, (x, w) => {
      for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const r = rnd(); px1(x, r < 0.12 ? shades(tp.b, 0.88) : r < 0.88 ? tp.b : shades(tp.a, 0.9), i, j); }
      for (let k = 0; k < 7; k++) { const i = 2 + Math.floor(rnd() * (w - 5)), j = 2 + Math.floor(rnd() * (w - 5)); px1(x, shades(tp.a, 1.25), i, j, 2, 2); px1(x, "#fff8", i, j); }
      x.fillStyle = shades(tp.b, 0.55); x.fillRect(0, w - 2, w, 2); x.fillRect(w - 2, 0, 2, w);
      x.fillStyle = shades(tp.a, 1.15); x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, w);
      x.fillStyle = "#0009"; x.strokeStyle = "#000"; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, w - 1);
    }));
    // stone brick (steel plates become gray brick you can only blast)
    const brickTex = makeTex(TB, TB, (x, w) => {
      px1(x, "#3a3f47", 0, 0, w, w);
      const bh = Math.max(4, Math.round(w / 3));
      for (let row = 0, y = 0; y < w; row++, y += bh) for (let bx = row % 2 ? -Math.floor(w / 4) : 0; bx < w; bx += Math.floor(w / 2)) {
        for (let j = y + 1; j < Math.min(w, y + bh); j++) for (let i = Math.max(0, bx + 1); i < Math.min(w, bx + Math.floor(w / 2)); i++) px1(x, rnd() < 0.5 ? "#8b929b" : "#7b828b", i, j);
        px1(x, "#a9b0b8", Math.max(0, bx + 1), y + 1, Math.floor(w / 2) - 1, 1);
      }
      x.strokeStyle = "#000"; x.strokeRect(0.5, 0.5, w - 1, w - 1);
    });
    // dirt back-wall behind the blocks (what you see once parts are cleared)
    const wallTex = makeTex(TB * 2, TB * 2, (x, w) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const r = rnd(); px1(x, r < 0.3 ? "#2a1c14" : r < 0.8 ? "#33231a" : "#3d2a1f", i, j); } for (let k = 0; k < 10; k++) px1(x, "#1d130d", Math.floor(rnd() * w), Math.floor(rnd() * w), 2, 1); });
    // gray stone for the engine pan walls, wood planks for the floor
    const stoneTex = makeTex(TB, TB, (x, w) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const r = rnd(); px1(x, r < 0.3 ? "#5d636b" : r < 0.8 ? "#6e757e" : "#868d96", i, j); } for (let k = 0; k < 4; k++) px1(x, "#4a4f56", Math.floor(rnd() * w), Math.floor(rnd() * w), 3, 1); });
    const woodTex = makeTex(TB, 8, (x, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px1(x, j === 0 ? "#c98a4b" : j === h - 1 ? "#4a2a14" : rnd() < 0.15 ? "#7a4a24" : "#98602f", i, j); px1(x, "#4a2a14", w - 1, 0, 1, h); });
    const clouds = [[30, 18, 30], [150, 30, 22], [250, 14, 34]];
    // tile a texture across a rect in logical coords, snapped to the pixel grid
    function tile(tex, x, y, w, h) {
      g.save(); g.imageSmoothingEnabled = false; g.beginPath(); g.rect(x, y, w, h); g.clip();
      const tw = tex.width * PX, th = tex.height * PX;
      for (let yy = y; yy < y + h; yy += th) for (let xx = x; xx < x + w; xx += tw) g.drawImage(tex, xx, yy, tw, th);
      g.restore();
    }
    function torch(x, y) {
      const fl = Math.floor(performance.now() / 120) % 3;
      g.save(); g.globalCompositeOperation = "lighter";
      for (const [r, a] of [[46, 0.06], [32, 0.08], [20, 0.1]]) { g.fillStyle = "rgba(255,170,60," + a + ")"; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.restore();
      g.fillStyle = "#6b4423"; g.fillRect(x - 2.5, y, 5, 14);
      g.fillStyle = "#ff9d2e"; g.fillRect(x - 5, y - 8 - fl * 2.5, 10, 10 + fl * 2.5);
      g.fillStyle = "#ffe27a"; g.fillRect(x - 2.5, y - 5 - fl * 2.5, 5, 6);
    }
    function drawBack() {
      // sky with banded color and blocky clouds
      const sky = ["#4f6fe8", "#5b7cf0", "#6a8af4", "#7c9af6"];
      for (let i = 0; i < 4; i++) { g.fillStyle = sky[i]; g.fillRect(0, i * 15, LW, 15); }
      g.fillStyle = "#e9f0ff";
      for (const [cx, cy, w] of clouds) { const x = ((cx + performance.now() * 0.004) % (LW + 80)) - 40; g.fillRect(x, cy, w * 2, 10); g.fillRect(x + w * 0.4, cy - 7.5, w, 7.5); }
      // grass + dirt surface line
      g.fillStyle = "#3a9c2a"; g.fillRect(0, 52, LW, 5); g.fillStyle = "#62c742"; g.fillRect(0, 52, LW, 2.5);
      // engine oil pan: stone chamber
      tile(stoneTex, 0, 57, LW, PAN_TOP - 57 + 6);
      tile(wallTex, 10, 68, LW - 20, PAN_TOP - 68);
      g.fillStyle = "#0006"; g.fillRect(10, 68, LW - 20, 5);
      for (let x = 18; x < LW; x += 38) { g.fillStyle = "#2b2f35"; g.fillRect(x - 3, 59, 6, 6); g.fillStyle = "#a9b0b8"; g.fillRect(x - 3, 59, 2.5, 2.5); }
      txt("ENGINE OIL PAN", 12, 50, 1.25, "#fff", "left");
      // board: dirt wall behind, wood beam frame on top
      tile(wallTex, 0, BY - 8, LW, ROWS * T + 14);
      tile(woodTex, 0, BY - 8, LW, 8);
      // floor under the board and the shop floor
      tile(woodTex, 0, FLOOR, LW, 8);
      tile(stoneTex, 0, FLOOR + 8, LW, LH - FLOOR);
      g.fillStyle = "#0005"; g.fillRect(0, FLOOR + 8, LW, LH - FLOOR);
    }
    function drawLights() { torch(18, FLOOR + 30); torch(LW - 18, FLOOR + 30); }
    function drawOil() {
      const px = oilImg.data, t = performance.now() * 0.002;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const k = idx(x, y), o = k * 4;
        if (cell[k] !== 1) { px[o + 3] = 0; continue; }
        const top = y === 0 || cell[idx(x, y - 1)] !== 1, sh = Math.sin(t + x * 0.35 + y * 0.2) * 12 + (shade[k] - 128) * 0.07;
        if (top) { px[o] = 255; px[o + 1] = 214; px[o + 2] = 110; }
        else { const b = sh > 4 ? 1 : sh < -4 ? -1 : 0; px[o] = 168 + b * 22; px[o + 1] = 98 + b * 16; px[o + 2] = 12; }
        px[o + 3] = top ? 255 : 225;
      }
      oilCtx.putImageData(oilImg, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(oilCan, 0, 0, LW, LH);
      g.imageSmoothingEnabled = true;
    }
    function drawTile(tl, x, y, glow) {
      const s = 1 - Math.max(0, tl.pop) * 0.015, w = Math.round((T * s) / PX) * PX, x0 = Math.round((x + (T - w) / 2) / PX) * PX, y0 = Math.round((y + (T - w) / 2) / PX) * PX;
      g.imageSmoothingEnabled = false;
      if (tl.t === STEEL) { g.drawImage(brickTex, x0, y0, w, w); return; }
      if (typeof tl.t === "number") {
        g.drawImage(blockTex[tl.t], x0, y0, w, w);
        g.imageSmoothingEnabled = true; fitImg(imgs[tl.t], x0 + w / 2, y0 + w / 2, w - 14);
      } else {
        g.drawImage(blockTex[1], x0, y0, w, w);
        g.imageSmoothingEnabled = true; fitImg(tl.t === ROCKET ? rocketImg : blastImg, x0 + w / 2, y0 + w / 2, w - 6);
        if (Math.floor(performance.now() / 160) % 2) { g.fillStyle = "#fff"; g.fillRect(x0, y0, w, PX); g.fillRect(x0, y0 + w - PX, w, PX); g.fillRect(x0, y0, PX, w); g.fillRect(x0 + w - PX, y0, PX, w); }
      }
      if (glow) { g.fillStyle = "#fff"; g.fillRect(x0, y0, w, PX); g.fillRect(x0, y0 + w - PX, w, PX); g.fillRect(x0, y0, PX, w); g.fillRect(x0 + w - PX, y0, PX, w); g.fillStyle = "#ffffff30"; g.fillRect(x0, y0, w, w); }
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
      drawOil(); drawLights();
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
