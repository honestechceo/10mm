// Where's My 10MM?! — "Drain the Oil" bonus round.
// Old oil sits in the engine's oil pan at the top. Tap groups of 2+ matching parts to clear them
// and open a path so the oil can pour down into the drain pan before time runs out.
"use strict";
(() => {
  const LW = 336, LH = 560, C = 4, GW = LW / C, GH = LH / C; // logical size and fine oil grid
  const COLS = 7, ROWS = 7, T = 48, TOP = 120, GRID_Y = TOP / C, TCELL = T / C;
  const TYPES = [
    { img: "tool-wrench.webp", bg: "#dfe8f2" },
    { img: "tool-nut.webp", bg: "#f2e3c4" },
    { img: "svc-filter.webp", bg: "#ffd9b0" },
    { img: "svc-funnel.webp", bg: "#ffd2d2" },
  ];
  const STEEL = "steel";
  const imgs = TYPES.map((t) => { const i = new Image(); i.src = t.img; return i; });
  const panImg = new Image(); panImg.src = "svc-pan.webp";
  const engImg = new Image(); engImg.src = "scene-plug.webp";

  window.runDrainIntro = function (done) {
    const n = Math.round(level / 10), secs = Math.max(35, 60 - n);
    popup("BONUS ROUND!", "DRAIN THE OIL: tap 2 or more matching parts that touch to clear them. Open a path so the old oil pours into the drain pan. Fill it in " + secs + " seconds!", "START", () => runDrain(done, secs, n), "toolbox");
    $("eyebrow").textContent = "BONUS ROUND " + n + " OF " + MAX_LEVEL / 10;
  };

  function runDrain(done, secs, n) {
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    let el = $("drn");
    if (!el) { el = document.createElement("div"); el.id = "drn"; document.body.append(el); }
    el.className = "";
    el.innerHTML = '<div class="bhead"><div>DRAIN THE OIL<small>Tap 2+ matching parts to clear a path</small></div><div id="dTime">0</div></div><div class="bbar"><i id="dBar"></i></div><div class="dwrap" id="dWrap"><canvas id="dCan"></canvas></div><div class="dmeter"><span>DRAIN PAN</span><div><i id="dFill"></i></div><b id="dPct">0%</b></div>';
    const wrap = $("dWrap"), can = $("dCan"), g = can.getContext("2d");
    const fit = () => {
      const s = Math.min(wrap.clientWidth / LW, wrap.clientHeight / LH), dpr = window.devicePixelRatio || 1;
      can.style.width = LW * s + "px"; can.style.height = LH * s + "px";
      can.width = Math.round(LW * s * dpr); can.height = Math.round(LH * s * dpr);
      g.setTransform((LW * s * dpr) / LW, 0, 0, (LH * s * dpr) / LH, 0, 0);
      return s;
    };
    let scale = fit();

    // tiles
    const tiles = [];
    const steelCount = Math.min(5, 1 + Math.floor(n / 4));
    for (let r = 0; r < ROWS; r++) { tiles.push([]); for (let c = 0; c < COLS; c++) tiles[r].push(Math.floor(Math.random() * TYPES.length)); }
    for (let k = 0; k < steelCount; k++) tiles[1 + Math.floor(Math.random() * (ROWS - 2))][Math.floor(Math.random() * COLS)] = STEEL;
    // fine grid: 0 empty, 1 oil, 2 wall
    const cell = new Uint8Array(GW * GH), shade = new Uint8Array(GW * GH);
    const solidTile = new Uint8Array(GW * GH);
    const oilCan = document.createElement("canvas"); oilCan.width = GW; oilCan.height = GH;
    const oilCtx = oilCan.getContext("2d"), oilImg = oilCtx.createImageData(GW, GH);
    const idx = (x, y) => y * GW + x;
    const markTiles = () => {
      solidTile.fill(0);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (tiles[r][c] !== null) {
        for (let y = 0; y < TCELL; y++) for (let x = 0; x < TCELL; x++) solidTile[idx(c * TCELL + x, GRID_Y + r * TCELL + y)] = 1;
      }
    };
    markTiles();
    // engine oil pan at the top, full of old oil
    let total = 0;
    for (let y = 3; y < GRID_Y; y++) for (let x = 0; x < GW; x++) if (Math.random() < 0.93) { cell[idx(x, y)] = 1; shade[idx(x, y)] = Math.random() * 255; total++; }
    const PAN_Y = GH - 10, target = Math.floor(total * 0.6);
    let inPan = 0;
    const solid = (x, y) => x < 0 || x >= GW || y < 0 || y >= GH || cell[idx(x, y)] !== 0 || solidTile[idx(x, y)];

    // tap groups
    const group = (r0, c0) => {
      const t = tiles[r0][c0], seen = new Set([r0 * COLS + c0]), q = [[r0, c0]];
      while (q.length) {
        const [r, c] = q.pop();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || seen.has(rr * COLS + cc) || tiles[rr][cc] !== t) continue;
          seen.add(rr * COLS + cc); q.push([rr, cc]);
        }
      }
      return [...seen].map((k) => [Math.floor(k / COLS), k % COLS]);
    };
    const pops = [];
    const hasMove = () => { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = tiles[r][c]; if (t !== null && t !== STEEL && group(r, c).length >= 2) return true; } return false; };
    function reshuffleIfStuck() {
      const spots = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (tiles[r][c] !== null && tiles[r][c] !== STEEL) spots.push([r, c]);
      if (spots.length < 2 || hasMove()) return;
      for (let tries = 0; tries < 30 && !hasMove(); tries++) for (const [r, c] of spots) tiles[r][c] = Math.floor(Math.random() * TYPES.length);
      if (!hasMove()) {
        // make a pair next to each other for sure
        for (const [r, c] of spots) for (const [dr, dc] of [[0, 1], [1, 0]]) { const a = r + dr, b = c + dc; if (a < ROWS && b < COLS && tiles[a][b] !== null && tiles[a][b] !== STEEL) { tiles[a][b] = tiles[r][c]; return pops.push({ x: LW / 2, y: TOP - 14, t: "SHUFFLED!", life: 50 }); } }
        // only lone tiles left: they can be cleared with one tap
        lonely = true;
      }
      pops.push({ x: LW / 2, y: TOP - 14, t: "SHUFFLED!", life: 50 });
    }
    let lonely = false;
    let left = secs * 1000, last = performance.now(), over = false, raf = 0, shake = 0;
    can.onpointerdown = (e) => {
      e.preventDefault();
      if (over) return;
      const rc = can.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width) * LW, y = ((e.clientY - rc.top) / rc.height) * LH;
      const c = Math.floor(x / T), r = Math.floor((y - TOP) / T);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || tiles[r][c] === null) return;
      if (tiles[r][c] === STEEL) { left -= 1000; sfx("miss"); buzz("light"); pops.push({ x, y, t: "STEEL!", life: 40, bad: 1 }); shake = 8; return; }
      const gp = group(r, c);
      if (gp.length < 2 && !lonely) { left -= 1000; sfx("miss"); buzz("light"); pops.push({ x, y, t: "Need a match -1s", life: 45, bad: 1 }); shake = 8; return; }
      for (const [rr, cc] of gp) { pops.push({ x: cc * T + T / 2, y: TOP + rr * T + T / 2, t: "", life: 18, burst: tiles[rr][cc] }); tiles[rr][cc] = null; }
      // big groups also knock out a steel plate next to them
      if (gp.length >= 5) for (const [rr, cc] of gp) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = rr + dr, b = cc + dc; if (a >= 0 && a < ROWS && b >= 0 && b < COLS && tiles[a][b] === STEEL) { tiles[a][b] = null; pops.push({ x: b * T + T / 2, y: TOP + a * T + T / 2, t: "", life: 18, burst: 0 }); } }
      markTiles();
      reshuffleIfStuck();
      sfx(gp.length >= 5 ? "power" : "coin"); buzz(gp.length >= 5 ? "medium" : "light");
      if (gp.length >= 4) pops.push({ x, y, t: gp.length >= 5 ? "BIG CLEAR!" : "NICE!", life: 40 });
    };

    // liquid: each oil cell falls, slides diagonally, or spreads sideways
    let flip = 0;
    function stepOil() {
      flip ^= 1;
      for (let y = GH - 1; y >= 0; y--) {
        const ltr = (y + flip) & 1;
        for (let i = 0; i < GW; i++) {
          const x = ltr ? i : GW - 1 - i, k = idx(x, y);
          if (cell[k] !== 1) continue;
          if (y >= PAN_Y) { cell[k] = 0; inPan++; continue; }
          const d = ltr ? 1 : -1;
          let nx = -1, ny = -1;
          if (!solid(x, y + 1)) { nx = x; ny = y + 1; }
          else if (!solid(x + d, y + 1)) { nx = x + d; ny = y + 1; }
          else if (!solid(x - d, y + 1)) { nx = x - d; ny = y + 1; }
          else if (!solid(x + d, y)) { nx = x + d; ny = y; if (!solid(x + 2 * d, y) && Math.random() < 0.6) nx = x + 2 * d; }
          else if (!solid(x - d, y)) { nx = x - d; ny = y; }
          if (nx >= 0) { const nk = idx(nx, ny); cell[nk] = 1; shade[nk] = shade[k]; cell[k] = 0; }
        }
      }
    }

    function draw() {
      g.clearRect(0, 0, LW, LH);
      // engine and its oil pan
      g.fillStyle = "#222a31"; g.fillRect(0, 0, LW, TOP);
      if (engImg.complete && engImg.naturalWidth) { g.globalAlpha = 0.5; g.drawImage(engImg, 0, -40, LW, (LW * engImg.naturalHeight) / engImg.naturalWidth); g.globalAlpha = 1; }
      g.fillStyle = "#11161b"; g.fillRect(0, TOP, LW, ROWS * T);
      // floor and drain pan
      g.fillStyle = "#1b2229"; g.fillRect(0, TOP + ROWS * T, LW, LH - TOP - ROWS * T);
      // oil: drawn on a tiny canvas and scaled up smoothly so it looks like liquid
      const px = oilImg.data, t = performance.now() * 0.002;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const k = idx(x, y), o = k * 4;
        if (cell[k] !== 1) { px[o + 3] = 0; continue; }
        const top = y === 0 || cell[idx(x, y - 1)] !== 1, sh = Math.sin(t + x * 0.35 + y * 0.2) * 10 + (shade[k] - 128) * 0.06;
        if (top) { px[o] = 245; px[o + 1] = 196; px[o + 2] = 92; }
        else { px[o] = 176 + sh; px[o + 1] = 104 + sh * 0.7; px[o + 2] = 14; }
        px[o + 3] = 255;
      }
      oilCtx.putImageData(oilImg, 0, 0);
      g.imageSmoothingEnabled = true;
      g.drawImage(oilCan, 0, 0, LW, LH);
      // tiles
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const t = tiles[r][c];
        if (t === null) continue;
        const x = c * T, y = TOP + r * T;
        if (t === STEEL) {
          const gr = g.createLinearGradient(x, y, x + T, y + T); gr.addColorStop(0, "#d3dbe3"); gr.addColorStop(1, "#6d7882");
          g.fillStyle = gr; rr(x + 2, y + 2, T - 4, T - 4, 7); g.fill();
          g.fillStyle = "#4a535c"; for (const [a, b] of [[9, 9], [T - 9, 9], [9, T - 9], [T - 9, T - 9]]) { g.beginPath(); g.arc(x + a, y + b, 3, 0, 7); g.fill(); }
          continue;
        }
        g.fillStyle = TYPES[t].bg; rr(x + 2, y + 2, T - 4, T - 4, 9); g.fill();
        g.strokeStyle = "#0006"; g.lineWidth = 2; g.stroke();
        const im = imgs[t];
        if (im.complete && im.naturalWidth) { const a = im.naturalWidth / im.naturalHeight, w = a > 1 ? T - 10 : (T - 10) * a, h = a > 1 ? (T - 10) / a : T - 10; g.drawImage(im, x + (T - w) / 2, y + (T - h) / 2, w, h); }
      }
      if (panImg.complete && panImg.naturalWidth) g.drawImage(panImg, -6, LH - 66, LW + 12, ((LW + 12) * panImg.naturalHeight) / panImg.naturalWidth);
      // oil collecting in the drain pan
      const f = Math.min(1, inPan / target);
      if (f > 0) { const h = 4 + f * 20; g.fillStyle = "rgba(196,128,22,.92)"; rr(34, LH - 20 - h, LW - 68, h, 6); g.fill(); g.fillStyle = "rgba(255,214,120,.8)"; g.fillRect(40, LH - 20 - h, LW - 80, 2); }
      // pops and bursts
      for (const p of pops) {
        if (p.burst !== undefined) { g.globalAlpha = p.life / 18; g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, (18 - p.life) * 1.8 + 6, 0, 7); g.fill(); g.globalAlpha = 1; }
        else { g.globalAlpha = Math.min(1, p.life / 20); g.font = "900 18px system-ui,sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#000"; g.fillStyle = p.bad ? "#ff6b5b" : "#4cd07d"; g.strokeText(p.t, p.x, p.y - (45 - p.life)); g.fillText(p.t, p.x, p.y - (45 - p.life)); g.globalAlpha = 1; }
        p.life--;
      }
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
    }
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    const upd = () => {
      $("dTime").textContent = (left / 1000).toFixed(1); $("dTime").className = left < 8000 ? "low" : "";
      $("dBar").style.transform = "scaleX(" + Math.max(0, left / (secs * 1000)) + ")";
      const pct = Math.min(100, Math.floor((inPan / target) * 100));
      $("dFill").style.width = pct + "%"; $("dPct").textContent = pct + "%";
    };
    const loop = (now) => {
      if (over) return;
      left -= Math.min(100, now - last); last = now;
      stepOil(); stepOil();
      if (shake > 0) { shake--; can.style.transform = "translateX(" + (shake % 2 ? 4 : -4) + "px)"; } else can.style.transform = "";
      draw(); upd();
      if (inPan >= target) return finish(true);
      if (left <= 0) { left = 0; upd(); sfx("hit"); buzz("heavy"); return finish(false); }
      raf = requestAnimationFrame(loop);
    };
    function finish(won) {
      if (over) return;
      over = true; cancelAnimationFrame(raf); stopMusic();
      if (won) { sfx("win"); buzz("success"); }
      setTimeout(() => { el.className = "hidden"; bonusResult(won, left / 1000, done); $("message").textContent = won ? "OIL DRAINED!" : "TIME'S UP!"; if (!won) $("details").textContent = "Time ran out before the drain pan filled up. Keep going to reach the next bonus round."; }, won ? 900 : 700);
    }
    window.addEventListener("resize", () => { if (!over) scale = fit(); });
    upd(); raf = requestAnimationFrame(loop);
    window.__drain = { tiles, group, get inPan() { return inPan; }, target };
  }
})();
