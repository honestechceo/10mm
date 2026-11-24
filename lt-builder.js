// Lost Toolbox LEVEL BUILDER: turns the player's picks (background, length, pits, obstacles, enemies, boss,
// coins, power-ups) into a drawer, checks with the game's own physics that it can be beaten, and packs the
// picks + seed into a short share code. Levels are rebuilt from (settings, seed), so a code is all you need.
// The generator mirrors scripts/lostbox/levels.py (gen_level and its sections).
(() => {
  const ROWS = 13;
  const BGS = ["garage", "servicecenter", "partsstore", "engineshop", "evtech", "carwash", "salvage", "pitlane", "snow", "repairshop", "backlot", "tireshop", "parkgarage", "junkyard", "tireshop2", "paintshop", "hideout"];
  const BG_NAMES = ["Home Garage", "Service Center", "Parts Store", "Engine Shop", "EV Tech Lab", "Car Wash", "Salvage Yard", "Pit Lane", "Snow Day", "Repair Shop", "Back Lot", "Tire Shop", "Parking Garage", "Junkyard", "Tire Warehouse", "Paint Shop", "Hideout"];
  const MUSIC = { garage: "garage", servicecenter: "service", partsstore: "parts", engineshop: "engine", evtech: "master", carwash: "pit", salvage: "salvage", pitlane: "pit", snow: "snow", repairshop: "garage", backlot: "salvage", tireshop: "pit", parkgarage: "engine", junkyard: "salvage", tireshop2: "pit", paintshop: "master", hideout: "grand" };
  const OBST = ["crushers", "belts", "zappers", "falling", "platforms", "ice", "pistons", "chains"];
  const ENEMIES = ["r", "m", "j", "G", "T", "J", "K", "k", "b", "h", "v"];
  const BOSSES = ["", "walker", "charger", "flyer", "roller", "magnet", "gunner", "stomper", "serpent", "vac", "kraken", "king", "captain"];
  const BOSS_NAMES = { walker: "THE FILTER FIEND", charger: "JACKHAMMER JACK", flyer: "MAD METER", roller: "THE GEAR GRINDER", magnet: "MEGA MAGNET", gunner: "IMPACT GUN KING", stomper: "THE JACK STAND GIANT", serpent: "THE TIMING BELT SERPENT", vac: "THE SHOP VAC", kraken: "THE COOLANT KRAKEN", king: "THE RUSTY WRENCH KING", captain: "THE PRY BAR CAPTAIN" };
  const PUS = ["shield", "heart", "wrench", "pound", "air", "lucky", "magnet", "speed", "spring"];
  const VER = 1;

  // small seeded random generator, so a seed always builds the same drawer
  function rng(seed) {
    let a = seed >>> 0;
    const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (n) => Math.floor(f() * n);
    f.pick = (arr) => arr[f.int(arr.length)];
    f.weighted = (items, w) => { const tot = w.reduce((s, v) => s + v, 0); let x = f() * tot; for (let i = 0; i < items.length; i++) { x -= w[i]; if (x < 0) return items[i]; } return items[items.length - 1]; };
    return f;
  }

  class Lv {
    constructor(cols) { this.cols = cols; this.g = Array.from({ length: ROWS }, () => Array(cols).fill(".")); this.ext = []; }
    put(x, y, ch) { if (x >= 0 && x < this.cols && y >= 0 && y < ROWS) this.g[y][x] = ch; }
    floor(x0, x1, top = 11, ch = "#") { for (let x = x0; x < x1; x++) for (let y = top; y < ROWS; y++) this.put(x, y, ch); }
    pit(x0, x1) { for (let x = x0; x < x1; x++) for (let y = 0; y < ROWS; y++) if (x >= 0 && x < this.cols && this.g[y][x] === "#") this.g[y][x] = "."; }
    row(x0, x1, y, ch) { for (let x = x0; x < x1; x++) this.put(x, y, ch); }
    coins(x0, x1, y) { this.row(x0, x1, y, "o"); }
    arc(x0, n, y) { for (let i = 0; i < n; i++) { const d = Math.abs(i - (n - 1) / 2); this.put(x0 + i, y - (d < n / 4 ? 1 : 0), "o"); } }
    mover(x, y, ch, kw) { this.put(x, y, ch); this.ext.push([x, y, kw]); }
    arena(x0, boss, hp, spd, name) {
      const need = x0 + 20;
      if (need > this.cols) { for (const r of this.g) while (r.length < need) r.push("."); this.cols = need; }
      for (let x = x0 - 4; x < this.cols; x++) for (let y = 0; y < ROWS; y++) { if (y >= 11) this.g[y][x] = "#"; else if (x >= x0) this.g[y][x] = "."; }
      this.put(x0 - 2, 10, "!");
      this.row(x0 + 1, x0 + 4, 7, "-"); this.row(x0 + 8, x0 + 11, 7, "-");
      this.put(x0 + 6, 10, "B"); this.ext.push([x0 + 6, 10, { boss, hp, spd, name }]);
      this.put(x0 + 14, 10, "X");
    }
    text() { return this.g.map((r) => r.join("")); }
  }

  // ---------- sections (same shapes as levels.py, pushed harder by the DIFFICULTY pick) ----------
  // D: 0 easy, 1 normal, 2 hard, 3 extreme. Harder = more bad guys packed closer, wider pits, hazards stacked
  // on top of bad guys and pits, faster platforms, fewer checkpoints.
  function makeSections(st, r) {
    const walk = st.enemies.filter((c) => !"bhv".includes(c)), fly = st.enemies.filter((c) => "bh".includes(c)), diver = st.enemies.includes("v");
    const has = (o) => st.obstacles.includes(o);
    const D = st.diff == null ? 1 : st.diff;
    const en = st.enAmt + Math.max(0, D - 1), ob = st.obsAmt + Math.max(0, D - 1), d = 0.25 + 0.15 * Math.max(en, ob) + 0.1 * D;
    const gap = D >= 2 ? 3 : 4; // tiles between bad guys in a gang
    const msp = (base) => Math.round(base + d * 40 + D * 15);
    // one extra hazard dropped into a stretch, from whatever obstacles were picked
    const extra = (l, x0, x1) => {
      const opts = [];
      if (has("falling")) opts.push(() => l.put(x0 + r.int(Math.max(1, x1 - x0)), 2, "f"));
      if (has("zappers")) opts.push(() => { const x = x0 + r.int(Math.max(1, x1 - x0)); if (l.g[11][x] === "#" && l.g[10][x] === ".") l.put(x, 10, "e"); });
      if (has("chains")) opts.push(() => l.mover(x0 + Math.floor((x1 - x0) / 2), 3, "c", { len: 4, phase: Math.round(r() * 100) / 100 }));
      if (fly.length) opts.push(() => l.put(x0 + r.int(Math.max(1, x1 - x0)), 5 + r.int(2), r.pick(fly)));
      if (opts.length) r.pick(opts)();
    };
    const stack = () => D >= 2 && r() < (D === 2 ? 0.45 : 0.8);
    const S = [];
    if (walk.length || fly.length) S.push([(l, x) => { // gang: a stretch of bad guys
      const n = Math.max(1, 1 + en + (r() < 0.4 ? 1 : 0) - (D === 0 ? 1 : 0)), w = 6 + n * gap;
      for (let k = 0; k < n; k++) { if (walk.length) l.put(x + 3 + k * gap, 10, r.pick(walk)); else l.put(x + 3 + k * gap, 6, r.pick(fly)); }
      if (fly.length && walk.length && r() < 0.3 + en * 0.2) l.put(x + 2 + r.int(w - 4), 6, r.pick(fly));
      if (stack()) extra(l, x + 2, x + w - 2);
      if (D >= 3 && fly.length && walk.length) l.put(x + 2 + r.int(w - 4), 5, r.pick(fly));
      l.arc(x + 1, Math.min(w - 2, 6), 7);
      return x + w;
    }, 1 + en * 2]);
    if (st.pits > 0) S.push([(l, x) => { // pits: hop, moving platform, or crumbling ledges
      const k = r();
      if (k < 0.45 || (!has("platforms") && k < 0.7)) {
        const w = r.pick([3, 4]) + Math.min(2, D); l.pit(x + 1, x + 1 + w); l.arc(x, w + 2, 8);
        if (stack() && fly.length) l.put(x + 1 + Math.floor(w / 2), 7, r.pick(fly));
        if (D >= 2 && walk.length && r() < 0.5) l.put(x + w + 2, 10, r.pick(walk)); // someone waiting on the landing
        return x + w + 3;
      }
      if (k < 0.75 && has("platforms")) {
        const w = r.pick([6, 7, 8]) + (D >= 2 ? 2 : 0); l.pit(x + 1, x + 1 + w); l.mover(x + 2, 10, "M", { dx: w - 4, speed: msp(65), phase: Math.round(r() * 100) / 100 }); l.coins(x + 3, x + w - 1, 7);
        if (stack()) extra(l, x + 3, x + w - 1);
        return x + w + 3;
      }
      const w = r.pick([6, 7]) + (D >= 2 ? 1 : 0); l.pit(x + 1, x + 1 + w); l.row(x + 3, x + 5, 9, "q"); l.row(x + w - 2, x + w, 8, "q");
      if (fly.length && r() < d) l.put(x + 1 + Math.floor(w / 2), 6, r.pick(fly));
      return x + w + 3;
    }, st.pits * 2.5 + (st.pits ? D : 0)]);
    if (has("platforms")) S.push([(l, x) => { // lift up to a ledge
      const w = 8; if (st.pits > 0 || D >= 2) l.pit(x + 1, x + 1 + w);
      l.mover(x + 2, 9, "L", { dy: 4, speed: msp(70) });
      l.floor(x + 5, x + 7, 7); l.coins(x + 5, x + 7, 6);
      l.mover(x + 7, 7, "M", { dx: 1, speed: msp(70), phase: 0.5 });
      if (D >= 2 && walk.length) l.put(x + 6, 6, r.pick(walk));
      return x + w + 3;
    }, ob * 1.1]);
    S.push([(l, x) => { // raised ground
      const top = r.pick([8, 9]), w = r.pick([6, 7, 8]);
      l.floor(x + 1, x + 1 + w, top); l.coins(x + 2, x + w, top - 1);
      if (walk.length && r() < 0.3 + en * 0.25) l.put(x + 1 + Math.floor(w / 2), top - 1, r.pick(walk));
      if (stack()) extra(l, x + 2, x + w);
      return x + w + 3;
    }, Math.max(0.4, 2 - D * 0.5)]);
    if (st.powerups > 0) S.push([(l, x) => { // ? blocks with a power-up
      l.row(x + 2, x + 6, 7, "?"); l.put(x + 4, 7, "U"); l.ext.push([x + 4, 7, { pu: r.pick(PUS) }]);
      if (walk.length && r() < 0.6 + D * 0.15) l.put(x + 8, 10, r.pick(walk));
      return x + 11;
    }, st.powerups * 1.2]);
    if (has("belts")) S.push([(l, x) => {
      const w = 10; l.row(x + 1, x + 1 + w, 10, r.pick(["<", ">"]));
      if (walk.length && r() < 0.5 + D * 0.15) l.put(x + 4, 9, r.pick(walk)); else if (fly.length) l.put(x + 5, 6, r.pick(fly));
      if (has("pistons") && r() < d) l.put(x + 8, 9, "g");
      if (stack()) extra(l, x + 2, x + w);
      return x + w + 3;
    }, ob * 1.2]);
    if (has("ice")) S.push([(l, x) => {
      const w = 12; l.row(x + 1, x + 1 + w, 11, "i"); l.row(x + 1, x + 1 + w, 12, "i");
      if (walk.length) { l.put(x + 4, 10, r.pick(walk)); if (en > 1) l.put(x + 9, 10, r.pick(walk)); }
      if (diver && r() < 0.5 + en * 0.15) l.put(x + 7, 4, "v");
      if (D >= 2 && has("zappers")) l.put(x + 6, 10, "e");
      if (D >= 3 && st.pits > 0) l.pit(x + w - 1, x + w + 2);
      return x + w + 3;
    }, ob * 1.0]);
    if (has("falling")) S.push([(l, x) => { const n = 2 + (ob > 1 ? 1 : 0) + (D >= 2 ? 1 : 0), sp = D >= 2 ? 2 : 3; for (let i = 0; i < n; i++) l.put(x + 2 + i * sp, 2, "f"); if (D >= 2 && walk.length) l.put(x + 4, 10, r.pick(walk)); return x + 4 + n * sp; }, ob * 1.0]);
    if (has("zappers")) S.push([(l, x) => { l.put(x + 3, 10, "e"); l.put(x + 4, 10, "e"); if (ob > 1) l.put(x + 8, 10, "e"); if (D >= 2) { l.put(x + 9, 10, "e"); if (fly.length) l.put(x + 6, 6, r.pick(fly)); } return x + 12; }, ob * 1.0]);
    if (has("pistons")) S.push([(l, x) => { l.put(x + 3, 10, "p"); l.put(x + 7, 9, "g"); if (D >= 2) l.put(x + 10, 10, "p"); if (walk.length && r() < 0.5 + D * 0.15) l.put(x + 12, 10, r.pick(walk)); return x + 15; }, ob * 1.0]);
    if (has("chains")) S.push([(l, x) => { l.mover(x + 4, 3, "c", { len: 4 }); if (D >= 2) l.mover(x + 9, 3, "c", { len: 4, phase: 0.5 }); if (walk.length && r() < 0.5 + D * 0.15) l.put(x + 12, 10, r.pick(walk)); return x + 15; }, ob * 0.9]);
    if (diver && !has("ice")) S.push([(l, x) => { l.put(x + 5, 4, "v"); if (D >= 2) l.put(x + 8, 4, "v"); l.coins(x + 3, x + 8, 10); return x + 11; }, en * 0.8]);
    S.push([(l, x) => { // stairs up and back down
      for (let i = 0; i < 3; i++) l.floor(x + 1 + i, x + 2 + i, 10 - i);
      l.floor(x + 4, x + 9, 8); l.coins(x + 4, x + 9, 7);
      if (walk.length && r() < 0.3 + en * 0.25) l.put(x + 7, 7, r.pick(walk));
      if (st.pits > 0) l.pit(x + 9, x + 12 + (D >= 2 ? 1 : 0));
      return x + 13 + (D >= 2 ? 1 : 0);
    }, Math.max(0.4, 1.2 - D * 0.3)]);
    return S;
  }

  function crushers(l, n, r) {
    const g = l.g, W = l.cols, placed = [];
    for (let k = 0; k < n; k++) {
      const x0 = Math.round(((k + 1) * W) / (n + 1));
      for (const dd of Array.from({ length: 31 }, (_, i) => i - 15).sort((a, b) => Math.abs(a) - Math.abs(b))) {
        const x = x0 + dd;
        if (x < 10 || x + 3 >= W - 24) continue;
        const clear = [x - 1, x, x + 1, x + 2].every((c) => { for (let y = 5; y < 11; y++) if (!".o".includes(g[y][c])) return false; return true; });
        if (g[11][x] === "#" && g[11][x + 1] === "#" && clear && !placed.some((p) => Math.abs(p - x) < 8)) { l.put(x, 10, "n"); placed.push(x); break; }
      }
    }
  }

  function build(st, seed) {
    const r = rng(seed * 7919 + 17);
    const W = { 1: 150, 2: 210, 3: 270 }[st.len] || 210;
    const l = new Lv(W);
    l.floor(0, W); l.put(2, 10, "@");
    const boss = BOSSES[st.boss] || "";
    const end = W - (boss ? 24 : 10);
    const S = makeSections(st, r), fns = S.map((s) => s[0]), wts = S.map((s) => s[1]);
    let x = 7, lastCp = 0, prev = null, guard = 0;
    while (x < end - 14 && guard++ < 400) {
      if (x - lastCp > [42, 42, 64, 96][st.diff == null ? 1 : st.diff]) { l.put(x + 1, 10, "!"); lastCp = x; x += 4; continue; }
      const f = r.weighted(fns, wts);
      if (f === prev && S.length > 2) continue;
      prev = f; x = f(l, x);
    }
    if (st.obstacles.includes("crushers")) crushers(l, 1 + st.obsAmt * 2 + (st.diff || 0), r);
    if (boss) {
      l.coins(x + 1, Math.min(x + 6, W - 26), 10);
      const hard = +st.bossHard || 0; // 0 normal, 1 tough, 2 brutal
      const hp = { walker: 3, charger: 3, flyer: 3, roller: 3, magnet: 4, gunner: 4, stomper: 5, serpent: 5, vac: 5, kraken: 5, king: 6, captain: 6 }[boss] + hard * 2 + (hard > 1 ? 1 : 0);
      l.arena(Math.max(x + 8, W - 22), boss, hp, Math.round((1 + hard * 0.25) * 100) / 100, BOSS_NAMES[boss]);
    } else {
      l.coins(x + 1, x + 5, 10); l.put(Math.min(x + 7, l.cols - 4), 10, "X");
    }
    // coins: none, normal, or extra arcs over open floor
    if (st.coins === 0) for (const row of l.g) for (let i = 0; i < row.length; i++) if (row[i] === "o") row[i] = ".";
    if (st.coins === 2) for (let cx = 12; cx < l.cols - 30; cx += 9) { let ok = true; for (let i = 0; i < 5; i++) { if (l.g[11][cx + i] !== "#" || l.g[8][cx + i] !== "." || l.g[9][cx + i] !== "." || l.g[10][cx + i] !== ".") ok = false; } if (ok) l.arc(cx, 5, 8); }
    return { name: "", bg: BGS[st.bg] || "garage", music: MUSIC[BGS[st.bg]] || "garage", rows: l.text(), ext: l.ext, room: null, custom: true, hp: st.hp || 3, espd: [0.85, 1, 1.25, 1.5][st.diff == null ? 1 : st.diff] };
  }

  // ---------- beatable check: the game's real physics, same as test/lostbox-reach.js ----------
  function slot() {
    const L = window.LT_LEVELS; let i = L.findIndex((l) => l.custom);
    if (i < 0) { L.push({ name: "", bg: "garage", music: "garage", rows: [], ext: [], room: null, custom: true }); i = L.length - 1; }
    return i;
  }
  function reach(li) {
    const T = 48, PW = 30;
    const info = LostBox._probeSetup(li, false), rows = info.rows, W = info.W, M = info.movers;
    const L = window.LT_LEVELS[li].rows;
    const SOLID = "#=CU?RSD<>i", stand = (ch) => SOLID.includes(ch) || ch === "-" || ch === "q";
    const S = [];
    for (let y = 1; y < rows.length; y++) {
      let x = 0;
      while (x < W) {
        const ok = (cx) => stand(rows[y][cx]) && !SOLID.includes(rows[y - 1][cx]);
        if (ok(x)) { const x0 = x; while (x < W && ok(x)) x++; S.push({ x0: x0 * T, x1: x * T, y: y * T, cols: [x0, x] }); } else x++;
      }
    }
    const FR = [0, 0.5, 1];
    M.forEach((m, k) => FR.forEach((f) => S.push({ x0: m.x0 + m.dx * f, x1: m.x0 + m.dx * f + m.w, y: m.y0 - m.dy * f, mover: k, f })));
    const which = (r) => {
      if (r.on >= 0) { let best = -1, bd = 1e9; S.forEach((s, i) => { if (s.mover === r.on) { const d = Math.abs(s.y - r.y) + Math.abs(s.x0 - (r.x - 40)); if (d < bd) { bd = d; best = i; } } }); return best; }
      for (let i = 0; i < S.length; i++) { const s = S[i]; if (s.mover === undefined && Math.abs(s.y - r.y) < 1 && r.x >= s.x0 - 16 && r.x <= s.x1 + 16) return i; }
      return -1;
    };
    const edges = S.map(() => new Set());
    S.forEach((s, i) => {
      if (s.mover !== undefined) S.forEach((o, j) => { if (o.mover === s.mover && j !== i) edges[i].add(j); });
      const spots = [s.x0 + PW / 2 + 1, s.x1 - PW / 2 - 1];
      for (let x = s.x0 + 24; x < s.x1 - 8; x += 48) spots.push(x);
      const frs = s.mover !== undefined ? [M.map((_, k) => (k === s.mover ? s.f : 0)), M.map((_, k) => (k === s.mover ? s.f : 0.5)), M.map((_, k) => (k === s.mover ? s.f : 1))] : [M.map(() => 0), M.map(() => 0.5), M.map(() => 1)];
      for (const fr of frs) {
        for (const x of spots) for (const d of [-1, 0, 1]) for (const da of [null, 0.12, 0.25, 0.35, 0.45, 0.6]) {
          if (d === 0 && da !== null && da !== 0.35) continue;
          const r = LostBox._probe(x, s.y, d, da, -640, fr);
          if (r.ground) { const j = which(r); if (j >= 0) edges[i].add(j); }
        }
        for (const [x, d] of [[s.x0 - 1, -1], [s.x1 + 1, 1]]) for (const da of [null, 0.2]) {
          const r = LostBox._probe(x, s.y, d, da, 1, fr);
          if (r.ground) { const j = which(r); if (j >= 0) edges[i].add(j); }
        }
      }
    });
    const find = (ch) => { const out = []; L.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([x, y, S.findIndex((s) => s.mover === undefined && s.y === (y + 1) * T && s.cols[0] <= x && x < s.cols[1])]); })); return out; };
    const start = find("@")[0][2], g = find("X")[0];
    const goal = S.findIndex((s) => s.mover === undefined && s.y === (g[1] + 1) * T && s.cols[0] <= g[0] && g[0] < s.cols[1]);
    const seen = new Set([start]), q = [start];
    while (q.length) { const i = q.pop(); for (const j of edges[i]) if (!seen.has(j)) { seen.add(j); q.push(j); } }
    const problems = [];
    if (!seen.has(goal)) problems.push("exit not reachable");
    for (const c of find("!")) if (!seen.has(c[2])) problems.push("checkpoint at " + c[0] + " not reachable");
    const rev = S.map(() => new Set()); edges.forEach((e, i) => e.forEach((j) => rev[j].add(i)));
    const good = new Set([goal]), q2 = [goal];
    while (q2.length) { const j = q2.pop(); for (const i of rev[j]) if (!good.has(i)) { good.add(i); q2.push(i); } }
    for (const i of seen) if (!good.has(i) && S[i].mover === undefined) problems.push("dead end at " + S[i].cols.join("-"));
    return problems;
  }
  // build + check; if a seed makes a drawer that can't be beaten, try the next ones
  function make(st, seed) {
    const i = slot();
    for (let k = 0; k < 8; k++) {
      const sd = (seed + k) % 1048576, lv = build(st, sd);
      window.LT_LEVELS[i] = lv;
      let problems = ["check failed"];
      try { problems = reach(i); } catch (e) { problems = ["check error: " + e.message]; }
      if (!problems.length) return { ok: true, seed: sd, index: i, level: lv };
    }
    return { ok: false };
  }
  function load(st, seed) { const i = slot(); window.LT_LEVELS[i] = build(st, seed); return i; }

  // ---------- AUTO-BUILD screen: picks in, a ready-made layout out (then it opens in the Level Maker) ----------
  const U = () => window.LostBox._ui;
  const OB_NAMES = { crushers: "Crushers", belts: "Conveyor belts", zappers: "Zappers", falling: "Falling parts", platforms: "Moving platforms", ice: "Slick floors", pistons: "Pistons & gears", chains: "Swinging chains" };
  const EN_INFO = { r: ["Stripped Bolt", "en-sbolt0"], m: ["Rusty Wrench", "en-rwrench0"], j: ["Lug Nut Ninja", "en-ninja0"], G: ["Impact Gun", "en-igun0"], T: ["Rolling Tire", "tire"], J: ["Floor Jack", "jack"], K: ["Creeper", "creeper"], k: ["Tool Cart", "toolcart"], b: ["Flying Nut", "fly-nut"], h: ["Drone", "fly-drone"], v: ["Diving Screw", "fly-screw"] };
  const BOSS_ART = { walker: "bossa-filter", charger: "bossa-jack", flyer: "bossa-meter", roller: "bossa-gear", magnet: "bossa-magnet", gunner: "gk-idle", stomper: "js-idle", serpent: "tb-idle", vac: "sv-idle", kraken: "ck-idle", king: "wk-idle", captain: "pc-idle" };
  const AMT3 = ["NONE", "SOME", "LOTS"], OAMT = ["FEW", "SOME", "LOTS"], EAMT = ["FEW", "SOME", "LOTS", "SWARM"];
  function chips(id, opts, sel, multi) {
    return '<div class="lbchips" data-g="' + id + '"' + (multi ? ' data-multi="1"' : "") + ">" + opts.map(([v, label, art]) => '<button data-v="' + v + '" class="' + ((multi ? sel.includes(v) : sel === v) ? "on" : "") + '">' + (art ? '<img src="lt/' + art + '.webp" alt="">' : "") + label + "</button>").join("") + "</div>";
  }
  function wire(c, st, onPick) {
    c.querySelectorAll(".lbchips").forEach((g) => g.querySelectorAll("button").forEach((b) => (b.onclick = () => {
      const k = g.dataset.g, raw = b.dataset.v, val = /^\d+$/.test(raw) && k !== "enemies" ? +raw : raw;
      if (g.dataset.multi) { const a = st[k]; const i = a.indexOf(val); if (i >= 0) a.splice(i, 1); else a.push(val); b.classList.toggle("on"); }
      else { st[k] = val; g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); }
      if (onPick) onPick(k, val);
      U().haptic("light");
    })));
  }
  let last = null;
  function auto(onBuilt, onCancel) {
    const st = last ? JSON.parse(JSON.stringify(last)) : JSON.parse(JSON.stringify(DEFAULT)), ui = U(); ui.idle();
    let h = '<div class="ltlogo">AUTO-BUILD</div><p>Pick what goes in and we\'ll lay out a starting level. Then you can change anything, square by square.</p>';
    h += '<label class="lbl">DIFFICULTY</label>' + chips("diff", [[0, "EASY"], [1, "NORMAL"], [2, "HARD"], [3, "EXTREME"]], st.diff == null ? 1 : st.diff);
    h += '<label class="lbl">LENGTH</label>' + chips("len", [[1, "SHORT"], [2, "MEDIUM"], [3, "LONG"]], st.len);
    h += '<label class="lbl">PITS</label>' + chips("pits", [[0, "NONE"], [1, "SOME"], [2, "LOTS"]], st.pits);
    h += '<label class="lbl">OBSTACLES</label>' + chips("obstacles", OBST.map((o) => [o, OB_NAMES[o]]), st.obstacles, true) + '<span class="lbsub">HOW MANY</span>' + chips("obsAmt", OAMT.map((l, i) => [i, l]), st.obsAmt);
    h += '<label class="lbl">BAD GUYS</label>' + chips("enemies", ENEMIES.map((e) => [e, EN_INFO[e][0], EN_INFO[e][1]]), st.enemies, true) + '<span class="lbsub">HOW MANY</span>' + chips("enAmt", EAMT.map((l, i) => [i, l]), st.enAmt);
    h += '<label class="lbl">BOSS</label>' + chips("boss", BOSSES.map((b, i) => [i, b ? BOSS_NAMES[b].replace(/^THE /, "") : "NO BOSS", b ? BOSS_ART[b] : ""]), st.boss) + '<span class="lbsub">BOSS STRENGTH</span>' + chips("bossHard", [[0, "NORMAL"], [1, "TOUGH"], [2, "BRUTAL"]], +st.bossHard || 0);
    h += '<label class="lbl">COINS</label>' + chips("coins", AMT3.map((l, i) => [i, i === 1 ? "NORMAL" : i === 2 ? "EXTRA" : l]), st.coins);
    h += '<label class="lbl">POWER-UPS</label>' + chips("powerups", AMT3.map((l, i) => [i, l]), st.powerups);
    h += '<button class="ltbtn" id="lbGo">BUILD IT</button><button class="ltbtn sub" id="lbCancel">BACK</button>';
    ui.show(h);
    const c = ui.card(); wire(c, st);
    c.querySelector("#lbCancel").onclick = onCancel;
    c.querySelector("#lbGo").onclick = () => {
      if (!st.enemies.length && !BOSSES[st.boss] && !st.pits && !st.obstacles.length) st.enemies.push("r");
      last = st;
      ui.show('<div class="ltlogo">BUILDING…</div><img class="ltclr" src="lt/drawer2.webp" alt=""><p>Laying out your level.</p>');
      setTimeout(() => {
        let res = { ok: false };
        try { res = make(st, Math.floor(Math.random() * 1048576)); } catch (e) {}
        const lv = res.ok ? res.level : build(st, Math.floor(Math.random() * 1048576));
        ui.idle(); onBuilt(lv, st);
      }, 60);
    };
    c.scrollTop = 0;
  }

  const DEFAULT = { bg: 0, len: 2, pits: 1, obstacles: ["platforms", "belts"], obsAmt: 1, enemies: ["r", "m", "T", "b"], enAmt: 1, boss: 1, bossHard: 0, diff: 1, hp: 3, coins: 1, powerups: 1 };

  window.LTBuild = { auto, chips, wire, EN_INFO, BOSS_ART, MUSIC, PUS, build, make, load, slot, BGS, OBST, ENEMIES, BOSSES, BOSS_NAMES, BG_NAMES, DEFAULT, _reach: reach };
})();
