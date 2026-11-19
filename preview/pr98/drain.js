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
    el.innerHTML = '<div class="bhead"><div>DRAIN THE OIL <small>1986 ARCADE EDITION • CLEAR PARTS TO OPEN THE DRAIN.</small></div><div class="dmoves"><span>TIME</span><b id="dMoves">0</b></div></div>' +
      '<div class="dhint">MATCH 2+ • OPEN THE CHANNEL • CATCH THE OIL</div><div class="dwrap" id="dWrap"><canvas id="dCan"></canvas></div><div class="dmeter"><span>OIL COLLECTED</span><div><i id="dFill"></i></div><b id="dPct">0%</b></div>';
    const wrap = $("dWrap"), can = $("dCan"), g = can.getContext("2d");
    el.style.cssText = "font-family:monospace;background:#080e1d;color:#f8d27c";
    el.querySelector(".bhead").style.cssText = "font-family:monospace;color:#f8c456;text-shadow:3px 3px #593116";
    el.querySelector(".dhint").style.cssText = "font-family:monospace;color:#8be1e5;letter-spacing:1px";
    el.querySelector(".dmeter").style.cssText = "font-family:monospace;color:#f8c456";
    wrap.style.cssText += ";border:4px solid #4a718b;box-shadow:0 0 0 3px #102538,0 0 24px #0e718077";
    
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
    // This round deliberately uses 1980s industrial pixel-art, unlike the
    // main game and service bay. All art is drawn on the local canvas.
    function drawBack() {
      g.fillStyle = "#080e1d"; g.fillRect(0, 0, LW, LH);
      // Factory wall: riveted iron panels, caution bands, ventilation ducts.
      for (let y = 0; y < LH; y += 40) for (let x = 0; x < LW; x += 70) {
        g.fillStyle = (Math.floor(x / 70) + Math.floor(y / 40)) % 2 ? "#101d30" : "#0c1828";
        g.fillRect(x + 1, y + 1, 68, 38);
        g.fillStyle = "#28445c"; g.fillRect(x + 5, y + 5, 3, 3);
        g.fillRect(x + 61, y + 31, 3, 3);
      }
      g.fillStyle = "#30475a"; g.fillRect(12, 0, 17, LH); g.fillRect(LW - 28, 0, 17, LH);
      g.fillStyle = "#102a3e"; g.fillRect(16, 0, 8, LH); g.fillRect(LW - 24, 0, 8, LH);
      for (let y = 12; y < LH; y += 35) { g.fillStyle = "#6b8ba0"; g.fillRect(17, y, 5, 5); g.fillRect(LW - 23, y, 5, 5); }
      g.fillStyle = "#0b101a"; g.fillRect(6, 57, LW - 12, PAN_TOP - 53);
      g.fillStyle = "#58738a"; g.fillRect(4, 55, LW - 8, 6);
      g.fillStyle = "#c18d35"; g.fillRect(4, PAN_TOP - 4, LW - 8, 5);
      for (let x = 10; x < LW - 10; x += 24) { g.fillStyle = "#354c60"; g.fillRect(x, 61, 4, 4); }
      g.font = "bold 12px monospace"; g.fillStyle = "#f6bd55"; g.textAlign = "left";
      g.fillText("ENGINE OIL RESERVOIR", 12, 48);
      g.fillStyle = "#345267"; g.fillRect(0, BY - 9, LW, ROWS * T + 18);
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        g.fillStyle = (row + col) % 2 ? "#101c2c" : "#142337";
        g.fillRect(col * T + 1, BY + row * T + 1, T - 2, T - 2);
        g.fillStyle = "#20344b"; g.fillRect(col * T + 2, BY + row * T + 2, T - 4, 2);
      }
      g.fillStyle = "#111c2b"; g.fillRect(0, FLOOR + 7, LW, LH - FLOOR);
      g.fillStyle = "#ffc44f"; g.fillRect(0, FLOOR + 12, LW, 5);
      for (let x = 0; x < LW; x += 26) {
        g.fillStyle = "#192b3b"; g.beginPath(); g.moveTo(x, FLOOR + 17); g.lineTo(x + 11, FLOOR + 17); g.lineTo(x + 26, FLOOR + 30); g.lineTo(x + 15, FLOOR + 30); g.fill();
      }
    }
    const fluidMask = document.createElement("canvas"); fluidMask.width = LW * 2; fluidMask.height = LH * 2;
    const fluidCtx = fluidMask.getContext("2d");
    function drawOil() {
      // Render ONLY actual simulated particles. Blend the low-res physics grid
      // into a continuous fluid silhouette, then shade the liquid as one body.
      // No independent streams or visual oil that can bypass solid blocks.
      const px = oilImg.data, t = performance.now() * .001;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const k = idx(x, y), o = k * 4;
        if (cell[k] !== 1) { px[o+3] = 0; continue; }
        px[o] = 255; px[o+1] = 255; px[o+2] = 255; px[o+3] = 255;
      }
      oilCtx.putImageData(oilImg, 0, 0);
      g.save();
      // Fluid silhouette is softened in screen-space, not cell-by-cell.
      // source-in restricts all color to the real particle footprint.
      const mask = fluidMask;
      const mg = fluidCtx;
      mg.clearRect(0, 0, mask.width, mask.height);
      mg.globalCompositeOperation = "source-over";
      mg.imageSmoothingEnabled = true;
      mg.filter = "blur(1.3px)";
      mg.drawImage(oilCan, 0, 0, mask.width, mask.height);
      mg.filter = "none";
      mg.globalCompositeOperation = "source-in";
      const liquid = mg.createLinearGradient(0, 0, mask.width, mask.height);
      liquid.addColorStop(0, "#71360e");
      liquid.addColorStop(.42, "#b66b1d");
      liquid.addColorStop(.76, "#d98d2d");
      liquid.addColorStop(1, "#62300f");
      mg.fillStyle = liquid; mg.fillRect(0, 0, mask.width, mask.height);
      g.globalAlpha = .94;
      g.drawImage(mask, 0, 0, LW, LH);
      g.restore();
    }
    // Draw unmistakable automotive TOOLS as low-resolution arcade sprites.
    // Render once at 32px, then scale without smoothing for crisp 1986 pixels.
    const toolSprites = [];
    function toolSprite(type) {
      if (toolSprites[type]) return toolSprites[type];
      const cv = document.createElement("canvas"); cv.width = cv.height = 32;
      const p = cv.getContext("2d"); p.lineCap = "square"; p.lineJoin = "miter";
      const metal = "#e3edf3", edge = "#17283a", shine = "#8edfff";
      const stroke = (color, width, pts) => {
        p.strokeStyle = color; p.lineWidth = width; p.beginPath();
        pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y)); p.stroke();
      };
      if (type === 0) { // open-end wrench, diagonal shaft and jaws
        stroke(edge, 9, [[8,25],[23,10]]); stroke(metal, 5, [[8,25],[23,10]]);
        stroke(edge, 7, [[18,5],[23,10],[29,10]]);
        stroke(metal, 4, [[18,5],[23,10],[29,10]]);
        p.fillStyle = edge; p.fillRect(5,24,6,5); p.fillStyle = shine; p.fillRect(7,25,3,2);
      } else if (type === 1) { // Phillips screwdriver with a colored handle
        stroke(edge, 6, [[20,8],[9,23]]); stroke(metal, 3, [[20,8],[9,23]]);
        stroke(edge, 10, [[22,5],[27,10]]); stroke("#ffcf59", 7, [[22,5],[27,10]]);
        p.fillStyle=shine; p.fillRect(8,23,3,3);
      } else if (type === 2) { // crossed-jaw pliers
        stroke(edge, 7, [[8,27],[17,15],[25,5]]); stroke(metal, 4, [[8,27],[17,15],[25,5]]);
        stroke(edge, 7, [[26,27],[17,15],[9,5]]); stroke("#ffb06b", 4, [[26,27],[17,15],[9,5]]);
        p.fillStyle=metal; p.fillRect(15,13,5,5); p.fillStyle=edge; p.fillRect(16,14,2,2);
      } else if (type === 3) { // ratchet wrench with socket head
        stroke(edge, 9, [[9,26],[21,11]]); stroke(metal, 6, [[9,26],[21,11]]);
        p.fillStyle=edge; p.fillRect(16,3,14,14); p.fillStyle="#ffa3b4"; p.fillRect(18,5,10,10);
        p.fillStyle=edge; p.fillRect(21,8,4,4); p.fillStyle=shine; p.fillRect(7,23,3,3);
      } else { // hammer: block head and long handle
        stroke(edge, 9, [[11,27],[20,9]]); stroke("#a5f2b6", 5, [[11,27],[20,9]]);
        p.fillStyle=edge; p.fillRect(10,3,20,10); p.fillStyle=metal; p.fillRect(12,5,16,6);
        p.fillStyle=shine; p.fillRect(13,5,10,2);
      }
      toolSprites[type] = cv; return cv;
    }
    function pixelIcon(type) {
      g.save(); g.imageSmoothingEnabled = false;
      g.drawImage(toolSprite(type), -18, -18, 36, 36);
      g.restore();
    }
    function drawTile(tl, x, y, glow) {
      const cx = x + T / 2, cy = y + T / 2, w = 44 - Math.max(0, tl.pop) * .4;
      g.save(); g.translate(cx, cy);
      const colors = ["#256ca6","#ac7a20","#b85626","#9b3354","#2b815c"];
      const color = typeof tl.t === "number" ? colors[tl.t] : "#5c6680";
      g.fillStyle = "#050b16"; g.fillRect(-w/2 + 3, -w/2 + 4, w, w);
      g.fillStyle = glow ? "#ffe18c" : "#9bb5c7"; g.fillRect(-w/2, -w/2, w, w);
      g.fillStyle = color; g.fillRect(-w/2 + 4, -w/2 + 4, w - 8, w - 8);
      g.fillStyle = "#ffffff55"; g.fillRect(-w/2 + 5, -w/2 + 5, w - 10, 3);
      g.fillStyle = "#102031"; g.fillRect(-w/2 + 5, w/2 - 8, w - 10, 3);
      if (typeof tl.t === "number") pixelIcon(tl.t);
      else {
        g.font = "bold 23px monospace"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = tl.t === STEEL ? "#d6e0e8" : "#ffe47a";
        g.fillText(tl.t === STEEL ? "X" : tl.t === ROCKET ? "↑" : "*", 0, 1);
      }
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
        bonusResult(won, Math.ceil(moves) * 2, done, {stars, efficiency, caught: inPan});
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
