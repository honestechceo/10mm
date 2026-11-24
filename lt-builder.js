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

  // ---------- sections (same shapes as levels.py) ----------
  function makeSections(st, r) {
    const walk = st.enemies.filter((c) => !"bhv".includes(c)), fly = st.enemies.filter((c) => "bh".includes(c)), diver = st.enemies.includes("v");
    const has = (o) => st.obstacles.includes(o);
    const en = st.enAmt, ob = st.obsAmt, d = 0.35 + 0.2 * Math.max(en, ob);
    const S = [];
    if (walk.length || fly.length) S.push([(l, x) => { // gang: a stretch of bad guys
      const n = Math.max(1, en + (r() < 0.4 ? 1 : 0) - (en === 0 ? 0 : 0)), w = 6 + n * 4;
      for (let k = 0; k < n; k++) { if (walk.length) l.put(x + 3 + k * 4, 10, r.pick(walk)); else l.put(x + 3 + k * 4, 6, r.pick(fly)); }
      if (fly.length && walk.length && r() < 0.3 + en * 0.2) l.put(x + 2 + r.int(w - 4), 6, r.pick(fly));
      l.arc(x + 1, Math.min(w - 2, 6), 7);
      return x + w;
    }, 1 + en * 2]);
    if (st.pits > 0) S.push([(l, x) => { // pits: small hop, moving platform, or crumbling ledges
      const k = r();
      if (k < 0.45 || (!has("platforms") && k < 0.7)) { const w = r.pick([3, 4]); l.pit(x + 1, x + 1 + w); l.arc(x, w + 2, 8); return x + w + 3; }
      if (k < 0.75 && has("platforms")) { const w = r.pick([6, 7, 8]); l.pit(x + 1, x + 1 + w); l.mover(x + 2, 10, "M", { dx: w - 4, speed: Math.round(65 + d * 40), phase: Math.round(r() * 100) / 100 }); l.coins(x + 3, x + w - 1, 7); return x + w + 3; }
      const w = r.pick([6, 7]); l.pit(x + 1, x + 1 + w); l.row(x + 3, x + 5, 9, "q"); l.row(x + w - 2, x + w, 8, "q");
      if (fly.length && r() < d) l.put(x + 1 + Math.floor(w / 2), 6, r.pick(fly));
      return x + w + 3;
    }, st.pits * 2.5]);
    if (has("platforms")) S.push([(l, x) => { // lift up to a ledge
      const w = 8; if (st.pits > 0) l.pit(x + 1, x + 1 + w);
      l.mover(x + 2, 9, "L", { dy: 4, speed: Math.round(70 + d * 30) });
      l.floor(x + 5, x + 7, 7); l.coins(x + 5, x + 7, 6);
      l.mover(x + 7, 7, "M", { dx: 1, speed: Math.round(70 + d * 30), phase: 0.5 });
      return x + w + 3;
    }, ob * 1.1]);
    S.push([(l, x) => { // raised ground
      const top = r.pick([8, 9]), w = r.pick([6, 7, 8]);
      l.floor(x + 1, x + 1 + w, top); l.coins(x + 2, x + w, top - 1);
      if (walk.length && r() < 0.3 + en * 0.25) l.put(x + 1 + Math.floor(w / 2), top - 1, r.pick(walk));
      return x + w + 3;
    }, 2]);
    if (st.powerups > 0) S.push([(l, x) => { // ? blocks with a power-up
      l.row(x + 2, x + 6, 7, "?"); l.put(x + 4, 7, "U"); l.ext.push([x + 4, 7, { pu: r.pick(PUS) }]);
      if (walk.length && r() < 0.6) l.put(x + 8, 10, r.pick(walk));
      return x + 11;
    }, st.powerups * 1.2]);
    if (has("belts")) S.push([(l, x) => {
      const w = 10; l.row(x + 1, x + 1 + w, 10, r.pick(["<", ">"]));
      if (walk.length && r() < 0.5) l.put(x + 4, 9, r.pick(walk)); else if (fly.length) l.put(x + 5, 6, r.pick(fly));
      if (has("pistons") && r() < d) l.put(x + 8, 9, "g");
      return x + w + 3;
    }, ob * 1.2]);
    if (has("ice")) S.push([(l, x) => {
      const w = 12; l.row(x + 1, x + 1 + w, 11, "i"); l.row(x + 1, x + 1 + w, 12, "i");
      if (walk.length) { l.put(x + 4, 10, r.pick(walk)); if (en > 1) l.put(x + 9, 10, r.pick(walk)); }
      if (diver && r() < 0.5 + en * 0.15) l.put(x + 7, 4, "v");
      return x + w + 3;
    }, ob * 1.0]);
    if (has("falling")) S.push([(l, x) => { for (let i = 0; i < 2 + (ob > 1 ? 1 : 0); i++) l.put(x + 2 + i * 3, 2, "f"); return x + 11; }, ob * 1.0]);
    if (has("zappers")) S.push([(l, x) => { l.put(x + 3, 10, "e"); l.put(x + 4, 10, "e"); if (ob > 1) { l.put(x + 8, 10, "e"); } return x + 11; }, ob * 1.0]);
    if (has("pistons")) S.push([(l, x) => { l.put(x + 3, 10, "p"); l.put(x + 7, 9, "g"); if (walk.length && r() < 0.5) l.put(x + 10, 10, r.pick(walk)); return x + 13; }, ob * 1.0]);
    if (has("chains")) S.push([(l, x) => { l.mover(x + 4, 3, "c", { len: 4 }); if (walk.length && r() < 0.5) l.put(x + 9, 10, r.pick(walk)); return x + 13; }, ob * 0.9]);
    if (diver && !has("ice")) S.push([(l, x) => { l.put(x + 5, 4, "v"); l.coins(x + 3, x + 8, 10); return x + 11; }, en * 0.8]);
    S.push([(l, x) => { // stairs up and back down
      for (let i = 0; i < 3; i++) l.floor(x + 1 + i, x + 2 + i, 10 - i);
      l.floor(x + 4, x + 9, 8); l.coins(x + 4, x + 9, 7);
      if (walk.length && r() < 0.3 + en * 0.25) l.put(x + 7, 7, r.pick(walk));
      if (st.pits > 0) l.pit(x + 9, x + 12);
      return x + 13;
    }, 1.2]);
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
      if (x - lastCp > 42) { l.put(x + 1, 10, "!"); lastCp = x; x += 4; continue; }
      const f = r.weighted(fns, wts);
      if (f === prev && S.length > 2) continue;
      prev = f; x = f(l, x);
    }
    if (st.obstacles.includes("crushers")) crushers(l, 1 + st.obsAmt * 2, r);
    if (boss) {
      l.coins(x + 1, Math.min(x + 6, W - 26), 10);
      const hard = st.bossHard ? 1 : 0;
      const hp = { walker: 3, charger: 3, flyer: 3, roller: 3, magnet: 4, gunner: 4, stomper: 5, serpent: 5, vac: 5, kraken: 5, king: 6, captain: 6 }[boss] + hard * 2;
      l.arena(Math.max(x + 8, W - 22), boss, hp, Math.round((1 + hard * 0.3) * 100) / 100, BOSS_NAMES[boss]);
    } else {
      l.coins(x + 1, x + 5, 10); l.put(Math.min(x + 7, l.cols - 4), 10, "X");
    }
    // coins: none, normal, or extra arcs over open floor
    if (st.coins === 0) for (const row of l.g) for (let i = 0; i < row.length; i++) if (row[i] === "o") row[i] = ".";
    if (st.coins === 2) for (let cx = 12; cx < l.cols - 30; cx += 9) { let ok = true; for (let i = 0; i < 5; i++) { if (l.g[11][cx + i] !== "#" || l.g[8][cx + i] !== "." || l.g[9][cx + i] !== "." || l.g[10][cx + i] !== ".") ok = false; } if (ok) l.arc(cx, 5, 8); }
    return { name: "", bg: BGS[st.bg] || "garage", music: MUSIC[BGS[st.bg]] || "garage", rows: l.text(), ext: l.ext, room: null, custom: true };
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

  // ---------- share codes: settings + seed in 13 characters ----------
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const FIELDS = [["ver", 2], ["bg", 5], ["len", 2], ["pits", 2], ["obstacles", 8], ["obsAmt", 2], ["enemies", 11], ["enAmt", 2], ["boss", 4], ["bossHard", 1], ["coins", 2], ["powerups", 2], ["seed", 20]];
  function pack(st, seed) {
    const v = { ...st, ver: VER, seed, obstacles: OBST.reduce((m, o, i) => m | (st.obstacles.includes(o) ? 1 << i : 0), 0), enemies: ENEMIES.reduce((m, c, i) => m | (st.enemies.includes(c) ? 1 << i : 0), 0), bossHard: st.bossHard ? 1 : 0, len: st.len - 1 };
    let n = 0n;
    for (const [k, b] of FIELDS) n = (n << BigInt(b)) | BigInt((v[k] >>> 0) & ((1 << b) - 1));
    let sum = 0; for (let t = n; t > 0n; t >>= 5n) sum = (sum * 7 + Number(t & 31n)) % 32;
    n = (n << 5n) | BigInt(sum);
    let s = ""; for (let i = 0; i < 14; i++) { s = A[Number(n & 31n)] + s; n >>= 5n; }
    return s.slice(0, 4) + "-" + s.slice(4, 9) + "-" + s.slice(9);
  }
  function unpack(code) {
    const s = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0").replace(/I/g, "1");
    if (s.length !== 14) return null;
    let n = 0n;
    for (const ch of s) { const i = A.indexOf(ch); if (i < 0) return null; n = (n << 5n) | BigInt(i); }
    const sum = Number(n & 31n); n >>= 5n;
    let chk = 0; for (let t = n; t > 0n; t >>= 5n) chk = (chk * 7 + Number(t & 31n)) % 32;
    if (chk !== sum) return null;
    const v = {};
    for (const [k, b] of [...FIELDS].reverse()) { v[k] = Number(n & BigInt((1 << b) - 1)); n >>= BigInt(b); }
    if (v.ver !== VER || v.bg >= BGS.length || v.boss >= BOSSES.length) return null;
    return { settings: { bg: v.bg, len: v.len + 1, pits: Math.min(2, v.pits), obstacles: OBST.filter((_, i) => v.obstacles & (1 << i)), obsAmt: Math.min(2, v.obsAmt), enemies: ENEMIES.filter((_, i) => v.enemies & (1 << i)), enAmt: Math.min(3, v.enAmt), boss: v.boss, bossHard: !!v.bossHard, coins: Math.min(2, v.coins), powerups: Math.min(2, v.powerups) }, seed: v.seed };
  }

  // ---------- builder screens (shown in the Lost Toolbox card) ----------
  const KEY = "tenmm-lt-custom", MAX = 30;
  const U = () => window.LostBox._ui;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const mine = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter((v) => v && v.st && typeof v.seed === "number") : []; } catch (e) { return []; } };
  const keep = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} };
  const OB_NAMES = { crushers: "Crushers", belts: "Conveyor belts", zappers: "Zappers", falling: "Falling parts", platforms: "Moving platforms", ice: "Slick floors", pistons: "Pistons & gears", chains: "Swinging chains" };
  const EN_INFO = { r: ["Stripped Bolt", "en-sbolt0"], m: ["Rusty Wrench", "en-rwrench0"], j: ["Lug Nut Ninja", "en-ninja0"], G: ["Impact Gun", "en-igun0"], T: ["Rolling Tire", "tire"], J: ["Floor Jack", "jack"], K: ["Creeper", "creeper"], k: ["Tool Cart", "toolcart"], b: ["Flying Nut", "fly-nut"], h: ["Drone", "fly-drone"], v: ["Diving Screw", "fly-screw"] };
  const BOSS_ART = { walker: "bossa-filter", charger: "bossa-jack", flyer: "bossa-meter", roller: "bossa-gear", magnet: "bossa-magnet", gunner: "gk-idle", stomper: "js-idle", serpent: "tb-idle", vac: "sv-idle", kraken: "ck-idle", king: "wk-idle", captain: "pc-idle" };
  const LEN = ["", "SHORT", "MEDIUM", "LONG"], AMT3 = ["NONE", "SOME", "LOTS"], OAMT = ["FEW", "SOME", "LOTS"], EAMT = ["FEW", "SOME", "LOTS", "SWARM"];
  const nameOf = (v) => (v.name || "MY LEVEL");
  const sameSt = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let ed = null, lastPlayed = null; // ed: level being edited {id, name, st, seed}

  function list(note) {
    const ui = U(); ui.idle();
    const a = mine();
    let h = '<div class="ltlogo">MY LEVELS</div><p>Build your own drawer: pick the place, the pits, the obstacles, the bad guys and the boss. Coins in custom levels are just for fun and don\'t go to your wallet.</p>';
    if (note) h += '<p class="ltbnote">' + esc(note) + "</p>";
    h += '<button class="ltbtn" id="lbNew">+ NEW LEVEL</button>';
    if (a.length) {
      h += '<div class="lblist">';
      a.forEach((v, i) => {
        const bs = BOSSES[v.st.boss];
        h += '<div class="lbrow"><img src="lt/' + (bs ? BOSS_ART[bs] : "drawer3") + '.webp" alt=""><div class="lbinfo"><b>' + esc(nameOf(v)) + "</b><span>" + BG_NAMES[v.st.bg] + " · " + LEN[v.st.len] + " · " + (bs ? BOSS_NAMES[bs] : "no boss") + '</span></div><div class="lbacts"><button class="lbplay" data-p="' + i + '">PLAY</button><button data-e="' + i + '">EDIT</button><button data-s="' + i + '">SHARE</button><button class="lbdel" data-d="' + i + '">✕</button></div></div>';
      });
      h += "</div>";
    } else h += '<p class="ltbnote">No levels yet. Tap NEW LEVEL to make your first one.</p>';
    h += '<button class="ltbtn sub" id="lbCode">PLAY A FRIEND\'S CODE</button><button class="ltbtn sub" id="lbBack">ALL DRAWERS</button>';
    ui.show(h);
    const c = ui.card();
    c.querySelector("#lbNew").onclick = () => { ui.say("grab"); edit({ name: "", st: JSON.parse(JSON.stringify(DEFAULT)) }); };
    c.querySelector("#lbBack").onclick = () => ui.menu();
    c.querySelector("#lbCode").onclick = enterCode;
    c.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => playSaved(mine()[+b.dataset.p])));
    c.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => { ui.say("grab"); edit(JSON.parse(JSON.stringify(mine()[+b.dataset.e]))); }));
    c.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => share(mine()[+b.dataset.s])));
    c.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => {
      const v = mine()[+b.dataset.d]; if (!v) return;
      if (b.dataset.sure) { keep(mine().filter((x) => x.id !== v.id)); list(); return; }
      b.dataset.sure = 1; b.textContent = "DELETE?"; b.classList.add("sure");
    }));
    c.scrollTop = 0;
  }

  function chips(id, opts, sel, multi) {
    return '<div class="lbchips" data-g="' + id + '"' + (multi ? ' data-multi="1"' : "") + ">" + opts.map(([v, label, art]) => '<button data-v="' + v + '" class="' + ((multi ? sel.includes(v) : sel === v) ? "on" : "") + '">' + (art ? '<img src="lt/' + art + '.webp" alt="">' : "") + label + "</button>").join("") + "</div>";
  }
  function edit(v) {
    ed = v; const st = v.st, ui = U(); ui.idle();
    let h = '<div class="ltlogo">' + (v.id ? "EDIT LEVEL" : "NEW LEVEL") + "</div>";
    h += '<label class="lbl">NAME</label><input class="lbname" id="lbName" maxlength="18" placeholder="MY LEVEL" value="' + esc(v.name || "") + '" autocomplete="off" autocapitalize="characters">';
    h += '<label class="lbl">PLACE</label><div class="lbprev" id="lbPrev" style="background-image:url(bg-' + BGS[st.bg] + '.jpg)"><span>' + BG_NAMES[st.bg] + "</span></div>" + chips("bg", BGS.map((_, i) => [i, BG_NAMES[i]]), st.bg);
    h += '<label class="lbl">LENGTH</label>' + chips("len", [[1, "SHORT"], [2, "MEDIUM"], [3, "LONG"]], st.len);
    h += '<label class="lbl">PITS</label>' + chips("pits", [[0, "NONE"], [1, "SOME"], [2, "LOTS"]], st.pits);
    h += '<label class="lbl">OBSTACLES</label>' + chips("obstacles", OBST.map((o) => [o, OB_NAMES[o]]), st.obstacles, true) + '<span class="lbsub">HOW MANY</span>' + chips("obsAmt", OAMT.map((l, i) => [i, l]), st.obsAmt);
    h += '<label class="lbl">BAD GUYS</label>' + chips("enemies", ENEMIES.map((e) => [e, EN_INFO[e][0], EN_INFO[e][1]]), st.enemies, true) + '<span class="lbsub">HOW MANY</span>' + chips("enAmt", EAMT.map((l, i) => [i, l]), st.enAmt);
    h += '<label class="lbl">BOSS</label>' + chips("boss", BOSSES.map((b, i) => [i, b ? BOSS_NAMES[b].replace(/^THE /, "") : "NO BOSS", b ? BOSS_ART[b] : ""]), st.boss) + '<span class="lbsub">BOSS STRENGTH</span>' + chips("bossHard", [[0, "NORMAL"], [1, "TOUGH"]], st.bossHard ? 1 : 0);
    h += '<label class="lbl">COINS</label>' + chips("coins", AMT3.map((l, i) => [i, i === 1 ? "NORMAL" : i === 2 ? "EXTRA" : l]), st.coins);
    h += '<label class="lbl">POWER-UPS</label>' + chips("powerups", AMT3.map((l, i) => [i, l]), st.powerups);
    h += '<button class="ltbtn" id="lbGo">SAVE &amp; PLAY</button><button class="ltbtn sub" id="lbRand">SURPRISE ME</button><button class="ltbtn sub" id="lbCancel">CANCEL</button>';
    ui.show(h);
    const c = ui.card();
    c.querySelectorAll(".lbchips").forEach((g) => g.querySelectorAll("button").forEach((b) => (b.onclick = () => {
      const k = g.dataset.g, raw = b.dataset.v, val = /^\d+$/.test(raw) && k !== "enemies" ? +raw : raw;
      if (g.dataset.multi) { const a = st[k]; const i = a.indexOf(val); if (i >= 0) a.splice(i, 1); else a.push(val); b.classList.toggle("on"); }
      else { st[k] = k === "bossHard" ? !!val : val; g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); }
      if (k === "bg") { const p = c.querySelector("#lbPrev"); p.style.backgroundImage = "url(bg-" + BGS[val] + ".jpg)"; p.firstChild.textContent = BG_NAMES[val]; }
      ui.haptic("light");
    })));
    c.querySelector("#lbName").oninput = (e) => { ed.name = e.target.value.toUpperCase().slice(0, 18); };
    c.querySelector("#lbCancel").onclick = () => list();
    c.querySelector("#lbRand").onclick = () => { ed.name = c.querySelector("#lbName").value; ed.st = surprise(); edit(ed); };
    c.querySelector("#lbGo").onclick = () => {
      ed.name = c.querySelector("#lbName").value.trim().toUpperCase().slice(0, 18);
      if (!ed.st.enemies.length && !BOSSES[ed.st.boss] && !ed.st.pits && !ed.st.obstacles.length) ed.st.enemies.push("r");
      const old = ed.id && mine().find((x) => x.id === ed.id);
      const seed = old && sameSt(old.st, ed.st) ? old.seed : Math.floor(Math.random() * 1048576);
      check(ed.st, seed, (res) => {
        const lv = { id: ed.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: ed.name, st: ed.st, seed: res.seed };
        const a = mine(), i = a.findIndex((x) => x.id === lv.id);
        if (i >= 0) a[i] = lv; else a.unshift(lv);
        keep(a); playSaved(lv);
      }, () => edit(ed));
    };
    c.scrollTop = 0;
  }
  function surprise() {
    const r = Math.random, pickSome = (arr, n) => arr.slice().sort(() => r() - 0.5).slice(0, n);
    return { bg: Math.floor(r() * BGS.length), len: 1 + Math.floor(r() * 3), pits: Math.floor(r() * 3), obstacles: pickSome(OBST, 2 + Math.floor(r() * 3)), obsAmt: Math.floor(r() * 3), enemies: pickSome(ENEMIES, 2 + Math.floor(r() * 4)), enAmt: Math.floor(r() * 4), boss: 1 + Math.floor(r() * 12), bossHard: r() < 0.3, coins: 1 + Math.floor(r() * 2), powerups: 1 + Math.floor(r() * 2) };
  }
  // run the beatable check behind a "checking" card, so the screen updates first
  function check(st, seed, ok, back) {
    const ui = U();
    ui.show('<div class="ltlogo">BUILDING…</div><img class="ltclr" src="lt/drawer2.webp" alt=""><p>Laying out your level and making sure it can be beaten.</p>');
    setTimeout(() => {
      let res = { ok: false };
      try { res = make(st, seed); } catch (e) { res = { ok: false }; }
      ui.idle();
      if (res.ok) ok(res);
      else { ui.show('<div class="ltlogo">HMM…</div><p>We couldn\'t build a level we\'re sure can be beaten with those picks. Try fewer pits or obstacles.</p><button class="ltbtn" id="lbBk">BACK</button>'); ui.card().querySelector("#lbBk").onclick = back; }
    }, 60);
  }
  function playSaved(v) {
    if (!v) return list();
    const i = load(v.st, v.seed); window.LT_LEVELS[i].name = nameOf(v);
    lastPlayed = v; U().say("grab"); U().play(i);
  }
  function cleared(c) {
    const v = lastPlayed || { name: "MY LEVEL" }, ui = U();
    let h = '<div class="ltlogo">LEVEL CLEAR!</div><img class="ltclr" src="lt/drawer3.webp" alt=""><p><b>' + esc(nameOf(v)) + "</b> · " + Math.floor(c.time / 60) + ":" + String(Math.floor(c.time % 60)).padStart(2, "0") + "</p><p>" + c.coins + (c.coins === 1 ? " coin" : " coins") + ' grabbed. <span class="ltbnote">Custom level coins are just for fun and don\'t go to your wallet.</span></p>';
    h += '<button class="ltbtn" id="lbAgain">PLAY AGAIN</button>' + (v.id ? '<button class="ltbtn sub" id="lbEd">EDIT LEVEL</button><button class="ltbtn sub" id="lbSh">SHARE CODE</button>' : '<button class="ltbtn sub" id="lbSave">SAVE TO MY LEVELS</button>') + '<button class="ltbtn sub" id="lbList">MY LEVELS</button>';
    ui.show(h);
    const q = (s) => ui.card().querySelector(s);
    q("#lbAgain").onclick = () => playSaved(v);
    q("#lbList").onclick = () => list();
    if (q("#lbEd")) q("#lbEd").onclick = () => edit(JSON.parse(JSON.stringify(v)));
    if (q("#lbSh")) q("#lbSh").onclick = () => share(v);
    if (q("#lbSave")) q("#lbSave").onclick = () => { const lv = Object.assign({}, v, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }); const a = mine(); a.unshift(lv); keep(a); lastPlayed = lv; list("Saved to My Levels."); };
  }
  function share(v) {
    if (!v) return list();
    const code = pack(v.st, v.seed), ui = U();
    ui.show('<div class="ltlogo">SHARE CODE</div><p>Give this code to a friend. They tap <b>PLAY A FRIEND\'S CODE</b> in the Level Builder to play <b>' + esc(nameOf(v)) + '</b>.</p><div class="lbcode">' + code + '</div><button class="ltbtn" id="lbCopy">COPY CODE</button><button class="ltbtn sub" id="lbBk">BACK</button>');
    const c = ui.card();
    c.querySelector("#lbCopy").onclick = async (e) => {
      const txt = "Play my Lost Toolbox level in Where's My 10MM?! Code: " + code;
      let done = false;
      try { if (navigator.share) { await navigator.share({ text: txt }); done = true; } } catch (x) { if (x && x.name === "AbortError") return; }
      if (!done) try { await navigator.clipboard.writeText(code); done = true; } catch (x) {}
      e.target.textContent = done ? "COPIED!" : "COPY IT BY HAND";
    };
    c.querySelector("#lbBk").onclick = () => list();
  }
  function enterCode(note) {
    const ui = U();
    ui.show('<div class="ltlogo">FRIEND\'S CODE</div><p>Type the level code your friend shared.</p>' + (typeof note === "string" ? '<p class="ltbnote bad">' + esc(note) + "</p>" : "") + '<input class="lbname lbcodein" id="lbIn" maxlength="20" placeholder="XXXX-XXXXX-XXXXX" autocomplete="off" autocapitalize="characters"><button class="ltbtn" id="lbPlay">PLAY IT</button><button class="ltbtn sub" id="lbBk">BACK</button>');
    const c = ui.card();
    c.querySelector("#lbBk").onclick = () => list();
    c.querySelector("#lbPlay").onclick = () => {
      const d = unpack(c.querySelector("#lbIn").value);
      if (!d) return enterCode("That code doesn't look right. Check it and try again.");
      check(d.settings, d.seed, (res) => playSaved({ name: "FRIEND'S LEVEL", st: d.settings, seed: res.seed }), () => list());
    };
  }
  const DEFAULT = { bg: 0, len: 2, pits: 1, obstacles: ["platforms", "belts"], obsAmt: 1, enemies: ["r", "m", "T", "b"], enAmt: 1, boss: 1, bossHard: false, coins: 1, powerups: 1 };

  window.LTBuild = { list, cleared, build, make, load, pack, unpack, slot, BGS, OBST, ENEMIES, BOSSES, BOSS_NAMES, BG_NAMES, DEFAULT, _reach: reach };
})();
